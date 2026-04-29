'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import { useToast } from './ToastProvider';

interface DocumentUploaderProps {
  teamId: string;
  onUploadSuccess: () => void;
  editingDocId?: string | null;
  onCancelEdit?: () => void;
}

export default function DocumentUploader({ teamId, onUploadSuccess, editingDocId, onCancelEdit }: DocumentUploaderProps) {
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
      setError('Only PDF and Text files are supported right now.');
      return;
    }

    if (!teamId) {
      setError('No active team context.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaderId', user?.id || 'guest-demo-user');

      const url = editingDocId 
        ? `${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}/kb/documents/${editingDocId}`
        : `${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}/kb/documents`;

      const res = await fetch(url, {
        method: editingDocId ? 'PATCH' : 'POST',
        headers: { 'x-user-id': user?.id || 'guest-demo-user' },
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

  return (
    <div className="w-full">
      <div 
        className={`w-full border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center ${
          dragActive ? 'border-secondary bg-secondary/5' : 'border-primary/20 bg-primary/5 hover:border-primary/40'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <div className="w-16 h-16 rounded-full bg-background border border-primary/20 flex items-center justify-center text-secondary mb-4 shadow-sm">
          {isUploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-secondary"></div>
          ) : (
            <Upload size={28} />
          )}
        </div>
        <h3 className="text-lg font-bold text-text mb-1 flex items-center justify-center gap-2">
          {editingDocId ? 'Drop to Re-upload & Update' : 'Drag & Drop Document Here'}
        </h3>
        <p className="text-sm text-primary/50 mb-6 max-w-sm">
          {editingDocId 
            ? 'Upload a new version. The AI will instantly replace the knowledge vector.'
            : 'Upload PDFs or Text files. The AI will embed and atomically index the single document.'}
        </p>

        <div className="flex gap-2">
          <label className="cursor-pointer bg-secondary text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-secondary/90 transition-colors">
            Browse Files
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.txt"
              onChange={(e) => {
                 if (e.target.files && e.target.files[0]) {
                   handleFile(e.target.files[0]);
                 }
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
