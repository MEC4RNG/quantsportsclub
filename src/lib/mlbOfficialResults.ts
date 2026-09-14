import { officialScheduleSchema, type OfficialGame } from '@/lib/mlbPerformance'

export async function loadOfficialResults(dates: string[]) {
  const games = new Map<string, OfficialGame>()
  const unavailable: string[] = []
  // Small batches avoid a burst against the official source.
  const unique = [...new Set(dates)].sort()
  for (let offset = 0; offset < unique.length; offset += 4) {
    await Promise.all(unique.slice(offset, offset + 4).map(async date => {
      try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date')
        const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`, {
          next: { revalidate: 900 }, signal: AbortSignal.timeout(8000),
        })
        if (!response.ok) throw new Error('Source unavailable')
        const parsed = officialScheduleSchema.parse(await response.json())
        for (const day of parsed.dates) for (const game of day.games) games.set(String(game.gamePk), game)
      } catch { unavailable.push(date) }
    }))
  }
  return { games, unavailable }
}
