/* PriMo Nails – product detail (page "prodotto.html" and the quick view on the catalogue).
   Design: "product page mob" / "product seasons" (440) and "Desktop - 15" / "product page no sale" (1440). */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, money, toast, addToCart, flashAdded, buzz } = PM;

  const { KITS, BY_ID, PRODUCTS, CAT_LABEL, swatchBg, family, label } = PM.CATALOG;
  const chev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  // descriptions per category until the sheet's own copy is in (PRODUCTS: DESCRIPTION / APPLICATION / INGREDIENTS IT)
  const ACC = [
    ['Descrizione', 'Gel polish semipermanente ad alta pigmentazione: copertura piena in due passate, brillantezza a lunga durata e rimozione semplice. Formula TPO & HEMA free.'],
    ['Applicazione', '1. Prepara l’unghia e applica la base. 2. Stendi due strati sottili di colore, catalizzando ciascuno 60 s in lampada LED. 3. Sigilla con il top coat e catalizza.'],
    ['Ingredienti', 'Di(trimethylolpropane) tetraacrylate, Hydroxypropyl methacrylate, Ethyl trimethylbenzoyl phenylphosphinate, Pigmenti (CI 77891, CI 77007).'],
  ];
  const accOf = p => (p.acc ? [['Descrizione', p.acc[0]], ['Applicazione', p.acc[1]], ['Ingredienti', p.acc[2]]].filter(x => x[1]) : p.cat === 'semipermanente' || p.cat === 'kit' ? ACC : []);
  const shadeName = p => (p.num ? `${p.num} ${p.name}` : p.name);

  /* What the panel shows. A kit: its nine shades plus "all" (the kit itself). A product: its family as swatches, itself selected. */
  const viewOf = opts => {
    if (KITS[opts.kit]) { const k = KITS[opts.kit]; return { main: BY_ID['k-' + opts.kit], shades: k.shades, all: k.all }; }
    const p = BY_ID[opts.id] || BY_ID.s112, f = family(p);
    return { main: p, shades: f.length > 1 ? f : [], all: null };
  };
  const swatch = (q, sel) => `<button type="button" class="psw" data-id="${q.id}" aria-pressed="${sel}" aria-label="${label(q)}" style="${swatchBg(q.cell)}"></button>`;
  const priceHtml = p => `<p class="p-price${p.old ? '' : ' nosale'}"><b>${money(p.price)}</b>${p.old ? `<s>${money(p.old)}</s>` : ''}</p>`;
  // the same product sold in more than one size (e.g. Cleaner Emotion 100 ml / 1000 ml): one chip per size
  const sizesOf = p => (p.num || p.kit ? [] : PRODUCTS.filter(x => x.name === p.name && x.cat === p.cat).sort((a, b) => a.price - b.price));
  const sizesHtml = p => {
    const s = sizesOf(p);
    if (s.length < 2) return `<span class="p-size" data-p-size>${p.size}</span>`;
    return `<div class="p-sizes" role="group" aria-label="Formato" data-p-size>${s.map(q => `<button type="button" class="p-size" data-id="${q.id}" aria-pressed="${q === p}">${q.size}</button>`).join('')}</div>`;
  };
  const badgeHtml = p => (p.old ? `<span class="p-badge">${Math.round((1 - p.price / p.old) * 100)}%</span>` : '');

  /** Fills `root` with gallery + details. opts: { kit } or { id }, idp = id prefix for the accordions. The picked product is root.dataset.id. */
  PM.renderProduct = (root, opts) => {
    const v = viewOf(opts), p = v.main, id = opts.idp || 'p';
    root.dataset.id = p.id;
    root.innerHTML = `
      <div class="gallery" aria-roledescription="carousel" aria-label="Foto prodotto">
        <div class="g-track" tabindex="0" aria-label="Foto prodotto: scorri per vedere le altre">
          <figure class="g-slide"><img src="img/product.jpg" alt="${p.name}: flacone e unghia campione" draggable="false"></figure>
          <figure class="g-slide g-zoom"><img src="img/product.jpg" alt="${p.name}: dettaglio del colore" draggable="false" loading="lazy"></figure>
        </div>
        <span class="g-chip" data-g-chip${p.cell ? '' : ' hidden'}><i style="${p.cell ? swatchBg(p.cell) : ''}"></i><b>${p.cell ? shadeName(p) : ''}</b></span>
        <div class="g-dots"><button type="button" aria-label="Foto 1" aria-current="true"></button><button type="button" aria-label="Foto 2"></button></div>
      </div>
      <div class="pinfo">
        <p class="p-eyebrow" data-p-cat>${CAT_LABEL[p.cat]}</p>
        ${badgeHtml(p)}
        <h1 class="p-title" data-p-title>${label(p)}</h1>
        <div class="p-row">
          ${priceHtml(p)}
          ${sizesHtml(p)}
        </div>
        ${v.shades.length ? `<div class="p-shades-h"><b>Sfumature: <span data-shade-name>${v.all ? 'set completo' : shadeName(p)}</span></b><span><em>${v.shades.length}</em> Colori</span></div>
        <div class="p-grid" role="group" aria-label="Sfumature">
          ${v.all ? `<button type="button" class="psw all" data-id="${p.id}" aria-pressed="true" aria-label="Set completo" style="--c:${v.all}">all</button>` : ''}
          ${v.shades.map(q => swatch(q, q === p)).join('')}
        </div>` : ''}
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
        <div class="p-acc" data-p-acc>${accHtml(p, id)}</div>
      </div>`;
    wire(root, v);
  };
  const accHtml = (p, id) => accOf(p).map(([h, t], i) => `<details><summary><span>${h}</span>${chev}</summary><p id="${id}-acc${i}">${t.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p></details>`).join('');

  /* a swatch was picked: in a kit only the shade line changes (the title stays the kit's); for a product the whole panel becomes the sibling */
  function showPicked(root, v, q) {
    root.dataset.id = q.id;
    $$('.psw', root).forEach(x => x.setAttribute('aria-pressed', x.dataset.id === q.id));
    // the photo carries a chip with the picked colour, so the choice shows next to the picture
    const chip = $('[data-g-chip]', root);
    if (chip) { chip.hidden = !q.cell; if (q.cell) { $('i', chip).style.cssText = swatchBg(q.cell); $('b', chip).textContent = shadeName(q); chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); } }
    const sn = $('[data-shade-name]', root); if (sn) sn.textContent = q.kit ? 'set completo' : shadeName(q);
    if (!v.all) {
      $('[data-p-title]', root).textContent = label(q);
      $('[data-p-cat]', root).textContent = CAT_LABEL[q.cat];
      $('.p-price', root).outerHTML = priceHtml(q);
      $('[data-p-size]', root).outerHTML = sizesHtml(q);
      $('.p-badge', root)?.remove(); $('[data-p-title]', root).insertAdjacentHTML('beforebegin', badgeHtml(q));
      $('[data-p-acc]', root).innerHTML = accHtml(q, root.id === 'qv-body' ? 'qv' : 'p');
    }
    root.dispatchEvent(new CustomEvent('pm:pick', { bubbles: true, detail: q }));
  }

  function wire(root, v) {
    // gallery: swipe/scroll, dots, arrow keys
    const track = $('.g-track', root), dots = $$('.g-dots button', root);
    const setDot = () => { const i = Math.round(track.scrollLeft / track.clientWidth); dots.forEach((d, j) => (j === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current'))); };
    track.addEventListener('scroll', setDot, { passive: true });
    dots.forEach((d, i) => d.addEventListener('click', () => track.scrollTo({ left: i * track.clientWidth, behavior: PM.smooth() })));
    track.addEventListener('keydown', e => { const s = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (s) { e.preventDefault(); track.scrollBy({ left: s * track.clientWidth, behavior: PM.smooth() }); } });
    if (PM.finePointer) PM.dragScroll(track);
    // shades
    $('.p-grid', root)?.addEventListener('click', e => {
      const b = e.target.closest('.psw'); if (!b) return;
      showPicked(root, v, BY_ID[b.dataset.id]);
      if (e.isTrusted) buzz(6);
    });
    // sizes: the chips live in .pinfo, which showPicked re-renders, so listen on root
    root.addEventListener('click', e => {
      const b = e.target.closest('.p-sizes .p-size'); if (!b || b.getAttribute('aria-pressed') === 'true') return;
      showPicked(root, v, BY_ID[b.dataset.id]);
      if (e.isTrusted) buzz(6);
    });
    // accordions: one open at a time
    root.addEventListener('toggle', e => { if (e.target.open) $$('.p-acc details', root).forEach(o => { if (o !== e.target) o.open = false; }); }, true);
  }
  PM.pickShade = (root, id) => { const b = $(`.psw[data-id="${id}"]`, root); if (b) b.click(); };

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
      addToCart((scope === document ? $('#pdp') : $('#qv-body', scope)).dataset.id, qty);
      flashAdded(buy, '✓ Aggiunto');
      toast(`${qty} × aggiunto al carrello`);
    }
  });

  // ---------- quick view: the product panel in a dialog (catalogue "eye" button, home The Seasons) ----------
  // PM.quickView(what, shade): what = a kit ('inverno' | 'primavera' | 'estate' | 'autunno') or a product id; shade = a shade's product id to pre-select in a kit
  let qv, qvKit = 'inverno', qvId = null, qvReturn = null, qvClosing = 0;
  function buildQv() {
    document.body.insertAdjacentHTML('beforeend', `<div class="qv" id="qv" hidden>
    <div class="qv-modal" role="dialog" aria-modal="true" aria-label="Anteprima rapida">
      <div class="qv-head">
        <div class="qv-tabs season-tabs" id="qv-tabs" role="tablist" aria-label="Collezione">
          <span class="st-pill" aria-hidden="true"></span>${Object.entries(KITS).map(([k, v]) => `<button type="button" role="tab" data-kit="${k}" aria-selected="false" style="--glow:${v.glow}">${v.tab}</button>`).join('')}
        </div>
        <button type="button" class="qv-close ib" id="qv-close" aria-label="Chiudi anteprima"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="qv-scroll" id="qv-scroll">
        <div class="qv-body" id="qv-body"></div>
        <a class="qv-more" href="prodotto.html">Vai alla scheda prodotto</a>
      </div>
    </div></div>`);
    qv = $('#qv');
    const tabs = $('#qv-tabs');
    $('#qv-close').onclick = closeQv;
    $('#qv-scroll').addEventListener('scroll', e => $('.qv-head', qv).classList.toggle('scrolled', e.target.scrollTop > 0), { passive: true });
    qv.addEventListener('click', e => { if (e.target === qv) closeQv(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !qv.hidden) closeQv(); });
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-kit]'); if (b && b.dataset.kit !== qvKit) { qvKit = b.dataset.kit; renderQv(); } });
    tabs.addEventListener('keydown', e => {
      const list = $$('[data-kit]', tabs), i = list.indexOf(document.activeElement), s = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (s && i >= 0) { e.preventDefault(); const n = list[(i + s + list.length) % list.length]; n.focus(); n.click(); }
    });
    addEventListener('resize', () => { if (!qv.hidden) placeQv(); });
  }
  function placeQv() {
    const tabs = $('#qv-tabs'), b = $('[aria-selected=true]', tabs), pill = $('.st-pill', tabs);
    if (!b) return;
    pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; tabs.style.setProperty('--glow', KITS[qvKit].glow);
  }
  const pageHref = q => (q.kit ? `prodotto.html?kit=${q.kit}` : `prodotto.html?id=${q.id}`);
  function renderQv(shade) {
    const body = $('#qv-body');
    $('#qv-tabs').hidden = !!qvId;
    $$('#qv-tabs [data-kit]').forEach(t => t.setAttribute('aria-selected', !qvId && t.dataset.kit === qvKit));
    placeQv();
    PM.renderProduct(body, qvId ? { id: qvId, idp: 'qv' } : { kit: qvKit, idp: 'qv' });
    $('#qv-scroll').scrollTop = 0;
    if (shade) PM.pickShade(body, shade);
    $('.qv-more').href = qvId ? pageHref(BY_ID[body.dataset.id]) : `prodotto.html?kit=${qvKit}${body.dataset.id.startsWith('k-') ? '' : '&shade=' + body.dataset.id}`;
  }
  PM.quickView = (what, shade) => {
    if (!qv) buildQv();
    clearTimeout(qvClosing); qv.classList.remove('out');
    const p = BY_ID[what];
    if (KITS[what] || p?.kit) { qvKit = KITS[what] ? what : p.kit; qvId = null; }
    else if (p) qvId = what;                                              // nothing given: reopen on what was shown last
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
  // the link to the full page follows the colour picked in the panel
  document.addEventListener('pm:pick', e => {
    if (e.target.id !== 'qv-body') return;
    const q = e.detail;
    $('.qv-more').href = qvId || q.kit ? pageHref(q) : `prodotto.html?kit=${qvKit}&shade=${q.id}`;
  });

  // ---------- the product page itself ----------
  const page = $('#pdp');
  if (!page) return;
  const params = new URLSearchParams(location.search);
  // phone layout: d (pinned photo, details on a card) is the default; ?layout=a|b|c keeps the other drafts reachable (css/product.css ".pdp.lb" / ".lc" / ".ld")
  const asked = params.get('layout');
  const layout = ['a', 'b', 'c'].includes(asked) ? asked : 'd';
  const lay = layout !== 'd' ? '&layout=' + layout : '';
  if (layout !== 'a') $('.pdp').classList.add('l' + layout);
  // layout c: on phones the swatches ride on the photo, so picking a colour and seeing it happen in one place
  const phoneMQ = matchMedia('(max-width:1023.98px)');
  const placeSwatches = () => {
    const grid = $('.p-grid', page); if (layout !== 'c' || !grid) return;
    const onPhoto = phoneMQ.matches;
    (onPhoto ? $('.gallery', page) : $('.p-shades-h', page)).insertAdjacentElement(onPhoto ? 'beforeend' : 'afterend', grid);
  };
  phoneMQ.addEventListener('change', placeSwatches);
  const kitParam = (params.get('kit') || '').toLowerCase();
  let kit = KITS[kitParam] ? kitParam : null;
  const tabs = $('#season-tabs');
  /* page title, breadcrumb and description follow the product shown (a kit page keeps the kit's name while a shade is picked) */
  const setHead = p => {
    const main = kit ? BY_ID['k-' + kit] : p;
    document.title = `${label(main)} – PriMo Nails`;
    $$('[data-p=name]').forEach(n => { n.textContent = label(main); });
    $$('[data-p=cat]').forEach(a => { a.textContent = CAT_LABEL[main.cat]; a.href = `catalogo.html?cat=${main.cat}`; });
    $('meta[name=description]')?.setAttribute('content', `${label(main)}: ${CAT_LABEL[main.cat].toLowerCase()} PriMo Nails, ${main.size}.`);
  };
  const render = () => {
    PM.renderProduct(page, kit ? { kit } : { id: params.get('id') });
    setHead(BY_ID[page.dataset.id]);
    placeSwatches();
  };
  page.addEventListener('pm:pick', e => {
    const q = e.detail; setHead(q);
    // layout d: the card slides back down after a pick, so the pinned photo shows the colour in full
    if (layout === 'd' && phoneMQ.matches && scrollY > 0) scrollTo({ top: 0, behavior: PM.smooth() });
    history.replaceState(null, '', (kit ? `?kit=${kit}${q.kit ? '' : '&shade=' + q.id}` : `?id=${q.id}`) + lay);
  });
  if (kit) {                                              // the seasonal kit page shows the season switcher (design "product seasons")
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
      history.replaceState(null, '', `?kit=${kit}` + lay);
    });
    tabs.addEventListener('keydown', e => {
      const list = $$('[data-kit]', tabs), i = list.indexOf(document.activeElement), s = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (s && i >= 0) { e.preventDefault(); const n = list[(i + s + list.length) % list.length]; n.focus(); n.click(); }
    });
    addEventListener('resize', place); document.fonts.ready.then(place); place();
  }
  render();
  // remember what was viewed ("Visti di Recente")
  PM.store.set('primo.seen', [page.dataset.id, ...PM.store.get('primo.seen', []).filter(id => id !== page.dataset.id)].slice(0, 8));
  // a shade picked on the home page's The Seasons arrives pre-selected (?shade=<id>)
  if (kit && params.get('shade')) PM.pickShade(page, params.get('shade'));
  // "Indietro" goes back when we came from inside the site
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  // the phone add-to-cart bar hides while the footer is on screen so it never covers the links
  const bar = $('#buybar');
  new IntersectionObserver(ents => bar.classList.toggle('away', ents[0].isIntersecting)).observe($('.footer'));
  PM.ready();
})();
