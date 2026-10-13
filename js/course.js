/* PriMo Nails – course detail: WhatsApp icons, rating stars, gallery stepping and the phone enrol bar. */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, smooth } = PM;
  const wa = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5 4.8 16A8.5 8.5 0 1 1 8 19.2Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a5 5 0 0 1-2.7-2.7l.8-1-1-2Z"/></svg>';
  $$('[data-wa]').forEach(a => a.insertAdjacentHTML('afterbegin', wa));
  $('.cx-rate .stars').innerHTML = '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9Z"/></svg>'.repeat(5);

  // gallery: snap carousel on phones; buttons and arrow keys step one photo
  const g = $('#gal');
  const step = () => g.firstElementChild.getBoundingClientRect().width + 12;
  $$('.gal-btn').forEach(b => b.addEventListener('click', () => g.scrollBy({ left: +b.dataset.d * step(), behavior: smooth() })));
  g.addEventListener('keydown', e => { const s = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (s) { e.preventDefault(); g.scrollBy({ left: s * step(), behavior: smooth() }); } });

  // phones: show the enrol bar once the hero buttons are off screen, hide it again over the closing call to action
  const bar = $('#cx-bar'), ctas = $('#cx-ctas'), final = $('.cx-final'), seen = new Map([[ctas, true], [final, false]]);
  const io = new IntersectionObserver(es => {
    es.forEach(e => seen.set(e.target, e.isIntersecting));
    const on = !seen.get(ctas) && !seen.get(final);
    bar.classList.toggle('show', on); bar.setAttribute('aria-hidden', String(!on)); $('a', bar).tabIndex = on ? 0 : -1;
  });
  io.observe(ctas); io.observe(final);
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  PM.ready();
})();
