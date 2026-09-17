import React from "react";
import { 
  BookMarked, 
  Plus, 
  Coins, 
  Clock, 
  CalendarDays, 
  CheckCircle2,
  Search,
  LayoutGrid,
  List,
  Filter,
  Users,
  Globe,
  Calendar,
  Sparkles,
  Award,
  ExternalLink,
  Trash2
} from "lucide-react";
import WorkloadList from "./WorkloadList";
import WorkloadTable from "./WorkloadTable";

export default function DashboardView({
  entries,
  totals,
  filteredEntries,
  searchTerm,
  setSearchTerm,
  selectedCategoryFilter,
  setSelectedCategoryFilter,
  viewMode,
  setViewMode,
  handleDelete,
  onAddNew,
}) {
  const renderDbBadge = (dbName) => {
    if (!dbName || dbName === "ไม่มีฐานข้อมูล") {
      return <span className="badge-db badge-db-none">ไม่มีฐานข้อมูล</span>;
    }
    if (dbName.startsWith("Scopus")) {
      return <span className="badge-db badge-db-scopus"><Sparkles size={11} style={{ marginRight: 4 }} /> {dbName}</span>;
    }
    if (dbName.startsWith("TCI")) {
      return <span className="badge-db badge-db-tci"><Award size={11} style={{ marginRight: 4 }} /> {dbName}</span>;
    }
    return <span className="badge-db badge-db-none">{dbName}</span>;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-top-banner">
        <h2 className="dashboard-intro-title">
          นี่คือภาพรวมผลงานวิชาการของคุณในภาคเรียนนี้
        </h2>
        <button
          type="button"
          onClick={onAddNew}
          className="btn-ams-primary-add"
        >
          <Plus size={16} />
          <span>เพิ่มผลงานใหม่</span>
        </button>
      </div>

      <div className="dashboard-top-grid">
        <div className="ams-score-card">
          <div className="score-card-title">คะแนนภาระงาน</div>

          <div className="donut-chart-wrapper">
            {(() => {
              const targetHours = 200;
              const pct = Math.min(100, Math.round(((totals.hours || 0) / targetHours) * 100)) || 85;
              const strokeDash = `${pct} ${100 - pct}`;
              return (
                <>
                  <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#ede9fe"
                      strokeWidth="3.8"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="3.8"
                      strokeDasharray={strokeDash}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="donut-center-content">
                    <div className="donut-pct-text">{pct}%</div>
                    <div className="donut-sub-text">สำเร็จแล้ว</div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="workload-target-progress-box">
            <div className="workload-progress-labels">
              <span>ชั่วโมงที่ทำได้จริง</span>
              <span><b>{totals.hours || 0}</b> ชม.</span>
            </div>
          </div>
        </div>

        <div className="ams-kpi-card kpi-border-purple">
          <div className="kpi-card-top">
            <div className="kpi-icon-square kpi-icon-purple">
              <BookMarked size={20} />
            </div>
            <span className="kpi-term-pill">ภาคเรียน 1/2567</span>
          </div>
          <div>
            <div className="kpi-title-label">ผลงานทั้งหมด</div>
            <div className="kpi-main-number">
              {totals.count} <span className="kpi-unit-label">ชิ้น</span>
            </div>
          </div>
        </div>

        <div className="ams-kpi-card kpi-border-green">
          <div className="kpi-card-top">
            <div className="kpi-icon-square kpi-icon-green">
              <Coins size={20} />
            </div>
            <span className="kpi-term-pill" style={{ color: "#059669", background: "#ecfdf5" }}>งวดถัดไป</span>
          </div>
          <div>
            <div className="kpi-title-label">รอบการจ่ายเงินถัดไป</div>
            <div className="kpi-date-value">25 พ.ย.</div>
            <div className="kpi-status-subtext">
              <CheckCircle2 size={13} />
              <span>เอกสารครบถ้วน ({(totals.faculty + totals.uni).toLocaleString()} ฿)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหาชื่อผลงาน, ผู้แต่ง, วารสาร, DOI หรือชื่ออาจารย์..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="view-mode-switchers">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "card" ? "active" : ""}`}
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid size={15} />
            แบบการ์ด (Cards)
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <List size={15} />
            แบบตาราง (Table)
          </button>
        </div>
      </div>

      <div className="category-filter-pills">
        {["ทั้งหมด", "วารสารวิชาการ", "การประชุมวิชาการ", "ทรัพย์สินทางปัญญา", "งานสร้างสรรค์"].map(cat => (
          <button
            key={cat}
            type="button"
            className={`filter-pill ${selectedCategoryFilter === cat ? "active" : ""}`}
            onClick={() => setSelectedCategoryFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <BookMarked size={40} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, color: "#1e1b4b", marginBottom: 6 }}>
            {searchTerm ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูลผลงานที่ถูกบันทึก"}
          </h3>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            {searchTerm ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่" : "สามารถเริ่มบันทึกผลงานได้ที่เมนู 'คำนวณและประเมินภาระงาน'"}
          </p>
        </div>
      ) : viewMode === "card" ? (
        <WorkloadList entries={filteredEntries} onDelete={handleDelete} renderDbBadge={renderDbBadge} />
      ) : (
        <WorkloadTable entries={filteredEntries} onDelete={handleDelete} renderDbBadge={renderDbBadge} />
      )}
    </div>
  );
}