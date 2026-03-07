import React, { useState, useMemo } from 'react';
import { UploadCloud, FileText, Download, Activity, ChevronRight, Clock, BarChart3, Sun, Moon, Menu, X, Keyboard, BookMarked } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import UploadDropzone from './components/UploadDropzone';
import ExtractedDataView from './components/ExtractedDataView';
import HistoryView from './components/HistoryView';
import MathBotChat from './components/MathBotChat';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// TypeScript interfaces matching backend Pydantic schemas
interface Author { name: string; affiliation?: string; }
interface PaperMetadata { title: string; authors: Author[]; publication_year?: number; abstract: string; }
interface Methodology { datasets: string[]; base_models: string[]; metrics: string[]; optimization?: string; }
interface Limitation { description: string; source_context: string; page_number?: number; }
interface Contradiction { claim: string; opposing_claim: string; confidence_score: number; }
export interface ExtractedInsights {
  metadata: PaperMetadata;
  methodologies: Methodology[];
  limitations: Limitation[];
  contradictions: Contradiction[];
}
export interface AnalysisResult {
  status: string;
  pipeline: { chars_extracted: number; matrix_shape: number[]; cognee_success: boolean; };
  extracted_data: ExtractedInsights;
}

type DashboardView = 'upload' | 'history' | 'analysis';

function App() {
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('upload');
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark, toggle: toggleTheme } = useTheme();

  const handleAnalysisComplete = (data: AnalysisResult) => {
    setAnalysisData(data);
    setCurrentView('analysis');
    toast.success('Analysis complete!', { duration: 3000 });
  };

  const handleExport = async (format: 'latex' | 'markdown') => {
    if (!analysisData) return;
    setExporting(true);
    try {
      const res = await fetch('/api/v1/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, extracted_data: analysisData.extracted_data }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'latex' ? 'analysis.tex' : 'analysis.md';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format === 'latex' ? 'LaTeX' : 'Markdown'}`, { duration: 2000 });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleBibtex = async () => {
    if (!analysisData) return;
    try {
      const res = await fetch('/api/v1/export/bibtex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extracted_data: analysisData.extracted_data }),
      });
      if (!res.ok) throw new Error('BibTeX export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'citation.bib';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('BibTeX citation downloaded');
    } catch (err) {
      console.error('BibTeX error:', err);
      toast.error('BibTeX export failed');
    }
  };

  // Keyboard shortcuts
  const shortcutActions = useMemo(() => ({
    onUpload: () => setCurrentView('upload'),
    onHistory: () => setCurrentView('history'),
    onExportLatex: () => handleExport('latex'),
    onExportMd: () => handleExport('markdown'),
    onToggleTheme: toggleTheme,
  }), [analysisData, toggleTheme]);
  useKeyboardShortcuts(shortcutActions);

  const navItems: { icon: React.ReactNode; label: string; view: DashboardView; alwaysEnabled?: boolean; shortcut?: string }[] = [
    { icon: <UploadCloud />, label: 'Ingestion', view: 'upload', alwaysEnabled: true, shortcut: 'U' },
    { icon: <BarChart3 />, label: 'Analysis', view: 'analysis', shortcut: 'A' },
    { icon: <Clock />, label: 'History', view: 'history', alwaysEnabled: true, shortcut: 'H' },
  ];

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'toast-custom',
          style: { background: 'var(--bg)', color: 'var(--text-main)', border: '1px solid var(--card-border)' },
          success: { iconTheme: { primary: '#4763ff', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />

      <div className="flex min-h-screen bg-background text-textMain font-sans">

        {/* ───── Mobile Hamburger ───── */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-6 left-6 z-50 p-3 surface-neu rounded-xl"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ───── Sidebar Overlay (mobile) ───── */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ───── Sidebar ───── */}
        <aside className={`
          w-72 m-6 p-6 rounded-3xl shrink-0 relative flex flex-col transition-transform duration-300 z-40
          fixed lg:static top-0 left-0 h-[calc(100vh-3rem)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0'}
        `}
          style={{ boxShadow: 'var(--sidebar-inset)', border: '1px solid var(--card-border)' }}>

          <div className="flex items-center space-x-3 mb-10">
            <div className="p-3 bg-background rounded-xl shadow-neu-sm" style={{ border: '1px solid var(--card-border)' }}>
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Researcher<br />Co-Pilot</h1>
          </div>

          <nav className="space-y-2 flex-1">
            {navItems.map(item => (
              <button
                key={item.view}
                onClick={() => {
                  if (item.alwaysEnabled || analysisData) {
                    setCurrentView(item.view);
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-300 border border-transparent text-left group
                  ${currentView === item.view
                    ? 'surface-neu text-primary'
                    : analysisData || item.alwaysEnabled
                      ? 'text-textLight hover:text-textMain hover:bg-white/5'
                      : 'text-gray-400 cursor-not-allowed opacity-40'
                  }`}
                disabled={!analysisData && !item.alwaysEnabled}
              >
                <div className={`w-5 h-5 flex items-center justify-center ${currentView === item.view ? 'text-primary' : ''}`}>
                  {item.icon}
                </div>
                <span className="font-medium flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-textLight opacity-0 group-hover:opacity-100 transition-opacity">
                    ⌘{item.shortcut}
                  </span>
                )}
                {currentView === item.view && <ChevronRight className="w-4 h-4 text-primary/60" />}
              </button>
            ))}
          </nav>

          {/* Theme + Export */}
          <div className="space-y-3 mt-auto pt-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-background rounded-2xl shadow-neu-flat hover:shadow-neu-sm transition-all duration-300 active:shadow-neu-pressed group"
              style={{ border: '1px solid var(--card-border)' }}
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span className="font-medium text-sm text-textLight group-hover:text-textMain transition-colors">
                {dark ? 'Light Mode' : 'Dark Mode'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-textLight">⌘D</span>
            </button>

            <button
              onClick={() => handleExport('latex')}
              disabled={!analysisData || exporting}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-background rounded-2xl shadow-neu-flat hover:shadow-neu-sm transition-all duration-300 active:shadow-neu-pressed group disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--card-border)' }}
            >
              <Download className="w-4 h-4 text-textLight group-hover:text-primary transition-colors" />
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                {exporting ? 'Exporting...' : 'Export to LaTeX'}
              </span>
            </button>
            <button
              onClick={() => handleExport('markdown')}
              disabled={!analysisData || exporting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-background rounded-2xl shadow-neu-flat hover:shadow-neu-sm transition-all duration-300 active:shadow-neu-pressed group disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              style={{ border: '1px solid var(--card-border)' }}
            >
              <FileText className="w-4 h-4 text-textLight group-hover:text-primary transition-colors" />
              <span className="font-medium text-textLight group-hover:text-primary transition-colors">Export Markdown</span>
            </button>
            <button
              onClick={handleBibtex}
              disabled={!analysisData}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-background rounded-2xl shadow-neu-flat hover:shadow-neu-sm transition-all duration-300 active:shadow-neu-pressed group disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              style={{ border: '1px solid var(--card-border)' }}
            >
              <BookMarked className="w-4 h-4 text-textLight group-hover:text-primary transition-colors" />
              <span className="font-medium text-textLight group-hover:text-primary transition-colors">Cite (BibTeX)</span>
            </button>

            {/* Shortcuts hint */}
            <div className="flex items-center justify-center gap-1 text-[10px] text-textLight pt-1 opacity-60">
              <Keyboard className="w-3 h-3" /> Shortcuts: ⌘U ⌘H ⌘E ⌘D
            </div>
          </div>
        </aside>

        {/* ───── Main Content ───── */}
        <main className="flex-1 p-8 lg:pr-12 lg:pl-4 flex flex-col min-w-0 pl-4 pr-4 pt-20 lg:pt-8">
          <header className="flex justify-between items-end mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {currentView === 'upload' && 'Document Ingestion'}
                {currentView === 'history' && 'Analysis History'}
                {currentView === 'analysis' && (analysisData?.extracted_data?.metadata?.title || 'Full Analysis')}
              </h2>
              <p className="text-textLight mt-2 text-sm">
                {currentView === 'upload' && 'Upload academic PDFs to begin the Deterministic GraphRAG extraction.'}
                {currentView === 'history' && 'View and reload your previously analyzed research papers.'}
                {currentView === 'analysis' && 'Metadata, Methodology Matrix, Gap Radar, and Contradiction Engine — all in one view.'}
              </p>
            </div>
            {analysisData && currentView === 'analysis' && (
              <button
                onClick={() => { setAnalysisData(null); setCurrentView('upload'); }}
                className="btn-primary text-sm flex items-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" /> <span>New Analysis</span>
              </button>
            )}
          </header>

          {/* Content Area with view transitions */}
          <div className="flex-1 overflow-y-auto" key={currentView}>
            <div className="view-transition-enter">
              {currentView === 'upload' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                  <section className="lg:col-span-2 flex flex-col">
                    <UploadDropzone onAnalysisComplete={handleAnalysisComplete} />
                  </section>
                  <section className="surface-neu flex flex-col overflow-hidden">
                    <div className="p-6" style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <h3 className="font-bold text-lg flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-primary" /> Intelligence Engine
                      </h3>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="p-4 rounded-full surface-neu-pressed mb-4">
                          <Activity className="w-8 h-8 text-textLight" />
                        </div>
                        <p className="text-textLight text-sm font-medium">Upload a PDF to activate the<br />extraction pipeline</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {currentView === 'history' && (
                <HistoryView onLoadAnalysis={(data) => {
                  setAnalysisData(data);
                  setCurrentView('analysis');
                  toast.success('Analysis loaded from history');
                }} />
              )}

              {currentView === 'analysis' && analysisData && (
                <ExtractedDataView
                  data={analysisData.extracted_data}
                  pipeline={analysisData.pipeline}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MathBot floating chat */}
      <MathBotChat />
    </>
  );
}

export default App;
