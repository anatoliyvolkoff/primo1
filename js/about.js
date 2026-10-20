/* PriMo Nails – about page. Irina's journey: light the chapter in the middle of the screen and show its photo in the frame. */
(() => {
  'use strict';
  PM.ready();
  const box = document.querySelector('.abj'), chs = [...document.querySelectorAll('.abj-ch')];
  if (!box || !('IntersectionObserver' in window)) return;
  const imgs = box.querySelectorAll('.abj-frame img'), count = box.querySelector('.abj-count b');
  box.classList.add('js');
  const show = i => {
    chs.forEach((c, k) => c.classList.toggle('on', k === i));
    imgs.forEach((m, k) => m.classList.toggle('on', k === i));
    count.textContent = String(i + 1).padStart(2, '0');
  };
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && show(chs.indexOf(e.target))), { rootMargin: '-45% 0px -45% 0px' });
  chs.forEach(c => io.observe(c));
})();
