'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useEffect } from 'react'

function getParam(sp: URLSearchParams, key: string) {
  const v = sp.get(key)
  return v && v.length ? v : ''
}

export default function EdgeFilters({
  sports,
  markets,
}: { sports: string[]; markets: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [sport, setSport] = useState(getParam(sp, 'sport'))
  const [market, setMarket] = useState(getParam(sp, 'market'))
  const [minEdge, setMinEdge] = useState(getParam(sp, 'minEdge'))

  useEffect(() => {
    setSport(getParam(sp, 'sport'))
    setMarket(getParam(sp, 'market'))
    setMinEdge(getParam(sp, 'minEdge'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp?.toString()])

  const apply = useCallback(() => {
    const q = new URLSearchParams()
    if (sport) q.set('sport', sport)
    if (market) q.set('market', market)
    if (minEdge) q.set('minEdge', minEdge)
    router.push(`${pathname}?${q.toString()}`)
  }, [router, pathname, sport, market, minEdge])

  const reset = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  const marketOpts = useMemo(
    () => (sport ? markets.filter(m => !!m) : markets),
    [sport, markets]
  )

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={sport} onChange={e => setSport(e.target.value)}>
        <option value="">All sports</option>
        {sports.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select value={market} onChange={e => setMarket(e.target.value)}>
        <option value="">All markets</option>
        {marketOpts.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <input
        type="number"
        step="0.1"
        placeholder="Min edge %"
        value={minEdge}
        onChange={e => setMinEdge(e.target.value)}
        style={{ width: 120 }}
      />

      <button onClick={apply}>Apply</button>
      <button onClick={reset} style={{ opacity: 0.8 }}>Reset</button>
    </div>
  )
}
