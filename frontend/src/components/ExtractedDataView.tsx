import { Database, AlertTriangle, Lightbulb, BookOpen, Users, BarChart3, Zap, FileText } from 'lucide-react';
import type { ExtractedInsights } from '../App';

interface Props {
    data: ExtractedInsights;
    pipeline: { chars_extracted: number; matrix_shape: number[]; cognee_success: boolean };
}

export default function ExtractedDataView({ data, pipeline }: Props) {
    const { metadata, methodologies, limitations, contradictions } = data;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ─── Pipeline Stats Bar ────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard icon={<FileText />} label="Characters Extracted" value={pipeline.chars_extracted.toLocaleString()} />
                <StatCard icon={<BarChart3 />} label="Matrix Dimensions" value={`${pipeline.matrix_shape[0]} × ${pipeline.matrix_shape[1]}`} />
                <StatCard icon={<Zap />} label="Knowledge Graph" value={pipeline.cognee_success ? 'Built ✓' : 'Skipped'} />
            </div>

            {/* ─── Paper Metadata ────────────────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <BookOpen className="w-6 h-6 mr-3 text-primary" /> Paper Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="surface-neu-pressed p-6 rounded-2xl">
                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">Title</p>
                        <p className="font-bold text-lg">{metadata.title}</p>
                    </div>
                    <div className="surface-neu-pressed p-6 rounded-2xl">
                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">Authors</p>
                        <div className="flex flex-wrap gap-2">
                            {metadata.authors.map((a, i) => (
                                <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                    <Users className="w-3 h-3 mr-1.5" /> {a.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    {metadata.publication_year && (
                        <div className="surface-neu-pressed p-6 rounded-2xl">
                            <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">Year</p>
                            <p className="font-bold text-lg">{metadata.publication_year}</p>
                        </div>
                    )}
                    <div className={`surface-neu-pressed p-6 rounded-2xl ${metadata.publication_year ? '' : 'md:col-span-2'}`}>
                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">Abstract</p>
                        <p className="text-sm leading-relaxed text-gray-700">{metadata.abstract}</p>
                    </div>
                </div>
            </div>

            {/* ─── Methodology & Dataset Matrix ─────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <Database className="w-6 h-6 mr-3 text-primary" /> Methodology & Dataset Matrix
                </h3>
                {methodologies.length === 0 ? (
                    <EmptyState message="No methodologies were extracted from this paper." />
                ) : (
                    <div className="space-y-6">
                        {methodologies.map((m, i) => (
                            <div key={i} className="surface-neu-pressed p-6 rounded-2xl">
                                <h4 className="font-bold text-lg mb-4 flex items-center">
                                    <Lightbulb className="w-5 h-5 mr-2 text-primary" /> Methodology {i + 1}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <MatrixRow label="Datasets" items={m.datasets} color="bg-blue-500/10 text-blue-700" />
                                    <MatrixRow label="Base Models" items={m.base_models} color="bg-purple-500/10 text-purple-700" />
                                    <MatrixRow label="Metrics" items={m.metrics} color="bg-green-500/10 text-green-700" />
                                    <div>
                                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">Optimization</p>
                                        <span className="inline-block px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 text-sm font-medium">
                                            {m.optimization || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Research Gap Radar ────────────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-3 text-amber-500" /> Research Gap Radar
                </h3>
                {limitations.length === 0 ? (
                    <EmptyState message="No limitations were extracted from this paper." />
                ) : (
                    <div className="space-y-4">
                        {limitations.map((lim, i) => (
                            <div key={i} className="surface-neu-pressed p-6 rounded-2xl">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold text-textMain mb-2">{lim.description}</p>
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-3">
                                            <p className="text-sm font-medium text-amber-700 italic">"{lim.source_context}"</p>
                                        </div>
                                    </div>
                                    {lim.page_number && (
                                        <span className="ml-4 shrink-0 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            p. {lim.page_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Contradiction Engine ──────────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <Zap className="w-6 h-6 mr-3 text-red-500" /> Contradiction Engine
                </h3>
                {contradictions.length === 0 ? (
                    <EmptyState message="No contradictions were detected in this paper." />
                ) : (
                    <div className="space-y-4">
                        {contradictions.map((c, i) => (
                            <div key={i} className="surface-neu-pressed p-6 rounded-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-2">Claim</p>
                                        <p className="text-sm font-medium text-blue-800">{c.claim}</p>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                        <p className="text-xs font-bold text-red-600 uppercase mb-2">Opposing Claim</p>
                                        <p className="text-sm font-medium text-red-800">{c.opposing_claim}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex-1 h-2 rounded-full surface-neu-pressed overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${c.confidence_score > 0.7 ? 'bg-red-500' :
                                                c.confidence_score > 0.4 ? 'bg-amber-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${c.confidence_score * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-textMain">{(c.confidence_score * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="surface-neu p-5 flex items-center space-x-4">
            <div className="p-3 rounded-xl surface-neu-pressed text-primary">{icon}</div>
            <div>
                <p className="text-xs font-semibold text-textLight uppercase tracking-wider">{label}</p>
                <p className="font-bold text-lg">{value}</p>
            </div>
        </div>
    );
}

function MatrixRow({ label, items, color }: { label: string; items: string[]; color: string }) {
    return (
        <div>
            <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <span key={i} className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${color}`}>{item}</span>
                ))}
                {items.length === 0 && <span className="text-sm text-gray-300 italic">None</span>}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-textLight">
            <div className="p-4 rounded-full surface-neu-pressed mb-4">
                <Database className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}
