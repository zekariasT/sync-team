'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Database, Search, Bot, FileText } from 'lucide-react';
import { useToast } from './ToastProvider';
import ViewHeader from './ViewHeader';
import DocumentUploader from './DocumentUploader';

export default function KnowledgeBaseView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { error: toastError } = useToast();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !teamId) return;

    setIsSearching(true);
    setAnswer(null);

    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}/kb/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'guest-demo-user',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
         const data = await res.json();
         setAnswer(data.answer);
      } else {
         const errorData = await res.json().catch(() => ({ message: 'Failed to get answer' }));
         toastError(errorData.message || 'Failed to get answer');
         setAnswer(`❌ ${errorData.message || 'Failed to get answer from Knowledge Base.'}`);
      }
    } catch (err: any) {
        toastError(err.message || 'Error connecting to RAG service');
        setAnswer('❌ Error connecting to RAG service.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <ViewHeader 
        title="Knowledge Base (RAG)" 
        Icon={Database}
        onMenuClick={onMenuClick || (() => {})}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-5xl mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="flex flex-col gap-4">
            {teamId ? (
              <DocumentUploader teamId={teamId} onUploadSuccess={() => {
                  // Notification handled internally or via secondary hook
              }} />
            ) : (
              <div className="p-4 border border-primary/20 bg-primary/5 rounded-xl text-center text-sm text-primary/50">
                  Waiting for team context...
              </div>
            )}

            <div className="border border-primary/20 bg-primary/5 p-6 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                <h3 className="font-bold flex items-center gap-2 mb-2"><FileText size={16} className="text-secondary" /> Indexed Documents</h3>
                <p className="text-sm text-primary/60 mb-3">All files uploaded here are securely vectorized and stored in a Pinecone vector database using Gemini embeddings, scoped exclusively to your team.</p>
            </div>
          </div>

          <div className="flex flex-col border border-primary/20 bg-primary/5 rounded-xl overflow-hidden h-[500px]">
            <div className="bg-background border-b border-primary/10 p-4 shrink-0 flex items-center gap-2">
                <Bot size={18} className="text-secondary" />
                <div className="font-bold text-sm">Ask the Knowledge Base</div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto text-sm">
                {answer ? (
                    <div className="bg-secondary/10 border border-secondary/20 p-4 rounded-lg text-text leading-relaxed prose prose-sm prose-invert max-w-none">
                      {answer}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <Search size={32} className="mb-4 text-primary/30" />
                      <p className="max-w-[250px] mb-6 text-primary/50">Ask a question and the AI will consult your uploaded documents to find the answer.</p>
                      
                      <div className="flex flex-col gap-2 w-full max-w-sm">
                        <button onClick={() => setQuery("What is our vacation policy?")} className="px-3 py-2 text-xs font-bold border border-primary/20 text-primary/70 hover:text-secondary hover:border-secondary/50 rounded-lg text-left transition-colors flex items-center gap-2 pr-6 relative group overflow-hidden">
                           <Bot size={14} className="opacity-50" /> What is our vacation policy?
                        </button>
                        <button onClick={() => setQuery("What are our Q3 marketing goals?")} className="px-3 py-2 text-xs font-bold border border-primary/20 text-primary/70 hover:text-secondary hover:border-secondary/50 rounded-lg text-left transition-colors flex items-center gap-2 pr-6 relative group overflow-hidden">
                           <Bot size={14} className="opacity-50" /> What are our Q3 marketing goals?
                        </button>
                        <button onClick={() => setQuery("How do I connect to the VPN?")} className="px-3 py-2 text-xs font-bold border border-primary/20 text-primary/70 hover:text-secondary hover:border-secondary/50 rounded-lg text-left transition-colors flex items-center gap-2 pr-6 relative group overflow-hidden">
                           <Bot size={14} className="opacity-50" /> How do I connect to the VPN?
                        </button>
                      </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-background border-t border-primary/10 shrink-0">
                <form onSubmit={handleQuery} className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    disabled={isSearching}
                    placeholder="E.g. What is our vacation policy?"
                    className="w-full bg-primary/5 border border-primary/10 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-secondary transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={!query.trim() || isSearching}
                    className="absolute right-2 top-2 bottom-2 w-8 flex items-center justify-center bg-secondary text-white rounded-full hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSearching ? (
                      <div className="w-3 h-3 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Search size={14} />
                    )}
                  </button>
                </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
