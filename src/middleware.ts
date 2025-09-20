// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  if (process.env.ENABLE_AUTH !== 'true') return NextResponse.next()

  const session = req.cookies.get('next-auth.session-token')
    ?? req.cookies.get('__Secure-next-auth.session-token')

  // If no session cookie and hitting app pages, bounce to sign-in
  if (!session && req.nextUrl.pathname.startsWith('/dashboard') ||
      !session && req.nextUrl.pathname.startsWith('/betslip') ||
      !session && req.nextUrl.pathname.startsWith('/exposure')) {
    const url = req.nextUrl.clone()
    url.pathname = '/api/auth/signin'
    url.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/betslip/:path*',
    '/exposure/:path*',
  ],
}
