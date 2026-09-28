# PriMo Nails — mobile landing prototype

Working prototype of the full mobile landing page (*Landing mob* reference, 440 px wide) with the interactive **The Seasons** carousel section (*The Seasons – Mobile*) placed where the reference puts it — between *Nuovi Arrivi* and *Consigliati per te*.
Plain HTML/CSS/JS, no build step, installable as a PWA and usable offline. Photos are cropped from the supplied PDFs (`img/`); Montserrat + Inter are bundled (`fonts/`).

## What works
- **Header** – sticky; menu drawer, search (finds a mood colour and scrolls to it), language menu, cart counter
- **Hero** – swipeable 3-slide carousel with auto-advance and dots
- **I Più Venduti** – tab switcher (I Più Venduti / Novità / Saldi), product carousels, shade selection, **+5** to reveal more shades, *add to cart* updates the header cart
- **Scegli il tuo Mood** – 14 colour swatches; **see all** toggles a grid
- **The Seasons** – snap carousel (autumn → winter → spring → summer). Opens in the design's idle frame, settles on *autumn* when scrolled into view, then each season re-themes the section (border, dot, button, background, drifting leaves / snow / petals / bubbles). Dots, arrow keys and tapping a side card navigate; **+5** expands to 8 shades; **I Più Venduti** scrolls to the best-sellers block
- Shipping / *TPO & HEMA free* marquees, testimonials carousel, founder bio (**Leggi di più** expands), course cards, footer accordion

## Placeholders / not in the designs
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
