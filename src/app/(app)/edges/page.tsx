export const dynamic = 'force-dynamic'

import { getEdges, type EdgeRow } from '@/lib/edges'
import EdgeFilters from '@/components/edges/EdgeFilters'
import { prisma } from '@/lib/db'

export default async function EdgesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const sport = typeof sp?.sport === 'string' ? sp.sport : ''
  const market = typeof sp?.market === 'string' ? sp.market : ''
  const minEdgeStr = typeof sp?.minEdge === 'string' ? sp.minEdge : ''
  const minEdge = Number(minEdgeStr)
  const minEdgePct = Number.isFinite(minEdge) ? minEdge : undefined

  const rows = await getEdges({
    sport: sport || undefined,
    market: market || undefined,
    minEdgePct,
    limit: 100,
  })

  // Distinct sports/markets for the filter dropdowns
  const sportsRows: Array<{ sport: string }> = await prisma.edge.findMany({
    select: { sport: true },
    distinct: ['sport'],
    orderBy: { sport: 'asc' },
  })
  const sports = sportsRows.map((r) => r.sport)

  const marketRows: Array<{ market: string | null }> = await prisma.edge.findMany({
    select: { market: true },
    distinct: ['market'],
    orderBy: { market: 'asc' },
  })
  const markets = marketRows.map((r) => r.market ?? 'Other')


  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: 16 }}>
      <h1>Edges</h1>
      <p style={{ opacity: 0.8, marginTop: -6 }}>Filter by sport, market, or minimum edge%.</p>

      <div style={{ margin: '12px 0 18px' }}>
        <EdgeFilters sports={sports} markets={markets} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">When</th>
            <th align="left">Sport</th>
            <th align="left">Market</th>
            <th align="left">Pick</th>
            <th align="right">Price</th>
            <th align="right">Fair</th>
            <th align="right">Edge %</th>
            <th align="left">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: EdgeRow) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.sport}</td>
              <td>{r.market ?? '—'}</td>
              <td>{r.eventId ?? '—'}</td>
              <td align="right">{r.price ?? '—'}</td>
              <td align="right">{r.fair ?? '—'}</td>
              <td align="right" style={{ color: (r.edgePct ?? 0) >= 0 ? '#7ee787' : '#ff7b72' }}>
                {r.edgePct != null ? r.edgePct.toFixed(2) : '—'}
              </td>
              <td>{r.note ?? '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ opacity: 0.7 }}>No edges match your filter.</td></tr>
          )}
        </tbody>
      </table>

      {/* Dev-only quick-add (hidden on Vercel prod) */}
      {process.env.NODE_ENV !== 'production' && (
        <DevAddEdge />
      )}
    </main>
  )
}

// Tiny dev-only form: posts to API so you can seed interactively
function DevAddEdge() {
  return (
    <form
      action="/api/edges"
      method="post"
      style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'center' }}
    >
      <strong style={{ gridColumn: '1 / -1' }}>Dev: Add Edge</strong>
      <input name="sport" placeholder="Sport (e.g., NBA)" required />
      <input name="market" placeholder="Market (e.g., Spread)" />
      <input name="eventId" placeholder="Event ID / Pick" />
      <input name="price" placeholder="Price (e.g., -110)" type="number" step="1" />
      <input name="fair" placeholder="Fair (e.g., -102)" type="number" step="1" />
      <input name="edgePct" placeholder="Edge % (e.g., 3.2)" type="number" step="0.1" />
      <input name="note" placeholder="Note" />
      <button type="submit" style={{ gridColumn: '1 / -1' }}>Create (dev only)</button>
    </form>
  )
}
