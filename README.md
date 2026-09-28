# PriMo Nails — mobile landing prototype

Working prototype of the full mobile landing page (*Landing mob* reference, 440 px wide) with the interactive **The Seasons** carousel section (*The Seasons – Mobile*) placed where the reference puts it — between *Nuovi Arrivi* and *Consigliati per te*.
Plain HTML/CSS/JS, no build step, installable as a PWA and usable offline. Photos are cropped from the supplied PDFs (`img/`); Montserrat + Inter are bundled (`fonts/`).

## What works
- **Header** – sticky; menu drawer (grouped like the footer, highlights where you are), search with tap-to-pick colour chips, language menu, cart, and a thin page-progress line
- **Hero** – swipeable 3-slide carousel with auto-advance and dots
- **I Più Venduti** – tab switcher (I Più Venduti / Novità / Saldi), product carousels, shade selection, **+5** to reveal more shades, *add to cart* fills the cart
- **Scegli il tuo Mood** – 14 colour swatches; **see all** toggles a grid
- **The Seasons** – snap carousel (autumn → winter → spring → summer). Opens in the design's idle frame, settles on *autumn* when scrolled into view, then each season re-themes the section (border, dot, button, background, drifting leaves / snow / petals / bubbles). Dots, arrow keys and tapping a side card navigate; **+5** expands to 8 shades; **I Più Venduti** scrolls to the best-sellers block
- **Cart** – bottom sheet with quantities, subtotal and a free-shipping progress bar (the 199 € threshold from the shipping bar); persists across reloads
- Shipping / *TPO & HEMA free* marquees, testimonials carousel, founder bio (**Leggi di più** expands), course cards, footer accordion

## Usability (kept every element, lowered the effort of using them)
- **Orientation** – position bar under every carousel, page-progress line, back-to-top button, current section marked in the menu
- **Less noise** – marquees are slower and pause on touch/hover; hero autoplay is slow, plays through once and stops as soon as you touch it; particles stay clear of the headline; everything animated pauses off-screen; nothing loops under *reduce motion*
- **Fewer slips** – 44 px touch targets everywhere (swatches keep their look but get bigger hit areas), tapping a season never flashes through the seasons in between, the language label never lies
- **Legibility** – all text meets WCAG AA contrast; hero text sits on a soft scrim; balanced line breaks; fluid hero type (no clipping down to 320 px)
- **Keyboard / assistive tech** – visible focus ring, skip link, arrow keys on tabs / hero / seasons, dialogs move and restore focus and make the page behind inert
- **Mouse** – any carousel can be dragged (with snap); touch and trackpads scroll natively

## Placeholders / not in the designs
- Hero *Learn more* jumps to the founder story (destination not specified in the design)
- Hero slides 2 and 3: the reference shows only slide 1's copy; headlines for 2 and 3 are stand-ins
- Mood colour names after the first six (only *b&w, grigio, nude, rosa, rosso, bord…* are visible in the reference), the 5 extra season shades, and footer link lists
- Buttons whose destination isn't designed (*Learn more*, *see all*, *Scopri*, social links) show a "not designed yet" toast
- Winter / spring / summer season backgrounds are CSS gradients + particles, not the original photography
- The reference repeats one product and one testimonial; the prototype does the same

## Run
```sh
python3 -m http.server 8000
```
Open http://localhost:8000 on a phone (same network) or in devtools device mode (440 px matches the reference). Desktop browsers show a centred 440 px column.
