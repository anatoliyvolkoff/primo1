# PriMo Nails — "The Seasons" mobile prototype

Working prototype of the *The Seasons – Mobile* design: a swipeable seasonal collection carousel. Plain HTML/CSS/JS, no build step, installable as a PWA and usable offline.

## What's in it
- Snap-scrolling carousel (autumn → winter → spring → summer); side cards scale/fade with distance
- Each season re-themes the screen: card border, active dot, button tint, background and drifting particles (leaves, snow, petals, bubbles)
- Intro state from the first design frame (neutral, nothing selected) that settles on *autumn*
- Dots + arrow keys + tapping a side card to navigate
- Shade swatches: tap to select, **+5** expands to all 8 shades
- **I Più Venduti** opens a bottom sheet with the season's shades

Photos are cropped from the PDF (`img/`); Montserrat is bundled (`fonts/`).

### Placeholders (not in the design)
The 5 extra shades behind **+5**, and the bottom sheet behind **I Più Venduti**, are stand-ins; the design shows neither.
The winter/spring/summer background textures are recreated with CSS gradients rather than the original photography.

## Run
```sh
python3 -m http.server 8000
```
Open http://localhost:8000 on a phone (same network) or in devtools device mode (390 × 740 matches the design).
Desktop browsers show it inside a phone-sized frame.
