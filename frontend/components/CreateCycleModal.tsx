'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface CreateCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; startDate: string; endDate: string }) => void;
}

export default function CreateCycleModal({ isOpen, onClose, onSubmit }: CreateCycleModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl p-5 sm:p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6 text-brand-text">
          <Calendar size={24} />
          <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-muted rounded-full transition-colors text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">New Cycle</h2>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Cycle Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 1, Q2 Final Sprint..."
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={() => {
              if (name.trim()) {
                onSubmit({ name, startDate, endDate });
                setName('');
              }
            }}
            disabled={!name.trim()}
            className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand/20"
          >
            Create Cycle
          </button>
        </div>
      </div>
    </div>
  );
}
