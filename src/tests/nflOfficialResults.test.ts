import { afterEach, expect, it, vi } from 'vitest'
import { loadNflResults } from '@/lib/nflOfficialResults'

afterEach(() => vi.unstubAllGlobals())

it('loads requested regular-season games, scores, source hash and Eastern kickoffs', async () => {
  const csv = [
    'game_id,season,game_type,week,gameday,gametime,away_team,away_score,home_team,home_score',
    '2026_01_A_H,2026,REG,1,2026-09-13,13:00,A,20,H,27',
    '2026_09_X_Y,2026,REG,9,2026-11-01,13:00,X,,Y,',
    '2026_01_P_Q,2026,POST,1,2027-01-10,13:00,P,10,Q,14',
    '2025_01_B_C,2025,REG,1,2025-09-07,13:00,B,17,C,20',
    '2024_01_D_E,2024,REG,1,2024-09-08,13:00,D,24,E,24',
    '2023_01_F_G,2023,REG,1,2023-09-10,13:00,F,30,G,20',
  ].join('\n')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(csv, { status: 200 })))
  const result = await loadNflResults(2026, [1, 9])
  expect(result.unavailable).toBe(false)
  expect(result.scheduledGames).toBe(2)
  expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/)
  expect(result.games.get('2026_01_A_H')!.kickoffUtc).toBe('2026-09-13T17:00:00.000Z')
  expect(result.games.get('2026_09_X_Y')!.kickoffUtc).toBe('2026-11-01T18:00:00.000Z')
  expect(result.games.get('2026_09_X_Y')!.homeScore).toBeNull()
  expect(result.baseline).toMatchObject({ sampleGames: 3, seasons: [2023, 2024, 2025] })
  expect(result.baseline!.homeWinProbability).toBeCloseTo(1 / 3)
  expect(result.baseline!.awayWinProbability).toBeCloseTo(1 / 3)
  expect(result.baseline!.tieProbability).toBeCloseTo(1 / 3)
  expect(result.baseline!.meanTotal).toBe(45)
})

it('fails closed when the source cannot be validated', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 503 })))
  const result = await loadNflResults(2026, [1])
  expect(result.unavailable).toBe(true)
  expect(result.games.size).toBe(0)
  expect(result.sourceHash).toBeNull()
  expect(result.baseline).toBeNull()
})
