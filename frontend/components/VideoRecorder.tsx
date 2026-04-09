'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Video, Mic, StopCircle, X, CheckSquare, RefreshCcw, Camera, Monitor, AlertTriangle } from 'lucide-react';

import { VideoMessage } from './VideosView';

interface VideoRecorderProps {
  teamId: string;
  onVideoUploaded?: (videoMessage: VideoMessage) => void;
  onClose?: () => void;
}

/**
 * Detect if the current device is likely a mobile/tablet.
 * getDisplayMedia is unsupported on mobile browsers,
 * so we fall back to camera recording.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

type RecordingMode = 'screen' | 'camera';

export default function VideoRecorder({ teamId, onVideoUploaded, onClose }: VideoRecorderProps) {
  const { user } = useUser();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<RecordingMode>(isMobileDevice() ? 'camera' : 'screen');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isMobile = isMobileDevice();

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
    setError(null);
    try {
      let combinedStream: MediaStream;

      if (mode === 'screen') {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          // Also capture microphone audio
          let audioTracks: MediaStreamTrack[] = [];
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            audioTracks = audioStream.getAudioTracks();
          } catch {
            // Mic denied — proceed with screen audio only
          }

          const tracks = [...screenStream.getTracks(), ...audioTracks];
          combinedStream = new MediaStream(tracks);
        } catch (screenErr: any) {
          // If screen sharing failed (e.g., mobile browser), auto-fallback to camera
          if (screenErr.name === 'NotAllowedError') {
            setError('Screen sharing permission denied. Try camera mode instead.');
            return;
          }
          // Truly unsupported — switch to camera mode
          setMode('camera');
          setError('Screen sharing is not supported on this device. Switched to camera mode — tap start again.');
          return;
        }
      } else {
        // Camera mode — works on mobile
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        });
        combinedStream = cameraStream;
      }

      setPreviewStream(combinedStream);

      // Choose a supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType });

      const chunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        combinedStream.getTracks().forEach((track) => track.stop());
        setPreviewStream(null);
        setRecordedChunks(chunks);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Could not start recording. Please check permissions.');
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
    setError(null);

    const userId = user.id;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('senderId', userId);
    formData.append('title', title || 'Screen Recording');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/video/teams/${teamId}/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': userId
        },
        body: formData,
      });

      if (res.ok) {
        const video = await res.json();
        setVideoUrl(video.videoUrl);
        if (onVideoUploaded) onVideoUploaded(video);
      } else {
        setError('Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Error uploading video:', err);
      setError('Upload failed. Please check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const retry = () => {
    setRecordedChunks([]);
    setVideoUrl(null);
    setPreviewStream(null);
    setError(null);
  };

  return (
    <div className="bg-background border border-primary/20 rounded-xl overflow-hidden shadow-2xl flex flex-col w-full max-w-2xl">
      <div className="flex justify-between items-center p-4 border-b border-primary/10">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Video size={16} /> Record Sync Point
        </h3>
        <div className="flex items-center gap-2">
          {/* Mode toggle — only show when not recording and no recording captured */}
          {!recording && recordedChunks.length === 0 && !videoUrl && (
            <div className="flex items-center gap-1 bg-primary/5 border border-primary/15 rounded-lg p-0.5">
              <button
                onClick={() => { setMode('screen'); setError(null); }}
                disabled={isMobile}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  mode === 'screen'
                    ? 'bg-secondary text-background shadow-sm'
                    : 'text-primary/50 hover:text-text'
                } ${isMobile ? 'opacity-30 cursor-not-allowed' : ''}`}
                title={isMobile ? 'Screen recording is not supported on this device' : 'Record your screen'}
              >
                <Monitor size={12} /> Screen
              </button>
              <button
                onClick={() => { setMode('camera'); setError(null); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  mode === 'camera'
                    ? 'bg-secondary text-background shadow-sm'
                    : 'text-primary/50 hover:text-text'
                }`}
                title="Record from camera"
              >
                <Camera size={12} /> Camera
              </button>
            </div>
          )}
          {onClose && (
            <button onClick={onClose} className="text-primary/50 hover:text-text transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-black relative min-h-[220px] sm:min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Live Preview / Recording View */}
        {(recording || previewStream) && (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
        )}

        {/* Playback View */}
        {!recording && recordedChunks.length > 0 && !previewStream && (
          <video
            src={URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' }))}
            controls
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        )}

        {/* Initial View */}
        {!recording && recordedChunks.length === 0 && !previewStream && (
          <div className="text-center text-primary px-4">
            {mode === 'camera' ? (
              <>
                <Camera size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm opacity-80">Click start to record from your camera and microphone.</p>
              </>
            ) : (
              <>
                <Video size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm opacity-80">Click start to record your screen and microphone.</p>
              </>
            )}
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
        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 text-xs text-accent">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {recordedChunks.length > 0 && !recording && !videoUrl && (
          <input
            type="text"
            placeholder="Recording Title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background border border-primary/20 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-secondary transition-colors"
          />
        )}

        <div className="flex justify-center gap-3 flex-wrap">
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
