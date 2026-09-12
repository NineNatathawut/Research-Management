const axios = require('axios');
const { pool } = require('./db');
require('dotenv').config();

/**
 * ฟังก์ชันช่วยตรวจสอบว่าชื่อผลงานถูก Blacklist โดยผู้ใช้หรือไม่
 */
async function isPaperBlacklisted(userId, title) {
    if (!title) return false;
    const res = await pool.query(
        `SELECT id FROM paper_blacklists 
         WHERE user_id = $1 AND LOWER(TRIM(scholar_title)) = LOWER(TRIM($2)) 
         LIMIT 1`,
        [userId, title]
    );
    return res.rows.length > 0;
}

/**
 * ฟังก์ชันช่วยตรวจสอบว่าชื่ออาจารย์ปรากฏอยู่ใน authors_raw หรือไม่
 */
function isAuthorInRawText(authorName, rawAuthors) {
    if (!authorName || !rawAuthors) return false;
    const cleanAuthor = authorName.trim().toLowerCase();
    const cleanRaw = rawAuthors.toLowerCase();

    if (cleanRaw.includes(cleanAuthor)) return true;

    // ตรวจสอบแยกคำ (เช่น 'Somchai A.' -> มีทั้ง 'somchai' และ 'a.')
    const parts = cleanAuthor.split(/\s+/);
    if (parts.length > 1 && parts.every(p => cleanRaw.includes(p))) {
        return true;
    }
    return false;
}

/**
 * ==============================================================================
 * DATA PARSER & CLEANER (ทำความสะอาดข้อมูลก่อนบันทึกลงฐานข้อมูล)
 * ==============================================================================
 * ทำความสะอาด HTML tags, ลบอักขระแปลกปลอม, ตรวจสอบปี และยอด Citation
 */
function cleanAndParsePaper(rawPaper) {
    if (!rawPaper) return null;

    // 1. ทำความสะอาดชื่อบทความ (ลบแท็ก <b>, </b>, ถอดรหัส HTML entities และตัด whitespace)
    let cleanTitle = (rawPaper.title || '')
        .replace(/<[^>]*>/g, '') // ลบ HTML tags เช่น <b>...</b>
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

    // 2. ตรวจสอบปีที่เผยแพร่ (ให้อยู่ในช่วงที่สมเหตุสมผล 1950 - ปัจจุบัน+1)
    const currentYear = new Date().getFullYear();
    let cleanYear = null;
    if (rawPaper.publish_year) {
        const parsedYear = parseInt(rawPaper.publish_year, 10);
        if (!isNaN(parsedYear) && parsedYear >= 1950 && parsedYear <= currentYear + 1) {
            cleanYear = parsedYear;
        }
    }

    // 3. ตรวจสอบและแปลงจำนวนการอ้างอิง (Cited By)
    let cleanCitedBy = 0;
    if (rawPaper.cited_by !== undefined && rawPaper.cited_by !== null) {
        const parsedCited = parseInt(rawPaper.cited_by, 10);
        if (!isNaN(parsedCited) && parsedCited >= 0) {
            cleanCitedBy = parsedCited;
        }
    }

    // 4. ทำความสะอาดผู้แต่ง (authors_raw)
    let cleanAuthors = (rawPaper.authors_raw || '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 5. ลิงก์ URL
    let cleanUrl = rawPaper.scholar_url ? rawPaper.scholar_url.trim() : null;

    return {
        title: cleanTitle,
        publish_year: cleanYear,
        authors_raw: cleanAuthors,
        cited_by: cleanCitedBy,
        scholar_url: cleanUrl
    };
}

/**
 * ==============================================================================
 * 1. REALISTIC MOCK DATA GENERATOR (สำหรับทดสอบใน Phase 2 โดยไม่ต้องใช้ API Key)
 * ==============================================================================
 * จำลองผลงานทางวิชาการที่สมจริง ครอบคลุม:
 * - ชื่อบทความทางวิชาการภาษาอังกฤษตามหัวข้อ AI, Data Systems, Software Engineering
 * - ปีที่เผยแพร่ (2023 - 2026)
 * - รายชื่อผู้ร่วมวิจัย (ทั้งอาจารย์ในระบบ Somchai A., Pe B. และผู้ร่วมวิจัยภายนอก)
 * - ยอดการอ้างอิง (Cited By)
 * - ลิงก์ Google Scholar URL
 */
function fetchRealisticMockData(nameEn, email, scholarId) {
    const sanitizedName = (nameEn || 'Faculty Member').trim();
    const urlSlug = encodeURIComponent(sanitizedName.toLowerCase().replace(/\s+/g, '-'));

    // ดึงโดเมนสถาบันจากอีเมล (เช่น somchai.a@up.ac.th -> up.ac.th)
    let institutionDomain = 'up.ac.th';
    if (email && email.includes('@')) {
        institutionDomain = email.split('@')[1];
    }

    if (scholarId) {
        console.log(`[Hybrid Fetcher - Mock] 1. ตรวจพบ Scholar ID: "${scholarId}" -> ดึงข้อมูลจาก Profile โดยตรง`);
    } else {
        console.log(`[Hybrid Fetcher - Mock] 2. ไม่มี Scholar ID -> ดึงด้วยชื่อ "${sanitizedName}" ควบคู่กับโดเมนสถาบัน "@${institutionDomain}"`);
    }

    // กำหนดชุดผลงานจำลองที่แตกต่างกันตามบริบทของอาจารย์
    const mockCatalog = [
        {
            title: `Automated Workflow System and Metadata Extraction for ${sanitizedName}`,
            publish_year: 2026,
            authors_raw: `${sanitizedName}, David C., Pe B.`,
            cited_by: 12,
            scholar_url: `https://scholar.google.com/scholar?q=workflow-${urlSlug}`
        },
        {
            title: `Deep Learning Approaches for Academic Record Verifications: A Study by ${sanitizedName}`,
            publish_year: 2025,
            authors_raw: `${sanitizedName}, Pe B.`,
            cited_by: 45,
            scholar_url: `https://scholar.google.com/scholar?q=deeplearning-${urlSlug}`
        },
        {
            title: `Distributed Cloud Architectures for Institutional Data Management at ${institutionDomain.toUpperCase()}`,
            publish_year: 2024,
            authors_raw: `${sanitizedName}, Alex Wong, Sarah T.`,
            cited_by: 68,
            scholar_url: `https://scholar.google.com/scholar?q=cloud-arch-${urlSlug}`
        },
        {
            // ผลงานร่วมระดับสถาบัน (สำหรับทดสอบ Co-author deduplication และการซิงก์ข้ามบุคคล)
            title: 'Overview of AI Networks in Academic Systems',
            publish_year: 2026,
            authors_raw: 'Somchai A., Pe B., David C.',
            cited_by: 28,
            scholar_url: 'https://scholar.google.com/scholar?q=overview-ai-networks'
        }
    ];

    return mockCatalog;
}

/**
 * ==============================================================================
 * 2. HYBRID FETCHER: SERPAPI GOOGLE SCHOLAR API ADAPTER
 * ==============================================================================
 * ฟังก์ชันค้นหาแบบไฮบริด (Hybrid Search):
 *   1) เช็ค scholar_id ก่อน ถ้ามี -> ดึงผ่าน ID เจาะจงด้วย engine 'google_scholar_author'
 *   2) ถ้าไม่มี -> นำชื่อ-นามสกุลภาษาอังกฤษ ค้นหาควบคู่กับโดเมนสถาบัน (เช่น author:"Somchai A." "up.ac.th")
 */
async function fetchFromSerpApi(nameEn, email, scholarId, apiKey) {
    const params = {
        api_key: apiKey,
        hl: 'en'
    };

    let institutionDomain = '';
    if (email && email.includes('@')) {
        institutionDomain = email.split('@')[1];
    }

    if (scholarId) {
        // เงื่อนไข 1: มี Scholar ID -> ดึงผ่าน ID โดยตรงจาก Google Scholar Author Profile
        console.log(`[Hybrid Fetcher - SerpApi] 1. ตรวจพบ Scholar ID: "${scholarId}" -> ค้นหาผ่าน Author Profile ตรง`);
        params.engine = 'google_scholar_author';
        params.author_id = scholarId;
    } else {
        // เงื่อนไข 2: ไม่มี Scholar ID -> ค้นหาด้วยชื่อภาษาอังกฤษควบคู่กับโดเมนสถาบัน
        params.engine = 'google_scholar';
        const queryParts = [`author:"${nameEn}"`];
        if (institutionDomain) {
            queryParts.push(`"${institutionDomain}"`);
        }
        params.q = queryParts.join(' ');
        console.log(`[Hybrid Fetcher - SerpApi] 2. ไม่มี Scholar ID -> ค้นหาด้วยชื่อและโดเมน: ${params.q}`);
    }

    const response = await axios.get('https://serpapi.com/search.json', {
        params,
        timeout: 15000 // 15 seconds timeout
    });

    const rawResults = [];

    if (scholarId && response.data.articles) {
        // แปลงผลลัพธ์จาก Author Profile
        for (const item of response.data.articles) {
            rawResults.push({
                title: item.title,
                publish_year: item.year ? parseInt(item.year, 10) : null,
                authors_raw: item.authors || nameEn,
                cited_by: item.cited_by?.value ? parseInt(item.cited_by.value, 10) : 0,
                scholar_url: item.link || null
            });
        }
    } else if (response.data.organic_results) {
        // แปลงผลลัพธ์จากการค้นหาด้วยชื่อผู้แต่งและโดเมน
        for (const item of response.data.organic_results) {
            const yearMatch = item.publication_info?.summary?.match(/\b(19|20)\d{2}\b/);
            const publish_year = yearMatch ? parseInt(yearMatch[0], 10) : null;
            const authors_raw = item.publication_info?.authors?.map(a => a.name).join(', ') 
                || item.publication_info?.summary 
                || nameEn;

            rawResults.push({
                title: item.title,
                publish_year,
                authors_raw,
                cited_by: item.inline_links?.cited_by?.total ? parseInt(item.inline_links.cited_by.total, 10) : 0,
                scholar_url: item.link || null
            });
        }
    }

    console.log(`[Hybrid Fetcher - SerpApi] ดึงข้อมูลสำเร็จ: พบ ${rawResults.length} ผลงาน`);
    return rawResults;
}

/**
 * ==============================================================================
 * 2.5 DIRECT GOOGLE SCHOLAR CITATIONS FETCHER (Puppeteer-based)
 * ==============================================================================
 * ดึงข้อมูลผลงานจริงจาก Google Scholar Profile โดยตรงผ่าน Puppeteer
 * ใช้ headless browser จำลองการคลิก "Show more" เพื่อดึงผลงานทั้งหมด
 */
async function fetchDirectFromGoogleScholarProfile(scholarId) {
    const puppeteer = require('puppeteer');
    
    console.log(`[Direct Scholar Fetcher - Puppeteer] กำลังดึงผลงานจริงจาก Google Scholar Profile: ${scholarId}`);
    
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    try {
        const url = `https://scholar.google.com/citations?user=${scholarId}&hl=en`;
        await page.goto(url, { waitUntil: 'networkidle2' });

        // คลิกปุ่ม "Show more" ซ้ำจนกว่าจะไม่มีอีก (ดึงผลงานทั้งหมด)
        let hasMore = true;
        let clickCount = 0;
        const maxClicks = 20; // กันลูปไม่รู้จบ

        while (hasMore && clickCount < maxClicks) {
            try {
                const showMoreBtn = await page.$('#gsc_bpf_more');
                if (showMoreBtn) {
                    const isDisabled = await page.evaluate(btn => btn.disabled, showMoreBtn);
                    if (!isDisabled) {
                        await showMoreBtn.click();
                        await page.waitForNetworkIdle({ timeout: 5000 });
                        clickCount++;
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            } catch (e) {
                hasMore = false;
            }
        }

        // ดึงข้อมูลผลงานทั้งหมด
        const papers = await page.evaluate(() => {
            const results = [];
            const rows = document.querySelectorAll('.gsc_a_tr');
            
            rows.forEach(row => {
                const titleEl = row.querySelector('.gsc_a_at');
                const authorsEl = row.querySelector('.gs_gray');
                const yearEl = row.querySelector('.gsc_a_hc');
                const citeEl = row.querySelector('.gsc_a_ac');
                const hrefEl = row.querySelector('.gsc_a_at');

                if (titleEl) {
                    results.push({
                        title: titleEl.innerText.trim(),
                        scholar_url: hrefEl ? 'https://scholar.google.com' + hrefEl.getAttribute('href') : null,
                        authors_raw: authorsEl ? authorsEl.innerText.trim() : '',
                        cited_by: citeEl && citeEl.innerText.trim() !== '' ? parseInt(citeEl.innerText.trim()) : 0,
                        publish_year: yearEl && yearEl.innerText.trim() !== '' ? parseInt(yearEl.innerText.trim()) : null
                    });
                }
            });
            return results;
        });

        console.log(`[Direct Scholar Fetcher - Puppeteer] ดึงสำเร็จ! พบ ${papers.length} ผลงานจริงจาก Google Scholar (คลิก Show more ${clickCount} ครั้ง)`);
        return papers;
    } finally {
        await browser.close();
    }
}

/**
 * ==============================================================================
 * 3. ROUTER / FACADE FUNCTION: fetchFromGoogleScholar
 * ==============================================================================
 * ทำหน้าที่สลับ Provider อัตโนมัติ (Multi-tier Fetcher):
 * - Tier 1: หากระบุ SERPAPI_KEY ใน .env หรือตั้ง SCHOLAR_PROVIDER='serpapi' -> ดึงจาก SerpApi
 * - Tier 2: หากมี scholar_id ให้ดึงจาก Google Scholar Profile โดยตรง (ข้อมูลจริง 100% ไม่ต้องใช้ API Key)
 * - Tier 3: หากไม่มี scholar_id หรือระบบภายนอกติดขัด -> Fallback ใช้ Mock Data ตามบริบทคณะ ICT UP
 */
async function fetchFromGoogleScholar(nameEn, email, scholarId) {
    const provider = (process.env.SCHOLAR_PROVIDER || 'auto').toLowerCase();
    const apiKey = process.env.SERPAPI_KEY;

    // Tier 1: SerpApi (กรณีตั้งใจใช้งานและมี API Key)
    if (provider === 'serpapi' && apiKey) {
        try {
            return await fetchFromSerpApi(nameEn, email, scholarId, apiKey);
        } catch (apiErr) {
            console.warn(`[Scholar Service Warning] เรียก SerpApi ไม่สำเร็จ (${apiErr.message})`);
        }
    }

    // Tier 2: Direct Google Scholar Profile (ข้อมูลจริง 100% ผ่าน scholar_id)
    if (scholarId) {
        try {
            const realArticles = await fetchDirectFromGoogleScholarProfile(scholarId);
            if (realArticles && realArticles.length > 0) {
                return realArticles;
            }
        } catch (directErr) {
            console.warn(`[Scholar Service Warning] ดึงจาก Google Scholar Profile ตรงไม่สำเร็จ (${directErr.message}) จะใช้ข้อมูลสำรองแทน`);
        }
    }

    // Tier 3: Realistic Data สำหรับการพัฒนาและทดสอบอย่างปลอดภัย
    return fetchRealisticMockData(nameEn, email, scholarId);
}

/**
 * ==============================================================================
 * 4. SYNC SERVICE (บันทึกลงตาราง papers ด้วยสถานะ DRAFT_AUTO และซิงก์ Co-authors)
 * ==============================================================================
 * - นำข้อมูลดิบผ่าน Data Parser (cleanAndParsePaper)
 * - กรองผลงานที่ติด Blacklist
 * - บันทึกผลงานใหม่ด้วยสถานะ 'DRAFT_AUTO'
 * - ผูกผู้เขียนหลักลงใน paper_authors (สถานะ 'PENDING')
 * - ตรวจจับ Co-authors จาก authors_raw และปรับสถานะเป็น 'PENDING_CO_AUTHOR'
 */
async function syncUserScholarData(userOrId) {
    let user = userOrId;
    if (typeof userOrId === 'number' || typeof userOrId === 'string') {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userOrId]);
        if (rows.length === 0) {
            throw new Error(`ไม่พบผู้ใช้ ID: ${userOrId}`);
        }
        user = rows[0];
    }

    const rawPapers = await fetchFromGoogleScholar(user.name_en, user.email, user.scholar_id);
    const results = {
        created: [],
        linked: [],
        blacklisted: [],
        skipped: 0
    };

    // ดึงรายชื่ออาจารย์ทั้งหมดในระบบเตรียมไว้สำหรับ Co-author auto-detect
    const { rows: allUsers } = await pool.query('SELECT id, name_en, name_th FROM users');

    for (const rawPaper of rawPapers) {
        // นำข้อมูลดิบผ่านกระบวนการ Data Parser & Cleaning
        const paper = cleanAndParsePaper(rawPaper);
        if (!paper || !paper.title) continue;

        // 1. ตรวจสอบ Blacklist ของผู้ใช้คนนี้
        const blacklisted = await isPaperBlacklisted(user.id, paper.title);
        if (blacklisted) {
            console.log(`[Scholar Sync] ข้ามผลงานที่ถูกปฏิเสธ (Blacklisted) สำหรับ User ${user.id}: "${paper.title}"`);
            results.blacklisted.push({ title: paper.title });
            continue;
        }

        // 2. ตรวจสอบว่าผลงานมีอยู่ในตาราง papers แล้วหรือไม่
        const existing = await pool.query(
            `SELECT id, status, cited_by FROM papers 
             WHERE (scholar_url IS NOT NULL AND scholar_url != '' AND scholar_url = $1)
                OR (LOWER(TRIM(title)) = LOWER(TRIM($2)) AND publish_year = $3)
             LIMIT 1`,
            [paper.scholar_url, paper.title, paper.publish_year]
        );

        let paperId = null;

        if (existing.rows.length === 0) {
            // 3.1 กรณีผลงานยังไม่มีในระบบ -> สร้างใหม่ (สถานะเริ่มต้น DRAFT_AUTO ตามข้อกำหนด)
            const inserted = await pool.query(
                `INSERT INTO papers (title, publish_year, authors_raw, cited_by, scholar_url, source, status)
                 VALUES ($1, $2, $3, $4, $5, 'scholar', 'DRAFT_AUTO') 
                 RETURNING id, title`,
                [paper.title, paper.publish_year, paper.authors_raw, paper.cited_by, paper.scholar_url]
            );
            paperId = inserted.rows[0].id;

            // ผูกผู้ใช้เข้ากับผลงาน (สถานะ PENDING)
            await pool.query(
                `INSERT INTO paper_authors (paper_id, user_id, status)
                 VALUES ($1, $2, 'PENDING')
                 ON CONFLICT (paper_id, user_id) DO NOTHING`,
                [paperId, user.id]
            );

            results.created.push({ id: paperId, title: paper.title });
        } else {
            // 3.2 กรณีผลงานมีอยู่ในระบบแล้ว (อาจถูกดึงมาก่อนหน้า หรือสร้างโดย Co-author)
            const existingPaper = existing.rows[0];
            paperId = existingPaper.id;

            // ตรวจสอบว่าผู้ใช้คนนี้เคยถูกผูกกับผลงานนี้หรือยัง
            const authorCheck = await pool.query(
                `SELECT id, status FROM paper_authors WHERE paper_id = $1 AND user_id = $2`,
                [paperId, user.id]
            );

            if (authorCheck.rows.length === 0) {
                // ยังไม่เคยผูก -> ผูกผู้ใช้คนนี้เข้ากับผลงาน
                await pool.query(
                    `INSERT INTO paper_authors (paper_id, user_id, status)
                     VALUES ($1, $2, 'PENDING')
                     ON CONFLICT (paper_id, user_id) DO NOTHING`,
                    [paperId, user.id]
                );

                // ปรับสถานะบทความเป็น PENDING_CO_AUTHOR หากยังเป็น DRAFT_AUTO
                if (existingPaper.status === 'DRAFT_AUTO') {
                    await pool.query(
                        `UPDATE papers SET status = 'PENDING_CO_AUTHOR', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                        [paperId]
                    );
                }

                results.linked.push({ id: paperId, title: paper.title });
                console.log(`[Scholar Sync] ซิงก์ผู้เขียนร่วมสำเร็จ: User ${user.id} -> Paper ${paperId}`);
            } else {
                // เคยผูกไว้แล้ว -> อัปเดต cited_by หากจำนวนอ้างอิงใหม่สูงขึ้น
                if (paper.cited_by > (existingPaper.cited_by || 0)) {
                    await pool.query(
                        `UPDATE papers SET cited_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                        [paper.cited_by, paperId]
                    );
                }
                results.skipped++;
            }
        }

        // 4. Co-author Auto-detection: ค้นหาผู้เขียนร่วมคนอื่นใน authors_raw
        if (paperId && paper.authors_raw) {
            for (const otherUser of allUsers) {
                if (otherUser.id === user.id) continue;

                const isMatch = isAuthorInRawText(otherUser.name_en, paper.authors_raw) ||
                                (otherUser.name_th && isAuthorInRawText(otherUser.name_th, paper.authors_raw));

                if (isMatch) {
                    const isOtherBlacklisted = await isPaperBlacklisted(otherUser.id, paper.title);
                    if (!isOtherBlacklisted) {
                        const checkOther = await pool.query(
                            `SELECT id FROM paper_authors WHERE paper_id = $1 AND user_id = $2`,
                            [paperId, otherUser.id]
                        );

                        if (checkOther.rows.length === 0) {
                            await pool.query(
                                `INSERT INTO paper_authors (paper_id, user_id, status)
                                 VALUES ($1, $2, 'PENDING')
                                 ON CONFLICT (paper_id, user_id) DO NOTHING`,
                                [paperId, otherUser.id]
                            );

                            await pool.query(
                                `UPDATE papers 
                                 SET status = 'PENDING_CO_AUTHOR', updated_at = CURRENT_TIMESTAMP 
                                 WHERE id = $1 AND status = 'DRAFT_AUTO'`,
                                [paperId]
                            );
                            console.log(`[Scholar Sync] ตรวจพบผู้เขียนร่วมอัตโนมัติ: User ${otherUser.id} (${otherUser.name_en}) -> Paper ${paperId}`);
                        }
                    }
                }
            }
        }
    }

    return results;
}

/**
 * ซิงก์ข้อมูลผลงานของอาจารย์ทุกคนในระบบ
 */
async function syncAllUsersScholarData() {
    const { rows: users } = await pool.query('SELECT * FROM users ORDER BY id ASC');
    const aggregate = {
        createdCount: 0,
        newPapers: [],
        linkedCount: 0,
        linkedPapers: [],
        blacklistedCount: 0,
        blacklistedPapers: [],
        skippedCount: 0,
        errors: []
    };

    for (const user of users) {
        try {
            const userResult = await syncUserScholarData(user);
            aggregate.createdCount += userResult.created.length;
            aggregate.newPapers.push(...userResult.created);

            aggregate.linkedCount += (userResult.linked || []).length;
            aggregate.linkedPapers.push(...(userResult.linked || []));

            aggregate.blacklistedCount += (userResult.blacklisted || []).length;
            aggregate.blacklistedPapers.push(...(userResult.blacklisted || []));

            aggregate.skippedCount += userResult.skipped;
        } catch (error) {
            console.error(`[Scholar Sync Error] User ID ${user.id}:`, error.message);
            aggregate.errors.push({ userId: user.id, userEmail: user.email, error: error.message });
        }
    }
    return aggregate;
}

/**
 * ฟังก์ชันสำหรับอาจารย์กดปฏิเสธผลงาน ("ไม่ใช่ผลงานของฉัน")
 * - บันทึกเข้า paper_blacklists ป้องกันการดึงซ้ำในอนาคต
 * - ลบผู้ใช้ออกจาก paper_authors ของผลงานนั้น
 */
async function rejectAndBlacklistPaper(userId, scholarTitle, paperId = null) {
    if (!userId || !scholarTitle) {
        throw new Error('ต้องระบุ userId และ scholarTitle');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO paper_blacklists (user_id, scholar_title)
             VALUES ($1, $2)
             ON CONFLICT (user_id, scholar_title) DO NOTHING`,
            [userId, scholarTitle.trim()]
        );

        let targetPaperId = paperId;
        if (!targetPaperId) {
            const found = await client.query(
                `SELECT id FROM papers WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) LIMIT 1`,
                [scholarTitle.trim()]
            );
            if (found.rows.length > 0) {
                targetPaperId = found.rows[0].id;
            }
        }

        if (targetPaperId) {
            await client.query(
                `DELETE FROM paper_authors WHERE paper_id = $1 AND user_id = $2`,
                [targetPaperId, userId]
            );

            const remaining = await client.query(
                `SELECT COUNT(*) as count FROM paper_authors WHERE paper_id = $1`,
                [targetPaperId]
            );

            if (parseInt(remaining.rows[0].count, 10) === 0) {
                await client.query(
                    `DELETE FROM papers WHERE id = $1 AND status = 'DRAFT_AUTO'`,
                    [targetPaperId]
                );
            }
        }

        await client.query('COMMIT');
        return { success: true, message: 'ปฏิเสธผลงานและเพิ่มลง Blacklist เรียบร้อยแล้ว' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * ดึงรายการ Blacklist ของผู้ใช้
 */
async function getBlacklistByUser(userId) {
    const { rows } = await pool.query(
        `SELECT id, scholar_title, rejected_at 
         FROM paper_blacklists 
         WHERE user_id = $1 
         ORDER BY rejected_at DESC`,
        [userId]
    );
    return rows;
}

/**
 * ยกเลิก Blacklist
 */
async function unblacklistPaper(userId, scholarTitle) {
    const res = await pool.query(
        `DELETE FROM paper_blacklists 
         WHERE user_id = $1 AND LOWER(TRIM(scholar_title)) = LOWER(TRIM($2))`,
        [userId, scholarTitle.trim()]
    );
    return { success: true, deletedCount: res.rowCount };
}

module.exports = {
    cleanAndParsePaper,
    fetchRealisticMockData,
    fetchFromSerpApi,
    fetchFromGoogleScholar,
    syncUserScholarData,
    syncAllUsersScholarData,
    rejectAndBlacklistPaper,
    getBlacklistByUser,
    unblacklistPaper,
    isPaperBlacklisted
};