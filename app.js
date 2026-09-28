(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = () => (reduceMotion ? 'auto' : 'smooth');
  const money = n => '€' + n.toFixed(2).replace('.', ',');
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  /* Calls fn once scrolling on `el` has been quiet for `ms` (programmatic smooth scrolls fire many scroll events). */
  const settle = (fn, ms = 140) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

  // ---------- data ----------
  const PRODUCT = { name: '№112 Ultramarine Glow', meta: 'Semipermanente · 12 ml', price: 155 };
  const FREE_SHIPPING = 199;                                   // matches the "Spedizione gratuita a partire da 199€" bar
  const SHADES = ['gold', 'gold', 'rose', 'night', 'blue', 'gold'];
  const EXTRA = ['rose', 'night', 'blue', 'gold', 'rose'];
  const SHADE_IMG = [...SHADES, ...EXTRA];
  const MOODS = [['b & w', 'bw'], ['grigio', 'grigio'], ['nude', 'nude'], ['rosa', 'rosa'], ['rosso', 'rosso'], ['bordeaux', 'bordeaux'], ['lampone', 'lampone'],
    ['fucsia', 'fucsia'], ['lilla', 'lilla'], ['cioccolato', 'cioccolato'], ['glitter', 'glitter'], ['blu', 'blu'], ['verde', 'verde'], ['giallo', 'giallo']];

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
    if (go) $(go.dataset.go).scrollIntoView({ behavior: smooth() });
  });

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
  $('#search-btn').onclick = () => openOverlay('search', '#search-input');
  $('#search-close').onclick = () => closeOverlay();
  $('#cart-btn').onclick = () => openOverlay('cart', '#cart-close');
  $('#cart-close').onclick = () => closeOverlay();
  overlays.drawer.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    e.preventDefault(); closeOverlay(true);
    $(a.getAttribute('href'))?.scrollIntoView({ behavior: smooth() });
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
  function addToCart(shade) {
    const line = cart.find(l => l.shade === shade);
    line ? line.qty++ : cart.push({ shade, qty: 1 });
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
  $('#cart-shop').onclick = () => { closeOverlay(true); $('#bestsellers').scrollIntoView({ behavior: smooth() }); };
  $('#cart-checkout').onclick = () => toast('Prototype: il checkout non è ancora disegnato');
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

  // ---------- hero ----------
  const SLIDES = [
    { img: 'hero1.jpg', h: "L'Eleganza nelle Tue Mani", p: 'Scopri la collezione di gel polish professionali PriMo Nails.', pos: '50% 50%' },
    { img: 'hero2.jpg', h: 'Colori che Raccontano', p: 'Sfumature intense e brillanti per ogni personalità.', pos: '50% 50%' },
    { img: 'hero3.jpg', h: 'Finish Impeccabile', p: 'Top e base professionali, TPO & HEMA free.', pos: '60% 50%' },
  ];
  const heroTrack = $('#hero-track'), heroDots = $('#hero-dots');
  heroTrack.setAttribute('tabindex', '0');
  heroTrack.setAttribute('aria-label', 'In evidenza: usa le frecce per cambiare slide');
  SLIDES.forEach((s, i) => {
    heroTrack.insertAdjacentHTML('beforeend', `<div class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} di ${SLIDES.length}">
      <img src="img/${s.img}" alt="" style="object-position:${s.pos}" decoding="async" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
      <div class="slide-txt"><h1>${s.h}</h1><p>${s.p}</p>
        <div class="btns"><button class="hbtn ghost" lang="en" data-go="#founder">Learn more</button><button class="hbtn solid" data-go="#bestsellers">Scopri la collezione</button></div></div></div>`);
    heroDots.insertAdjacentHTML('beforeend', `<button aria-label="Slide ${i + 1} di ${SLIDES.length}" data-i="${i}"></button>`);
  });
  let heroI = 0, heroNav = -1, heroStopped = reduceMotion, heroVisible = true, heroHover = false;
  const heroSet = i => { heroI = i; $$('button', heroDots).forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current'))); };
  const heroUnlock = settle(() => { heroNav = -1; heroSet(Math.round(heroTrack.scrollLeft / heroTrack.clientWidth)); }, 160);
  function heroGo(i) {
    i = Math.max(0, Math.min(SLIDES.length - 1, i));
    heroNav = i; heroSet(i); heroUnlock();
    heroTrack.scrollTo({ left: i * heroTrack.clientWidth, behavior: smooth() });
  }
  heroTrack.addEventListener('scroll', () => {
    if (heroNav >= 0) { heroUnlock(); return; }                    // ignore in-between positions while a dot/arrow scroll animates
    heroSet(Math.round(heroTrack.scrollLeft / heroTrack.clientWidth));
  }, { passive: true });
  // autoplay: slow, plays through once, and stops for good as soon as the person interacts
  const stopHero = () => { heroStopped = true; };
  ['pointerdown', 'touchstart', 'keydown', 'focusin'].forEach(ev => heroTrack.addEventListener(ev, stopHero, { passive: true }));
  heroDots.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { stopHero(); heroGo(+b.dataset.i); } });
  heroTrack.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) { e.preventDefault(); heroGo(heroI + step); }
  });
  heroTrack.addEventListener('mouseenter', () => { heroHover = true; });
  heroTrack.addEventListener('mouseleave', () => { heroHover = false; });
  setInterval(() => {
    if (heroStopped || !heroVisible || heroHover || document.hidden) return;
    if (heroI >= SLIDES.length - 1) { heroStopped = true; return; }
    heroGo(heroI + 1);
  }, 7000);
  heroSet(0);

  // ---------- products ----------
  const shadeBtn = (i, sel, extra = false) => `<button class="sh${extra ? ' pop extra' : ''}" data-i="${i}" style="background-image:url(img/shade-${SHADE_IMG[i]}.jpg);--i:${i - 6}" aria-label="Tonalità ${i + 1}" aria-pressed="${sel}"></button>`;
  const productCard = () => `
    <article class="pcard">
      <div class="pimg"><img src="img/product.jpg" alt="Nº112 Ultramarine Glow, gel polish semipermanente" loading="lazy" decoding="async" draggable="false"><span class="disc" aria-label="Sconto 28%">28%</span></div>
      <div class="pbody">
        <h3><span>№112</span><span>Ultramarine Glow</span></h3>
        <p class="type">SEMIPERMANENTE</p><p class="ml">12 ml</p>
        <p class="price" aria-label="€155,00, prezzo originale €211,00"><b>€155,00</b><s>€211,00</s></p>
        <div class="shades" role="group" aria-label="Tonalità">${SHADES.map((_, i) => shadeBtn(i, i === 0)).join('')}<button class="plus" aria-expanded="false" aria-label="Mostra altre 5 tonalità">+5</button></div>
        <button class="add" lang="en" aria-label="Aggiungi al carrello – №112 Ultramarine Glow">add to cart</button>
      </div>
    </article>`;
  const fillRail = (rail, n = 6) => { rail.innerHTML = Array.from({ length: n }, productCard).join(''); rail.scrollLeft = 0; rail._progress && rail._progress(); };
  $$('[data-products]').forEach(r => { fillRail(r); attachProgress(r); });

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
  document.addEventListener('click', e => {
    const card = e.target.closest('.pcard'); if (!card) return;
    const sh = e.target.closest('.sh'), plus = e.target.closest('.plus'), add = e.target.closest('.add');
    if (sh) { $$('.sh', card).forEach(b => b.setAttribute('aria-pressed', b === sh)); buzz(6); }
    else if (plus) togglePlus(card, plus);
    else if (add && !add.classList.contains('ok')) {
      addToCart(+($('.sh[aria-pressed="true"]', card)?.dataset.i ?? 0));
      const label = add.getAttribute('aria-label');
      add.classList.add('ok'); add.textContent = '✓ aggiunto'; add.setAttribute('aria-label', 'Aggiunto al carrello'); buzz(12);
      setTimeout(() => { add.classList.remove('ok'); add.textContent = 'add to cart'; add.setAttribute('aria-label', label); }, 1400);
    }
  });

  // best-sellers tabs
  const tabs = $('#bs-tabs');
  const tabList = () => $$('[role=tab]', tabs);
  function placePill() {
    const cur = $('[aria-selected=true]', tabs);
    tabs.style.setProperty('--x', cur.offsetLeft + 'px'); tabs.style.setProperty('--w', cur.offsetWidth + 'px');
  }
  let fillToken = 0;
  function selectTab(b, focus) {
    if (b.getAttribute('aria-selected') === 'true') return;
    tabList().forEach(t => { const on = t === b; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    if (focus) b.focus();
    placePill();
    const rail = $('#bs-rail'), mine = ++fillToken; rail.style.opacity = 0;
    setTimeout(() => { if (mine !== fillToken) return; fillRail(rail, { best: 6, new: 4, sale: 5 }[b.dataset.tab]); rail.style.opacity = 1; }, 160);
  }
  tabList().forEach(t => { t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1; t.setAttribute('aria-controls', 'bs-rail'); });
  tabs.addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) selectTab(b); });
  tabs.addEventListener('keydown', e => {
    const list = tabList(), i = list.indexOf(document.activeElement);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (to === undefined || i < 0) return;
    e.preventDefault(); selectTab(list[(to + list.length) % list.length], true);
  });
  $('#bs-rail').style.transition = 'opacity .16s';
  addEventListener('resize', placePill); document.fonts && document.fonts.ready.then(placePill); placePill();

  // ---------- mood ----------
  const moodRow = $('#mood-row');
  moodRow.innerHTML = MOODS.map(([label, f]) => `<button class="mood-item" data-name="${label}" aria-pressed="false">
    <img src="img/mood-${f}.webp" alt="" width="53" height="125" loading="lazy" decoding="async"><span>${label}</span></button>`).join('');
  attachProgress(moodRow);
  function pickMood(item, { scroll = false } = {}) {
    $$('.mood-item').forEach(m => m.setAttribute('aria-pressed', m === item));
    toast(`Colore: ${item.dataset.name}`);
    if (scroll) {
      $('#mood').scrollIntoView({ behavior: smooth() });
      setTimeout(() => {
        if (moodRow.classList.contains('grid')) item.scrollIntoView({ block: 'center', behavior: smooth() });
        else moodRow.scrollTo({ left: item.offsetLeft - 36, behavior: smooth() });
        item.classList.add('flash'); setTimeout(() => item.classList.remove('flash'), 1900);
      }, reduceMotion ? 0 : 450);
    }
  }
  moodRow.addEventListener('click', e => { const m = e.target.closest('.mood-item'); if (m) pickMood(m); });
  const moodAll = $('#mood-all');
  moodAll.onclick = () => {
    const grid = moodRow.classList.toggle('grid');
    moodAll.textContent = grid ? 'show less' : 'see all'; moodAll.setAttribute('aria-expanded', grid);
    if (!grid) moodRow.scrollLeft = 0;
    moodRow._progress();
  };

  // ---------- search: tap a colour instead of typing ----------
  const chips = $('#search-chips'), searchInput = $('#search-input'), searchHint = $('#search-hint');
  chips.innerHTML = MOODS.map(([label]) => `<button type="button" class="chip" data-name="${label}">${label}</button>`).join('');
  const matches = q => MOODS.map(m => m[0]).filter(n => n.includes(q));
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase(), hits = matches(q);
    $$('.chip', chips).forEach(c => { c.hidden = !hits.includes(c.dataset.name); });
    searchHint.textContent = !q ? 'Scegli un colore:' : hits.length ? 'Colori trovati:' : `Nessun colore per “${q}”`;
  });
  function chooseMood(name) {
    const item = $$('.mood-item').find(m => m.dataset.name === name); if (!item) return;
    closeOverlay(true); searchInput.value = ''; searchInput.dispatchEvent(new Event('input'));
    pickMood(item, { scroll: true });
  }
  chips.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) chooseMood(c.dataset.name); });
  $('#search-form').onsubmit = e => {
    e.preventDefault();
    const q = searchInput.value.trim().toLowerCase(); if (!q) return;
    const hit = matches(q)[0];
    hit ? chooseMood(hit) : toast(`Nessun colore per “${q}”`);
  };

  // ---------- marquees ----------
  const ICON = {
    ship: '<svg viewBox="0 0 32 32"><path d="M3 9h16v12H3zM19 13h5l4 4v4h-9"/><circle cx="8.5" cy="23.5" r="2.5"/><circle cx="23" cy="23.5" r="2.5"/><path d="M1 12.5h5M1 16h4"/></svg>',
    free: '<svg viewBox="0 0 24 24"><path d="M12 2.5 4.5 5.5v6c0 4.500 3 8 7.500 10 4.500-2 7.500-5.500 7.500-10v-6Z"/><path d="m8.500 12 2.500 2.500 4.500-5"/></svg>',
  };
  $$('.marquee').forEach(m => {
    const one = m.dataset.kind === 'ship'
      ? `<span class="mq-item">${ICON.ship}<span>Spedizione gratuita a partire da <em>199€</em></span></span>`
      : `<span class="mq-item">${ICON.free}<span>TPO &amp; HEMA <em>FREE</em></span></span>`;
    m.innerHTML = `<div class="mq-track">${one.repeat(5)}${one.repeat(5)}</div>`;
    $('.mq-track', m).style.animationDuration = m.dataset.kind === 'ship' ? '44s' : '34s';
  });
  // pause everything that animates while it's off-screen (battery, and less to compete for attention)
  const visIO = new IntersectionObserver(ents => ents.forEach(en => {
    if (en.target.classList.contains('hero')) heroVisible = en.isIntersecting;
    else en.target.classList.toggle('off', !en.isIntersecting);
  }), { rootMargin: '60px' });
  $$('.marquee, #seasons, .hero').forEach(el => visIO.observe(el));

  // ---------- The Seasons (design: "The Seasons – Mobile") ----------
  const BASE = ['#ffffff', '#c9c9c9', '#8f8f8f'];
  const SEASONS = [
    { id: 'autumn', color: '#c8742d', cta: '#fcf5eb', isNew: false, shades: ['#e9860f', '#e1332a', '#8c3a12', '#f0b429', '#c2521e', '#a8391f', '#6b4a2b', '#d8a15a'] },
    { id: 'winter', color: '#2f80e9', cta: '#f2f3f7', isNew: false, shades: [...BASE, '#dfe8f5', '#9fb7d8', '#4a6fa5', '#2b2f3a', '#b9a7c9'] },
    { id: 'spring', color: '#e5668f', cta: '#fdf1f5', isNew: false, shades: [...BASE, '#f6c9d6', '#e98aa8', '#f3b8a0', '#c7d9a8', '#d9b6e0'] },
    { id: 'summer', color: '#44c232', cta: '#f2fdec', isNew: true, shades: [...BASE, '#ff8a5c', '#ffc247', '#f2545b', '#6cc551', '#3fb6b2'] },
  ];
  const sState = { active: -1, sel: SEASONS.map(() => 0), expanded: SEASONS.map(() => false) };
  const sec = $('#seasons'), track = $('#track'), dotsEl = $('#dots'), bg = $('#bg'), cta = $('#cta');

  const swRow = s => {
    const open = sState.expanded[s], n = open ? 8 : 3;
    let h = '';
    for (let i = 0; i < n; i++) h += `<button class="sw ${sState.sel[s] === i ? 'sel' : ''} ${open && i >= 3 ? 'pop' : ''}" style="--sw:${SEASONS[s].shades[i]};--i:${i}" data-shade="${i}" aria-label="Shade ${i + 1}" aria-pressed="${sState.sel[s] === i}"></button>`;
    return h + (open ? '' : '<button class="more" data-more aria-label="Show 5 more shades">+5</button>');
  };
  SEASONS.forEach((s, i) => {
    track.insertAdjacentHTML('beforeend', `<article class="s-card" data-i="${i}" style="--c:${s.color}" aria-label="${s.id}">
      <div class="s-photo"><img src="img/${s.id}.jpg" alt="PriMo Nails polish – ${s.id} collection" draggable="false" decoding="async">${s.isNew ? '<span class="s-badge" lang="en">new</span>' : ''}</div>
      <div class="s-meta"><h3 lang="en">${s.id}</h3><div class="s-sw">${swRow(i)}</div></div></article>`);
    dotsEl.insertAdjacentHTML('beforeend', `<button class="s-dot" role="tab" data-i="${i}" aria-label="${s.id}" aria-selected="false"></button>`);
  });
  const sCards = [...track.children], sDots = [...dotsEl.children];

  const leaf = c => `<svg viewBox="0 0 24 24"><path d="M12 1C7 6 3 11 6 16c1.6 2.6 4 3.6 5.2 4.6L11 23h2l-.2-2.4c1.4-1 3.8-2 5.2-4.6 3-5-1-10-6-15Z" fill="${c}"/><path d="M12 5v17" stroke="rgba(90,40,10,.35)" stroke-width=".8"/></svg>`;
  const kinds = {
    autumn: () => ({ cls: '', size: rnd(18, 34), html: leaf(['#e8850f', '#d9542a', '#b8741f', '#cf9a30', '#e8a13b'][Math.random() * 5 | 0]), o: rnd(.5, .85) }),
    winter: () => ({ cls: 'flake', size: rnd(4, 10), html: '', o: rnd(.6, 1) }),
    spring: () => ({ cls: 'petal', size: rnd(9, 15), html: '', o: rnd(.55, .85) }),
    summer: () => ({ cls: 'bubble rise', size: rnd(8, 24), html: '', o: rnd(.5, .85) }),
  };
  SEASONS.forEach(s => {
    const layer = document.createElement('div');
    layer.className = 'bg-layer'; layer.dataset.season = s.id;
    let p = '';
    if (!reduceMotion) for (let i = 0; i < (s.id === 'autumn' ? 14 : 10); i++) {
      const k = kinds[s.id](), dur = rnd(10, 18);
      p += `<i class="p ${k.cls}" style="--x:${rnd(-2, 98).toFixed(1)}%;--s:${k.size.toFixed(1)}px;--dur:${dur.toFixed(1)}s;--delay:${(-rnd(0, dur)).toFixed(1)}s;--sway:${rnd(-70, 70).toFixed(0)}px;--r0:${rnd(-40, 40) | 0}deg;--r1:${rnd(120, 420) | 0}deg;--o:${k.o.toFixed(2)}">${k.html}</i>`;
    }
    layer.innerHTML = `<div class="panel"></div><div class="particles">${p}</div>`;
    bg.appendChild(layer);
  });
  const layers = [...bg.children];

  function setActive(i) {
    if (i === sState.active) return;
    sState.active = i;
    const s = SEASONS[i];
    sec.style.setProperty('--accent', s.color); sec.style.setProperty('--cta-bg', s.cta);
    sCards.forEach((c, k) => c.classList.toggle('active', k === i));
    sDots.forEach((d, k) => d.setAttribute('aria-selected', k === i));
    layers.forEach((l, k) => l.classList.toggle('on', k === i));
    sec.dataset.season = s.id;
  }
  // While a dot/arrow/tap animates the scroll, keep the chosen season instead of flashing through the ones in between.
  let sNav = -1;
  const sUnlock = settle(() => { sNav = -1; onSScroll(); }, 160);
  let raf = 0;
  function onSScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const mid = track.scrollLeft + track.clientWidth / 2;
      const pitch = sCards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 17);
      let best = 0, bestD = Infinity;
      sCards.forEach((c, k) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = k; }
        c.style.setProperty('--t', sec.dataset.idle === 'true' ? 0 : Math.min(1, d / pitch).toFixed(3));
      });
      if (sec.dataset.idle !== 'true' && sNav < 0) setActive(best);
    });
  }
  track.addEventListener('scroll', () => { if (sNav >= 0) sUnlock(); onSScroll(); }, { passive: true });
  addEventListener('resize', onSScroll);

  const centerLeft = i => sCards[i].offsetLeft - (track.clientWidth - sCards[i].offsetWidth) / 2;
  let introTimer;
  function leaveIdle() {
    if (sec.dataset.idle !== 'true') return;
    clearTimeout(introTimer);
    sec.dataset.idle = 'false'; track.classList.remove('free'); onSScroll();
  }
  function sGoTo(i, animate = true) {
    i = Math.max(0, Math.min(SEASONS.length - 1, i));
    leaveIdle();
    sNav = i; setActive(i); sUnlock();
    track.scrollTo({ left: centerLeft(i), behavior: animate && !reduceMotion ? 'smooth' : 'auto' });
  }
  // idle frame: first card sits at the left margin, nothing selected. Settles on "autumn" when the carousel is first seen.
  track.classList.add('free');
  const placeIdle = () => { if (sec.dataset.idle === 'true') { track.scrollLeft = centerLeft(0) + ((track.clientWidth - sCards[0].offsetWidth) / 2 - 24); onSScroll(); } };
  placeIdle(); addEventListener('load', placeIdle);
  new IntersectionObserver((ents, ob) => {
    if (ents.some(e => e.isIntersecting)) { ob.disconnect(); introTimer = setTimeout(() => sGoTo(0), 900); }
  }, { threshold: .5 }).observe($('.s-carousel'));
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev => track.addEventListener(ev, () => { leaveIdle(); sNav = -1; }, { passive: true }));

  dotsEl.addEventListener('click', e => { const d = e.target.closest('.s-dot'); if (d) sGoTo(+d.dataset.i); });
  track.addEventListener('click', e => {
    const card = e.target.closest('.s-card'); if (!card) return;
    const i = +card.dataset.i;
    if (i !== sState.active) { sGoTo(i); return; }
    if (e.target.closest('[data-more]')) { sState.expanded[i] = true; $('.s-sw', card).innerHTML = swRow(i); return; }
    const sw = e.target.closest('.sw');
    if (sw) {
      sState.sel[i] = +sw.dataset.shade;
      $$('.sw', card).forEach(b => { const on = +b.dataset.shade === sState.sel[i]; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
      buzz(8);
    }
  });
  track.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) { e.preventDefault(); sGoTo((sState.active < 0 ? 0 : sState.active) + step); }
  });
  cta.onclick = () => {
    $('#bestsellers').scrollIntoView({ behavior: smooth() });
    selectTab($('[data-tab=best]', tabs));
  };

  // ---------- testimonials ----------
  const t = $('#t-track');
  const star = '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.900 6.100 6.600.900-4.800 4.600 1.200 6.600L12 17.500l-5.900 3.200 1.200-6.600L2.500 9.500l6.600-.9Z"/></svg>';
  t.innerHTML = Array.from({ length: 3 }, (_, i) => `<article class="tcard ${i ? '' : 'active'}">
    <p class="t-name">Maria S.</p><p class="t-role">Nail Artist</p>
    <div class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</div>
    <p class="t-quote">“Uso PriMo Nails da anni nel mio salone. I clienti sono sempre soddisfatti della durata e della brillantezza.”</p></article>`).join('');
  const tCards = [...t.children];
  attachProgress(t);
  t.addEventListener('scroll', () => {
    const atEnd = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;        // the last card can never reach the left edge
    let best = atEnd ? tCards.length - 1 : 0, bd = Infinity;
    if (!atEnd) tCards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - 24 - t.scrollLeft); if (d < bd) { bd = d; best = i; } });
    tCards.forEach((c, i) => c.classList.toggle('active', i === best));
  }, { passive: true });

  // ---------- founder ----------
  const more = $('#f-more'), bio = $('#f-bio');
  more.setAttribute('aria-controls', 'f-bio');
  more.onclick = () => {
    const open = bio.classList.contains('clamp');
    if (open) {
      if (bio.children.length < 2) bio.insertAdjacentHTML('beforeend', "<p>Da oltre vent'anni forma professionisti in tutto il mondo e porta l'eccellenza italiana nel design delle unghie.</p>");
      bio.classList.remove('clamp'); bio.style.maxHeight = bio.scrollHeight + 'px';
    } else { bio.classList.add('clamp'); bio.style.maxHeight = ''; }
    more.textContent = open ? 'LEGGI MENO' : 'LEGGI DI PIU'; more.setAttribute('aria-expanded', open);
  };

  // ---------- courses ----------
  const cal = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="4"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17.500h.01M12 17.500h.01"/></svg>';
  const CROP = { course1: '--iw:118%;--ix:-1%;--iy:-4%', course2: '--iw:118%;--ix:-1%;--iy:-4%', course3: '--iw:118%;--ix:-1%;--iy:-4%' };
  $('#c-list').innerHTML = ['course1', 'course2', 'course3'].map(img => `<article class="ccard">
    <div class="c-img"><img src="img/${img}.jpg" style="${CROP[img]}" alt="Nail art a farfalla" loading="lazy" decoding="async"></div>
    <div class="c-body"><div class="c-rate"><span class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</span><span><b>594+</b> RECENSIONI</span></div>
      <h3 class="c-title">Premium top Master - 2 livello</h3>
      <p class="c-desc">Corso base - PriMo Nails Professional<br>01 livello - 7 lezione</p>
      <p class="c-date">${cal}<span>9 settembre</span></p>
      <button class="c-cta" data-todo>SCOPRI</button></div></article>`).join('');

  // ---------- footer accordion: one open at a time; its links smooth-scroll ----------
  $$('#acc details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) $$('#acc details').forEach(o => { if (o !== d) o.open = false; });
  }));
  $('#acc').addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    e.preventDefault(); $(a.getAttribute('href'))?.scrollIntoView({ behavior: smooth() });
  });

  // ---------- page progress, back-to-top, and "where am I" in the menu ----------
  const sections = ['bestsellers', 'mood', 'new', 'seasons', 'for-you', 'loved', 'community', 'founder', 'courses', 'recent'].map(id => document.getElementById(id));
  const progress = $('#progress'), totop = $('#totop');
  let ticking = false, spyCur = null;
  function onPageScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, max = root.scrollHeight - innerHeight;
      progress.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      totop.classList.toggle('show', y > innerHeight * 1.2);
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
  if (finePointer) $$('.rail, .mood-row, .t-track, .hero-track, .s-track').forEach(dragScroll);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
