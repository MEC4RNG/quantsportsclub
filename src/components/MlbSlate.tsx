import Link from 'next/link'
import type { MlbGsimResults } from '@/schemas/mlbGsimResults'
import { mlbDisplayContext } from '@/lib/mlbGsim'
import styles from './MlbSlate.module.css'

export default function MlbSlate({ slate, date, now = Date.now() }: {
  slate: MlbGsimResults | null; date: string; now?: number
}) {
  const games = [...(slate?.games ?? [])].sort((a, b) => a.scheduled_start_utc.localeCompare(b.scheduled_start_utc))
  const available = games.filter(g => g.projection).length
  const stale = slate && now - Date.parse(slate.generated_at_utc) > 90 * 60 * 1000
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  return <main className={styles.main}>
    <div className={styles.heading}>
      <div><Link href="/dashboard">Dashboard</Link><h1>MLB models</h1>
        <p>Game projections · {date}</p></div>
      <form className={styles.date} action="/dashboard/mlb">
        <label htmlFor="slate-date">Slate date</label>
        <input id="slate-date" name="date" type="date" defaultValue={date} required />
        <button type="submit">View slate</button>
      </form>
    </div>
    <p className={styles.notice}>Descriptive simulation outputs. Winner probabilities are not a validated betting edge.
      Player prop distributions remain unvalidated and are not published here.</p>
    {slate ? <>
      <div className={styles.summary}>
        <span><strong>{games.length}</strong> games</span>
        <span><strong>{available}</strong> with projections</span>
        <span><strong>{games.length - available}</strong> unavailable</span>
      </div>
      <p className={styles.timestamp}>Snapshot: {new Date(slate.generated_at_utc).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET.
        {' '}{stale ? 'Stale snapshot — refresh has not arrived within 90 minutes.' : 'Checks for new data every minute while this page is visible.'}</p>
      <div className={styles.grid}>
        {games.map(game => <article key={game.game_id} className={styles.card}>
          <div className={styles.meta}>
            <span>{new Date(game.scheduled_start_utc).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })} ET</span>
            <span>{game.mlb_state}</span>
          </div>
          <h2>{game.away_team}<span className={styles.at}>at</span>{game.home_team}</h2>
          <p className={styles.status}>{mlbDisplayContext(game, slate.generated_at_utc, now)}</p>
          {game.projection ? <dl className={styles.metrics}>
            <div><dt>Away win</dt><dd>{pct(game.projection.away_win_probability)}</dd></div>
            <div><dt>Home win</dt><dd>{pct(game.projection.home_win_probability)}</dd></div>
            <div><dt>Mean total runs</dt><dd>{game.projection.game_total_mean.toFixed(2)}</dd></div>
          </dl> : <p>Awaiting an eligible model run. No projection is available in this snapshot.</p>}
          {game.projection && mlbDisplayContext(game, slate.generated_at_utc, now) === 'Pregame reference' &&
            <p className={styles.reference}>Retained pregame estimate. This is not a live forecast.</p>}
          <p className={styles.source}>Source status: {game.source_state.toLowerCase().replaceAll('_', ' ')}{game.run_id ? ` · ${game.run_id}` : ''}</p>
        </article>)}
      </div>
      {games.length === 0 && <p className={styles.empty}>No games on this slate.</p>}
    </> : <div className={styles.empty}><h2>No MLB snapshot for this date</h2>
      <p>Choose another date or check again after the next successful delivery.</p></div>}
  </main>
}
