import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncPoint OS — Team Operating System",
  description: "Remote-first team dashboard with real-time pulse tracking, chat, and AI-driven summaries.",
};

import { ThemeProvider } from "@/components/ThemeProvider";
import RealTimeProvider from "@/components/RealTimeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <RealTimeProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              {children}
            </ThemeProvider>
          </RealTimeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
