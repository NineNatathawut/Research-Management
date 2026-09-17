import React from "react";
import { Users, BookMarked, Globe, Calendar, Trash2, ExternalLink } from "lucide-react";

export default function WorkloadList({ entries, onDelete, renderDbBadge }) {
  return (
    <div className="entries-grid-cards">
      {entries.map(e => (
        <div key={e.id} className="entry-card-square">
          <div>
            <div className="card-top-badges">
              <div className="card-badges-left">
                <span className="entry-code-badge">{e.code || "เกณฑ์"}</span>
                {typeof renderDbBadge === 'function' ? (
                  <span className={`badge-db ${e.db?.startsWith("Scopus") ? "badge-db-scopus" : e.db?.startsWith("TCI") ? "badge-db-tci" : "badge-db-none"}`}>
                    {renderDbBadge(e.db)}
                  </span>
                ) : (
                  <span className="badge-db badge-db-none">{renderDbBadge(e.db)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                title="ลบรายการผลงาน"
                className="card-btn-delete"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <h3 className="card-publication-title" title={e.title || e.type}>
              {e.title || e.type}
            </h3>

            <div className="card-meta-list">
              {e.authors && (
                <div className="card-meta-item">
                  <Users size={15} className="card-meta-icon" />
                  <span className="card-meta-text"><strong>ผู้แต่ง:</strong> {e.authors}</span>
                </div>
              )}

              {e.journal && (
                <div className="card-meta-item">
                  <BookMarked size={15} className="card-meta-icon" />
                  <span className="card-meta-text">
                    <strong>วารสาร/แหล่งตีพิมพ์:</strong> <span style={{ color: "#6d28d9", fontWeight: 600 }}>{e.journal}</span>
                    {e.volume && ` (Vol.${e.volume})`}
                    {e.issue && ` (No.${e.issue})`}
                  </span>
                </div>
              )}

              {e.doi && (
                <div className="card-meta-item">
                  <Globe size={15} className="card-meta-icon" />
                  <span className="card-meta-text">
                    <strong>DOI:</strong>{" "}
                    <a
                      href={e.doi.startsWith("http") ? e.doi : `https://doi.org/${e.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#6d28d9", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                    >
                      {e.doi} <ExternalLink size={11} />
                    </a>
                  </span>
                </div>
              )}

              {(e.publicationDate || e.date) && (
                <div className="card-meta-item">
                  <Calendar size={15} className="card-meta-icon" />
                  <span className="card-meta-text">
                    <strong>วันที่เผยแพร่:</strong> {e.publicationDate || e.date}
                  </span>
                </div>
              )}

              {e.abstract && (
                <details className="card-abstract-details">
                  <summary>ดูบทคัดย่อ (Abstract)</summary>
                  <p>{e.abstract}</p>
                </details>
              )}
            </div>
          </div>

          <div className="card-bottom-metrics">
            <div className="card-stat-block">
              <span className="card-stat-lbl">ผู้ยื่น / สัดส่วน</span>
              <span className="card-stat-val" style={{ fontSize: 13 }} title={e.authorName || e.author}>
                {e.proportion}% ({e.author || "Author"})
              </span>
            </div>

            <div className="card-stat-block">
              <span className="card-stat-lbl">ภาระงานจริง</span>
              <span className="card-stat-val">
                {e.actualHours} <span style={{ fontSize: 11, fontWeight: 500 }}>ชม.</span>
              </span>
            </div>

            <div className="card-stat-block">
              <span className="card-stat-lbl">เงินสนับสนุน</span>
              <span className="card-stat-val green">
                {((e.faculty || 0) + (e.uni || 0)) > 0 ? `${((e.faculty || 0) + (e.uni || 0)).toLocaleString()} ฿` : "-"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}