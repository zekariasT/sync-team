'use client';

import { useState, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Upload, X } from 'lucide-react';
import { useToast } from './ToastProvider';

interface DocumentUploaderProps {
  teamId: string;
  onUploadSuccess: () => void;
  editingDocId?: string | null;
  onCancelEdit?: () => void;
}

export default function DocumentUploader({ teamId, onUploadSuccess, editingDocId, onCancelEdit }: DocumentUploaderProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { success, error: toastError } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Counter-based approach: the ONLY reliable cross-browser way to handle
  // dragLeave vs child-element transitions. Incremented on enter, decremented
  // on leave. Drop zone is "active" when count > 0.
  const dragCounterRef = useRef(0);

  const handleFile = async (file: File) => {
    const allowedExtensions = ['.pdf', '.txt', '.md', '.csv', '.json'];
    const isAllowedType = file.type === 'application/pdf' || file.type === 'text/plain' || file.type === 'text/markdown';
    const isAllowedExt = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isAllowedType && !isAllowedExt) {
      setError('Only PDF and Text files (pdf, txt, md) are supported.');
      return;
    }

    if (!teamId) {
      setError('No active team context.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaderId', user?.id || 'guest-demo-user');

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://syncpoint-backend.onrender.com';
      const url = editingDocId
        ? `${baseUrl}/teams/${teamId}/kb/documents/${editingDocId}`
        : `${baseUrl}/teams/${teamId}/kb/documents`;

      const res = await fetch(url, {
        method: editingDocId ? 'PATCH' : 'POST',
        headers: {
          'x-user-id': user?.id || 'guest-demo-user',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      success(editingDocId ? 'Document updated successfully' : 'Document embedded successfully');
      if (onCancelEdit) onCancelEdit();
      onUploadSuccess();
    } catch (err: any) {
      toastError(err.message || 'Upload failed');
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocalPath = async (localPath: string) => {
    if (!teamId) { setError('No active team context.'); return; }
    setIsUploading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/upload-from-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filePath: localPath,
          teamId,
          uploaderId: user?.id || 'guest-demo-user',
          editingDocId: editingDocId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || err.message || 'Upload failed');
      }
      success(editingDocId ? 'Document updated successfully' : 'Document embedded successfully');
      if (onCancelEdit) onCancelEdit();
      onUploadSuccess();
    } catch (err: any) {
      toastError(err.message || 'Upload failed');
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragActive(false);

    // Primary: dataTransfer.files (standard OS file drag)
    let file = e.dataTransfer.files?.[0];

    // Fallback: dataTransfer.items
    if (!file && e.dataTransfer.items?.length > 0) {
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) file = f;
      }
    }

    if (file) {
      handleFile(file);
      return;
    }

    // Wayland/Linux fallback: file manager sends path via text/plain instead of file bytes
    const rawPath = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/x-moz-url');
    const localPath = rawPath?.split('\n')[0]?.trim();

    if (localPath && (localPath.startsWith('/') || localPath.startsWith('file://'))) {
      handleLocalPath(localPath);
      return;
    }

    setError('No file detected. Try using the Browse Files button instead.');
  };

  return (
    <div className="w-full">
      <div
        className={`w-full border-2 border-dashed rounded-xl p-8 transition-all duration-150 flex flex-col items-center justify-center text-center ${
          dragActive
            ? 'border-secondary bg-secondary/10 scale-[1.01]'
            : 'border-primary/20 bg-primary/5 hover:border-primary/40'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 rounded-full bg-background border border-primary/20 flex items-center justify-center text-secondary mb-4 shadow-sm">
          {isUploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-secondary" />
          ) : (
            <Upload size={28} className={dragActive ? 'scale-110 transition-transform' : ''} />
          )}
        </div>

        <h3 className="text-lg font-bold text-text mb-1">
          {editingDocId ? 'Drop to Re-upload & Update' : 'Drag & Drop Document Here'}
        </h3>
        <p className="text-sm text-primary/50 mb-6 max-w-sm">
          {editingDocId
            ? 'Upload a new version. The AI will instantly replace the knowledge vector.'
            : 'Upload PDFs or Text files. The AI will embed and atomically index the document.'}
        </p>

        <div className="flex gap-2">
          <label className="cursor-pointer bg-secondary text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-secondary/90 transition-colors">
            Browse Files
            <input
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
          </label>
          {editingDocId && onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="bg-primary/10 text-text px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
            >
              Cancel Update
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 text-red-500 text-sm font-semibold flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full">
            <X size={14} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
