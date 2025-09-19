// src/lib/ip.ts

/**
 * Best-effort client IP extraction for Next.js App Router route handlers.
 * Works on Vercel and locally. Falls back to loopback if nothing is present.
 */
export function getClientIp(req: Request): string {
  const h = req.headers

  // Common proxy/CDN headers (first IP is the client, rest are proxies)
  const xff =
    h.get('x-forwarded-for') ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    h.get('fastly-client-ip') ||
    h.get('true-client-ip') ||
    h.get('x-vercel-proxied-for')

  if (xff) return xff.split(',')[0]!.trim()

  // Last resort for local/dev
  return '127.0.0.1'
}
