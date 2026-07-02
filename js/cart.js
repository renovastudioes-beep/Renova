window.RenvoaCart = (function () {
  'use strict';
  const KEY = 'renvoa-clinic-cart';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
  }

  function formatPrice(n) {
    return '$' + Number(n).toFixed(2);
  }

  function getVariant(product, size) {
    if (!product) return null;
    if (product.variants && size && product.variants[size]) {
      return product.variants[size];
    }
    if (product.variants) {
      const def = product.defaultVariant || Object.keys(product.variants)[0];
      return product.variants[def];
    }
    return { label: product.sizes?.[0] || 'Standard', price: product.price };
  }

  function getItemKey(id, size) {
    return size ? `${id}::${size}` : id;
  }

  function getItemPrice(item) {
    const p = PRODUCTS[item.id];
    if (!p) return 0;
    const v = getVariant(p, item.size);
    return v ? v.price : p.price;
  }

  function getItemLabel(item) {
    const p = PRODUCTS[item.id];
    if (!p) return item.id;
    const v = getVariant(p, item.size);
    const sizeLabel = v?.label && p.variants ? ` (${v.label})` : '';
    return p.name + sizeLabel;
  }

  function getCartSubtotal(cart) {
    return cart.reduce((sum, item) => sum + getItemPrice(item) * item.qty, 0);
  }

  function getCartCount(cart) {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function getShipping(subtotal) {
    const threshold = RENVOA_CONFIG?.freeShippingThreshold ?? 150;
    const fee = RENVOA_CONFIG?.coldChainShipping ?? 9.95;
    return subtotal >= threshold ? 0 : fee;
  }

  function addItem(id, size, qty = 1) {
    const cart = getCart();
    const p = PRODUCTS[id];
    const resolvedSize = size || p?.defaultVariant || (p?.variants ? Object.keys(p.variants)[0] : null);
    const existing = cart.find((i) => i.id === id && i.size === resolvedSize);
    if (existing) existing.qty += qty;
    else cart.push({ id, size: resolvedSize, qty });
    saveCart(cart);
    return cart;
  }

  function clearCart() {
    saveCart([]);
  }

  return {
    KEY, getCart, saveCart, formatPrice, getVariant, getItemKey,
    getItemPrice, getItemLabel, getCartSubtotal, getCartCount,
    getShipping, addItem, clearCart,
  };
})();