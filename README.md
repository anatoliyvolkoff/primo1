# PriMo Nails — site prototype

A working multi-page prototype of the PriMo Nails shop, rebuilt from the Figma file *PriMo-Nails-1*. It has phone layouts (440 px frames) and desktop layouts (1440 px frames). It is plain HTML/CSS/JS, installable as a PWA and usable offline. Montserrat and Inter are bundled in `fonts/` and stand in for the design's Gotham, with sizes and letter-spacing calibrated to match the Figma text boxes.

## Pages
| Page | File | Figma frames |
|---|---|---|
| Home | `index.html` | Landing mob · Desktop – 7 |
| Product | `prodotto.html` (`?sale=0` no-sale variant, `?kit=inverno` seasonal kit with season switcher) | product page mob · Desktop – 15 |
| Catalogue | `catalogo.html` (`?cat=`, `?colore=`, `?coll=`, `?q=` search results) | catalogue phone + desktop frames, filter and pagination states |
| Academy (course list) | `academy.html` | Courses mob · Course desk 7602:18585 |
| Course detail | `corso.html` | Course mob · Course desk 7602:18311 |
| About us | `chi-siamo.html` | about us mob · about us |

Shared header (phone bar + desktop nav), footer (accordion on phones, columns on desktop), menu drawer, search, cart sheet and toasts are in `src/partials/`.

## What works
- **Cart**: add from any product card, the product page (sticky buy bar on phones), the catalogue quick view or the seasonal kit. It persists across reloads and has a free-shipping progress bar.
- **Search** (`js/search.js`, `css/search.css`): full screen on phones; on desktop a visible field in the header that opens a panel under it. Results update as you type, grouped into suggestions (colours, categories, collections, courses, pages) and products, with matches in bold. It tolerates accents, typos ("rossso" finds rosso) and common Italian/English synonyms (smalto, blue, top coat…). Before you type it shows recent searches (stored on the device, removable), popular searches, colours and best sellers. Keyboard: `/` or Ctrl/⌘+K opens it, arrow keys move through results, Enter opens one, Esc closes. Enter on an exact colour or category opens it directly; any other text goes to the catalogue as `?q=`. Also reachable from the phone menu.
- **Catalogue**: filter panel (13 colours, collections, effects, dual-handle price range), sort menu, active-filter count, pagination (12 per page on phones, 16 on desktop), empty state, and a quick-view dialog that reuses the product panel.
- **Product**: swipeable gallery with dots, shade picker, quantity stepper, accordions, related products. The kit page has an animated season switcher.
- **Academy**: course cards, plus an individual-training request form with validation and a confirmation toast.
- **Course detail**: facts card, accordions (description / programme / info), a draggable gallery, and a WhatsApp CTA.
- **Home**: everything from the previous prototype (hero carousel, best sellers tabs, mood swatches, The Seasons carousel, testimonials, founder, courses).
- Every page passes a check for no console errors and no horizontal scroll at 360 / 390 / 440 / 1440 px. Below the 440 px design width, the fixed-size blocks (swatch grid, season tabs, catalogue cards, pager) scale down instead of being clipped.

## Building
Pages are assembled from `src/pages/*.html` and the partials:
```sh
python3 build.py          # writes the root *.html files
python3 build.py --check  # fails if the built files are stale
```
When you add images or pages, update the `ASSETS` list in `sw.js` and bump `CACHE`.

## Known gaps / placeholders
- **Images that need a proper export from Figma.** The Figma MCP quota ran out and figma.com asset URLs are blocked in the build environment. Several images were taken from low-resolution renders and upscaled, so they look soft at full size:
  - desktop catalogue hero (`img/hero-catalog.jpg`, baked-in text painted out)
  - About page teal hero, portrait and b/w photo (`img/about-hero.jpg`, `img/about-portrait.jpg`, `img/about-bw.jpg`)
  - desktop Academy hero (`img/academy-hero-d.jpg`, a composite of a blurred cover and the founder photo)

  The third About block on phones uses the product bottle in place of the design's "Air Spring" photo.
- **Design placeholders kept as-is**:
  - every catalogue product is "№112 Ultramarine Glow"
  - the course accordion copy is the design's placeholder text
  - the pager starts on page 1 (the design shows page 5)
- **Small deviations from the design**:
  - the phone catalogue has a pager the phone design doesn't show
  - the design typo "Proffessional" is corrected
  - the third phone footer section is titled "Azienda" (the design repeats "Shop")
  - footer link grey is #707070 instead of #737373, for AA contrast
  - footer link rows have 44 px tap targets, with the text in the same positions as the design
- Destinations that aren't designed (social links, some "see all" buttons) show a "not designed yet" toast.

## Run
```sh
python3 -m http.server 8000
```
Open http://localhost:8000. Use a 440 px-wide device for the phone layout, or 1024 px and wider for the desktop layout.
