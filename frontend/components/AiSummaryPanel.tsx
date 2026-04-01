'use client';

import { useState } from 'react';
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

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch(`http://localhost:3001/ai/teams/${teamId}/summarize`, {
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

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); handleSummarize(); }}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/20 hover:border-violet-500/40 rounded-xl text-xs font-semibold text-violet-300 hover:text-violet-200 transition-all group w-full mb-1"
      >
        <Sparkles size={14} className="group-hover:animate-pulse shrink-0" />
        <span className="truncate">Summary: {teamName}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] bg-background border border-primary/20 rounded-2xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/15 bg-gradient-to-r from-violet-600/5 to-indigo-600/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center">
              <Brain size={18} className="text-violet-400" />
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
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center">
                  <Sparkles size={28} className="text-violet-400 animate-pulse" />
                </div>
                <Loader2 size={72} className="absolute -inset-[4px] text-violet-500/40 animate-spin" />
              </div>
              <div className="text-center mt-2">
                <p className="text-sm font-semibold text-text">Analyzing team activity...</p>
                <p className="text-[10px] text-primary/40 mt-1 font-mono tracking-widest uppercase">GATHERING PULSES + MESSAGES → GEMINI</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text">Summarization Failed</p>
                <p className="text-xs text-primary/50 mt-1 max-w-sm">{error}</p>
              </div>
              <button
                onClick={handleSummarize}
                className="mt-2 px-4 py-2 bg-secondary/20 hover:bg-secondary/30 border border-secondary/20 rounded-lg text-sm text-secondary font-semibold transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {summary && !loading && (
            <div>
              {/* Render the markdown-like summary */}
              <div className="prose prose-sm prose-invert max-w-none">
                {summary.split('\n').map((line, i) => {
                  // Bold headers (## or **)
                  if (line.startsWith('## ') || line.startsWith('**')) {
                    const text = line.replace(/^##\s*/, '').replace(/\*\*/g, '');
                    return (
                      <h4 key={i} className="text-sm font-bold text-text mt-4 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        {text}
                      </h4>
                    );
                  }
                  // Numbered items
                  if (/^\d+\.\s/.test(line)) {
                    const text = line.replace(/^\d+\.\s*/, '');
                    // Check for bold inside numbered items
                    const parts = text.split(/\*\*/);
                    return (
                      <div key={i} className="flex gap-2 mt-3 mb-1">
                        <span className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary shrink-0 mt-0.5">
                          {line.match(/^\d+/)?.[0]}
                        </span>
                        <p className="text-sm text-text/80 leading-relaxed">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j} className="text-text font-semibold">{part}</strong> : part
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
                      <div key={i} className="flex gap-2 ml-2 py-0.5">
                        <span className="w-1 h-1 rounded-full bg-primary/30 mt-2 shrink-0" />
                        <p className="text-sm text-text/80 leading-relaxed">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j} className="text-text font-semibold">{part}</strong> : part
                          )}
                        </p>
                      </div>
                    );
                  }
                  // Empty lines
                  if (line.trim() === '') return <div key={i} className="h-2" />;
                  // Regular text
                  return <p key={i} className="text-sm text-text/70 leading-relaxed">{line}</p>;
                })}
              </div>

              {/* Footer */}
              {generatedAt && (
                <div className="mt-6 pt-4 border-t border-primary/10 flex items-center justify-between">
                  <p className="text-[10px] text-primary/30 font-mono">
                    GENERATED {new Date(generatedAt).toLocaleString()}
                  </p>
                  <button
                    onClick={handleSummarize}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/15 rounded-lg text-xs text-violet-300 font-semibold transition-colors"
                  >
                    <Sparkles size={12} />
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
