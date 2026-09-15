import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import type { NflScheduleGame } from '@/lib/nflPerformance'

const SOURCE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv'

type CsvRow = Record<string, string>

function easternKickoffUtc(gameday: string, gametime: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gameday) || !/^\d{2}:\d{2}$/.test(gametime)) {
    throw new Error('Invalid NFL kickoff')
  }
  const [year, month, day] = gameday.split('-').map(Number)
  const [hour, minute] = gametime.split(':').map(Number)
  const wallClockAsUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(wallClockAsUtc))
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const represented = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour),
    Number(value.minute),
    Number(value.second),
  )
  return new Date(wallClockAsUtc - (represented - wallClockAsUtc)).toISOString()
}

function score(value: string | undefined) {
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : null
}

export async function loadNflResults(season: number, weeks: number[]) {
  const requestedWeeks = new Set(weeks)
  try {
    const response = await fetch(SOURCE_URL, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': 'QSC-NFL-Performance/1.0' },
    })
    if (!response.ok) throw new Error('Source unavailable')
    const raw = await response.text()
    if (raw.length > 5_000_000) throw new Error('Unexpected source size')
    const rows = parse(raw, { columns: true, skip_empty_lines: true }) as CsvRow[]
    const games = new Map<string, NflScheduleGame>()
    for (const row of rows) {
      if (
        Number(row.season) !== season ||
        row.game_type !== 'REG' ||
        !requestedWeeks.has(Number(row.week))
      )
        continue
      if (!row.game_id || !row.away_team || !row.home_team || !row.gameday || !row.gametime) {
        throw new Error('Invalid source row')
      }
      games.set(row.game_id, {
        gameId: row.game_id,
        season,
        week: Number(row.week),
        kickoffUtc: easternKickoffUtc(row.gameday, row.gametime),
        awayTeam: row.away_team,
        homeTeam: row.home_team,
        awayScore: score(row.away_score),
        homeScore: score(row.home_score),
      })
    }
    return {
      games,
      scheduledGames: games.size,
      sourceUrl: SOURCE_URL,
      sourceHash: createHash('sha256').update(raw).digest('hex'),
      unavailable: false,
    }
  } catch {
    return {
      games: new Map<string, NflScheduleGame>(),
      scheduledGames: 0,
      sourceUrl: SOURCE_URL,
      sourceHash: null,
      unavailable: true,
    }
  }
}
