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
  const FREE_SHIPPING = 199;                                   // matches the "Spedizione gratuita a partire da 199€" bar
  const MOODS = [['b & w', 'bw'], ['grigio', 'grigio'], ['nude', 'nude'], ['rosa', 'rosa'], ['rosso', 'rosso'], ['bordeaux', 'bordeaux'], ['lampone', 'lampone'],
    ['fucsia', 'fucsia'], ['lilla', 'lilla'], ['cioccolato', 'cioccolato'], ['glitter', 'glitter'], ['blu', 'blu'], ['verde', 'verde'], ['giallo', 'giallo']];

  // ---------- catalogue data, from the PriMo product sheet (PRODUCTS, Google Sheets). Shared by the catalogue, product page, cart, Academy and search. ----------
  const COLORS = [['bw', 'b & w', 'linear-gradient(90deg,#040404 50%,#f4f4f4 50%)'], ['grigio', 'grigio', '#8a8d91'], ['nude', 'nude', '#e3c2b0'], ['rosa', 'rosa', '#f49ac1'],
    ['rosso', 'rosso', '#d91a2a'], ['bordo', 'bordo', '#6b0f1a'], ['marsala', 'marsala', '#b52857'], ['magenta', 'magenta', '#e0007b'],
    ['viola', 'viola', '#9b6bce'], ['marrone', 'marrone', '#4a2518'], ['blu', 'blu', '#2b429f'], ['verde', 'verde', '#559e38'], ['oy', 'O & Y', 'linear-gradient(90deg,#feda00 50%,#fe8c00 50%)']];
  const MOOD_TO_COLOR = { 'b & w': 'bw', grigio: 'grigio', nude: 'nude', rosa: 'rosa', rosso: 'rosso', bordeaux: 'bordo', lampone: 'marsala', fucsia: 'magenta', lilla: 'viola', cioccolato: 'marrone', glitter: 'nude', blu: 'blu', verde: 'verde', giallo: 'oy' };
  const COLLS = [['autumn', 'Autumn collection'], ['winter', 'Winter collection'], ['spring', 'Spring collection'], ['summer', 'Summer collection']];
  const FX = [['shimmer', 'Shimmer'], ['holo', 'Olografico']];
  const CATS = ['semipermanente', 'gel', 'base', 'top', 'acrygel', 'preparatori', 'nail-art', 'care', 'kit', 'accessori'];
  const CAT_LABEL = { semipermanente: 'Semipermanente', gel: 'Gel', base: 'Base', top: 'Top', acrygel: 'Acrygel', preparatori: 'Preparatori', 'nail-art': 'Nail art', care: 'Care', kit: 'Kit', accessori: 'Accessori' };

  /* Swatches: one sprite (img/sw/shades.webp), 10 columns × 11 rows. A cell is [row, col] counted from 1, the sheet's ROW / COL.
     Cells 1–76 are the semipermanente shades in number order (01 … 173), then the gel and acrygel colours. */
  const SPRITE = 'img/sw/shades.webp';
  const swatchBg = ([r, c]) => `background:url(${SPRITE}) ${((c - 1) / 9 * 100).toFixed(3)}% ${((r - 1) / 10 * 100).toFixed(3)}%/1000% 1100% no-repeat`;
  const cellOf = i => [(i / 10 | 0) + 1, i % 10 + 1];

  // semipermanente shades: number (the swatch file's name), colour filter, effect (s = shimmer, h = holographic), and a descriptive colour name
  // (the sheet has no names for these yet)
  const SEMI = `01 bw - Nero|02 bw - Bianco|03 grigio - Grigio Scuro|04 grigio - Grigio Azzurro|011 nude - Nude|012 nude - Malva|013 viola - Lilla Grigio|021 viola - Lilla|022 magenta - Prugna|023 viola - Prugna Scuro|
024 marsala - Rosa Antico|025 rosa - Rosa|026 rosa - Rosa Cipria|031 marrone - Cioccolato|033 bordo - Rosso Scuro|034 rosso - Rosso|035 rosso - Rosso Vivo|036 rosso - Rosso Classico|037 rosso - Rosso Fuoco|038 rosso - Rosso Ciliegia|
039 rosso - Rosso Lampone|041 marrone - Cacao|042 marrone - Marrone|051 nude - Rosa Legno|052 nude - Rosa Legno Chiaro|053 marsala - Lampone|054 bordo - Bordeaux|061 bordo - Mattone|062 marrone - Marrone Scuro|063 marrone - Caffè|
071 bordo - Bordeaux Scuro|072 rosso - Rosso Rubino|073 marsala - Lampone Scuro|074 rosa - Rosa Intenso|081 viola - Viola|082 viola - Viola Orchidea|083 viola - Indaco|084 viola - Viola Ametista|085 viola - Lavanda|086 viola - Lavanda Chiaro|
087 viola - Lilla Chiaro|091 rosa s Glitter Rosa|092 grigio s Glitter Argento|093 rosso s Glitter Rosso|094 nude s Glitter Oro Rosa|095 rosa s Glitter Rosa Chiaro|096 viola h Glitter Olografico Scuro|097 grigio h Glitter Olografico|101 grigio s Glitter Petrolio|102 nude s Glitter Rame|
103 oy s Glitter Oro|111 bw s Glitter Nero|112 blu s Glitter Blu|121 blu - Blu Notte|122 blu - Petrolio|123 blu - Blu Indaco|124 blu - Blu Cobalto|131 verde - Verde Scuro|132 verde - Verde Oliva|133 verde - Verde Smeraldo|
141 verde - Turchese|142 blu - Turchese Intenso|151 oy - Giallo|152 rosa - Rosa Pastello|153 verde - Verde Mela|154 viola - Lilla Pastello|156 verde - Acquamarina|161 magenta - Rosa Shocking|162 rosso - Rosso Neon|163 oy - Corallo|
164 oy - Arancio|165 rosa - Rosa Corallo|166 rosa - Rosa Confetto|171 verde - Verde Bosco|172 blu - Blu Notte Scuro|173 marrone - Cioccolato Fondente`.split('|').map(x => { const [num, color, fx, ...name] = x.trim().split(' '); return [num, color, fx === '-' ? null : fx, name.join(' ')]; });
  const SEMI_PRICE = 14.99;                                    // not in the product sheet yet
  // the four season kits (not in the sheet): nine shades each, picked by season palette
  const KITS = {
    inverno: { tab: 'Inverno', name: 'Kit Collezione Invernale', glow: '#2f80e9', coll: 'winter', codes: '112 121 122 123 124 142 092 097 172', all: '#1f2f6b' },
    primavera: { tab: 'Primavera', name: 'Kit Collezione Primaverile', glow: '#e5668f', coll: 'spring', codes: '025 026 152 166 021 085 086 154 074', all: '#e48fae' },
    estate: { tab: 'Estate', name: 'Kit Collezione Estiva', glow: '#44c232', coll: 'summer', codes: '151 153 156 141 161 162 163 164 165', all: '#f2703a' },
    autunno: { tab: 'Autunno', name: 'Kit Collezione Autunnale', glow: '#f5a623', coll: 'autumn', codes: '031 033 041 042 051 061 071 102 103', all: '#8c3a12' },
  };
  const COLL_OF = {};
  Object.values(KITS).forEach(k => { k.codes = k.codes.split(' '); k.codes.forEach(c => { COLL_OF[c] = k.coll; }); });
  const PRODUCTS = SEMI.map(([num, color, fx, name], i) => ({
    id: 's' + num, num, name, cat: 'semipermanente', size: '12 ml', price: SEMI_PRICE, color,
    fx: fx === 'h' ? 'holo' : fx === 's' ? 'shimmer' : null, cell: cellOf(i), fam: 'semi-' + color, coll: COLL_OF[num] || null,
  }));
  // the sheet's products: name, category, size, price (€), colour filter, effect, swatch [ROW, COL], family (siblings shown as swatches)
  const SHEET = [
    ['Cleaner Emotion', 'preparatori', '1000 ml', 17], ['Cleaner Emotion', 'preparatori', '100 ml', 5], ['Dehydrator', 'preparatori', '12 ml', 7],
    ['Acid Primer', 'preparatori', '12 ml', 7], ['Acid Free Primer', 'preparatori', '12 ml', 7],
    ['Cuticle Remover', 'care', '15 ml', 11], ['Cuticle Oil Angel', 'care', '15 ml', 7], ['Spray Hand Skincare', 'care', '100 ml', 11],
    ['Hard Base Clear', 'base', '12 ml', 15], ['Hard Base Nude', 'base', '12 ml', 15, 'nude'], ['Hard Base Soft Nude', 'base', '12 ml', 15, 'nude'], ['Hard Base Milky Rose', 'base', '12 ml', 15, 'rosa'],
    ['Top Extra Gloss', 'top', '12 ml', 15], ['Top Extra Matte', 'top', '12 ml', 15], ['Top Holographic', 'top', '12 ml', 15, null, 'holo'],
    ['Top Milky White', 'top', '12 ml', 15, 'bw'], ['Top Natural Nude', 'top', '12 ml', 15, 'nude'],
    ['Gel Architect Crystal Clear', 'gel', '30 g', 21, null, null, [9, 6], 'Gel Architect'], ['Gel Architect Nude 1', 'gel', '30 g', 21, 'nude', null, [9, 4], 'Gel Architect'],
    ['Gel Architect Nude 2', 'gel', '30 g', 21, 'nude', null, [9, 5], 'Gel Architect'], ['Gel Architect Bianco French', 'gel', '30 g', 21, 'bw', null, [9, 7], 'Gel Architect'],
    ['Gel Medio Crystal Clear', 'gel', '30 g', 21, null, null, [9, 8], 'Gel Medio'], ['Gel Medio Nude 1', 'gel', '30 g', 21, 'nude', null, [10, 9], 'Gel Medio'],
    ['Gel Medio Nude 2', 'gel', '30 g', 21, 'nude', null, [10, 10], 'Gel Medio'], ['Gel Medio Light Nude', 'gel', '30 g', 21, 'nude', null, [10, 7], 'Gel Medio'],
    ['Gel Medio Milk Rose', 'gel', '30 g', 21, 'rosa', null, [10, 8], 'Gel Medio'], ['Gel Medio Milk', 'gel', '30 g', 21, 'bw', null, [9, 9], 'Gel Medio'],
    ['Natural Perla', 'gel', '15 g', 15, 'nude', 'shimmer', [11, 1], 'Wedding Perla'], ['Rose Perla', 'gel', '15 g', 15, 'rosa', 'shimmer', [11, 2], 'Wedding Perla'],
    ['White Perla', 'gel', '15 g', 15, 'bw', 'shimmer', [11, 3], 'Wedding Perla'],
    ['Acrygel Clear', 'acrygel', '30 g', 24, null, null, [8, 7], 'Acrygel'], ['Acrygel Nude 1', 'acrygel', '30 g', 24, 'nude', null, [8, 10], 'Acrygel'],
    ['Acrygel Nude 1 Shine', 'acrygel', '30 g', 24, 'nude', 'shimmer', [9, 2], 'Acrygel'], ['Acrygel Milk Rose', 'acrygel', '30 g', 24, 'rosa', null, [8, 9], 'Acrygel'],
    ['Acrygel Milk Apricot', 'acrygel', '30 g', 24, 'nude', null, [8, 8], 'Acrygel'], ['Acrygel Delicate White Shimmer', 'acrygel', '30 g', 24, 'bw', 'shimmer', [9, 1], 'Acrygel'],
    ['Acrygel Sky Shine', 'acrygel', '30 g', 24, 'blu', 'shimmer', [9, 3], 'Acrygel'],
  ];
  SHEET.forEach(([name, cat, size, price, color = null, fx = null, cell = null, fam = null], i) => PRODUCTS.push({ id: 'p' + (i + 1), num: null, name, cat, size, price, color, fx, cell, fam, coll: null }));
  Object.entries(KITS).forEach(([k, v]) => PRODUCTS.push({ id: 'k-' + k, num: null, name: v.name, cat: 'kit', size: '9 × 12 ml', price: 14.99, old: 20.99, color: null, fx: null, cell: null, fam: null, coll: v.coll, kit: k }));
  // popularity and "new" are not in the sheet: a fixed order that mixes categories
  PRODUCTS.forEach((p, i) => { p.pop = (i * 37) % PRODUCTS.length; p.isNew = i % 7 === 0; });
  const BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const BY_NUM = Object.fromEntries(PRODUCTS.filter(p => p.num).map(p => [p.num, p]));
  Object.values(KITS).forEach(k => { k.shades = k.codes.map(c => BY_NUM[c]); });
  const family = p => (p.fam ? PRODUCTS.filter(x => x.fam === p.fam && x.cell) : p.cell ? [p] : []);
  const label = p => (p.num ? `№${p.num} ${p.name}` : p.name);
  // placeholder course catalogue: every course opens the one course page that exists (corso.html)
  const COURSES = [
    { lvl: 'base', tag: 'Livello base', title: 'Onicotecnica Corso Base', txt: 'Le tecniche fondamentali della ricostruzione unghie, dalle basi alla prova su modella.', img: 'course2', pos: '45% 12%', date: '14 settembre', les: 5, rev: '594+' },
    { lvl: 'base', tag: 'Livello base', title: 'Semipermanente perfetto', txt: 'Preparazione, stesura e finitura per un semipermanente pulito e duraturo.', img: 'gallery-dots', pos: '50% 50%', date: '28 settembre', les: 3, rev: '312+' },
    { lvl: 'avanzato', tag: 'Avanzato', title: 'Ricostruzione in gel', txt: 'Apex, strutture e forme stiletto e mandorla per chi lavora già in salone.', img: 'course3', pos: '40% 10%', date: '12 ottobre', les: 6, rev: '428+' },
    { lvl: 'master', tag: 'Master', title: 'Nail art Farfalla', txt: 'La tecnica firma di Irina PriMo: ali dipinte a mano, colore e volume.', img: 'course1', pos: '40% 10%', date: '26 ottobre', les: 4, rev: '207+' },
    { lvl: 'master', tag: 'Master · 2° livello', title: 'Premium Top Master', txt: 'Perfeziona design e velocità con le tecniche esclusive del team PriMo.', img: 'course-wing', pos: '60% 50%', date: '9 novembre', les: 7, rev: '594+' },
  ];
  const CATALOG = { COLORS, MOOD_TO_COLOR, COLLS, FX, CATS, CAT_LABEL, PRODUCTS, BY_ID, BY_NUM, KITS, COURSES, swatchBg, family, label };

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
  const here = location.pathname.split('/').pop() || 'index.html';
  const CART_KEY = 'primo.cart.v2';                          // lines are { id, qty } (v1 held one product's shade index)
  let cart = store.get(CART_KEY, []).filter(l => BY_ID[l.id] && l.qty > 0);
  const cartCount = () => cart.reduce((a, l) => a + l.qty, 0);
  const cartTotal = () => cart.reduce((a, l) => a + l.qty * BY_ID[l.id].price, 0);
  const metaOf = p => `${CAT_LABEL[p.cat]} · ${p.size}`;
  function renderBadge(bump) {
    const n = cartCount(), badge = $('#cart-n');
    badge.hidden = n === 0; badge.textContent = n;
    $('#cart-btn').setAttribute('aria-label', n ? `Carrello, ${n} ${n === 1 ? 'articolo' : 'articoli'}` : 'Carrello');
    if (bump) { badge.style.animation = 'none'; badge.offsetWidth; badge.style.animation = ''; }
  }
  function renderCart() {
    const n = cartCount(), total = cartTotal(), left = Math.max(0, FREE_SHIPPING - total);
    $('#cart-list').innerHTML = cart.map(l => { const p = BY_ID[l.id]; return `<li class="ci">
      <img src="img/product.jpg" alt="" width="64" height="64">
      <div><p class="ci-name">${label(p)}</p>
        <p class="ci-meta">${p.cell ? `<span class="ci-dot" style="${swatchBg(p.cell)}"></span>` : ''}${metaOf(p)}</p>
        <p class="ci-price">${money(p.price * l.qty)}</p></div>
      <div class="qty" role="group" aria-label="Quantità">
        <button data-id="${l.id}" data-d="-1" aria-label="Diminuisci quantità">−</button><span aria-live="polite">${l.qty}</span><button data-id="${l.id}" data-d="1" aria-label="Aumenta quantità">+</button></div></li>`; }).join('');
    $('#cart-list').hidden = $('#cart-ship').hidden = $('#cart-foot').hidden = n === 0;
    $('#cart-empty').hidden = n > 0;
    $('#cart-total').textContent = money(total);
    $('#cart-ship').classList.toggle('done', n > 0 && left === 0);
    $('#cart-ship-txt').innerHTML = left ? `Ti mancano <b>${money(left)}</b> per la spedizione gratuita` : '<b>Spedizione gratuita</b> sbloccata';
    $('#cart-ship-fill').style.width = Math.min(100, total / FREE_SHIPPING * 100) + '%';
  }
  /* Pages that mirror the cart (checkout) listen for 'pm:cart'. */
  const cartChanged = () => document.dispatchEvent(new CustomEvent('pm:cart'));
  function saveCart(bump) { store.set(CART_KEY, cart); renderBadge(bump); renderCart(); cartChanged(); }
  function addToCart(id, qty = 1) {
    if (!BY_ID[id]) return;
    const line = cart.find(l => l.id === id);
    line ? (line.qty += qty) : cart.push({ id, qty });
    saveCart(true);
  }
  $('#cart-list').addEventListener('click', e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const line = cart.find(l => l.id === b.dataset.id); if (!line) return;
    line.qty += +b.dataset.d;
    if (line.qty <= 0) { cart = cart.filter(l => l !== line); toast('Articolo rimosso'); }
    saveCart(false);
    if (cart.length) $(`[data-id="${b.dataset.id}"][data-d="${b.dataset.d}"]`, overlays.cart)?.focus({ preventScroll: true });
  });
  $('#cart-shop').onclick = () => {
    closeOverlay(true);
    const best = $('#bestsellers') || $('#grid');
    if (best) best.scrollIntoView({ behavior: smooth() }); else location.href = 'catalogo.html';
  };
  $('#cart-checkout').onclick = () => { if (here === 'checkout.html') closeOverlay(); else location.href = 'checkout.html'; };
  const cartLines = () => cart.map(l => ({ ...l }));
  function clearCart() { cart = []; saveCart(false); }
  addEventListener('storage', e => { if (e.key === CART_KEY) { cart = store.get(CART_KEY, []).filter(l => BY_ID[l.id]); renderBadge(false); renderCart(); cartChanged(); } });
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

  // ---------- product cards: one product each; its swatches are its family (same line or same colour), picking one turns the card into that product ----------
  const SH_SHOWN = 6;
  const href = p => (p.kit ? `prodotto.html?kit=${p.kit}` : `prodotto.html?id=${p.id}`);
  const shadeBtn = (q, sel, extra = false, k = 0) => `<button class="sh${extra ? ' pop extra' : ''}" data-id="${q.id}" style="${swatchBg(q.cell)};--i:${k}" aria-label="${label(q)}" aria-pressed="${sel}"></button>`;
  const priceHtml = p => `<p class="price${p.old ? '' : ' nosale'}" aria-label="${money(p.price)}${p.old ? `, prezzo originale ${money(p.old)}` : ''}"><b>${money(p.price)}</b>${p.old ? `<s>${money(p.old)}</s>` : ''}</p>`;
  const disc = p => (p.old ? Math.round((1 - p.price / p.old) * 100) : 0);
  /* the family as shown on a card: the product first, then its siblings */
  const cardShades = p => { const f = family(p); return f.length > 1 ? [p, ...f.filter(q => q !== p)] : []; };
  function shadesHtml(p, shown = SH_SHOWN) {
    if (p.kit) return `<div class="shades" aria-hidden="true">${KITS[p.kit].shades.slice(0, shown).map(q => `<span class="sh" style="${swatchBg(q.cell)}"></span>`).join('')}</div>`;
    const f = cardShades(p); if (!f.length) return '';
    const more = f.length - shown;
    return `<div class="shades" role="group" aria-label="Tonalità">${f.slice(0, shown).map((q, i) => shadeBtn(q, i === 0)).join('')}${more > 0 ? `<button class="plus" aria-expanded="false" aria-label="Mostra altre ${more} tonalità">+${more}</button>` : ''}</div>`;
  }
  const productCard = p => `
    <article class="pcard" data-id="${p.id}">
      <a class="pimg" href="${href(p)}" aria-label="${label(p)} – dettagli"><img src="img/product.jpg" alt="${label(p)}, ${CAT_LABEL[p.cat].toLowerCase()}" loading="lazy" decoding="async" draggable="false">${p.old ? `<span class="disc" aria-label="Sconto ${disc(p)}%">${disc(p)}%</span>` : ''}</a>
      <div class="pbody">
        <h3><a href="${href(p)}">${p.num ? `<span>№${p.num}</span>` : ''}<span>${p.name}</span></a></h3>
        <p class="type">${CAT_LABEL[p.cat].toUpperCase()}</p><p class="ml">${p.size}</p>
        ${priceHtml(p)}
        ${shadesHtml(p)}
        <button class="add" lang="en" aria-label="Aggiungi al carrello – ${label(p)}">add to cart</button>
      </div>
    </article>`;
  /* which products a rail shows: best sellers, new, on sale, or related to a product */
  const RAIL = {
    best: () => {                                              // by popularity, taking turns across categories so a rail mixes them
      const left = CATS.map(c => PRODUCTS.filter(p => p.cat === c).sort((x, y) => x.pop - y.pop)).filter(g => g.length), out = [];
      while (left.some(g => g.length)) left.forEach(g => { if (g.length) out.push(g.shift()); });
      return out;
    },
    new: () => PRODUCTS.filter(p => p.isNew),
    sale: () => PRODUCTS.filter(p => p.old),
    foryou: () => mix(29), loved: () => mix(53),
    recent: () => { const seen = store.get('primo.seen', []).map(id => BY_ID[id]).filter(Boolean); return seen.length ? seen : mix(17); },
  };
  const mix = k => PRODUCTS.map((p, i) => [p, (i * k) % PRODUCTS.length]).sort((x, y) => x[1] - y[1]).map(x => x[0]);
  const fillRail = (rail, n = 6, kind = rail.dataset.products || 'best') => {
    rail.innerHTML = (RAIL[kind] || RAIL.best)().slice(0, n).map(productCard).join(''); rail.scrollLeft = 0; rail._progress && rail._progress();
  };
  /* a swatch picked on a card: the card now shows that product (name, price, links) */
  function showOnCard(card, p) {
    card.dataset.id = p.id;
    const h = $('h3 a', card);
    h.innerHTML = `${p.num ? `<span>№${p.num}</span>` : ''}<span>${p.name}</span>`;
    $$('a', card).forEach(a => { if (a.closest('.pimg') || a.closest('h3')) a.href = href(p); });
    $('.pimg', card).setAttribute('aria-label', `${label(p)} – dettagli`);
    $('.price', card).outerHTML = priceHtml(p);
    const ml = $('.ml', card); if (ml) ml.textContent = p.size;
    $('.add', card).setAttribute('aria-label', `Aggiungi al carrello – ${label(p)}`);
    $$('.sh', card).forEach(b => b.setAttribute('aria-pressed', b.dataset.id === p.id));
  }
  function togglePlus(card, plus) {
    const open = plus.getAttribute('aria-expanded') !== 'true';
    const f = cardShades(BY_ID[$('.sh', card).dataset.id]), shown = $$('.sh:not(.extra)', card).length, more = f.length - shown;
    plus.setAttribute('aria-expanded', open);
    plus.textContent = open ? '−' : `+${more}`;
    plus.setAttribute('aria-label', open ? 'Mostra meno tonalità' : `Mostra altre ${more} tonalità`);
    if (open) plus.insertAdjacentHTML('beforebegin', f.slice(shown).map((q, k) => shadeBtn(q, q.id === card.dataset.id, true, k)).join(''));
    else {
      const gone = $$('.sh.extra', card);
      if (gone.some(b => b.getAttribute('aria-pressed') === 'true')) showOnCard(card, f[0]);
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
    if (sh && sh.dataset.id) { showOnCard(card, BY_ID[sh.dataset.id]); buzz(6); }
    else if (plus) togglePlus(card, plus);
    else if (add && !add.classList.contains('ok')) {
      addToCart(card.dataset.id);
      flashAdded(add);
    }
  });

  /* Picking a colour in search: pages can take this over (the home page scrolls to its colour picker, the catalogue filters in place). */
  const PM = window.PM = window.PM || {};
  PM.onColorPick = name => { location.href = 'catalogo.html?colore=' + encodeURIComponent(name); };

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
  $$('.dnav a, .drawer a').forEach(a => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  Object.assign(PM, {
    $, $$, root, reduceMotion, finePointer, desktopMQ, smooth, money, buzz, store, settle,
    MOODS, CATALOG, toast, openOverlay, closeOverlay, addToCart, cartLines, clearCart, flashAdded,
    attachProgress, productCard, priceHtml, shadesHtml, showOnCard, fillRail, dragScroll, jumpTo,
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
