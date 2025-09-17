import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  async function middleware(req) {
    // Light request-id for tracing (Edge runtime-safe)
    const reqId = crypto.randomUUID()
    const res = NextResponse.next()
    res.headers.set('x-request-id', reqId)
    // (Optional) cheap console log in dev; avoid noisy logs in prod edge
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MW]', reqId, req.method, req.nextUrl.pathname)
    }
    // inside default export withAuth(...) just before `return res`
    res.headers.set('x-frame-options', 'SAMEORIGIN')
    res.headers.set('x-content-type-options', 'nosniff')
    res.headers.set('referrer-policy', 'strict-origin-when-cross-origin')
    res.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
    res.headers.set('strict-transport-security', 'max-age=63072000; includeSubDomains; preload')
    return res
  },
  {
    pages: { signIn: '/auth/signin' },
  },
)

export const config = { matcher: ['/dashboard/:path*'] }

