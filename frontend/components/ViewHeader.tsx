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
    <header className="h-14 border-b border-border flex items-center justify-between pl-4 md:pl-6 pr-48 sticky top-0 z-10 backdrop-blur-md bg-background/80 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground md:hidden"
        >
          <Menu size={20} />
        </button>
        {Icon && <Icon size={18} className="text-brand-text shrink-0" />}
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
}
