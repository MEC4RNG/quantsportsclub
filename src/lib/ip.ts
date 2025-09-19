// src/lib/ip.ts
import type { NextRequest } from 'next/server'

/** Best-effort client IP from headers; safe for dev/tests. */
export function getClientIp(req: Request | NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const ip = xff.split(',')[0]?.trim()
    if (ip) return ip
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return '127.0.0.1'
}
