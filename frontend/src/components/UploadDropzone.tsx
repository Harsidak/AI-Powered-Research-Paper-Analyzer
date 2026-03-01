import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UploadDropzone() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') {
                setFile(droppedFile);
            } else {
                alert("Only PDF files are supported!");
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setStatus('uploading');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Hit the Vite proxy, which reliably routes to the underlying FastAPI IP
            const response = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error("Upload failed", error);
            setStatus('error');
        }
    };

    return (
        <div className="surface-neu w-full h-full min-h-[400px] flex flex-col p-8 transition-all duration-300 relative overflow-hidden">

            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

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

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-primary"
                        >
                            Select Document
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="application/pdf"
                            onChange={handleFileSelect}
                        />
                    </>
                ) : (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full max-w-sm">
                        <div className="surface-neu-pressed p-6 rounded-3xl mb-6 flex flex-col items-center w-full">
                            <File className="w-12 h-12 text-primary mb-4" />
                            <p className="font-bold text-center w-full truncate px-4">{file.name}</p>
                            <p className="text-xs text-textLight mt-1 text-center font-medium">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                            </p>
                        </div>

                        {status === 'idle' && (
                            <div className="flex space-x-4 w-full">
                                <button
                                    onClick={() => setFile(null)}
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

                        {status === 'uploading' && (
                            <div className="w-full">
                                <p className="text-center font-bold text-primary mb-4 animate-pulse">Running Safety Shield Analysis...</p>
                                {/* Neumorphic Progress Bar Track */}
                                <div className="w-full h-4 rounded-full surface-neu-pressed p-1 overflow-hidden">
                                    {/* Animated Fill */}
                                    <div className="h-full bg-primary rounded-full w-1/3 animate-[pulse_2s_ease-in-out_infinite]"></div>
                                </div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="flex flex-col items-center text-green-600">
                                <div className="p-4 rounded-full surface-neu mb-4 border border-green-200">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <p className="font-bold mb-1">Upload Successful</p>
                                <p className="text-xs font-medium text-textLight text-center max-w-xs">Document is queued for the Celery ML parsing pipeline.</p>
                                <button onClick={() => { setFile(null); setStatus('idle'); }} className="mt-6 text-sm font-semibold text-primary hover:underline">
                                    Analyze another
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="flex flex-col items-center text-red-500">
                                <AlertCircle className="w-8 h-8 mb-4" />
                                <p className="font-bold">Upload Failed</p>
                                <button onClick={() => setStatus('idle')} className="mt-4 text-sm font-semibold text-primary hover:underline">
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
