window.RenvoaPOS = (function () {
  'use strict';

  const KEY = 'renvoa-pos-pricing';

  function readOverrides() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveOverrides(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getCatalog() {
    const overrides = readOverrides();
    return Object.values(PRODUCTS).map((p) => {
      const o = overrides[p.id] || {};
      const variants = {};
      Object.entries(p.variants || {}).forEach(([k, v]) => {
        variants[k] = {
          ...v,
          price: o.variants?.[k]?.price ?? v.price,
          cogs: o.variants?.[k]?.cogs ?? o.cogs ?? (window.RenvoaAdmin?.LANDED_COGS?.[p.id] || 0),
        };
      });
      return {
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        startingPrice: RenvoaStorefront.getStartingPrice(p),
        variants,
        defaultVariant: p.defaultVariant,
        active: o.active !== false,
        notes: o.notes || '',
      };
    });
  }

  function getVariantPrice(productId, size) {
    const item = getCatalog().find((p) => p.id === productId);
    if (!item) return 0;
    const v = item.variants[size] || item.variants[item.defaultVariant] || Object.values(item.variants)[0];
    return v?.price || 0;
  }

  function getVariantCogs(productId, size) {
    const item = getCatalog().find((p) => p.id === productId);
    if (!item) return 0;
    const v = item.variants[size] || item.variants[item.defaultVariant];
    return v?.cogs || 0;
  }

  function updateProductPricing(productId, patch) {
    const overrides = readOverrides();
    overrides[productId] = { ...(overrides[productId] || {}), ...patch };
    saveOverrides(overrides);
    return getCatalog().find((p) => p.id === productId);
  }

  function priceCartItems(items, bacWater = false) {
    let subtotal = 0;
    let cogs = 0;
    const lines = items.map((item) => {
      const unit = getVariantPrice(item.id, item.size);
      const unitCogs = getVariantCogs(item.id, item.size);
      const line = unit * item.qty;
      const lineCogs = unitCogs * item.qty;
      subtotal += line;
      cogs += lineCogs;
      const p = PRODUCTS[item.id];
      return {
        ...item,
        label: window.RenvoaCart.getItemLabel(item),
        unitPrice: unit,
        lineTotal: line,
        lineCogs,
        productName: p?.name || item.id,
      };
    });
    if (bacWater) {
      subtotal += 12;
      cogs += 4;
      lines.push({ id: 'bac-water', label: 'Bacteriostatic Water 30mL', qty: 1, unitPrice: 12, lineTotal: 12, lineCogs: 4 });
    }
    const shipping = window.RenvoaCart.getShipping(subtotal);
    return { lines, subtotal, cogs, shipping, total: subtotal + shipping, margin: subtotal - cogs };
  }

  function applyPricingToOrder(orderId, pricing) {
    return window.RenvoaAdmin.updateOrder(orderId, {
      pricingStatus: 'confirmed',
      status: 'processing',
      statusNote: 'Pricing confirmed in POS',
      subtotal: pricing.subtotal,
      shipping: pricing.shipping,
      total: pricing.total,
      cogs: pricing.cogs,
      margin: pricing.margin,
      pricedAt: new Date().toISOString(),
      pricedLines: pricing.lines,
    });
  }

  return {
    getCatalog,
    getVariantPrice,
    updateProductPricing,
    priceCartItems,
    applyPricingToOrder,
  };
})();