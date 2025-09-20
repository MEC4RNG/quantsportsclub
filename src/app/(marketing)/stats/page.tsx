export const dynamic = 'force-dynamic'
import styled from 'styled-components'

async function fetchStats(days='30') {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/stats/summary?days=${days}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('failed to load stats')
  return res.json() as Promise<{
    windowDays: number|'all',
    totals: { wins:number; losses:number; pushes:number; pending:number },
    winPct:number, units:number, roi:number, avgEdge:number
  }>
}

const Wrap = styled.main`max-width:900px;margin:40px auto;padding:24px;`
const Cards = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;`
const Card = styled.div`padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:12px;`

export default async function StatsPage({ searchParams }: { searchParams: Record<string,string|undefined> }) {
  const days = searchParams.days ?? '30'
  const s = await fetchStats(days)
  const pct = (n:number) => (n*100).toFixed(1)+'%'
  return (
    <Wrap>
      <h2>Stats (last {s.windowDays === 'all' ? 'all time' : `${s.windowDays}d`})</h2>
      <Cards>
        <Card><b>Win%</b><div>{pct(s.winPct)}</div></Card>
        <Card><b>Units P&L</b><div>{s.units.toFixed(2)}</div></Card>
        <Card><b>ROI</b><div>{pct(s.roi)}</div></Card>
        <Card><b>Avg Edge</b><div>{pct(s.avgEdge)}</div></Card>
        <Card><b>Record</b><div>{s.totals.wins}-{s.totals.losses}-{s.totals.pushes} ({s.totals.pending} pending)</div></Card>
      </Cards>
    </Wrap>
  )
}
