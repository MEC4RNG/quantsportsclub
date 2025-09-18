import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/log'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { requireApiKey } from '@/lib/authz'
import { CreateEdge } from '@/schemas/edges'

export async function GET() {
  const rows = await prisma.edge.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const unauth = requireApiKey(req)
  if (unauth) return unauth

  try {
    const ip = getClientIp(req)
    const r = await rateLimit({ key: `edges:${ip}`, limit: 10, windowMs: 60_000 })
    if (!r.ok) {
      logger.warn({ ip, route: 'edges', event: 'rate_limited' })
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const data = await req.json()
    const parsed = CreateEdge.parse(data)

    const created = await prisma.edge.create({ data: parsed })
    logger.info({ ip, route: 'edges', event: 'create', id: created.id })
    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ route: 'edges', event: 'error', err: msg })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
