(function () {
  'use strict';

  const modal = document.getElementById('bio-modal');
  const openBtn = document.getElementById('bio-open');
  const closeBtn = document.getElementById('bio-close');
  if (!modal || !openBtn) return;

  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  let lastFocus = null;

  function getFocusables() {
    return [...modal.querySelectorAll(FOCUSABLE)].filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
  }

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

  function trapFocus(e) {
    if (e.key !== 'Tab' || !modal.classList.contains('is-open')) return;
    const focusables = getFocusables();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    trapFocus(e);
  });
})();