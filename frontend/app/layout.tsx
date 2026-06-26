import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Team Pulse type system: Geist (UI/body/display) + Geist Mono (tabular figures
// — clocks, timezones, data). Exposes --font-geist-sans / --font-geist-mono.
const sans = GeistSans;
const mono = GeistMono;

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
        <head>
          {/* Apply the saved brand accent (Sage default / Clay) before paint to avoid a flash. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `try{if(localStorage.getItem('syncpoint_accent')==='clay'){document.documentElement.dataset.accent='clay';}}catch(e){}`,
            }}
          />
        </head>
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
