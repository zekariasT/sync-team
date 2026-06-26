'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Video, Plus, MessageSquare, PlayCircle, FileText, X } from 'lucide-react';
import ViewHeader from './ViewHeader';
import VideoRecorder from './VideoRecorder';
import { InitialsAvatar } from './InitialsAvatar';

import { useToast } from './ToastProvider';

interface Reaction {
  id: string;
  timestamp: number;
  comment: string;
  emoji?: string;
  user?: {
    name: string;
  };
}

export interface VideoMessage {
  id: string;
  title: string;
  videoUrl: string;
  transcript: string | null;
  duration: number | null;
  createdAt: string;
  sender: {
    name: string;
    avatar: string | null;
  };
  reactions?: Reaction[];
  tags?: { user: { id: string; name: string; avatar: string | null } }[];
}

export default function VideosView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [videos, setVideos] = useState<VideoMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoMessage | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchVideos();
    } else {
      // No team selected yet — don't hang on the loading spinner forever.
      setLoading(false);
    }
  }, [teamId, user]);

  const fetchVideos = async () => {
    if (!teamId) return;
    const userId = user?.id || 'guest-demo-user';
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/video/teams/${teamId}`, {
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setVideos(await res.json());
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || `Could not load videos (${res.status}).`);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load videos. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUploaded = (newVideo: VideoMessage) => {
    setVideos([newVideo, ...videos]);
    setIsRecording(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <ViewHeader 
        title="Sync Videos" 
        Icon={Video} 
        onMenuClick={onMenuClick || (() => {})}
      >
        <button
          onClick={() => setIsRecording(true)}
          className="flex items-center gap-2 bg-primary hover:bg-[var(--primary-hover)] text-background px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> <span className="hidden sm:inline">New Recording</span>
        </button>
      </ViewHeader>

      <div className="flex-1 overflow-y-auto w-full p-4 md:p-10">
        {isRecording && teamId ? (
          <div className="mb-8 flex justify-center">
            <VideoRecorder teamId={teamId} onClose={() => setIsRecording(false)} onVideoUploaded={handleVideoUploaded} />
          </div>
        ) : selectedVideo ? (
          <div className="mb-8 p-6 bg-muted rounded-xl border border-border flex flex-col xl:flex-row gap-6 shadow-xl relative">
             <div className="flex-1">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <video src={selectedVideo.videoUrl} controls className="w-full h-full object-contain" autoPlay />
                </div>
                <div className="mt-4 flex items-center justify-between">
                   <h3 className="text-xl font-bold">{selectedVideo.title || 'Screen Recording'}</h3>
                   <span className="text-sm font-mono text-muted-foreground">{new Date(selectedVideo.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                   <InitialsAvatar name={selectedVideo.sender.name} className="size-6 rounded-full text-[10px]" />
                   Recorded by <span className="font-semibold text-foreground">{selectedVideo.sender.name}</span>
                </div>
                {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Tagged</span>
                    {selectedVideo.tags.map((t) => (
                      <span key={t.user.id} className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 rounded-full pl-1 pr-2.5 py-0.5 text-xs font-semibold text-brand-text">
                        <InitialsAvatar name={t.user.name} seed={t.user.id} className="size-5 rounded-full text-[9px]" />
                        {t.user.name}
                      </span>
                    ))}
                  </div>
                )}
             </div>

             <div className="w-full xl:w-96 flex flex-col gap-4">
               {/* Transcript */}
               <div className="bg-background rounded-lg border border-border p-4 flex-1 overflow-y-auto max-h-[400px]">
                 <h4 className="font-bold text-sm text-brand-text mb-3 flex items-center gap-2"><FileText size={16}/> Auto-Transcript</h4>
                 {selectedVideo.transcript ? (
                   <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedVideo.transcript}</p>
                 ) : (
                   <p className="text-muted-foreground text-sm italic">No transcript available.</p>
                 )}
               </div>
               
               {/* Reactions area */}
               <div className="bg-background rounded-lg border border-border p-4 flex-1 flex flex-col">
                 <h4 className="font-bold text-sm mb-3 text-foreground">Reactions</h4>
                 <div className="flex-1 overflow-y-auto mb-3 space-y-2 max-h-[200px]">
                   {selectedVideo.reactions?.map((reaction) => (
                     <div key={reaction.id} className="text-xs flex items-start gap-2 bg-muted p-2 rounded relative group cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            const v = document.querySelector('video');
                            if (v) v.currentTime = reaction.timestamp;
                          }}>
                       <div className="font-mono text-brand-text shrink-0 pt-0.5" title="Click to jump to time">
                         {Math.floor(reaction.timestamp / 60)}:{(Math.floor(reaction.timestamp) % 60).toString().padStart(2, '0')}
                       </div>
                       <div className="flex-1">
                         <span className="font-bold text-foreground mr-1">{reaction.user?.name || 'User'}:</span>
                         {reaction.emoji && <span className="mr-1">{reaction.emoji}</span>}
                         <span className="text-foreground/80">{reaction.comment}</span>
                       </div>
                     </div>
                   ))}
                   {!selectedVideo.reactions?.length && (
                     <div className="text-muted-foreground text-xs italic">No reactions yet. Be the first!</div>
                   )}
                 </div>
                 
                 <form className="flex gap-2" onSubmit={async (e) => {
                   e.preventDefault();
                   const form = e.target as HTMLFormElement;
                   const comment = (form.elements.namedItem('comment') as HTMLInputElement).value;
                   if (!comment.trim()) return;
                   
                   const videoEl = document.querySelector('video');
                   const timestamp = videoEl ? videoEl.currentTime : 0;
                   const userId = user?.id || '';
                   const token = await getToken();
                   try {
                     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/video/${selectedVideo.id}/reactions`, {
                       method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-user-id': userId,
                          'Authorization': `Bearer ${token}`,
                        },
                       body: JSON.stringify({ userId, timestamp, comment })
                     });
                     if (res.ok) {
                       const savedReaction = await res.json();
                       // Optimistically update the open video...
                       setSelectedVideo(prev => {
                         if (!prev) return prev;
                         return { ...prev, reactions: [...(prev.reactions || []), savedReaction] };
                       });
                       // ...and the backing list, so closing + reopening the card
                       // (which re-selects from `videos`) keeps the new reaction.
                       setVideos(prev => prev.map(v =>
                         v.id === selectedVideo.id
                           ? { ...v, reactions: [...(v.reactions || []), savedReaction] }
                           : v));
                       form.reset();
                     }
                   } catch(err) { console.error('Add reaction failed', err); }
                 }}>
                   <input type="text" name="comment" placeholder="Add a comment at current time..." className="bg-transparent border border-border rounded px-2 text-sm flex-1 focus:outline-none focus:border-brand" />
                   <button type="submit" className="bg-primary text-white p-1.5 rounded"><MessageSquare size={14} /></button>
                 </form>
               </div>
             </div>
             
             <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 bg-background/80 hover:bg-background text-foreground p-2 rounded-full border border-border backdrop-blur-md transition-colors z-10 shadow-sm">
               <X size={18} />
             </button>
          </div>
        ) : null}

        {!isRecording && !selectedVideo && (
          <>
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-2 border-border border-t-secondary rounded-full animate-spin" />
              </div>
            ) : !teamId ? (
              <div className="text-center py-20 bg-muted rounded-xl border border-border border-dashed">
                <Video size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2">No team selected</h3>
                <p className="text-sm text-muted-foreground">Pick a team from the sidebar to see its sync videos.</p>
              </div>
            ) : error ? (
              <div className="text-center py-20 bg-destructive/10 rounded-xl border border-destructive/20 border-dashed">
                <Video size={48} className="mx-auto text-destructive/40 mb-4 opacity-60" />
                <h3 className="text-lg font-bold text-destructive mb-2">Couldn&apos;t load videos</h3>
                <p className="text-sm text-destructive/70 max-w-md mx-auto">{error}</p>
                <button
                  onClick={() => { setLoading(true); fetchVideos(); }}
                  className="mt-6 font-bold text-brand-text text-sm hover:underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20 bg-muted rounded-xl border border-border border-dashed">
                <Video size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2">No videos yet</h3>
                <p className="text-sm text-muted-foreground">Record a quick update to share with your team asynchronously.</p>
                <button
                  onClick={() => setIsRecording(true)}
                  className="mt-6 font-bold text-brand-text text-sm hover:underline cursor-pointer"
                >
                  Start Recording
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="lift-card bg-muted border border-border rounded-xl overflow-hidden cursor-pointer group flex flex-col"
                  >
                    <div className="aspect-video bg-black relative group flex items-center justify-center">
                       {/* Use the video component but pause it to act as thumbnail */}
                       <video src={video.videoUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" preload="metadata" />
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <PlayCircle size={48} className="text-white/80 drop-shadow-lg group-hover:scale-110 transition-transform" />
                       </div>
                       <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-white text-xs font-mono">
                          {video.duration ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}` : 'Video'}
                       </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-foreground truncate mb-1" title={video.title || 'Screen Recording'}>{video.title || 'Screen Recording'}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-muted-foreground">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <InitialsAvatar name={video.sender.name} className="size-6 rounded-full text-[10px]" />
                        <span className="text-xs font-semibold text-foreground truncate">{video.sender.name}</span>
                        {video.tags && video.tags.length > 0 && (
                          <div className="ml-auto flex items-center -space-x-1.5" title={`Tagged: ${video.tags.map(t => t.user.name).join(', ')}`}>
                            {video.tags.slice(0, 3).map((t) => (
                              <InitialsAvatar key={t.user.id} name={t.user.name} seed={t.user.id} className="size-5 rounded-full text-[9px] ring-2 ring-background" />
                            ))}
                            {video.tags.length > 3 && (
                              <span className="w-5 h-5 rounded-full bg-muted ring-2 ring-background flex items-center justify-center shrink-0 text-[9px] font-bold text-muted-foreground">+{video.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
