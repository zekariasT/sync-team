'use client';

import type { ReactNode } from 'react';
import { useClerk } from '@clerk/nextjs';
import { Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Shared account dropdown (Manage Account / Sign Out) used by both the sidebar
 * footer and the global pill avatar so they present the exact same menu.
 * Wrap the trigger element as children.
 */
export function UserMenu({
  children,
  align = 'end',
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
}) {
  const { openUserProfile, signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-48">
        <DropdownMenuItem onSelect={() => openUserProfile()}>
          <Settings data-icon="inline-start" />
          Manage Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => signOut({ redirectUrl: '/sign-in' })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut data-icon="inline-start" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
