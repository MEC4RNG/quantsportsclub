import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/log'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { requireApiKey } from '@/lib/authz'
import { CreateBankrollEntry } from '@/schemas/bankroll'

export async function GET() {
  const rows = await prisma.bankrollEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const unauth = requireApiKey(req)
  if (unauth) return unauth

  try {
    const ip = getClientIp(req)
    const r = await rateLimit({ key: `bankroll:${ip}`, limit: 10, windowMs: 60_000 })
    if (!r.ok) {
      logger.warn({ ip, route: 'bankroll', event: 'rate_limited' })
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const data = await req.json()
    const parsed = CreateBankrollEntry.parse(data)

    const created = await prisma.bankrollEntry.create({ data: parsed })
    logger.info({ ip, route: 'bankroll', event: 'create', id: created.id })
    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ route: 'bankroll', event: 'error', err: msg })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
