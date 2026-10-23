# Build nail-shaped swatches (img/nail/<id>.webp, 120x281 like img/mood-*.webp) for every shade in the contact sheet.
# Texture: centre of the shade's round swatch (the 465px PNG when there is one, else the sprite cell);
# shape + gloss: the shading of img/mood-rosa.webp (a plain nail), applied over the texture.
# Run from the repo root: python3 tools/nails.py . <folder with the NNN.png shade files> img/nail
import os, re, sys, glob
import numpy as np
from PIL import Image
repo, src_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out_dir, exist_ok=True)
site = open(os.path.join(repo, 'js/site.js'), encoding='utf-8').read()
semi = re.search(r"const SEMI = `(.*?)`", site, re.S).group(1)
nums = [x.strip().split(' ')[0] for x in semi.split('|')]
items = [('s' + n, n, ((i // 10) + 1, i % 10 + 1)) for i, n in enumerate(nums)]
sheet = re.search(r"const SHEET = \[(.*?)\n  \];", site, re.S).group(1)
pi = 0
for m in re.finditer(r"\['([^']*)', '[^']*', '[^']*', [\d.]+(.*?)\](?=,|\s*$)", sheet):
    pi += 1
    c = re.search(r"\[(\d+), (\d+)", m.group(2) + ']')
    if c: items.append(('p%d' % pi, None, (int(c.group(1)), int(c.group(2)))))
sprite = Image.open(os.path.join(repo, 'img/sw/shades.webp')).convert('RGBA')
tpl = np.asarray(Image.open(os.path.join(repo, 'img/mood-rosa.webp')).convert('RGBA')).astype(float)
H, W = tpl.shape[:2]
alpha = tpl[..., 3]
lum = (tpl[..., :3] @ [0.299, 0.587, 0.114])
ref = np.median(lum[alpha > 250])
shade = np.where(alpha > 0, lum / ref, 1.0)
def source(num, cell):
    if num:
        f = [p for p in glob.glob(os.path.join(src_dir, num + '*.png')) if re.fullmatch(re.escape(num) + r'[_,]?\.png', os.path.basename(p))]
        if f: return Image.open(f[0]).convert('RGBA')
    r, c = cell
    return sprite.crop(((c - 1) * 120, (r - 1) * 120, c * 120, r * 120))
def crop(im):
    D = im.width; h = 0.6 * D; w = h * W / H; cx = cy = D / 2
    return im.crop((round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2))).resize((W, H), Image.LANCZOS)
for pid, num, cell in items:
    tex = np.asarray(crop(source(num, cell)).convert('RGB')).astype(float)
    lit = np.clip(shade - 1, 0, None)[..., None]; dim = np.clip(shade, None, 1)[..., None]
    out = tex * dim + (255 - tex * dim) * np.clip(lit * 1.6, 0, 1)
    rgba = np.dstack([np.clip(out, 0, 255), alpha]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out_dir, pid + '.webp'), quality=82, method=6)
print(len(items), 'nails')
