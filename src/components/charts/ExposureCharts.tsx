'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'

export type DailyPnl = { date: string; pnl: number }
export type PendingBySport = { sport: string; pending: number }

export function ExposureCharts({
  daily,
  pendingBySport,
}: {
  daily: DailyPnl[]
  pendingBySport: PendingBySport[]
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
      <div style={{ height: 300, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 8 }}>
        <h3 style={{ margin: '4px 8px' }}>PnL by Day</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="pnl" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: 300, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 8 }}>
        <h3 style={{ margin: '4px 8px' }}>Pending Exposure by Sport</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pendingBySport}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sport" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="pending" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
