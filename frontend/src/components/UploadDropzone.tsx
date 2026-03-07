import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle2, AlertCircle, Loader2, Shield, Brain, GitMerge } from 'lucide-react';
import type { AnalysisResult } from '../App';

interface UploadDropzoneProps {
    onAnalysisComplete: (data: AnalysisResult) => void;
}

type PipelineStage = 'validating' | 'extracting' | 'analyzing' | 'graphing' | 'done';

const stageLabels: Record<PipelineStage, { label: string; icon: React.ReactNode; pct: number }> = {
    validating: { label: 'Safety Shield Analysis…', icon: <Shield className="w-5 h-5" />, pct: 15 },
    extracting: { label: 'YOLO DLA — Layout Extraction…', icon: <File className="w-5 h-5" />, pct: 35 },
    analyzing: { label: 'LangExtract — Schema Enforcement…', icon: <Brain className="w-5 h-5" />, pct: 60 },
    graphing: { label: 'Building Knowledge Graph…', icon: <GitMerge className="w-5 h-5" />, pct: 85 },
    done: { label: 'Pipeline Complete!', icon: <CheckCircle2 className="w-5 h-5" />, pct: 100 },
};

export default function UploadDropzone({ onAnalysisComplete }: UploadDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [stage, setStage] = useState<PipelineStage>('validating');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') {
                setFile(droppedFile); setErrorMsg('');
            } else {
                setErrorMsg('Only PDF files are supported!');
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { setFile(e.target.files[0]); setErrorMsg(''); }
    };

    const handleUpload = async () => {
        if (!file) return;
        setStatus('uploading');
        setStage('validating');

        const formData = new FormData();
        formData.append('file', file);

        const stageTimers = [
            setTimeout(() => setStage('extracting'), 2000),
            setTimeout(() => setStage('analyzing'), 6000),
            setTimeout(() => setStage('graphing'), 12000),
        ];

        try {
            const response = await fetch('/api/v1/upload', { method: 'POST', body: formData });
            stageTimers.forEach(clearTimeout);
            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(err.detail?.message || err.detail || `Server error: ${response.status}`);
            }
            const data: AnalysisResult = await response.json();
            setStage('done');
            setStatus('success');
            setTimeout(() => onAnalysisComplete(data), 1200);
        } catch (error) {
            stageTimers.forEach(clearTimeout);
            setErrorMsg(error instanceof Error ? error.message : 'Upload failed');
            setStatus('error');
        }
    };

    const currentStage = stageLabels[stage];

    return (
        <div className="surface-neu w-full h-full min-h-[420px] flex flex-col p-8 relative overflow-hidden">

            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none opacity-30" style={{ background: 'var(--gradient-primary)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-[60px] -ml-16 -mb-16 pointer-events-none opacity-10" style={{ background: 'var(--accent)' }} />

            <div
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-500
                    ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-textLight/20 hover:border-primary/40'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {!file ? (
                    <div className="flex flex-col items-center animate-fade-in">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500
                            ${isDragging ? 'scale-110 shadow-neu-pressed' : 'shadow-neu-flat'}`}
                            style={{ border: '1px solid var(--border)' }}>
                            <Upload className={`w-9 h-9 transition-colors duration-300 ${isDragging ? 'text-primary' : 'text-textLight'}`} />
                        </div>
                        <h3 className="text-xl font-bold mb-1.5">Drag & Drop PDF</h3>
                        <p className="text-sm text-textLight mb-7">or click to browse local files</p>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-sm">
                            Select Document
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileSelect} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full max-w-md px-4 animate-scale-in">
                        {/* File info */}
                        <div className="surface-neu-pressed p-6 rounded-2xl mb-6 flex flex-col items-center w-full">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--gradient-primary)' }}>
                                <File className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-bold text-center w-full truncate px-4">{file.name}</p>
                            <p className="text-xs text-textLight mt-1 font-medium">
                                {(file.size / 1024 / 1024).toFixed(2)} MB · PDF
                            </p>
                        </div>

                        {status === 'idle' && (
                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setFile(null); setErrorMsg(''); }} className="btn-ghost flex-1 text-sm">Cancel</button>
                                <button onClick={handleUpload} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                                    <Upload className="w-4 h-4" /> Analyze
                                </button>
                            </div>
                        )}

                        {status === 'uploading' && (
                            <div className="w-full space-y-4 animate-fade-in">
                                <div className="flex items-center justify-center gap-3 font-bold text-sm">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span className="text-gradient">{currentStage.label}</span>
                                </div>
                                {/* Gradient Progress Bar */}
                                <div className="w-full h-3 rounded-full surface-neu-pressed p-0.5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${currentStage.pct}%`, background: 'var(--gradient-primary)' }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-textLight font-medium px-1">
                                    {(['validating', 'extracting', 'analyzing', 'graphing'] as PipelineStage[]).map(s => (
                                        <span key={s} className={`flex items-center transition-all duration-300
                                            ${stage === s ? 'text-primary scale-110' :
                                                stageLabels[s].pct <= currentStage.pct ? 'text-emerald-500' : ''}`}>
                                            {stageLabels[s].icon}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="flex flex-col items-center text-emerald-500 animate-scale-in">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--gradient-success)' }}>
                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                                <p className="font-bold mb-1">Extraction Complete!</p>
                                <p className="text-xs text-textLight">Loading dashboard…</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="flex flex-col items-center text-red-400 w-full animate-scale-in">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--gradient-danger)' }}>
                                    <AlertCircle className="w-6 h-6 text-white" />
                                </div>
                                <p className="font-bold mb-1">Pipeline Failed</p>
                                <p className="text-xs text-center mb-4 max-w-xs">{errorMsg}</p>
                                <button onClick={() => { setStatus('idle'); setErrorMsg(''); }} className="text-sm font-semibold text-primary hover:underline">
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
