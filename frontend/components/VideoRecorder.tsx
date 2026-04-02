'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Video, Mic, StopCircle, X, CheckSquare, RefreshCcw } from 'lucide-react';

interface VideoRecorderProps {
  teamId: string;
  onVideoUploaded?: (videoMessage: any) => void;
  onClose?: () => void;
}

export default function VideoRecorder({ teamId, onVideoUploaded, onClose }: VideoRecorderProps) {
  const { user } = useUser();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [title, setTitle] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup streams on unmount
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewStream]);

  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const startRecording = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true // capture system auth if supported
      });

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // Combine streams
      const tracks = [...screenStream.getTracks(), ...audioStream.getAudioTracks()];
      const combinedStream = new MediaStream(tracks);
      setPreviewStream(combinedStream);

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm'
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks((prev) => [...prev, e.data]);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        combinedStream.getTracks().forEach((track) => track.stop());
        setPreviewStream(null);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadVideo = async () => {
    if (recordedChunks.length === 0 || !user) return;
    setUploading(true);

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('senderId', user.id);
    formData.append('title', title || 'Screen Recording');

    try {
      const res = await fetch(`http://localhost:3001/video/teams/${teamId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const video = await res.json();
        setVideoUrl(video.videoUrl);
        if (onVideoUploaded) onVideoUploaded(video);
      }
    } catch (err) {
      console.error('Error uploading video:', err);
    } finally {
      setUploading(false);
    }
  };

  const retry = () => {
    setRecordedChunks([]);
    setVideoUrl(null);
    setPreviewStream(null);
  };

  return (
    <div className="bg-background border border-primary/20 rounded-xl overflow-hidden shadow-2xl flex flex-col w-full max-w-2xl">
      <div className="flex justify-between items-center p-4 border-b border-primary/10">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Video size={16} /> Record Sync Point
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-primary/50 hover:text-text transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 bg-black relative min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Live Preview / Recording View */}
        {(recording || previewStream) && (
          <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
        )}

        {/* Playback View */}
        {!recording && recordedChunks.length > 0 && !previewStream && (
          <video
            src={URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' }))}
            controls
            className="w-full h-full object-contain bg-black"
          />
        )}

        {/* Initial View */}
        {!recording && recordedChunks.length === 0 && !previewStream && (
          <div className="text-center text-primary">
            <Video size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm opacity-80">Click start to record your screen and microphone.</p>
          </div>
        )}

        {/* Recording Indicator */}
        {recording && (
          <div className="absolute top-4 right-4 bg-accent text-white text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-2 font-bold shadow-[0_0_10px_rgba(157,21,21,0.5)]">
            <div className="w-2 h-2 bg-white rounded-full" /> RECORDING
          </div>
        )}
      </div>

      <div className="p-4 bg-primary/5 flex flex-col gap-3">
        {recordedChunks.length > 0 && !recording && !videoUrl && (
          <input
            type="text"
            placeholder="Recording Title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background border border-primary/20 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-secondary transition-colors"
          />
        )}

        <div className="flex justify-center gap-3">
          {!recording && recordedChunks.length === 0 && !videoUrl && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white px-5 py-2.5 rounded-lg font-bold transition-colors"
            >
              <Mic size={18} /> Start Recording
            </button>
          )}

          {recording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-white text-accent hover:bg-gray-100 px-5 py-2.5 rounded-lg font-bold transition-colors"
            >
              <StopCircle size={18} /> Stop
            </button>
          )}

          {!recording && recordedChunks.length > 0 && !videoUrl && (
            <>
              <button
                onClick={retry}
                className="flex items-center gap-2 bg-background border border-primary/20 hover:bg-primary/5 text-text px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm"
              >
                <RefreshCcw size={18} /> Retry
              </button>
              <button
                onClick={uploadVideo}
                disabled={uploading}
                className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-5 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 shadow-sm shadow-secondary/20"
              >
                {uploading ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <CheckSquare size={18} />}
                {uploading ? 'Uploading...' : 'Save & Share'}
              </button>
            </>
          )}

          {videoUrl && (
            <div className="w-full text-center">
              <p className="text-secondary font-bold text-sm mb-2">✅ Video saved successfully!</p>
              <input
                type="text"
                readOnly
                value={videoUrl}
                className="w-full text-xs text-center p-2 rounded bg-background border border-primary/20"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
