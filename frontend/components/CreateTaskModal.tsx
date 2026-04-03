'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string }) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border border-primary/20 rounded-xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">New Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Title</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Description (Optional)</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
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
              if (title.trim()) {
                onSubmit({ title, description });
                setTitle('');
                setDescription('');
              }
            }}
            disabled={!title.trim()}
            className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
