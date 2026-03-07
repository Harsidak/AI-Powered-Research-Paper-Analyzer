import { useState, useEffect } from 'react';
import { Clock, FileText, Trash2, ChevronRight, Loader2, Users, BarChart3, RefreshCcw } from 'lucide-react';
import type { AnalysisResult } from '../App';

interface HistorySummary {
    id: string;
    filename: string;
    title: string;
    authors: string[];
    analyzed_at: string;
    pipeline: { chars_extracted: number; matrix_shape: number[]; cognee_success: boolean };
}

interface HistoryViewProps {
    onLoadAnalysis: (data: AnalysisResult) => void;
}

export default function HistoryView({ onLoadAnalysis }: HistoryViewProps) {
    const [entries, setEntries] = useState<HistorySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/history');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setEntries(data.history || []);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const loadEntry = async (id: string) => {
        setLoadingId(id);
        try {
            const res = await fetch(`/api/v1/history/${id}`);
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            onLoadAnalysis(data as AnalysisResult);
        } catch (err) {
            console.error('Failed to load analysis:', err);
        } finally {
            setLoadingId(null);
        }
    };

    const deleteEntry = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this analysis from history?')) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/v1/history/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setEntries(prev => prev.filter(entry => entry.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
    };

    if (loading) {
        return (
            <div className="surface-neu p-12 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-textLight font-medium">Loading history...</p>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="surface-neu p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="p-5 rounded-full surface-neu-pressed mb-6">
                    <Clock className="w-10 h-10 text-textLight" />
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-700">No History Yet</h3>
                <p className="text-textLight text-sm text-center max-w-xs">
                    Upload and analyze a research paper to start building your analysis history.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header bar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-textLight font-medium">
                    {entries.length} {entries.length === 1 ? 'analysis' : 'analyses'} stored
                </p>
                <button
                    onClick={fetchHistory}
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                >
                    <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* Entry cards */}
            {entries.map(entry => (
                <button
                    key={entry.id}
                    onClick={() => loadEntry(entry.id)}
                    disabled={loadingId === entry.id}
                    className="w-full surface-neu p-5 hover:shadow-neu-sm active:shadow-neu-pressed transition-all duration-200 cursor-pointer group text-left"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* Title row */}
                            <div className="flex items-center gap-2 mb-1.5">
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                                    {entry.title}
                                </h4>
                            </div>

                            {/* Authors */}
                            {entry.authors.length > 0 && (
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Users className="w-3 h-3 text-textLight shrink-0" />
                                    <p className="text-xs text-textLight truncate">
                                        {entry.authors.join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Metadata row */}
                            <div className="flex items-center gap-4 text-xs text-textLight">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {formatDate(entry.analyzed_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <BarChart3 className="w-3 h-3" /> {entry.pipeline?.chars_extracted?.toLocaleString() || '?'} chars
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                    {entry.filename}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {loadingId === entry.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => deleteEntry(entry.id, e)}
                                        disabled={deletingId === entry.id}
                                        className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        {deletingId === entry.id
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Trash2 className="w-4 h-4" />}
                                    </button>
                                    <ChevronRight className="w-4 h-4 text-textLight group-hover:text-primary transition-colors" />
                                </>
                            )}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
