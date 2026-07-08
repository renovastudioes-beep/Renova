(function () {
  'use strict';

  let side = null;
  try {
    side = sessionStorage.getItem('onyx-gateway-enter');
    if (side) sessionStorage.removeItem('onyx-gateway-enter');
  } catch (_) { /* private browsing */ }

  if (!side) return;

  document.documentElement.classList.add('gateway-page-enter', `gateway-page-enter-${side}`);

  function reveal() {
    document.documentElement.classList.add('gateway-page-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    });
  } else {
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  }
})();