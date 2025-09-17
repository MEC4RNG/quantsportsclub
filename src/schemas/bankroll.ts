import { z } from 'zod'

export const CreateBankrollEntry = z.object({
  userId: z.string(),
  kind: z.enum(['deposit','withdrawal','bet','win','loss','adjustment']),
  units: z.number(),
  notes: z.string().optional(),
})
export type CreateBankrollEntryInput = z.infer<typeof CreateBankrollEntry>
