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
      <div className="relative w-full max-w-lg bg-background border border-primary/20 rounded-xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
             <Route size={24} />
          </div>
          <div className="flex-1">
             <h2 className="text-xl font-bold">New Project</h2>
             <p className="text-xs text-primary/50">Chart out your long-term goals and epics.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded-full transition-colors text-text">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Project Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q2 Revamp, New Design System..."
              className="w-full bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project all about?"
              className="w-full bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold hover:bg-primary/5 rounded-lg transition-colors"
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
            className="px-6 py-2.5 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-secondary/20"
          >
            Launch Project
          </button>
        </div>
      </div>
    </div>
  );
}
