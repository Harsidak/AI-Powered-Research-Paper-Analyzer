import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import type { ExtractedInsights } from '../App';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface Props {
    analysisData?: ExtractedInsights | null;
}

const SUGGESTIONS = [
    "Summarize the methodology",
    "What are the key limitations?",
    "What datasets were used?",
    "Find contradictions in the claims",
    "Compare the evaluation metrics",
    "What optimization techniques were used?",
];

export default function MathBotChat({ analysisData }: Props) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hi! I'm MathBot 🧠 — your Researcher Co-Pilot. Upload a paper and ask me anything about its methodology, gaps, or contradictions." }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Update greeting when analysis data changes
    useEffect(() => {
        if (analysisData?.metadata?.title) {
            const title = analysisData.metadata.title;
            const truncTitle = title.length > 60 ? title.slice(0, 57) + '…' : title;
            setMessages(prev => {
                // Only update if the first message is the default greeting
                if (prev.length === 1 && prev[0].role === 'assistant') {
                    return [{ role: 'assistant', content: `📄 **${truncTitle}** loaded!\n\nI can help you explore this paper's methodology, limitations, contradictions, and more. What would you like to know?` }];
                }
                return prev;
            });
        }
    }, [analysisData?.metadata?.title]);

    const sendMessage = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setInput('');
        setLoading(true);

        // Build context string from analysis data so MathBot has structured info
        let contextStr = '';
        if (analysisData) {
            const parts: string[] = [];
            const meta = analysisData.metadata;
            if (meta) {
                parts.push(`Paper: ${meta.title}`);
                parts.push(`Authors: ${meta.authors?.map(a => a.name).join(', ') || 'N/A'}`);
                parts.push(`Year: ${meta.publication_year || 'N/A'}`);
                parts.push(`Abstract: ${meta.abstract || 'N/A'}`);
            }
            if (analysisData.methodologies?.length) {
                parts.push('\nMETHODOLOGIES:');
                analysisData.methodologies.forEach((m, i) => {
                    parts.push(`  ${i + 1}. Datasets: ${m.datasets?.join(', ') || 'N/A'}`);
                    parts.push(`     Models: ${m.base_models?.join(', ') || 'N/A'}`);
                    parts.push(`     Metrics: ${m.metrics?.join(', ') || 'N/A'}`);
                    parts.push(`     Optimization: ${m.optimization || 'N/A'}`);
                });
            }
            if (analysisData.limitations?.length) {
                parts.push('\nLIMITATIONS:');
                analysisData.limitations.forEach((l, i) => {
                    parts.push(`  ${i + 1}. ${l.description}`);
                });
            }
            if (analysisData.contradictions?.length) {
                parts.push('\nCONTRADICTIONS:');
                analysisData.contradictions.forEach((c, i) => {
                    parts.push(`  ${i + 1}. Claim: ${c.claim}`);
                    parts.push(`     Opposing: ${c.opposing_claim}`);
                    parts.push(`     Confidence: ${Math.round(c.confidence_score * 100)}%`);
                });
            }
            contextStr = parts.join('\n');
        }

        try {
            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    ...(contextStr ? { context: contextStr } : {}),
                }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'No response.' }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Connection failed.\n${err instanceof Error ? err.message : String(err)}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const hasAnalysis = !!analysisData?.metadata?.title;

    return (
        <>
            {/* FAB */}
            {!open && (
                <button
                    id="mathbot-open"
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center text-white
                             hover:scale-110 active:scale-95 transition-all duration-300 shadow-lg"
                    style={{ background: 'var(--gradient-primary)', boxShadow: '0 8px 30px rgba(79,110,247,0.4)' }}
                    aria-label="Open MathBot chat"
                >
                    <MessageSquare size={22} />
                    {hasAnalysis && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: 'var(--bg)' }} />
                    )}
                </button>
            )}

            {/* Chat Panel */}
            {open && (
                <div className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[620px] flex flex-col rounded-3xl overflow-hidden animate-scale-in"
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px var(--border)',
                        backdropFilter: 'blur(20px)',
                    }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 text-white"
                        style={{ background: 'var(--gradient-primary)' }}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <p className="font-bold text-sm">MathBot</p>
                                <p className="text-[10px] opacity-70 font-medium">
                                    {hasAnalysis ? `Analyzing: ${analysisData!.metadata.title.slice(0, 30)}…` : 'Researcher Co-Pilot'}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 200, maxHeight: 400 }}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                                    ${msg.role === 'user'
                                        ? 'rounded-br-md text-white'
                                        : 'rounded-bl-md surface-neu-pressed'
                                    }`}
                                    style={msg.role === 'user' ? { background: 'var(--gradient-primary)' } : {}}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="surface-neu-pressed px-4 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-2 text-textLight text-sm">
                                    <Loader2 size={14} className="animate-spin text-primary" /> Thinking…
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions */}
                    {messages.length <= 2 && !loading && (
                        <div className="px-4 pb-2 flex flex-wrap gap-2">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} onClick={() => sendMessage(s)}
                                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 hover:scale-105"
                                    style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--primary)' }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex items-center gap-2 p-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <input
                            ref={inputRef}
                            id="mathbot-input"
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={hasAnalysis ? "Ask about the paper…" : "Upload a paper first…"}
                            disabled={loading}
                            className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none transition-all bg-transparent font-medium placeholder:text-textLight/40 surface-neu-pressed"
                            style={{ border: '1px solid var(--border)' }}
                        />
                        <button
                            id="mathbot-send"
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-white disabled:opacity-30 hover:scale-105 active:scale-95 transition-all duration-200"
                            style={{ background: 'var(--gradient-primary)' }}
                            aria-label="Send"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
