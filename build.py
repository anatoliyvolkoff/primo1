#!/usr/bin/env python3
"""Assemble the static pages: src/pages/<name>.html + shared partials -> <name>.html in the repo root.

Each page source starts with a settings comment, e.g.
  <!--page title="PriMo Nails" description="..." css="home" js="home" body="home" -->
and may define the page-specific drawer links between <!--drawer--> ... <!--/drawer-->.
Run `python3 build.py` after editing anything in src/; `python3 build.py --check` fails if the output is stale.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
partial = {p.stem: p.read_text() for p in (SRC / 'partials').glob('*.html')}

HEAD = """<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<meta name="color-scheme" content="light">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="PriMo Nails">
<meta name="description" content="{description}">
<title>{title}</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/icon.svg">
{preload}<link rel="preload" href="fonts/montserrat-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/site.css">
{css_links}</head>
<body class="{body}">
<div class="page" id="page">
  <a class="skip" href="#top">Vai al contenuto</a>

"""
TAIL = """</div>
<noscript><p style="padding:24px;text-align:center;font:600 15px system-ui">Per vedere questo sito abilita JavaScript.</p></noscript>
<script src="js/site.js"></script>
{js_links}</body>
</html>
"""


def build(src: pathlib.Path) -> str:
    text = src.read_text()
    m = re.match(r'\s*<!--page (.*?)-->\n', text, re.S)
    if not m:
        sys.exit(f'{src}: missing <!--page ...--> settings comment')
    opts = dict(re.findall(r'(\w+)="(.*?)"', m.group(1)))
    body = text[m.end():]
    drawer = ''
    dm = re.search(r'<!--drawer-->\n(.*?)<!--/drawer-->\n', body, re.S)
    if dm:
        drawer, body = dm.group(1), body[:dm.start()] + body[dm.end():]
    preload = ''.join(f'<link rel="preload" href="{p}" as="image" fetchpriority="high">\n' for p in opts.get('preload', '').split() if p)
    css_links = ''.join(f'<link rel="stylesheet" href="css/{c}.css">\n' for c in opts.get('css', src.stem).split())
    js_links = ''.join(f'<script src="js/{j}.js"></script>\n' for j in opts.get('js', src.stem).split())
    page = HEAD.format(title=opts.get('title', 'PriMo Nails'), description=opts.get('description', ''),
                       css_links=css_links, body=opts.get('body', src.stem), preload=preload)
    page += partial['header'] + '\n' + body.rstrip() + '\n\n' + partial['footer'] + '\n' + partial['overlays'].replace('{{drawer_page}}', drawer)
    page += TAIL.format(js_links=js_links)
    return page


def main():
    check = '--check' in sys.argv
    stale = []
    for src in sorted((SRC / 'pages').glob('*.html')):
        out = ROOT / src.name
        html = build(src)
        if check:
            if not out.exists() or out.read_text() != html:
                stale.append(out.name)
        else:
            out.write_text(html)
            print('built', out.name)
    if check and stale:
        sys.exit('stale (run python3 build.py): ' + ', '.join(stale))


if __name__ == '__main__':
    main()
