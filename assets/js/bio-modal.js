(function () {
  'use strict';

  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  function initModal(modalId, openId, closeId) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openId);
    const closeBtn = document.getElementById(closeId);
    if (!modal || !openBtn) return null;

    let lastFocus = null;

    function getFocusables() {
      return [...modal.querySelectorAll(FOCUSABLE)].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
    }

    function open() {
      document.querySelectorAll('.site-modal.is-open').forEach((m) => {
        m.classList.remove('is-open');
        m.setAttribute('aria-hidden', 'true');
        m.setAttribute('hidden', '');
      });
      lastFocus = document.activeElement;
      modal.removeAttribute('hidden');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      // fix: rAF ensures focus lands on close after open transition paints
      requestAnimationFrame(() => (closeBtn || openBtn).focus());
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('hidden', '');
      document.documentElement.style.overflow = '';
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

    return { modal, close, trapFocus };
  }

  const bio = initModal('bio-modal', 'bio-open', 'bio-close');
  const links = initModal('links-modal', 'links-open', 'links-close');

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (bio?.modal.classList.contains('is-open')) bio.close();
      else if (links?.modal.classList.contains('is-open')) links.close();
    }
    bio?.trapFocus(e);
    links?.trapFocus(e);
  });
})();