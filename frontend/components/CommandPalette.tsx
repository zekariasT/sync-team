'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Calendar, Hash, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (action: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onSelectAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  // Handle Cmd+K to open, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // If it's already open, it is handled by the parent state usually, but just in case:
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-none" />
      
      <div 
        className="w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-border">
          <Search size={18} className="text-muted-foreground mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-[10px] items-center flex gap-1 font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
             ESC
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {/* Default actions */}
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </div>
          
          <button 
             className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted group transition-colors"
             onClick={() => { onSelectAction?.('create_task'); onClose(); }}
          >
             <div className="flex items-center gap-3 text-sm font-medium">
               <Plus size={16} className="text-brand-text" />
               Create new Issue
             </div>
             <div className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded group-hover:bg-muted group-hover:text-muted-foreground">C</div>
          </button>
          
          <button 
             className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted group transition-colors"
             onClick={() => { onSelectAction?.('create_cycle'); onClose(); }}
          >
             <div className="flex items-center gap-3 text-sm font-medium">
               <Calendar size={16} className="text-brand" />
               Plan new Cycle
             </div>
          </button>

          <button 
             className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted group transition-colors"
             onClick={() => { onSelectAction?.('create_channel'); onClose(); }}
          >
             <div className="flex items-center gap-3 text-sm font-medium">
               <Hash size={16} className="text-muted-foreground" />
               Create Channel
             </div>
          </button>
        </div>
      </div>
    </div>
  );
}
