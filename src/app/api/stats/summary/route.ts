// src/app/api/stats/summary/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Number(searchParams.get('days') ?? '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [won, lost, pending] = await Promise.all([
      prisma.bet.count({ where: { status: 'win',     createdAt: { gte: since } } }),
      prisma.bet.count({ where: { status: 'loss',    createdAt: { gte: since } } }),
      prisma.bet.count({ where: { status: 'pending', createdAt: { gte: since } } }),
    ])

    // Optional ROI: total realized / total staked for settled bets
    const [sumRealized, sumStake] = await Promise.all([
      prisma.bet.aggregate({
        where: { status: { in: ['win', 'loss'] }, createdAt: { gte: since } },
        _sum: { realizedUnits: true },
      }),
      prisma.bet.aggregate({
        where: { status: { in: ['win', 'loss'] }, createdAt: { gte: since } },
        _sum: { stakeUnits: true },
      }),
    ])

    const realized = Number(sumRealized._sum.realizedUnits ?? 0)
    const staked   = Number(sumStake._sum.stakeUnits ?? 0)
    const roi = staked > 0 ? (realized / staked) * 100 : 0

    return NextResponse.json({ days, totals: { won, lost, pending }, roi })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
