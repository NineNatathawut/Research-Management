const axios = require('axios');
const FormData = require('form-data');
const xml2js = require('xml2js');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

// ฟังก์ชันส่ง PDF ไป GROBID
async function extractMetadataFromGrobid(pdfBuffer) {
    const form = new FormData();
    form.append('input', pdfBuffer, { filename: 'document.pdf', contentType: 'application/pdf' });

    try {
        const response = await axios.post('http://localhost:8070/api/processFulltextDocument', form, {
            headers: form.getHeaders(),
            responseType: 'text',
            validateStatus: () => true
        });

        if (response.status !== 200) {
            console.error('\n[GROBID HTTP Error]: Status', response.status);
            console.error('[GROBID Response]:', String(response.data).substring(0, 500));
            throw new Error(`GROBID error: ${response.status}`);
        }

        const responseText = String(response.data).trim();

        if (!responseText.startsWith('<')) {
            console.error('\n[GROBID ไม่ใช่ XML]:', responseText.substring(0, 300));
            throw new Error('GROBID ไม่ได้ตอบกลับมาเป็น XML');
        }

        // Clean XML: remove Academic Editors sidebar noise, keep <teiHeader> + <back> + <body> for author role detection
        const cleanedXml = cleanGROBIDXml(responseText);
        
        // Parse cleaned XML for metadata
        const metadata = await parseTeiXml(cleanedXml);
        
        return {
            ...metadata,
            raw_xml: responseText,
            cleaned_xml: cleanedXml
        };
    } catch (error) {
        if (error.response) {
            console.error('\n[GROBID HTTP Error]: Status', error.response.status);
            console.error('[GROBID Response]:', error.response.data);
        } else {
            console.error('\n[GROBID Error]:', error.message);
        }
        throw new Error('ไม่สามารถดึงข้อมูลจาก GROBID ได้');
    }
}

// แปลง XML เป็น JSON และดึงเฉพาะข้อมูลที่ต้องการ
async function parseTeiXml(xmlString) {
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    const json = await parser.parseStringPromise(xmlString);
    
    let metadata = {
        article_title: null,
        publish_date: null,
        authors: []
    };

    try {
        const fileDesc = json.TEI?.teiHeader?.fileDesc;
        const profileDesc = json.TEI?.teiHeader?.profileDesc;

        // 1. ดึงชื่อบทความ (Title)
        if (fileDesc?.titleStmt?.title) {
            metadata.article_title = typeof fileDesc.titleStmt.title === 'string' 
                ? fileDesc.titleStmt.title 
                : fileDesc.titleStmt.title._;
        }

        // 2. ดึงวันที่เผยแพร่ (Date)
        const dateObj = fileDesc?.publicationStmt?.date;
        if (dateObj && dateObj.when) {
            metadata.publish_date = dateObj.when;
        }

        // 3. ดึงรายชื่อผู้แต่งและสังกัด (Authors & Affiliations)
        const rawAuthors = fileDesc?.sourceDesc?.biblStruct?.analytic?.author;
        if (rawAuthors) {
            const authorsArray = Array.isArray(rawAuthors) ? rawAuthors : [rawAuthors];
            
            metadata.authors = authorsArray.map((author, index) => {
                const persName = author.persName;
                const forename = Array.isArray(persName?.forename) 
                    ? persName.forename.map(f => f._ || f).join(' ') 
                    : (persName?.forename?._ || persName?.forename || '');
                const surname = persName?.surname || '';
                
                // FIXED: รวมข้อมูล affiliation จากทุกแท็กย่อย (orgName, address, settlement, postCode, country, addrLine)
                let affiliationParts = [];
                if (author.affiliation) {
                    const aff = author.affiliation;
                    
                    // orgName(s)
                    if (aff.orgName) {
                        const names = Array.isArray(aff.orgName) ? aff.orgName : [aff.orgName];
                        affiliationParts.push(...names.map(o => o._ || o).filter(Boolean));
                    }
                    
                    // address components
                    if (aff.address) {
                        const addr = Array.isArray(aff.address) ? aff.address : [aff.address];
                        addr.forEach(a => {
                            ['settlement', 'postCode', 'country', 'addrLine'].forEach(key => {
                                if (a[key]) {
                                    const vals = Array.isArray(a[key]) ? a[key] : [a[key]];
                                    affiliationParts.push(...vals.map(v => v._ || v).filter(Boolean));
                                }
                            });
                        });
                    }
                }
                const affiliation = affiliationParts.join(', ');

                // Extract author role symbols from GROBID attributes
                const authorRole = extractAuthorRoleFromAttributes(author, index);

                return {
                    name: `${forename} ${surname}`.trim(),
                    affiliation: affiliation,
                    // GROBID-detected role hints (will be refined by LLM in Stage 2)
                    _grobid_role_hints: authorRole
                };
            });
        }
    } catch (err) {
        console.error('[XML Parse Warning]: โครงสร้าง XML อาจไม่ตรงตามที่คาดหวัง', err.message);
    }

    return metadata;
}

/**
 * Extract author role hints from GROBID XML attributes
 * GROBID marks:
 * - corresp="yes" on author element for corresponding author
 * - role attribute for contribution roles
 * - Footnotes in <back> section with *, †, ✉ symbols
 */
function extractAuthorRoleFromAttributes(author, index) {
    const hints = {
        is_corresponding: false,
        corresp_id: null,
        role: null,
        footnote_refs: []
    };

    // Check corresp attribute on author element
    if (author['@_corresp'] === 'yes' || author.corresp === 'yes') {
        hints.is_corresponding = true;
    }

    // Check role attribute
    if (author['@_role'] || author.role) {
        hints.role = author['@_role'] || author.role;
    }

    // Check for footnote references (n attribute on author or child elements)
    if (author['@_n']) {
        hints.footnote_refs.push(author['@_n']);
    }

    // Check child elements for footnote refs
    if (author.persName && author.persName['@_n']) {
        hints.footnote_refs.push(author.persName['@_n']);
    }

    return hints;
}

/**
 * Extract footnote markers and corresponding author info from <back> section
 */
function extractBackSectionInfo(json) {
    const info = {
        footnotes: {},           // marker -> footnote text
        corresponding_authors: [], // names from "Corresponding author:" footnotes
        contribution_notes: []   // author contribution statements
    };

    const backSection = json.TEI?.text?.back;
    if (!backSection) return info;

    // Process div elements in back section
    const divs = Array.isArray(backSection.div) ? backSection.div : (backSection.div ? [backSection.div] : []);
    
    for (const div of divs) {
        // Look for footnotes
        if (div['@_type'] === 'footnotes' || div['@_subtype'] === 'footnotes') {
            const notes = Array.isArray(div.note) ? div.note : (div.note ? [div.note] : []);
            
            for (const note of notes) {
                const marker = note['@_n'] || note['@_place'] || '';
                const text = note._ || note['#text'] || note;
                
                if (marker && text) {
                    info.footnotes[marker] = text;
                    
                    // Check for corresponding author patterns
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('corresponding author') || 
                        lowerText.includes('correspondence to') ||
                        lowerText.includes('email:') ||
                        lowerText.includes('✉')) {
                        info.corresponding_authors.push(text);
                    }
                    
                    // Check for contribution statements
                    if (lowerText.includes('contribution') || 
                        lowerText.includes('author contribution') ||
                        lowerText.includes('equal contribution') ||
                        lowerText.includes('co-first')) {
                        info.contribution_notes.push(text);
                    }
                }
            }
        }

        // Also check for author contribution statements in any div
        if (div.p) {
            const paragraphs = Array.isArray(div.p) ? div.p : [div.p];
            for (const p of paragraphs) {
                const text = p._ || p['#text'] || p;
                if (text && typeof text === 'string') {
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('author contribution') || 
                        lowerText.includes('equal contribution') ||
                        lowerText.includes('contributed equally') ||
                        lowerText.includes('co-first') ||
                        lowerText.includes('co-corresponding')) {
                        info.contribution_notes.push(text);
                    }
                }
            }
        }
    }

    return info;
}

// ทำความสะอาด XML: ตัดส่วน Academic Editors และเก็บ <teiHeader> + <back> + <body> สำหรับ Author Role Detection
function cleanGROBIDXml(rawXml) {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseNodeValue: true,
            parseAttributeValue: true,
            trimValues: true
        });
        
        const json = parser.parse(rawXml);
        
        // Safe guard: ถ้าโครงสร้างไม่ตรง ให้คืน XML ต้นฉบับ
        if (!json?.TEI?.teiHeader) {
            console.warn('[CleanXML] ไม่พบ teiHeader คืน XML ต้นฉบับ');
            return rawXml;
        }

        const teiHeader = json.TEI.teiHeader;

        // 1. ลบ Academic Editors จาก keywords (sidebar noise)
        if (teiHeader.profileDesc?.textClass?.keywords) {
            const keywords = Array.isArray(teiHeader.profileDesc.textClass.keywords)
                ? teiHeader.profileDesc.textClass.keywords
                : [teiHeader.profileDesc.textClass.keywords];
            
            teiHeader.profileDesc.textClass.keywords = keywords.filter(k => {
                const text = k?.['#text'] || k?.text || '';
                return !text.includes('Academic Editors');
            });
            
            // ถ้า filter แล้วว่าง ให้ลบ keywords node ทิ้ง
            if (teiHeader.profileDesc.textClass.keywords.length === 0) {
                delete teiHeader.profileDesc.textClass.keywords;
            }
        }

        // 2. ให้แน่ใจว่า analytic มีเฉพาะ author (ไม่มี editor ปน)
        const analytic = teiHeader.fileDesc?.sourceDesc?.biblStruct?.analytic;
        if (analytic?.author) {
            const authors = Array.isArray(analytic.author) ? analytic.author : [analytic.author];
            analytic.author = authors.filter(a => a?.persName);
        }

        // 3. ดึงส่วน <back> มาด้วย (สำหรับ Author Contributions และ footnotes)
        const backSection = json.TEI?.text?.back;

        // 4. ดึงส่วน <body> มาด้วย (สำหรับ author symbols, footnote refs ในเนื้อหา)
        const bodySection = json.TEI?.text?.body;

        // 5. สร้าง XML ใหม่จาก JSON ที่สะอาดแล้ว (teiHeader + back + body)
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: true,
            suppressEmptyNode: true
        });

        const result = { TEI: { teiHeader } };
        if (backSection || bodySection) {
            result.TEI.text = {};
            if (backSection) {
                result.TEI.text.back = backSection;
            }
            if (bodySection) {
                result.TEI.text.body = bodySection;
            }
        }

        const cleanedXml = builder.build(result);
        return cleanedXml;
    } catch (err) {
        console.error('[CleanXML Error]:', err.message);
        return rawXml; // Fallback: คืน XML ต้นฉบับถ้าพัง
    }
}

module.exports = { 
    extractMetadataFromGrobid,
    extractAuthorRoleFromAttributes,
    extractBackSectionInfo
};