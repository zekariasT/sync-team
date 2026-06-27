'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useUser, useAuth } from '@clerk/nextjs';
import { Database, Search, Bot, FileText, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';
import ViewHeader from './ViewHeader';
import DocumentUploader from './DocumentUploader';
import { useTeamRole } from '../hooks/useTeamRole';

export default function KnowledgeBaseView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { success, error: toastError } = useToast();
  const { isAdmin } = useTeamRole(teamId);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!teamId) return;
    setIsLoadingDocs(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}/kb/documents`, {
        headers: { 'x-user-id': user?.id || 'guest-demo-user', 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDocuments(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [teamId]);

  // Realtime: join this team's socket room so we hear when the ai-worker finishes
  // indexing (core-api relays it: RabbitMQ → worker → Redis → WebSocket → here).
  useEffect(() => {
    if (!teamId) return;
    let socket: ReturnType<typeof io> | undefined;
    let active = true;

    (async () => {
      // The backend verifies this token and only lets members join the team room.
      const token = await getToken().catch(() => null);
      if (!active) return;

      socket = io(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}`, {
        auth: { token },
      });
      socket.emit('joinTeam', teamId);

      socket.on('kb:indexed', (data: { documentId: string; title?: string; chunks?: number }) => {
        console.log('KB indexed (live):', data);
        success(`"${data.title ?? 'Document'}" is now searchable — ${data.chunks ?? 0} chunks indexed`);
        fetchDocuments();
      });

      socket.on('document.removed', () => fetchDocuments());
    })();

    return () => { active = false; socket?.disconnect(); };
  }, [teamId]);

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Delete this document? The AI will instantly forget its contents.')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}/kb/documents/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || 'guest-demo-user', 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
         fetchDocuments();
         if (editingDocId === id) setEditingDocId(null);
         success('Document deleted natively and RAG sync event emitted');
      } else {
         toastError('Failed to delete document');
      }
    } catch (e) {
      toastError('Failed to delete document');
    }
  };

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
              isAdmin ? (
                <DocumentUploader
                  teamId={teamId}
                  editingDocId={editingDocId}
                  onCancelEdit={() => setEditingDocId(null)}
                  onUploadSuccess={() => {
                    fetchDocuments();
                    setEditingDocId(null);
                  }}
                />
              ) : (
                <div className="p-4 border border-border bg-muted rounded-xl text-center text-sm text-muted-foreground">
                    Only team admins can add or manage documents. You can still ask questions below.
                </div>
              )
            ) : (
              <div className="p-4 border border-border bg-muted rounded-xl text-center text-sm text-muted-foreground">
                  Waiting for team context...
              </div>
            )}

            <div className="border border-border bg-muted p-6 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                <h3 className="font-bold flex items-center gap-2 mb-2"><FileText size={16} className="text-brand-text" /> Indexed Documents</h3>
                <p className="text-sm text-muted-foreground mb-3">All files uploaded here are securely vectorized and stored in a Pinecone vector database. They are exactly 1:1 mapped to your uploaded documents.</p>
                
                {isLoadingDocs ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : documents.length > 0 ? (
                  <div className="flex flex-col gap-2 mt-4 relative z-10">
                    {documents.map(doc => (
                      <div key={doc.id} className="lift-card flex items-center justify-between bg-background border border-border rounded-lg p-3">
                        <div className="flex flex-col truncate min-w-0 pr-4">
                          <span className="text-sm font-bold truncate text-foreground">{doc.title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setEditingDocId(doc.id)}
                              className="p-1.5 text-muted-foreground hover:text-brand-text hover:bg-brand/10 rounded-md transition-all"
                              title="Update Document"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                              title="Atomic Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg bg-background/50">No documents indexed yet.</div>
                )}
            </div>
          </div>

          <div className="flex flex-col border border-border bg-muted rounded-xl overflow-hidden h-[500px]">
            <div className="bg-background border-b border-border p-4 shrink-0 flex items-center gap-2">
                <Bot size={18} className="text-brand-text" />
                <div className="font-bold text-sm">Ask the Knowledge Base</div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto text-sm">
                {answer ? (
                    <div className="bg-brand/10 border border-brand/20 p-4 rounded-lg text-foreground leading-relaxed prose prose-sm prose-invert max-w-none">
                      {answer}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <Search size={32} className="mb-4 text-muted-foreground" />
                      <p className="max-w-[250px] mb-6 text-muted-foreground">Ask a question and the AI will consult your uploaded documents to find the answer.</p>
                      
                      <div className="flex flex-col gap-2 w-full max-w-sm">
                        <button onClick={() => setQuery("What is our vacation policy?")} className="px-3 py-2 text-xs font-bold border border-border text-muted-foreground hover:text-brand-text hover:border-brand/50 rounded-lg text-left transition-colors flex items-center gap-2 pr-6 relative group overflow-hidden">
                           <Bot size={14} className="opacity-50" /> What is our vacation policy?
                        </button>
                        <button onClick={() => setQuery("What are our Q3 marketing goals?")} className="px-3 py-2 text-xs font-bold border border-border text-muted-foreground hover:text-brand-text hover:border-brand/50 rounded-lg text-left transition-colors flex items-center gap-2 pr-6 relative group overflow-hidden">
                           <Bot size={14} className="opacity-50" /> What are our Q3 marketing goals?
                        </button>
                        <button onClick={() => setQuery("How do I connect to the VPN?")} className="px-3 py-2 text-xs font-bold border border-border text-muted-foreground hover:text-brand-text hover:border-brand/50 rounded-lg text-left transition-colors flex items-center gap-2 pr-6 relative group overflow-hidden">
                           <Bot size={14} className="opacity-50" /> How do I connect to the VPN?
                        </button>
                      </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-background border-t border-border shrink-0">
                <form onSubmit={handleQuery} className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    disabled={isSearching}
                    placeholder="E.g. What is our vacation policy?"
                    className="w-full bg-muted border border-border rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-brand transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={!query.trim() || isSearching}
                    className="absolute right-2 top-2 bottom-2 w-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
