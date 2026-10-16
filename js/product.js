/* PriMo Nails – product detail (page "prodotto.html" and the quick view on the catalogue).
   Design: "product page mob" / "product seasons" (440) and "Desktop - 15" / "product page no sale" (1440). */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, money, toast, addToCart, flashAdded, buzz } = PM;

  const KITS = PM.CATALOG.KITS;
  const PRICE = 14.99, OLD = 20.99;
  const euro = n => n.toFixed(2) + '€';
  const chev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const ACC = [
    ['Descrizione', 'Gel polish semipermanente ad alta pigmentazione: copertura piena in due passate, brillantezza a lunga durata e rimozione semplice. Formula TPO & HEMA free.'],
    ['Applicazione', '1. Prepara l’unghia e applica la base. 2. Stendi due strati sottili di colore, catalizzando ciascuno 60 s in lampada LED. 3. Sigilla con il top coat e catalizza.'],
    ['Ingredienti', 'Di(trimethylolpropane) tetraacrylate, Hydroxypropyl methacrylate, Ethyl trimethylbenzoyl phenylphosphinate, Pigmenti (CI 77891, CI 77007).'],
  ];

  const swatch = (kit, [s, label], i) => {
    const img = s.startsWith('#') ? `style="--c:${s}"` : `style="background-image:url(img/sw/${s}.png)"`;
    return `<button type="button" class="psw${s.startsWith('#') ? ' gloss' : ''}" data-i="${i + 1}" aria-pressed="false" aria-label="${label}" ${img}></button>`;
  };

  /** Fills `root` with gallery + details. opts: { kit, sale, buyInline, idp } */
  PM.renderProduct = (root, opts) => {
    const k = KITS[opts.kit] || KITS.inverno, sale = opts.sale !== false, id = opts.idp || 'p';
    root.innerHTML = `
      <div class="gallery" aria-roledescription="carousel" aria-label="Foto prodotto">
        <div class="g-track" tabindex="0" aria-label="Foto prodotto: scorri per vedere le altre">
          <figure class="g-slide"><img src="img/product.jpg" alt="${k.name}: flacone e unghia campione" draggable="false"></figure>
          <figure class="g-slide g-zoom"><img src="img/product.jpg" alt="${k.name}: dettaglio del colore" draggable="false" loading="lazy"></figure>
        </div>
        <div class="g-dots"><button type="button" aria-label="Foto 1" aria-current="true"></button><button type="button" aria-label="Foto 2"></button></div>
      </div>
      <div class="pinfo">
        ${sale ? '<span class="p-badge">28%</span>' : ''}
        <h1 class="p-title" data-p="name">${k.name}</h1>
        <p class="p-price${sale ? '' : ' nosale'}"><b>${euro(PRICE)}</b>${sale ? `<s>${euro(OLD)}</s>` : ''}</p>
        <span class="p-size">12 ml</span>
        <div class="p-shades-h"><b>Sfumature: <span data-shade-name>091</span></b><span><em>4</em> Colori</span></div>
        <div class="p-grid" role="group" aria-label="Sfumature">
          <button type="button" class="psw all" data-i="0" aria-pressed="true" aria-label="Set completo" style="--c:${k.all}">all</button>
          ${k.shades.map((s, i) => swatch(k, s, i)).join('')}
        </div>
        <div class="p-buy d-only">
          <div class="stepper" role="group" aria-label="Quantità">
            <button type="button" data-q="-1" aria-label="Diminuisci quantità"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg></button>
            <output data-q-out aria-live="polite">1</output>
            <button type="button" data-q="1" aria-label="Aumenta quantità"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg></button>
          </div>
          <button type="button" class="buy" data-buy>Add to Cart</button>
        </div>
        <div class="wholesale">
          <span class="ws-ic"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M14.8 7.5a1.84 1.84 0 0 0-2.6 0l-.2.3-.3-.3a1.84 1.84 0 1 0-2.4 2.8L12 13l2.7-2.7c.9-.9.8-2.1.1-2.8"/></svg></span>
          <p><b>Vuoi acquistare all’ingrosso?</b><span>Contattaci Su <a href="https://wa.me/393893193049" target="_blank" rel="noopener">WhatsApp</a> O Via <a href="mailto:primonailspro@gmail.com">e-mail.</a></span></p>
        </div>
        <p class="ship-note">Spedizione calcolata al checkout. <a href="spedizioni.html">Tariffe e resi</a></p>
        <div class="p-acc">${ACC.map(([h, t], i) => `<details><summary>${h}${chev}</summary><p id="${id}-acc${i}">${t}</p></details>`).join('')}</div>
      </div>`;
    wire(root, k);
  };

  function wire(root, k) {
    // gallery: swipe/scroll, dots, arrow keys
    const track = $('.g-track', root), dots = $$('.g-dots button', root);
    const setDot = () => { const i = Math.round(track.scrollLeft / track.clientWidth); dots.forEach((d, j) => (j === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current'))); };
    track.addEventListener('scroll', setDot, { passive: true });
    dots.forEach((d, i) => d.addEventListener('click', () => track.scrollTo({ left: i * track.clientWidth, behavior: PM.smooth() })));
    track.addEventListener('keydown', e => { const s = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (s) { e.preventDefault(); track.scrollBy({ left: s * track.clientWidth, behavior: PM.smooth() }); } });
    if (PM.finePointer) PM.dragScroll(track);
    // shades
    $('.p-grid', root).addEventListener('click', e => {
      const b = e.target.closest('.psw'); if (!b) return;
      $$('.psw', root).forEach(x => x.setAttribute('aria-pressed', x === b));
      const n = +b.dataset.i;
      $('[data-shade-name]', root).textContent = n ? `${String(90 + n).padStart(3, '0')} ${b.getAttribute('aria-label')}` : '091';
      if (e.isTrusted) buzz(6);
    });
    // accordions: one open at a time
    const acc = $$('.p-acc details', root);
    acc.forEach(d => d.addEventListener('toggle', () => { if (d.open) acc.forEach(o => { if (o !== d) o.open = false; }); }));
  }

  // quantity steppers + add to cart (page bar, inline desktop row, quick view) share one quantity per scope
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-q]');
    if (q) {
      const scope = q.closest('.qv-modal') || document;
      const outs = $$('[data-q-out]', scope).filter(o => (o.closest('.qv-modal') || document) === scope);
      const v = Math.max(1, Math.min(99, +outs[0].textContent + +q.dataset.q));
      outs.forEach(o => { o.textContent = v; });
      return;
    }
    const buy = e.target.closest('[data-buy]');
    if (buy) {
      const scope = buy.closest('.qv-modal') || document;
      const qty = +($('[data-q-out]', scope)?.textContent || 1);
      addToCart(0, qty);
      flashAdded(buy, '✓ Aggiunto');
      toast(`${qty} × aggiunto al carrello`);
    }
  });

  // ---------- quick view: the product panel in a dialog (catalogue "eye" button, home The Seasons) ----------
  // PM.quickView(kit, shade): kit = 'inverno' | 'primavera' | 'estate' | 'autunno', shade = 1…9 to pre-select a colour (0 = full set)
  let qv, qvKit = 'inverno', qvReturn = null, qvClosing = 0;
  const pickPsw = (root, n) => { const b = n > 0 && $(`.psw[data-i="${n}"]`, root); if (b) b.click(); };
  function buildQv() {
    document.body.insertAdjacentHTML('beforeend', `<div class="qv" id="qv" hidden>
    <div class="qv-modal" role="dialog" aria-modal="true" aria-label="Anteprima rapida">
      <button type="button" class="qv-close ib" id="qv-close" aria-label="Chiudi anteprima"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="qv-tabs season-tabs" id="qv-tabs" role="tablist" aria-label="Collezione">
        <span class="st-pill" aria-hidden="true"></span>${Object.entries(KITS).map(([k, v]) => `<button type="button" role="tab" data-kit="${k}" aria-selected="false" style="--glow:${v.glow}">${v.tab}</button>`).join('')}
      </div>
      <div class="qv-body" id="qv-body"></div>
      <a class="qv-more" href="prodotto.html">Vai alla scheda prodotto</a>
    </div></div>`);
    qv = $('#qv');
    const tabs = $('#qv-tabs');
    $('#qv-close').onclick = closeQv;
    qv.addEventListener('click', e => { if (e.target === qv) closeQv(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !qv.hidden) closeQv(); });
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-kit]'); if (b && b.dataset.kit !== qvKit) { qvKit = b.dataset.kit; renderQv(0); } });
    tabs.addEventListener('keydown', e => {
      const list = $$('[data-kit]', tabs), i = list.indexOf(document.activeElement), s = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (s && i >= 0) { e.preventDefault(); const n = list[(i + s + list.length) % list.length]; n.focus(); n.click(); }
    });
    addEventListener('resize', () => { if (!qv.hidden) placeQv(); });
  }
  function placeQv() {
    const tabs = $('#qv-tabs'), b = $('[aria-selected=true]', tabs), pill = $('.st-pill', tabs);
    pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; tabs.style.setProperty('--glow', KITS[qvKit].glow);
  }
  function renderQv(shade) {
    $$('#qv-tabs [data-kit]').forEach(t => t.setAttribute('aria-selected', t.dataset.kit === qvKit));
    placeQv();
    PM.renderProduct($('#qv-body'), { kit: qvKit, sale: true, idp: 'qv' });
    pickPsw($('#qv-body'), shade);
    const sel = $('#qv-body .psw[aria-pressed=true]');
    $('.qv-more').href = `prodotto.html?kit=${qvKit}${sel && sel.dataset.i !== '0' ? '&shade=' + sel.dataset.i : ''}`;
  }
  PM.quickView = (kit, shade = 0) => {
    if (!qv) buildQv();
    clearTimeout(qvClosing); qv.classList.remove('out');
    if (KITS[kit]) qvKit = kit;                                           // no kit: reopen on the last one shown
    if (qv.hidden) qvReturn = document.activeElement;
    qv.hidden = false; PM.root.classList.add('lock');
    [$('.topbar'), $('#top'), $('.footer')].forEach(n => { if (n) n.inert = true; });
    renderQv(shade);
    requestAnimationFrame(() => { placeQv(); $('#qv-close').focus({ preventScroll: true }); });
  };
  function closeQv() {
    if (qv.hidden || qv.classList.contains('out')) return;
    qv.classList.add('out');                                              // play the closing animation, then hide
    qvClosing = setTimeout(() => { qv.hidden = true; qv.classList.remove('out'); }, PM.reduceMotion ? 0 : 230);
    PM.root.classList.remove('lock');
    [$('.topbar'), $('#top'), $('.footer')].forEach(n => { if (n) n.inert = false; });
    qvReturn?.focus({ preventScroll: true });
  }
  // the shade link in the panel keeps the picked colour when going to the full product page
  document.addEventListener('click', e => {
    const b = e.target.closest('#qv-body .psw'); if (!b) return;
    $('.qv-more').href = `prodotto.html?kit=${qvKit}${b.dataset.i !== '0' ? '&shade=' + b.dataset.i : ''}`;
  });

  // ---------- the product page itself ----------
  const page = $('#pdp');
  if (!page) return;
  const params = new URLSearchParams(location.search);
  const kitParam = (params.get('kit') || '').toLowerCase();
  let kit = KITS[kitParam] ? kitParam : 'inverno';
  const sale = params.get('sale') !== '0';
  const tabs = $('#season-tabs');
  const render = () => {
    PM.renderProduct(page, { kit, sale });
    document.title = `${KITS[kit].name} – PriMo Nails`;
    $$('[data-p=name]').forEach(n => { n.textContent = KITS[kit].name; });
  };
  if (KITS[kitParam]) {                                   // the seasonal kit page shows the season switcher (design "product seasons")
    document.body.classList.add('kit');
    tabs.hidden = false;
    tabs.innerHTML = '<span class="st-pill" aria-hidden="true"></span>' + Object.entries(KITS).map(([key, v]) =>
      `<button type="button" role="tab" data-kit="${key}" aria-selected="${key === kit}" style="--glow:${v.glow}">${v.tab}</button>`).join('');
    const pill = $('.st-pill', tabs);
    const place = () => { const b = $('[aria-selected=true]', tabs); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; tabs.style.setProperty('--glow', KITS[kit].glow); };
    tabs.addEventListener('click', e => {
      const b = e.target.closest('[data-kit]'); if (!b || b.dataset.kit === kit) return;
      kit = b.dataset.kit;
      $$('[data-kit]', tabs).forEach(t => t.setAttribute('aria-selected', t === b));
      place(); render();
      history.replaceState(null, '', `?kit=${kit}${sale ? '' : '&sale=0'}`);
    });
    tabs.addEventListener('keydown', e => {
      const list = $$('[data-kit]', tabs), i = list.indexOf(document.activeElement), s = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (s && i >= 0) { e.preventDefault(); const n = list[(i + s + list.length) % list.length]; n.focus(); n.click(); }
    });
    addEventListener('resize', place); document.fonts.ready.then(place); place();
  }
  render();
  // a shade picked on the home page's The Seasons arrives pre-selected (?shade=1…9)
  const shade = $(`.psw[data-i="${parseInt(params.get('shade'), 10) || 0}"]`, page);
  if (shade && shade.dataset.i !== '0') shade.click();
  // "Indietro" goes back when we came from inside the site
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  // the phone add-to-cart bar hides while the footer is on screen so it never covers the links
  const bar = $('#buybar');
  new IntersectionObserver(ents => bar.classList.toggle('away', ents[0].isIntersecting)).observe($('.footer'));
  PM.ready();
})();
