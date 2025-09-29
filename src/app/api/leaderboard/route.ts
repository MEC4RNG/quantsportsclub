// src/app/api/leaderboard/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Aggregate bets by user
    const rows = await prisma.bet.groupBy({
      by: ['userId'],
      _sum: { realizedUnits: true, stakeUnits: true },
      _count: { _all: true },
      orderBy: { _sum: { realizedUnits: 'desc' } },
      take: 20,
    })

    const userIds = rows.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    })
    const nameById = new Map(users.map(u => [u.id, u.name]))

    const leaderboard = rows.map(r => {
      const units = Number(r._sum.realizedUnits ?? 0)
      const staked = Number(r._sum.stakeUnits ?? 0)
      const roiPct = staked > 0 ? (units / staked) * 100 : 0
      return {
        userId: r.userId,
        name: nameById.get(r.userId) ?? null,
        totalBets: r._count._all,
        units,
        roiPct,
      }
    })

    return NextResponse.json(leaderboard)
  } catch (err) {
    return NextResponse.json({ error: 'failed_to_load_leaderboard' }, { status: 500 })
  }
}
