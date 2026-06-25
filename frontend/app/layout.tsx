import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Hanken_Grotesk, JetBrains_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// Mission-Control type system:
//  - Hanken Grotesk: refined grotesque workhorse for UI/body
//  - JetBrains Mono: technical OS micro-labels (the SYNCPOINT_OS voice)
//  - Bricolage Grotesque: characterful display for wordmark + headlines
const sans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
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
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${sans.variable} ${mono.variable} ${display.variable} antialiased`}
        >
          <RealTimeProvider>
            <ToastProvider>
              <ThemeProvider attribute="class" defaultTheme="light">
                {children}
              </ThemeProvider>
            </ToastProvider>
          </RealTimeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
