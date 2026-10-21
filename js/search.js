/* PriMo Nails – site search, shared by every page.
   Shows suggestions as you type, grouped into products, colours, categories, collections, courses and pages.
   Also: recent and popular searches, accent and typo tolerance, Italian/English synonyms, full keyboard support
   (/ or Ctrl/⌘+K opens it, arrow keys move through results, Enter opens, Esc closes).
   Data comes from PM.CATALOG (js/site.js), so search always matches what the catalogue and the Academy show.
   Full screen on phones, a panel that drops from the header on desktop. The catalogue reads ?q= through PM.search. */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, store, desktopMQ, openOverlay, closeOverlay, MOODS, CATALOG } = PM;
  const { COLORS, MOOD_TO_COLOR, COLLS, CATS, CAT_LABEL, PRODUCTS, KITS, COURSES, swatchBg, label, imgOf } = CATALOG;

  // ---------- text helpers ----------
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const words = s => norm(s).split(' ').filter(Boolean);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const price = n => '€' + n.toFixed(2).replace('.', ',');                // same format as the cards

  // ---------- what can be found (synonyms are folded into each entry's words) ----------
  const COLOR_WORDS = {
    bw: 'bianco nero black white', grigio: 'grey gray grafite', nude: 'nudo beige naturale glitter', rosa: 'pink cipria', rosso: 'red',
    bordo: 'bordeaux burgundy vino', marsala: 'lampone raspberry', magenta: 'fucsia fuchsia', viola: 'lilla purple violet lilac',
    marrone: 'cioccolato brown cacao', blu: 'blue azzurro navy cobalto', verde: 'green salvia', oy: 'giallo arancione yellow orange',
  };
  const CAT_WORDS = {
    semipermanente: 'smalto smalti gel polish semi', gel: 'costruttore builder', base: 'basecoat base coat', top: 'topcoat top coat lucido',
    acrygel: 'polygel acrilico', preparatori: 'primer dehydrator preparatore', 'nail-art': 'nailart decorazioni', care: 'cura olio cuticole',
    kit: 'set cofanetto', accessori: 'lampada pennelli lime',
  };
  const COLL_WORDS = { autumn: 'autunno autunnale fall', winter: 'inverno invernale', spring: 'primavera primaverile', summer: 'estate estiva' };
  const KIT_COLL = { inverno: 'winter', primavera: 'spring', estate: 'summer', autunno: 'autumn' };
  const colorOf = k => COLORS.find(c => c[0] === k);

  const productWords = p => words(`${p.num || ''} ${p.name} ${p.size} ${p.color || ''} ${p.color ? colorOf(p.color)[1] + ' ' + COLOR_WORDS[p.color] : ''} ${CAT_LABEL[p.cat]} ${CAT_WORDS[p.cat]} ${p.coll || ''} ${COLL_WORDS[p.coll] || ''} ${p.fx === 'holo' ? 'olografico holo holographic' : p.fx === 'shimmer' ? 'shimmer perlato' : ''}`);
  const PWORDS = new Map(PRODUCTS.map(p => [p, productWords(p)]));

  const INDEX = [];
  const add = e => { e.words = words(`${e.label} ${e.extra || ''}`); INDEX.push(e); };
  // one entry per product: the sheet's products, every semipermanente shade and the four kits
  const href = p => (p.kit ? `prodotto.html?kit=${p.kit}` : `prodotto.html?id=${p.id}`);
  PRODUCTS.forEach(p => add({ type: 'prod', label: label(p), sub: `${CAT_LABEL[p.cat]} · ${p.size}`, href: href(p), photo: imgOf(p), sw: p.cell ? swatchBg(p.cell) : null, bg: p.kit ? KITS[p.kit].all : null,
    price: p.price, pop: p.pop, extra: PWORDS.get(p).join(' ') + (p.kit ? ` kit set ${COLL_WORDS[p.coll]} ${KITS[p.kit].shades.map(q => q.num).join(' ')}` : '') }));
  CATS.forEach(k => add({ type: 'cat', label: CAT_LABEL[k], href: `catalogo.html?cat=${k}`, extra: CAT_WORDS[k], n: PRODUCTS.filter(p => p.cat === k).length }));
  // colours are the site's own swatches ("Shop by color"); picking one goes through PM.onColorPick so each page can handle it its own way
  MOODS.forEach(([name, f]) => {
    const k = MOOD_TO_COLOR[name];
    add({ type: 'color', label: name[0].toUpperCase() + name.slice(1), name, img: `img/mood-${f}.webp?v=3`, extra: `${k} ${colorOf(k)[1]} ${COLOR_WORDS[k]}`, n: PRODUCTS.filter(p => p.color === k).length });
  });
  COLLS.forEach(([k, label]) => add({ type: 'coll', label, href: `catalogo.html?coll=${k}`, extra: COLL_WORDS[k] }));
  const LVL_WORDS = { base: 'principianti base beginner', avanzato: 'avanzato advanced esperta', master: 'master avanzato pro' };
  COURSES.forEach(c => add({ type: 'course', label: c.title, sub: `${c.tag} · ${c.date} · ${c.les} lezioni`, href: 'corso.html', img: `img/${c.img}.jpg`, pos: c.pos,
    extra: `corso corsi formazione course academy ${c.tag} ${LVL_WORDS[c.lvl]} ${c.txt}` }));
  [['Formazione individuale', 'academy.html#solo', 'corso corsi formazione lezione privata individuale one to one su misura course'],
    ['PriMo Academy – tutti i corsi', 'academy.html', 'academy corso corsi formazione scuola course courses']]
    .forEach(([label, href, extra]) => add({ type: 'course', label, href, extra }));
  [['Chi siamo', 'chi-siamo.html', 'about us storia irina primo fondatrice azienda'], ['Contatti', 'mailto:primonailspro@gmail.com', 'contact email aiuto assistenza whatsapp']]
    .forEach(([label, href, extra]) => add({ type: 'page', label, href, extra }));
  const VOCAB = [...new Set(INDEX.flatMap(e => e.words).concat([...PWORDS.values()].flat()))];

  // ---------- matching ----------
  const tokenScore = (t, ws) => {
    let best = 0;
    for (const w of ws) { if (w === t) return 3; if (w.startsWith(t)) best = 2; else if (!best && t.length > 3 && w.includes(t)) best = 1; }
    return best;
  };
  const scoreWords = (toks, ws) => { let s = 0; for (const t of toks) { const v = tokenScore(t, ws); if (!v) return 0; s += v; } return s; };
  const matchProduct = (p, q) => { const toks = words(q); return !toks.length || scoreWords(toks, PWORDS.get(p)) > 0; };
  function find(q) {
    const toks = words(q); if (!toks.length) return [];
    const whole = toks.join(' ');
    return INDEX.map(e => {
      let s = scoreWords(toks, e.words); if (!s) return null;
      if (norm(e.label).startsWith(whole)) s += 4;
      return [s + (e.type === 'prod' ? 0 : 0.5), e];
    }).filter(Boolean).sort((a, b) => b[0] - a[0]).map(r => r[1]);
  }
  // typo tolerance: swap each unknown word for the closest known one (edit distance 1, or 2 for long words)
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function correct(q) {
    let changed = false;
    const out = words(q).map(t => {
      if (VOCAB.some(w => w.startsWith(t))) return t;
      const max = t.length <= 4 ? 1 : 2;
      let best = null, bd = max + 1;
      for (const w of VOCAB) {                         // compare with the whole word and with its start, so half-typed words still match
        const d = Math.min(lev(t, w), w.length > t.length ? lev(t, w.slice(0, t.length)) : 9);
        if (d < bd || (d === bd && best && w.length < best.length)) { bd = d; best = w; }
      }
      if (best && bd <= max) { changed = true; return best; }
      return t;
    });
    return changed ? out.join(' ') : null;
  }
  const productCount = q => PRODUCTS.filter(p => matchProduct(p, q)).length;
  PM.search = { norm, matchProduct, find, open: () => open() };

  // ---------- recent searches ----------
  const RKEY = 'primo.search.recent.v1';
  const recent = () => store.get(RKEY, []).filter(r => typeof r === 'string').slice(0, 6);
  const remember = q => { q = q.trim(); if (q.length < 2) return; store.set(RKEY, [q, ...recent().filter(r => norm(r) !== norm(q))].slice(0, 6)); };
  const POPULAR = ['Semipermanente', 'Kit inverno', 'Nude', 'Top coat', 'Rosso', 'Corso base', 'Nail art'];

  // ---------- rendering ----------
  const I = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    trend: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    cap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.42 10.92a1 1 0 0 0-.02-1.84l-8.57-3.9a2 2 0 0 0-1.66 0l-8.57 3.9a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>',
    page: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };
  const TYPE = { cat: ['Categoria', I.grid], color: ['Colore', ''], coll: ['Collezione', I.leaf], course: ['Corso', I.cap], page: ['Pagina', I.page] };
  let uid = 0;
  const id = () => 'so-' + (++uid);
  function hl(text, toks) {
    const safe = esc(text);
    if (!toks.length) return safe;
    const re = new RegExp(`(^|[^a-z0-9à-ü])(${toks.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return safe.replace(re, '$1<mark>$2</mark>');
  }
  const prodCard = (e, toks) => `<a class="sx-prod" role="option" id="${id()}" data-opt data-save href="${e.href}">
      <span class="sx-img"><img src="${e.photo}" alt="" loading="lazy" decoding="async">${e.sw || e.bg ? `<i class="sx-dot" style="${e.sw || `--bg:${e.bg}`}"></i>` : ''}</span>
      <span class="sx-pt"><b>${hl(e.label, toks)}</b><small>${hl(e.sub, toks)}</small><em>${price(e.price)}</em></span></a>`;
  const icon = e => e.type === 'color' ? `<img class="sx-sw" src="${e.img}" alt="">` : e.img ? `<img class="sx-th" src="${e.img}" style="object-position:${e.pos}" alt="" loading="lazy">` : TYPE[e.type][1];
  const rowInner = (e, toks) => `<span class="sx-ic">${icon(e)}</span>
      <span class="sx-t">${hl(e.label, toks)}${e.sub ? `<small>${esc(e.sub)}</small>` : ''}</span><small>${e.n != null ? `${e.n} prodotti` : TYPE[e.type][0]}</small>`;
  const sugRow = (e, toks) => `<li role="presentation">${e.type === 'color'
    ? `<button type="button" class="sx-row" role="option" id="${id()}" data-opt data-save data-color="${esc(e.name)}">${rowInner(e, toks)}</button>`
    : `<a class="sx-row${e.sub ? ' sx-row--2' : ''}" role="option" id="${id()}" data-opt data-save href="${e.href}">${rowInner(e, toks)}</a>`}</li>`;
  const sec = (key, title, inner, aside = '') => `<section class="sx-sec sx-sec--${key}" role="group" aria-labelledby="sh-${key}"><div class="sx-h"><h3 id="sh-${key}">${title}</h3>${aside}</div>${inner}</section>`;
  const chipsHtml = () => `<div class="sx-chips">${POPULAR.map(p => `<button type="button" class="sx-chip" id="${id()}" data-opt data-fill="${esc(p)}">${I.trend}${esc(p)}</button>`).join('')}</div>`;

  function renderIdle() {
    const r = recent();
    const top = INDEX.filter(e => e.type === 'prod').sort((a, b) => a.pop - b.pop).slice(0, desktopMQ.matches ? 4 : 3);
    return `<div class="sx-cols"><div class="sx-col">
        ${r.length ? sec('recent', 'Ricerche recenti', `<ul class="sx-recent">${r.map(q => `<li><button type="button" class="sx-row" id="${id()}" data-opt data-fill="${esc(q)}"><span class="sx-ic">${I.clock}</span><span class="sx-t">${esc(q)}</span></button><button type="button" class="sx-x" data-del="${esc(q)}" aria-label="Rimuovi “${esc(q)}” dalle ricerche recenti">${I.x}</button></li>`).join('')}</ul>`, '<button type="button" class="sx-link" data-clear>Cancella</button>') : ''}
        ${sec('popular', 'Ricerche popolari', chipsHtml())}
        ${sec('cats', 'Categorie', `<ul class="sx-list">${CATS.slice(0, 6).map(k => INDEX.find(e => e.type === 'cat' && e.href.endsWith('=' + k))).map(e => sugRow(e, [])).join('')}</ul>`)}
      </div><div class="sx-col sx-main">
        ${sec('colors', 'Cerca per colore', `<div class="sx-colors">${MOODS.map(([name, f]) => `<button type="button" class="sx-color" id="${id()}" data-opt data-color="${esc(name)}"><img src="img/mood-${f}.webp?v=3" alt="" width="26" height="62" loading="lazy" decoding="async"><span>${esc(name)}</span></button>`).join('')}</div>`)}
        ${sec('top', 'I più venduti', `<div class="sx-prods">${top.map(e => prodCard(e, [])).join('')}</div>`)}
      </div></div>`;
  }

  function renderQuery(q) {
    let toks = words(q), hits = find(q), note = '', shownQ = q;
    if (!hits.length) {
      const fixed = correct(q);
      if (fixed && find(fixed).length) { note = `<p class="sx-note">Nessun risultato per “${esc(q)}”. Risultati per “<b>${esc(fixed)}</b>”.</p>`; hits = find(fixed); toks = words(fixed); shownQ = fixed; }
    }
    if (!hits.length) {
      return { n: 0, html: `<div class="sx-none">${I.search}<p class="sx-none-h">Nessun risultato per “${esc(q)}”</p>
        <p>Controlla l’ortografia o prova un termine più generico, per esempio un colore o una categoria.</p>
        ${sec('popular', 'Prova con', chipsHtml())}
        <p class="sx-help">Non trovi quello che cerchi? <a href="mailto:primonailspro@gmail.com">Scrivici</a></p></div>` };
    }
    const sugg = hits.filter(e => e.type !== 'prod').slice(0, 7);
    const prods = hits.filter(e => e.type === 'prod').slice(0, desktopMQ.matches ? 8 : 6);
    const total = productCount(shownQ);
    const all = total ? `<a class="sx-all" id="${id()}" data-opt data-save href="catalogo.html?q=${encodeURIComponent(shownQ)}">Vedi tutti i ${total} prodotti per “${esc(shownQ)}”${I.arrow}</a>` : '';
    return { n: sugg.length + prods.length, total, html: `${note}<div class="sx-cols"><div class="sx-col">
        ${sugg.length ? sec('sug', 'Suggerimenti', `<ul class="sx-list">${sugg.map(e => sugRow(e, toks)).join('')}</ul>`) : ''}
      </div><div class="sx-col sx-main">
        ${prods.length ? sec('prods', 'Prodotti', `<div class="sx-prods">${prods.map(e => prodCard(e, toks)).join('')}</div>`) : ''}
      </div></div>${all}` };
  }

  // ---------- behaviour ----------
  const box = $('#search'), input = $('#search-input'), body = $('#search-body'), clear = $('#search-clear'), live = $('#search-live');
  let active = -1, timer;
  const opts = () => $$('[data-opt]', body);
  function setActive(i) {
    const list = opts();
    list.forEach(o => o.classList.remove('is-active'));
    active = list.length ? (i + list.length) % list.length : -1;
    if (active < 0) { input.removeAttribute('aria-activedescendant'); return; }
    list[active].classList.add('is-active');
    input.setAttribute('aria-activedescendant', list[active].id);
    list[active].scrollIntoView({ block: 'nearest' });
  }
  function render() {
    const q = input.value.trim();
    clear.hidden = !q;
    active = -1; input.removeAttribute('aria-activedescendant');
    if (!q) {
      body.innerHTML = renderIdle(); body.removeAttribute('role'); input.setAttribute('aria-expanded', 'false'); box.classList.remove('has-q');
      live.textContent = ''; return;
    }
    const r = renderQuery(q);
    body.innerHTML = r.html; box.classList.add('has-q');
    body.setAttribute('role', 'listbox'); input.setAttribute('aria-expanded', String(r.n > 0));
    live.textContent = r.n ? `${r.n} suggerimenti${r.total ? `, ${r.total} prodotti` : ''}` : 'Nessun risultato';
  }
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 90); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(active + (e.key === 'ArrowDown' ? 1 : -1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); opts()[active].click(); }
  });
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });

  function go(href) { closeOverlay(true); location.href = href; }
  function pickColor(name) { remember(name); closeOverlay(true); input.value = ''; PM.onColorPick(name); }
  // the catalogue filters in place instead of reloading (PM.onSearch); every other page opens the catalogue with ?q=
  function searchAll(q) { if (PM.onSearch) { closeOverlay(true); PM.onSearch(q); } else go(`catalogo.html?q=${encodeURIComponent(q)}`); }
  $('#search-form').addEventListener('submit', e => {
    e.preventDefault();
    clearTimeout(timer); render();
    const q = input.value.trim(); if (!q) return;
    remember(q);
    const hits = find(q).length ? find(q) : find(correct(q) || '');
    const exact = hits.find(h => h.type !== 'prod' && norm(h.label) === norm(q));
    const total = productCount(q);
    if (exact) exact.type === 'color' ? pickColor(exact.name) : go(exact.href);
    else if (total) searchAll(q);
    else if (hits.length) hits[0].type === 'color' ? pickColor(hits[0].name) : go(hits[0].href);
    else { input.select(); }
  });
  body.addEventListener('click', e => {
    const color = e.target.closest('[data-color]');
    if (color) { pickColor(color.dataset.color); return; }
    const fill = e.target.closest('[data-fill]'), del = e.target.closest('[data-del]'), clr = e.target.closest('[data-clear]'), link = e.target.closest('a[href]');
    if (fill) { input.value = fill.dataset.fill; render(); input.focus(); }
    else if (del) { store.set(RKEY, recent().filter(r => r !== del.dataset.del)); render(); input.focus(); }
    else if (clr) { store.set(RKEY, []); render(); input.focus(); }
    else if (link) {
      if (link.hasAttribute('data-save')) remember(input.value);
      const all = link.classList.contains('sx-all') && PM.onSearch;
      if (all) { e.preventDefault(); searchAll(new URL(link.href).searchParams.get('q')); } else closeOverlay(true);
    }
  });
  // on phones, scrolling the results puts the keyboard away so they can be seen
  body.addEventListener('touchmove', () => { if (document.activeElement === input) input.blur(); }, { passive: true });

  function open() {
    if (!input.value && /catalogo\.html$/.test(location.pathname)) input.value = new URLSearchParams(location.search).get('q') || '';
    render();
    openOverlay('search', '#search-input');
    requestAnimationFrame(() => input.select());
  }
  $('#search-btn').addEventListener('click', open);
  $('#drawer-search')?.addEventListener('click', open);
  $('#search-close').addEventListener('click', () => closeOverlay());
  addEventListener('keydown', e => {
    const t = e.target, typing = t.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    if (((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey)) {
      if (!box.hidden) { input.focus(); input.select(); } else open();
      e.preventDefault();
    }
  });
  desktopMQ.addEventListener('change', () => { if (!box.hidden) render(); });
})();
