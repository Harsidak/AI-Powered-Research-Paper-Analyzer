import { useState } from 'react';
import { Database, AlertTriangle, Lightbulb, BookOpen, Users, BarChart3, Zap, FileText, Search, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import type { ExtractedInsights } from '../App';

interface Props {
    data: ExtractedInsights;
    pipeline: { chars_extracted: number; matrix_shape: number[]; cognee_success: boolean };
}

const CHART_COLORS = ['#4763ff', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function ExtractedDataView({ data, pipeline }: Props) {
    const { metadata, methodologies, limitations, contradictions } = data;
    const [searchQuery, setSearchQuery] = useState('');

    // Filter all text content by search query
    const q = searchQuery.toLowerCase().trim();
    const filteredMethodologies = q ? methodologies.filter(m =>
        [...m.datasets, ...m.base_models, ...m.metrics, m.optimization || ''].some(s => s.toLowerCase().includes(q))
    ) : methodologies;
    const filteredLimitations = q ? limitations.filter(l =>
        l.description.toLowerCase().includes(q) || l.source_context.toLowerCase().includes(q)
    ) : limitations;
    const filteredContradictions = q ? contradictions.filter(c =>
        c.claim.toLowerCase().includes(q) || c.opposing_claim.toLowerCase().includes(q)
    ) : contradictions;

    // Chart data
    const confidenceData = contradictions.map((c, i) => ({
        name: `#${i + 1}`,
        confidence: Math.round(c.confidence_score * 100),
    }));

    const categoryData = [
        { name: 'Datasets', count: methodologies.flatMap(m => m.datasets).length },
        { name: 'Models', count: methodologies.flatMap(m => m.base_models).length },
        { name: 'Metrics', count: methodologies.flatMap(m => m.metrics).length },
        { name: 'Gaps', count: limitations.length },
        { name: 'Contradictions', count: contradictions.length },
    ];

    return (
        <div className="space-y-8 view-transition-enter">

            {/* ─── Search Bar ───────────────────────────────────────────── */}
            <div className="surface-neu p-4 flex items-center space-x-3">
                <Search className="w-5 h-5 text-textLight shrink-0" />
                <input
                    type="text"
                    placeholder="Search datasets, models, metrics, gaps..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-textLight/50"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-xs text-primary font-medium hover:underline">
                        Clear
                    </button>
                )}
            </div>

            {/* ─── Pipeline Stats ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<FileText />} label="Characters" value={pipeline.chars_extracted.toLocaleString()} />
                <StatCard icon={<BarChart3 />} label="Matrix" value={`${pipeline.matrix_shape[0]}×${pipeline.matrix_shape[1]}`} />
                <StatCard icon={<Zap />} label="GraphRAG" value={pipeline.cognee_success ? 'Built ✓' : 'Skipped'} />
                <StatCard icon={<Calendar />} label="Year" value={metadata.publication_year?.toString() || 'N/A'} />
            </div>

            {/* ─── Paper Metadata ────────────────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-xl font-bold mb-5 flex items-center">
                    <BookOpen className="w-5 h-5 mr-3 text-primary" /> Paper Metadata
                </h3>
                <div className="space-y-4">
                    <div className="surface-neu-pressed p-5 rounded-2xl">
                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-1.5">Title</p>
                        <p className="font-bold text-lg">{metadata.title}</p>
                    </div>
                    <div className="surface-neu-pressed p-5 rounded-2xl">
                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">Authors</p>
                        <div className="flex flex-wrap gap-2">
                            {metadata.authors.map((a, i) => (
                                <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                    <Users className="w-3 h-3 mr-1.5" /> {a.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="surface-neu-pressed p-5 rounded-2xl">
                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-1.5">Abstract</p>
                        <p className="text-sm leading-relaxed">{metadata.abstract}</p>
                    </div>
                </div>
            </div>

            {/* ─── Data Visualizations ───────────────────────────────────── */}
            {(contradictions.length > 0 || categoryData.some(d => d.count > 0)) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Extraction Overview Pie */}
                    <div className="surface-neu p-6">
                        <h4 className="font-bold text-sm mb-4 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2 text-primary" /> Extraction Overview
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={categoryData.filter(d => d.count > 0)}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="count"
                                    label={({ name, value }: { name?: string; value?: number }) => `${name || ''}: ${value || 0}`}
                                >
                                    {categoryData.filter(d => d.count > 0).map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', color: 'var(--text-main)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Contradiction Confidence Chart */}
                    {contradictions.length > 0 && (
                        <div className="surface-neu p-6">
                            <h4 className="font-bold text-sm mb-4 flex items-center">
                                <Zap className="w-4 h-4 mr-2 text-red-500" /> Contradiction Confidence
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={confidenceData} barSize={28}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-light)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-light)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v) => [`${v}%`, 'Confidence']}
                                        contentStyle={{ background: 'var(--bg)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', color: 'var(--text-main)' }}
                                    />
                                    <Bar dataKey="confidence" radius={[6, 6, 0, 0]}>
                                        {confidenceData.map((entry, i) => (
                                            <Cell key={i} fill={entry.confidence > 70 ? '#ef4444' : entry.confidence > 40 ? '#f59e0b' : '#10b981'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Methodology Matrix ───────────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-xl font-bold mb-5 flex items-center">
                    <Database className="w-5 h-5 mr-3 text-primary" /> Methodology & Dataset Matrix
                    {q && <span className="ml-auto text-xs text-textLight font-normal">{filteredMethodologies.length} of {methodologies.length}</span>}
                </h3>
                {filteredMethodologies.length === 0 ? (
                    <EmptyState message={q ? 'No methodologies match your search.' : 'No methodologies were extracted.'} />
                ) : (
                    <div className="space-y-5">
                        {filteredMethodologies.map((m, i) => (
                            <div key={i} className="surface-neu-pressed p-6 rounded-2xl">
                                <h4 className="font-bold mb-4 flex items-center">
                                    <Lightbulb className="w-4 h-4 mr-2 text-primary" /> Methodology {i + 1}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TagRow label="Datasets" items={m.datasets} color="bg-blue-500/10 text-blue-700 dark:text-blue-300" />
                                    <TagRow label="Base Models" items={m.base_models} color="bg-purple-500/10 text-purple-700 dark:text-purple-300" />
                                    <TagRow label="Metrics" items={m.metrics} color="bg-green-500/10 text-green-700 dark:text-green-300" />
                                    <div>
                                        <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">Optimization</p>
                                        <span className="inline-block px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 text-sm font-medium">
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
                <h3 className="text-xl font-bold mb-5 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-3 text-amber-500" /> Research Gap Radar
                    {q && <span className="ml-auto text-xs text-textLight font-normal">{filteredLimitations.length} of {limitations.length}</span>}
                </h3>
                {filteredLimitations.length === 0 ? (
                    <EmptyState message={q ? 'No gaps match your search.' : 'No limitations were extracted.'} />
                ) : (
                    <div className="space-y-4">
                        {filteredLimitations.map((lim, i) => (
                            <div key={i} className="surface-neu-pressed p-5 rounded-2xl">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-semibold mb-2">{lim.description}</p>
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mt-2">
                                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 italic">"{lim.source_context}"</p>
                                        </div>
                                    </div>
                                    {lim.page_number && (
                                        <span className="shrink-0 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">p. {lim.page_number}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Contradiction Engine ──────────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-xl font-bold mb-5 flex items-center">
                    <Zap className="w-5 h-5 mr-3 text-red-500" /> Contradiction Engine
                    {q && <span className="ml-auto text-xs text-textLight font-normal">{filteredContradictions.length} of {contradictions.length}</span>}
                </h3>
                {filteredContradictions.length === 0 ? (
                    <EmptyState message={q ? 'No contradictions match your search.' : 'No contradictions were detected.'} />
                ) : (
                    <div className="space-y-4">
                        {filteredContradictions.map((c, i) => (
                            <div key={i} className="surface-neu-pressed p-5 rounded-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase mb-1">Claim</p>
                                        <p className="text-sm font-medium">{c.claim}</p>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                        <p className="text-xs font-bold text-red-600 dark:text-red-300 uppercase mb-1">Opposing Claim</p>
                                        <p className="text-sm font-medium">{c.opposing_claim}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex-1 h-2 rounded-full surface-neu-pressed overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${c.confidence_score > 0.7 ? 'bg-red-500' :
                                                c.confidence_score > 0.4 ? 'bg-amber-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${c.confidence_score * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold">{(c.confidence_score * 100).toFixed(0)}%</span>
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
        <div className="surface-neu p-4 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl surface-neu-pressed text-primary">{icon}</div>
            <div>
                <p className="text-[10px] font-semibold text-textLight uppercase tracking-wider">{label}</p>
                <p className="font-bold">{value}</p>
            </div>
        </div>
    );
}

function TagRow({ label, items, color }: { label: string; items: string[]; color: string }) {
    return (
        <div>
            <p className="text-xs font-semibold text-textLight uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                    <span key={i} className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{item}</span>
                ))}
                {items.length === 0 && <span className="text-xs text-textLight italic">None</span>}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-textLight">
            <div className="p-3 rounded-full surface-neu-pressed mb-3">
                <Database className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}
