import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  GraduationCap, 
  Search, 
  User, 
  Users, 
  Mail, 
  Save, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Trash2,
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
  List
} from 'lucide-react';
import api from '../api/client';

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

function PaperCard({ paper, currentUser, onConfirm, onReject, onImport }) {
  const [editingContribution, setEditingContribution] = useState(false);
  const [contributionInput, setContributionInput] = useState(paper.contribution_percent || 0);
  const [isFirstAuthor, setIsFirstAuthor] = useState(!!paper.is_first_author);
  const [isCorresponding, setIsCorresponding] = useState(!!paper.is_corresponding);

  const handleSaveContribution = () => {
    onConfirm(paper, contributionInput, isFirstAuthor, isCorresponding);
    setEditingContribution(false);
  };

  const formatAuthors = (authorsRaw) => {
    if (!authorsRaw) return '';
    return authorsRaw.split(',').map(n => n.trim()).filter(Boolean).join(', ');
  };

  return (
    <div className={`paper-card ${paper.author_status === 'PENDING' ? 'pending' : 'confirmed'}`}>
      <div className="paper-card-header">
        <h3 className="paper-title">{paper.title}</h3>
        <div className="paper-meta">
          <span className="paper-year">{paper.publish_year || 'N/A'}</span>
          {paper.cited_by > 0 && (
            <span className="paper-citations">
              <Award size={14} /> {paper.cited_by} citations
            </span>
          )}
        </div>
      </div>

      <div className="paper-details">
        <div className="paper-authors">
          <Users size={14} /> {formatAuthors(paper.authors_raw)}
        </div>
        {paper.journal && (
          <div className="paper-journal">
            <BookOpen size={14} /> {paper.journal}
            {paper.volume && ` Vol.${paper.volume}`}
            {paper.issue && ` No.${paper.issue}`}
          </div>
        )}
        {paper.scholar_url && (
          <a href={paper.scholar_url} target="_blank" rel="noopener noreferrer" className="paper-scholar-link">
            <ExternalLink size={14} /> ดูที่ Google Scholar
          </a>
        )}
      </div>

      <div className="paper-actions">
        {paper.author_status === 'PENDING' ? (
          <>
            {editingContribution ? (
              <div className="contribution-edit">
                <div className="contribution-input-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={isFirstAuthor}
                      onChange={(e) => setIsFirstAuthor(e.target.checked)}
                    />
                    First Author
                  </label>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={isCorresponding}
                      onChange={(e) => setIsCorresponding(e.target.checked)}
                    />
                    Corresponding
                  </label>
                </div>
                <div className="contribution-input-group">
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={contributionInput}
                    onChange={(e) => setContributionInput(Number(e.target.value) || 0)}
                    placeholder="%"
                    className="contribution-percent-input"
                  />
                  <span className="percent-label">%</span>
                </div>
                <div className="contribution-buttons">
                  <button onClick={handleSaveContribution} className="btn-confirm-small">
                    <CheckCircle2 size={14} /> ยืนยัน
                  </button>
                  <button onClick={() => setEditingContribution(false)} className="btn-cancel-small">
                    <X size={14} /> ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <div className="contribution-display">
                <span className="contribution-percent">
                  {paper.contribution_percent || 0}%
                </span>
                {paper.is_first_author && <span className="role-badge first-author">First Author</span>}
                {paper.is_corresponding && <span className="role-badge corresponding">Corresponding</span>}
                <button onClick={() => setEditingContribution(true)} className="btn-edit-contribution">
                  <Edit3 size={14} /> ปรับ %
                </button>
              </div>
            )}
            <button onClick={() => onReject(paper.paper_id)} className="btn-reject-small">
              <Trash2 size={14} /> ปฏิเสธ
            </button>
          </>
        ) : (
          <>
            <div className="contribution-display confirmed">
              <span className="contribution-percent">
                {paper.contribution_percent || 0}%
              </span>
              {paper.is_first_author && <span className="role-badge first-author">First Author</span>}
              {paper.is_corresponding && <span className="role-badge corresponding">Corresponding</span>}
              <span className="status-badge confirmed">ยืนยันแล้ว</span>
            </div>
            <button onClick={() => onImport(paper)} className="btn-import-workload">
              <Plus size={14} /> นำเข้าคำนวณภาระงาน
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ScholarDashboard({ onImportToForm }) {
  const [users, setUsers] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedProfId, setSelectedProfId] = useState(null);
  const [papers, setPapers] = useState([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [scholarIdInput, setScholarIdInput] = useState('');
  const [isSavingScholarId, setIsSavingScholarId] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scholarFeedback, setScholarFeedback] = useState('');
  const [scholarFeedbackType, setScholarFeedbackType] = useState('success');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

  const departments = useMemo(() => {
    const existingDepts = [...new Set(users.map(u => u.department).filter(Boolean))];
    return existingDepts.sort((a, b) => {
      const indexA = DEPARTMENT_ORDER.indexOf(a);
      const indexB = DEPARTMENT_ORDER.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [users]);

  const professorsByDept = useMemo(() => {
    if (!selectedDept) return [];
    return users.filter(u => u.department === selectedDept);
  }, [users, selectedDept]);

  const currentUser = useMemo(() => {
    if (!selectedProfId) return null;
    return users.find(u => u.id === selectedProfId) || null;
  }, [users, selectedProfId]);

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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Fetch users failed:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const changeDepartment = (dept) => {
    setSelectedDept(dept);
    setSelectedProfId(null);
    setScholarFeedback('');
  };

  const selectProfessor = (id) => {
    setSelectedProfId(id);
    handleUserChange();
  };

  const clearSelection = () => {
    setSelectedProfId(null);
    setScholarFeedback('');
  };

  const updateScholarInput = () => {
    if (currentUser) {
      setScholarIdInput(currentUser.scholar_id || '');
    }
  };

  const handleUserChange = () => {
    updateScholarInput();
    setScholarFeedback('');
    fetchUserPapers();
  };

  const saveScholarId = async () => {
    if (!selectedProfId) return;
    setIsSavingScholarId(true);
    setScholarFeedback('');
    try {
      const res = await api.put(`/api/users/${selectedProfId}/scholar-id`, {
        scholarId: scholarIdInput
      });
      if (currentUser) {
        currentUser.scholar_id = res.data.user.scholar_id;
      }
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
    if (!selectedProfId) return;
    setIsSyncing(true);
    setScholarFeedback('');
    try {
      const res = await api.post(`/api/sync-scholar/${selectedProfId}`);
      const data = res.data.data;
      setScholarFeedback(`✓ ซิงก์สำเร็จ! (เพิ่มใหม่ ${data.created.length} รายการ, เชื่อมโยง Co-author ${data.linked.length} รายการ)`);
      setScholarFeedbackType('success');
      await fetchUserPapers();
    } catch (error) {
      console.error(error);
      setScholarFeedback('ซิงก์ข้อมูลไม่สำเร็จ โปรดลองใหม่อีกครั้ง');
      setScholarFeedbackType('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchUserPapers = async () => {
    if (!selectedProfId) return;
    setIsLoadingPapers(true);
    try {
      const res = await api.get(`/api/users/${selectedProfId}/papers`);
      setPapers(res.data);
    } catch (error) {
      console.error('Fetch papers failed:', error);
    } finally {
      setIsLoadingPapers(false);
    }
  };

  const handlePaperRejected = (paperId) => {
    setPapers(prev => prev.filter(p => p.paper_id !== paperId));
  };

  const handleConfirmPaper = async (paper, newContribution, isFirstAuthor, isCorresponding) => {
    try {
      await api.put(`/api/papers/${paper.paper_id}/confirm`, {
        userId: selectedProfId,
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
      authorName: currentUser?.name_th || currentUser?.name_en || '',
      correspondingAuthor: paper.corresponding_author || '',
      proportion: paper.contribution_percent || 100,
    };
    if (onImportToForm) {
      onImportToForm(formData);
    }
  };

  if (!selectedProfId) {
    return (
      <div className="scholar-dashboard">
        <aside className={`dept-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
          <div className="dept-sidebar-header">
            <h3 className="dept-sidebar-title">สาขาวิชา / หลักสูตร</h3>
            {window.innerWidth < 900 && (
              <button 
                className="dept-toggle-btn" 
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                aria-label="Toggle departments"
              >
                {isMobileSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              </button>
            )}
          </div>
          <ul className="dept-list">
            {departments.map(dept => (
              <li 
                key={dept}
                className={`dept-item ${selectedDept === dept ? 'active' : ''}`}
                onClick={() => changeDepartment(dept)}
              >
                <span>{dept}</span>
                <span className="dept-count">{users.filter(u => u.department === dept).length}</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main-content-area">
          {!selectedDept ? (
            <div className="professor-grid-view">
              <div className="grid-header">
                <h3 className="placeholder">เลือกสาขาวิชาเพื่อดูรายชื่ออาจารย์</h3>
              </div>
              <div className="empty-state-full">
                <GraduationCap size={48} color="#94a3b8" />
                <p>กรุณาเลือกสาขาวิชาด้านซ้ายเพื่อดูรายชื่ออาจารย์</p>
              </div>
            </div>
          ) : (
            <div className="professor-grid-view">
              <div className="grid-header">
                <h3>{selectedDept}</h3>
                <span className="professor-count">{professorsByDept.length} อาจารย์</span>
              </div>
              {professorsByDept.length === 0 ? (
                <div className="empty-state-full">
                  <p>ไม่มีข้อมูลอาจารย์ในสาขานี้</p>
                </div>
              ) : (
                <div className="professor-grid">
                  {professorsByDept.map(prof => {
                    const parsed = parsePosition(prof.position);
                    return (
                      <div 
                        key={prof.id}
                        onClick={() => selectProfessor(prof.id)}
                        className="professor-card"
                      >
                        <div className="prof-card-header">
                          <div className="prof-name-row">
                            <span className="prof-name">{prof.name_th || prof.name_en}</span>
                            {parsed.specialRoles.map(role => (
                              <span key={role} className="role-badge">{role}</span>
                            ))}
                          </div>
                        </div>
                        <div className="prof-academic-rank">{parsed.academicRank}</div>
                        <div className="prof-email"><Mail size={14} /> {prof.email}</div>
                        {prof.scholar_id && (
                          <div className="prof-scholar-badge">
                            <ExternalLink size={12} /> Scholar ID: {prof.scholar_id}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="scholar-dashboard">
      <aside className={`dept-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="dept-sidebar-header">
          <h3 className="dept-sidebar-title">สาขาวิชา / หลักสูตร</h3>
          {window.innerWidth < 900 && (
            <button 
              className="dept-toggle-btn" 
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              aria-label="Toggle departments"
            >
              {isMobileSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          )}
        </div>
        <ul className="dept-list">
          {departments.map(dept => (
            <li 
              key={dept}
              className={`dept-item ${selectedDept === dept ? 'active' : ''}`}
              onClick={() => changeDepartment(dept)}
            >
              <span>{dept}</span>
              <span className="dept-count">{users.filter(u => u.department === dept).length}</span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main-content-area">
        <div className="professor-detail-view">
          <div className="detail-header">
            <button onClick={clearSelection} className="back-btn">
              <ChevronLeft size={16} /> ย้อนกลับไปหน้ารายชื่อ
            </button>
            <div className="detail-title-block">
              <h4 className="detail-dept">{selectedDept}</h4>
              <h2 className="detail-name">{currentUser?.name_th || currentUser?.name_en}</h2>
            </div>
          </div>

          <div className="scholar-id-box-detail">
            <div className="scholar-header-detail">
              <span className="scholar-title-detail"><GraduationCap size={16} /> Google Scholar ID</span>
              {currentUser?.scholar_id ? (
                <span className="badge-active-detail">เชื่อมต่อแล้ว</span>
              ) : (
                <span className="badge-none-detail">ยังไม่ระบุ</span>
              )}
            </div>
            <div className="scholar-input-group-detail">
              <input 
                type="text" 
                value={scholarIdInput} 
                onChange={(e) => setScholarIdInput(e.target.value)}
                placeholder="เช่น m8nS_k8AAAAJ"
                className="scholar-input-detail"
                disabled={isSavingScholarId || isSyncing}
              />
              <button 
                className="btn-scholar-save-detail" 
                onClick={saveScholarId}
                disabled={isSavingScholarId || isSyncing}
              >
                {isSavingScholarId ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} บันทึก ID
              </button>
              <button 
                className="btn-scholar-sync-detail" 
                onClick={triggerScholarSync}
                disabled={isSyncing || !currentUser?.scholar_id}
              >
                {isSyncing ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />} ซิงก์ผลงานใหม่
              </button>
            </div>
            {scholarFeedback && (
              <p className={`scholar-feedback-detail ${scholarFeedbackType}`}>
                {scholarFeedback}
              </p>
            )}
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon"><BookOpen size={20} /></span>
              <div className="stat-info">
                <span className="stat-value">{papers.length}</span>
                <span className="stat-label">ผลงานทั้งหมด</span>
              </div>
            </div>
            <div className="stat-card stat-pending">
              <span className="stat-icon"><Clock size={20} /></span>
              <div className="stat-info">
                <span className="stat-value">{pendingCount}</span>
                <span className="stat-label">รอยืนยัน (% ภาระงาน)</span>
              </div>
            </div>
            <div className="stat-card stat-confirmed">
              <span className="stat-icon"><CheckCircle2 size={20} /></span>
              <div className="stat-info">
                <span className="stat-value">{confirmedCount}</span>
                <span className="stat-label">ยืนยันเรียบร้อยแล้ว</span>
              </div>
            </div>
            <div className="stat-card stat-citations">
              <span className="stat-icon"><Award size={20} /></span>
              <div className="stat-info">
                <span className="stat-value">{totalCitations}</span>
                <span className="stat-label">ยอดการอ้างอิงรวม (Citations)</span>
              </div>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อผลงาน, ผู้ร่วมวิจัย..." 
                className="search-input"
              />
            </div>
            <div className="filter-tabs">
              <button 
                className={`filter-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterStatus('ALL')}
              >
                ทั้งหมด ({papers.length})
              </button>
              <button 
                className={`filter-btn filter-pending ${filterStatus === 'PENDING' ? 'active' : ''}`}
                onClick={() => setFilterStatus('PENDING')}
              >
                รอยืนยัน ({pendingCount})
              </button>
              <button 
                className={`filter-btn filter-confirmed ${filterStatus === 'CONFIRMED' ? 'active' : ''}`}
                onClick={() => setFilterStatus('CONFIRMED')}
              >
                ยืนยันแล้ว ({confirmedCount})
              </button>
            </div>
          </div>

          {isLoadingPapers ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>กำลังโหลดรายการผลงานวิชาการ...</p>
            </div>
          ) : filteredPapers.length > 0 ? (
            <div className="papers-grid">
              {filteredPapers.map(paper => (
                <PaperCard 
                  key={paper.paper_id}
                  paper={paper}
                  currentUser={currentUser}
                  onConfirm={handleConfirmPaper}
                  onReject={handlePaperRejected}
                  onImport={handleImportToForm}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>ไม่พบรายการผลงาน</h3>
              {searchQuery ? (
                <p>ไม่พบบทความที่ตรงกับคำค้นหา "{searchQuery}"</p>
              ) : filterStatus === 'PENDING' ? (
                <p>ยอดเยี่ยมมาก! ไม่มีผลงานค้างรอยืนยันในขณะนี้</p>
              ) : (
                <p>ยังไม่มีข้อมูลผลงานวิชาการในระบบ สามารถกดปุ่ม <strong>[ซิงก์ผลงานใหม่]</strong> ด้านบนเพื่อดึงข้อมูลได้ทันที</p>
              )}
              <button className="btn-refresh" onClick={fetchUserPapers}>
                <RefreshCw size={16} /> รีเฟรชข้อมูล
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}