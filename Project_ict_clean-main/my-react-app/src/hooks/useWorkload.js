import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../api/client";
import { LOOKUP_TABLE, TYPE_GROUPS, AUTHOR_OPTIONS, DB_OPTIONS, emptyForm } from "../constants/workloadData";

const API_URL = "http://localhost:5000/api";

export default function useWorkload({ user, token, setToast }) {
  const [form, setForm] = useState(emptyForm);
  const [entries, setEntries] = useState([]);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ทั้งหมด");
  const [viewMode, setViewMode] = useState("card");
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    if (!user) return;
    api.get('/entries')
      .then(res => { if (res.data.success) setEntries(res.data.data); })
      .catch(err => console.error("Entries DB Error:", err.response?.data || err.message));
  }, [user, token]);

  useEffect(() => {
    if (!user) return;
    const fetchCalculation = async () => {
      try {
        const res = await fetch(`${API_URL}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        setPreviewData(data.success ? data.data : null);
      } catch (err) {
        setPreviewData(null);
      }
    };
    fetchCalculation();
  }, [form, user]);

  useEffect(() => {
    if (user && user.full_name && !form.authorName) {
      setForm(prev => ({ ...prev, authorName: user.full_name }));
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!previewData) return;
    
    const payload = {
      ...form,
      code: previewData.code,
      baseHours: previewData.hours,
      quality: previewData.quality,
      actualHours: previewData.actualHours,
      faculty: previewData.faculty,
      facultyNote: previewData.facultyNote,
      uni: previewData.uni,
      dateInfo: previewData.dateInfo
    };

    try {
      const res = await fetch(`${API_URL}/entries`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        setToast("บันทึกผลงานเรียบร้อยแล้ว");
        setForm({ ...emptyForm, authorName: user?.full_name || "" });
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  }, [form, previewData, token, user, setToast]);

  const handleDelete = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_URL}/entries/${id}`, { 
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        setToast("ลบรายการเรียบร้อยแล้ว");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }, [token, setToast]);

  const handlePdfExtractComplete = useCallback((metadata) => {
    const mappedForm = {
      ...form,
      title: metadata.title || metadata.article_title || '',
      authors: (metadata.authors || []).map(a => a.name).join(', '),
      journal: metadata.journal || '',
      doi: metadata.doi || '',
      publicationDate: metadata.publish_date || metadata.publicationDate || '',
      volume: metadata.volume || '',
      issue: metadata.issue || '',
      abstract: metadata.abstract || '',
      keywords: metadata.keywords || '',
      authorName: user?.full_name || '',
      correspondingAuthor: '',
      proportion: 100,
    };
    const corresponding = (metadata.authors || []).find(a => a.is_corresponding);
    if (corresponding) {
      mappedForm.correspondingAuthor = corresponding.name;
    }
    setForm(mappedForm);
    setPdfModalOpen(false);
  }, [form, user]);

  const handleImportFromScholar = useCallback((paperData) => {
    const mappedForm = {
      ...form,
      title: paperData.title || '',
      authors: paperData.authors_raw || '',
      journal: paperData.journal || '',
      doi: paperData.doi || '',
      publicationDate: paperData.publish_year ? `${paperData.publish_year}-01-01` : '',
      volume: paperData.volume || '',
      issue: paperData.issue || '',
      abstract: paperData.abstract || '',
      keywords: paperData.keywords || '',
      authorName: user?.full_name || '',
      correspondingAuthor: paperData.corresponding_author || '',
      proportion: paperData.contribution_percent || 100,
    };
    setForm(mappedForm);
    setTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [form, user, setTab]);

  const totals = useMemo(() => {
    let hours = 0, faculty = 0, uni = 0, count = entries.length;
    entries.forEach(e => {
      hours += e.actualHours || 0;
      faculty += e.faculty || 0;
      uni += e.uni || 0;
    });
    return { hours: Math.round(hours * 100) / 100, faculty, uni, count };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.authors && item.authors.toLowerCase().includes(searchLower)) ||
        (item.journal && item.journal.toLowerCase().includes(searchLower)) ||
        (item.doi && item.doi.toLowerCase().includes(searchLower)) ||
        (item.authorName && item.authorName.toLowerCase().includes(searchLower)) ||
        (item.type && item.type.toLowerCase().includes(searchLower));

      const matchCategory = selectedCategoryFilter === "ทั้งหมด" || 
        (item.type && item.type.includes(selectedCategoryFilter.replace("การประชุมวิชาการ", "การประชุม").replace("วารสารวิชาการ", "วารสาร")));

      return matchSearch && matchCategory;
    });
  }, [entries, searchTerm, selectedCategoryFilter]);

  const activeMainCategory = useMemo(() => {
    for (const g of TYPE_GROUPS) {
      if (g.types.includes(form.type)) return g.label;
    }
    return TYPE_GROUPS[0].label;
  }, [form.type]);

  return {
    form,
    setForm,
    entries,
    setEntries,
    pdfModalOpen,
    setPdfModalOpen,
    previewData,
    setPreviewData,
    searchTerm,
    setSearchTerm,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    viewMode,
    setViewMode,
    tab,
    setTab,
    handleSave,
    handleDelete,
    handlePdfExtractComplete,
    handleImportFromScholar,
    totals,
    filteredEntries,
    activeMainCategory,
  };
}