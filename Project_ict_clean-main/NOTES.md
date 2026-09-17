# 📘 โครงสร้างโปรเจกต์ (Project Architecture)

โปรเจกต์นี้ใช้โครงสร้างแบบ **Feature-based Architecture** แยกส่วนประกอบตามหน้าที่การทำงาน (Separation of Concerns)

## 📂 โครงสร้างโฟลเดอร์ปัจจุบัน
- `src/constants/workloadData.js` ➔ เก็บข้อมูลคงที่ (Lookup Table, ค่าเริ่มต้นฟอร์ม)
- `src/hooks/useWorkload.js` ➔ เก็บ State และ Business Logic ทั้งหมด (การเซฟ, ลบ, คำนวณคะแนน)
- `src/components/form/` ➔ ส่วนรับข้อมูลจากผู้ใช้
  - `WorkloadForm.jsx`: หน้าฟอร์มหลัก (แบ่ง 5 Sections)
  - `PdfUploadModal.jsx`: ป๊อปอัปสำหรับอัปโหลด PDF ให้ AI วิเคราะห์
- `src/components/dashboard/` ➔ ส่วนแสดงผล
  - `DashboardView.jsx`: หน้าแดชบอร์ดหลัก (KPI, ค้นหา)
  - `LivePreviewCard.jsx`: การ์ดสีม่วงด้านขวา (คำนวณคะแนนแบบ Real-time)
  - `WorkloadList.jsx`: แสดงผลแบบการ์ด
  - `WorkloadTable.jsx`: แสดงผลแบบตาราง
- `src/App.jsx` ➔ ไฟล์ศูนย์กลาง ทำหน้าที่เป็น Router สลับแท็บเท่านั้น

## 📝 แผนการพัฒนาต่อไป (Next Steps)
1. ปรับปรุงหน้า `WorkloadForm.jsx` ให้แบ่งเป็น 5 Sections
2. นำ `AuthorTable` (ตารางผู้แต่งแบบ Drag & Drop) มาใช้แทน Text input
3. เพิ่มแถบ `AIStatusBar` เพื่อแสดงความมั่นใจของ AI ที่สกัดจาก PDF




export const UP_ICT_FACULTY = [

  // ========================================================== 
  // 1. Computer Graphics and Multimedia 
  // ==========================================================

  { email: 'rachen.su@up.ac.th',
    name_en: 'Rachen Sookmuang',
    name_th: 'ราเชนทร์ สุขม่วง',
    department: 'Computer Graphics and Multimedia',
    position: 'ประธานหลักสูตร / อาจารย์', 
    scholar_id: null, 
  }, 

  {
    email: 'ratanapat.su@up.ac.th', 
    name_en: 'Ratanapat Suchat',
    name_th: 'รตนพรรษ สุชาติ', 
    department: 'Computer Graphics and Multimedia', 
    position: 'ผู้ช่วยศาสตราจารย์', 
    scholar_id: 'w0vNVh8AAAAJ', 
  },