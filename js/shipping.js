/* PriMo Nails – Spedizioni e resi: back link, and the contents list follows the section being read. */
(() => {
  'use strict';
  const { $$ } = window.PM;
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));

  const links = $$('.toc a'), byId = new Map(links.map(a => [a.hash.slice(1), a]));
  const mark = id => links.forEach(a => (a === byId.get(id) ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  // the current section is the last one whose top has passed the upper third of the screen (the last one once the page bottom is reached)
  const secs = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);
  let raf = 0;
  const spy = () => {
    raf = 0;
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const cur = atEnd ? secs[secs.length - 1] : secs.filter(s => s.getBoundingClientRect().top < innerHeight / 3).pop();
    mark(cur && cur.id);
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(spy); }, { passive: true });
  spy();
})();
