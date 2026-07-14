(function () {
  'use strict';
  const C = window.RenvoaCart;
  const SF = window.RenvoaStorefront;
  const $ = (s) => document.querySelector(s);

  const isQuote = SF.checkoutIsQuote();

  function renderSummary() {
    const cart = C.getCart();
    const list = $('#checkoutItems');
    const empty = $('#checkoutEmpty');
    if (!cart.length) {
      list.innerHTML = '';
      empty.hidden = false;
      $('#checkoutWrap').hidden = true;
      return;
    }
    empty.hidden = true;
    $('#checkoutWrap').hidden = false;

    list.innerHTML = cart.map((item) => {
      const priceCell = isQuote
        ? '<span class="checkout-quote-label">Quoted in POS</span>'
        : `<span>${C.formatPrice(C.getItemPrice(item) * item.qty)}</span>`;
      return `<div class="checkout-line">
        <span>${C.getItemLabel(item)} × ${item.qty}</span>
        ${priceCell}
      </div>`;
    }).join('');

    const sub = C.getCartSubtotal(cart);
    const ship = C.getShipping(sub);
    const total = sub + ship;

    if (isQuote) {
      $('#sumSubtotal').textContent = 'Pending';
      $('#sumShipping').textContent = 'Pending';
      $('#sumTotal').textContent = 'Pending quote';
      const note = $('#shippingNote');
      if (note) note.textContent = 'Final pricing and shipping are confirmed by our team before fulfillment.';
    } else {
      $('#sumSubtotal').textContent = C.formatPrice(sub);
      $('#sumShipping').textContent = ship === 0 ? 'Free' : C.formatPrice(ship);
      $('#sumTotal').textContent = C.formatPrice(total);
      const note = $('#shippingNote');
      if (note) {
        const threshold = RENVOA_CONFIG.freeShippingThreshold;
        note.textContent = ship > 0
          ? `Add ${C.formatPrice(threshold - sub)} more for free cold-chain shipping.`
          : 'You qualify for free cold-chain shipping.';
      }
    }
  }

  renderSummary();

  $('#checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cart = C.getCart();
    if (!cart.length) return;

    const btn = $('#placeOrderBtn');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    const order = {
      id: 'RC-' + Date.now().toString(36).toUpperCase(),
      date: new Date().toISOString(),
      customer: {
        name: $('#fullName').value,
        institution: $('#institution')?.value || '',
        email: $('#email').value,
        phone: $('#phone').value,
      },
      shipping: {
        line1: $('#address1').value,
        line2: $('#address2').value,
        city: $('#city').value,
        state: $('#state').value,
        zip: $('#zip').value,
      },
      items: [...cart],
      qualified: $('#ruoAck').checked,
      pricingStatus: isQuote ? 'pending' : 'confirmed',
    };

    const pricing = window.RenvoaPOS?.priceCartItems(cart, false);
    if (pricing) {
      order.internalPricing = pricing;
      if (!isQuote) {
        order.subtotal = pricing.subtotal;
        order.shipping = pricing.shipping;
        order.total = pricing.total;
        order.cogs = pricing.cogs;
        order.margin = pricing.margin;
      } else {
        order.subtotal = null;
        order.shipping = null;
        order.total = null;
      }
    }

    if (ONYX_CONFIG.stripePublishableKey && window.Stripe && !isQuote) {
      alert('Stripe key is set. Connect a backend endpoint at /api/create-checkout to enable live payments.');
      btn.disabled = false;
      btn.textContent = isQuote ? 'Submit order request' : 'Place Order';
      return;
    }

    localStorage.setItem('renvoa-last-order', JSON.stringify(order));
    window.RenvoaAdmin?.registerOrder(order);
    C.clearCart();

    if (!isQuote) window.RenvoaTrack?.('purchase', { value: order.total, currency: 'USD' });
    window.location.href = 'order-confirmation.html?id=' + order.id;
  });
})();