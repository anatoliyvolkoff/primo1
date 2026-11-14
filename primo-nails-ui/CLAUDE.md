# PriMo Nails UI

Vite + React 19 storefront for PriMo Nails. Talks to Medusa.js v2 over the Store API for everything user-visible — products, cart, courses, hero/testimonials/settings, course-list, etc.

Originally scaffolded by Google AI Studio with Firebase as the data backend; Firebase was removed in the May 2026 rewire and the same UI is now backed by Medusa.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Routing | React Router DOM 7 |
| Animations | Motion (Framer Motion) 12 |
| Icons | Lucide React |
| State | React Context + `@tanstack/react-query` 5 |
| Backend | Medusa Store API via `@medusajs/js-sdk` 2.13.6 |
| Package manager | **pnpm** (do not use npm/yarn) |
| Languages | IT (primary), EN (secondary) |

## Commands

```bash
make run        # pnpm dev — Vite dev server on :3000
make build      # pnpm build — production build into dist/
make lint       # tsc --noEmit (typecheck only)
make clean      # rm -rf dist
make install    # pnpm install
```

Top-level repo also exposes `make run-ui` which delegates here.

## Environment

```
VITE_MEDUSA_BACKEND_URL=http://localhost:9000
VITE_MEDUSA_PUBLISHABLE_KEY=pk_...
```

Both live in `.env`. The publishable key is the Medusa store-API key — fetch from Medusa Admin → Settings → Publishable API Keys. Backend URL points at the API server (`primo-nails-api`).

## Project Structure

```
src/
├── main.tsx                  # Entry
├── App.tsx                   # Router + provider tree (see below)
├── content.json              # Hero/footer layout knobs + Le Stagioni image refs
├── types.ts                  # Product view-model + medusaProductToProduct adapter
├── i18n/                     # Translation files (it.ts, en.ts, index.ts)
├── data/                     # Static data (seasons, swatches)
├── pages/                    # Route components
├── components/               # Shared UI
│   ├── collections/          # ShopByColor, SeasonalCollections, RunningBanner
│   ├── layout/               # Header, Footer, Hero
│   └── skeletons/            # Loading skeletons
├── context/                  # 7 providers (see App.tsx ordering)
├── hooks/                    # useCart, useProducts, useCourses, useStoreContent, …
└── lib/                      # medusa.ts (SDK), migrateLocalStorage, etc.
```

## Provider Tree

App.tsx mounts providers in this order — order matters because some depend on others:

```
QueryClient
 └─ LanguageProvider
     └─ ToastProvider                 (uses useLanguage for ARIA labels)
         └─ ContentProvider           (content.json + localStorage cache)
             └─ ProductProvider       (useMedusaProducts, locale-aware mapping)
                 └─ CartProvider      (Medusa cart, primo_cart_id in localStorage)
                     └─ SearchProvider
                         └─ RecentlyViewedProvider
```

## Key data flows

- **Products**: `useMedusaProducts()` fetches all 200 products once at boot, locale-agnostic. `ProductContext` re-maps them to view models when the language changes (no refetch). Errors surface via `CatalogErrorBanner`.
- **Cart**: Cart state lives server-side in Medusa. The browser only stores `primo_cart_id` (lazy-created on first add-to-cart). `useMedusaCart` only clears the handle on 404/410; transient errors retry.
- **Content** (testimonials, hero slides, store settings, homepage product slots, courses): single bundled fetch `GET /store/content`, hooks `useStoreContent` / `useStoreSetting<T>` / `useProductSlot`. Courses have their own endpoint `GET /store/courses` consumed via `useCourses` / `useCourse(handle)`.

## i18n

- Custom React Context, typed `TranslationKey` enum, `t(key, vars?)` with `{{var}}` interpolation
- Files: `src/i18n/it.ts` (primary), `src/i18n/en.ts`, `src/i18n/index.ts` (key type)
- IT is the catalogue's primary language; product names/descriptions/categories/effects stay IT until the backend stores per-locale `metadata.translations`
- Current language is persisted to `localStorage['primo_language']` and rehydrated on mount; default is `it`

## localStorage keys

| Key | Purpose | Lifecycle |
|---|---|---|
| `primo_cart_id` | Handle to the user's Medusa cart | Created on first add-to-cart; cleared only on 404/410 from Medusa |
| `primo_language` | UI language (`it` / `en`) | Written every time `setLanguage` runs; read on mount |
| `recentlyViewed` | Up to 10 product handles | Per add-to-recently-viewed |
| `newsletter_dismissed` | Suppress the discount popup | Set once when user dismisses |
| `site_content` | ContentContext cache | Read on mount, written via `updateContent()` |

`migrateLocalStorage()` runs at module load and wipes orphaned keys from earlier branches (`cookie-consent`, `aidreptate_dev_flags`).

## Notes

- The `@` path alias resolves to **the project root** (not `src/`), configured in both `vite.config.ts` and `tsconfig.json`.
- The Sfumature row on PDP supports `?from-kit=<kitHandle>` to scope shade-siblings to a Kit's children when arrived from the kit page.
- ShopByColor renders in two modes: nav (homepage, CTA-style) and filter (`/shop`, `/semipermanente`); both come from the same component with different props.
- All UI strings are translatable. Hardcoded user-visible strings are bugs; if you add new ones, add an `a11y.*` or appropriate-namespace i18n key.
