const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Minio = require('minio');
require('dotenv').config();

// นำเข้าบริการ (ไว้ด้านบนสุด)
const { extractMetadataFromGrobid } = require('./grobidService');
const { refineMetadataWithLLM, identifyAuthorRoles } = require('./llmService');
const { 
    syncAllUsersScholarData, 
    syncUserScholarData, 
    rejectAndBlacklistPaper, 
    getBlacklistByUser, 
    unblacklistPaper 
} = require('./scholarService');
const { initScholarCron, getCronStatus } = require('./cronService');
const { pool } = require('./db');

const app = express();

// In-memory lock for sync-scholar to prevent concurrent runs
let isSyncRunning = false;
app.use(cors());
app.use(express.json());

// 1. ตั้งค่าการเชื่อมต่อ MinIO
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});

const bucketName = process.env.MINIO_BUCKET;

// 2. ฟังก์ชันตรวจสอบและสร้าง Bucket อัตโนมัติ
async function initMinio() {
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`[MinIO] สร้าง Bucket '${bucketName}' สำเร็จ`);
        } else {
            console.log(`[MinIO] ตรวจพบ Bucket '${bucketName}' พร้อมใช้งาน`);
        }
    } catch (error) {
        console.error('[MinIO] เกิดข้อผิดพลาด:', error);
    }
}
initMinio();

// 3. ตั้งค่า Multer (เก็บไฟล์ไว้ใน RAM ชั่วคราวเพื่อส่งต่อให้ MinIO)
const upload = multer({ storage: multer.memoryStorage() });

// 4. สร้าง API Endpoint สำหรับรับไฟล์ PDF
app.post('/api/upload', upload.single('pdf_file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
    }

    // สร้างชื่อไฟล์ใหม่ไม่ให้ซ้ำกัน
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

    try {
        // 4.1 อัปโหลดไฟล์จาก Memory ขึ้น MinIO
        await minioClient.putObject(
            bucketName,
            fileName,
            req.file.buffer,
            req.file.size,
            { 'Content-Type': req.file.mimetype }
        );
        console.log(`[MinIO] อัปโหลดไฟล์ ${fileName} สำเร็จ`);

        // 4.2 ส่งไฟล์เข้า GROBID เพื่อดึง Metadata พื้นฐาน
        console.log('[System] 1. กำลังส่งไฟล์ให้ GROBID ประมวลผล...');
        let grobidData = { article_title: null, publish_date: null, authors: [], raw_xml: null };
        
        try {
            grobidData = await extractMetadataFromGrobid(req.file.buffer);
        } catch (grobidError) {
            console.warn('[Warning] ดึงข้อมูลจาก GROBID ไม่สำเร็จ จะให้ User กรอกข้อมูลเอง');
        }

        // 4.3 ส่งข้อมูลให้ Gemini ตรวจทานและแก้ไข (Refinement)
        let finalMetadata = {
            article_title: grobidData.article_title,
            publish_date: grobidData.publish_date,
            authors: grobidData.authors,
            author_contribution: null
        };

        const xmlForLLM = grobidData.cleaned_xml || grobidData.raw_xml;
        
        if (xmlForLLM) {
            console.log('[System] 2. กำลังส่งเนื้อหาให้ Gemini ตรวจทานและแก้ไขข้อผิดพลาด...');
            const refinedData = await refineMetadataWithLLM(xmlForLLM, grobidData);
            
            finalMetadata = {
                article_title: refinedData.article_title || finalMetadata.article_title,
                publish_date: refinedData.publish_date || finalMetadata.publish_date,
                authors: refinedData.authors && refinedData.authors.length > 0 ? refinedData.authors : finalMetadata.authors,
                author_contribution: refinedData.author_contribution
            };
        } else {
            console.log('[System] 2. ข้ามการทำงานของ Gemini เนื่องจากไม่มีข้อมูล XML จาก GROBID');
        }

        // 4.4 ส่งข้อมูลกลับไปที่หน้าบ้าน (Frontend)
        res.json({
            message: 'อัปโหลดและประมวลผลไฟล์สำเร็จ',
            file_info: {
                fileName: fileName,
                bucket: bucketName
            },
            metadata: finalMetadata 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'อัปโหลดหรือประมวลผลไฟล์ไม่สำเร็จ' });
    }
});

// 5. API Endpoint สกัดข้อมูลจาก PDF (GROBID + Gemini + Author Role AI)
app.post('/api/extract', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'ไม่พบไฟล์ PDF ที่อัปโหลด' });
    }

    try {
        // 1. ส่งไฟล์เข้า GROBID เพื่อดึง Metadata พื้นฐาน
        console.log('[System] 1. กำลังส่งไฟล์ให้ GROBID ประมวลผล...');
        let grobidData = { article_title: null, publish_date: null, authors: [], raw_xml: null };
        
        try {
            grobidData = await extractMetadataFromGrobid(req.file.buffer);
        } catch (grobidError) {
            console.warn('[Warning] ดึงข้อมูลจาก GROBID ไม่สำเร็จ');
        }

        // 2. ส่งข้อมูลให้ Gemini ตรวจทานและแก้ไข (Refinement - Stage 1)
        let finalMetadata = {
            article_title: grobidData.article_title,
            publish_date: grobidData.publish_date,
            authors: grobidData.authors,
            volume: grobidData.volume,
            issue: grobidData.issue,
            abstract: grobidData.abstract,
            keywords: grobidData.keywords,
            study_design: grobidData.study_design || '',
            participants: grobidData.participants || { description: '', sample_size: '' }
        };

        const xmlForLLM = grobidData.cleaned_xml || grobidData.raw_xml;

        // 🟢 Truncate XML to first ~15,000 chars to avoid LLM timeout
        // Keeps teiHeader (metadata) + first part of body + back section (footnotes)
        const MAX_XML_LENGTH = 15000;
        const truncatedXml = xmlForLLM.length > MAX_XML_LENGTH
            ? xmlForLLM.substring(0, MAX_XML_LENGTH) + '\n\n[...truncated...]'
            : xmlForLLM;
        
        if (truncatedXml) {
            console.log('[System] 2. กำลังส่งเนื้อหาให้ Gemini ตรวจทานและแก้ไขข้อผิดพลาด...');
            const refinedData = await refineMetadataWithLLM(truncatedXml, grobidData);
            
            finalMetadata = {
                article_title: refinedData.article_title || finalMetadata.article_title,
                publish_date: refinedData.publish_date || finalMetadata.publish_date,
                authors: refinedData.authors && refinedData.authors.length > 0 ? refinedData.authors : finalMetadata.authors,
                volume: refinedData.volume || finalMetadata.volume,
                issue: refinedData.issue || finalMetadata.issue,
                abstract: refinedData.abstract || finalMetadata.abstract,
                keywords: refinedData.keywords || finalMetadata.keywords,
                study_design: refinedData.study_design || finalMetadata.study_design,
                participants: refinedData.participants || finalMetadata.participants
            };
        } else {
            console.log('[System] 2. ข้ามการทำงานของ Gemini เนื่องจากไม่มีข้อมูล XML จาก GROBID');
        }

        // 3. STAGE 2: Author Role Identification (NEW)
        // วิเคราะห์บทบาทผู้แต่งจาก XML 全文 (teiHeader + body + back)
        // ใช้ truncatedXml (รักษา teiHeader + body ตอนต้น + back สำหรับ footnotes)
        if (truncatedXml && finalMetadata.authors && finalMetadata.authors.length > 0) {
            console.log('[System] 3. กำลังวิเคราะห์บทบาทผู้แต่งด้วย AI...');
            try {
                const roleResult = await identifyAuthorRoles(truncatedXml, finalMetadata.authors);
                if (roleResult && roleResult.authors && Array.isArray(roleResult.authors)) {
                    finalMetadata.authors = roleResult.authors;
                    finalMetadata.author_role_notes = roleResult.extraction_notes;
                    console.log('[System] Author roles identified:', roleResult.extraction_notes);
                }
            } catch (roleError) {
                console.warn('[Warning] Author role identification failed, keeping refined authors:', roleError.message);
            }
        }

        // 4. ส่งผลลัพธ์ JSON กลับไปที่ Frontend
        res.json({
            message: 'สกัดข้อมูลสำเร็จ',
            metadata: finalMetadata
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'สกัดข้อมูลไม่สำเร็จ' });
    }
});

// 5. API Endpoint สำหync ข้อมูลจาก Google Scholar
app.post('/api/sync-scholar', async (req, res) => {
    if (isSyncRunning) {
        return res.status(409).json({
            error: 'Sync already in progress',
            message: 'A synchronization job is currently running. Please wait.'
        });
    }

    isSyncRunning = true;
    const startTime = Date.now();

    try {
        const result = await syncAllUsersScholarData();
        const duration = Date.now() - startTime;

        res.json({
            message: 'Sync completed',
            durationMs: duration,
            stats: {
                createdCount: result.createdCount,
                newPapers: result.newPapers,
                linkedCount: result.linkedCount,
                errors: result.errors
            }
        });
    } catch (error) {
        console.error('[Sync Scholar Error]:', error);
        res.status(500).json({
            error: 'Sync failed',
            details: error.message
        });
    } finally {
        isSyncRunning = false;
    }
});

// 5.1 API Endpoint สำหรับ Sync ข้อมูล Google Scholar ของอาจารย์รายบุคคล
app.post('/api/sync-scholar/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await syncUserScholarData(userId);
        res.json({
            message: `Sync completed for user ${userId}`,
            data: result
        });
    } catch (error) {
        console.error(`[Sync Scholar User ${userId} Error]:`, error);
        res.status(500).json({ error: 'Sync user failed', details: error.message });
    }
});

// 5.2 API Endpoint สำหรับอาจารย์กดปฏิเสธผลงาน ("ไม่ใช่ผลงานของฉัน" -> Blacklist)
app.post('/api/papers/reject', async (req, res) => {
    const { userId, scholarTitle, paperId } = req.body;
    if (!userId || !scholarTitle) {
        return res.status(400).json({ error: 'ต้องระบุ userId และ scholarTitle' });
    }

    try {
        const result = await rejectAndBlacklistPaper(userId, scholarTitle, paperId);
        res.json(result);
    } catch (error) {
        console.error('[Reject Paper Error]:', error);
        res.status(500).json({ error: 'ปฏิเสธผลงานไม่สำเร็จ', details: error.message });
    }
});

// 5.3 ดึงรายชื่ออาจารย์ทั้งหมดในระบบ (สำหรับเลือกโปรไฟล์ในแดชบอร์ด)
app.get('/api/users', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, email, name_en, name_th, department, position, scholar_id, scopus_id FROM users ORDER BY id ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('[Get Users Error]:', error);
        res.status(500).json({ error: 'ดึงรายชื่อผู้ใช้ไม่สำเร็จ' });
    }
});

// 5.4 อัปเดต Scholar ID, Scopus ID และ Position ของอาจารย์
app.put('/api/users/:userId/scholar-id', async (req, res) => {
    const { userId } = req.params;
    const { scholarId, scopusId, position } = req.body;
    try {
        const cleanedScholarId = scholarId ? scholarId.trim() : null;
        const cleanedScopusId = scopusId ? scopusId.trim() : null;
        const updates = ['scholar_id = $1', 'scopus_id = $2'];
        const params = [cleanedScholarId, cleanedScopusId, userId];
        let paramIdx = 4;

        if (position !== undefined) {
            updates.push(`position = $${paramIdx}`);
            params.push(position);
            paramIdx++;
        }

        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $3 RETURNING id, name_en, name_th, department, position, scholar_id, scopus_id`,
            params
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบผู้ใช้ที่ระบุ' });
        }
        res.json({ message: 'บันทึกข้อมูลสำเร็จ', user: result.rows[0] });
    } catch (error) {
        console.error('[Update Scholar ID Error]:', error);
        res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ' });
    }
});

// 5.5 ดึงผลงานทั้งหมดของอาจารย์แต่ละคน พร้อมข้อมูล Co-author และ Contribution
app.get('/api/users/:userId/papers', async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            SELECT 
                p.id AS paper_id,
                p.title,
                p.publish_year,
                p.authors_raw,
                p.cited_by,
                p.scholar_url,
                p.source,
                p.status AS paper_status,
                pa.id AS author_entry_id,
                pa.contribution_percent,
                pa.is_first_author,
                pa.is_corresponding,
                pa.status AS author_status,
                pa.confirmed_at
            FROM papers p
            JOIN paper_authors pa ON p.id = pa.paper_id
            WHERE pa.user_id = $1
            ORDER BY 
                CASE WHEN pa.status = 'PENDING' THEN 0 ELSE 1 END,
                p.publish_year DESC NULLS LAST, 
                p.id DESC
        `;
        const { rows } = await pool.query(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('[Get User Papers Error]:', error);
        res.status(500).json({ error: 'ดึงรายการผลงานไม่สำเร็จ' });
    }
});

// 5.6 ยืนยันข้อมูลผลงานและอัปเดต % สัดส่วนภาระงาน (Confirm Action)
app.put('/api/papers/:paperId/confirm', async (req, res) => {
    const { paperId } = req.params;
    const { userId, contributionPercent, isFirstAuthor, isCorresponding } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'ต้องระบุ userId' });
    }

    const percent = parseFloat(contributionPercent) || 0;
    if (percent < 0 || percent > 100) {
        return res.status(400).json({ error: 'สัดส่วนภาระงานต้องอยู่ระหว่าง 0% ถึง 100%' });
    }

    try {
        // อัปเดตตาราง paper_authors
        const updateAuthorQuery = `
            UPDATE paper_authors 
            SET contribution_percent = $1,
                is_first_author = COALESCE($2, is_first_author),
                is_corresponding = COALESCE($3, is_corresponding),
                status = 'CONFIRMED',
                confirmed_at = CURRENT_TIMESTAMP
            WHERE paper_id = $4 AND user_id = $5
            RETURNING *
        `;
        const authorRes = await pool.query(updateAuthorQuery, [
            percent,
            isFirstAuthor,
            isCorresponding,
            paperId,
            userId
        ]);

        if (authorRes.rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลผู้แต่งในผลงานนี้' });
        }

        // ตรวจสอบสถานะภาพรวมของผลงาน
        // หากเปอร์เซ็นต์รวมครบ 100% หรือผู้แต่งทุกคนกด CONFIRMED -> ปรับสถานะเป็น COMPLETED
        const statQuery = `
            SELECT 
                COALESCE(SUM(contribution_percent), 0) AS total_percent,
                COUNT(*) AS total_authors,
                COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) AS confirmed_authors
            FROM paper_authors 
            WHERE paper_id = $1
        `;
        const statRes = await pool.query(statQuery, [paperId]);
        const { total_percent, total_authors, confirmed_authors } = statRes.rows[0];

        let newPaperStatus = null;
        if (parseFloat(total_percent) >= 100 || parseInt(total_authors, 10) === parseInt(confirmed_authors, 10)) {
            newPaperStatus = 'COMPLETED';
            await pool.query('UPDATE papers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPaperStatus, paperId]);
        }

        res.json({
            message: 'ยืนยันข้อมูลเรียบร้อยแล้ว',
            author: authorRes.rows[0],
            paperStatus: newPaperStatus || 'PENDING_CO_AUTHOR',
            totalPercent: parseFloat(total_percent)
        });
    } catch (error) {
        console.error('[Confirm Paper Error]:', error);
        res.status(500).json({ error: 'ยืนยันข้อมูลไม่สำเร็จ', details: error.message });
    }
});

// 6. API Endpoint สำหรับบันทึกข้อมูลที่ User ตรวจสอบแล้ว (PDF Flow เดิม)
app.post('/api/save', async (req, res) => {
    const { 
        article_title, 
        publish_date, 
        authors, 
        author_contribution, 
        file_info,
        doi,
        journal,
        publication_level,
        volume,
        issue,
        pages,
        abstract,
        keywords,
        study_design,
        participants
    } = req.body;

    // Validation 1: Required fields
    if (!article_title || !file_info?.fileName) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน: ต้องมีชื่อบทความและข้อมูลไฟล์' });
    }

    // Validation 2: Date format
    let parsedDate = null;
    if (publish_date) {
        const date = new Date(publish_date);
        if (isNaN(date.getTime())) {
            return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ใช้ ISO 8601: YYYY-MM-DD)' });
        }
        parsedDate = date;
    }

    // Validation 3: Duplicate article_title
    try {
        const dupCheck = await pool.query(
            'SELECT id FROM research_papers WHERE article_title = $1',
            [article_title]
        );
        if (dupCheck.rows.length > 0) {
            return res.status(409).json({ 
                error: 'พบบทความชื่อนี้ในระบบแล้ว', 
                existing_id: dupCheck.rows[0].id 
            });
        }
    } catch (e) {
        console.error('[Duplicate Check Error]:', e.message);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert into research_papers
        const paperResult = await client.query(
            `INSERT INTO research_papers 
             (article_title, publish_date, authors, author_contribution, file_name, bucket_name,
              doi, journal, publication_level, volume, issue, pages, abstract, keywords,
              study_design, participants)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
            [
                article_title, 
                parsedDate, 
                JSON.stringify(authors || []), 
                author_contribution || null, 
                file_info.fileName, 
                file_info.bucket,
                doi || null,
                journal || null,
                publication_level || null,
                volume || null,
                issue || null,
                pages || null,
                abstract || null,
                keywords || null,
                study_design || null,
                JSON.stringify(participants || { description: '', sample_size: '' })
            ]
        );
        
        const paperId = paperResult.rows[0].id;

        // Insert authors into paper_authors with role flags
        if (authors && Array.isArray(authors) && authors.length > 0) {
            for (let i = 0; i < authors.length; i++) {
                const author = authors[i];
                await client.query(
                    `INSERT INTO paper_authors 
                     (paper_id, user_id, contribution_percent, is_first_author, is_co_first_author, is_corresponding, is_co_corresponding, author_order, status, confirmed_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CONFIRMED', CURRENT_TIMESTAMP)
                     ON CONFLICT (paper_id, user_id) DO UPDATE SET
                        contribution_percent = EXCLUDED.contribution_percent,
                        is_first_author = EXCLUDED.is_first_author,
                        is_co_first_author = EXCLUDED.is_co_first_author,
                        is_corresponding = EXCLUDED.is_corresponding,
                        is_co_corresponding = EXCLUDED.is_co_corresponding,
                        author_order = EXCLUDED.author_order,
                        status = 'CONFIRMED',
                        confirmed_at = CURRENT_TIMESTAMP`,
                    [
                        paperId,
                        author.user_id || null,  // May not have user_id for external authors
                        author.contribution_percent || 0,
                        author._is_first_author || author.role === 'First Author' || false,
                        author._is_co_first_author || author.role === 'Co-first Author' || false,
                        author._is_corresponding || author.role === 'Corresponding Author' || false,
                        author._is_co_corresponding || author.role === 'Co-corresponding Author' || false,
                        author._author_order || i + 1
                    ]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'บันทึกข้อมูลสำเร็จ', record_id: paperId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[DB Insert Error]:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'ข้อมูลซ้ำในระบบ' });
        }
        res.status(500).json({ error: 'บันทึกข้อมูลไม่สำเร็จ' });
    } finally {
        client.release();
    }
});

// 7. API Endpoint สำหรับดูสถานะ Cron Job (Phase 2)
app.get('/api/cron/status', (req, res) => {
    res.json(getCronStatus());
});

// เริ่มต้นเปิด Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Server] เริ่มทำงานที่พอร์ต ${PORT}`);
    // เริ่มต้นระบบ Cron Job อัตโนมัติ (Phase 2)
    initScholarCron();
});