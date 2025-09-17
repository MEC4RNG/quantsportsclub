export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'

// Infer row types directly from Prisma queries (no @prisma/client type imports needed)
type EdgeRow = Awaited<ReturnType<typeof prisma.edge.findMany>>[number]
type BankrollRow = Awaited<ReturnType<typeof prisma.bankrollEntry.findMany>>[number]

export default async function DashboardPage() {
  const [edges, bankroll] = await Promise.all([
    prisma.edge.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.bankrollEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ])

  return (
    <main style={{ maxWidth: 960, margin: '40px auto', padding: 16 }}>
      <h1>Dashboard</h1>

      <section style={{ marginTop: 24 }}>
        <h2>Recent Edges</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Created</th>
              <th align="left">Sport</th>
              <th align="left">Market</th>
              <th align="left">Pick</th>
              <th align="right">Edge %</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((e: EdgeRow) => (
              <tr key={e.id}>
                <td>{new Date(e.createdAt).toLocaleString()}</td>
                <td>{e.sport}</td>
                <td>{e.market ?? '-'}</td>
                <td>{e.pick ?? '-'}</td>
                <td align="right">{e.edgePct ?? '-'}</td>
              </tr>
            ))}
            {edges.length === 0 && (
              <tr>
                <td colSpan={5} style={{ opacity: 0.7 }}>
                  No edges yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Recent Bankroll Entries</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Created</th>
              <th align="left">Kind</th>
              <th align="right">Units</th>
              <th align="left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {bankroll.map((b: BankrollRow) => (
              <tr key={b.id}>
                <td>{new Date(b.createdAt).toLocaleString()}</td>
                <td>{b.kind}</td>
                <td align="right">{b.units}</td>
                <td>{b.notes ?? '-'}</td>
              </tr>
            ))}
            {bankroll.length === 0 && (
              <tr>
                <td colSpan={4} style={{ opacity: 0.7 }}>
                  No bankroll entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
