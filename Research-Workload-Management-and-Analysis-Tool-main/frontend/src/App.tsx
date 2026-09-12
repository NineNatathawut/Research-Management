import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { api } from './api/client';
import PaperCard from './components/PaperCard';
import type { 
  User, 
  Paper, 
  AuthorFormItem, 
  MetadataForm, 
  ParsedPosition, 
  SyncScholarResponse 
} from './types';
import './App.css';

export default defineComponent({
  name: 'App',
  setup() {
    // Navigation State
    const currentTab = ref<'dashboard' | 'pdf-upload'>('dashboard');

    // User / Profile State
    const users = ref<User[]>([]);
    const selectedUserId = ref<number | null>(null);
    const selectedDepartment = ref<string | null>(null);
    const isDeptSidebarOpen = ref<boolean>(true);
    const isMobile = ref<boolean>(false);
    const scholarIdInput = ref<string>('');
    const isSavingScholarId = ref<boolean>(false);
    const isSyncing = ref<boolean>(false);
    const scholarFeedback = ref<string>('');
    const scholarFeedbackType = ref<'success' | 'error'>('success');

    // Papers State
    const papers = ref<Paper[]>([]);
    const isLoadingPapers = ref<boolean>(false);
    const searchQuery = ref<string>('');
    const filterStatus = ref<'ALL' | 'PENDING' | 'CONFIRMED'>('ALL');

    // Form State
    const saveStatus = ref<string>('');
    const pdfFileInput = ref<HTMLInputElement | null>(null);
    const isExtracting = ref<boolean>(false);
    const metadata = ref<MetadataForm>({
      title: '',
      publish_date: '',
      doi: '',
      journal: '',
      publication_level: '',
      authors: [
        { role: 'First Author', name: '', affiliation: '' }
      ],
      volume: '',
      issue: '',
      pages: '',
      abstract: '',
      keywords: '',
      study_design: '',
      participants: {
        description: '',
        sample_size: ''
      }
    });

    // Computed Properties
    const currentUser = computed<User | null>(() => {
      if (!selectedUserId.value) return null;
      return users.value.find(u => u.id === selectedUserId.value) || null;
    });

    const departmentOrder: string[] = [
      'Computer Graphics and Multimedia',
      'Digital Business',
      'Information Technology',
      'Geoinformatics',
      'Computer Science',
      'Data Science and Applications',
      'Computer Engineering',
      'Software Engineering'
    ];

    const departments = computed<string[]>(() => {
      const existingDepts = [...new Set(users.value.map(u => u.department).filter((d): d is string => Boolean(d)))];
      return existingDepts.sort((a, b) => {
        const indexA = departmentOrder.indexOf(a);
        const indexB = departmentOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
    });

    const professorsByDepartment = computed<User[]>(() => {
      if (!selectedDepartment.value) return [];
      return users.value.filter(u => u.department === selectedDepartment.value);
    });

    function parsePosition(position?: string): ParsedPosition {
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

    function getDeptCount(dept: string): number {
      return users.value.filter(u => u.department === dept).length;
    }

    function changeDepartment(dept: string): void {
      selectedDepartment.value = dept;
      selectedUserId.value = null;
      scholarFeedback.value = '';
    }

    function selectProfessor(id: number): void {
      selectedUserId.value = id;
      handleUserChange();
    }

    function clearSelection(): void {
      selectedUserId.value = null;
      scholarFeedback.value = '';
    }

    function checkMobile(): void {
      isMobile.value = window.innerWidth < 900;
      if (!isMobile.value) {
        isDeptSidebarOpen.value = true;
      }
    }

    const pendingCount = computed<number>(() => {
      return papers.value.filter(p => p.author_status === 'PENDING').length;
    });

    const confirmedCount = computed<number>(() => {
      return papers.value.filter(p => p.author_status === 'CONFIRMED').length;
    });

    const totalCitations = computed<number>(() => {
      return papers.value.reduce((sum, p) => sum + (Number(p.cited_by) || 0), 0);
    });

    const filteredPapers = computed<Paper[]>(() => {
      return papers.value.filter(paper => {
        if (filterStatus.value !== 'ALL') {
          if (paper.author_status !== filterStatus.value) return false;
        }

        if (searchQuery.value.trim()) {
          const q = searchQuery.value.toLowerCase().trim();
          const titleMatch = (paper.title || '').toLowerCase().includes(q);
          const authorsMatch = (paper.authors_raw || '').toLowerCase().includes(q);
          const yearMatch = String(paper.publish_year || '').includes(q);
          return titleMatch || authorsMatch || yearMatch;
        }

        return true;
      });
    });

    async function fetchUsers(): Promise<void> {
      try {
        const res = await api.get<User[]>('/api/users');
        users.value = res.data;
        updateScholarInput();
      } catch (error) {
        console.error('Fetch users failed:', error);
      }
    }

    function updateScholarInput(): void {
      if (currentUser.value) {
        scholarIdInput.value = currentUser.value.scholar_id || '';
      }
    }

    function handleUserChange(): void {
      updateScholarInput();
      scholarFeedback.value = '';
      fetchUserPapers();
    }

    async function saveScholarId(): Promise<void> {
      if (!selectedUserId.value) return;

      isSavingScholarId.value = true;
      scholarFeedback.value = '';
      try {
        const res = await api.put<{ user: { scholar_id: string } }>(`/api/users/${selectedUserId.value}/scholar-id`, {
          scholarId: scholarIdInput.value
        });

        if (currentUser.value) {
          currentUser.value.scholar_id = res.data.user.scholar_id;
        }
        scholarFeedback.value = '✓ บันทึก Scholar ID สำเร็จ';
        scholarFeedbackType.value = 'success';
        setTimeout(() => { scholarFeedback.value = ''; }, 3000);
      } catch (error: any) {
        console.error(error);
        scholarFeedback.value = error?.response?.data?.error || 'บันทึก Scholar ID ไม่สำเร็จ';
        scholarFeedbackType.value = 'error';
      } finally {
        isSavingScholarId.value = false;
      }
    }

    async function triggerScholarSync(): Promise<void> {
      if (!selectedUserId.value) return;

      isSyncing.value = true;
      scholarFeedback.value = '';
      try {
        const res = await api.post<SyncScholarResponse>(`/api/sync-scholar/${selectedUserId.value}`);
        const data = res.data.data;
        scholarFeedback.value = `✓ ซิงก์สำเร็จ! (เพิ่มใหม่ ${data.created.length} รายการ, เชื่อมโยง Co-author ${data.linked.length} รายการ)`;
        scholarFeedbackType.value = 'success';
        await fetchUserPapers();
      } catch (error) {
        console.error(error);
        scholarFeedback.value = 'ซิงก์ข้อมูลไม่สำเร็จ โปรดลองใหม่อีกครั้ง';
        scholarFeedbackType.value = 'error';
      } finally {
        isSyncing.value = false;
      }
    }

    async function fetchUserPapers(): Promise<void> {
      if (!selectedUserId.value) return;

      isLoadingPapers.value = true;
      try {
        const res = await api.get<Paper[]>(`/api/users/${selectedUserId.value}/papers`);
        papers.value = res.data;
      } catch (error) {
        console.error('Fetch papers failed:', error);
      } finally {
        isLoadingPapers.value = false;
      }
    }

    function handlePaperRejected(paperId: number): void {
      papers.value = papers.value.filter(p => p.paper_id !== paperId);
    }

    function normalizeAuthorsFromPaper(paperData?: Paper): AuthorFormItem[] {
      if (!paperData) return [{ role: 'First Author', name: '', affiliation: '' }];

      const rawAuthors = paperData.authors || paperData.paper_authors || paperData.author_name || paperData.authors_raw;
      let mappedAuthors: AuthorFormItem[] = [];

      if (rawAuthors) {
        if (Array.isArray(rawAuthors)) {
          mappedAuthors = rawAuthors.map((a: any, index: number) => ({
            role: index === 0 ? 'First Author' : 'Co-Author',
            name: typeof a === 'object' && a !== null ? (a.name || a.author_name || '') : String(a),
            affiliation: typeof a === 'object' && a !== null ? (a.affiliation || '') : ''
          }));
        } else if (typeof rawAuthors === 'string') {
          const names = rawAuthors.split(',').map(n => n.trim()).filter(Boolean);
          mappedAuthors = names.map((name, index) => ({
            role: index === 0 ? 'First Author' : 'Co-Author',
            name: name,
            affiliation: ''
          }));
        }
      }

      if (mappedAuthors.length === 0) {
        return [{ role: 'First Author', name: '', affiliation: '' }];
      }

      return mappedAuthors;
    }

    function openTemplateWithData(paperData?: Paper): void {
      if (!paperData) return;
      
      console.log('👉 กดเปเปอร์:', paperData.title);
      currentTab.value = 'pdf-upload';
      
      const mappedAuthors = normalizeAuthorsFromPaper(paperData);
      console.log('👥 ผู้แต่ง:', mappedAuthors);
      
      metadata.value = {
        title: paperData.title || '',
        publish_date: paperData.publish_date || (paperData.publish_year ? `${paperData.publish_year}-01-01` : ''),
        doi: paperData.doi || '',
        journal: paperData.journal || '',
        publication_level: paperData.publication_level || '',
        authors: mappedAuthors,
        volume: paperData.volume || '',
        issue: paperData.issue || '',
        pages: paperData.pages || '',
        abstract: paperData.abstract || '',
        keywords: paperData.keywords || '',
        study_design: paperData.study_design || '',
        participants: paperData.participants || { description: '', sample_size: '' }
      };
    }

    function normalizeAuthors(extractedAuthors: any): AuthorFormItem[] {
      if (!extractedAuthors) {
        return [{ role: 'First Author', name: '', affiliation: '' }];
      }
      
      if (typeof extractedAuthors === 'string') {
        const names = extractedAuthors.split(',').map(s => s.trim()).filter(Boolean);
        return names.length > 0 
          ? names.map((name, i) => ({ role: i === 0 ? 'First Author' : 'Co-Author', name, affiliation: '' }))
          : [{ role: 'First Author', name: '', affiliation: '' }];
      }
      
      if (!Array.isArray(extractedAuthors) || extractedAuthors.length === 0) {
        return [{ role: 'First Author', name: '', affiliation: '' }];
      }
      
      return extractedAuthors.map((a: any, i: number) => {
        let role = 'Co-Author';
        if (a.is_first_author) role = 'First Author';
        else if (a.is_co_first_author) role = 'Co-first Author';
        else if (a.is_corresponding && a.is_co_corresponding) role = 'Co-corresponding Author';
        else if (a.is_corresponding) role = 'Corresponding Author';
        
        return {
          role,
          name: a.name || '',
          affiliation: a.affiliation || '',
          _author_order: a.author_order,
          _is_first_author: a.is_first_author,
          _is_co_first_author: a.is_co_first_author,
          _is_corresponding: a.is_corresponding,
          _is_co_corresponding: a.is_co_corresponding
        };
      });
    }

    function triggerPdfSelect(): void {
      if (pdfFileInput.value) pdfFileInput.value.click();
    }

    async function handlePdfUpload(event: Event): Promise<void> {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      isExtracting.value = true;
      const formData = new FormData();
      formData.append('pdf', file);

      try {
        const response = await api.post('/api/extract', formData);
        const extracted = response.data.metadata || response.data;
        const normalizedAuthors = normalizeAuthors(extracted.authors);

        metadata.value = {
          title: extracted.article_title || extracted.title || '',
          publish_date: extracted.publish_date || '',
          doi: extracted.doi || '',
          journal: extracted.journal || '',
          publication_level: extracted.publication_level || '',
          authors: normalizedAuthors,
          volume: (extracted.volume && String(extracted.volume).toLowerCase() !== 'null') ? extracted.volume : '',
          issue: (extracted.issue && String(extracted.issue).toLowerCase() !== 'null') ? extracted.issue : '',
          pages: extracted.pages || '',
          abstract: extracted.abstract || '',
          keywords: extracted.keywords || '',
          study_design: extracted.study_design || '',
          participants: extracted.participants || { description: '', sample_size: '' }
        };

        target.value = '';
        saveStatus.value = '✓ สกัดข้อมูลจาก PDF สำเร็จ! ตรวจสอบความถูกต้องได้เลยครับ';
        setTimeout(() => { saveStatus.value = ''; }, 3000);
      } catch (error) {
        console.error("Extraction failed:", error);
        saveStatus.value = 'เกิดข้อผิดพลาดในการสกัดข้อมูลจาก PDF';
        setTimeout(() => { saveStatus.value = ''; }, 3000);
      } finally {
        isExtracting.value = false;
      }
    }

    const addAuthor = (): void => {
      if (!metadata.value.authors) {
        metadata.value.authors = [];
      }
      metadata.value.authors.push({ 
        role: 'Co-Author', 
        name: '', 
        affiliation: '' 
      });
    };

    const removeAuthor = (index: number): void => {
      metadata.value.authors.splice(index, 1);
    };

    const saveMetadata = async (): Promise<void> => {
      if (!metadata.value.publication_level) {
        saveStatus.value = 'กรุณาเลือกระดับผลงานวิชาการ';
        return;
      }

      saveStatus.value = 'กำลังบันทึก...';
      const payload = {
        title: metadata.value.title,
        publish_date: metadata.value.publish_date,
        doi: metadata.value.doi,
        journal: metadata.value.journal,
        publication_level: metadata.value.publication_level,
        authors: metadata.value.authors.map(a => ({
          role: a.role,
          name: a.name,
          affiliation: a.affiliation,
          _is_first_author: a._is_first_author || a.role === 'First Author',
          _is_co_first_author: a._is_co_first_author || a.role === 'Co-first Author',
          _is_corresponding: a._is_corresponding || a.role === 'Corresponding Author',
          _is_co_corresponding: a._is_co_corresponding || a.role === 'Co-corresponding Author',
          _author_order: a._author_order
        })),
        volume: metadata.value.volume,
        issue: metadata.value.issue,
        pages: metadata.value.pages,
        abstract: metadata.value.abstract,
        keywords: metadata.value.keywords,
        study_design: metadata.value.study_design,
        participants: metadata.value.participants
      };
      try {
        const response = await api.post<{ record_id: number }>('/api/save', payload);
        saveStatus.value = `บันทึกสำเร็จ! (ID: ${response.data.record_id})`;
      } catch (error: any) {
        console.error(error);
        const errorMsg = error?.response?.data?.error || 'บันทึกไม่สำเร็จ';
        saveStatus.value = `Error: ${errorMsg}`;
      }
    };

    onMounted(async () => {
      await fetchUsers();
      checkMobile();
      window.addEventListener('resize', checkMobile);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile);
    });

    return () => (
      <div class="dashboard-root">
        {/* Navbar / Header */}
        <header class="navbar">
          <div class="navbar-container">
            <div class="brand">
              <span class="brand-icon">🎓</span>
              <div>
                <h1 class="brand-title">Research Metadata System</h1>
                <p class="brand-subtitle">ระบบบริหารจัดการและยืนยันข้อมูลผลงานวิชาการ</p>
              </div>
            </div>

            <nav class="nav-tabs">
              <button 
                class={`tab-btn ${currentTab.value === 'dashboard' ? 'active' : ''}`}
                onClick={() => currentTab.value = 'dashboard'}
              >
                📋 แดชบอร์ดผลงานวิชาการ
              </button>
              <button 
                class={`tab-btn ${currentTab.value === 'pdf-upload' ? 'active' : ''}`}
                onClick={() => currentTab.value = 'pdf-upload'}
              >
                📝 ฟอร์มจัดการข้อมูล (Metadata)
              </button>
            </nav>
          </div>
        </header>

        {/* Main Container */}
        <main class="main-content">
          {/* TAB 1: DASHBOARD */}
          {currentTab.value === 'dashboard' && (
            <section class="dashboard-view">
              <div class="professor-selector-layout">
                {/* LEFT: Department Sidebar */}
                <aside class={`dept-sidebar ${!isDeptSidebarOpen.value && isMobile.value ? 'collapsed' : ''}`}>
                  <div class="dept-sidebar-header">
                    <h3 class="dept-sidebar-title">สาขาวิชา / หลักสูตร</h3>
                    {isMobile.value && (
                      <button 
                        class="dept-toggle-btn" 
                        onClick={() => isDeptSidebarOpen.value = !isDeptSidebarOpen.value}
                        aria-label="Toggle departments"
                      >
                        {isDeptSidebarOpen.value ? '▲' : '▼'}
                      </button>
                    )}
                  </div>
                  
                  {(isDeptSidebarOpen.value || !isMobile.value) && (
                    <ul class="dept-list">
                      {departments.value.map(dept => (
                        <li 
                          key={dept}
                          class={`dept-item ${selectedDepartment.value === dept ? 'active' : ''}`}
                          onClick={() => changeDepartment(dept)}
                        >
                          <span>{dept}</span>
                          <span class="dept-count">{getDeptCount(dept)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </aside>

                {/* RIGHT: Main Content Area */}
                <main class="main-content-area">
                  {!selectedUserId.value ? (
                    /* STATE 1: Professor Grid View */
                    <div class="professor-grid-view">
                      <div class="grid-header">
                        {selectedDepartment.value ? (
                          <h3>{selectedDepartment.value}</h3>
                        ) : (
                          <h3 class="placeholder">เลือกสาขาวิชาเพื่อดูรายชื่ออาจารย์</h3>
                        )}
                        {selectedDepartment.value && (
                          <span class="professor-count">
                            {professorsByDepartment.value.length} อาจารย์
                          </span>
                        )}
                      </div>
                      
                      {!selectedDepartment.value ? (
                        <div class="empty-state-full">
                          <p>กรุณาเลือกสาขาวิชาด้านซ้ายเพื่อดูรายชื่ออาจารย์</p>
                        </div>
                      ) : professorsByDepartment.value.length === 0 ? (
                        <div class="empty-state-full">
                          <p>ไม่มีข้อมูลอาจารย์ในสาขานี้</p>
                        </div>
                      ) : (
                        <div class="professor-grid">
                          {professorsByDepartment.value.map(prof => {
                            const parsed = parsePosition(prof.position);
                            return (
                              <div 
                                key={prof.id}
                                onClick={() => selectProfessor(prof.id)}
                                class="professor-card"
                              >
                                <div class="prof-card-header">
                                  <div class="prof-name-row">
                                    <span class="prof-name">{prof.name_th || prof.name_en}</span>
                                    {parsed.specialRoles.map(role => (
                                      <span key={role} class="role-badge">{role}</span>
                                    ))}
                                  </div>
                                </div>
                                <div class="prof-academic-rank">{parsed.academicRank}</div>
                                <div class="prof-email">✉ {prof.email}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* STATE 2: Professor Detail View */
                    <div class="professor-detail-view">
                      <div class="detail-header">
                        <button onClick={clearSelection} class="back-btn">⬅ ย้อนกลับไปหน้ารายชื่อ</button>
                        <div class="detail-title-block">
                          <h4 class="detail-dept">{selectedDepartment.value}</h4>
                          <h2 class="detail-name">{currentUser.value?.name_th || currentUser.value?.name_en}</h2>
                        </div>
                      </div>

                      {/* Scholar ID Box */}
                      <div class="scholar-id-box-detail">
                        <div class="scholar-header-detail">
                          <span class="scholar-title-detail">🔗 Google Scholar ID</span>
                          {currentUser.value?.scholar_id ? (
                            <span class="badge-active-detail">เชื่อมต่อแล้ว</span>
                          ) : (
                            <span class="badge-none-detail">ยังไม่ระบุ</span>
                          )}
                        </div>
                        <div class="scholar-input-group-detail">
                          <input 
                            type="text" 
                            value={scholarIdInput.value} 
                            onInput={(e: any) => scholarIdInput.value = e.target.value}
                            placeholder="เช่น m8nS_k8AAAAJ"
                            class="scholar-input-detail"
                            disabled={isSavingScholarId.value || isSyncing.value}
                          />
                          <button 
                            class="btn-scholar-save-detail" 
                            onClick={saveScholarId}
                            disabled={isSavingScholarId.value || isSyncing.value}
                          >
                            {isSavingScholarId.value ? 'กำลังบันทึก...' : 'บันทึก ID'}
                          </button>
                          <button 
                            class="btn-scholar-sync-detail" 
                            onClick={triggerScholarSync}
                            disabled={isSyncing.value}
                          >
                            {isSyncing.value ? '⚡ กำลังซิงก์...' : '⚡ ซิงก์ผลงานใหม่'}
                          </button>
                        </div>
                        {scholarFeedback.value && (
                          <p class={`scholar-feedback-detail ${scholarFeedbackType.value}`}>
                            {scholarFeedback.value}
                          </p>
                        )}
                      </div>

                      {/* KPI Metrics Bar */}
                      <div class="stats-grid">
                        <div class="stat-card">
                          <span class="stat-icon">📚</span>
                          <div class="stat-info">
                            <span class="stat-value">{papers.value.length}</span>
                            <span class="stat-label">ผลงานทั้งหมด</span>
                          </div>
                        </div>
                        <div class="stat-card stat-pending">
                          <span class="stat-icon">⏳</span>
                          <div class="stat-info">
                            <span class="stat-value">{pendingCount.value}</span>
                            <span class="stat-label">รอยืนยัน (% ภาระงาน)</span>
                          </div>
                        </div>
                        <div class="stat-card stat-confirmed">
                          <span class="stat-icon">✅</span>
                          <div class="stat-info">
                            <span class="stat-value">{confirmedCount.value}</span>
                            <span class="stat-label">ยืนยันเรียบร้อยแล้ว</span>
                          </div>
                        </div>
                        <div class="stat-card stat-citations">
                          <span class="stat-icon">📊</span>
                          <div class="stat-info">
                            <span class="stat-value">{totalCitations.value}</span>
                            <span class="stat-label">ยอดการอ้างอิงรวม (Citations)</span>
                          </div>
                        </div>
                      </div>

                      {/* Filter & Search Toolbar */}
                      <div class="toolbar">
                        <div class="search-box">
                          <span class="search-icon">🔍</span>
                          <input 
                            type="text" 
                            value={searchQuery.value} 
                            onInput={(e: any) => searchQuery.value = e.target.value}
                            placeholder="ค้นหาชื่อผลงาน, ผู้ร่วมวิจัย..." 
                            class="search-input"
                          />
                        </div>

                        <div class="filter-tabs">
                          <button 
                            class={`filter-btn ${filterStatus.value === 'ALL' ? 'active' : ''}`}
                            onClick={() => filterStatus.value = 'ALL'}
                          >
                            ทั้งหมด ({papers.value.length})
                          </button>
                          <button 
                            class={`filter-btn filter-pending ${filterStatus.value === 'PENDING' ? 'active' : ''}`}
                            onClick={() => filterStatus.value = 'PENDING'}
                          >
                            รอยืนยัน ({pendingCount.value})
                          </button>
                          <button 
                            class={`filter-btn filter-confirmed ${filterStatus.value === 'CONFIRMED' ? 'active' : ''}`}
                            onClick={() => filterStatus.value = 'CONFIRMED'}
                          >
                            ยืนยันแล้ว ({confirmedCount.value})
                          </button>
                        </div>
                      </div>

                      {/* Papers List */}
                      {isLoadingPapers.value ? (
                        <div class="loading-state">
                          <div class="spinner"></div>
                          <p>กำลังโหลดรายการผลงานวิชาการ...</p>
                        </div>
                      ) : filteredPapers.value.length > 0 ? (
                        <div class="papers-grid">
                          {filteredPapers.value.map(paper => (
                            <PaperCard 
                              key={paper.paper_id}
                              paper={paper}
                              onEdit-metadata={openTemplateWithData}
                              onReject-paper={handlePaperRejected}
                            />
                          ))}
                        </div>
                      ) : (
                        <div class="empty-state">
                          <div class="empty-icon">📭</div>
                          <h3>ไม่พบรายการผลงาน</h3>
                          {searchQuery.value ? (
                            <p>ไม่พบบทความที่ตรงกับคำค้นหา "{searchQuery.value}"</p>
                          ) : filterStatus.value === 'PENDING' ? (
                            <p>ยอดเยี่ยมมาก! ไม่มีผลงานค้างรอยืนยันในขณะนี้</p>
                          ) : (
                            <p>ยังไม่มีข้อมูลผลงานวิชาการในระบบ สามารถกดปุ่ม <strong>[⚡ ซิงก์ผลงานใหม่]</strong> ด้านบนเพื่อดึงข้อมูลได้ทันที</p>
                          )}
                          <button class="btn-refresh" onClick={fetchUserPapers}>↻ รีเฟรชข้อมูล</button>
                        </div>
                      )}
                    </div>
                  )}
                </main>
              </div>
            </section>
          )}

          {/* TAB 2: METADATA FORM */}
          {currentTab.value === 'pdf-upload' && (
            <section class="pdf-view">
              <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '32px' }}>
                  {/* ส่วนหัวหลักของฟอร์ม */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b' }}>
                      ตรวจสอบและแก้ไขข้อมูล (Metadata)
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="file" 
                        ref={pdfFileInput} 
                        accept="application/pdf" 
                        style={{ display: 'none' }} 
                        onChange={handlePdfUpload} 
                      />
                      <button 
                        type="button" 
                        class="btn-extract"
                        onClick={triggerPdfSelect}
                        disabled={isExtracting.value}
                        title="อัปโหลดไฟล์ PDF เพื่อให้ AI ช่วยดึงข้อมูลอัตโนมัติ"
                      >
                        {isExtracting.value ? <span>⏳ กำลังวิเคราะห์ AI...</span> : <span>📄 สกัดข้อมูลจาก PDF</span>}
                      </button>
                    </div>
                  </div>

                  {saveStatus.value && (
                    <div style={{ marginBottom: '20px', padding: '10px 16px', borderRadius: '6px', background: saveStatus.value.includes('Error') ? '#fee2e2' : '#ecfdf5', color: saveStatus.value.includes('Error') ? '#991b1b' : '#065f46', fontWeight: 'bold' }}>
                      {saveStatus.value}
                    </div>
                  )}
                  
                  {/* ข้อมูลที่จำเป็นต้องมี */}
                  <div style={{ marginBottom: '32px' }}>
                    <h4 style={{ color: '#dc2626', marginBottom: '20px', fontSize: '16px' }}>
                      ข้อมูลที่จำเป็นต้องมี <span style={{ color: 'red' }}>*</span>
                    </h4>
                    
                    {/* ชื่อบทความ */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
                        ชื่อบทความ (Title) <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input 
                        type="text" 
                        value={metadata.value.title} 
                        onInput={(e: any) => metadata.value.title = e.target.value}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                        required 
                      />
                    </div>

                    {/* วันที่ & DOI */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
                          วันที่เผยแพร่ (Date) <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input 
                          type="date" 
                          value={metadata.value.publish_date} 
                          onInput={(e: any) => metadata.value.publish_date = e.target.value}
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                          required 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
                          DOI <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input 
                          type="text" 
                          value={metadata.value.doi} 
                          onInput={(e: any) => metadata.value.doi = e.target.value}
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                          required 
                        />
                      </div>
                    </div>

                    {/* วารสาร & ระดับผลงาน */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
                          วารสาร (Journal) <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input 
                          type="text" 
                          value={metadata.value.journal} 
                          onInput={(e: any) => metadata.value.journal = e.target.value}
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                          required 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
                          ระดับผลงานวิชาการ <span style={{ color: 'red' }}>*</span>
                        </label>
                        <select 
                          value={metadata.value.publication_level} 
                          onChange={(e: any) => metadata.value.publication_level = e.target.value}
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff' }} 
                          required
                        >
                          <option value="" disabled>-- เลือกระดับผลงาน --</option>
                          <option value="international_scopus">ระดับนานาชาติ (Scopus/ISI/SJR)</option>
                          <option value="national_tci1">ระดับชาติ (TCI กลุ่ม 1)</option>
                          <option value="national_tci2">ระดับชาติ (TCI กลุ่ม 2)</option>
                          <option value="conference_inter">ประชุมวิชาการระดับนานาชาติ</option>
                          <option value="conference_national">ประชุมวิชาการระดับชาติ</option>
                          <option value="other">อื่นๆ</option>
                        </select>
                      </div>
                    </div>

                    {/* ผู้แต่ง (Authors) */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>
                        ผู้แต่ง (Authors) <span style={{ color: 'red' }}>*</span>
                      </label>
                      
                      {metadata.value.authors.some(a => a._is_co_first_author || a._is_corresponding || a._is_co_corresponding) && (
                        <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                          🤖 AI ตรวจพบบทบาทพิเศษ: 
                          {metadata.value.authors.map((a, i) => (
                            <span key={i} style={{ marginRight: '8px' }}>
                              {a._is_co_first_author && <span>⚖️ Co-first: {a.name}</span>}
                              {a._is_corresponding && !a._is_co_corresponding && <span>✉️ Corresponding: {a.name}</span>}
                              {a._is_co_corresponding && <span>📬 Co-corresponding: {a.name}</span>}
                            </span>
                          ))}
                          <span style={{ color: '#6b7280' }}>(สามารถปรับเปลี่ยนได้จาก Dropdown ด้านล่าง)</span>
                        </div>
                      )}
                      
                      {metadata.value.authors.map((author, index) => (
                        <div 
                          key={index} 
                          style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', background: '#f8fafc', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        >
                          <div style={{ width: '180px' }}>
                            {index === 0 ? (
                              <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '14px', padding: '8px 0' }}>
                                First Author
                                {author._is_co_first_author && <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '3px' }}>AI: Co-first</span>}
                                {author._is_corresponding && <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '3px' }}>AI: Corresponding</span>}
                                {author._is_co_corresponding && <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', background: '#fce7f3', color: '#9d174d', borderRadius: '3px' }}>AI: Co-corresponding</span>}
                              </div>
                            ) : (
                              <select 
                                value={author.role} 
                                onChange={(e: any) => author.role = e.target.value}
                                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                              >
                                <option value="Co-Author">Co-Author</option>
                                <option value="Co-first Author">Co-first Author</option>
                                <option value="Corresponding Author">Corresponding Author</option>
                                <option value="Co-corresponding Author">Co-corresponding Author</option>
                              </select>
                            )}
                          </div>

                          <div style={{ color: '#cbd5e1', fontSize: '18px' }}>|</div>

                          <input 
                            type="text" 
                            value={author.name} 
                            onInput={(e: any) => author.name = e.target.value}
                            placeholder="ชื่อ-นามสกุล" 
                            style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
                            required 
                          />
                          
                          <div style={{ color: '#cbd5e1', fontSize: '18px' }}>|</div>

                          <input 
                            type="text" 
                            value={author.affiliation} 
                            onInput={(e: any) => author.affiliation = e.target.value}
                            placeholder="สังกัด (Affiliation)" 
                            style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
                            required 
                          />

                          {index > 0 && (
                            <button 
                              onClick={() => removeAuthor(index)} 
                              type="button"
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', fontWeight: 'bold' }}
                              title="ลบรายชื่อนี้"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button 
                        onClick={addAuthor} 
                        type="button" 
                        style={{ background: '#f1f5f9', border: '1px dashed #94a3b8', color: '#334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%', transition: '0.2s' }}
                      >
                        + เพิ่มผู้แต่ง
                      </button>
                    </div>
                  </div>

                  {/* ข้อมูลเพิ่มเติม */}
                  <div>
                    <h4 style={{ color: '#64748b', marginBottom: '12px', fontSize: '15px' }}>ข้อมูลเพิ่มเติม (มีหรือไม่มีก็ได้)</h4>
                    
                    <div style={{ padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#fafafa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>Volume</label>
                          <input 
                            type="text" 
                            value={metadata.value.volume} 
                            onInput={(e: any) => metadata.value.volume = e.target.value}
                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>Issue</label>
                          <input 
                            type="text" 
                            value={metadata.value.issue} 
                            onInput={(e: any) => metadata.value.issue = e.target.value}
                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>เลขหน้า (Pages)</label>
                          <input 
                            type="text" 
                            value={metadata.value.pages} 
                            onInput={(e: any) => metadata.value.pages = e.target.value}
                            placeholder="เช่น 12-25" 
                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>KeyWords</label>
                        <input 
                          type="text" 
                          value={metadata.value.keywords} 
                          onInput={(e: any) => metadata.value.keywords = e.target.value}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>Abstract</label>
                        <textarea 
                          value={metadata.value.abstract} 
                          onInput={(e: any) => metadata.value.abstract = e.target.value}
                          rows={4} 
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ margin: '16px 0' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>Study Design</label>
                        <input 
                          type="text" 
                          value={metadata.value.study_design} 
                          onInput={(e: any) => metadata.value.study_design = e.target.value}
                          list="study-design-suggestions"
                          placeholder="เช่น Cross-sectional study, RCT, Cohort study" 
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                        />
                        <datalist id="study-design-suggestions">
                          <option value="Cross-sectional study"></option>
                          <option value="Randomized controlled trial"></option>
                          <option value="Cohort study"></option>
                          <option value="Case-control study"></option>
                          <option value="Systematic review"></option>
                          <option value="Meta-analysis"></option>
                          <option value="Qualitative study"></option>
                          <option value="Case report"></option>
                          <option value="Case series"></option>
                        </datalist>
                      </div>

                      <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Participants</label>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Description</label>
                          <textarea 
                            value={metadata.value.participants.description} 
                            onInput={(e: any) => metadata.value.participants.description = e.target.value}
                            rows={2} 
                            placeholder="เช่น Community-dwelling individuals aged 18 years or older" 
                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Sample Size</label>
                          <input 
                            type="text" 
                            value={metadata.value.participants.sample_size} 
                            onInput={(e: any) => metadata.value.participants.sample_size = e.target.value}
                            placeholder="เช่น 327, N=327, 150 per group" 
                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={saveMetadata} 
                    style={{ marginTop: '32px', width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                  >
                    ✓ บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }
});

