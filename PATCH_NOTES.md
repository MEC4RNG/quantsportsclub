# Backend Sprint 1 — How to apply

This drop-in adds:
- Prisma + SQLite (local/CI) with models: User, Bet, BankrollEntry, Edge, ModelRun
- API routes: `/api/health`, `/api/edges` (GET/POST), `/api/bankroll` (GET/POST)
- Env example and Prisma client

## 1) Copy files into your repo root
- `prisma/` → `<repo>/prisma/`
- `src/lib/db.ts` → `<repo>/src/lib/db.ts`
- `src/app/api/**` → `<repo>/src/app/api/**`
- `.env.example` → `<repo>/.env.example`

## 2) Update package.json (add deps + scripts)

Add **dependencies**:
```json
"@prisma/client": "latest",
"zod": "latest"
```

Add **devDependencies**:
```json
"prisma": "latest"
```

Add **scripts**:
```json
"db:generate": "prisma generate",
"db:push": "prisma db push",
"db:studio": "prisma studio"
```

## 3) Install & init DB
```bash
npm install
npx prisma generate
npm run db:push            # creates prisma/dev.db
```

## 4) Try it
Run the dev server:
```bash
npm run dev
```
- Health: http://localhost:3000/api/health
- Edges:  GET http://localhost:3000/api/edges
          POST JSON → http://localhost:3000/api/edges
            { "sport":"NBA", "market":"spread", "pick":"LAL -3.5", "edgePct":3.2 }
- Bankroll: GET/POST http://localhost:3000/api/bankroll

## 5) Commit & push
```bash
git add -A
git commit -m "feat(api,db): add prisma (sqlite) + edges/bankroll endpoints"
git push
```

## 6) Next steps
- (Auth) Add NextAuth with Prisma adapter and GitHub OAuth.
- (Switch DB) Move from SQLite to Postgres (Neon/Supabase). Then run `prisma migrate`.
- (Rate limiting) Add middleware to protect endpoints.
- (Testing) Add Vitest + a few API tests.
