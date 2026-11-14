#!/usr/bin/env python3
"""Build the round colour-filter swatches (public/swatches/filter/<slug>.webp).

Each colour filter shows the real product swatch whose colour is closest to the
filter (CIELAB distance between the filter's reference colour and the mean of
the swatch's centre, among products of that filter's colour; plain finishes
preferred over shimmer). The picks below are the result of that comparison.
Split filters (b & w, y + o) join the left half of one swatch to the right half
of another. Re-run after changing a pick:  python3 scripts/filter-swatches.py
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/swatches/filter'
SIZE = 128  # 40px max display size, at up to 3x density

PICKS = {
    'bw': ('01-jet-black', '02-extra-white'),
    'grigio': '04-light-gray',
    'nude': 'acrygel-milk-apricot',
    'rosa': '166-summer-delight',
    'rosso': '037-hot-red',
    'bordo': '042-cherry-chocolate',
    'marsala': '053-vintage',
    'magenta': '073-light-magenta',
    'viola': '085-crocus',
    'marrone': '173-bitter-chocolate',
    'glitter': '094-holographic-tender',
    'blu': '124-ocean-blue',
    'verde': '153-grass-spring',
    'y-o': ('gel-painting-yellow', '164-summer-joy'),
}

products = json.loads((ROOT / 'src/dev-mock/products.json').read_text())['products']
swatch_of = {p['handle']: p['metadata']['swatch_image_url'] for p in products
             if (p.get('metadata') or {}).get('swatch_image_url')}

def load(handle: str) -> Image.Image:
    path = ROOT / 'src/dev-mock/media' / swatch_of[handle].rsplit('/', 1)[1]
    return Image.open(path).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)

OUT.mkdir(parents=True, exist_ok=True)
for slug, pick in PICKS.items():
    if isinstance(pick, tuple):
        left, right = load(pick[0]), load(pick[1])
        img = right.copy()
        img.paste(left.crop((0, 0, SIZE // 2, SIZE)), (0, 0))
    else:
        img = load(pick)
    img.save(OUT / f'{slug}.webp', 'WEBP', quality=88, method=6)
    print(slug, pick)
