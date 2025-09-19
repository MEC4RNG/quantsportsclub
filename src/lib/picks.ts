// src/lib/picks.ts
import { prisma } from '@/lib/db'

export type PendingBetRow = {
  id: string
  createdAt: Date
  sport: string
  market: string | null
  pick: string | null
  // odds fields aren't on your Bet model; expose as nullable for the UI
  bookOdds: number | null
  fairOdds: number | null
  edgePct: number | null
}

export async function getPendingBets(limit = 100): Promise<PendingBetRow[]> {
  // Shape that matches the select below (no implicit any)
  type BetRow = {
    id: string
    createdAt: Date
    sport: string
    market: string | null
    pick: string | null
  }

  const rows: BetRow[] = await prisma.bet.findMany({
    where: { status: 'pending' },
    orderBy: [{ createdAt: 'desc' }],
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      id: true,
      createdAt: true,
      sport: true,
      market: true,
      pick: true,
    },
  })

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    sport: r.sport,
    market: r.market,
    pick: r.pick,
    bookOdds: null,
    fairOdds: null,
    edgePct: null,
  }))
}

// Matches your schema: kind + units
type BankrollEntryRow = {
  kind: 'deposit' | 'withdrawal'
  units: number | null
}


// --- Bankroll: deposits – withdrawals + realized PnL //

type RawBankrollEntry = { kind: string; units: number | null }

export async function getCurrentBankrollUnits(): Promise<number> {
  const entries: RawBankrollEntry[] = await prisma.bankrollEntry.findMany({
    select: { kind: true, units: true },
  })

  let deposits = 0
  let withdrawals = 0
  for (const e of entries) {
    const amt = Number(e.units ?? 0)
    if (e.kind === 'deposit') deposits += amt
    else if (e.kind === 'withdrawal') withdrawals += amt
  }

  const pnlAgg = await prisma.bet.aggregate({
    where: { status: { in: ['win', 'loss', 'void'] } },
    _sum: { realizedUnits: true },
  })
  const realized = Number(pnlAgg._sum.realizedUnits ?? 0)

  return deposits - withdrawals + realized
}

