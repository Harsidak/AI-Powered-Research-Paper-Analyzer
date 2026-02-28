import React from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import { UploadCloud, FileText, Download, GitMerge, Activity, Target } from 'lucide-react';
import '@copilotkit/react-ui/styles.css';
import UploadDropzone from './components/UploadDropzone';
import ExtractedDataView from './components/ExtractedDataView';

function App() {
  return (
    <CopilotKit runtimeUrl="http://localhost:8000/api/v1/chat">
      <CopilotSidebar
        defaultOpen={false}
        instructions="You are MathBot, a deterministic strict GraphRAG AI assistant for a research paper analyzer. Answer precisely based on the user's methodology and contradiction data."
        labels={{
          title: "MathBot Assistant",
          initial: "Hi! Let's analyze the research citations and methodologies together.",
        }}
      >
        <div className="flex min-h-screen bg-background text-textMain font-sans">

          {/* Sidebar - Neumorphic Inset Panel */}
          <aside className="w-72 m-6 p-6 rounded-3xl shrink-0 border border-white/50"
            style={{ boxShadow: 'inset 6px 6px 10px 0 rgba(163,177,198, 0.7), inset -6px -6px 10px 0 rgba(255,255,255, 0.5)' }}>

            <div className="flex items-center space-x-3 mb-12">
              <div className="p-3 bg-background rounded-xl shadow-neu-sm border border-white/40">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-800">Researcher<br />Co-Pilot</h1>
            </div>

            <nav className="space-y-4">
              <NavItem icon={<UploadCloud />} label="Ingestion" active />
              <NavItem icon={<Target />} label="Gap Radar" />
              <NavItem icon={<GitMerge />} label="Methodologies" />
              <NavItem icon={<FileText />} label="Contradictions" />
            </nav>

            {/* Global Export Button */}
            <div className="absolute bottom-12 left-6 w-52">
              <button className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-background rounded-2xl shadow-neu-flat border border-white/40 hover:shadow-neu-sm transition-all duration-300 active:shadow-neu-pressed group">
                <Download className="w-5 h-5 text-textLight group-hover:text-primary transition-colors" />
                <span className="font-semibold text-textMain group-hover:text-primary transition-colors">Export to LaTeX</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-8 pr-12 pl-4 flex flex-col">
            <header className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Document Ingestion</h2>
                <p className="text-textLight mt-2 text-sm">Upload academic PDFs to begin the Deterministic GraphRAG extraction.</p>
              </div>
            </header>

            {/* Dashboard Grid System */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">

              {/* Main Upload Area */}
              <section className="lg:col-span-2 flex flex-col">
                <UploadDropzone />
              </section>

              {/* Right Panel: Recent Activity / Job Queue */}
              <section className="surface-neu flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/30">
                  <h3 className="font-bold text-lg flex items-center"><Activity className="w-5 h-5 mr-2 text-primary" /> Intelligence Engine</h3>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  <ExtractedDataView />
                </div>
              </section>
            </div>
          </main>

        </div>
      </CopilotSidebar>
    </CopilotKit>
  )
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items - center space - x - 3 p - 3 rounded - xl cursor - pointer transition - all duration - 300 border border - transparent
      ${active
        ? 'surface-neu text-primary'
        : 'text-textLight hover:text-textMain hover:bg-white/10'
      } `}
    >
      <div className={`w - 5 h - 5 flex items - center justify - center ${active ? 'text-primary' : ''} `}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  )
}

export default App
