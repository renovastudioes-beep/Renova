(function () {
  'use strict';
  const C = window.RenvoaCart;
  const $ = (s) => document.querySelector(s);

  let bacAddon = false;

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
      const p = PRODUCTS[item.id];
      return `<div class="checkout-line">
        <span>${C.getItemLabel(item)} × ${item.qty}</span>
        <span>${C.formatPrice(C.getItemPrice(item) * item.qty)}</span>
      </div>`;
    }).join('');

    if (bacAddon) {
      list.innerHTML += `<div class="checkout-line checkout-addon-line">
        <span>Bacteriostatic Water 30mL × 1</span>
        <span>${C.formatPrice(12)}</span>
      </div>`;
    }

    const sub = C.getCartSubtotal(cart) + (bacAddon ? 12 : 0);
    const ship = C.getShipping(sub);
    const total = sub + ship;

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

  $('#bacAddon')?.addEventListener('change', (e) => {
    bacAddon = e.target.checked;
    renderSummary();
  });

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
      bacWater: bacAddon,
      qualified: $('#ruoAck').checked && $('#ageAck').checked,
    };

    const sub = C.getCartSubtotal(cart) + (bacAddon ? 12 : 0);
    order.subtotal = sub;
    order.shipping = C.getShipping(sub);
    order.total = sub + order.shipping;

    if (RENOVA_CONFIG.stripePublishableKey && window.Stripe) {
      // Production: POST order to your backend → create Stripe Checkout Session → redirect
      // fetch('/api/create-checkout', { method: 'POST', body: JSON.stringify(order) })
      alert('Stripe key is set. Connect a backend endpoint at /api/create-checkout to enable live payments.');
      btn.disabled = false;
      btn.textContent = 'Place Order';
      return;
    }

    localStorage.setItem('renvoa-last-order', JSON.stringify(order));
    window.RenvoaAdmin?.registerOrder(order);
    C.clearCart();
    if (bacAddon) localStorage.setItem('renvoa-bac-addon', '1');
    window.RenvoaTrack?.('purchase', { value: order.total, currency: 'USD' });
    window.location.href = 'order-confirmation.html?id=' + order.id;
  });
})();