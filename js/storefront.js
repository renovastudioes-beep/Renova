window.RenvoaStorefront = (function () {
  'use strict';

  const cfg = window.RENVOA_CONFIG?.storefront || {};

  function getStartingPrice(product) {
    if (!product) return 0;
    if (product.variants) {
      const prices = Object.values(product.variants).map((v) => v.price);
      return Math.min(...prices);
    }
    return product.price || 0;
  }

  function formatMoney(n) {
    return '$' + Number(n).toFixed(2);
  }

  function formatStartingAt(product) {
    return 'Starting at ' + formatMoney(getStartingPrice(product));
  }

  function shouldHideLinePricing() {
    return cfg.hideLinePricing !== false;
  }

  function checkoutIsQuote() {
    return cfg.checkoutMode === 'quote';
  }

  function publicCtaLabel() {
    return cfg.addToBagLabel || 'Add to bag';
  }

  return {
    getStartingPrice,
    formatStartingAt,
    formatMoney,
    shouldHideLinePricing,
    checkoutIsQuote,
    publicCtaLabel,
  };
})();