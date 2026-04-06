// 1. We must use 'edge' to avoid the "unsupported modules" error in Clerk/Vercel
export const runtime = 'edge';

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are public (unprotected)
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // 🛡️ Debug: identify the active runtime and request path
  // Note: process.env checks work differently on Edge, but this is safe for logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SyncPoint] Path: ${request.nextUrl.pathname}`);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};