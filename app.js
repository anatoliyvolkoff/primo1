(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const scrollBehavior = () => (reduceMotion ? 'auto' : 'smooth');

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  // links/buttons whose destination isn't part of the supplied designs
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-todo]');
    if (el) { e.preventDefault(); toast('Prototype: questa pagina non è ancora disegnata'); }
  });

  // ---------- header: drawer, search, language, cart ----------
  const scrim = $('#scrim'), drawer = $('#drawer'), search = $('#search');
  const openDrawer = () => { drawer.hidden = scrim.hidden = false; $('#menu-btn').setAttribute('aria-expanded', 'true'); };
  const closeOverlays = () => {
    drawer.hidden = scrim.hidden = search.hidden = true;
    $('#menu-btn').setAttribute('aria-expanded', 'false');
  };
  $('#menu-btn').onclick = openDrawer;
  $('#drawer-close').onclick = scrim.onclick = closeOverlays;
  drawer.addEventListener('click', e => { if (e.target.closest('a')) closeOverlays(); });
  $('#search-btn').onclick = () => { search.hidden = scrim.hidden = false; $('#search-input').focus(); };
  $('#search-close').onclick = closeOverlays;
  $('#search-form').onsubmit = e => {
    e.preventDefault();
    const q = $('#search-input').value.trim().toLowerCase();
    if (!q) return;
    const hit = $$('.mood-item').find(m => m.dataset.name.includes(q) || q.includes(m.dataset.name));
    closeOverlays();
    if (hit) { $('#mood').scrollIntoView({ behavior: scrollBehavior() }); $('#mood-row').scrollTo({ left: hit.offsetLeft - 36, behavior: scrollBehavior() }); toast(`Colore trovato: ${hit.dataset.name}`); }
    else toast(`Nessun risultato per “${q}”`);
  };
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeOverlays(); $('#lang-menu').hidden = true; } });

  const langBtn = $('#lang-btn'), langMenu = $('#lang-menu');
  langBtn.onclick = e => { e.stopPropagation(); langMenu.hidden = !langMenu.hidden; langBtn.setAttribute('aria-expanded', !langMenu.hidden); };
  langMenu.onclick = e => {
    const li = e.target.closest('li'); if (!li) return;
    $$('li', langMenu).forEach(x => x.setAttribute('aria-selected', x === li));
    $('#lang-cur').textContent = li.dataset.lang; langMenu.hidden = true; langBtn.setAttribute('aria-expanded', false);
    if (li.dataset.lang !== 'IT') toast('Prototype: solo la versione italiana è disegnata');
  };
  document.addEventListener('click', () => { langMenu.hidden = true; langBtn.setAttribute('aria-expanded', false); });

  let cart = 0;
  function addToCart() {
    cart++; const n = $('#cart-n');
    n.hidden = false; n.textContent = cart;
    n.style.animation = 'none'; n.offsetWidth; n.style.animation = '';
  }
  $('#cart-btn').onclick = () => toast(cart ? `${cart} ${cart === 1 ? 'prodotto' : 'prodotti'} nel carrello` : 'Il carrello è vuoto');

  // ---------- hero ----------
  const SLIDES = [
    { img: 'hero1.jpg', h: "L'Eleganza nelle Tue Mani", p: 'Scopri la collezione di gel polish professionali PriMo Nails.', pos: '50% 50%' },
    { img: 'hero2.jpg', h: 'Colori che Raccontano', p: 'Sfumature intense e brillanti per ogni personalità.', pos: '50% 50%' },
    { img: 'hero3.jpg', h: 'Finish Impeccabile', p: 'Top e base professionali, TPO & HEMA free.', pos: '60% 50%' },
  ];
  const heroTrack = $('#hero-track'), heroDots = $('#hero-dots');
  SLIDES.forEach((s, i) => {
    heroTrack.insertAdjacentHTML('beforeend', `<div class="slide" aria-roledescription="slide" aria-label="${i + 1} di ${SLIDES.length}">
      <img src="img/${s.img}" alt="" style="object-position:${s.pos}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
      <div class="slide-txt"><h1>${s.h}</h1><p>${s.p}</p>
        <div class="btns"><button class="hbtn ghost" data-todo>Learn more</button><button class="hbtn solid" data-go="#bestsellers">Scopri la collezione</button></div></div></div>`);
    heroDots.insertAdjacentHTML('beforeend', `<button aria-label="Slide ${i + 1}" data-i="${i}"></button>`);
  });
  let heroI = 0, heroTimer;
  const heroSet = i => { heroI = i; $$('button', heroDots).forEach((d, k) => d.toggleAttribute('aria-current', k === i)); };
  const heroGo = i => heroTrack.scrollTo({ left: i * heroTrack.clientWidth, behavior: scrollBehavior() });
  heroTrack.addEventListener('scroll', () => heroSet(Math.round(heroTrack.scrollLeft / heroTrack.clientWidth)), { passive: true });
  heroDots.onclick = e => { const b = e.target.closest('button'); if (b) { heroGo(+b.dataset.i); restartHero(); } };
  function restartHero() { clearInterval(heroTimer); if (!reduceMotion) heroTimer = setInterval(() => heroGo((heroI + 1) % SLIDES.length), 5500); }
  ['pointerdown', 'touchstart'].forEach(ev => heroTrack.addEventListener(ev, () => clearInterval(heroTimer), { passive: true }));
  heroTrack.addEventListener('pointerup', restartHero);
  heroSet(0); restartHero();
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (!g) return;
    $(g.dataset.go).scrollIntoView({ behavior: scrollBehavior() });
  });

  // ---------- products ----------
  const SHADES = ['gold', 'gold', 'rose', 'night', 'blue', 'gold'];
  const EXTRA = ['rose', 'night', 'blue', 'gold', 'rose'];
  const shade = (name, i, sel, pop = false) => `<button class="sh${pop ? ' pop' : ''}" style="background-image:url(img/shade-${name}.jpg);--i:${i - 6}" aria-label="Tonalità ${i + 1}" aria-pressed="${sel}"></button>`;
  const productCard = () => `
    <article class="pcard">
      <div class="pimg"><img src="img/product.jpg" alt="Nº112 Ultramarine Glow, gel polish semipermanente" loading="lazy" draggable="false"><span class="disc">28%</span></div>
      <div class="pbody">
        <h3><span>№112</span><span>Ultramarine Glow</span></h3>
        <p class="type">SEMIPERMANENTE</p><p class="ml">12 ml</p>
        <p class="price"><b>€155,00</b><s>€211,00</s></p>
        <div class="shades">${SHADES.map((n, i) => shade(n, i, i === 0)).join('')}<button class="plus" aria-label="Mostra altre 5 tonalità">+5</button></div>
        <button class="add">add to cart</button>
      </div>
    </article>`;
  const fillRail = (rail, n = 6) => { rail.innerHTML = Array.from({ length: n }, productCard).join(''); rail.scrollLeft = 0; };
  $$('[data-products]').forEach(r => fillRail(r));

  document.addEventListener('click', e => {
    const card = e.target.closest('.pcard'); if (!card) return;
    const sh = e.target.closest('.sh'), plus = e.target.closest('.plus'), add = e.target.closest('.add');
    if (sh) { $$('.sh', card).forEach(b => b.setAttribute('aria-pressed', b === sh)); }
    else if (plus) {
      plus.insertAdjacentHTML('beforebegin', EXTRA.map((n, i) => shade(n, 6 + i, false, true)).join(''));
      plus.remove();
    } else if (add && !add.classList.contains('ok')) {
      addToCart(); add.classList.add('ok'); add.textContent = '✓ aggiunto';
      setTimeout(() => { add.classList.remove('ok'); add.textContent = 'add to cart'; }, 1400);
    }
  });

  // best-sellers tabs
  const tabs = $('#bs-tabs'), pill = $('.tab-pill', tabs);
  function placePill() {
    const cur = $('[aria-selected=true]', tabs);
    tabs.style.setProperty('--x', cur.offsetLeft + 'px'); tabs.style.setProperty('--w', cur.offsetWidth + 'px');
  }
  tabs.addEventListener('click', e => {
    const b = e.target.closest('[role=tab]'); if (!b || b.getAttribute('aria-selected') === 'true') return;
    $$('[role=tab]', tabs).forEach(t => t.setAttribute('aria-selected', t === b));
    placePill();
    const rail = $('#bs-rail'); rail.style.opacity = 0;
    setTimeout(() => { fillRail(rail, { best: 6, new: 4, sale: 5 }[b.dataset.tab]); rail.style.opacity = 1; }, 160);
  });
  $('#bs-rail').style.transition = 'opacity .16s';
  addEventListener('resize', placePill); document.fonts && document.fonts.ready.then(placePill); placePill();

  // ---------- mood ----------
  const MOODS = [['b & w', 'bw'], ['grigio', 'grigio'], ['nude', 'nude'], ['rosa', 'rosa'], ['rosso', 'rosso'], ['bordeaux', 'bordeaux'], ['lampone', 'lampone'],
    ['fucsia', 'fucsia'], ['lilla', 'lilla'], ['cioccolato', 'cioccolato'], ['glitter', 'glitter'], ['blu', 'blu'], ['verde', 'verde'], ['giallo', 'giallo']];
  const moodRow = $('#mood-row');
  moodRow.innerHTML = MOODS.map(([label, f]) => `<button class="mood-item" data-name="${label}">
    <img src="img/mood-${f}.webp" alt="" width="53" height="125" loading="lazy"><span>${label}</span></button>`).join('');
  moodRow.addEventListener('click', e => { const m = e.target.closest('.mood-item'); if (m) toast(`Colore: ${m.dataset.name}`); });
  const moodAll = $('#mood-all');
  moodAll.removeAttribute('data-todo');
  moodAll.onclick = () => {
    const grid = moodRow.classList.toggle('grid');
    moodAll.textContent = grid ? 'show less' : 'see all';
    if (!grid) moodRow.scrollLeft = 0;
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
    $('.mq-track', m).style.animationDuration = m.dataset.kind === 'ship' ? '26s' : '20s';
  });

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
    const n = sState.expanded[s] ? 8 : 3;
    let h = '';
    for (let i = 0; i < n; i++) h += `<button class="sw ${sState.sel[s] === i ? 'sel' : ''} ${sState.expanded[s] && i >= 3 ? 'pop' : ''}" style="--sw:${SEASONS[s].shades[i]};--i:${i}" data-shade="${i}" aria-label="Shade ${i + 1}" aria-pressed="${sState.sel[s] === i}"></button>`;
    return h + (sState.expanded[s] ? '' : '<button class="more" data-more aria-label="Show 5 more shades">+5</button>');
  };
  SEASONS.forEach((s, i) => {
    track.insertAdjacentHTML('beforeend', `<article class="s-card" data-i="${i}" style="--c:${s.color}" aria-label="${s.id}">
      <div class="s-photo"><img src="img/${s.id}.jpg" alt="PriMo Nails polish – ${s.id} collection" draggable="false">${s.isNew ? '<span class="s-badge">new</span>' : ''}</div>
      <div class="s-meta"><h3>${s.id}</h3><div class="s-sw">${swRow(i)}</div></div></article>`);
    dotsEl.insertAdjacentHTML('beforeend', `<button class="s-dot" role="tab" data-i="${i}" aria-label="${s.id}" aria-selected="false"></button>`);
  });
  const sCards = [...track.children], sDots = [...dotsEl.children];

  const leaf = c => `<svg viewBox="0 0 24 24"><path d="M12 1C7 6 3 11 6 16c1.6 2.6 4 3.6 5.2 4.6L11 23h2l-.2-2.4c1.4-1 3.8-2 5.2-4.6 3-5-1-10-6-15Z" fill="${c}"/><path d="M12 5v17" stroke="rgba(90,40,10,.35)" stroke-width=".8"/></svg>`;
  const kinds = {
    autumn: () => ({ cls: '', size: rnd(18, 36), html: leaf(['#e8850f', '#d9542a', '#b8741f', '#cf9a30', '#e8a13b'][Math.random() * 5 | 0]), o: rnd(.55, .9) }),
    winter: () => ({ cls: 'flake', size: rnd(4, 11), html: '', o: rnd(.6, 1) }),
    spring: () => ({ cls: 'petal', size: rnd(9, 16), html: '', o: rnd(.6, .9) }),
    summer: () => ({ cls: 'bubble rise', size: rnd(8, 26), html: '', o: rnd(.5, .9) }),
  };
  SEASONS.forEach(s => {
    const layer = document.createElement('div');
    layer.className = 'bg-layer'; layer.dataset.season = s.id;
    let p = '';
    if (!reduceMotion) for (let i = 0; i < (s.id === 'autumn' ? 22 : 16); i++) {
      const k = kinds[s.id](), dur = rnd(9, 17);
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
      if (sec.dataset.idle !== 'true') setActive(best);
    });
  }
  track.addEventListener('scroll', onSScroll, { passive: true });
  addEventListener('resize', onSScroll);

  const centerLeft = i => sCards[i].offsetLeft - (track.clientWidth - sCards[i].offsetWidth) / 2;
  let introTimer;
  function leaveIdle() {
    if (sec.dataset.idle !== 'true') return;
    clearTimeout(introTimer);
    sec.dataset.idle = 'false'; track.classList.remove('free'); onSScroll();
  }
  const sGoTo = (i, smooth = true) => {
    i = Math.max(0, Math.min(SEASONS.length - 1, i));
    leaveIdle();
    track.scrollTo({ left: centerLeft(i), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    setActive(i);
  };
  // idle frame: first card sits at the left margin, nothing selected. Settles on "autumn" when the section is first seen.
  track.classList.add('free');
  const placeIdle = () => { if (sec.dataset.idle === 'true') { track.scrollLeft = centerLeft(0) + ((track.clientWidth - sCards[0].offsetWidth) / 2 - 24); onSScroll(); } };
  placeIdle(); addEventListener('load', placeIdle);
  new IntersectionObserver((ents, ob) => {
    if (ents.some(e => e.isIntersecting)) { ob.disconnect(); introTimer = setTimeout(() => sGoTo(0), 900); }
  }, { threshold: .55 }).observe(sec);
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev => track.addEventListener(ev, leaveIdle, { passive: true }));

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
      try { navigator.vibrate && navigator.vibrate(8); } catch {}
    }
  });
  track.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) { e.preventDefault(); sGoTo((sState.active < 0 ? 0 : sState.active) + step); }
  });
  cta.onclick = () => {
    $('#bestsellers').scrollIntoView({ behavior: scrollBehavior() });
    const t = $('[data-tab=best]', tabs); if (t.getAttribute('aria-selected') !== 'true') t.click();
  };

  // ---------- testimonials ----------
  const t = $('#t-track');
  const star = '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.900 6.100 6.600.900-4.800 4.600 1.200 6.600L12 17.500l-5.900 3.200 1.200-6.600L2.500 9.500l6.600-.9Z"/></svg>';
  t.innerHTML = Array.from({ length: 3 }, (_, i) => `<article class="tcard ${i ? '' : 'active'}">
    <p class="t-name">Maria S.</p><p class="t-role">Nail Artist</p>
    <div class="stars" aria-label="5 stelle">${star.repeat(5)}</div>
    <p class="t-quote">“Uso PriMo Nails da anni nel mio salone. I clienti sono sempre soddisfatti della durata e della brillantezza.”</p></article>`).join('');
  const tCards = [...t.children];
  t.addEventListener('scroll', () => {
    let best = 0, bd = Infinity;
    tCards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - 24 - t.scrollLeft); if (d < bd) { bd = d; best = i; } });
    tCards.forEach((c, i) => c.classList.toggle('active', i === best));
  }, { passive: true });

  // ---------- founder ----------
  const more = $('#f-more'), bio = $('#f-bio');
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
    <div class="c-img"><img src="img/${img}.jpg" style="${CROP[img]}" alt="Nail art a farfalla" loading="lazy"></div>
    <div class="c-body"><div class="c-rate"><span class="stars">${star.repeat(5)}</span><span><b>594+</b> RECENSIONI</span></div>
      <h3 class="c-title">Premium top Master - 2 livello</h3>
      <p class="c-desc">Corso base - PriMo Nails Professional<br>01 livello - 7 lezione</p>
      <p class="c-date">${cal}<span>9 settembre</span></p>
      <button class="c-cta" data-todo>SCOPRI</button></div></article>`).join('');

  // ---------- footer accordion: one open at a time ----------
  $$('#acc details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) $$('#acc details').forEach(o => { if (o !== d) o.open = false; });
  }));

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
