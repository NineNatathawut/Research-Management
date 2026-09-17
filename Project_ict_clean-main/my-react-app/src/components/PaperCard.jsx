import React from 'react';
import { Calendar, Users, Award, BookOpen, ExternalLink } from 'lucide-react';

export default function PaperCard({ paper, currentUser, onConfirm, onReject, onImport }) {
  const isConfirmed = paper.author_status === 'CONFIRMED';

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      borderLeft: `4px solid ${isConfirmed ? '#10b981' : '#f59e0b'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <h3
            onClick={() => onImport(paper)}
            onMouseOver={(e) => {
              e.target.style.textDecoration = 'underline';
              e.target.style.color = '#4A148C';
            }}
            onMouseOut={(e) => {
              e.target.style.textDecoration = 'none';
              e.target.style.color = '#1e293b';
            }}
            style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1e293b',
              lineHeight: '1.4',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            title="คลิกเพื่อนำเข้าข้อมูลไปยังหน้าคำนวณภาระงาน"
          >
            {paper.title}
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> {paper.publish_year || 'N/A'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} /> {paper.authors_raw?.split(',').map(n => n.trim()).filter(Boolean).join(', ') || ''}
            </span>
            {paper.cited_by > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontWeight: '500' }}>
                <Award size={14} /> {paper.cited_by} citations
              </span>
            )}
          </div>

          {paper.journal && (
            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookOpen size={14} color="#B08D38" />
              <span>{paper.journal} {paper.volume && `Vol.${paper.volume}`} {paper.issue && `No.${paper.issue}`}</span>
            </div>
          )}

          {paper.scholar_url && (
            <a
              href={paper.scholar_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '13px', color: '#4A148C', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}
            >
              <ExternalLink size={13} /> ดูที่ Google Scholar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}