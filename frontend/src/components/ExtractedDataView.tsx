import { useState } from 'react';
import { Database, AlertTriangle, Lightbulb, BookOpen, Users, BarChart3, Zap, FileText, Search, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, RadialBarChart, RadialBar, Legend } from 'recharts';
import type { ExtractedInsights } from '../App';

interface Props {
    data: ExtractedInsights;
    pipeline: {
        chars_extracted: number;
        matrix_shape: number[];
        cognee_success: boolean;
        graph_triplets?: number;
        graph_nodes?: number;
        graph_edges?: number;
    };
}

const CHART_COLORS = ['#4f6ef7', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#22d3ee', '#84cc16'];

export default function ExtractedDataView({ data, pipeline }: Props) {
    const { metadata, methodologies, limitations, contradictions } = data;
    const [searchQuery, setSearchQuery] = useState('');

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

    // Radial data for the overview gauge
    const totalItems = categoryData.reduce((s, d) => s + d.count, 0);
    const radialData = [
        { name: 'Extraction Depth', value: Math.min(totalItems * 5, 100), fill: '#4f6ef7' },
    ];

    return (
        <div className="space-y-6 stagger-children">

            {/* ─── Search Bar ─────────────────────────────────────── */}
            <div className="surface-neu p-4 flex items-center gap-3 gradient-border">
                <Search className="w-5 h-5 text-textLight shrink-0" />
                <input
                    type="text"
                    placeholder="Search datasets, models, metrics, gaps…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-textLight/40 font-medium"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')}
                        className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                        Clear
                    </button>
                )}
            </div>

            {/* ─── Pipeline Stats ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={<FileText className="w-5 h-5" />} label="Characters" value={pipeline.chars_extracted.toLocaleString()} color="#4f6ef7" />
                <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Matrix" value={`${pipeline.matrix_shape[0]}×${pipeline.matrix_shape[1]}`} color="#8b5cf6" />
                <StatCard icon={<Zap className="w-5 h-5" />} label="Triplets" value={pipeline.graph_triplets ? `${pipeline.graph_triplets} extracted` : (pipeline.cognee_success ? 'Built ✓' : 'Skipped')} color="#22d3ee" />
                <StatCard icon={<Database className="w-5 h-5" />} label="Graph" value={pipeline.graph_nodes ? `${pipeline.graph_nodes}N · ${pipeline.graph_edges || 0}E` : 'N/A'} color="#10b981" />
                <StatCard icon={<Calendar className="w-5 h-5" />} label="Year" value={metadata.publication_year?.toString() || 'N/A'} color="#f59e0b" />
            </div>

            {/* ─── Paper Metadata ─────────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-3">
                    <span className="glass-icon glass-icon-md glass-blue">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                    </span>
                    Paper Metadata
                </h3>
                <div className="space-y-4">
                    <div className="surface-neu-pressed p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-textLight uppercase tracking-widest mb-1.5">Title</p>
                        <p className="font-bold text-base leading-snug">{metadata.title}</p>
                    </div>
                    <div className="surface-neu-pressed p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-textLight uppercase tracking-widest mb-2.5">Authors</p>
                        <div className="flex flex-wrap gap-2">
                            {metadata.authors.map((a, i) => (
                                <span key={i} className="badge" style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--primary)' }}>
                                    <Users className="w-3 h-3 mr-1.5" /> {a.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="surface-neu-pressed p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-textLight uppercase tracking-widest mb-1.5">Abstract</p>
                        <p className="text-sm leading-relaxed text-textLight">{metadata.abstract}</p>
                    </div>
                </div>
            </div>

            {/* ─── Data Visualizations ────────────────────────────── */}
            {(contradictions.length > 0 || totalItems > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Extraction Overview Pie */}
                    <div className="surface-neu p-6">
                        <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <span className="glass-icon glass-icon-sm glass-blue">
                                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                            </span>
                            Extraction Overview
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={categoryData.filter(d => d.count > 0)}
                                    cx="50%" cy="50%"
                                    innerRadius={50} outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="count"
                                    stroke="none"
                                    label={({ name, value }: { name?: string; value?: number }) => `${name || ''}: ${value || 0}`}
                                >
                                    {categoryData.filter(d => d.count > 0).map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', color: 'var(--text-main)', fontFamily: 'Inter' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Contradiction Confidence */}
                    {contradictions.length > 0 && (
                        <div className="surface-neu p-6">
                            <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                                <span className="glass-icon glass-icon-sm glass-red">
                                    <Zap className="w-3.5 h-3.5 text-red-400" />
                                </span>
                                Contradiction Confidence
                            </h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={confidenceData} barSize={24}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-light)', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-light)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v) => [`${v}%`, 'Confidence']}
                                        contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', color: 'var(--text-main)', fontFamily: 'Inter' }}
                                    />
                                    <Bar dataKey="confidence" radius={[8, 8, 0, 0]}>
                                        {confidenceData.map((entry, i) => (
                                            <Cell key={i} fill={entry.confidence > 70 ? '#ef4444' : entry.confidence > 40 ? '#f59e0b' : '#10b981'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Depth Radial Gauge */}
                    <div className="surface-neu p-6">
                        <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <span className="glass-icon glass-icon-sm glass-cyan">
                                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                            </span>
                            Extraction Depth
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                                <RadialBar background dataKey="value" cornerRadius={10} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', color: 'var(--text-light)' }} />
                                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontFamily: 'Inter' }} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-2xl font-extrabold text-gradient -mt-6">{totalItems}</p>
                        <p className="text-center text-[10px] text-textLight font-medium uppercase tracking-wider mt-1">Items Extracted</p>
                    </div>
                </div>
            )}

            {/* ─── Methodology Matrix ─────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-3">
                    <span className="glass-icon glass-icon-md glass-violet">
                        <Database className="w-4 h-4 text-violet-400" />
                    </span>
                    Methodology & Dataset Matrix
                    {q && <span className="ml-auto text-xs text-textLight font-normal">{filteredMethodologies.length}/{methodologies.length}</span>}
                </h3>
                {filteredMethodologies.length === 0 ? (
                    <EmptyState message={q ? 'No methodologies match your search.' : 'No methodologies extracted.'} />
                ) : (
                    <div className="space-y-4">
                        {filteredMethodologies.map((m, i) => (
                            <div key={i} className="surface-neu-pressed p-6 rounded-2xl gradient-border">
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-primary" /> Methodology {i + 1}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TagRow label="Datasets" items={m.datasets} color="#4f6ef7" />
                                    <TagRow label="Base Models" items={m.base_models} color="#8b5cf6" />
                                    <TagRow label="Metrics" items={m.metrics} color="#10b981" />
                                    <div>
                                        <p className="text-[10px] font-bold text-textLight uppercase tracking-widest mb-2">Optimization</p>
                                        <span className="badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                            {m.optimization || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Research Gap Radar ─────────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-3">
                    <span className="glass-icon glass-icon-md glass-amber">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </span>
                    Research Gap Radar
                    {q && <span className="ml-auto text-xs text-textLight font-normal">{filteredLimitations.length}/{limitations.length}</span>}
                </h3>
                {filteredLimitations.length === 0 ? (
                    <EmptyState message={q ? 'No gaps match your search.' : 'No limitations extracted.'} />
                ) : (
                    <div className="space-y-4">
                        {filteredLimitations.map((lim, i) => (
                            <div key={i} className="surface-neu-pressed p-5 rounded-2xl gradient-border">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm mb-2">{lim.description}</p>
                                        <div className="p-3 rounded-xl mt-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                            <p className="text-sm italic text-amber-600 dark:text-amber-300">"{lim.source_context}"</p>
                                        </div>
                                    </div>
                                    {lim.page_number && (
                                        <span className="badge shrink-0" style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--primary)' }}>p. {lim.page_number}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Contradiction Engine ───────────────────────────── */}
            <div className="surface-neu p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-3">
                    <span className="glass-icon glass-icon-md glass-red">
                        <Zap className="w-4 h-4 text-red-400" />
                    </span>
                    Contradiction Engine
                    {q && <span className="ml-auto text-xs text-textLight font-normal">{filteredContradictions.length}/{contradictions.length}</span>}
                </h3>
                {filteredContradictions.length === 0 ? (
                    <EmptyState message={q ? 'No contradictions match.' : 'No contradictions detected.'} />
                ) : (
                    <div className="space-y-4">
                        {filteredContradictions.map((c, i) => (
                            <div key={i} className="surface-neu-pressed p-5 rounded-2xl gradient-border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 rounded-xl" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.15)' }}>
                                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>Claim</p>
                                        <p className="text-sm font-medium">{c.claim}</p>
                                    </div>
                                    <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Opposing</p>
                                        <p className="text-sm font-medium">{c.opposing_claim}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 rounded-full surface-neu-pressed overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${c.confidence_score * 100}%`,
                                                background: c.confidence_score > 0.7 ? 'var(--gradient-danger)' : c.confidence_score > 0.4 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'var(--gradient-success)',
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-extrabold tabular-nums">{(c.confidence_score * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    const glassClass = color === '#4f6ef7' ? 'glass-blue'
        : color === '#8b5cf6' ? 'glass-violet'
            : color === '#22d3ee' ? 'glass-cyan'
                : color === '#10b981' ? 'glass-emerald'
                    : color === '#f59e0b' ? 'glass-amber'
                        : color === '#ef4444' ? 'glass-red'
                            : 'glass-blue';
    return (
        <div className="surface-neu p-4 flex items-center gap-3 gradient-border">
            <div className={`glass-icon glass-icon-md ${glassClass} shrink-0`} style={{ color }}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-textLight uppercase tracking-widest">{label}</p>
                <p className="font-extrabold text-base">{value}</p>
            </div>
        </div>
    );
}

function TagRow({ label, items, color }: { label: string; items: string[]; color: string }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-textLight uppercase tracking-widest mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                    <span key={i} className="badge" style={{ background: `${color}15`, color }}>{item}</span>
                ))}
                {items.length === 0 && <span className="text-xs text-textLight italic">None</span>}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-textLight">
            <div className="glass-icon glass-icon-lg glass-violet mb-3">
                <Database className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}
