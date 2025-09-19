import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/log'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { requireApiKey } from '@/lib/authz'
import { CreateBet } from '@/schemas/bets'

export async function GET() {
  const rows = await prisma.bet.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const unauth = requireApiKey(req)
  if (unauth) return unauth

  try {
    const ip = getClientIp(req)
    const r = await rateLimit({ key: `bets:${ip}`, limit: 10, windowMs: 60_000 })
    if (!r.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const data = await req.json()
    const parsed = CreateBet.parse(data)

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdBet = await tx.bet.create({ data: { ...parsed, status: 'pending' } })
      await tx.bankrollEntry.create({
        data: {
          userId: parsed.userId,
          kind: 'bet',
          units: parsed.stakeUnits,
          notes: parsed.notes ?? undefined,
        },
      })
      return createdBet
    })

    logger.info({ ip, route: 'bets', event: 'create', id: result.id })
    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ route: 'bets', event: 'error', err: msg })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
