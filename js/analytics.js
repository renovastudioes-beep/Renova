(function () {
  'use strict';
  if (typeof RENVOA_CONFIG === 'undefined') return;

  if (ONYX_CONFIG.ga4MeasurementId) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ONYX_CONFIG.ga4MeasurementId}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', RENVOA_CONFIG.ga4MeasurementId);
  }

  if (ONYX_CONFIG.plausibleDomain) {
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = RENVOA_CONFIG.plausibleDomain;
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
  }

  window.RenvoaTrack = function (event, props) {
    if (window.gtag) gtag('event', event, props || {});
    if (window.plausible) plausible(event, { props });
  };
})();