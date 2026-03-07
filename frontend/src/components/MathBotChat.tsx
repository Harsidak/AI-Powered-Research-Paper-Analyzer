import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const SUGGESTIONS = [
    "Summarize the methodology used",
    "What are the key limitations?",
    "What datasets were used?",
    "Find contradictions in the claims",
];

export default function MathBotChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hi! I'm MathBot 🧠 — your Researcher Co-Pilot. Upload a paper and ask me anything about its methodology, gaps, or contradictions." }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;

        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg }),
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'No response.' }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Connection failed. Make sure the backend is running.\n${err instanceof Error ? err.message : String(err)}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <>
            {/* Floating trigger */}
            {!open && (
                <button
                    id="mathbot-open"
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-200"
                    aria-label="Open MathBot chat"
                >
                    <MessageSquare size={22} />
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div
                    className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[620px] flex flex-col rounded-2xl shadow-xl overflow-hidden border border-white/30"
                    style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary to-blue-500 text-white">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} />
                            <span className="font-semibold text-sm">MathBot — Researcher Co-Pilot</span>
                        </div>
                        <button onClick={() => setOpen(false)} className="hover:opacity-75 transition-opacity">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 200, maxHeight: 400 }}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-primary text-white rounded-tr-sm'
                                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2 text-gray-500 text-sm">
                                    <Loader2 size={14} className="animate-spin" /> Thinking…
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick suggestions (show only when few messages) */}
                    {messages.length <= 2 && !loading && (
                        <div className="px-4 pb-2 flex flex-wrap gap-2">
                            {SUGGESTIONS.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(s)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex items-center gap-2 p-4 border-t border-gray-200">
                        <input
                            ref={inputRef}
                            id="mathbot-input"
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Ask about the paper…"
                            disabled={loading}
                            className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-colors bg-white"
                        />
                        <button
                            id="mathbot-send"
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                            aria-label="Send"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
