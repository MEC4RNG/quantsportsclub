// src/lib/exposure.ts
import { prisma } from '@/lib/db'

type Num = number | null | undefined
const n = (x: Num) => Number(x ?? 0)

/** ===== Overview ===== */
export type BySportRow = { sport: string; pending: number; pnl: number }
export type ByMarketRow = { market: string; pending: number; pnl: number }

export type ExposureOverview = {
  pendingTotal: number
  pnlTotal: number
  bySport: BySportRow[]
  byMarket: ByMarketRow[]
}

export async function getExposureOverview(days?: number): Promise<ExposureOverview> {
  const since = days ? new Date(Date.now() - days * 86_400_000) : undefined
  const dateFilter = since ? { gte: since } : undefined

  // Pending exposure
  const pendingSport = await prisma.bet.groupBy({
    by: ['sport'],
    where: { status: 'pending', ...(dateFilter ? { createdAt: dateFilter } : {}) },
    _sum: { stakeUnits: true },
  })
  const pendingBySport = new Map<string, number>()
  for (const r of pendingSport) pendingBySport.set(r.sport, n(r._sum.stakeUnits))

  const pendingMarket = await prisma.bet.groupBy({
    by: ['market'],
    where: { status: 'pending', ...(dateFilter ? { createdAt: dateFilter } : {}) },
    _sum: { stakeUnits: true },
  })
  const pendingByMarket = new Map<string, number>()
  for (const r of pendingMarket) pendingByMarket.set(r.market ?? 'Other', n(r._sum.stakeUnits))

  // Realized PnL (from settled bets)
  const pnlSport = await prisma.bet.groupBy({
    by: ['sport'],
    where: { status: { in: ['win', 'loss', 'void'] }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    _sum: { realizedUnits: true },
  })
  const pnlBySport = new Map<string, number>()
  for (const r of pnlSport) pnlBySport.set(r.sport, n(r._sum.realizedUnits))

  const pnlMarket = await prisma.bet.groupBy({
    by: ['market'],
    where: { status: { in: ['win', 'loss', 'void'] }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    _sum: { realizedUnits: true },
  })
  const pnlByMarket = new Map<string, number>()
  for (const r of pnlMarket) pnlByMarket.set(r.market ?? 'Other', n(r._sum.realizedUnits))

  // Compose tables
  const sports = new Set([...pendingBySport.keys(), ...pnlBySport.keys()])
  const bySport: BySportRow[] = Array.from(sports)
    .map((sport) => ({
      sport,
      pending: pendingBySport.get(sport) ?? 0,
      pnl: pnlBySport.get(sport) ?? 0,
    }))
    .sort((a, b) => a.sport.localeCompare(b.sport))

  const markets = new Set([...pendingByMarket.keys(), ...pnlByMarket.keys()])
  const byMarket: ByMarketRow[] = Array.from(markets)
    .map((market) => ({
      market,
      pending: pendingByMarket.get(market) ?? 0,
      pnl: pnlByMarket.get(market) ?? 0,
    }))
    .sort((a, b) => a.market.localeCompare(b.market))

  const pendingTotal = bySport.reduce((s, r) => s + r.pending, 0)
  const pnlTotal = bySport.reduce((s, r) => s + r.pnl, 0)

  return { pendingTotal, pnlTotal, bySport, byMarket }
}

/** ===== Analytics for charts ===== */
export type DailyPnl = { date: string; pnl: number }
export type PendingBySport = { sport: string; pending: number }

export type ExposureAnalytics = {
  since?: string
  daily: DailyPnl[]
  pendingBySport: PendingBySport[]
}

export async function getExposureAnalytics(days?: number): Promise<ExposureAnalytics> {
  const since = days ? new Date(Date.now() - days * 86_400_000) : undefined
  const dateFilter = since ? { gte: since } : undefined

  // Daily PnL
  const settled = await prisma.bet.findMany({
    where: { status: { in: ['win', 'loss', 'void'] }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    select: { createdAt: true, realizedUnits: true },
    orderBy: { createdAt: 'asc' },
  })
  const byDay = new Map<string, number>()
  for (const row of settled) {
    const key = row.createdAt.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + n(row.realizedUnits))
  }

  // Pending by sport
  type PendingGroupRow = { sport: string; _sum: { stakeUnits: number | null } }

  const pendingBySportRows = (await prisma.bet.groupBy({
    by: ['sport'],
    where: { status: 'pending', ...(dateFilter ? { createdAt: dateFilter } : {}) },
    _sum: { stakeUnits: true },
    orderBy: { sport: 'asc' },
  })) as PendingGroupRow[]

  const pendingBySport = pendingBySportRows.map((r) => ({
    sport: r.sport,
    pending: n(r._sum.stakeUnits),
  }))



  return {
    since: since?.toISOString(),
    daily: Array.from(byDay.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    pendingBySport,
  }
}
