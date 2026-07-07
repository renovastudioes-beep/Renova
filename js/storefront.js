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
    if (!product) return '';
    if (!shouldHideLinePricing() && product.variants) {
      const entries = Object.values(product.variants);
      if (entries.length === 1) return formatMoney(entries[0].price);
      const prices = entries.map((v) => v.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) return formatMoney(min);
      return `${formatMoney(min)} – ${formatMoney(max)}`;
    }
    return 'Starting at ' + formatMoney(getStartingPrice(product));
  }

  function formatVariantPrice(product, variantKey) {
    if (!product) return '';
    const key = variantKey || product.defaultVariant || Object.keys(product.variants || {})[0];
    const variant = product.variants?.[key];
    if (variant?.price != null) return formatMoney(variant.price);
    return formatMoney(product.price || 0);
  }

  function formatProductPriceList(product) {
    if (!product?.variants || Object.keys(product.variants).length <= 1) {
      return formatMoney(product?.price || 0);
    }
    return Object.entries(product.variants)
      .map(([, v]) => `${v.label}: ${formatMoney(v.price)}`)
      .join(' · ');
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
    formatVariantPrice,
    formatProductPriceList,
    formatMoney,
    shouldHideLinePricing,
    checkoutIsQuote,
    publicCtaLabel,
  };
})();