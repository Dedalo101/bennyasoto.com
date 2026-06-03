(function () {
  'use strict';
  const modal = document.getElementById('bio-modal');
  const openBtn = document.getElementById('bio-open');
  const closeBtn = document.getElementById('bio-close');
  if (!modal || !openBtn) return;

  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    closeBtn?.focus();
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    (lastFocus || openBtn).focus();
  }

  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();