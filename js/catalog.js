/* PriMo Nails – catalogue ("Frame 427321589" 440 / "Desktop - 13" 1440): filters, sort, pages, quick view. */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, toast, addToCart, flashAdded, buzz, smooth, desktopMQ, openOverlay } = PM;

  // ---------- data (the design shows one product photo; names and shades follow the design's swatch labels) ----------
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
  const SW = ['night', 'night', 'emerald', 'viola', 'ocean', null];        // swatches printed on every catalogue card

  // ---------- state from the URL ----------
  const qs = new URLSearchParams(location.search);
  const st = {
    colors: new Set((qs.get('colore') ? [MOOD_TO_COLOR[qs.get('colore')] || qs.get('colore')] : []).filter(c => COLORS.some(x => x[0] === c))),
    colls: new Set(), fx: new Set(), min: 0, max: 10, sort: qs.get('ordina') === 'novita' ? 'new' : 'pop',
    cat: CATS.includes(qs.get('cat')) ? qs.get('cat') : null, page: Math.max(1, +qs.get('pagina') || 1), sale: qs.get('ordina') === 'offerte',
  };
  if (st.cat) { $('#crumb-cur').textContent = CAT_LABEL[st.cat]; document.title = `${CAT_LABEL[st.cat]} – PriMo Nails`; }
  const perPage = () => (desktopMQ.matches ? 16 : 12);

  // ---------- filter panel ----------
  const count = key => PRODUCTS.filter(p => (key[0] === 'coll' ? p.coll === key[1] : p.fx === key[1])).length;
  $('#fc').innerHTML = COLORS.map(([k, label, bg]) => `<button type="button" class="fdot" data-color="${k}" aria-pressed="false" style="--bg:${bg}" aria-label="${label}, ${PRODUCTS.filter(p => p.color === k).length} prodotti"></button>`).join('');
  $('#fcoll').innerHTML = COLLS.map(([k, label]) => `<button type="button" class="fchip" data-coll="${k}" aria-pressed="false">${label}<small>${count(['coll', k])}</small></button>`).join('');
  $('#ffx').innerHTML = FX.map(([k, label]) => `<button type="button" class="fchip" data-fx="${k}" aria-pressed="false">${label}<small>${count(['fx', k])}</small></button>`).join('');
  const panel = $('#fpanel'), toggles = ['#f-toggle', '#f-hide', '#f-circle'].map(s => $(s));
  function setPanel(open) {
    panel.hidden = !open;
    toggles.forEach(t => t.setAttribute('aria-expanded', open));
    $('#f-hide span').textContent = open ? 'Nascondi filtri' : 'Mostra filtri';
    $('#fbar-wrap').classList.toggle('open', open);
  }
  toggles.forEach(t => t.addEventListener('click', () => setPanel(panel.hidden)));
  panel.addEventListener('click', e => {
    const d = e.target.closest('[data-color],[data-coll],[data-fx]'); if (!d) return;
    const [set, val] = d.dataset.color ? [st.colors, d.dataset.color] : d.dataset.coll ? [st.colls, d.dataset.coll] : [st.fx, d.dataset.fx];
    set.has(val) ? set.delete(val) : set.add(val);
    st.page = 1; buzz(6); apply();
  });
  // price range: two thumbs on one track
  const a = $('#pr-a'), b = $('#pr-b');
  const fmt = v => v.toFixed(2).replace('.', ',') + ' €';
  function onRange(e) {
    let lo = +a.value, hi = +b.value;
    if (lo > hi) { if (e && e.target === a) a.value = lo = hi; else b.value = hi = lo; }
    st.min = lo; st.max = hi; st.page = 1;
    $('#pr-min').textContent = fmt(lo); $('#pr-max').textContent = fmt(hi);
    $('#pr-fill').style.left = lo * 10 + '%'; $('#pr-fill').style.right = (100 - hi * 10) + '%';
    apply();
  }
  a.addEventListener('input', onRange); b.addEventListener('input', onRange);
  const reset = () => { st.colors.clear(); st.colls.clear(); st.fx.clear(); a.value = 0; b.value = 10; st.cat = null; st.sale = false; onRange(); };
  $('#fp-reset').onclick = reset; $('#empty-reset').onclick = reset;

  // sort
  const menu = $('#sort-menu');
  const SORT_LABEL = { pop: 'Popolarità', new: 'Novità', asc: 'Prezzo crescente', desc: 'Prezzo decrescente' };
  let sortFrom = null;
  [$('#sort-btn'), $('#sort-btn-m')].forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation(); sortFrom = btn;
    const open = menu.hidden;
    menu.hidden = !open; btn.setAttribute('aria-expanded', open);
    if (open) { const r = btn.getBoundingClientRect(), w = $('#fbar-wrap').getBoundingClientRect(); menu.style.left = (r.left - w.left) + 'px'; menu.style.top = (r.bottom - w.top + 6) + 'px'; menu.style.minWidth = r.width + 'px'; $('[aria-selected=true]', menu).focus?.(); }
  }));
  menu.addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    st.sort = li.dataset.sort; st.page = 1; menu.hidden = true; sortFrom?.setAttribute('aria-expanded', 'false'); apply();
  });
  document.addEventListener('click', () => { menu.hidden = true; });

  // ---------- grid ----------
  const grid = $('#grid');
  const card = p => `
    <article class="pcard gcard" data-id="${p.id}">
      <a class="pimg" href="prodotto.html" aria-label="№${p.num} ${p.name} – dettagli"><picture><source media="(min-width:1024px)" srcset="img/product.jpg"><img src="img/product-card-m.jpg" alt="" loading="lazy" decoding="async" draggable="false"></picture><span class="disc" aria-label="Sconto 28%">28%</span></a>
      <button type="button" class="qv-btn" data-qv="${p.id}" aria-label="Anteprima rapida: №${p.num} ${p.name}"><svg viewBox="0 0 24 24"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg></button>
      <div class="pbody">
        <h3><a href="prodotto.html"><span>№${p.num}</span><span>${p.name}</span></a></h3>
        <p class="type">SEMIPERMANENTE</p><p class="ml">12 ml</p>
        <p class="price" aria-label="€155,00, prezzo originale €211,00"><b>€155,00</b><s>€211,00</s></p>
        <div class="shades" role="group" aria-label="Tonalità">${SW.map((s, i) => `<button class="sh${s ? '' : ' turq'}" data-i="${i}" ${s ? `style="background-image:url(img/sw/${s}.png)"` : ''} aria-label="Tonalità ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}<button class="plus" aria-expanded="false" aria-label="Mostra altre 5 tonalità">+5</button></div>
        <button class="add" aria-label="Aggiungi al carrello – №${p.num} ${p.name}"><span class="m-only"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>add to cart — ${p.price.toFixed(2)}€</span><span class="d-only">add to cart</span></button>
      </div>
    </article>`;

  function filtered() {
    let list = PRODUCTS.filter(p => (!st.colors.size || st.colors.has(p.color)) && (!st.colls.size || st.colls.has(p.coll)) &&
      (!st.fx.size || st.fx.has(p.fx)) && p.price >= st.min && (st.max >= 10 || p.price <= st.max) && (!st.cat || p.cat === st.cat));
    const by = { pop: (x, y) => x.pop - y.pop, new: (x, y) => (y.isNew - x.isNew) || (y.id - x.id), asc: (x, y) => x.price - y.price, desc: (x, y) => y.price - x.price }[st.sort];
    return list.sort(by);
  }
  function apply(scroll) {
    const list = filtered(), pages = Math.max(1, Math.ceil(list.length / perPage()));
    st.page = Math.min(st.page, pages);
    const slice = list.slice((st.page - 1) * perPage(), st.page * perPage());
    grid.innerHTML = slice.map(card).join('');
    $('#empty').hidden = list.length > 0;
    // filter UI state
    $$('[data-color]').forEach(d => d.setAttribute('aria-pressed', st.colors.has(d.dataset.color)));
    $$('[data-coll]').forEach(d => d.setAttribute('aria-pressed', st.colls.has(d.dataset.coll)));
    $$('[data-fx]').forEach(d => d.setAttribute('aria-pressed', st.fx.has(d.dataset.fx)));
    const n = st.colors.size + st.colls.size + st.fx.size + (st.min > 0 || st.max < 10 ? 1 : 0) + (st.cat ? 1 : 0);
    $('#f-count').hidden = !n; $('#f-count').textContent = n; $('#fp-reset').hidden = !n;
    $('#sort-cur').textContent = SORT_LABEL[st.sort]; $('#sort-btn-m b').textContent = SORT_LABEL[st.sort];
    $$('li', menu).forEach(li => li.setAttribute('aria-selected', li.dataset.sort === st.sort));
    $('#results-live').textContent = `${list.length} prodotti`;
    renderPager(pages, list.length);
    // keep the URL shareable
    const u = new URLSearchParams();
    if (st.cat) u.set('cat', st.cat);
    if (st.colors.size === 1) u.set('colore', [...st.colors][0]);
    if (st.page > 1) u.set('pagina', st.page);
    history.replaceState(null, '', u.toString() ? '?' + u : location.pathname);
    if (scroll) $('#fbar-wrap').scrollIntoView({ behavior: smooth() });
  }
  function renderPager(pages, total) {
    const pg = $('#pager'); pg.hidden = pages < 2 && !desktopMQ.matches;
    const cur = st.page, nums = [];
    for (let i = 1; i <= Math.min(pages, 5); i++) nums.push(i);
    if (cur > 5) nums.push(cur);
    const shown = new Set(nums);
    const btn = i => `<button type="button" data-page="${i}"${i === cur ? ' aria-current="page"' : ''} aria-label="Pagina ${i}">${i}</button>`;
    let numHtml = [...shown].filter(i => i <= pages).map(btn).join('');
    if (pages > Math.max(...shown)) numHtml += `<span class="pg-gap" aria-hidden="true">…</span>${btn(pages)}`;
    const from = total ? (cur - 1) * perPage() + 1 : 0, to = Math.min(total, cur * perPage());
    pg.innerHTML = `<div class="pg-core">
      <button type="button" class="pg-prev" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>Previous</button>
      <div class="pg-nums">${numHtml}</div>
      <button type="button" class="pg-next" data-page="${cur + 1}" ${cur === pages ? 'disabled' : ''}>Next<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button></div>
      <p class="pg-info">Showing ${to - from + (total ? 1 : 0)} of ${total} results</p>`;
  }
  $('#pager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { st.page = +b.dataset.page; apply(true); } });
  desktopMQ.addEventListener('change', () => apply());

  // ---------- quick view (desktop design "product seasons (with sale)"; on phones it opens as a sheet) ----------
  const qv = $('#qv'), qvTabs = $('#qv-tabs');
  const KIT_TABS = [['inverno', 'Inverno', '#2f80e9'], ['primavera', 'Primavera', '#e5668f'], ['estate', 'Estate', '#44c232'], ['autunno', 'Autunno', '#f5a623']];
  let qvKit = 'inverno', qvReturn = null;
  qvTabs.innerHTML = '<span class="st-pill" aria-hidden="true"></span>' + KIT_TABS.map(([k, l, g]) => `<button type="button" role="tab" data-kit="${k}" aria-selected="${k === qvKit}" style="--glow:${g}">${l}</button>`).join('');
  const placeQv = () => { const b = $('[aria-selected=true]', qvTabs), pill = $('.st-pill', qvTabs); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; qvTabs.style.setProperty('--glow', KIT_TABS.find(t => t[0] === qvKit)[2]); };
  const renderQv = () => { PM.renderProduct($('#qv-body'), { kit: qvKit, sale: true, idp: 'qv' }); $('.qv-more').href = `prodotto.html?kit=${qvKit}`; };
  function openQv() {
    qvReturn = document.activeElement;
    qv.hidden = false; PM.root.classList.add('lock');
    [$('.topbar'), $('#top'), $('.footer')].forEach(n => { n.inert = true; });
    renderQv(); requestAnimationFrame(() => { placeQv(); $('#qv-close').focus(); });
  }
  function closeQv() {
    qv.hidden = true; PM.root.classList.remove('lock');
    [$('.topbar'), $('#top'), $('.footer')].forEach(n => { n.inert = false; });
    qvReturn?.focus({ preventScroll: true });
  }
  grid.addEventListener('click', e => { if (e.target.closest('[data-qv]')) openQv(); });
  $('#qv-close').onclick = closeQv;
  qv.addEventListener('click', e => { if (e.target === qv) closeQv(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !qv.hidden) closeQv(); });
  qvTabs.addEventListener('click', e => {
    const b = e.target.closest('[data-kit]'); if (!b) return;
    qvKit = b.dataset.kit; $$('[data-kit]', qvTabs).forEach(t => t.setAttribute('aria-selected', t === b)); placeQv(); renderQv();
  });

  $$('[data-back]').forEach(l => l.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  // a colour picked in search stays on this page
  PM.onColorPick = name => { st.colors = new Set([MOOD_TO_COLOR[name] || name]); st.page = 1; apply(true); toast(`Colore: ${name}`); };
  if (st.colors.size) setPanel(true);
  apply();
  PM.ready();
})();
