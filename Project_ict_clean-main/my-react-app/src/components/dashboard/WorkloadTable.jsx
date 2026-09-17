import React from "react";
import { Trash2 } from "lucide-react";

export default function WorkloadTable({ entries, onDelete, renderDbBadge }) {
  const getDbBadge = (db) => {
    if (!db || db === "ไม่มีฐานข้อมูล") {
      return <span className="badge-db badge-db-none">ไม่มีฐานข้อมูล</span>;
    }
    if (db.startsWith("Scopus")) {
      return <span className="badge-db badge-db-scopus">{db}</span>;
    }
    if (db.startsWith("TCI")) {
      return <span className="badge-db badge-db-tci">{db}</span>;
    }
    return <span className="badge-db badge-db-none">{db}</span>;
  };

  return (
    <div className="table-view-container">
      <table className="modern-table">
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่องานวิจัย / ผลงาน</th>
            <th>ฐานข้อมูล</th>
            <th>ผู้ยื่นขอประเมิน</th>
            <th>สัดส่วน</th>
            <th>ชั่วโมงจริง</th>
            <th>งบสนับสนุน</th>
            <th style={{ textAlign: "center" }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td>
                <span className="entry-code-badge">{e.code || "เกณฑ์"}</span>
              </td>
              <td className="table-title-cell">
                <div className="table-title-text">{e.title || e.type}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{e.journal || e.type}</div>
              </td>
              <td>{getDbBadge(e.db)}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{e.authorName || "-"}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{e.author}</div>
              </td>
              <td><b>{e.proportion}%</b></td>
              <td>
                <span style={{ fontWeight: 700, color: "#6C2BD9" }}>{e.actualHours} ชม.</span>
              </td>
              <td>
                {((e.faculty || 0) + (e.uni || 0)) > 0 ? (
                  <span style={{ fontWeight: 600, color: "#059669" }}>
                    {((e.faculty || 0) + (e.uni || 0)).toLocaleString()} ฿
                  </span>
                ) : (
                  <span style={{ color: "#94a3b8" }}>-</span>
                )}
              </td>
              <td style={{ textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => onDelete(e.id)}
                  title="ลบรายการ"
                  className="card-btn-delete"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}