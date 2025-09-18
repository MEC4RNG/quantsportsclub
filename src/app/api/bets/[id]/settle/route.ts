import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'        // <-- add this
import { logger } from '@/lib/log'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { SettleBet } from '@/schemas/bets'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    const ip = getClientIp(req)
    const r = await rateLimit({ key: `bets:settle:${ip}`, limit: 20, windowMs: 60_000 })
    if (!r.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const data = await req.json()
    const parsed = SettleBet.parse(data)

    // ✅ Use Prisma.TransactionClient
    const settled = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const bet = await tx.bet.findUnique({ where: { id } })
      if (!bet) throw new Error('Bet not found')
      if (bet.status !== 'pending') throw new Error('Bet already settled')

      let realized: number
      if (typeof parsed.realizedUnits === 'number') {
        realized = parsed.realizedUnits
      } else if (parsed.result === 'win') {
        if (bet.oddsDecimal && bet.oddsDecimal > 1) {
          realized = bet.stakeUnits * (bet.oddsDecimal - 1)
        } else if (typeof bet.oddsAmerican === 'number') {
          realized =
            bet.oddsAmerican > 0
              ? bet.stakeUnits * (bet.oddsAmerican / 100)
              : bet.stakeUnits * (100 / Math.abs(bet.oddsAmerican))
        } else {
          realized = bet.stakeUnits
        }
      } else if (parsed.result === 'loss') {
        realized = -bet.stakeUnits
      } else {
        realized = 0 // void/push
      }

      const updated = await tx.bet.update({
        where: { id },
        data: { status: parsed.result, realizedUnits: realized },
      })

      if (parsed.result === 'win') {
        await tx.bankrollEntry.create({
          data: { userId: bet.userId, kind: 'win', units: Math.abs(realized), notes: `Bet ${bet.id}` },
        })
      } else if (parsed.result === 'loss') {
        await tx.bankrollEntry.create({
          data: { userId: bet.userId, kind: 'loss', units: Math.abs(realized), notes: `Bet ${bet.id}` },
        })
      }

      return updated
    })

    logger.info({ ip, route: 'bets:settle', event: 'settle', id: settled.id, status: settled.status })
    return NextResponse.json(settled, { status: 200 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
