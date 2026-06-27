'use client';

import { useState } from 'react';
import { X, Route } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
}

export default function CreateProjectModal({ isOpen, onClose, onSubmit }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl p-5 sm:p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-text">
             <Route size={24} />
          </div>
          <div className="flex-1">
             <h2 className="text-xl font-bold">New Project</h2>
             <p className="text-xs text-muted-foreground">Chart out your long-term goals and epics.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-muted rounded-full transition-colors text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Project Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q2 Revamp, New Design System..."
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project all about?"
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onSubmit({ name, description });
                setName('');
                setDescription('');
              }
            }}
            disabled={!name.trim()}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand/20"
          >
            Launch Project
          </button>
        </div>
      </div>
    </div>
  );
}
