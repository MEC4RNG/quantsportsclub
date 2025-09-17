export const prisma = {
  edge: {
    findMany: async () => [{ id: 'e1', sport: 'NFL', createdAt: new Date() }],
    create: async (args: { data: Record<string, unknown> }) => ({ id: 'e2', ...args.data }),
  },
  bankrollEntry: {
    findMany: async () => [
      { id: 'b1', userId: 'u1', units: 100, kind: 'deposit', createdAt: new Date() },
    ],
    create: async (args: { data: Record<string, unknown> }) => ({ id: 'b2', ...args.data }),
  },
}
