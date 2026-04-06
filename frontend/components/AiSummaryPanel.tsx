'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Loader2, Brain, AlertTriangle } from 'lucide-react';

interface AiSummaryPanelProps {
  teamId: string;
  teamName: string;
}

export default function AiSummaryPanel({ teamId, teamName }: AiSummaryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ai/teams/${teamId}/summarize`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`Failed to summarize (${res.status})`);
      }

      const data = await res.json();
      setSummary(data.summary);
      setGeneratedAt(data.generatedAt);
    } catch (err: any) {
      setError(err.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={() => setIsOpen(false)} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-background border border-primary/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/15 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center">
              <Brain size={20} className="text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-text">AI Team Summary</h3>
              <p className="text-[10px] text-primary/50 font-mono uppercase tracking-wider">{teamName} • POWERED BY GEMINI</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-primary/10 text-primary/50 hover:text-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-2xl bg-violet-600/10 flex items-center justify-center">
                  <Sparkles size={32} className="text-violet-400 animate-pulse" />
                </div>
                <Loader2 size={88} className="absolute -inset-[4px] text-violet-500/30 animate-spin" strokeWidth={1} />
              </div>
              <div className="text-center mt-4">
                <p className="text-base font-semibold text-text">Analyzing team history...</p>
                <p className="text-[10px] text-primary/40 mt-1 font-mono tracking-widest uppercase">GATHERING CHANNELS + PULSES → GEMINI</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <AlertTriangle size={32} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-text">Summarization Failed</p>
                <p className="text-sm text-primary/50 mt-2 max-w-sm mx-auto">{error}</p>
              </div>
              <button
                onClick={handleSummarize}
                className="mt-4 px-6 py-2.5 bg-secondary text-white rounded-xl text-sm font-bold hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20"
              >
                Try Again
              </button>
            </div>
          )}

          {summary && !loading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Render the markdown-like summary */}
              <div className="prose prose-sm prose-invert max-w-none">
                {summary.split('\n').map((line, i) => {
                  // Bold headers (## or **)
                  if (line.startsWith('## ') || line.startsWith('**')) {
                    const text = line.replace(/^##\s*/, '').replace(/\*\*/g, '');
                    return (
                      <h4 key={i} className="text-base font-bold text-text mt-8 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                        {text}
                      </h4>
                    );
                  }
                  // Numbered items
                  if (/^\d+\.\s/.test(line)) {
                    const text = line.replace(/^\d+\.\s*/, '');
                    const parts = text.split(/\*\*/);
                    return (
                      <div key={i} className="flex gap-3 mt-4 mb-2 bg-primary/5 p-3 rounded-xl border border-primary/5 hover:border-violet-500/10 transition-colors">
                        <span className="w-6 h-6 rounded-lg bg-violet-600/10 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0 mt-0.5">
                          {line.match(/^\d+/)?.[0]}
                        </span>
                        <p className="text-sm text-text/80 leading-relaxed">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j} className="text-text font-bold brightness-125">{part}</strong> : part
                          )}
                        </p>
                      </div>
                    );
                  }
                  // Bullet items
                  if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
                    const text = line.replace(/^[-•*]\s*/, '');
                    const parts = text.split(/\*\*/);
                    return (
                      <div key={i} className="flex gap-3 ml-2 py-1.5 border-l border-primary/10 pl-6 relative">
                        <span className="absolute left-[-3px] top-4 w-1.5 h-1.5 rounded-full bg-primary/30" />
                        <p className="text-sm text-text/80 leading-relaxed">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j} className="text-text font-bold brightness-125">{part}</strong> : part
                          )}
                        </p>
                      </div>
                    );
                  }
                  // Empty lines
                  if (line.trim() === '') return <div key={i} className="h-4" />;
                  // Regular text
                  return <p key={i} className="text-sm text-text/70 leading-relaxed mb-4">{line}</p>;
                })}
              </div>

              {/* Footer */}
              {generatedAt && (
                <div className="mt-10 pt-6 border-t border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[10px] text-primary/30 font-mono tracking-widest">
                    SYNCPOINT_SUMMARY_GEN_{new Date(generatedAt).toISOString().split('T')[0].replace(/-/g, '_')}
                  </p>
                  <button
                    onClick={handleSummarize}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20"
                  >
                    <Sparkles size={14} />
                    Regenerate Summary
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); handleSummarize(); }}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/20 hover:border-violet-500/40 rounded-xl text-xs font-semibold text-violet-300 hover:text-violet-200 transition-all group w-full mb-1 shadow-sm"
      >
        <Sparkles size={14} className="group-hover:animate-pulse shrink-0" />
        <span className="truncate">Global Sync: {teamName}</span>
      </button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
