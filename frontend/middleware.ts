import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define public routes
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // 2. Simple log for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SyncPoint] Intercepting: ${request.nextUrl.pathname}`);
  }

  // 3. Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};