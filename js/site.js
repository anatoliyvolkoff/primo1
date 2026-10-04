/* PriMo Nails – shared behaviour for every page: header, overlays, cart, product cards, footer, wayfinding.
   Page scripts use the helpers exposed on window.PM. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopMQ = matchMedia('(min-width: 1024px)');
  const smooth = () => (reduceMotion ? 'auto' : 'smooth');
  const money = n => '€' + n.toFixed(2).replace('.', ',');
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  /* Calls fn once a burst of events has been quiet for `ms` (programmatic smooth scrolls fire many scroll events). */
  const settle = (fn, ms = 140) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

  // ---------- data ----------
  const PRODUCT = { name: '№112 Ultramarine Glow', meta: 'Semipermanente · 12 ml', price: 155 };
  const FREE_SHIPPING = 199;                                   // matches the "Spedizione gratuita a partire da 199€" bar
  const SHADES = ['gold', 'gold', 'rose', 'night', 'blue', 'gold'];
  const EXTRA = ['rose', 'night', 'blue', 'gold', 'rose'];
  const SHADE_IMG = [...SHADES, ...EXTRA];
  const MOODS = [['b & w', 'bw'], ['grigio', 'grigio'], ['nude', 'nude'], ['rosa', 'rosa'], ['rosso', 'rosso'], ['bordeaux', 'bordeaux'], ['lampone', 'lampone'],
    ['fucsia', 'fucsia'], ['lilla', 'lilla'], ['cioccolato', 'cioccolato'], ['glitter', 'glitter'], ['blu', 'blu'], ['verde', 'verde'], ['giallo', 'giallo']];

  // ---------- catalogue data (one product photo in the design; names and shades follow its swatch labels). Used by the catalogue, product page and search. ----------
  const COLORS = [['bw', 'b & w', 'linear-gradient(90deg,#040404 50%,#f4f4f4 50%)'], ['grigio', 'grigio', '#8a8d91'], ['nude', 'nude', '#e3c2b0'], ['rosa', 'rosa', '#f49ac1'],
    ['rosso', 'rosso', '#d91a2a'], ['bordo', 'bordo', '#6b0f1a'], ['marsala', 'marsala', '#b52857'], ['magenta', 'magenta', '#e0007b'],
    ['viola', 'viola', '#9b6bce'], ['marrone', 'marrone', '#4a2518'], ['blu', 'blu', '#2b429f'], ['verde', 'verde', '#559e38'], ['oy', 'O & Y', 'linear-gradient(90deg,#feda00 50%,#fe8c00 50%)']];
  const MOOD_TO_COLOR = { 'b & w': 'bw', grigio: 'grigio', nude: 'nude', rosa: 'rosa', rosso: 'rosso', bordeaux: 'bordo', lampone: 'marsala', fucsia: 'magenta', lilla: 'viola', cioccolato: 'marrone', glitter: 'nude', blu: 'blu', verde: 'verde', giallo: 'oy' };
  const COLLS = [['autumn', 'Autumn collection'], ['winter', 'Winter collection'], ['spring', 'Spring collection'], ['summer', 'Summer collection']];
  const FX = [['shimmer', 'Shimmer'], ['holo', 'Olografico']];
  const NAMES = ['Ultramarine Glow', 'Night Blue', 'Emerald Blue', 'Viola Blue', 'Ocean Blue', 'Azure', 'Rosa Antico', 'Nude Velvet', 'Rosso Milano', 'Bordeaux', 'Lilla Soft', 'Cacao', 'Verde Salvia', 'Sole d’Estate', 'Grafite', 'Magenta Pop'];
  const COLOR_OF = ['blu', 'blu', 'verde', 'viola', 'blu', 'blu', 'rosa', 'nude', 'rosso', 'bordo', 'viola', 'marrone', 'verde', 'oy', 'grigio', 'magenta'];
  const CATS = ['semipermanente', 'gel', 'base', 'top', 'acrygel', 'preparatori', 'nail-art', 'care', 'kit', 'accessori'];
  const CAT_LABEL = { semipermanente: 'Semipermanente', gel: 'Gel', base: 'Base', top: 'Top', acrygel: 'Acrygel', preparatori: 'Preparatori', 'nail-art': 'Nail art', care: 'Care', kit: 'Kit', accessori: 'Accessori' };
  const PRODUCTS = Array.from({ length: 96 }, (_, i) => {
    const n = i % NAMES.length;
    return {
      id: i, num: 112, name: 'Ultramarine Glow', shade: NAMES[n], color: COLOR_OF[n], coll: COLLS[i % 4][0], fx: i % 6 === 0 ? 'holo' : i % 3 === 0 ? 'shimmer' : null,
      cat: i % 5 === 4 ? CATS[(i / 5 | 0) % CATS.length] : 'semipermanente', price: 14.99, pop: (i * 37) % 96, isNew: i % 7 === 0,
    };
  });
  // the four season kits; Inverno uses the rendered swatches from the design, the others a glossy CSS swatch in their palette
  const KITS = {
    inverno: { tab: 'Inverno', name: 'Kit Collezione Invernale', glow: '#2f80e9', shades: [['night', 'Night Blue'], ['emerald', 'Emerald Blue'], ['viola', 'Viola Blue'], ['ocean', 'Ocean Blue'], ['ocean', 'Azure'], ['ocean', 'Cobalto'], ['ocean', 'Zaffiro'], ['ocean', 'Oltremare'], ['ocean', 'Indaco']], all: '#2e3a8f' },
    primavera: { tab: 'Primavera', name: 'Kit Collezione Primaverile', glow: '#e5668f', shades: [['#f6c9d6', 'Cipria'], ['#e98aa8', 'Peonia'], ['#f3b8a0', 'Pesca'], ['#d9b6e0', 'Lilla'], ['#c7d9a8', 'Menta'], ['#f4a3bd', 'Rosa'], ['#e7738f', 'Fragola'], ['#f0c7b5', 'Nude'], ['#c9a1d4', 'Glicine']], all: '#d9879f' },
    estate: { tab: 'Estate', name: 'Kit Collezione Estiva', glow: '#44c232', shades: [['#ff8a5c', 'Corallo'], ['#ffc247', 'Mango'], ['#f2545b', 'Anguria'], ['#6cc551', 'Lime'], ['#3fb6b2', 'Laguna'], ['#ff6f91', 'Flamingo'], ['#ffd166', 'Sole'], ['#2ec4b6', 'Turchese'], ['#ef476f', 'Lampone']], all: '#e0743d' },
    autunno: { tab: 'Autunno', name: 'Kit Collezione Autunnale', glow: '#f5a623', shades: [['#e9860f', 'Zucca'], ['#e1332a', 'Acero'], ['#8c3a12', 'Castagna'], ['#f0b429', 'Ocra'], ['#c2521e', 'Ruggine'], ['#a8391f', 'Mattone'], ['#6b4a2b', 'Cacao'], ['#d8a15a', 'Caramello'], ['#7a2e2e', 'Vinaccia']], all: '#b5541c' },
  };
  const CATALOG = { COLORS, MOOD_TO_COLOR, COLLS, FX, NAMES, COLOR_OF, CATS, CAT_LABEL, PRODUCTS, KITS };

  // ---------- toast ----------
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }
  // links/buttons whose destination isn't part of the supplied designs
  document.addEventListener('click', e => {
    if (e.target.closest('[data-todo]')) { e.preventDefault(); toast('Prototype: questa pagina non è ancora disegnata'); }
    const go = e.target.closest('[data-go]');
    if (go) {
      const target = $(go.dataset.go);
      if (target) target.scrollIntoView({ behavior: smooth() });
      else if (go.dataset.href) location.href = go.dataset.href;
    }
  });
  /* In-page links (#id) smooth-scroll when the target is on this page. */
  const jumpTo = href => {
    const id = href.split('#')[1], target = id && document.getElementById(id);
    const samePage = !href.split('#')[0] || location.pathname.endsWith(href.split('#')[0]);
    if (target && samePage) { target.scrollIntoView({ behavior: smooth() }); return true; }
    return false;
  };

  // ---------- overlays: one at a time, focus moved in and restored, page behind is inert ----------
  const scrim = $('#scrim');
  const overlays = { drawer: $('#drawer'), search: $('#search'), cart: $('#cart') };
  const inertTargets = () => [$('.topbar'), $('#top'), $('.footer'), $('#totop')].filter(Boolean);
  let openName = null, returnFocus = null;
  function openOverlay(name, focusSel) {
    if (openName) closeOverlay(true);
    returnFocus = document.activeElement;
    overlays[name].hidden = scrim.hidden = false;
    root.classList.add('lock');
    inertTargets().forEach(n => { n.inert = true; });
    openName = name;
    if (name === 'drawer') $('#menu-btn').setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => (focusSel ? $(focusSel, overlays[name]) : $('button, input, a', overlays[name]))?.focus({ preventScroll: true }));
  }
  function closeOverlay(silent) {
    if (!openName) return;
    overlays[openName].hidden = scrim.hidden = true;
    root.classList.remove('lock');
    inertTargets().forEach(n => { n.inert = false; });
    $('#menu-btn').setAttribute('aria-expanded', 'false');
    openName = null;
    if (!silent && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  }
  scrim.addEventListener('click', () => closeOverlay());
  $('#menu-btn').onclick = () => openOverlay('drawer', '#drawer-close');
  $('#drawer-close').onclick = () => closeOverlay();
  $('#cart-btn').onclick = () => openOverlay('cart', '#cart-close');
  $('#cart-close').onclick = () => closeOverlay();
  overlays.drawer.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a) return;
    if (jumpTo(a.getAttribute('href'))) { e.preventDefault(); closeOverlay(true); }
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (openName) closeOverlay(); else langMenu.hidden = true;
  });

  // ---------- language ----------
  const langBtn = $('#lang-btn'), langMenu = $('#lang-menu');
  langBtn.onclick = e => { e.stopPropagation(); langMenu.hidden = !langMenu.hidden; langBtn.setAttribute('aria-expanded', !langMenu.hidden); };
  langMenu.onclick = e => {
    const li = e.target.closest('li'); if (!li) return;
    langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false');
    if (li.dataset.lang !== 'IT') toast('Prototype: per ora il sito è disponibile solo in italiano');   // selection stays on IT so the label never lies
  };
  document.addEventListener('click', () => { langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false'); });

  // ---------- cart (persisted, shows free-shipping progress) ----------
  let cart = store.get('primo.cart.v1', []).filter(l => Number.isInteger(l.shade) && l.shade >= 0 && l.shade < SHADE_IMG.length && l.qty > 0);
  const cartCount = () => cart.reduce((a, l) => a + l.qty, 0);
  const cartTotal = () => cart.reduce((a, l) => a + l.qty * PRODUCT.price, 0);
  function renderBadge(bump) {
    const n = cartCount(), badge = $('#cart-n');
    badge.hidden = n === 0; badge.textContent = n;
    $('#cart-btn').setAttribute('aria-label', n ? `Carrello, ${n} ${n === 1 ? 'articolo' : 'articoli'}` : 'Carrello');
    if (bump) { badge.style.animation = 'none'; badge.offsetWidth; badge.style.animation = ''; }
  }
  function renderCart() {
    const n = cartCount(), total = cartTotal(), left = Math.max(0, FREE_SHIPPING - total);
    $('#cart-list').innerHTML = cart.map(l => `<li class="ci">
      <img src="img/product.jpg" alt="" width="64" height="64">
      <div><p class="ci-name">${PRODUCT.name}</p>
        <p class="ci-meta">${PRODUCT.meta}</p>
        <p class="ci-meta"><span class="ci-dot" style="background-image:url(img/shade-${SHADE_IMG[l.shade]}.jpg)"></span>Tonalità ${l.shade + 1}</p>
        <p class="ci-price">${money(PRODUCT.price * l.qty)}</p></div>
      <div class="qty" role="group" aria-label="Quantità">
        <button data-shade="${l.shade}" data-d="-1" aria-label="Diminuisci quantità">−</button><span aria-live="polite">${l.qty}</span><button data-shade="${l.shade}" data-d="1" aria-label="Aumenta quantità">+</button></div></li>`).join('');
    $('#cart-list').hidden = $('#cart-ship').hidden = $('#cart-foot').hidden = n === 0;
    $('#cart-empty').hidden = n > 0;
    $('#cart-total').textContent = money(total);
    $('#cart-ship').classList.toggle('done', n > 0 && left === 0);
    $('#cart-ship-txt').innerHTML = left ? `Ti mancano <b>${money(left)}</b> per la spedizione gratuita` : '<b>Spedizione gratuita</b> sbloccata';
    $('#cart-ship-fill').style.width = Math.min(100, total / FREE_SHIPPING * 100) + '%';
  }
  function saveCart(bump) { store.set('primo.cart.v1', cart); renderBadge(bump); renderCart(); }
  function addToCart(shade = 0, qty = 1) {
    const line = cart.find(l => l.shade === shade);
    line ? (line.qty += qty) : cart.push({ shade, qty });
    saveCart(true);
  }
  $('#cart-list').addEventListener('click', e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const line = cart.find(l => l.shade === +b.dataset.shade); if (!line) return;
    line.qty += +b.dataset.d;
    if (line.qty <= 0) { cart = cart.filter(l => l !== line); toast('Articolo rimosso'); }
    saveCart(false);
    if (cart.length) $(`[data-shade="${b.dataset.shade}"][data-d="${b.dataset.d}"]`, overlays.cart)?.focus({ preventScroll: true });
  });
  $('#cart-shop').onclick = () => {
    closeOverlay(true);
    const best = $('#bestsellers') || $('#grid');
    if (best) best.scrollIntoView({ behavior: smooth() }); else location.href = 'catalogo.html';
  };
  $('#cart-checkout').onclick = () => toast('Prototype: il checkout non è ancora disegnato');
  addEventListener('storage', e => { if (e.key === 'primo.cart.v1') { cart = store.get('primo.cart.v1', []); renderBadge(false); renderCart(); } });
  renderBadge(false); renderCart();

  // ---------- rail position indicator ----------
  function attachProgress(rail) {
    const bar = document.createElement('div');
    bar.className = 'rprog'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
    rail.after(bar);
    const thumb = bar.firstElementChild;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      bar.hidden = max <= 4 || rail.classList.contains('grid');
      const w = Math.max(.2, rail.clientWidth / rail.scrollWidth), p = max > 0 ? Math.min(1, rail.scrollLeft / max) : 0;
      thumb.style.width = (w * 100) + '%';
      thumb.style.transform = `translateX(${p * (1 / w - 1) * 100}%)`;
    };
    rail.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(rail);
    rail._progress = update; update();
  }

  // ---------- product cards ----------
  const shadeBtn = (i, sel, extra = false) => `<button class="sh${extra ? ' pop extra' : ''}" data-i="${i}" style="background-image:url(img/shade-${SHADE_IMG[i]}.jpg);--i:${i - 6}" aria-label="Tonalità ${i + 1}" aria-pressed="${sel}"></button>`;
  const productCard = () => `
    <article class="pcard">
      <a class="pimg" href="prodotto.html" aria-label="№112 Ultramarine Glow – dettagli"><img src="img/product.jpg" alt="Nº112 Ultramarine Glow, gel polish semipermanente" loading="lazy" decoding="async" draggable="false"><span class="disc" aria-label="Sconto 28%">28%</span></a>
      <div class="pbody">
        <h3><a href="prodotto.html"><span>№112</span><span>Ultramarine Glow</span></a></h3>
        <p class="type">SEMIPERMANENTE</p><p class="ml">12 ml</p>
        <p class="price" aria-label="€155,00, prezzo originale €211,00"><b>€155,00</b><s>€211,00</s></p>
        <div class="shades" role="group" aria-label="Tonalità">${SHADES.map((_, i) => shadeBtn(i, i === 0)).join('')}<button class="plus" aria-expanded="false" aria-label="Mostra altre 5 tonalità">+5</button></div>
        <button class="add" lang="en" aria-label="Aggiungi al carrello – №112 Ultramarine Glow">add to cart</button>
      </div>
    </article>`;
  const fillRail = (rail, n = 6) => { rail.innerHTML = Array.from({ length: n }, productCard).join(''); rail.scrollLeft = 0; rail._progress && rail._progress(); };

  function togglePlus(card, plus) {
    const open = plus.getAttribute('aria-expanded') !== 'true';
    plus.setAttribute('aria-expanded', open);
    plus.textContent = open ? '−' : '+5';
    plus.setAttribute('aria-label', open ? 'Mostra meno tonalità' : 'Mostra altre 5 tonalità');
    if (open) plus.insertAdjacentHTML('beforebegin', EXTRA.map((_, k) => shadeBtn(6 + k, false, true)).join(''));
    else {
      const gone = $$('.sh.extra', card);
      if (gone.some(b => b.getAttribute('aria-pressed') === 'true')) $('.sh[data-i="0"]', card).setAttribute('aria-pressed', 'true');
      gone.forEach(b => b.remove());
    }
  }
  /* "Added" feedback on any add-to-cart button: label swaps briefly, then restores. */
  function flashAdded(btn, okText = '✓ aggiunto') {
    if (btn.classList.contains('ok')) return false;
    const label = btn.getAttribute('aria-label'), html = btn.innerHTML;
    btn.classList.add('ok'); btn.textContent = okText; btn.setAttribute('aria-label', 'Aggiunto al carrello'); buzz(12);
    setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = html; if (label) btn.setAttribute('aria-label', label); else btn.removeAttribute('aria-label'); }, 1400);
    return true;
  }
  document.addEventListener('click', e => {
    const card = e.target.closest('.pcard, .gcard'); if (!card) return;
    const sh = e.target.closest('.sh'), plus = e.target.closest('.plus'), add = e.target.closest('.add');
    if (sh) { $$('.sh', card).forEach(b => b.setAttribute('aria-pressed', b === sh)); buzz(6); }
    else if (plus) togglePlus(card, plus);
    else if (add && !add.classList.contains('ok')) {
      addToCart(+($('.sh[aria-pressed="true"]', card)?.dataset.i ?? 0));
      flashAdded(add);
    }
  });

  // ---------- marquees ----------
  const ICON = {
    ship: '<svg viewBox="0 0 32 32"><path d="M3 9h16v12H3zM19 13h5l4 4v4h-9"/><circle cx="8.5" cy="23.5" r="2.5"/><circle cx="23" cy="23.5" r="2.5"/><path d="M1 12.5h5M1 16h4"/></svg>',
    free: '<svg viewBox="0 0 24 24"><path d="M12 2.5 4.5 5.5v6c0 4.500 3 8 7.500 10 4.500-2 7.500-5.500 7.500-10v-6Z"/><path d="m8.500 12 2.500 2.500 4.500-5"/></svg>',
  };
  $$('.marquee').forEach(m => {
    const one = m.dataset.kind === 'ship'
      ? `<span class="mq-item">${ICON.ship}<span>Spedizione gratuita a partire da <em>199€</em></span></span>`
      : `<span class="mq-item">${ICON.free}<span>TPO &amp; HEMA <em>FREE</em></span></span>`;
    const n = m.dataset.kind === 'ship' ? 5 : 8;
    m.innerHTML = `<div class="mq-track">${one.repeat(n)}${one.repeat(n)}</div>`;
    $('.mq-track', m).style.animationDuration = m.dataset.kind === 'ship' ? '44s' : '48s';
  });
  // pause everything that animates while it's off-screen (battery, and less to compete for attention)
  const visIO = new IntersectionObserver(ents => ents.forEach(en => {
    en.target.classList.toggle('off', !en.isIntersecting);
    en.target.dispatchEvent(new CustomEvent('visibility', { detail: en.isIntersecting }));
  }), { rootMargin: '60px' });
  $$('.marquee, [data-animated]').forEach(el => visIO.observe(el));

  // ---------- footer: accordion on phones (one open at a time), always-open columns on desktop ----------
  const accs = $$('#acc details');
  accs.forEach(d => d.addEventListener('toggle', () => {
    if (desktopMQ.matches) return;
    if (d.open) accs.forEach(o => { if (o !== d) o.open = false; });
  }));
  accs.forEach(d => $('summary', d).addEventListener('click', e => { if (desktopMQ.matches) e.preventDefault(); }));
  const syncFooter = () => accs.forEach(d => { d.open = desktopMQ.matches; });
  desktopMQ.addEventListener('change', syncFooter); syncFooter();
  $('#acc').addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (a && jumpTo(a.getAttribute('href'))) e.preventDefault();
  });

  // ---------- page progress, back-to-top, and "where am I" in the menu ----------
  const progress = $('#progress'), totop = $('#totop');
  let ticking = false, spyCur = null;
  function onPageScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, max = root.scrollHeight - innerHeight;
      progress.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      totop.classList.toggle('show', y > innerHeight * 1.2);
      const sections = $$('main [id]').filter(s => $(`#drawer a[href="#${s.id}"]`));
      let cur = null;
      for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * .4) cur = s.id;
      if (cur !== spyCur) {
        spyCur = cur;
        $$('#drawer a').forEach(a => (a.getAttribute('href') === '#' + cur ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      }
    });
  }
  addEventListener('scroll', onPageScroll, { passive: true }); addEventListener('resize', onPageScroll); onPageScroll();
  totop.onclick = () => { scrollTo({ top: 0, behavior: smooth() }); $('#top').focus({ preventScroll: true }); };

  // ---------- mouse users: drag any carousel (touch and trackpads already scroll natively) ----------
  function dragScroll(el) {
    let down = false, moved = false, sx = 0, sl = 0, suppress = false;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || el.scrollWidth <= el.clientWidth + 2) return;
      down = true; moved = false; sx = e.clientX; sl = el.scrollLeft;
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; el.classList.add('dragging'); }
      if (moved) el.scrollLeft = sl - dx;
    });
    const end = () => {
      if (!down) return; down = false;
      if (moved) { el.classList.remove('dragging'); suppress = true; setTimeout(() => { suppress = false; }, 0); }
    };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    el.addEventListener('click', e => { if (suppress) { e.stopPropagation(); e.preventDefault(); } }, true);
    el.addEventListener('dragstart', e => e.preventDefault());
  }

  /* Mark the header link for the current page. */
  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.dnav a, .drawer a').forEach(a => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  const PM = window.PM = window.PM || {};
  Object.assign(PM, {
    $, $$, root, reduceMotion, finePointer, desktopMQ, smooth, money, buzz, store, settle,
    PRODUCT, SHADES, EXTRA, SHADE_IMG, MOODS, CATALOG, toast, openOverlay, closeOverlay, addToCart, flashAdded,
    attachProgress, productCard, fillRail, dragScroll, jumpTo,
  });
  /* Page scripts run after this file; they call PM.ready() so shared setup that depends on their DOM runs last. */
  PM.ready = () => {
    $$('[data-products]').forEach(r => { if (!r.children.length) fillRail(r, +r.dataset.count || 6); if (!r._progress) attachProgress(r); });
    if (finePointer) $$('.rail, .mood-row, .t-track, .hero-track, .s-track, [data-drag]').forEach(el => { if (!el._drag) { el._drag = 1; dragScroll(el); } });
    $$('.marquee, [data-animated]').forEach(el => visIO.observe(el));
    onPageScroll();
  };
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
