'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Video, Plus, MessageSquare, PlayCircle, FileText, X } from 'lucide-react';
import ViewHeader from './ViewHeader';
import VideoRecorder from './VideoRecorder';

import { useToast } from './ToastProvider';

interface VideoMessage {
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
}

export default function VideosView({ teamId: initialTeamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const [teamId, setTeamId] = useState<string | null>(initialTeamId || null);
  const [videos, setVideos] = useState<VideoMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoMessage | null>(null);

  useEffect(() => {
    if (!teamId) {
      // Fetch teams first
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/teams`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setTeamId(data[0].id);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    } else {
      fetchVideos();
    }
  }, [teamId, user]);

  const fetchVideos = async () => {
    if (!teamId || !user) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/video/teams/${teamId}`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        setVideos(await res.json());
      }
    } catch (err) {
      console.error(err);
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
          className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-background px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
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
          <div className="mb-8 p-6 bg-primary/5 rounded-xl border border-primary/20 flex flex-col xl:flex-row gap-6 shadow-xl relative">
             <div className="flex-1">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <video src={selectedVideo.videoUrl} controls className="w-full h-full object-contain" autoPlay />
                </div>
                <div className="mt-4 flex items-center justify-between">
                   <h3 className="text-xl font-bold">{selectedVideo.title || 'Screen Recording'}</h3>
                   <span className="text-sm font-mono text-primary/50">{new Date(selectedVideo.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-primary/80">
                   <div className="w-6 h-6 rounded-full overflow-hidden bg-primary/20 shrink-0">
                      {selectedVideo.sender.avatar ? <img src={selectedVideo.sender.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{selectedVideo.sender.name.charAt(0)}</div>}
                   </div>
                   Recorded by <span className="font-semibold text-text">{selectedVideo.sender.name}</span>
                </div>
             </div>

             <div className="w-full xl:w-96 flex flex-col gap-4">
               {/* Transcript */}
               <div className="bg-background rounded-lg border border-primary/15 p-4 flex-1 overflow-y-auto max-h-[400px]">
                 <h4 className="font-bold text-sm text-secondary mb-3 flex items-center gap-2"><FileText size={16}/> Auto-Transcript</h4>
                 {selectedVideo.transcript ? (
                   <p className="text-sm text-text/80 leading-relaxed whitespace-pre-wrap">{selectedVideo.transcript}</p>
                 ) : (
                   <p className="text-primary/50 text-sm italic">No transcript available.</p>
                 )}
               </div>
               
               {/* Reactions area */}
               <div className="bg-background rounded-lg border border-primary/15 p-4 flex-1 flex flex-col">
                 <h4 className="font-bold text-sm mb-3 text-text">Reactions</h4>
                 <div className="flex-1 overflow-y-auto mb-3 space-y-2 max-h-[200px]">
                   {(selectedVideo as any).reactions?.map((reaction: any) => (
                     <div key={reaction.id} className="text-xs flex items-start gap-2 bg-primary/5 p-2 rounded relative group cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => {
                            const v = document.querySelector('video');
                            if (v) v.currentTime = reaction.timestamp;
                          }}>
                       <div className="font-mono text-secondary shrink-0 pt-0.5" title="Click to jump to time">
                         {Math.floor(reaction.timestamp / 60)}:{(Math.floor(reaction.timestamp) % 60).toString().padStart(2, '0')}
                       </div>
                       <div className="flex-1">
                         <span className="font-bold text-text mr-1">{reaction.user?.name || 'User'}:</span>
                         {reaction.emoji && <span className="mr-1">{reaction.emoji}</span>}
                         <span className="text-text/80">{reaction.comment}</span>
                       </div>
                     </div>
                   ))}
                   {!(selectedVideo as any).reactions?.length && (
                     <div className="text-primary/50 text-xs italic">No reactions yet. Be the first!</div>
                   )}
                 </div>
                 
                 <form className="flex gap-2" onSubmit={async (e) => {
                   e.preventDefault();
                   const form = e.target as HTMLFormElement;
                   const comment = (form.elements.namedItem('comment') as HTMLInputElement).value;
                   if (!comment.trim() || !user) return;
                   
                   const videoEl = document.querySelector('video');
                   const timestamp = videoEl ? videoEl.currentTime : 0;
                   
                   try {
                     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/video/${selectedVideo.id}/reactions`, {
                       method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-user-id': user.id
                        },
                       body: JSON.stringify({ userId: user.id, timestamp, comment })
                     });
                     if (res.ok) {
                       const savedReaction = await res.json();
                       // Optimistically update
                       setSelectedVideo(prev => {
                         if (!prev) return prev;
                         return { ...prev, reactions: [...((prev as any).reactions || []), savedReaction] };
                       });
                       form.reset();
                     }
                   } catch(err) { console.error('Add reaction failed', err); }
                 }}>
                   <input type="text" name="comment" placeholder="Add a comment at current time..." className="bg-transparent border border-primary/20 rounded px-2 text-sm flex-1 focus:outline-none focus:border-secondary" />
                   <button type="submit" className="bg-secondary text-white p-1.5 rounded"><MessageSquare size={14} /></button>
                 </form>
               </div>
             </div>
             
             <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 bg-background/80 hover:bg-background text-text p-2 rounded-full border border-primary/20 backdrop-blur-md transition-colors z-10 shadow-sm">
               <X size={18} />
             </button>
          </div>
        ) : null}

        {!isRecording && !selectedVideo && (
          <>
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-secondary rounded-full animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20 bg-primary/5 rounded-xl border border-primary/15 border-dashed">
                <Video size={48} className="mx-auto text-primary/30 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-text mb-2">No videos yet</h3>
                <p className="text-sm text-primary/50">Record a quick update to share with your team asynchronously.</p>
                <button
                  onClick={() => setIsRecording(true)}
                  className="mt-6 font-bold text-secondary text-sm hover:underline"
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
                    className="bg-primary/5 border border-primary/15 rounded-xl overflow-hidden hover:border-secondary hover:shadow-[0_4px_20px_rgba(25,108,138,0.15)] transition-all cursor-pointer group flex flex-col"
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
                        <h3 className="font-bold text-text truncate mb-1" title={video.title || 'Screen Recording'}>{video.title || 'Screen Recording'}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-primary/50">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary/20">
                          {video.sender.avatar ? (
                            <img src={video.sender.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-secondary font-bold text-xs">{video.sender.name.charAt(0)}</div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-text truncate">{video.sender.name}</span>
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
