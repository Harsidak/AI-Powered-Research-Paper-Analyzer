import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle2, AlertCircle, Loader2, Shield, Brain, GitMerge } from 'lucide-react';
import type { AnalysisResult } from '../App';

interface UploadDropzoneProps {
    onAnalysisComplete: (data: AnalysisResult) => void;
}

type PipelineStage = 'validating' | 'extracting' | 'analyzing' | 'graphing' | 'done';

const stageLabels: Record<PipelineStage, { label: string; icon: React.ReactNode; pct: number }> = {
    validating: { label: 'Running Safety Shield Analysis...', icon: <Shield className="w-5 h-5" />, pct: 15 },
    extracting: { label: 'YOLO DLA — Extracting Layout...', icon: <File className="w-5 h-5" />, pct: 35 },
    analyzing: { label: 'LangExtract — Enforcing Schema...', icon: <Brain className="w-5 h-5" />, pct: 60 },
    graphing: { label: 'Building Knowledge Graph...', icon: <GitMerge className="w-5 h-5" />, pct: 85 },
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
                setFile(droppedFile);
                setErrorMsg('');
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

        // Simulate pipeline stages visually while the backend runs
        const stageTimers = [
            setTimeout(() => setStage('extracting'), 2000),
            setTimeout(() => setStage('analyzing'), 6000),
            setTimeout(() => setStage('graphing'), 12000),
        ];

        try {
            const response = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData,
            });

            stageTimers.forEach(clearTimeout);

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(err.detail?.message || err.detail || `Server error: ${response.status}`);
            }

            const data: AnalysisResult = await response.json();
            setStage('done');
            setStatus('success');

            // Brief pause to show completion, then transition to dashboard
            setTimeout(() => onAnalysisComplete(data), 1200);

        } catch (error) {
            stageTimers.forEach(clearTimeout);
            console.error("Upload failed", error);
            setErrorMsg(error instanceof Error ? error.message : 'Upload failed');
            setStatus('error');
        }
    };

    const currentStage = stageLabels[stage];

    return (
        <div className="surface-neu w-full h-full min-h-[400px] flex flex-col p-8 transition-all duration-300 relative overflow-hidden">

            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <div
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors duration-300
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300/50 hover:border-primary/50'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {!file ? (
                    <>
                        <div className={`p-6 rounded-full mb-6 transition-transform duration-300 border border-white/60
                            ${isDragging ? 'scale-110 shadow-neu-pressed text-primary' : 'shadow-neu-flat text-textLight'}`}>
                            <Upload className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Drag & Drop PDF</h3>
                        <p className="text-sm font-medium text-textLight mb-8">or click to browse local files</p>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                            Select Document
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileSelect} />
                    </>
                ) : (
                    <div className="flex flex-col items-center w-full max-w-md px-4">
                        {/* File info card */}
                        <div className="surface-neu-pressed p-6 rounded-3xl mb-6 flex flex-col items-center w-full">
                            <File className="w-12 h-12 text-primary mb-4" />
                            <p className="font-bold text-center w-full truncate px-4">{file.name}</p>
                            <p className="text-xs text-textLight mt-1 text-center font-medium">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                            </p>
                        </div>

                        {/* Idle — show buttons */}
                        {status === 'idle' && (
                            <div className="flex space-x-4 w-full">
                                <button
                                    onClick={() => { setFile(null); setErrorMsg(''); }}
                                    className="flex-1 py-3 px-4 font-semibold text-textLight rounded-xl surface-neu hover:shadow-neu-sm active:surface-neu-pressed transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    className="flex-1 btn-primary text-sm flex items-center justify-center space-x-2"
                                >
                                    <Upload className="w-4 h-4" /> <span>Analyze</span>
                                </button>
                            </div>
                        )}

                        {/* Uploading — animated pipeline progress */}
                        {status === 'uploading' && (
                            <div className="w-full space-y-4">
                                <div className="flex items-center justify-center space-x-3 text-primary font-bold">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="animate-pulse">{currentStage.label}</span>
                                </div>
                                {/* Neumorphic Progress Bar */}
                                <div className="w-full h-4 rounded-full surface-neu-pressed p-1 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${currentStage.pct}%` }}
                                    />
                                </div>
                                {/* Stage indicators */}
                                <div className="flex justify-between text-xs text-textLight font-medium px-1">
                                    {(['validating', 'extracting', 'analyzing', 'graphing'] as PipelineStage[]).map(s => (
                                        <span key={s} className={`flex items-center space-x-1 transition-colors duration-300
                                            ${stage === s ? 'text-primary font-semibold' :
                                                stageLabels[s].pct <= currentStage.pct ? 'text-green-500' : ''}`}>
                                            {stageLabels[s].icon}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Success */}
                        {status === 'success' && (
                            <div className="flex flex-col items-center text-green-600">
                                <div className="p-4 rounded-full surface-neu mb-4 border border-green-200">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <p className="font-bold mb-1">Extraction Complete!</p>
                                <p className="text-xs font-medium text-textLight text-center">Loading dashboard...</p>
                            </div>
                        )}

                        {/* Error */}
                        {status === 'error' && (
                            <div className="flex flex-col items-center text-red-500 w-full">
                                <AlertCircle className="w-8 h-8 mb-4" />
                                <p className="font-bold mb-1">Pipeline Failed</p>
                                <p className="text-xs text-red-400 text-center mb-4 max-w-xs">{errorMsg}</p>
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
