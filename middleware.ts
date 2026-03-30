import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// No auth required per spec — middleware is a passthrough
// Add Clerk middleware here if auth is needed in the future:
// import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
// const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
// export default clerkMiddleware(async (auth, req) => {
//   if (isProtectedRoute(req)) await auth.protect()
// })

export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
