const { Pool } = require('pg');
require('dotenv').config();

console.log("-> DB_USER:", process.env.DB_USER);
console.log("-> DB_PASSWORD:", process.env.DB_PASSWORD ? "Loaded" : "Missing!");

// สร้าง Pool สำหรับเชื่อมต่อ PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// ฟังก์ชันสร้างตารางฐานข้อมูล
async function initDB() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS research_papers (
            id SERIAL PRIMARY KEY,
            article_title TEXT,
            publish_date DATE,
            authors JSONB,
            author_contribution TEXT,
            file_name VARCHAR(255),
            bucket_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            study_design TEXT,
            participants JSONB DEFAULT '{"description": "", "sample_size": ""}'::jsonb
        );
    `;
    
    try {
        await pool.query(createTableQuery);
        console.log('[Database] ตรวจสอบและสร้างตาราง research_papers พร้อมใช้งาน');
    } catch (err) {
        console.error('[Database Error]: เชื่อมต่อหรือสร้างตารางไม่สำเร็จ', err.message);
    }
}

initDB();

module.exports = { pool };