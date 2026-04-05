'use client';

import { Menu, LucideIcon } from 'lucide-react';

interface ViewHeaderProps {
  title: string;
  Icon?: LucideIcon;
  onMenuClick: () => void;
  children?: React.ReactNode;
}

export default function ViewHeader({ title, Icon, onMenuClick, children }: ViewHeaderProps) {
  return (
    <header className="h-14 border-b border-primary/15 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 backdrop-blur-md bg-background/80 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-primary hover:text-text md:hidden"
        >
          <Menu size={20} />
        </button>
        {Icon && <Icon size={18} className="text-secondary shrink-0" />}
        <h2 className="font-bold text-text truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
}
