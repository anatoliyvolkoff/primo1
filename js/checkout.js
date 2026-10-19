/* PriMo Nails – checkout. Front-end only: reads the localStorage cart, prices GLS shipping by zone and weight (the same
   tables as spedizioni.html), validates the form and simulates the payment, ending on an order confirmation. */
(() => {
  'use strict';
  const { $, $$, money, store, toast, buzz, smooth, reduceMotion, openOverlay, PRODUCT, SHADE_IMG, cartLines, clearCart } = window.PM;

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
    const n = lines.reduce((a, l) => a + l.qty, 0), sub = n * PRODUCT.price;
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

  const itemsHTML = lines => lines.map(l => `<li class="co-item">
      <span class="co-thumb"><img src="img/product.jpg" alt="" width="60" height="60"><b aria-label="Quantità ${l.qty}">${l.qty}</b></span>
      <span class="co-item-b"><b>${PRODUCT.name}</b><small><i class="ci-dot" style="background-image:url(img/shade-${SHADE_IMG[l.shade]}.jpg)"></i>Tonalità ${l.shade + 1} · 12 ml</small></span>
      <span class="co-item-p">${money(PRODUCT.price * l.qty)}</span></li>`).join('');

  function render() {
    if (!done.hidden) return;
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
    const lines = cartLines(), q = quote(lines), d = Object.fromEntries(new FormData(form));
    const num = 'PN-' + String(Date.now()).slice(-6);
    const [a, b] = eta(q.z);
    const pay = { carta: `Carta •••• ${(d.cc || '').replace(/\s/g, '').slice(-4)}`, paypal: 'PayPal', bonifico: 'Bonifico bancario' }[d.pagamento];
    const place = [d.via, d.via2, `${d.cap} ${d.citta}`, d.paese === 'IT' ? `${d.regione ? d.regione + ', ' : ''}Italia` : d.paese].filter(Boolean).map(esc).join('<br>');
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
    store.set('primo.checkout.code', '');
    wrap.hidden = true; $('.co-steps').hidden = true; done.hidden = false;
    $('#co-title').textContent = 'Ordine confermato';
    document.title = 'Ordine confermato – PriMo Nails';
    clearCart();
    scrollTo({ top: 0, behavior: smooth() });
    done.focus({ preventScroll: true });
    buzz([12, 60, 12]);
  }
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // back link: return to the previous page when it was ours
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));

  document.addEventListener('pm:cart', render);
  syncCountry();
  PM.ready();
})();
