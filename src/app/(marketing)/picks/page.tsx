export const dynamic = 'force-dynamic'
import styled from 'styled-components'

async function fetchPicks(qs: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/picks${qs}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('failed to load picks')
  return res.json() as Promise<{ total: number; page: number; pageSize: number; rows: any[] }>
}

const Wrap = styled.main`max-width:1100px;margin:40px auto;padding:24px;`
const Table = styled.table`width:100%;border-collapse:collapse;td,th{padding:8px;border-bottom:1px solid rgba(255,255,255,.1)}`

export default async function PicksPage({ searchParams }: { searchParams: Record<string,string|undefined> }) {
  const qs = new URLSearchParams(searchParams as Record<string,string>).toString()
  const data = await fetchPicks(qs ? `?${qs}` : '')
  return (
    <Wrap>
      <h2>Picks</h2>
      <Table>
        <thead><tr>
          <th>Time</th><th>Sport</th><th>Market</th><th>Pick</th><th>Status</th><th>Stake</th><th>Edge</th><th>By</th>
        </tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.sport}</td>
              <td>{r.market ?? '—'}</td>
              <td>{r.pick}</td>
              <td>{r.status}</td>
              <td>{r.stakeUnits?.toFixed?.(2) ?? '—'}</td>
              <td>{r.edgePct != null ? (Number(r.edgePct)*100).toFixed(1)+'%' : '—'}</td>
              <td>{r.tag ?? r.source ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Wrap>
  )
}
