/* PriMo Nails – Spedizioni e resi: back link. */
(() => {
  'use strict';
  const { $$ } = window.PM;
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
})();
