// frontend/src/App.jsx
import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import PdfUploadModal from "./components/PdfUploadModal";
import ScholarDashboard from "./components/ScholarDashboard";
import MyScholarDashboard from "./components/MyScholarDashboard";
import WorkloadForm from "./components/form/WorkloadForm";
import DashboardView from "./components/dashboard/DashboardView";
import useWorkload from "./hooks/useWorkload";
import "./App.css";

function AcademicWorkloadMain() {
  const { user, authLoading, token, toast, setToast, loginAs } = useAuth();
  const {
    tab,
    setTab,
    form,
    setForm,
    entries,
    pdfModalOpen,
    setPdfModalOpen,
    previewData,
    searchTerm,
    setSearchTerm,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    viewMode,
    setViewMode,
    handleSave,
    handleDelete,
    handlePdfExtractComplete,
    handleImportFromScholar,
    totals,
    filteredEntries,
    activeMainCategory,
  } = useWorkload({ user, token, setToast });

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner"></div>
        <p>กำลังตรวจสอบข้อมูลผู้ใช้งาน...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
<div className="app-layout">
        {/* 🟢 แถบเครื่องมือจำลอง Login (Dev Only) */}
        {import.meta.env.DEV && (
          <div className="bg-yellow-100 p-2 text-sm flex justify-center items-center gap-4 border-b border-yellow-300 z-50">
            <span className="font-bold text-yellow-800">🛠️ Dev Mode:</span>
            <span className="text-gray-600">User: <strong>{user?.name_th}</strong> ({user?.role})</span>
            
            <button onClick={() => { loginAs('nattapon'); setTab('dashboard'); }} className="bg-blue-500 text-white px-3 py-1 rounded">
              Login: Nattapon
            </button>
            <button onClick={() => { loginAs('other'); setTab('dashboard'); }} className="bg-green-500 text-white px-3 py-1 rounded">
              Login: อ.สมชาย
            </button>
            <button onClick={() => { loginAs('admin'); setTab('dashboard'); }} className="bg-red-500 text-white px-3 py-1 rounded">
              Login: Admin
            </button>
          </div>
        )}

        <Sidebar tab={tab} setTab={setTab} entriesCount={entries.length} />

      <div className="app-content-wrapper">
        <Header tab={tab} entriesCount={entries.length} />

        <main className="app-main">
          {tab === "form" && (
            <WorkloadForm
              form={form}
              setForm={setForm}
              previewData={previewData}
              activeMainCategory={activeMainCategory}
              pdfModalOpen={pdfModalOpen}
              setPdfModalOpen={setPdfModalOpen}
              handleSave={handleSave}
            />
          )}

          {tab === "dashboard" && (
            <DashboardView
              entries={entries}
              totals={totals}
              filteredEntries={filteredEntries}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategoryFilter={selectedCategoryFilter}
              setSelectedCategoryFilter={setSelectedCategoryFilter}
              viewMode={viewMode}
              setViewMode={setViewMode}
              handleDelete={handleDelete}
              onAddNew={() => setTab("form")}
            />
          )}

          {tab === "scholar" && (
            <ScholarDashboard onImportToForm={handleImportFromScholar} />
          )}

          {tab === "my-scholar" && (
            <MyScholarDashboard onImportToForm={handleImportFromScholar} />
          )}

          {tab === "pdf-upload" && (
            <PdfUploadModal
              isOpen={pdfModalOpen}
              onClose={() => setPdfModalOpen(false)}
              onExtractComplete={handlePdfExtractComplete}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AcademicWorkloadMain />
    </AuthProvider>
  );
}