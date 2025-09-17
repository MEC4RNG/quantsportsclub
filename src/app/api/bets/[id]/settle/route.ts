import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/log'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { SettleBet } from '@/schemas/bets'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ip = getClientIp(req)
    const r = await rateLimit({ key: `bets:settle:${ip}`, limit: 20, windowMs: 60_000 })
    if (!r.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const data = await req.json()
    const parsed = SettleBet.parse(data)
    const betId = params.id

    const settled = await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({ where: { id: betId } })
      if (!bet) throw new Error('Bet not found')
      if (bet.status !== 'pending') throw new Error('Bet already settled')

      let realized = parsed.realizedUnits
      if (realized === undefined) {
        if (parsed.result === 'win') {
          // payoff in units if decimal odds provided; else estimate from American
          if (bet.oddsDecimal && bet.oddsDecimal > 1) {
            realized = bet.stakeUnits * (bet.oddsDecimal - 1)
          } else if (bet.oddsAmerican) {
            realized = bet.oddsAmerican > 0
              ? bet.stakeUnits * (bet.oddsAmerican / 100)
              : bet.stakeUnits * (100 / Math.abs(bet.oddsAmerican))
          } else {
            realized = bet.stakeUnits // fallback: 1:1
          }
        } else if (parsed.result === 'loss') {
          realized = -bet.stakeUnits
        } else {
          realized = 0 // void/push
        }
      }

      const updated = await tx.bet.update({
        where: { id: betId },
        data: { status: parsed.result, realizedUnits: realized },
      })

      if (parsed.result === 'win') {
        await tx.bankrollEntry.create({
          data: { userId: bet.userId, kind: 'win', units: Math.abs(realized), notes: `Bet ${bet.id}` },
        })
      } else if (parsed.result === 'loss') {
        await tx.bankrollEntry.create({
          data: { userId: bet.userId, kind: 'loss', units: Math.abs(realized!), notes: `Bet ${bet.id}` },
        })
      }
      // void: no bankroll change

      return updated
    })

    logger.info({ ip, route: 'bets:settle', event: 'settle', id: settled.id, status: settled.status })
    return NextResponse.json(settled, { status: 200 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
