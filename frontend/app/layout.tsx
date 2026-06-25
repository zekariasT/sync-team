import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Indigo-workspace type system:
//  - Plus Jakarta Sans: modern geometric SaaS workhorse for UI/body + display
//  - JetBrains Mono: tabular/technical figures (data, timers, code labels)
const sans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SyncPoint OS — Team Operating System",
  description: "Remote-first team dashboard with real-time pulse tracking, chat, and AI-driven summaries.",
};

import { ThemeProvider } from "@/components/ThemeProvider";
import RealTimeProvider from "@/components/RealTimeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Point every Clerk redirect at the app's OWN /sign-in & /sign-up routes.
    // Without these, auth.protect() (and sign-out) bounce to Clerk's hosted
    // Account Portal on *.accounts.dev — a cross-origin URL Next.js can't fetch
    // as an RSC payload, which throws the CORS / "Failed to fetch RSC payload"
    // console errors seen on logout. Keeping redirects same-origin fixes that.
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      <html lang="en" suppressHydrationWarning className={cn("font-sans", sans.variable, mono.variable)}>
        <body className="antialiased">
          <RealTimeProvider>
            <ToastProvider>
              <ThemeProvider attribute="class" defaultTheme="light">
                <TooltipProvider delayDuration={200}>
                  {children}
                </TooltipProvider>
                <Toaster richColors position="bottom-right" />
              </ThemeProvider>
            </ToastProvider>
          </RealTimeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
