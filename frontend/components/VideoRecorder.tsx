'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Video, Mic, StopCircle, X, CheckSquare, RefreshCcw, Camera, Monitor, AlertTriangle, Users, Check } from 'lucide-react';

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
  const { getToken } = useAuth();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<RecordingMode>(isMobileDevice() ? 'camera' : 'screen');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  // Teammate tagging
  const [members, setMembers] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Raw source streams (screen + mic) and the AudioContext used to mix their
  // audio. The mixed track lives in `previewStream`; these underlying sources
  // aren't in it, so we track them here to tear them down on stop/unmount.
  const rawStreamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Separate context + RAF loop driving the live mic-level meter.
  const meterCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const isMobile = isMobileDevice();

  // Memoized so re-renders (e.g. typing in the title field) don't generate a
  // new blob URL each time — that was reassigning the <video> src on every
  // keystroke, forcing it to reload from scratch.
  const recordedVideoUrl = useMemo(() => {
    if (recordedChunks.length === 0) return null;
    return URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' }));
  }, [recordedChunks]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    };
  }, [recordedVideoUrl]);

  const teardownSources = useCallback(() => {
    rawStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    rawStreamsRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (meterCtxRef.current) {
      meterCtxRef.current.close().catch(() => {});
      meterCtxRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Drive the live audio meter from whatever audio track ends up in the
  // recorded stream — lets the user confirm sound is being captured before
  // they trust the recording.
  const startMeter = useCallback((stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setAudioLevel(0);
      return;
    }
    const ctx = new AudioContext();
    meterCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(new MediaStream(audioTracks));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setAudioLevel(Math.min(1, rms * 3)); // scale up so normal speech reads well
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  // Unmount-only cleanup. This intentionally has an empty dep array: if
  // `previewStream` were a dependency, React would fire this teardown on the
  // null→stream transition (the moment recording starts) and immediately stop
  // the live screen/mic streams. teardownSources() stops every track (the
  // screen video track lives in a raw source stream, and the mixed audio track
  // dies with the AudioContext), so it covers previewStream too.
  useEffect(() => {
    return () => teardownSources();
  }, [teardownSources]);

  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Load this team's members so the recorder can tag teammates. Excludes self.
  useEffect(() => {
    if (!teamId) return;
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}`, {
          headers: { 'x-user-id': user?.id || 'guest-demo-user', 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok || !active) return;
        const team = await res.json();
        const list = (team?.members ?? [])
          .map((m: any) => m.user)
          .filter((u: any) => u && u.id !== user?.id)
          .map((u: any) => ({ id: u.id, name: u.name, avatar: u.avatar ?? null }));
        setMembers(list);
      } catch {
        // tagging is optional — silently degrade if members can't be loaded
      }
    })();
    return () => { active = false; };
  }, [teamId, user?.id, getToken]);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const startRecording = async () => {
    setError(null);
    try {
      let combinedStream: MediaStream;

      if (mode === 'screen') {
        let screenStream: MediaStream;
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
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
        rawStreamsRef.current.push(screenStream);

        // Also capture microphone audio. If this fails (e.g. OBS or another
        // app has the mic open), warn loudly rather than silently recording
        // a muted video.
        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          rawStreamsRef.current.push(micStream);
        } catch (micErr: any) {
          setError(
            'Microphone unavailable — another app (e.g. OBS) may be holding it. ' +
            'Recording will continue with system/tab audio only. Close the other app and retry for mic audio.'
          );
        }

        // MediaRecorder only encodes ONE audio track, so we mix every available
        // audio source (screen/system audio + mic) into a single track via the
        // Web Audio API before handing it to the recorder.
        const audioSources = [screenStream, micStream]
          .filter((s): s is MediaStream => !!s && s.getAudioTracks().length > 0);

        const videoTracks = screenStream.getVideoTracks();
        let audioTracks: MediaStreamTrack[] = [];

        if (audioSources.length === 1) {
          // Single source — no mixing needed, use its track directly.
          audioTracks = audioSources[0].getAudioTracks();
        } else if (audioSources.length > 1) {
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const destination = audioCtx.createMediaStreamDestination();
          audioSources.forEach((s) => {
            audioCtx.createMediaStreamSource(s).connect(destination);
          });
          audioTracks = destination.stream.getAudioTracks();
        }

        if (audioTracks.length === 0) {
          setError(
            'No audio source available — neither system audio nor microphone could be captured. ' +
            'Tip: when choosing what to share, tick "Share system/tab audio", and make sure no other app is using your mic.'
          );
        }

        combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
      } else {
        // Camera mode — works on mobile
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        });
        rawStreamsRef.current.push(cameraStream);
        combinedStream = cameraStream;
      }

      setPreviewStream(combinedStream);
      startMeter(combinedStream);

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
        teardownSources();
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
    formData.append('taggedUserIds', JSON.stringify(selectedTagIds));

    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/video/teams/${teamId}/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const video = await res.json();
        setVideoUrl(video.videoUrl);
        if (onVideoUploaded) onVideoUploaded(video);
      } else {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.message ? `Upload failed: ${errBody.message}` : 'Upload failed. Please try again.');
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
    setSelectedTagIds([]);
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
        {!recording && recordedChunks.length > 0 && !previewStream && recordedVideoUrl && (
          <video
            src={recordedVideoUrl}
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

        {/* Live mic/audio level meter — confirms sound is being captured */}
        {recording && (
          <div className="flex items-center gap-2" title="Live audio level">
            <Mic size={14} className={audioLevel > 0.02 ? 'text-secondary' : 'text-primary/40'} />
            <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-75 ${audioLevel > 0.02 ? 'bg-secondary' : 'bg-primary/30'}`}
                style={{ width: `${Math.round(audioLevel * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono w-16 shrink-0 text-right text-primary/50">
              {audioLevel > 0.02 ? 'audio ok' : 'silent'}
            </span>
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

        {/* Tag teammates — they get a notification when this video is shared */}
        {recordedChunks.length > 0 && !recording && !videoUrl && members.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary/60">
              <Users size={13} /> Tag teammates
              {selectedTagIds.length > 0 && (
                <span className="text-secondary">· {selectedTagIds.length} selected</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const selected = selectedTagIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleTag(m.id)}
                    className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-xs font-semibold transition-all ${
                      selected
                        ? 'bg-secondary/15 border-secondary/40 text-secondary'
                        : 'bg-background border-primary/15 text-primary/60 hover:border-primary/30 hover:text-text'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                      {m.avatar
                        ? <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[10px] font-bold">{m.name.charAt(0)}</span>}
                    </span>
                    {m.name}
                    {selected && <Check size={12} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
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
