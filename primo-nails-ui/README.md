# PriMo Nails — Storefront

Vite + React 19 storefront for the [PriMo Nails](https://primonails.it) e-commerce platform. Backed by the sibling Medusa.js v2 API in [`../primo-nails-api/`](../primo-nails-api/).

## Quick Start

```bash
# from this directory
pnpm install
cp /dev/null .env && echo "VITE_MEDUSA_BACKEND_URL=http://localhost:9000" >> .env
echo "VITE_MEDUSA_PUBLISHABLE_KEY=<get from Medusa Admin>" >> .env
pnpm dev          # http://localhost:3000
```

Or from the monorepo root: `make run-ui`.

The dev server expects the API at `http://localhost:9000` (configurable via `VITE_MEDUSA_BACKEND_URL`). Get a publishable key from Medusa Admin → Settings → Publishable API Keys, or use the dev-seeded key already present in the parent `.env.template`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server (port 3000, HMR) |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Serve the production build |
| `pnpm lint` | ESLint (flat config) — fails on errors, warnings tracked |
| `pnpm lint:fix` | ESLint with `--fix` (safe autofixes) |
| `pnpm typecheck` | `tsc --noEmit` typecheck |
| `pnpm clean` | Remove `dist/` |

Same targets are wrapped in the local `Makefile` (`make run`, `make build`, etc.).

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite 6
- **Styling:** Tailwind CSS 4
- **Routing:** React Router DOM 7
- **Animation:** Motion (Framer) 12
- **Icons:** Lucide React
- **Data:** Medusa Store API via `@medusajs/js-sdk` 2.13.6 + React Query 5

## What lives here

- Public-facing storefront pages: home, /shop, category pages, PDP, cart drawer, checkout, /corsi, /about-us
- Custom hooks talking to the Medusa Store API: products, cart, courses, store content
- A small i18n layer (IT/EN) — translations in `src/i18n/`
- Tailwind theme + design tokens

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes (provider tree, data flow, key conventions).

## License

Proprietary — PriMo Nails.
