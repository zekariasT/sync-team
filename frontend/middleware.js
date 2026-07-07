import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default clerkMiddleware(async (auth, request) => {
  if (isDemo) {
    // Public demo: fully anonymous — no auth.protect(); auth pages bounce home.
    if (isPublicRoute(request)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return;
  }
  // Real auth: everything except the sign-in/sign-up pages requires a session.
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

//changed env
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};