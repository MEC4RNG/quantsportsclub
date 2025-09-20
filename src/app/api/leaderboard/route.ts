import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const days = Number(sp.get('days') ?? 90)
  const minSamples = Number(sp.get('min') ?? 25)
  const since = new Date(Date.now() - days * 86400_000)

  const bets = await prisma.bet.findMany({
    where: { createdAt: { gte: since } },
    select: { tag: true, status: true, stakeUnits: true, realizedUnits: true },
  })

  const map = new Map<string, { n: number; w: number; l: number; st: number; ru: number }>()
  for (const b of bets) {
    const key = b.tag ?? 'Unknown'
    const rec = map.get(key) ?? { n: 0, w: 0, l: 0, st: 0, ru: 0 }
    rec.n++
    if (b.status === 'win') rec.w++
    if (b.status === 'loss') rec.l++
    rec.st += b.stakeUnits ?? 0
    rec.ru += b.realizedUnits ?? 0
    map.set(key, rec)
  }

  const rows = Array.from(map, ([tag, r]) => {
    const winPct = r.w + r.l > 0 ? r.w / (r.w + r.l) : 0
    const roi = r.st > 0 ? r.ru / r.st : 0
    // naive sample-aware score: win% * ln(1+roi) scaled by sqrt(n)
    const score = winPct * Math.log(1 + Math.max(-0.9, roi)) * Math.sqrt(r.n)
    return { tag, n: r.n, winPct, roi, units: r.ru, score }
  })
    .filter(r => r.n >= minSamples)
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)

  return NextResponse.json({ windowDays: days, minSamples, rows }, { status: 200 })
}
