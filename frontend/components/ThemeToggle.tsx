'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md border border-primary/20 hover:bg-primary/10 transition-colors text-primary relative flex items-center justify-center w-10 h-10 cursor-pointer"
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] transition-all dark:opacity-0 dark:scale-0 opacity-100 scale-100" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] transition-all opacity-0 scale-0 dark:opacity-100 dark:scale-100" />
    </button>
  )
}

