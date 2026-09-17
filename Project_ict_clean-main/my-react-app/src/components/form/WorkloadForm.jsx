import React from "react";
import { 
  BookMarked, 
  Plus, 
  Coins, 
  Clock, 
  CalendarDays, 
  CheckCircle2,
  FileText,
  Layers,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Award,
  ExternalLink,
  Users,
  Globe,
  Calendar
} from "lucide-react";
import { TYPE_GROUPS, AUTHOR_OPTIONS, DB_OPTIONS } from "../../constants/workloadData";
import LivePreviewCard from "../dashboard/LivePreviewCard";

export default function WorkloadForm({
  form,
  setForm,
  previewData,
  activeMainCategory,
  pdfModalOpen,
  setPdfModalOpen,
  handleSave,
}) {
  return (
    <div className="form-grid-layout">
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <FileText size={20} color="#6C2BD9" />
            <h2 className="card-title">ข้อมูลผลงานและรายละเอียดบทความ</h2>
          </div>
        </div>

        <div className="form-group">
          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="btn-ai-extract"
          >
            <Sparkles size={16} />
            ✨ ดึงข้อมูลอัตโนมัติจากไฟล์ PDF ด้วย AI
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">เลือกกลุ่มประเภทผลงานวิชาการ</label>
          <div className="category-tiles-grid">
            {TYPE_GROUPS.map(g => (
              <div
                key={g.label}
                className={`category-tile ${activeMainCategory === g.label ? 'active' : ''}`}
                onClick={() => setForm({ ...form, type: g.types[0] })}
              >
                <span className="category-tile-title">{g.label}</span>
                <span style={{ fontSize: 11, color: "#8b94a5" }}>{g.types.length} ประเภทย่อย</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">ประเภทผลงานย่อย</label>
          <select
            className="form-control"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            {TYPE_GROUPS.find(g => g.label === activeMainCategory)?.types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            Title (ชื่อเรื่อง / ชื่อบทความ) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="กรอกชื่อบทความวิจัย / ชื่อผลงานวิชาการ"
            value={form.title || ""}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Authors (ผู้แต่ง / ผู้เขียน) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น Somchai J., Somying R., Kittisak P."
            value={form.authors || ""}
            onChange={e => setForm({ ...form, authors: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Affiliations (สถาบัน / หน่วยงานต้นสังกัดของผู้แต่ง) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น Faculty of ICT, Mahidol University"
            value={form.affiliations || ""}
            onChange={e => setForm({ ...form, affiliations: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Corresponding Author (ผู้แต่งที่ทำหน้าที่ติดต่อ / ผู้รับผิดชอบบทความ) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น Somchai J. (somchai.j@ict.university.ac.th)"
            value={form.correspondingAuthor || ""}
            onChange={e => setForm({ ...form, correspondingAuthor: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Journal (ชื่อวารสาร / แหล่งตีพิมพ์) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="กรอกชื่อวารสารทางวิชาการ หรือการประชุมวิชาการ"
            value={form.journal || ""}
            onChange={e => setForm({ ...form, journal: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            DOI (รหัส DOI ประจำตัวดิจิทัลของบทความ) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น 10.1109/ACCESS.2023.1234567"
            value={form.doi || ""}
            onChange={e => setForm({ ...form, doi: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Publication Date (วันที่ตีพิมพ์ / เผยแพร่) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="date"
            className="form-control"
            value={form.publicationDate || form.date || ""}
            onChange={e => setForm({ ...form, publicationDate: e.target.value, date: e.target.value })}
            required
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label">Volume (ปีที่ / เล่มที่พิมพ์)</label>
            <input
              type="text"
              className="form-control"
              placeholder="เช่น 12"
              value={form.volume || ""}
              onChange={e => setForm({ ...form, volume: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Issue (ฉบับที่พิมพ์)</label>
            <input
              type="text"
              className="form-control"
              placeholder="เช่น 4"
              value={form.issue || ""}
              onChange={e => setForm({ ...form, issue: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Abstract (บทคัดย่อ)</label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="สรุปเนื้อหาและบทคัดย่อของผลงานวิจัย..."
            value={form.abstract || ""}
            onChange={e => setForm({ ...form, abstract: e.target.value })}
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Keywords (คำสำคัญ)</label>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น Machine Learning, NLP, Data Mining (คั่นด้วยจุลภาค)"
            value={form.keywords || ""}
            onChange={e => setForm({ ...form, keywords: e.target.value })}
          />
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: "20px 0" }} />

        <div className="form-group">
          <label className="form-label">ชื่ออาจารย์ / ผู้ยื่นขอประเมินภาระงาน</label>
          <input
            type="text"
            className="form-control"
            placeholder="กรอกชื่อ-นามสกุลอาจารย์ หรือผู้จัดทำผลงาน"
            value={form.authorName || ""}
            onChange={e => setForm({ ...form, authorName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">ตำแหน่งผู้ประพันธ์ (ของผู้ยื่น)</label>
          <select
            className="form-control"
            value={form.author}
            onChange={e => setForm({ ...form, author: e.target.value })}
          >
            {AUTHOR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">ประเภทผลงานวิชาการ</label>
          <select
            className="form-control"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            {TYPE_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map(t => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">ฐานข้อมูล / การรับรอง</label>
          <select
            className="form-control"
            value={form.db}
            onChange={e => setForm({ ...form, db: e.target.value })}
          >
            {DB_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" style={{ margin: 0 }}>สัดส่วนการมีส่วนร่วม (%)</label>
            <span className="badge-value">
              {form.proportion !== "" ? `${form.proportion}%` : "0%"}
            </span>
          </div>
          <input
            type="number"
            min="0"
            max="100"
            value={form.proportion}
            onChange={e => {
              const val = e.target.value;
              if (val === "") {
                setForm({ ...form, proportion: "" });
              } else {
                const num = Number(val);
                if (num >= 0 && num <= 100) {
                  setForm({ ...form, proportion: num });
                }
              }
            }}
            placeholder="กรอกตัวเลข 0 - 100"
            className="form-control"
          />
          <div className="preset-buttons">
            {[100, 50, 33.3, 25].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => setForm({ ...form, proportion: pct })}
                className={`preset-btn ${form.proportion === pct ? "active" : ""}`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="preview-card-purple">
        <div className="purple-card-header">
          <div className="purple-card-title">
            <Layers size={18} />
            <span>สรุปผลคำนวณภาระงานที่คุณจะได้รับ</span>
          </div>
          <span className="purple-live-badge">Live Preview</span>
        </div>

        <LivePreviewCard 
          previewData={previewData} 
          proportion={form.proportion} 
          onSave={handleSave} 
        />
      </div>
    </div>
  );
}