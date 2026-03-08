import React, { useState, useMemo } from 'react';
import {
  UploadCloud, FileText, Download, Activity, ChevronRight, Clock, BarChart3,
  Sun, Moon, Menu, X, Keyboard, BookMarked, Sparkles, Zap
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import UploadDropzone from './components/UploadDropzone';
import ExtractedDataView from './components/ExtractedDataView';
import HistoryView from './components/HistoryView';
import MathBotChat from './components/MathBotChat';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// TypeScript interfaces matching backend schemas
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
  pipeline: {
    chars_extracted: number;
    matrix_shape: number[];
    cognee_success: boolean;
    graph_triplets?: number;
    graph_nodes?: number;
    graph_edges?: number;
  };
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
    toast.success('Analysis complete! 🎉', { duration: 3000 });
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
      toast.success(`Exported as ${format === 'latex' ? 'LaTeX' : 'Markdown'} ✓`);
    } catch {
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
      toast.success('BibTeX citation downloaded ✓');
    } catch {
      toast.error('BibTeX export failed');
    }
  };

  const shortcutActions = useMemo(() => ({
    onUpload: () => setCurrentView('upload'),
    onHistory: () => setCurrentView('history'),
    onExportLatex: () => handleExport('latex'),
    onExportMd: () => handleExport('markdown'),
    onToggleTheme: toggleTheme,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [analysisData, toggleTheme]);
  useKeyboardShortcuts(shortcutActions);

  const navItems: { icon: React.ReactNode; label: string; view: DashboardView; alwaysEnabled?: boolean; shortcut?: string }[] = [
    { icon: <UploadCloud className="w-[18px] h-[18px]" />, label: 'Ingestion', view: 'upload', alwaysEnabled: true, shortcut: 'U' },
    { icon: <BarChart3 className="w-[18px] h-[18px]" />, label: 'Analysis', view: 'analysis', shortcut: 'A' },
    { icon: <Clock className="w-[18px] h-[18px]" />, label: 'History', view: 'history', alwaysEnabled: true, shortcut: 'H' },
  ];

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'toast-custom',
          style: { background: 'var(--bg)', color: 'var(--text-main)', border: '1px solid var(--border)', fontFamily: 'Inter' },
          success: { iconTheme: { primary: '#22d3ee', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />

      <div className="flex min-h-screen bg-background font-sans">

        {/* ───── Mobile Hamburger ───── */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-5 left-5 z-50 p-3 surface-neu rounded-xl"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ───── Mobile Overlay ───── */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ═══════════ SIDEBAR ═══════════ */}
        <aside className={`
          w-[280px] m-5 p-6 rounded-3xl shrink-0 relative flex flex-col z-40
          fixed lg:static top-0 left-0 h-[calc(100vh-2.5rem)]
          transition-all duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0'}
        `} style={{ boxShadow: 'var(--sidebar-shadow)', border: '1px solid var(--border)' }}>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight leading-tight">Researcher</h1>
              <p className="text-[11px] font-medium text-textLight tracking-wider uppercase">Co-Pilot</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5 flex-1">
            {navItems.map(item => {
              const isActive = currentView === item.view;
              const isEnabled = analysisData || item.alwaysEnabled;
              return (
                <button
                  key={item.view}
                  onClick={() => { if (isEnabled) { setCurrentView(item.view); setSidebarOpen(false); } }}
                  disabled={!isEnabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 text-left group relative overflow-hidden
                    ${isActive
                      ? 'shadow-neu-flat text-primary font-semibold'
                      : isEnabled
                        ? 'text-textLight hover:text-textMain hover:shadow-neu-sm'
                        : 'text-textLight/30 cursor-not-allowed'
                    }`}
                  style={isActive ? { border: '1px solid var(--border)' } : {}}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full" style={{ background: 'var(--gradient-primary)' }} />
                  )}
                  <span className={`transition-colors ${isActive ? 'text-primary' : ''}`}>{item.icon}</span>
                  <span className="flex-1 text-sm">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-textLight opacity-0 group-hover:opacity-100 transition-opacity">
                      ⌘{item.shortcut}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary/50" />}
                </button>
              );
            })}
          </nav>

          {/* ── Bottom Actions ── */}
          <div className="space-y-2.5 mt-auto pt-6 border-t" style={{ borderColor: 'var(--border)' }}>

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
              <span className="text-[9px] font-mono ml-auto px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-textLight">⌘D</span>
            </button>

            {/* Export buttons */}
            <button onClick={() => handleExport('latex')} disabled={!analysisData || exporting}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting…' : 'Export LaTeX'}</span>
            </button>

            <button onClick={() => handleExport('markdown')} disabled={!analysisData || exporting}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              <span>Export Markdown</span>
            </button>

            <button onClick={handleBibtex} disabled={!analysisData}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              <BookMarked className="w-4 h-4" />
              <span>Cite BibTeX</span>
            </button>

            <div className="flex items-center justify-center gap-1 text-[9px] text-textLight pt-2 opacity-40">
              <Keyboard className="w-3 h-3" /> ⌘U · ⌘H · ⌘E · ⌘D
            </div>
          </div>
        </aside>

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <main className="flex-1 p-6 lg:pr-10 lg:pl-4 flex flex-col min-w-0 pt-20 lg:pt-6">
          {/* Header */}
          <header className="flex justify-between items-end mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                {currentView === 'upload' && 'Document Ingestion'}
                {currentView === 'history' && 'Analysis History'}
                {currentView === 'analysis' && (
                  <span className="text-gradient">
                    {analysisData?.extracted_data?.metadata?.title?.slice(0, 60) || 'Full Analysis'}
                    {(analysisData?.extracted_data?.metadata?.title?.length || 0) > 60 ? '…' : ''}
                  </span>
                )}
              </h2>
              <p className="text-textLight mt-1.5 text-sm font-medium">
                {currentView === 'upload' && 'Upload academic PDFs to begin the Deterministic GraphRAG extraction.'}
                {currentView === 'history' && 'View and reload your previously analyzed research papers.'}
                {currentView === 'analysis' && 'Metadata · Methodology · Gap Radar · Contradiction Engine'}
              </p>
            </div>
            {analysisData && currentView === 'analysis' && (
              <button onClick={() => { setAnalysisData(null); setCurrentView('upload'); }}
                className="btn-primary text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" /> New Analysis
              </button>
            )}
          </header>

          {/* ── Content with entrance animations ── */}
          <div className="flex-1 overflow-y-auto" key={currentView}>
            <div className="view-enter">
              {currentView === 'upload' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  <section className="lg:col-span-2 flex flex-col">
                    <UploadDropzone onAnalysisComplete={handleAnalysisComplete} />
                  </section>
                  <section className="surface-neu flex flex-col overflow-hidden">
                    <div className="p-6" style={{ borderBottom: '1px solid var(--border)' }}>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <span>Intelligence Engine</span>
                      </h3>
                    </div>
                    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl surface-neu-pressed flex items-center justify-center mb-5 animate-float">
                        <Activity className="w-7 h-7 text-textLight" />
                      </div>
                      <p className="text-textLight text-sm font-medium leading-relaxed">
                        Upload a PDF to activate the<br />extraction pipeline
                      </p>
                    </div>
                  </section>
                </div>
              )}

              {currentView === 'history' && (
                <HistoryView onLoadAnalysis={(data) => {
                  setAnalysisData(data);
                  setCurrentView('analysis');
                  toast.success('Analysis loaded from history ✓');
                }} />
              )}

              {currentView === 'analysis' && analysisData && (
                <ExtractedDataView data={analysisData.extracted_data} pipeline={analysisData.pipeline} />
              )}
            </div>
          </div>
        </main>
      </div>

      <MathBotChat analysisData={analysisData?.extracted_data} />
    </>
  );
}

export default App;
