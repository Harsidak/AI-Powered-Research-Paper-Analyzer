import React, { useState } from 'react';
import { UploadCloud, FileText, Download, GitMerge, Activity, Target, AlertTriangle, ChevronRight } from 'lucide-react';
import UploadDropzone from './components/UploadDropzone';
import ExtractedDataView from './components/ExtractedDataView';
import MathBotChat from './components/MathBotChat';

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

type DashboardView = 'upload' | 'overview' | 'gaps' | 'methodologies' | 'contradictions';

function App() {
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('upload');
  const [exporting, setExporting] = useState(false);

  const handleAnalysisComplete = (data: AnalysisResult) => {
    setAnalysisData(data);
    setCurrentView('overview');
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
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const navItems: { icon: React.ReactNode; label: string; view: DashboardView }[] = [
    { icon: <UploadCloud />, label: 'Ingestion', view: 'upload' },
    { icon: <Target />, label: 'Gap Radar', view: 'gaps' },
    { icon: <GitMerge />, label: 'Methodologies', view: 'methodologies' },
    { icon: <AlertTriangle />, label: 'Contradictions', view: 'contradictions' },
  ];

  return (
    <>
      <div className="flex min-h-screen bg-background text-textMain font-sans">

        {/* ───── Sidebar ───── */}
        <aside className="w-72 m-6 p-6 rounded-3xl shrink-0 border border-white/50 relative flex flex-col"
          style={{ boxShadow: 'inset 6px 6px 10px 0 rgba(163,177,198, 0.7), inset -6px -6px 10px 0 rgba(255,255,255, 0.5)' }}>

          <div className="flex items-center space-x-3 mb-12">
            <div className="p-3 bg-background rounded-xl shadow-neu-sm border border-white/40">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800">Researcher<br />Co-Pilot</h1>
          </div>

          <nav className="space-y-3 flex-1">
            {navItems.map(item => (
              <button
                key={item.view}
                onClick={() => {
                  if (item.view === 'upload' || analysisData) setCurrentView(item.view);
                }}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-300 border border-transparent text-left
                  ${currentView === item.view
                    ? 'surface-neu text-primary'
                    : analysisData || item.view === 'upload'
                      ? 'text-textLight hover:text-textMain hover:bg-white/10'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                disabled={!analysisData && item.view !== 'upload'}
              >
                <div className={`w-5 h-5 flex items-center justify-center ${currentView === item.view ? 'text-primary' : ''}`}>
                  {item.icon}
                </div>
                <span className="font-medium">{item.label}</span>
                {currentView === item.view && <ChevronRight className="w-4 h-4 ml-auto text-primary/60" />}
              </button>
            ))}
          </nav>

          {/* Export Buttons */}
          <div className="space-y-3 mt-auto pt-6">
            <button
              onClick={() => handleExport('latex')}
              disabled={!analysisData || exporting}
              className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-background rounded-2xl shadow-neu-flat border border-white/40 hover:shadow-neu-sm transition-all duration-300 active:shadow-neu-pressed group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5 text-textLight group-hover:text-primary transition-colors" />
              <span className="font-semibold text-textMain group-hover:text-primary transition-colors">
                {exporting ? 'Exporting...' : 'Export to LaTeX'}
              </span>
            </button>
            <button
              onClick={() => handleExport('markdown')}
              disabled={!analysisData || exporting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-background rounded-2xl shadow-neu-flat border border-white/40 hover:shadow-neu-sm transition-all duration-300 active:shadow-neu-pressed group disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              <FileText className="w-4 h-4 text-textLight group-hover:text-primary transition-colors" />
              <span className="font-medium text-textLight group-hover:text-primary transition-colors">Export Markdown</span>
            </button>
          </div>
        </aside>

        {/* ───── Main Content ───── */}
        <main className="flex-1 p-8 pr-12 pl-4 flex flex-col">
          <header className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
                {currentView === 'upload' && 'Document Ingestion'}
                {currentView === 'overview' && (analysisData?.extracted_data?.metadata?.title || 'Analysis Dashboard')}
                {currentView === 'gaps' && 'Research Gap Radar'}
                {currentView === 'methodologies' && 'Methodology & Dataset Matrix'}
                {currentView === 'contradictions' && 'Contradiction Engine'}
              </h2>
              <p className="text-textLight mt-2 text-sm">
                {currentView === 'upload' && 'Upload academic PDFs to begin the Deterministic GraphRAG extraction.'}
                {currentView === 'overview' && 'Full extraction overview — metadata, methodologies, gaps, and contradictions.'}
                {currentView === 'gaps' && 'Automatically extracted limitations and future work suggestions.'}
                {currentView === 'methodologies' && 'Side-by-side comparison of datasets, models, and metrics.'}
                {currentView === 'contradictions' && 'Conflicting claims detected across the paper.'}
              </p>
            </div>
            {analysisData && currentView !== 'upload' && (
              <button
                onClick={() => { setAnalysisData(null); setCurrentView('upload'); }}
                className="btn-primary text-sm flex items-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" /> <span>New Analysis</span>
              </button>
            )}
          </header>

          {/* Dashboard Grid */}
          <div className="flex-1">
            {currentView === 'upload' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                <section className="lg:col-span-2 flex flex-col">
                  <UploadDropzone onAnalysisComplete={handleAnalysisComplete} />
                </section>
                <section className="surface-neu flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-white/30">
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

            {analysisData && currentView !== 'upload' && (
              <ExtractedDataView
                data={analysisData.extracted_data}
                pipeline={analysisData.pipeline}
                currentView={currentView}
              />
            )}
          </div>
        </main>
      </div>

      {/* MathBot floating chat */}
      <MathBotChat />
    </>
  );
}

export default App;
