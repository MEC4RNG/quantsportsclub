import { z } from 'zod'

export const CreateEdge = z.object({
  sport: z.string(),
  league: z.string().optional(),
  eventId: z.string().optional(),
  market: z.string().optional(),
  pick: z.string().optional(),
  fairOdds: z.number().optional(),
  bookOdds: z.number().optional(),
  edgePct: z.number().optional(),
  stakeUnits: z.number().optional(),
  modelRunId: z.string().optional(),
})
export type CreateEdgeInput = z.infer<typeof CreateEdge>
