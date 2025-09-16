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
    return res
  },
  {
    pages: { signIn: '/auth/signin' },
  },
)

export const config = { matcher: ['/dashboard/:path*'] }
