import React from "react";
import { Layers, Clock, Coins, CalendarDays, Plus } from "lucide-react";

export default function LivePreviewCard({ previewData, proportion, onSave }) {
  if (!previewData) {
    return (
      <div style={{ textAlign: "center", padding: "40px 10px", color: "#e9d5ff" }}>
        <Clock size={32} style={{ margin: "0 auto 10px", opacity: 0.8 }} />
        <p style={{ fontSize: 14 }}>กำลังประมวลผลคะแนน...</p>
      </div>
    );
  }

  return (
    <>
      <div className="purple-hero-stat">
        <div className="hero-stat-label">ชั่วโมงภาระงานที่ได้รับจริง</div>
        <div className="hero-stat-number">
          {previewData.actualHours}
          <span className="hero-stat-unit">ชม.</span>
        </div>
        <div className="hero-stat-formula">
          = {previewData.hours} ชม.ฐาน × {proportion || 0}% สัดส่วน
        </div>
      </div>

      <div className="purple-metrics-grid">
        <div className="purple-metric-item">
          <div className="purple-metric-label">รหัสเกณฑ์</div>
          <div className="purple-metric-val">{previewData.code}</div>
        </div>
        <div className="purple-metric-item">
          <div className="purple-metric-label">ชั่วโมงฐาน</div>
          <div className="purple-metric-val">{previewData.hours} ชม.</div>
        </div>
        <div className="purple-metric-item">
          <div className="purple-metric-label">ค่าน้ำหนัก (Q)</div>
          <div className="purple-metric-val">{previewData.quality}</div>
        </div>
      </div>

      <div className="purple-finance-box">
        <div className="purple-finance-row">
          <span className="purple-finance-name">
            <Coins size={14} color="#fde047" /> เงินสนับสนุนคณะ
          </span>
          <span className="purple-finance-amount">
            {previewData.faculty > 0 ? `${previewData.faculty.toLocaleString()} ฿` : "-"}
          </span>
        </div>
        {previewData.facultyNote && (
          <div style={{ fontSize: 11, color: "#fef08a", marginTop: -4 }}>
            * {previewData.facultyNote}
          </div>
        )}
        <div className="purple-finance-row">
          <span className="purple-finance-name">
            <Coins size={14} color="#86efac" /> เงินสนับสนุนมหาวิทยาลัย
          </span>
          <span className="purple-finance-amount">
            {previewData.uni > 0 ? `${previewData.uni.toLocaleString()} ฿` : "-"}
          </span>
        </div>
      </div>

      {previewData.dateInfo && (
        <div className="purple-calendar-tags">
          <span className="purple-calendar-chip">
            <CalendarDays size={11} style={{ marginRight: 4, display: "inline" }} />
            {previewData.dateInfo.beLabel}
          </span>
          <span className="purple-calendar-chip">{previewData.dateInfo.acadLabel}</span>
          <span className="purple-calendar-chip">{previewData.dateInfo.fiscalLabel}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        className="btn-purple-save"
      >
        <Plus size={18} />
        บันทึกผลงานลงระบบ
      </button>
    </>
  );
}