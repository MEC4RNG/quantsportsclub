import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const sport = sp.get('sport') ?? undefined
  const status = sp.get('status') ?? undefined
  const from = sp.get('from') ? new Date(sp.get('from')!) : undefined
  const to = sp.get('to') ? new Date(sp.get('to')!) : undefined
  const page = Math.max(1, Number(sp.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 20)))

  const where: any = {}
  if (sport) where.sport = sport
  if (status) where.status = status
  if (from || to) where.createdAt = { gte: from, lte: to }

  const [total, rows] = await Promise.all([
    prisma.bet.count({ where }),
    prisma.bet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, createdAt: true, sport: true, market: true, pick: true,
        status: true, stakeUnits: true, edgePct: true, oddsAmerican: true,
        source: true, tag: true,
      },
    }),
  ])

  return NextResponse.json({ total, page, pageSize, rows }, { status: 200 })
}
