(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);

  // Colours / shades come from the design frames; the 5 extra shades behind "+5" are placeholders.
  const BASE = ['#ffffff', '#c9c9c9', '#8f8f8f'];
  const SEASONS = [
    { id: 'autumn', color: '#c8742d', cta: '#fcf5eb', isNew: false,
      shades: ['#e9860f', '#e1332a', '#8c3a12', '#f0b429', '#c2521e', '#a8391f', '#6b4a2b', '#d8a15a'] },
    { id: 'winter', color: '#2f80e9', cta: '#f2f3f7', isNew: false,
      shades: [...BASE, '#dfe8f5', '#9fb7d8', '#4a6fa5', '#2b2f3a', '#b9a7c9'] },
    { id: 'spring', color: '#e5668f', cta: '#fdf1f5', isNew: false,
      shades: [...BASE, '#f6c9d6', '#e98aa8', '#f3b8a0', '#c7d9a8', '#d9b6e0'] },
    { id: 'summer', color: '#44c232', cta: '#f2fdec', isNew: true,
      shades: [...BASE, '#ff8a5c', '#ffc247', '#f2545b', '#6cc551', '#3fb6b2'] },
  ];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { active: -1, sel: SEASONS.map(() => 0), expanded: SEASONS.map(() => false) };

  const phone = $('#phone'), track = $('#track'), dotsEl = $('#dots'), bg = $('#bg'), cta = $('#cta');
  const root = document.documentElement;

  // ---------- render ----------
  const swatchBtn = (season, i, extra = '') =>
    `<button class="sw ${state.sel[season] === i ? 'sel' : ''} ${extra}" style="--sw:${SEASONS[season].shades[i]};--i:${i}"
      data-shade="${i}" aria-label="Shade ${i + 1}" aria-pressed="${state.sel[season] === i}"></button>`;

  function swatchRow(s) {
    const open = state.expanded[s];
    const n = open ? 8 : 3;
    let h = '';
    for (let i = 0; i < n; i++) h += swatchBtn(s, i, open && i >= 3 ? 'pop' : '');
    if (!open) h += '<button class="more" data-more aria-label="Show 5 more shades">+5</button>';
    return h;
  }

  SEASONS.forEach((s, i) => {
    track.insertAdjacentHTML('beforeend', `
      <article class="card" data-i="${i}" style="--c:${s.color}" aria-label="${s.id}">
        <div class="photo"><img src="img/${s.id}.jpg" alt="PriMo Nails polish – ${s.id} collection" draggable="false" ${i ? 'loading="lazy"' : ''}>
          ${s.isNew ? '<span class="badge">new</span>' : ''}</div>
        <div class="meta"><h2>${s.id}</h2><div class="swatches">${swatchRow(i)}</div></div>
      </article>`);
    dotsEl.insertAdjacentHTML('beforeend',
      `<button class="dot" role="tab" data-i="${i}" aria-label="${s.id}" aria-selected="false"></button>`);
  });
  const cards = [...track.children], dots = [...dotsEl.children];

  // ---------- seasonal backgrounds + particles ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
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
    if (!reduceMotion) for (let i = 0; i < (s.id === 'autumn' ? 26 : 18); i++) {
      const k = kinds[s.id](), dur = rnd(9, 17);
      p += `<i class="p ${k.cls}" style="--x:${rnd(-2, 98).toFixed(1)}%;--s:${k.size.toFixed(1)}px;--dur:${dur.toFixed(1)}s;--delay:${(-rnd(0, dur)).toFixed(1)}s;
        --sway:${rnd(-70, 70).toFixed(0)}px;--r0:${rnd(-40, 40) | 0}deg;--r1:${rnd(120, 420) | 0}deg;--o:${k.o.toFixed(2)}">${k.html}</i>`;
    }
    layer.innerHTML = `<div class="panel"></div><div class="particles">${p}</div>`;
    bg.appendChild(layer);
  });
  const layers = [...bg.children];

  // ---------- active season ----------
  function setActive(i) {
    if (i === state.active) return;
    state.active = i;
    const s = SEASONS[i];
    root.style.setProperty('--accent', s.color);
    root.style.setProperty('--cta-bg', s.cta);
    cards.forEach((c, k) => c.classList.toggle('active', k === i));
    dots.forEach((d, k) => d.setAttribute('aria-selected', k === i));
    layers.forEach((l, k) => l.classList.toggle('on', k === i));
    phone.dataset.season = s.id;
    if ($('#sheet') && !$('#sheet').hidden) renderSheet();
  }

  // distance-based scale/fade of side cards, and nearest-card detection
  let raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const mid = track.scrollLeft + track.clientWidth / 2;
      const pitch = cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 17);
      let best = 0, bestD = Infinity;
      cards.forEach((c, k) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = k; }
        c.style.setProperty('--t', phone.dataset.idle === 'true' ? 0 : Math.min(1, d / pitch).toFixed(3));
      });
      if (phone.dataset.idle !== 'true') setActive(best);
    });
  }
  track.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  const centerLeft = i => cards[i].offsetLeft - (track.clientWidth - cards[i].offsetWidth) / 2;
  const goTo = (i, smooth = true) => {
    i = Math.max(0, Math.min(SEASONS.length - 1, i));
    leaveIdle();
    track.scrollTo({ left: centerLeft(i), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    setActive(i);
  };

  // ---------- idle intro (design frame 1) → autumn (frame 5) ----------
  let introTimer;
  function leaveIdle() {
    if (phone.dataset.idle !== 'true') return;
    clearTimeout(introTimer);
    phone.dataset.idle = 'false';
    track.classList.remove('free');
    onScroll();
  }
  track.classList.add('free');
  track.scrollLeft = centerLeft(0) + 41;              // first card sits slightly off-centre, nothing selected yet
  onScroll();
  introTimer = setTimeout(() => goTo(0), 1100);
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev =>
    track.addEventListener(ev, () => { if (phone.dataset.idle === 'true') { leaveIdle(); } }, { passive: true }));

  // ---------- interactions ----------
  dotsEl.addEventListener('click', e => { const d = e.target.closest('.dot'); if (d) goTo(+d.dataset.i); });

  track.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const i = +card.dataset.i;
    const shade = e.target.closest('.sw'), more = e.target.closest('[data-more]');
    if (i !== state.active) { goTo(i); return; }                 // tapping a side card brings it to the centre
    if (more) { state.expanded[i] = true; card.querySelector('.swatches').innerHTML = swatchRow(i); return; }
    if (shade) selectShade(i, +shade.dataset.shade);
  });
  track.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) { e.preventDefault(); goTo((state.active < 0 ? 0 : state.active) + step); }
  });

  function selectShade(season, shade) {
    state.sel[season] = shade;
    cards[season].querySelectorAll('.sw').forEach(b => {
      const on = +b.dataset.shade === shade;
      b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on);
    });
    if (!$('#sheet').hidden) renderSheet();
    try { navigator.vibrate && navigator.vibrate(8); } catch {}
  }

  // ---------- "I Più Venduti" sheet (placeholder: the design has no follow-up screen) ----------
  const sheet = $('#sheet'), backdrop = $('#backdrop');
  function renderSheet() {
    const i = state.active < 0 ? 0 : state.active, s = SEASONS[i];
    $('#sheet-sub').textContent = `${s.id} · top shades`;
    $('#sheet-grid').innerHTML = s.shades.map((_, k) => swatchBtn(i, k)).join('');
  }
  function openSheet() { renderSheet(); sheet.hidden = backdrop.hidden = false; $('#sheet-close').focus(); }
  function closeSheet() { sheet.hidden = backdrop.hidden = true; cta.focus(); }
  cta.addEventListener('click', () => { leaveIdle(); if (state.active < 0) setActive(0); openSheet(); });
  $('#sheet-close').addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
  $('#sheet-grid').addEventListener('click', e => {
    const b = e.target.closest('.sw'); if (b) selectShade(state.active < 0 ? 0 : state.active, +b.dataset.shade);
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
