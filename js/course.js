/* PriMo Nails – course detail ("Course mob" 440 / "Course desk" 7602:18311 1440). */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, desktopMQ, smooth } = PM;
  // placeholder copy exactly as in the design
  const COPY = 'Manicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e Manicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e praticapraticaManicure — Teoria e praticaManicure — Teoria e Manicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e praticapraticaManicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e praticaManicure — Teoria e pratica';
  const chev = '<span class="acc-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>';
  const SECTIONS = {
    info: ['Informazioni', `<p>${COPY}</p>`],
    desc: ['Descrizione', `<p>${COPY}</p>`],
    prog: ['Programa', `<p class="lez">01</p><p>${COPY}</p>`],
  };
  // phones list Informazioni first, desktop starts with Descrizione (as in the two designs)
  const render = () => {
    const order = desktopMQ.matches ? ['desc', 'prog', 'info'] : ['info', 'desc', 'prog'];
    $('#co-acc').innerHTML = order.map(k => `<details open><summary>${SECTIONS[k][0]}${chev}</summary><div class="acc-body">${SECTIONS[k][1]}</div></details>`).join('');
  };
  render(); desktopMQ.addEventListener('change', render);

  // gallery: snap carousel, starts on the polka-dot photo like the design; buttons and arrow keys step one photo
  const g = $('#gal');
  const step = () => g.firstElementChild.getBoundingClientRect().width;
  const center = () => { g.scrollLeft = g.children[1].offsetLeft - (g.clientWidth - g.children[1].offsetWidth) / 2; };
  addEventListener('load', center); center();
  $$('.gal-btn').forEach(b => b.addEventListener('click', () => g.scrollBy({ left: +b.dataset.d * step(), behavior: smooth() })));
  g.addEventListener('keydown', e => { const s = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (s) { e.preventDefault(); g.scrollBy({ left: s * step(), behavior: smooth() }); } });
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  PM.ready();
})();
