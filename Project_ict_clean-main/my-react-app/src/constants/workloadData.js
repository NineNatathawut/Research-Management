export const LOOKUP_TABLE = [
  { type: "การประชุมวิชาการระดับชาติ (สายสนับสนุน)", db: "ไม่มีฐานข้อมูล", code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับชาติ (สายวิชาการ)", db: "ไม่มีฐานข้อมูล", code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับนานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 2", code: "2.1.6", hours: 80, quality: 0.6, faculty: 2500, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 1", code: "2.1.7", hours: 120, quality: 0.8, faculty: 2500, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.7", hours: 120, quality: 0.8, faculty: 10000, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q1", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 40000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q2", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 30000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q3", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 20000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q4", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 10000 },
  { type: "จดทะเบียนทรัพย์สินทางปัญหาอื่นๆ", db: "ไม่มีฐานข้อมูล", code: "2.1.9", hours: 150, quality: 0, faculty: 0, uni: 1000 },
  { type: "จดทะเบียนอนุสิทธิบัตร", db: "ไม่มีฐานข้อมูล", code: "2.1.10", hours: 150, quality: 0.4, faculty: 0, uni: 3000 },
  { type: "จดทะเบียนสิทธิบัตร", db: "ไม่มีฐานข้อมูล", code: "2.1.11", hours: 300, quality: 1, faculty: 0, uni: 5000 },
  { type: "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)", db: "ไม่มีฐานข้อมูล", code: "2.2.1", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน", db: "ไม่มีฐานข้อมูล", code: "2.2.2", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.2.3", hours: 80, quality: 0.6, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ", db: "ไม่มีฐานข้อมูล", code: "2.2.4", hours: 120, quality: 0.8, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.2.5", hours: 150, quality: 1, faculty: 0, uni: 0 },
];

export const TYPE_GROUPS = [
  {
    label: "การประชุมวิชาการ",
    types: [
      "การประชุมวิชาการระดับชาติ (สายสนับสนุน)",
      "การประชุมวิชาการระดับชาติ (สายวิชาการ)",
      "การประชุมวิชาการระดับนานาชาติ"
    ]
  },
  { label: "วารสารวิชาการ", types: ["วารสารระดับชาติ", "วารสารระดับนานาชาติ"] },
  { label: "ทรัพย์สินทางปัญญา", types: ["จดทะเบียนทรัพย์สินทางปัญหาอื่นๆ", "จดทะเบียนอนุสิทธิบัตร", "จดทะเบียนสิทธิบัตร"] },
  {
    label: "งานสร้างสรรค์",
    types: [
      "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ",
    ],
  },
];

export const AUTHOR_OPTIONS = ["First author", "Corresponding author", "Co author"];
export const DB_OPTIONS = ["ไม่มีฐานข้อมูล", "TCI กลุ่ม 2", "TCI กลุ่ม 1", "Scopus Q1", "Scopus Q2", "Scopus Q3", "Scopus Q4"];

export const emptyForm = { 
  title: "", 
  authors: "",
  affiliations: "",
  correspondingAuthor: "",
  publicationDate: "",
  doi: "",
  journal: "",
  volume: "",
  issue: "",
  abstract: "",
  keywords: "",
  authorName: "", 
  author: AUTHOR_OPTIONS[0], 
  type: TYPE_GROUPS[0].types[0], 
  db: DB_OPTIONS[0], 
  proportion: 100, 
  date: "" 
};

export const renderDbBadge = (dbName) => {
  if (!dbName || dbName === "ไม่มีฐานข้อมูล") {
    return "ไม่มีฐานข้อมูล";
  }
  if (dbName.startsWith("Scopus")) {
    return `Scopus: ${dbName}`;
  }
  if (dbName.startsWith("TCI")) {
    return `TCI: ${dbName}`;
  }
  return dbName;
};