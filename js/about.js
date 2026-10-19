/* PriMo Nails – about page. Variant E's contact form: validate, then confirm in place (no backend). */
(() => {
  'use strict';
  const { $, toast } = PM;
  PM.ready();
  const form = $('#abe-form');
  if (!form) return;
  const err = $('#abe-err'), btn = $('.req-btn', form);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [...form.elements].filter(el => el.required && !el.checkValidity());
    form.querySelectorAll('.fld').forEach(f => f.classList.toggle('bad', bad.some(el => f.contains(el))));
    if (bad.length) { err.textContent = 'Compila nome, email valida e messaggio.'; bad[0].focus(); return; }
    err.textContent = '';
    btn.disabled = true; btn.textContent = '✓ Messaggio inviato';
    toast('Grazie! Ti ricontatteremo entro 24 ore.');
    form.reset();
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Invia messaggio'; }, 3000);
  });
})();
