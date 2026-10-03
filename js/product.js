/* PriMo Nails – product detail (page "prodotto.html" and the quick view on the catalogue).
   Design: "product page mob" / "product seasons" (440) and "Desktop - 15" / "product page no sale" (1440). */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, money, toast, addToCart, flashAdded, buzz } = PM;

  // the four season kits; Inverno uses the rendered swatches from the design, the others a glossy CSS swatch in their palette
  const KITS = {
    inverno: { tab: 'Inverno', name: 'Kit Collezione Invernale', glow: '#2f80e9', shades: [['night', 'Night Blue'], ['emerald', 'Emerald Blue'], ['viola', 'Viola Blue'], ['ocean', 'Ocean Blue'], ['ocean', 'Azure'], ['ocean', 'Cobalto'], ['ocean', 'Zaffiro'], ['ocean', 'Oltremare'], ['ocean', 'Indaco']], all: '#2e3a8f' },
    primavera: { tab: 'Primavera', name: 'Kit Collezione Primaverile', glow: '#e5668f', shades: [['#f6c9d6', 'Cipria'], ['#e98aa8', 'Peonia'], ['#f3b8a0', 'Pesca'], ['#d9b6e0', 'Lilla'], ['#c7d9a8', 'Menta'], ['#f4a3bd', 'Rosa'], ['#e7738f', 'Fragola'], ['#f0c7b5', 'Nude'], ['#c9a1d4', 'Glicine']], all: '#d9879f' },
    estate: { tab: 'Estate', name: 'Kit Collezione Estiva', glow: '#44c232', shades: [['#ff8a5c', 'Corallo'], ['#ffc247', 'Mango'], ['#f2545b', 'Anguria'], ['#6cc551', 'Lime'], ['#3fb6b2', 'Laguna'], ['#ff6f91', 'Flamingo'], ['#ffd166', 'Sole'], ['#2ec4b6', 'Turchese'], ['#ef476f', 'Lampone']], all: '#e0743d' },
    autunno: { tab: 'Autunno', name: 'Kit Collezione Autunnale', glow: '#f5a623', shades: [['#e9860f', 'Zucca'], ['#e1332a', 'Acero'], ['#8c3a12', 'Castagna'], ['#f0b429', 'Ocra'], ['#c2521e', 'Ruggine'], ['#a8391f', 'Mattone'], ['#6b4a2b', 'Cacao'], ['#d8a15a', 'Caramello'], ['#7a2e2e', 'Vinaccia']], all: '#b5541c' },
  };
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
        <p class="ship-note">Spedizione calcolata al checkout.</p>
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
      buzz(6);
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
  // "Indietro" goes back when we came from inside the site
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  // the phone add-to-cart bar hides while the footer is on screen so it never covers the links
  const bar = $('#buybar');
  new IntersectionObserver(ents => bar.classList.toggle('away', ents[0].isIntersecting)).observe($('.footer'));
  PM.ready();
})();
