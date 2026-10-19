/* PriMo Nails – home page: hero, best-seller tabs, colour picker, The Seasons, testimonials, founder, courses. */
(() => {
  'use strict';
  const { $, $$, reduceMotion, desktopMQ, smooth, buzz, settle, MOODS, toast, attachProgress, fillRail } = window.PM;
  const rnd = (a, b) => a + Math.random() * (b - a);

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
  $('.hero').addEventListener('visibility', e => { heroVisible = e.detail; });
  setInterval(() => {
    if (heroStopped || !heroVisible || heroHover || document.hidden) return;
    if (heroI >= SLIDES.length - 1) { heroStopped = true; return; }
    heroGo(heroI + 1);
  }, 7000);
  heroSet(0);

  // ---------- best-sellers tabs ----------
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

  // ---------- colour picker (mobile "Scegli il tuo Mood", desktop "Shop by color") ----------
  const moodRow = $('#mood-row');
  moodRow.innerHTML = MOODS.map(([label, f]) => `<button class="mood-item" data-name="${label}" aria-pressed="false">
    <img src="img/mood-${f}.webp?v=3" alt="" width="53" height="125" loading="lazy" decoding="async"><span>${label}</span></button>`).join('');
  attachProgress(moodRow);
  const colorRow = $('#color-row');
  colorRow.innerHTML = MOODS.map(([label, f]) => `<a class="color-item" href="catalogo.html?colore=${encodeURIComponent(label)}" aria-label="${label}">
    <img src="img/mood-${f}.webp?v=3" alt="" width="50" height="122" loading="lazy" decoding="async"><span>color</span></a>`).join('');
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
  // search on the home page jumps to the colour picker instead of leaving the page (phones); desktop goes to the catalogue
  window.PM.onColorPick = name => {
    if (desktopMQ.matches) { location.href = 'catalogo.html?colore=' + encodeURIComponent(name); return; }
    const item = $$('.mood-item').find(m => m.dataset.name === name);
    if (item) pickMood(item, { scroll: true });
  };

  // ---------- The Seasons ----------
  // Each season opens its kit in the quick-view pop-up (product.js), on the shade picked here; the kit page link is the fallback.
  const SEASONS = [
    { id: 'autumn', kit: 'autunno', color: '#c8742d', cta: '#fcf5eb', isNew: false, shades: [['#e9860f', 'Zucca'], ['#e1332a', 'Acero'], ['#8c3a12', 'Castagna'], ['#f0b429', 'Ocra'], ['#c2521e', 'Ruggine'], ['#a8391f', 'Mattone'], ['#6b4a2b', 'Cacao'], ['#d8a15a', 'Caramello']] },
    { id: 'winter', kit: 'inverno', color: '#2f80e9', cta: '#f2f3f7', isNew: false, shades: [['#22305e', 'Night Blue'], ['#1f6f78', 'Emerald Blue'], ['#5b4a9e', 'Viola Blue'], ['#2a7fc0', 'Ocean Blue'], ['#5aa9e6', 'Azure'], ['#2747a8', 'Cobalto'], ['#1f3f8a', 'Zaffiro'], ['#2b3f9e', 'Oltremare']] },
    { id: 'spring', kit: 'primavera', color: '#e5668f', cta: '#fdf1f5', isNew: false, shades: [['#f6c9d6', 'Cipria'], ['#e98aa8', 'Peonia'], ['#f3b8a0', 'Pesca'], ['#d9b6e0', 'Lilla'], ['#c7d9a8', 'Menta'], ['#f4a3bd', 'Rosa'], ['#e7738f', 'Fragola'], ['#f0c7b5', 'Nude']] },
    { id: 'summer', kit: 'estate', color: '#44c232', cta: '#f2fdec', isNew: true, shades: [['#ff8a5c', 'Corallo'], ['#ffc247', 'Mango'], ['#f2545b', 'Anguria'], ['#6cc551', 'Lime'], ['#3fb6b2', 'Laguna'], ['#ff6f91', 'Flamingo'], ['#ffd166', 'Sole'], ['#2ec4b6', 'Turchese']] },
  ];
  // active: the season shown now (hover preview on desktop); pinned: the one picked with a click / tap / key (-1 = neutral)
  const sState = { active: -1, pinned: -1, sel: SEASONS.map(() => 0), expanded: SEASONS.map(() => false) };
  const sec = $('#seasons'), track = $('#track'), dotsEl = $('#dots'), bg = $('#bg'), cta = $('#cta');
  const kitHref = i => `prodotto.html?kit=${SEASONS[i].kit}&shade=${sState.sel[i] + 1}`;

  const swRow = s => {
    const open = sState.expanded[s], n = open ? 8 : 3;
    let h = '';
    for (let i = 0; i < n; i++) h += `<button type="button" class="sw ${sState.sel[s] === i ? 'sel' : ''} ${open && i >= 3 ? 'pop' : ''}" style="--sw:${SEASONS[s].shades[i][0]};--i:${i}" data-shade="${i}" aria-label="${SEASONS[s].shades[i][1]}" aria-pressed="${sState.sel[s] === i}"></button>`;
    return h + (open ? '' : '<button type="button" class="more" data-more aria-label="Mostra altre 5 sfumature">+5</button>');
  };
  SEASONS.forEach((s, i) => {
    track.insertAdjacentHTML('beforeend', `<article class="s-card" data-i="${i}" style="--c:${s.color}" aria-label="${s.id}">
      <a class="s-photo" href="${kitHref(i)}" draggable="false" aria-label="Scopri la collezione ${s.id}"><picture><source media="(min-width:1024px)" srcset="img/${s.id}-d.jpg"><img src="img/${s.id}.jpg" alt="" draggable="false" decoding="async"></picture>${s.isNew ? '<span class="s-badge" lang="en">new</span>' : ''}<span class="s-go" aria-hidden="true">Scopri</span></a>
      <div class="s-meta"><h3 lang="en">${s.id}</h3><div class="s-sw" role="group" aria-label="Sfumature ${s.id}">${swRow(i)}</div><p class="s-shade" aria-live="polite">${s.shades[0][1]}</p></div></article>`);
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

  // i = -1 brings back the neutral frame (desktop only)
  function setActive(i) {
    if (i === sState.active) return;
    sState.active = i;
    sCards.forEach((c, k) => c.classList.toggle('active', k === i));
    sDots.forEach((d, k) => d.setAttribute('aria-selected', k === i));
    layers.forEach((l, k) => l.classList.toggle('on', k === i));
    if (i < 0) { delete sec.dataset.season; return; }
    const s = SEASONS[i];
    sec.style.setProperty('--accent', s.color); sec.style.setProperty('--cta-bg', s.cta);
    sec.dataset.season = s.id;
    cta.href = kitHref(i);
  }
  function pickShade(i, n) {
    sState.sel[i] = n;
    const card = sCards[i], name = $('.s-shade', card);
    $$('.sw', card).forEach(b => { const on = +b.dataset.shade === n; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
    name.textContent = SEASONS[i].shades[n][1];
    name.classList.remove('swap'); void name.offsetWidth; name.classList.add('swap');   // restart the fade-in
    $('.s-photo', card).href = kitHref(i);
    if (i === sState.active) cta.href = kitHref(i);
  }
  // While a dot/arrow/tap animates the scroll, keep the chosen season instead of flashing through the ones in between.
  let sNav = -1;
  const sUnlock = settle(() => { sNav = -1; onSScroll(); }, 160);
  let raf = 0;
  function onSScroll() {
    if (desktopMQ.matches) return;                                  // desktop shows all four cards side by side
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
      if (sec.dataset.idle !== 'true' && sNav < 0) { sState.pinned = best; setActive(best); }
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
    sState.pinned = i;
    if (desktopMQ.matches) { setActive(i); return; }
    leaveIdle();
    sNav = i; setActive(i); sUnlock();
    track.scrollTo({ left: centerLeft(i), behavior: animate && !reduceMotion ? 'smooth' : 'auto' });
  }
  // idle frame: first card sits at the left margin, nothing selected. Settles on "autumn" when the carousel is first seen (phones).
  track.classList.add('free');
  const placeIdle = () => { if (sec.dataset.idle === 'true' && !desktopMQ.matches) { track.scrollLeft = centerLeft(0) + ((track.clientWidth - sCards[0].offsetWidth) / 2 - 24); onSScroll(); } };
  placeIdle(); addEventListener('load', placeIdle);
  new IntersectionObserver((ents, ob) => {
    if (desktopMQ.matches) return;
    if (ents.some(e => e.isIntersecting)) { ob.disconnect(); introTimer = setTimeout(() => sGoTo(0), 900); }
  }, { threshold: .5 }).observe($('.s-carousel'));
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev => track.addEventListener(ev, () => { if (!desktopMQ.matches) { leaveIdle(); sNav = -1; } }, { passive: true }));

  dotsEl.addEventListener('click', e => { const d = e.target.closest('.s-dot'); if (d) sGoTo(+d.dataset.i); });
  track.addEventListener('click', e => {
    const card = e.target.closest('.s-card'); if (!card) return;
    const i = +card.dataset.i;
    if (!desktopMQ.matches && i !== sState.active) { e.preventDefault(); sGoTo(i); return; }   // phones: the first tap brings a side card to the centre
    if (e.target.closest('.s-photo')) { e.preventDefault(); openSeason(i); return; }        // the photo opens the product pop-up
    sGoTo(i);                                                                                // desktop: a click keeps this season after the pointer leaves
    const more = e.target.closest('[data-more]');
    if (more) {
      sState.expanded[i] = true; $('.s-sw', card).innerHTML = swRow(i);
      if (!e.detail) $('.sw[data-shade="3"]', card).focus();                                 // keyboard: carry focus to the first new shade
      return;
    }
    const sw = e.target.closest('.sw');
    if (sw) { pickShade(i, +sw.dataset.shade); buzz(8); }
  });
  // the season's kit in the quick-view pop-up, on the shade picked on the card (the links stay as a fallback without the pop-up)
  function openSeason(i) {
    if (!PM.quickView) { location.href = kitHref(i); return; }
    sState.pinned = i; setActive(i);
    PM.quickView(SEASONS[i].kit, sState.sel[i] + 1);
  }
  cta.addEventListener('click', e => { if (sState.active >= 0) { e.preventDefault(); openSeason(sState.active); } });
  track.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step && e.target === track) { e.preventDefault(); sGoTo((sState.active < 0 ? 0 : sState.active) + step); }
  });
  // desktop: the four cards sit side by side; the frame starts neutral (design state 1), hovering or focusing a card previews
  // its season, and leaving the cards goes back to the clicked season, or to neutral if none was clicked
  if (desktopMQ.matches) sec.dataset.idle = 'false';
  desktopMQ.addEventListener('change', () => {
    if (desktopMQ.matches) { sec.dataset.idle = 'false'; sCards.forEach(c => c.style.removeProperty('--t')); setActive(sState.pinned); return; }
    if (sec.dataset.idle === 'true') placeIdle(); else sGoTo(sState.pinned < 0 ? 0 : sState.pinned, false);
  });
  const restore = () => { if (desktopMQ.matches) setActive(sState.pinned); };
  sCards.forEach((c, i) => {
    c.addEventListener('mouseenter', () => { if (desktopMQ.matches) setActive(i); });
    c.addEventListener('focusin', () => { if (desktopMQ.matches) setActive(i); });
  });
  track.addEventListener('mouseleave', restore);
  track.addEventListener('focusout', e => { if (!track.contains(e.relatedTarget) && !track.matches(':hover')) restore(); });

  // ---------- testimonials ----------
  const t = $('#t-track');
  const star = '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.900 6.100 6.600.900-4.800 4.600 1.200 6.600L12 17.500l-5.900 3.200 1.200-6.600L2.500 9.500l6.600-.9Z"/></svg>';
  const QUOTES = [
    '“Uso PriMo Nails da anni nel mio salone. I clienti sono sempre soddisfatti della durata e della brillantezza.”',
    '“La collezione stagionale è fantastica. Colori sempre alla moda e formulazioni impeccabili.”“Uso PriMo Nails da anni nel mio salone. I clienti sono sempre soddisfatti della durata e della brillantezza.”',
    '“Uso PriMo Nails da anni nel mio salone. I clienti sono sempre soddisfatti della durata e della brillantezza.”',
    '“La collezione stagionale è fantastica. Colori sempre alla moda e formulazioni impeccabili.“Uso PriMo Nails da anni nel mio salone. I clienti sono sempre soddisfatti della durata e della brillantezza.”“Uso PriMo Nails da anni nel mio salone. I clienti sono sempre soddisfatti della durata e della brillantezza.””',
    '“La collezione stagionale è fantastica. Colori sempre alla moda e formulazioni impeccabili.”',
  ];
  // phones show the three cards of the mobile design; desktop shows five, with the middle one highlighted
  t.innerHTML = QUOTES.map((q, i) => `<article class="tcard${i === 0 ? ' active' : ''}${i === 3 || i === 4 ? ' d-only' : ''}">
    <p class="t-name">Maria S.</p><p class="t-role">Nail Artist</p>
    <div class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</div>
    <p class="t-quote"><span class="m-only">${QUOTES[0]}</span><span class="d-only">${q}</span></p></article>`).join('');
  const tCards = [...t.children];
  attachProgress(t);
  function tActive() {
    if (desktopMQ.matches) {                                        // card closest to the centre is highlighted
      const mid = t.scrollLeft + t.clientWidth / 2; let best = 0, bd = Infinity;
      tCards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      tCards.forEach((c, i) => { c.classList.toggle('active', i === best); c.classList.toggle('far', Math.abs(i - best) > 1); });
      return;
    }
    const atEnd = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;        // the last card can never reach the left edge
    let best = atEnd ? tCards.filter(c => getComputedStyle(c).display !== 'none').length - 1 : 0, bd = Infinity;
    if (!atEnd) tCards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - 24 - t.scrollLeft); if (d < bd) { bd = d; best = i; } });
    tCards.forEach((c, i) => { c.classList.toggle('active', i === best); c.classList.remove('far'); });
  }
  t.addEventListener('scroll', tActive, { passive: true });
  const tCenter = () => { if (desktopMQ.matches) { const c = tCards[2]; t.scrollLeft = c.offsetLeft + c.offsetWidth / 2 - t.clientWidth / 2; } else t.scrollLeft = 0; tActive(); };
  desktopMQ.addEventListener('change', tCenter); addEventListener('load', tCenter); tCenter();

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
  $('#c-list').innerHTML = ['course1', 'course2', 'course3'].map((img, i) => `<article class="ccard${i === 1 ? ' hl' : ''}">
    <div class="c-img"><img src="img/${img}.jpg" style="${CROP[img]}" alt="Nail art a farfalla" loading="lazy" decoding="async"><img class="c-wing" src="img/course-wing.jpg" alt="" loading="lazy" decoding="async"></div>
    <div class="c-body"><div class="c-rate"><span class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</span><span><b>594+</b> RECENSIONI</span></div>
      <h3 class="c-title">Premium top Master - 2 livello</h3>
      <p class="c-desc">Corso base<span class="d-sp"> </span> - PriMo Nails<span class="d-sp"> </span> Professional<br><b class="d-b">01</b> livello - <b class="d-b">7</b> lezione</p>
      <p class="c-date">${cal}<span>9 settembre</span></p>
      <a class="c-cta" href="corso.html"><span class="m-only">SCOPRI</span><span class="d-only">DETTAGLI</span></a></div></article>`).join('');

  // Variant C (?corsi=c): upcoming courses as tickets, date stub + perforation. Draft for comparison.
  if (new URLSearchParams(location.search).get('corsi') === 'c') {
    const sec = $('#courses'), { COURSES } = window.PM.CATALOG;
    const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const book = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>';
    const ticket = c => {
      const [day, month] = c.date.split(' ');
      return `<a class="tk" href="corso.html">
        <div class="tk-img"><img src="img/${c.img}.jpg" style="--pos:${c.pos}" alt="" loading="lazy" decoding="async"></div>
        <span class="tk-cut" aria-hidden="true"></span>
        <p class="tk-stub"><b>${day.padStart(2, '0')}</b><span aria-hidden="true">${month.slice(0, 3)}</span><span class="sr"> ${month}</span></p>
        <div class="tk-body"><p class="tk-lvl">${c.tag}</p><h3>${c.title}</h3><p class="tk-txt">${c.txt}</p>
          <p class="tk-meta"><span>${book}${c.les} lezioni</span><span class="tk-rate"><span class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</span><b>${c.rev}</b></span></p></div>
        <span class="tk-go" aria-hidden="true">${arrow}</span></a>`;
    };
    sec.classList.add('v-c');
    sec.innerHTML = `<div class="tk-head"><div><p class="cx-eyebrow">PriMo Academy</p><h2>Prossimi corsi</h2><p class="tk-sub">Eleva la tua arte con Irina PriMo e il suo team.</p></div>
      <a class="tk-all d-only" href="academy.html">Tutti i corsi${arrow}</a></div>
      <div class="tk-list" id="c-list">${[0, 2, 3, 4].map(i => ticket(COURSES[i])).join('')}</div>
      <a class="tk-all m-only" href="academy.html">Tutti i corsi${arrow}</a>`;
  }

  // Variant D (?corsi=d): an editorial numbered index; on desktop the hovered course shows in a photo preview.
  if (new URLSearchParams(location.search).get('corsi') === 'd') {
    const sec = $('#courses'), { COURSES } = window.PM.CATALOG;
    const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    sec.classList.add('v-d');
    sec.innerHTML = `<div class="ix-head"><p class="ix-eye">PriMo Academy</p><h2>I corsi di Irina PriMo</h2></div>
      <div class="ix-wrap">
        <ol class="ix-list" id="c-list">${COURSES.map((c, i) => `<li><a class="ix-row${i ? '' : ' on'}" href="corso.html" data-i="${i}">
          <span class="ix-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="ix-main"><span class="ix-lvl">${c.tag}</span><span class="ix-title">${c.title}</span><span class="ix-meta">${c.date} · ${c.les} lezioni</span></span>
          <img class="ix-thumb" src="img/${c.img}.jpg" style="--pos:${c.pos}" alt="" loading="lazy" decoding="async">
          <span class="ix-when" aria-hidden="true"><b>${c.date}</b>${c.les} lezioni</span>
          <span class="ix-go" aria-hidden="true">${arrow}</span></a></li>`).join('')}</ol>
        <div class="ix-preview" aria-hidden="true">${COURSES.map((c, i) => `<figure class="${i ? '' : 'on'}"><img src="img/${c.img}.jpg" style="--pos:${c.pos}" alt="" loading="lazy" decoding="async">
          <figcaption><span class="ix-rate"><span class="stars">${star.repeat(5)}</span><b>${c.rev}</b> recensioni</span><span>${c.txt}</span></figcaption></figure>`).join('')}</div>
      </div>
      <a class="ix-all" href="academy.html">Tutti i corsi${arrow}</a>`;
    const rows = $$('.ix-row', sec), figs = $$('.ix-preview figure', sec);
    const show = i => { rows.forEach((r, j) => r.classList.toggle('on', j === i)); figs.forEach((f, j) => f.classList.toggle('on', j === i)); };
    rows.forEach((r, i) => { r.addEventListener('mouseenter', () => show(i)); r.addEventListener('focus', () => show(i)); });
  }

  // Variants E and F (?corsi=e / ?corsi=f): minimal cards with photo, title, description and reviews only.
  // E: photo cards in three columns (a snap rail on phones). F: wide rows, text left and photo right (stacked on phones).
  const minimal = new URLSearchParams(location.search).get('corsi');
  if (minimal === 'e' || minimal === 'f') {
    const sec = $('#courses'), { COURSES } = window.PM.CATALOG;
    const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    sec.classList.add('v-min', 'v-' + minimal);
    sec.innerHTML = `<h2 class="mn-h">I corsi di Irina PriMo</h2>
      <div class="mn-list" id="c-list">${[0, 2, 4].map(i => COURSES[i]).map(c => `<a class="mn" href="corso.html">
        <div class="mn-img"><img src="img/${c.img}.jpg" style="--pos:${c.pos}${c.img === 'course-wing' ? ';--z:1.12' : ''}" alt="" loading="lazy" decoding="async"></div>
        <div class="mn-body"><h3>${c.title}</h3><p class="mn-txt">${c.txt}</p>
          <p class="mn-rate"><span class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</span><span><b>${c.rev}</b> recensioni</span></p>
          ${minimal === 'f' ? `<span class="mn-go" aria-hidden="true">Scopri il corso${arrow}</span>` : ''}</div></a>`).join('')}</div>
      <a class="mn-all" href="academy.html">Tutti i corsi${arrow}</a>`;
  }

  window.PM.ready();
})();
