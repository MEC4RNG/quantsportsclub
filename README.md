# QuantSportsClub

A fast, modern website for sports analytics and betting education. Built with **Next.js + TypeScript + styled-components**.

## Tech
- Next.js (App Router) + TypeScript
- styled-components (CSS-in-JS)
- ESLint + Prettier
- GitHub Actions CI

## Getting Started
```bash
# install deps
npm install

# run locally
npm run dev

# typecheck / lint / build
npm run typecheck
npm run lint
npm run build
```

## Project Structure
```
src/
  app/
    (marketing)/about/page.tsx
    (app)/dashboard/page.tsx
    layout.tsx
    page.tsx
  components/
    Header.tsx
  styles/
    GlobalStyle.ts
    theme.ts
  lib/
    (future utilities)
```

## Deployment
We recommend deploying with **Vercel** for best Next.js support. Connect your GitHub repo, set the framework to Next.js, and deploy from `main`.

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## Security
See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## NFL GSIM results integration

The private NFL GSIM service may send only the narrow `qsc.nfl_gsim.results.v1`
results contract to `POST /api/integrations/nfl-gsim/results`. Set a strong
`NFL_GSIM_INGESTION_SECRET` in the deployment secret store and send it as an
`Authorization: Bearer …` credential. The endpoint fails closed when the secret
is absent, strictly rejects fields outside the published schema, verifies the
exporter's canonical SHA-256 payload hash, and idempotently stores accepted
contracts by that hash.

Never place that secret in a `NEXT_PUBLIC_*` variable or commit it. Never send or
store private model code, fitted artifacts, training data, retained trials,
credentials, or raw run data in this public repository or its database. Apply
the included Prisma migration only through the normal reviewed deployment
process. Validated results are presented at `/dashboard/nfl` with their readiness,
provisional, blocked-game, and decision-use labels intact.
# quantsportsclub
