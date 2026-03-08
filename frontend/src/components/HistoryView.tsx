import { useState, useEffect } from 'react';
import { Clock, Calendar, Trash2, ArrowRight, FileText, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AnalysisResult } from '../App';

interface HistoryEntry {
    id: string;
    filename: string;
    title: string;
    authors: string[];
    analyzed_at: string;
    pipeline: {
        chars_extracted: number;
        matrix_shape: number[];
        cognee_success: boolean;
    };
}

interface Props {
    onLoadAnalysis: (data: AnalysisResult) => void;
}

export default function HistoryView({ onLoadAnalysis }: Props) {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/history');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            // Backend returns { history: [...], total: N }
            setEntries(data.history || []);
        } catch {
            toast.error('Could not load history');
        } finally {
            setLoading(false);
        }
    };

    const loadEntry = async (id: string) => {
        setLoadingId(id);
        try {
            const res = await fetch(`http://localhost:8000/api/v1/history/${id}`);
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            // Map backend history response to AnalysisResult shape
            onLoadAnalysis({
                status: data.status || 'success',
                pipeline: data.pipeline || {},
                extracted_data: data.extracted_data || {},
            } as AnalysisResult);
        } catch {
            toast.error('Failed to load analysis');
        } finally {
            setLoadingId(null);
        }
    };

    const deleteEntry = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`http://localhost:8000/api/v1/history/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setEntries(prev => prev.filter(entry => entry.id !== id));
            toast.success('Entry removed');
        } catch {
            toast.error('Could not delete entry');
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return 'Unknown date';
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="surface-neu p-6 rounded-2xl flex items-center gap-4">
                        <div className="skeleton w-12 h-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <div className="skeleton h-4 w-3/4 rounded-lg" />
                            <div className="skeleton h-3 w-1/2 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="surface-neu flex flex-col items-center justify-center py-24 px-8 text-center">
                <div className="w-20 h-20 rounded-2xl surface-neu-pressed flex items-center justify-center mb-6 animate-float">
                    <Clock className="w-8 h-8 text-textLight" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Analyses Yet</h3>
                <p className="text-textLight text-sm max-w-sm">
                    Upload a research paper to start building your analysis history.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3 stagger-children">
            {entries.map(entry => (
                <button
                    key={entry.id}
                    onClick={() => loadEntry(entry.id)}
                    disabled={loadingId === entry.id}
                    className="surface-neu w-full p-5 flex items-center gap-4 text-left group hover:-translate-y-1 hover:shadow-neu-glow transition-[box-shadow,transform,background-color] duration-300 gradient-border"
                >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(79,110,247,0.1)' }}>
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{entry.title || 'Untitled'}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-textLight flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {formatDate(entry.analyzed_at)}
                            </span>
                            <span className="text-xs text-textLight flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatTime(entry.analyzed_at)}
                            </span>
                            {entry.pipeline?.chars_extracted > 0 && (
                                <span className="text-xs text-textLight">{entry.pipeline.chars_extracted.toLocaleString()} chars</span>
                            )}
                            {entry.authors && entry.authors.length > 0 && (
                                <span className="text-xs text-textLight flex items-center gap-1 truncate max-w-[200px]">
                                    <Users className="w-3 h-3 shrink-0" /> {entry.authors.slice(0, 2).join(', ')}{entry.authors.length > 2 ? ` +${entry.authors.length - 2}` : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={(e) => deleteEntry(entry.id, e)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-textLight hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {loadingId === entry.id ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : (
                        <ArrowRight className="w-4 h-4 text-textLight group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    )}
                </button>
            ))}
        </div>
    );
}
