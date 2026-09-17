import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  Search,
  User,
  Save,
  RefreshCw,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  BookOpen,
  Award,
  AlertCircle,
  Plus,
  Filter,
  X,
  BookMarked,
  Calendar,
  Coins,
  LayoutGrid,
  List,
  Loader2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PaperCard from './PaperCard';

const DEPARTMENT_ORDER = [
  'Computer Graphics and Multimedia',
  'Digital Business',
  'Information Technology',
  'Geoinformatics',
  'Computer Science',
  'Data Science and Applications',
  'Computer Engineering',
  'Software Engineering'
];

function parsePosition(position) {
  if (!position) return { specialRoles: [], academicRank: '' };
  const parts = position.split('/').map(p => p.trim());
  const specialKeywords = [
    'ประธานหลักสูตร', 'ประธาน', 'รองคณบดี', 'ผู้ช่วยคณบดี',
    'รองอธิการบดี', 'คณบดี', 'ประธานคณะ'
  ];
  const specialRoles = parts.filter(p => specialKeywords.some(k => p.includes(k)));
  const academicRank = parts.find(p => !specialKeywords.some(k => p.includes(k))) || '';
  return { specialRoles, academicRank };
}

export default function MyScholarDashboard({ onImportToForm }) {
  const { user } = useAuth();
  const [papers, setPapers] = useState([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(true);
  const [scholarIdInput, setScholarIdInput] = useState('');
  const [isSavingScholarId, setIsSavingScholarId] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scholarFeedback, setScholarFeedback] = useState('');
  const [scholarFeedbackType, setScholarFeedbackType] = useState('success');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isEditingScholarId, setIsEditingScholarId] = useState(false);

  const pendingCount = useMemo(() =>
    papers.filter(p => p.author_status === 'PENDING').length, [papers]);
  const confirmedCount = useMemo(() =>
    papers.filter(p => p.author_status === 'CONFIRMED').length, [papers]);
  const totalCitations = useMemo(() =>
    papers.reduce((sum, p) => sum + (Number(p.cited_by) || 0), 0), [papers]);

  const filteredPapers = useMemo(() => {
    return papers.filter(paper => {
      if (filterStatus !== 'ALL' && paper.author_status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (paper.title || '').toLowerCase().includes(q);
        const authorsMatch = (paper.authors_raw || '').toLowerCase().includes(q);
        const yearMatch = String(paper.publish_year || '').includes(q);
        return titleMatch || authorsMatch || yearMatch;
      }
      return true;
    });
  }, [papers, filterStatus, searchQuery]);

  const fetchUserPapers = useCallback(async (targetId) => {
    const id = (typeof targetId === 'number' || typeof targetId === 'string') ? targetId : user?.id;
    if (!id) return;

    setIsLoadingPapers(true);
    try {
      const res = await api.get(`/users/${id}/papers`);
      setPapers(res.data);
    } catch (error) {
      console.error('Fetch papers failed:', error);
    } finally {
      setIsLoadingPapers(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id && user?.scholar_id) {
      fetchUserPapers(user.id);
    } else if (user?.id) {
      setIsLoadingPapers(false);
    }
  }, [user]);

  const saveScholarId = async () => {
    if (!user?.id) return;
    setIsSavingScholarId(true);
    setScholarFeedback('');
    try {
      const res = await api.put(`/users/${user.id}/scholar-id`, {
        scholarId: scholarIdInput
      });
      setScholarFeedback('✓ บันทึก Scholar ID สำเร็จ');
      setScholarFeedbackType('success');
      setTimeout(() => setScholarFeedback(''), 3000);
    } catch (error) {
      console.error(error);
      setScholarFeedback(error?.response?.data?.error || 'บันทึก Scholar ID ไม่สำเร็จ');
      setScholarFeedbackType('error');
    } finally {
      setIsSavingScholarId(false);
    }
  };

  const triggerScholarSync = async () => {
    if (!user?.id) return;

    setIsSyncing(true);
    setScholarFeedback('🔄 กำลังดึงผลงานล่าสุดจาก Google Scholar แบบอัตโนมัติ...');
    setScholarFeedbackType('success');

    try {
      const res = await api.post(`/sync-scholar/${user.id}`);
      const data = res.data.data;
      setScholarFeedback(`✓ ซิงก์อัตโนมัติสำเร็จ! (เพิ่มใหม่ ${data.created.length} รายการ, เชื่อมโยง Co-author ${data.linked.length} รายการ)`);
      setScholarFeedbackType('success');
      await fetchUserPapers(user.id);
    } catch (error) {
      console.error(error);
      setScholarFeedback('❌ ซิงก์อัตโนมัติไม่สำเร็จ โปรดลองกดปุ่มซิงก์ใหม่อีกครั้ง');
      setScholarFeedbackType('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportToForm = (paper) => {
    const formData = {
      title: paper.title || '',
      authors: paper.authors_raw || '',
      journal: paper.journal || '',
      doi: paper.doi || '',
      publicationDate: paper.publish_year ? `${paper.publish_year}-01-01` : '',
      volume: paper.volume || '',
      issue: paper.issue || '',
      abstract: paper.abstract || '',
      keywords: paper.keywords || '',
      authorName: user?.name_th || user?.name_en || user?.full_name || '',
      correspondingAuthor: paper.corresponding_author || '',
      proportion: paper.contribution_percent || 100,
    };
    if (onImportToForm) {
      onImportToForm(formData);
    }
  };

  const handleConfirmPaper = async (paper, newContribution, isFirstAuthor, isCorresponding) => {
    if (!user?.id) return;
    try {
      await api.put(`/papers/${paper.paper_id}/confirm`, {
        userId: user.id,
        contributionPercent: newContribution,
        isFirstAuthor,
        isCorresponding
      });
      setPapers(prev => prev.map(p =>
        p.paper_id === paper.paper_id
          ? { ...p, contribution_percent: newContribution, is_first_author: isFirstAuthor, is_corresponding: isCorresponding, author_status: 'CONFIRMED' }
          : p
      ));
    } catch (error) {
      console.error('Confirm paper error:', error);
    }
  };

  const handlePaperRejected = (paperId) => {
    setPapers(prev => prev.filter(p => p.paper_id !== paperId));
  };

  if (!user?.id) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Loader2 size={48} color="#94a3b8" className="spin" />
        <p style={{ marginTop: '16px', color: '#64748b' }}>กำลังโหลดข้อมูลผู้ใช้งาน...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

      {/* 1. ส่วนหัว: ชื่อผู้ใช้และ Scholar ID */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#4A148C', fontSize: '28px', fontWeight: 'bold' }}>
          {user?.name_th || user?.name_en || user?.full_name}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FCFAEE', border: '1px solid #F0EAC5', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <GraduationCap size={16} color="#4A148C" />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4A148C' }}>Scholar ID:</span>

            {isEditingScholarId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  value={scholarIdInput}
                  onChange={(e) => setScholarIdInput(e.target.value)}
                  placeholder="เช่น m8nS_k8AAAAJ"
                  style={{ padding: '2px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '160px', outline: 'none' }}
                  autoFocus
                />
                <button
                  onClick={async () => { await saveScholarId(); setIsEditingScholarId(false); }}
                  disabled={isSavingScholarId}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="บันทึก"
                >
                  {isSavingScholarId ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                </button>
                <button
                  onClick={() => { setIsEditingScholarId(false); setScholarIdInput(user?.scholar_id || ''); }}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="ยกเลิก"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: user?.scholar_id ? '#64748b' : '#94a3b8' }}>
                  {user?.scholar_id || 'ยังไม่ระบุ'}
                </span>
                <button
                  onClick={() => setIsEditingScholarId(true)}
                  style={{ background: 'transparent', border: 'none', color: '#B08D38', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  title="แก้ไข ID"
                >
                  <Edit3 size={14} />
                </button>

                {user?.scholar_id && (
                  <button
                    onClick={triggerScholarSync}
                    disabled={isSyncing}
                    style={{ background: '#4A148C', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: isSyncing ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px', opacity: isSyncing ? 0.7 : 1 }}
                  >
                    <RefreshCw size={12} className={isSyncing ? "spin" : ""} />
                    {isSyncing ? 'กำลังซิงก์...' : 'ซิงก์'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {scholarFeedback && (
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: scholarFeedbackType === 'error' ? '#ef4444' : '#166534', fontWeight: '500' }}>
            {scholarFeedback}
          </p>
        )}
      </div>

      {/* 2. กล่องสถิติ (Stats Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'ผลงานทั้งหมด', value: papers.length, icon: <BookOpen size={24} />, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'รอยืนยัน (% ภาระงาน)', value: pendingCount, icon: <Clock size={24} />, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'ยืนยันเรียบร้อยแล้ว', value: confirmedCount, icon: <CheckCircle2 size={24} />, color: '#10b981', bg: '#dcfce7' },
          { label: 'ยอดการอ้างอิงรวม', value: totalCitations, icon: <Award size={24} />, color: '#8b5cf6', bg: '#f3e8ff' }
        ].map((stat, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ background: stat.bg, color: stat.color, padding: '12px', borderRadius: '8px', display: 'flex' }}>
              {stat.icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{stat.value}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. แถบค้นหาและตัวกรอง (Toolbar) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', minWidth: '300px', flex: '1' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อผลงาน, ผู้ร่วมวิจัย..."
            style={{ border: 'none', outline: 'none', width: '100%', marginLeft: '8px', fontSize: '14px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: `ทั้งหมด (${papers.length})` },
            { id: 'PENDING', label: `รอยืนยัน (${pendingCount})` },
            { id: 'CONFIRMED', label: `ยืนยันแล้ว (${confirmedCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                background: filterStatus === tab.id ? '#4A148C' : 'white',
                color: filterStatus === tab.id ? 'white' : '#64748b',
                border: `1px solid ${filterStatus === tab.id ? '#4A148C' : '#cbd5e1'}`,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: filterStatus === tab.id ? 'bold' : 'normal',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. รายการผลงาน (Papers List) */}
      {isLoadingPapers ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Loader2 size={48} color="#4A148C" className="spin" />
          <p style={{ marginTop: '16px', fontSize: '16px' }}>กำลังโหลดข้อมูลผลงานของคุณ...</p>
        </div>
      ) : filteredPapers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPapers.map(paper => (
            <PaperCard
              key={paper.paper_id}
              paper={paper}
              currentUser={user}
              onConfirm={handleConfirmPaper}
              onReject={handlePaperRejected}
              onImport={handleImportToForm}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>ไม่พบรายการผลงาน</h3>
          {searchQuery ? (
            <p style={{ color: '#64748b', margin: 0 }}>ไม่พบบทความที่ตรงกับคำค้นหา "{searchQuery}"</p>
          ) : filterStatus === 'PENDING' ? (
            <p style={{ color: '#64748b', margin: 0 }}>ยอดเยี่ยมมาก! ไม่มีผลงานค้างรอยืนยันในขณะนี้</p>
          ) : (
            <p style={{ color: '#64748b', margin: 0 }}>ยังไม่มีข้อมูลผลงานวิชาการในระบบ สามารถกดแก้ไข ID ด้านบนเพื่อดึงข้อมูล</p>
          )}
        </div>
      )}
    </div>
  );
}