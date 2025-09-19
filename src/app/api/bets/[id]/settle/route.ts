// src/app/api/bets/[id]/settle/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getClientIp } from '@/lib/ip'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/log'
import { americanToDecimal } from '@/lib/odds'

const SettleBet = z.object({
  outcome: z.enum(['win', 'loss', 'void']),
  realizedUnits: z.number().optional().nullable(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ip = getClientIp(req)
  const r = await rateLimit({ key: `bets:settle:${ip}`, limit: 20, windowMs: 60_000 })
  if (!r.ok) {
    logger.warn({ ip, route: 'bets:settle', event: 'rate_limited' })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { id } = params
    const body = await req.json()
    const data = SettleBet.parse(body)

    const updated = await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({ where: { id } })
      if (!bet) throw new Error('Bet not found')
      if (bet.status !== 'pending') throw new Error('Bet already settled')

      // If caller didn’t pass realizedUnits, compute a sensible default
      let realized = data.realizedUnits ?? null
      if (realized == null) {
        if (data.outcome === 'void') {
          realized = 0
        } else if (data.outcome === 'win') {
          // profit per unit from American odds; if missing, assume even money
          const d = bet.bookOdds != null ? americanToDecimal(bet.bookOdds) : 2
          realized = Number((bet.stakeUnits * (d - 1)).toFixed(4))
        } else if (data.outcome === 'loss') {
          realized = -bet.stakeUnits
        }
      }

      return await tx.bet.update({
        where: { id },
        data: {
          status: data.outcome,
          realizedUnits: realized,
        },
      })
    })

    logger.info({ ip, route: 'bets:settle', event: 'settle', id, status: updated.status })
    return NextResponse.json(updated, { status: 200 })
  } catch (err) {
    logger.error({ ip, route: 'bets:settle', err: (err as Error).message })
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
