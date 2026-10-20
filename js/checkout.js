/* PriMo Nails – checkout. Front-end only: reads the localStorage cart, prices GLS shipping by zone and weight (the same
   tables as spedizioni.html), validates the form and simulates the payment, ending on an order confirmation. */
(() => {
  'use strict';
  const { $, $$, money, store, toast, buzz, smooth, reduceMotion, openOverlay, cartLines, clearCart } = window.PM;
  const { BY_ID, CAT_LABEL, swatchBg, label, imgOf } = window.PM.CATALOG;

  // ---------- shipping: GLS rates per zone, [max kg, €] (spedizioni.html#tariffe) ----------
  const ZONES = {
    it: { label: 'Italia continentale', free: 99, days: [3, 5], rates: [[3, 7], [5, 7], [10, 10], [25, 15], [50, 20], [100, 35]] },
    sud: { label: 'Sicilia e Calabria', free: 99, days: [3, 5], rates: [[3, 8], [5, 10], [10, 12], [25, 17], [50, 23], [100, 38]] },
    sar: { label: 'Sardegna', free: 199, days: [3, 5], rates: [[3, 16], [5, 18], [10, 20], [25, 25], [50, 32], [100, 45]] },
    z1: { label: 'Europa, Zona 1', free: 199, days: [4, 7], rates: [[3, 16], [5, 18], [10, 20], [15, 23], [20, 25], [25, 27], [40, 33]] },
    z2: { label: 'Europa, Zona 2', free: 299, days: [5, 8], rates: [[3, 20], [5, 23], [10, 26], [15, 29], [20, 33], [25, 36], [40, 45]] },
  };
  const COUNTRIES = [['IT', 'Italia', 'it'],
    ...['Austria', 'Belgio', 'Croazia', 'Danimarca', 'Francia', 'Germania', 'Lussemburgo', 'Paesi Bassi', 'Polonia', 'Portogallo', 'Repubblica Ceca', 'Romania', 'Slovacchia', 'Slovenia', 'Spagna', 'Ungheria'].map(n => [n, n, 'z1']),
    ...['Bulgaria', 'Estonia', 'Grecia', 'Irlanda', 'Lettonia', 'Lituania', 'Svezia'].map(n => [n, n, 'z2'])];
  const REGIONS = ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise',
    'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'];
  const KG_ITEM = 0.1, KG_BOX = 0.4;                         // a 12 ml bottle with its padding, plus the carton
  const CODES = { PRIMO10: 0.1 };                            // demo discount code

  const wrap = $('#co-wrap'), empty = $('#co-empty'), done = $('#co-done'), form = $('#co-form');
  const country = $('#country'), region = $('#region');
  country.innerHTML = COUNTRIES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  region.innerHTML = '<option value="">Seleziona</option>' + REGIONS.map(r => `<option>${r}</option>`).join('');
  region.value = 'Lombardia';

  let code = store.get('primo.checkout.code', '');
  if (!CODES[code]) code = '';

  const zoneKey = () => {
    const c = COUNTRIES.find(c => c[0] === country.value);
    if (c[2] !== 'it') return c[2];
    return region.value === 'Sardegna' ? 'sar' : region.value === 'Sicilia' || region.value === 'Calabria' ? 'sud' : 'it';
  };
  function quote(lines) {
    const n = lines.reduce((a, l) => a + l.qty, 0), sub = lines.reduce((a, l) => a + l.qty * BY_ID[l.id].price, 0);
    const disc = Math.round(sub * (CODES[code] || 0) * 100) / 100;
    const z = ZONES[zoneKey()], kg = KG_BOX + n * KG_ITEM;
    const row = z.rates.find(r => kg <= r[0]) || z.rates[z.rates.length - 1];
    const ship = sub >= z.free ? 0 : row[1];
    return { n, sub, disc, ship, total: sub - disc + ship, z, kg };
  }

  // business-day delivery window: 1–2 days to prepare in Milan, then the courier's days
  const fmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'long' });
  const addWorkdays = (d, n) => { d = new Date(d); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; } return d; };
  const eta = z => { const now = new Date(); return [addWorkdays(now, 1 + z.days[0]), addWorkdays(now, 2 + z.days[1])].map(d => fmt.format(d)); };

  const itemsHTML = lines => lines.map(l => { const p = BY_ID[l.id]; return `<li class="co-item">
      <span class="co-thumb"><img src="${imgOf(p)}" alt="" width="60" height="60"><b aria-label="Quantità ${l.qty}">${l.qty}</b></span>
      <span class="co-item-b"><b>${label(p)}</b><small>${p.cell ? `<i class="ci-dot" style="${swatchBg(p.cell)}"></i>` : ''}${CAT_LABEL[p.cat]} · ${p.size}</small></span>
      <span class="co-item-p">${money(p.price * l.qty)}</span></li>`; }).join('');

  function render() {
    if (ordered) return;
    const lines = cartLines(), q = quote(lines);
    wrap.hidden = !q.n; empty.hidden = !!q.n;
    $('.co-steps').hidden = !q.n;
    if (!q.n) return;
    $('#sum-items').innerHTML = itemsHTML(lines);
    $('#sum-sub').textContent = money(q.sub);
    $('#sum-disc-row').hidden = !q.disc;
    $('#sum-disc-code').textContent = code ? `(${code})` : '';
    $('#sum-disc').textContent = '−' + money(q.disc);
    $('#sum-zone').textContent = q.z.label;
    $('#sum-ship').textContent = $('#ship-price').textContent = q.ship ? money(q.ship) : 'Gratis';
    $('#sum-ship').classList.toggle('free', !q.ship); $('#ship-price').classList.toggle('free', !q.ship);
    $$('[data-total]').forEach(el => { el.textContent = money(q.total); });
    $('#pay-txt').textContent = `Paga ${money(q.total)}`;
    const [a, b] = eta(q.z);
    $('#ship-eta').textContent = `Consegna stimata ${a} – ${b}`;
    const left = Math.max(0, q.z.free - q.sub);
    $('#sum-free').classList.toggle('done', !left);
    $('#sum-free-txt').innerHTML = left ? `Ti mancano <b>${money(left)}</b> per la spedizione gratuita (${q.z.label})` : `<b>Spedizione gratuita</b> · ${q.z.label}`;
    $('#sum-free-fill').style.width = Math.min(100, q.sub / q.z.free * 100) + '%';
  }

  // ---------- order summary: collapsible on phones, always open on desktop ----------
  const toggle = $('#sum-toggle');
  toggle.onclick = () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open);
    $('#sum-toggle-txt').textContent = open ? 'Nascondi riepilogo' : 'Mostra riepilogo';
    buzz(8);
  };
  $('#sum-edit').onclick = () => openOverlay('cart', '#cart-close');

  $('#code-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#code').value.trim().toUpperCase(), msg = $('#code-msg');
    if (!v) return;
    if (CODES[v]) { code = v; store.set('primo.checkout.code', v); msg.className = 'co-code-msg ok'; msg.textContent = `Codice ${v} applicato: −${CODES[v] * 100}%`; $('#code').value = ''; }
    else { msg.className = 'co-code-msg bad'; msg.textContent = 'Codice non valido. Prova PRIMO10.'; }
    render();
  });

  // ---------- address: Italy shows regions (they pick the zone) and a 5-digit CAP ----------
  function syncCountry() {
    const it = country.value === 'IT';
    $('#region-fld').hidden = !it; region.disabled = !it;
    form.cap.placeholder = it ? '20121' : '';
    render();
  }
  country.addEventListener('change', syncCountry);
  region.addEventListener('change', render);
  $('#invoice-toggle').addEventListener('change', e => { $('#invoice').hidden = !e.target.checked; if (e.target.checked) form.piva.focus(); });
  const payMethod = () => form.pagamento.value;
  form.addEventListener('change', e => { if (e.target.name === 'pagamento') $('#card-form').hidden = payMethod() !== 'carta'; });

  // card number in groups of four, expiry as MM / AA
  $('#cc').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); });
  $('#exp').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  });
  form.cvc.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });

  // ---------- validation ----------
  const luhn = n => { let s = 0; [...n].reverse().forEach((c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; }); return s % 10 === 0; };
  function check(input) {
    const v = input.value.trim(), name = input.name;
    const needed = input.required || (input.dataset.reqIf === 'fattura' ? form.fattura.checked : input.dataset.reqIf === 'carta' ? payMethod() === 'carta' : false);
    if (!needed && !v) return '';
    if (!v) return 'Campo obbligatorio';
    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Inserisci un’email valida';
    if (name === 'tel' && v.replace(/\D/g, '').length < 8) return 'Inserisci un numero valido';
    if (name === 'cap' && country.value === 'IT' && !/^\d{5}$/.test(v)) return 'Il CAP ha 5 cifre';
    if (name === 'piva' && !/^([A-Z0-9]{16}|\d{11})$/i.test(v.replace(/\s/g, ''))) return 'P. IVA (11 cifre) o codice fiscale (16 caratteri)';
    if (name === 'cc') { const d = v.replace(/\s/g, ''); if (d.length < 13 || !luhn(d)) return 'Numero di carta non valido'; }
    if (name === 'exp') {
      const m = v.match(/^(\d{2}) \/ (\d{2})$/); if (!m || +m[1] < 1 || +m[1] > 12) return 'Usa il formato MM / AA';
      const now = new Date(), y = 2000 + +m[2];
      if (y < now.getFullYear() || (y === now.getFullYear() && +m[1] < now.getMonth() + 1)) return 'La carta è scaduta';
    }
    if (name === 'cvc' && !/^\d{3,4}$/.test(v)) return '3 o 4 cifre';
    return '';
  }
  const fields = () => $$('.co-f input', form).filter(i => !i.closest('[hidden]'));
  function mark(input) {
    const err = check(input), f = input.closest('.co-f');
    f.classList.toggle('bad', !!err);
    input.setAttribute('aria-invalid', !!err);
    const msg = $('.co-err', f); if (msg) msg.textContent = err;
    return !err;
  }
  form.addEventListener('focusout', e => { if (e.target.matches('.co-f input') && e.target.value) mark(e.target); });
  form.addEventListener('input', e => { const f = e.target.closest('.co-f.bad'); if (f) mark(e.target); });
  form.terms.addEventListener('change', () => { if (form.terms.checked) $('#terms-err').textContent = ''; });

  // ---------- place the order (simulated) ----------
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = fields().filter(i => !mark(i));
    if (!form.terms.checked) $('#terms-err').textContent = 'Accetta le condizioni di vendita per continuare';
    if (bad.length || !form.terms.checked) {
      const first = bad[0] || form.terms;
      first.scrollIntoView({ behavior: smooth(), block: 'center' }); first.focus({ preventScroll: true });
      toast(bad.length ? `Controlla ${bad.length === 1 ? 'il campo evidenziato' : `i ${bad.length} campi evidenziati`}` : 'Accetta le condizioni di vendita');
      buzz([10, 40, 10]);
      return;
    }
    const btn = $('#pay-btn');
    btn.disabled = true; btn.classList.add('busy');
    $('#pay-txt').textContent = payMethod() === 'paypal' ? 'Collegamento a PayPal…' : 'Pagamento in corso…';
    setTimeout(placeOrder, reduceMotion ? 300 : 1600);
  });

  function placeOrder() {
    const lines = cartLines(), d = Object.fromEntries(new FormData(form));
    showOrder({ num: 'PN-' + String(Date.now()).slice(-6), d, lines, q: quote(lines) });
    store.set('primo.checkout.code', '');
    clearCart();
  }

  /* The confirmation has two designs: B (dark hero + order tracker, the default) and A (the white card, ?conferma=a).
     ?anteprima opens the confirmation straight away with a demo order, without touching the cart. */
  const qs = new URLSearchParams(location.search);
  const variant = qs.get('conferma') === 'a' ? 'a' : 'b';
  let ordered = false;
  function showOrder(o) {
    ordered = true;
    o.eta = eta(o.q.z);
    o.pay = { carta: `Carta •••• ${(o.d.cc || '').replace(/\s/g, '').slice(-4)}`, paypal: 'PayPal', bonifico: 'Bonifico bancario' }[o.d.pagamento];
    o.place = [o.d.via, o.d.via2, `${o.d.cap} ${o.d.citta}`, o.d.paese === 'IT' ? `${o.d.regione ? o.d.regione + ', ' : ''}Italia` : o.d.paese].filter(Boolean).map(esc).join('<br>');
    wrap.hidden = true; empty.hidden = true; $('.co-steps').hidden = true;
    document.title = 'Ordine confermato – PriMo Nails';
    const view = variant === 'b' ? renderB(o) : renderA(o);
    view.hidden = false;
    scrollTo({ top: 0, behavior: smooth() });
    view.focus({ preventScroll: true });
    if (!qs.has('anteprima')) buzz([12, 60, 12]);
  }

  function renderA({ num, d, lines, q, eta: [a, b], pay, place }) {
    $('#done-n').textContent = num;
    $('#done-name').textContent = d.nome ? `, ${d.nome.trim()}` : '';
    $('#done-lead').innerHTML = d.pagamento === 'bonifico'
      ? `Abbiamo ricevuto il tuo ordine. Ti abbiamo inviato le coordinate per il bonifico a <b>${esc(d.email)}</b>: spediamo appena riceviamo il pagamento.`
      : `Il tuo ordine è confermato. Ti abbiamo inviato il riepilogo a <b>${esc(d.email)}</b> e ti scriveremo con il link di tracciamento GLS quando parte.`;
    $('#done-dl').innerHTML = `<div><dt>Consegna stimata</dt><dd>${a} – ${b}</dd></div>
      <div><dt>Spedizione a</dt><dd>${esc(`${d.nome} ${d.cognome}`)}<br>${place}</dd></div>
      <div><dt>Pagamento</dt><dd>${pay}</dd></div>
      <div><dt>Totale</dt><dd><b>${money(q.total)}</b>${q.ship ? ` <small>di cui spedizione ${money(q.ship)}</small>` : ' <small>spedizione gratuita</small>'}</dd></div>`;
    $('#done-items').innerHTML = itemsHTML(lines);
    $('#co-title').textContent = 'Ordine confermato';
    return done;
  }

  const day = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  function renderB({ num, d, lines, q, eta: [a, b], pay, place }) {
    const now = new Date(), wire = d.pagamento === 'bonifico', name = (d.nome || '').trim();
    const steps = [
      [wire ? 'In attesa del bonifico' : 'Ordine confermato', wire ? 'Spediamo quando arriva il pagamento' : `Oggi, ${day.format(now)}`, wire ? 'now' : 'done'],
      ['In preparazione', `Nel nostro laboratorio di Milano, entro ${day.format(addWorkdays(now, 2))}`, wire ? '' : 'now'],
      ['Spedito con GLS', 'Ti inviamo il link di tracciamento', ''],
      ['Consegna', `${a} – ${b}`, ''],
    ];
    const n = lines.reduce((s, l) => s + l.qty, 0);
    const sec = $('#co-done-b');
    sec.innerHTML = `
      <div class="cb-hero">
        <div class="cb-hero-in">
          <div class="cb-badge" aria-hidden="true">${TICK}</div>
          <p class="cx-eyebrow">${wire ? 'Ordine ricevuto' : 'Pagamento riuscito'}</p>
          <h1 id="cb-h">Grazie${name ? `, ${esc(name)}` : ''}.<span>${wire ? 'Il tuo ordine ti aspetta.' : 'I tuoi colori sono in arrivo.'}</span></h1>
          <p class="cb-lead">${wire ? 'Ti abbiamo inviato le coordinate per il bonifico a' : 'Abbiamo inviato la conferma a'} <b>${esc(d.email)}</b>.</p>
          <div class="cb-num"><span>Ordine <b>${num}</b></span><button type="button" class="cb-copy" data-copy="${num}" aria-label="Copia il numero d’ordine"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg></button></div>
          <div class="cb-stack" aria-label="${n} ${n === 1 ? 'articolo' : 'articoli'}, ${money(q.total)}">
            <span class="cb-thumbs" aria-hidden="true">${lines.slice(0, 3).map(l => { const p = BY_ID[l.id]; return p.cell ? `<i style="${swatchBg(p.cell)}"></i>` : '<i class="kit"></i>'; }).join('')}</span>
            <span>${n} ${n === 1 ? 'articolo' : 'articoli'} · <b>${money(q.total)}</b></span></div>
        </div>
      </div>
      <div class="cb-body">
        <section class="cb-card cb-track" aria-labelledby="cb-track-h">
          <div class="cb-card-h"><h2 id="cb-track-h">Stato dell’ordine</h2><p>Consegna stimata <b>${a} – ${b}</b></p></div>
          <ol>${steps.map(([t, s, st], i) => `<li class="${st}"${st === 'now' ? ' aria-current="step"' : ''} style="--i:${i}"><span class="cb-dot">${st === 'done' ? TICK : i + 1}</span><div><b>${t}</b><small>${s}</small></div></li>`).join('')}</ol>
        </section>
        ${wire ? `<section class="cb-card cb-wire" aria-labelledby="cb-wire-h"><h2 id="cb-wire-h">Coordinate per il bonifico</h2>
          <dl><div><dt>Intestatario</dt><dd>PriMo Nails</dd></div><div><dt>IBAN</dt><dd><span class="todo-note" lang="en">[[IBAN]]</span></dd></div>
          <div><dt>Causale</dt><dd>${num}</dd></div><div><dt>Importo</dt><dd><b>${money(q.total)}</b></dd></div></dl></section>` : ''}
        <div class="cb-cols">
          <section class="cb-card cb-info" aria-label="Dettagli di consegna e pagamento">
            <div><h3><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>Spedizione a</h3><p>${esc(`${d.nome} ${d.cognome}`)}<br>${place}</p></div>
            <div><h3><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/></svg>Pagamento</h3><p>${pay}</p></div>
            <div><h3><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7h12v10H2zM14 10h4l4 4v3h-8"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/></svg>Corriere</h3><p>GLS Standard · ${q.z.label}</p></div>
          </section>
          <section class="cb-card cb-order" aria-labelledby="cb-order-h">
            <h2 id="cb-order-h">Il tuo ordine</h2>
            <ul class="co-items">${itemsHTML(lines)}</ul>
            <dl class="co-tot">
              <div><dt>Subtotale</dt><dd>${money(q.sub)}</dd></div>
              ${q.disc ? `<div class="co-disc"><dt>Sconto</dt><dd>−${money(q.disc)}</dd></div>` : ''}
              <div><dt>Spedizione</dt><dd class="${q.ship ? '' : 'free'}">${q.ship ? money(q.ship) : 'Gratis'}</dd></div>
              <div class="co-grand"><dt>Totale <small>IVA inclusa</small></dt><dd>${money(q.total)}</dd></div>
            </dl>
          </section>
        </div>
        <section class="cb-next" aria-labelledby="cb-next-h">
          <p class="cx-eyebrow">Nel frattempo</p>
          <h2 id="cb-next-h">Porta i tuoi colori in salone</h2>
          <a class="cb-academy" href="corso.html">
            <img src="img/course2.jpg" alt="" loading="lazy" width="440" height="300">
            <span class="cb-academy-b"><small>PriMo Academy</small><b>Onicotecnica Corso Base</b><span>Scopri il corso<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></span>
          </a>
          <a class="cb-ig" href="https://www.instagram.com/" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg><span>Condividi i tuoi lavori con <b>#primonails</b></span></a>
        </section>
        <div class="cb-ctas">
          <a class="cx-btn" href="catalogo.html">Continua lo shopping</a>
          <a class="cx-ghost" href="mailto:primonailspro@gmail.com?subject=Ordine%20${num}">Serve aiuto con l’ordine?</a>
        </div>
      </div>`;
    $('.co-hero').hidden = true;
    return sec;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Numero d’ordine copiato'), () => toast(b.dataset.copy));
  });

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // back link: return to the previous page when it was ours
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));

  document.addEventListener('pm:cart', render);
  syncCountry();
  if (qs.has('anteprima')) {
    const wire = qs.get('pagamento') === 'bonifico';
    const demo = PM.CATALOG.PRODUCTS.filter(p => p.cell).slice(0, 3).map((p, i) => ({ id: p.id, qty: i === 1 ? 2 : 1 }));
    showOrder({ num: 'PN-482913', lines: demo, q: quote(demo),
      d: { nome: 'Giulia', cognome: 'Rossi', email: 'giulia@esempio.it', via: 'Via Torino 12', cap: '20123', citta: 'Milano', regione: 'Lombardia', paese: 'IT',
        pagamento: wire ? 'bonifico' : 'carta', cc: '4242 4242 4242 4242' } });
    const sw = document.createElement('nav');
    sw.className = 'cb-switch'; sw.setAttribute('aria-label', 'Variante della conferma');
    sw.innerHTML = ['a', 'b'].map(v => `<a href="?anteprima&conferma=${v}"${v === variant ? ' aria-current="page"' : ''}>Variante ${v.toUpperCase()}</a>`).join('');
    document.body.append(sw);
  }
  PM.ready();
})();
