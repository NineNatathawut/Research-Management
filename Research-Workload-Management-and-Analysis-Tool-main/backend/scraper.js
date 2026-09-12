const puppeteer = require('puppeteer');
const { pool } = require('./db');

async function scrapeGoogleScholar() {
    // 1. ดึงข้อมูลอาจารย์เฉพาะคนที่มี Scholar ID
    const { rows: users } = await pool.query('SELECT id, name_en, scholar_id FROM users WHERE scholar_id IS NOT NULL');
    
    console.log(`พบอาจารย์ที่มี Scholar ID จำนวน ${users.length} ท่าน`);

    // เปิดเบราว์เซอร์แบบมองไม่เห็น (Headless)
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    for (const user of users) {
        console.log(`\nกำลังดึงข้อมูลของ: ${user.name_en} (ID: ${user.scholar_id})`);
        
        try {
            // 2. ไปที่หน้าโปรไฟล์ Google Scholar
            const url = `https://scholar.google.com/citations?user=${user.scholar_id}&hl=en`;
            await page.goto(url, { waitUntil: 'networkidle2' });

            // 3. รอให้ตารางผลงาน (.gsc_a_tr) ปรากฏขึ้นมาก่อน (รอสูงสุด 15 วินาที)
            try {
                await page.waitForSelector('.gsc_a_tr', { timeout: 15000 });
            } catch (e) {
                console.log(`  -> ไม่พบผลงานหรือหน้าโปรไฟล์โหลดช้าเกินไป`);
                
                // ถ่ายภาพหน้าจอเพื่อตรวจสอบว่าติด CAPTCHA หรือไม่
                await page.screenshot({ path: `error_${user.scholar_id}.png` });
                console.log(`  -> 📸 บันทึกภาพหน้าจอไว้ที่ error_${user.scholar_id}.png กรุณาเปิดดูเพื่อตรวจสอบ`);
                
                continue; // ข้ามไปดึงข้อมูลคนถัดไป
            }

            // 4. ใช้ Selector ดึงข้อมูลผลงานทั้งหมดในหน้านั้น
            const papers = await page.evaluate(() => {
                const results = [];
                // จับแถวของผลงานแต่ละชิ้น
                const rows = document.querySelectorAll('.gsc_a_tr');
                
                rows.forEach(row => {
                    const titleEl = row.querySelector('.gsc_a_at');
                    const authorsEl = row.querySelector('.gs_gray'); // บรรทัดแรกคือผู้แต่ง
                    const yearEl = row.querySelector('.gsc_a_hc');   // ปีที่ตีพิมพ์
                    const citeEl = row.querySelector('.gsc_a_ac');   // จำนวนการอ้างอิง

                    if (titleEl) {
                        results.push({
                            // ใช้ textContent แทน innerText เพื่อแก้ปัญหาอักษรขาดหายในโหมด Headless
                            title: titleEl.textContent.trim(),
                            authors: authorsEl ? authorsEl.textContent.trim() : '',
                            year: yearEl && yearEl.textContent.trim() !== '' ? parseInt(yearEl.textContent.trim()) : null,
                            citedBy: citeEl && citeEl.textContent.trim() !== '' ? parseInt(citeEl.textContent.trim()) : 0
                        });
                    }
                });
                return results;
            });

            console.log(`ดึงผลงานได้ ${papers.length} รายการ:`);
            
            // 4. บันทึกลง Database
            for (const paper of papers) {
                // เช็คว่ามีผลงานนี้ในระบบหรือยัง
                const checkExist = await pool.query('SELECT id FROM papers WHERE title = $1', [paper.title]);
                
                let paperId;
                if (checkExist.rows.length === 0) {
                    const insertPaper = await pool.query(
                        `INSERT INTO papers (title, publish_year, authors_raw, cited_by, status) 
                         VALUES ($1, $2, $3, $4, 'DRAFT_AUTO') RETURNING id`,
                        [paper.title, paper.year, paper.authors, paper.citedBy]
                    );
                    paperId = insertPaper.rows[0].id;
                    console.log(`  -> เพิ่มใหม่: ${paper.title}`);
                } else {
                    paperId = checkExist.rows[0].id;
                }

                // ผูกผลงานกับอาจารย์ (ป้องกันการผูกซ้ำด้วย ON CONFLICT)
                await pool.query(
                    `INSERT INTO paper_authors (paper_id, user_id, status) 
                     VALUES ($1, $2, 'PENDING') 
                     ON CONFLICT (paper_id, user_id) DO NOTHING`,
                    [paperId, user.id]
                );
            }

            // หน่วงเวลาสุ่ม 2-5 วินาที ป้องกัน Google บล็อก
            const sleepTime = Math.floor(Math.random() * 3000) + 2000;
            await new Promise(r => setTimeout(r, sleepTime));

        } catch (error) {
            console.error(`เกิดข้อผิดพลาดกับอาจารย์ ${user.name_en}:`, error.message);
        }
    }

    await browser.close();
    console.log('\n--- เสร็จสิ้นการดึงข้อมูลทั้งหมด ---');
    return { success: true };
}

if (require.main === module) {
    scrapeGoogleScholar().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { scrapeGoogleScholar };