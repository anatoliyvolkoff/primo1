/* PriMo Nails – catalogue ("Frame 427321589" 440 / "Desktop - 13" 1440): filters, sort, pages, quick view. */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, toast, addToCart, flashAdded, buzz, smooth, desktopMQ, openOverlay, MOODS } = PM;

  // ---------- data: shared with search (js/site.js → PM.CATALOG) ----------
  const { COLORS, MOOD_TO_COLOR, COLLS, FX, CATS, CAT_LABEL, PRODUCTS } = PM.CATALOG;
  const SW = ['night', 'night', 'emerald', 'viola', 'ocean', null];        // swatches printed on every catalogue card

  // ---------- state from the URL ----------
  const qs = new URLSearchParams(location.search);
  const st = {
    colors: new Set((qs.get('colore') ? [MOOD_TO_COLOR[qs.get('colore')] || qs.get('colore')] : []).filter(c => COLORS.some(x => x[0] === c))),
    colls: new Set(COLLS.some(c => c[0] === qs.get('coll')) ? [qs.get('coll')] : []), fx: new Set(), q: (qs.get('q') || '').trim().slice(0, 80), min: 0, max: 10, sort: qs.get('ordina') === 'novita' ? 'new' : 'pop',
    cat: CATS.includes(qs.get('cat')) ? qs.get('cat') : null, page: Math.max(1, +qs.get('pagina') || 1), sale: qs.get('ordina') === 'offerte',
    mood: qs.get('colore'),                                            // swatch picked in "Shop by color" (several share one filter colour)
  };
  if (st.cat) { $('#crumb-cur').textContent = CAT_LABEL[st.cat]; document.title = `${CAT_LABEL[st.cat]} – PriMo Nails`; }
  // a search from the header lands here as ?q=
  function showQuery() {
    $('#q-pill').hidden = !st.q;
    if (st.q) { $('#q-text').textContent = st.q; document.title = `“${st.q}” – Ricerca – PriMo Nails`; }
    $('#crumb-cur').textContent = st.q ? 'Ricerca' : st.cat ? CAT_LABEL[st.cat] : 'Tutti i Prodotti';
  }
  $('#q-clear').onclick = () => { st.q = ''; st.page = 1; showQuery(); apply(); };
  $('#q-edit').onclick = () => PM.search.open();
  PM.onSearch = q => { st.q = q; st.page = 1; showQuery(); apply(true); };   // searching again from this page stays here
  showQuery();
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
  const reset = () => { st.q = ''; showQuery(); st.colors.clear(); st.colls.clear(); st.fx.clear(); a.value = 0; b.value = 10; st.cat = null; st.sale = false; onRange(); };
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
        <p class="type">${st.q ? `${CAT_LABEL[p.cat]} · ${p.shade}`.toUpperCase() : 'SEMIPERMANENTE'}</p><p class="ml">12 ml</p>
        <p class="price" aria-label="€155,00, prezzo originale €211,00"><b>€155,00</b><s>€211,00</s></p>
        <div class="shades" role="group" aria-label="Tonalità">${SW.map((s, i) => `<button class="sh${s ? '' : ' turq'}" data-i="${i}" ${s ? `style="background-image:url(img/sw/${s}.png)"` : ''} aria-label="Tonalità ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}<button class="plus" aria-expanded="false" aria-label="Mostra altre 5 tonalità">+5</button></div>
        <button class="add" aria-label="Aggiungi al carrello – №${p.num} ${p.name}"><span class="m-only"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>add to cart — ${p.price.toFixed(2)}€</span><span class="d-only">add to cart</span></button>
      </div>
    </article>`;

  function filtered() {
    let list = PRODUCTS.filter(p => (!st.colors.size || st.colors.has(p.color)) && (!st.colls.size || st.colls.has(p.coll)) &&
      (!st.fx.size || st.fx.has(p.fx)) && p.price >= st.min && (st.max >= 10 || p.price <= st.max) && (!st.cat || p.cat === st.cat) && (!st.q || PM.search.matchProduct(p, st.q)));
    const by = { pop: (x, y) => x.pop - y.pop, new: (x, y) => (y.isNew - x.isNew) || (y.id - x.id), asc: (x, y) => x.price - y.price, desc: (x, y) => y.price - x.price }[st.sort];
    return list.sort(by);
  }
  function apply(scroll) {
    const list = filtered(), pages = Math.max(1, Math.ceil(list.length / perPage()));
    st.page = Math.min(st.page, pages);
    const slice = list.slice((st.page - 1) * perPage(), st.page * perPage());
    grid.innerHTML = slice.map(card).join('');
    $('#empty').hidden = list.length > 0;
    $('#empty-msg').textContent = st.q ? `Nessun prodotto per “${st.q}” con questi filtri.` : 'Nessun prodotto con questi filtri.';
    // filter UI state
    $$('[data-color]').forEach(d => d.setAttribute('aria-pressed', st.colors.has(d.dataset.color)));
    $$('[data-coll]').forEach(d => d.setAttribute('aria-pressed', st.colls.has(d.dataset.coll)));
    $$('[data-fx]').forEach(d => d.setAttribute('aria-pressed', st.fx.has(d.dataset.fx)));
    $$('[data-mood]').forEach(d => d.setAttribute('aria-pressed', d.dataset.mood === st.mood && st.colors.size === 1 && st.colors.has(MOOD_TO_COLOR[st.mood])));
    const n = st.colors.size + st.colls.size + st.fx.size + (st.min > 0 || st.max < 10 ? 1 : 0) + (st.cat ? 1 : 0);
    $('#f-count').hidden = !n; $('#f-count').textContent = n; $('#fp-reset').hidden = !n;
    $('#sort-cur').textContent = SORT_LABEL[st.sort]; $('#sort-btn-m b').textContent = SORT_LABEL[st.sort];
    $$('li', menu).forEach(li => li.setAttribute('aria-selected', li.dataset.sort === st.sort));
    $('#results-live').textContent = `${list.length} prodotti`;
    syncHead(list.length);
    renderPager(pages, list.length);
    // keep the URL shareable
    const u = new URLSearchParams();
    if (st.q) u.set('q', st.q);
    if (st.cat) u.set('cat', st.cat);
    if (st.colls.size === 1) u.set('coll', [...st.colls][0]);
    if (st.colors.size === 1) u.set('colore', [...st.colors][0]);
    if (st.page > 1) u.set('pagina', st.page);
    if (hdr !== HDR_DEFAULT) u.set('hdr', hdr);
    history.replaceState(null, '', u.toString() ? '?' + u : location.pathname);
    if (scroll === 'shop') scrollTo({ top: Math.max(0, $('#cat-shop').getBoundingClientRect().top + scrollY - $('.topbar').offsetHeight), behavior: smooth() });
    else if (scroll) $('#fbar-wrap').scrollIntoView({ behavior: smooth() });
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
  grid.addEventListener('click', e => { if (e.target.closest('[data-qv]')) PM.quickView(); });

  $$('[data-back]').forEach(l => l.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  // a colour picked in search stays on this page
  PM.onColorPick = name => { st.q = ''; showQuery(); st.mood = name; st.colors = new Set([MOOD_TO_COLOR[name] || name]); st.page = 1; apply(true); toast(`Colore: ${name}`); };

  // ---------- "Shop by color" (replaces the banner on ?cat=semipermanente): a swatch filters the grid in place, tapping it again clears ----------
  const shopRow = $('#cat-shop-row');
  shopRow.innerHTML = MOODS.map(([label, f]) => `<button type="button" class="cs-item" data-mood="${label}" aria-pressed="false">
    <img src="img/mood-${f}.webp?v=3" alt="" width="51" height="122" decoding="async"><span>${label}</span></button>`).join('');
  shopRow.addEventListener('click', e => {
    const m = e.target.closest('[data-mood]'); if (!m) return;
    if (m.getAttribute('aria-pressed') === 'true') { st.mood = null; st.colors.clear(); }
    else { st.mood = m.dataset.mood; st.colors = new Set([MOOD_TO_COLOR[st.mood]]); }
    st.page = 1; buzz(6); apply(hdr === '0' ? true : 'shop');
  });

  // ---------- header variants above the swatches, for review: ?hdr=i|j|k|l|m|n (0 = current). All share one markup:
  // the title turns into the picked colour's name and part of the block takes shades of it —
  // i spotlight under the picked nail; j–n a card behind the title: j flat, k radial, l mesh, m aurora, n gloss
  const MOOD_DEEP = { 'b & w': '#111', grigio: '#55565d', nude: '#8f6b62', rosa: '#c94f8a', rosso: '#b0001c', bordeaux: '#4a0a08', lampone: '#a61433', fucsia: '#c0136a',
    lilla: '#7d43b3', cioccolato: '#341210', glitter: '#8a5c55', blu: '#264996', verde: '#3b6e21', giallo: '#8a7316' };
  const MOOD_SOFT = { 'b & w': '#f0f0f0', grigio: '#eeeef1', nude: '#f7ede9', rosa: '#fde6f0', rosso: '#fbe3e5', bordeaux: '#f4e3e2', lampone: '#f9e1e7', fucsia: '#fde2ef',
    lilla: '#efe6fa', cioccolato: '#f0e7e4', glitter: '#f6eae6', blu: '#e4eaf7', verde: '#e6f1e0', giallo: '#fbf4d6' };
  const shop = $('#cat-shop'), HDRS = ['0', 'i', 'j', 'k', 'l', 'm', 'n'];
  const HDR_DEFAULT = 'm';
  let hdr = HDRS.includes(qs.get('hdr')) ? qs.get('hdr') : HDR_DEFAULT;
  function setHdr(v) {
    hdr = v; shop.dataset.hdr = v; shop.classList.toggle('carded', 'jkln'.includes(v));
    $$('.cs-v', shop).forEach((el, i) => { el.hidden = el.dataset.v !== (v === '0' ? '0' : 'd'); const h = $('h1', el); h.id = 'cat-shop-h' + i; if (!el.hidden) shop.setAttribute('aria-labelledby', h.id); });
    $$('[data-hdr]', $('#cs-switch')).forEach(b => b.setAttribute('aria-pressed', b.dataset.hdr === v));
  }
  $('#cs-switch').addEventListener('click', e => { const b = e.target.closest('[data-hdr]'); if (b) { setHdr(b.dataset.hdr); apply(); } });
  shop.addEventListener('click', e => { if (e.target.closest('[data-cs-clear]')) { st.mood = null; st.colors.clear(); st.page = 1; buzz(6); apply(); } });
  // i: the spotlight sits under the picked nail
  function spot() {
    const m = $('.cs-item[aria-pressed=true] img', shop); if (!m) return;
    const r = shop.getBoundingClientRect(), n = m.getBoundingClientRect();
    shop.style.setProperty('--sx', `${n.left + n.width / 2 - r.left}px`); shop.style.setProperty('--sy', `${n.top + n.height / 2 - r.top}px`);
  }
  addEventListener('resize', spot);
  let shownBig = null;
  function syncHead(n) {
    const c = st.colors.size === 1 ? [...st.colors][0] : null;
    const name = c && st.mood && MOOD_TO_COLOR[st.mood] === c ? st.mood : c ? COLORS.find(x => x[0] === c)[1] : st.colors.size ? `${st.colors.size} colori` : null;
    $$('[data-cs-n]', shop).forEach(b => { b.textContent = n; });
    $$('[data-cs-hint]', shop).forEach(b => { b.hidden = !!name; });
    $$('[data-cs-picked]', shop).forEach(b => { b.hidden = !name; });
    $$('[data-cs-clear]', shop).forEach(b => { b.hidden = !name; });
    if (name) shop.style.setProperty('--deep', MOOD_DEEP[name] || '#111'); else shop.style.removeProperty('--deep');
    if (name) shop.style.setProperty('--soft', MOOD_SOFT[name] || '#f3efeb'); else shop.style.removeProperty('--soft');
    shop.classList.toggle('picked', !!name);
    spot();
    const big = $('[data-cs-big]', shop), bigTxt = name ? name[0].toUpperCase() + name.slice(1) : 'Scegli il tuo colore';
    if (bigTxt !== shownBig) { big.textContent = bigTxt; big.classList.remove('swap'); void big.offsetWidth; if (shownBig !== null) big.classList.add('swap'); shownBig = bigTxt; }
  }
  setHdr(hdr);
  if (st.colors.size && !document.documentElement.classList.contains('cat-semi')) setPanel(true);
  apply(!!st.q);                                                     // arriving from search: go straight to the results
  PM.ready();
})();
