// src/app/api/bets/[id]/settle/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getClientIp } from '@/lib/ip'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/log'
import { americanToDecimal } from '@/lib/odds'
import { getSessionUserId } from '@/lib/sessionUser'

const SettleBet = z.object({ outcome: z.enum(['win', 'loss', 'void']) }).strict()

class SettlementError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(req)
  const r = await rateLimit({ key: `bets:settle:${userId}:${ip}`, limit: 20, windowMs: 60_000 })
  if (!r.ok) {
    logger.warn({ userId, route: 'bets:settle', event: 'rate_limited' })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = SettleBet.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose win, loss, or void' }, { status: 400 })
  }

  const { id } = await context.params
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findFirst({ where: { id, userId } })
      if (!bet) throw new SettlementError('Bet not found', 404)
      if (bet.status !== 'pending') throw new SettlementError('Bet is already settled', 409)

      let realizedUnits = 0
      if (parsed.data.outcome === 'win') {
        if (bet.bookOdds == null) {
          throw new SettlementError('Winning bets require recorded book odds', 422)
        }
        realizedUnits = Number(
          (bet.stakeUnits * (americanToDecimal(bet.bookOdds) - 1)).toFixed(4),
        )
      } else if (parsed.data.outcome === 'loss') {
        realizedUnits = -bet.stakeUnits
      }

      const result = await tx.bet.updateMany({
        where: { id, userId, status: 'pending' },
        data: { status: parsed.data.outcome, realizedUnits },
      })
      if (result.count !== 1) throw new SettlementError('Bet is already settled', 409)
      return tx.bet.findUniqueOrThrow({ where: { id } })
    })

    logger.info({ userId, route: 'bets:settle', event: 'settle', id, status: updated.status })
    return NextResponse.json(updated, { status: 200 })
  } catch (err) {
    if (err instanceof SettlementError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    logger.error({ userId, route: 'bets:settle', event: 'failed', id })
    return NextResponse.json({ error: 'Settlement failed' }, { status: 500 })
  }
}
