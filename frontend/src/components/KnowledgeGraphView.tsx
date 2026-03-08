import { useState, useEffect, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GitMerge, Search, Maximize2, Minimize2, ZoomIn, ZoomOut, Crosshair, Info, X } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────
interface GraphNode {
    id: string;
    label: string;
    fullLabel: string;
    group: string;
    degree: number;
    inDegree: number;
    outDegree: number;
    x?: number;
    y?: number;
}

interface GraphEdge {
    source: string | GraphNode;
    target: string | GraphNode;
    relation: string;
}

interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: { node_count: number; edge_count: number };
}

// ── Color palette by node group ─────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
    hub: '#4f6ef7',
    author: '#8b5cf6',
    model: '#22d3ee',
    dataset: '#10b981',
    metric: '#f59e0b',
    limitation: '#ef4444',
    contradiction: '#f97316',
    metadata: '#6366f1',
    concept: '#94a3b8',
};

const GROUP_LABELS: Record<string, string> = {
    hub: 'Central Concept',
    author: 'Author / Affiliation',
    model: 'Model / Algorithm',
    dataset: 'Dataset',
    metric: 'Metric',
    limitation: 'Limitation',
    contradiction: 'Contradiction',
    metadata: 'Metadata',
    concept: 'Concept',
};

// ── Component ───────────────────────────────────────────────────────────────
export default function KnowledgeGraphView() {
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>(null);

    // Fetch graph data from the API
    useEffect(() => {
        const fetchGraph = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/v1/graph');
                if (!res.ok) throw new Error('Failed to load graph');
                const data = await res.json();
                if (data.status === 'empty' || !data.graph?.nodes?.length) {
                    setGraphData(null);
                    setError(data.message || 'No graph data available.');
                } else {
                    setGraphData({
                        nodes: data.graph.nodes,
                        edges: data.graph.edges,
                        stats: data.graph.stats,
                    });
                }
            } catch (err) {
                setError('Failed to fetch knowledge graph data.');
            } finally {
                setLoading(false);
            }
        };
        fetchGraph();
    }, []);

    // Search highlighting
    useEffect(() => {
        if (!searchQuery.trim() || !graphData) {
            setHighlightNodes(new Set());
            return;
        }
        const q = searchQuery.toLowerCase();
        const matching = new Set(
            graphData.nodes
                .filter(n => n.fullLabel.toLowerCase().includes(q) || n.group.toLowerCase().includes(q))
                .map(n => n.id)
        );
        setHighlightNodes(matching);
    }, [searchQuery, graphData]);

    const handleNodeClick = useCallback((node: GraphNode) => {
        setSelectedNode(node);
        // Zoom to node
        if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 500);
            graphRef.current.zoom(3, 500);
        }
    }, []);

    const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.4, 300);
    const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() * 0.7, 300);
    const handleCenter = () => graphRef.current?.zoomToFit(400, 60);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!isFullscreen) {
            containerRef.current.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setIsFullscreen(!isFullscreen);
    };

    // Get neighbors of selected node
    const getNeighborEdges = (nodeId: string) => {
        if (!graphData) return [];
        return graphData.edges.filter(e => {
            const src = typeof e.source === 'string' ? e.source : e.source.id;
            const tgt = typeof e.target === 'string' ? e.target : e.target.id;
            return src === nodeId || tgt === nodeId;
        });
    };

    // ── Render ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
                <div className="glass-icon glass-icon-xl glass-blue animate-float mb-4">
                    <GitMerge className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-textLight font-medium animate-pulse">Loading knowledge graph…</p>
            </div>
        );
    }

    if (error || !graphData) {
        return (
            <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
                <div className="glass-icon glass-icon-xl glass-violet mb-4">
                    <GitMerge className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-textLight font-medium mb-2">{error || 'No knowledge graph available.'}</p>
                <p className="text-xs text-textLight/50">Upload and analyze a paper to generate a knowledge graph.</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="space-y-4 animate-fade-in">

            {/* ── Top Bar: Stats + Search + Controls ── */}
            <div className="flex flex-wrap items-center gap-3">

                {/* Stats */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="glass-icon glass-icon-sm glass-blue">
                            <GitMerge className="w-3.5 h-3.5 text-blue-400" />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold text-textLight uppercase tracking-widest">Nodes</p>
                            <p className="font-extrabold text-base">{graphData.stats.node_count}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="glass-icon glass-icon-sm glass-emerald">
                            <GitMerge className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold text-textLight uppercase tracking-widest">Edges</p>
                            <p className="font-extrabold text-base">{graphData.stats.edge_count}</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="flex-1 max-w-sm">
                    <div className="surface-neu px-3 py-2 flex items-center gap-2 rounded-xl">
                        <Search className="w-4 h-4 text-textLight shrink-0" />
                        <input
                            type="text"
                            placeholder="Search nodes…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-textLight/40 font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-xs text-primary font-semibold">Clear</button>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-1.5">
                    <button onClick={handleZoomIn} className="btn-ghost p-2 rounded-lg" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={handleZoomOut} className="btn-ghost p-2 rounded-lg" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                    <button onClick={handleCenter} className="btn-ghost p-2 rounded-lg" title="Fit to View"><Crosshair className="w-4 h-4" /></button>
                    <button onClick={toggleFullscreen} className="btn-ghost p-2 rounded-lg" title="Fullscreen">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ── Graph Canvas ── */}
            <div className="relative surface-neu rounded-2xl overflow-hidden" style={{ height: isFullscreen ? '100vh' : '520px' }}>

                <ForceGraph2D
                    ref={graphRef}
                    graphData={{ nodes: graphData.nodes, links: graphData.edges }}
                    nodeId="id"
                    nodeLabel="fullLabel"
                    nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                        const n = node as GraphNode;
                        const color = GROUP_COLORS[n.group] || GROUP_COLORS.concept;
                        const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(n.id);
                        const isSelected = selectedNode?.id === n.id;
                        const baseSize = Math.max(3, Math.min(n.degree * 1.5 + 2, 14));
                        const size = isSelected ? baseSize * 1.4 : baseSize;
                        const alpha = isHighlighted ? 1 : 0.15;

                        // Glow for selected/highlighted
                        if (isSelected || (highlightNodes.size > 0 && highlightNodes.has(n.id))) {
                            ctx.beginPath();
                            ctx.arc(node.x!, node.y!, size + 4, 0, 2 * Math.PI);
                            ctx.fillStyle = color + '30';
                            ctx.fill();
                        }

                        // Node circle
                        ctx.beginPath();
                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = color;
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                        ctx.globalAlpha = 1;

                        // Label (only when zoomed in enough)
                        if (globalScale > 1.5 || isSelected || n.degree >= 4) {
                            const label = n.label;
                            const fontSize = Math.max(10 / globalScale, 2.5);
                            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.globalAlpha = isHighlighted ? 0.9 : 0.12;
                            ctx.fillStyle = 'var(--text-main, #e2e8f0)';
                            ctx.fillText(label, node.x!, node.y! + size + fontSize + 1);
                            ctx.globalAlpha = 1;
                        }
                    }}
                    nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                        const n = node as GraphNode;
                        const size = Math.max(3, Math.min(n.degree * 1.5 + 2, 14)) + 2;
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                        ctx.fill();
                    }}
                    linkColor={() => 'rgba(148, 163, 184, 0.15)'}
                    linkWidth={0.6}
                    linkDirectionalArrowLength={3}
                    linkDirectionalArrowRelPos={0.9}
                    linkDirectionalParticles={0}
                    linkLabel={(link: any) => link.relation?.replace(/_/g, ' ')}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedNode(null)}
                    backgroundColor="transparent"
                    cooldownTicks={100}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                    enableZoomInteraction={true}
                    enablePanInteraction={true}
                />

                {/* Legend overlay */}
                <div className="absolute bottom-3 left-3 surface-neu rounded-xl p-3 text-xs space-y-1.5" style={{ backdropFilter: 'blur(12px)' }}>
                    <p className="font-bold text-[10px] text-textLight uppercase tracking-widest mb-2">Legend</p>
                    {Object.entries(GROUP_COLORS).filter(([k]) => k !== 'concept').map(([group, color]) => (
                        <div key={group} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-textLight font-medium">{GROUP_LABELS[group]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Detail Panel (shows when a node is selected) ── */}
            {selectedNode && (
                <div className="surface-neu p-6 rounded-2xl gradient-border animate-scale-in">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className={`glass-icon glass-icon-md`}
                                style={{ background: `${GROUP_COLORS[selectedNode.group]}25`, boxShadow: `0 4px 16px ${GROUP_COLORS[selectedNode.group]}30` }}>
                                <Info className="w-4 h-4" style={{ color: GROUP_COLORS[selectedNode.group] }} />
                            </span>
                            <div>
                                <h4 className="font-bold text-base">{selectedNode.fullLabel}</h4>
                                <p className="text-xs text-textLight font-medium mt-0.5">
                                    <span className="badge" style={{ background: `${GROUP_COLORS[selectedNode.group]}15`, color: GROUP_COLORS[selectedNode.group] }}>
                                        {GROUP_LABELS[selectedNode.group]}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="btn-ghost p-1.5 rounded-lg">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="surface-neu-pressed p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-textLight uppercase tracking-widest">Degree</p>
                            <p className="font-extrabold text-lg">{selectedNode.degree}</p>
                        </div>
                        <div className="surface-neu-pressed p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-textLight uppercase tracking-widest">Incoming</p>
                            <p className="font-extrabold text-lg">{selectedNode.inDegree}</p>
                        </div>
                        <div className="surface-neu-pressed p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-textLight uppercase tracking-widest">Outgoing</p>
                            <p className="font-extrabold text-lg">{selectedNode.outDegree}</p>
                        </div>
                    </div>

                    {/* Connected edges */}
                    <div>
                        <p className="text-[10px] font-bold text-textLight uppercase tracking-widest mb-2">Connections</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {getNeighborEdges(selectedNode.id).map((e, i) => {
                                const src = typeof e.source === 'string' ? e.source : e.source.id;
                                const tgt = typeof e.target === 'string' ? e.target : e.target.id;
                                const isOutgoing = src === selectedNode.id;
                                return (
                                    <div key={i} className="surface-neu-pressed p-2 rounded-lg text-xs flex items-center gap-2">
                                        <span className="font-semibold truncate flex-1">{isOutgoing ? tgt : src}</span>
                                        <span className="badge text-[9px] shrink-0" style={{ background: 'rgba(79,110,247,0.1)', color: '#4f6ef7' }}>
                                            {isOutgoing ? '→' : '←'} {(typeof e.relation === 'string' ? e.relation : '').replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
