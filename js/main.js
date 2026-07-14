(function () {
  'use strict';

  const PRODUCTS = window.PRODUCTS || {};
  const GOAL_CATEGORIES = window.GOAL_CATEGORIES || {};
  const GOAL_ALIASES = window.GOAL_ALIASES || {};
  const PRODUCT_DETAILS = window.PRODUCT_DETAILS || {};

  const C = window.RenvoaCart;
  const SF = window.RenvoaStorefront;
  let cart = C.getCart();
  let selectedModalSize = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const nav = $('#globalNav');
  const cartBtn = $('#cartBtn');
  const cartDrawer = $('#cartDrawer');
  const cartOverlay = $('#cartOverlay');
  const cartClose = $('#cartClose');
  const cartItems = $('#cartItems');
  const cartFooter = $('#cartFooter');
  const cartCount = $('#cartCount');
  const cartSubtotal = $('#cartSubtotal');
  const searchBtn = $('#searchBtn');
  const searchOverlay = $('#searchOverlay');
  const searchInput = $('#searchInput');
  const searchClose = $('#searchClose');
  const searchResults = $('#searchResults');
  const modalOverlay = $('#modalOverlay');
  const productModal = $('#productModal');
  const modalClose = $('#modalClose');
  const modalContent = $('#modalContent');
  const toast = $('#toast');
  const navHamburger = $('#navHamburger');
  const navLinks = $('#navLinks');
  const filterBar = $('#filterBar');
  const filterLabel = $('#filterLabel');
  const filterClear = $('#filterClear');
  const goalOverlay = $('#goalOverlay');
  const goalOverlayBackdrop = $('#goalOverlayBackdrop');
  const goalOverlayClose = $('#goalOverlayClose');
  const goalOverlayTitle = $('#goalOverlayTitle');
  const goalOverlayTiles = $('#goalOverlayTiles');
  const goalGrid = $('#goalGrid');

  let activeGoal = null;

  const TILE_THEMES = ['tile-light', 'tile-dark', 'tile-gradient', 'tile-accent'];
  const TILE_VISUALS = {
    semaglutide: 'vial-sema', tirzepatide: 'vial-sema', retatrutide: 'vial-sema',
    'tb-500': 'vial-tb', 'bpc-157': 'vial-bpc', 'gh-stack': 'vial-ipa',
    sermorelin: 'vial-cjc', 'ghk-cu': 'vial-ghk', tesamorelin: 'vial-cjc',
  };

  function tileTaglineHtml(tagline) {
    return String(tagline || '').replace(' — ', '.<br>');
  }

  function getTileConfig(id, index) {
    const p = PRODUCTS[id];
    const theme = TILE_THEMES[index % TILE_THEMES.length];
    const light = theme !== 'tile-light';
    return {
      theme,
      visual: TILE_VISUALS[id] || 'vial-bpc',
      badge: p?.featured ? 'Featured' : (p?.isBundle ? 'Pairing' : ''),
      tagline: tileTaglineHtml(p?.tagline),
      light,
    };
  }

  function renderProductTile(id, index) {
    const p = PRODUCTS[id];
    const cfg = getTileConfig(id, index);
    if (!p) return '';
    const ctaClass = cfg.light ? 'link-cta light' : 'link-cta';
    const badge = cfg.badge ? `<span class="tile-badge">${cfg.badge}</span>` : '';
    const cats = (p.categories || []).join(' ');
    return `
      <article class="product-tile ${cfg.theme} reveal visible" data-product="${id}" data-categories="${cats}">
        <div class="tile-content">
          ${badge}
          <h3>${p.name}</h3>
          <p class="tile-tagline">${cfg.tagline}</p>
          <p class="tile-price">${SF.formatStartingAt(p)}</p>
          <div class="tile-ctas">
            <a href="#" class="${ctaClass}" data-add="${id}">${SF.publicCtaLabel()} <span class="chevron">›</span></a>
            <a href="#" class="${ctaClass}" data-detail="${id}">Learn more <span class="chevron">›</span></a>
          </div>
        </div>
        <div class="tile-visual ${cfg.visual}"></div>
      </article>`;
  }

  function renderProductGrid() {
    const grid = $('#productGrid');
    if (!grid) return;
    const order = window.PRODUCT_CATALOG_ORDER || Object.keys(PRODUCTS);
    grid.innerHTML = order.map(renderProductTile).join('');
    observeReveals(grid);
  }

  function resolveGoalId(goalId) {
    return GOAL_ALIASES?.[goalId] || goalId;
  }

  function saveCart() {
    C.saveCart(cart);
  }

  function formatPrice(n) {
    return C.formatPrice(n);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function getCartTotal() {
    return C.getCartSubtotal(cart);
  }

  function getCartCount() {
    return C.getCartCount(cart);
  }

  function updateCartUI() {
    const count = getCartCount();
    cartCount.textContent = count;
    cartCount.classList.toggle('visible', count > 0);

    if (cart.length === 0) {
      cartItems.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
      cartFooter.hidden = true;
      return;
    }

    cartFooter.hidden = false;
    cartSubtotal.textContent = SF.shouldHideLinePricing() ? 'Quoted at checkout' : formatPrice(getCartTotal());

    cartItems.innerHTML = cart.map((item) => {
      const p = PRODUCTS[item.id];
      if (!p) return '';
      const sizeKey = item.size ? ` data-size="${item.size}"` : '';
      const priceLine = SF.shouldHideLinePricing()
        ? '<div class="cart-item-price cart-item-quote">Pricing confirmed at checkout</div>'
        : `<div class="cart-item-price">${formatPrice(C.getItemPrice(item))}</div>`;
      return `
        <div class="cart-item" data-id="${item.id}"${sizeKey}>
          <div class="cart-item-visual" style="background:linear-gradient(180deg,${p.color}33,${p.color}11)"></div>
          <div class="cart-item-info">
            <div class="cart-item-name">${C.getItemLabel(item)}</div>
            ${priceLine}
            <div class="cart-item-qty">
              <button class="qty-btn" data-action="decrease" data-id="${item.id}" data-size="${item.size || ''}">−</button>
              <span>${item.qty}</span>
              <button class="qty-btn" data-action="increase" data-id="${item.id}" data-size="${item.size || ''}">+</button>
            </div>
            <button class="cart-item-remove" data-action="remove" data-id="${item.id}" data-size="${item.size || ''}">Remove</button>
          </div>
        </div>`;
    }).join('');
  }

  function addToCart(id, size) {
    cart = C.addItem(id, size || selectedModalSize);
    updateCartUI();
    const p = PRODUCTS[id];
    showToast(`${p.name} added to your bag`);
    window.RenvoaTrack?.('add_to_cart', { item_id: id });
  }

  function buildSizeSelector(p, selected) {
    if (!p.variants || Object.keys(p.variants).length <= 1) return '';
    const showPrices = !SF.shouldHideLinePricing();
    const opts = Object.entries(p.variants)
      .map(([key, v]) => {
        const label = showPrices ? `${v.label} — ${formatPrice(v.price)}` : v.label;
        return `<option value="${key}"${key === selected ? ' selected' : ''}>${label}</option>`;
      })
      .join('');
    return `<div class="modal-size-select"><label for="modalSize">Select size</label><select id="modalSize">${opts}</select></div>`;
  }

  function getModalSelectedSize() {
    const sel = $('#modalSize');
    return sel ? sel.value : null;
  }

  function updateModalPrice(p) {
    const size = getModalSelectedSize() || p.defaultVariant;
    const priceEl = $('#modalLivePrice');
    const addBtn = $('#modalAddBtn');
    const label = SF.shouldHideLinePricing()
      ? SF.formatStartingAt(p)
      : SF.formatVariantPrice(p, size);
    if (priceEl) priceEl.textContent = label;
    if (addBtn) addBtn.textContent = SF.publicCtaLabel();
    const sticky = $('#modalStickyPrice');
    if (sticky) sticky.textContent = label;
    selectedModalSize = size;
  }

  function syncProductTilePrices() {
    if (SF.shouldHideLinePricing()) return;
    $$('[data-product]').forEach((tile) => {
      const p = PRODUCTS[tile.dataset.product];
      if (!p) return;
      const priceEl = tile.querySelector('.tile-price');
      if (priceEl) priceEl.textContent = SF.formatStartingAt(p);
    });
  }

  function openCart() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function getProductFull(id) {
    return { ...PRODUCTS[id], ...(PRODUCT_DETAILS[id] || {}) };
  }

  function getRelatedProductIds(p) {
    const explicit = (p.related || []).filter((rid) => PRODUCTS[rid] && rid !== p.id);
    if (explicit.length) return explicit.slice(0, 3);
    const cats = new Set(p.categories || []);
    return (window.PRODUCT_CATALOG_ORDER || Object.keys(PRODUCTS))
      .filter((rid) => rid !== p.id && PRODUCTS[rid]?.categories?.some((c) => cats.has(c)))
      .slice(0, 3);
  }

  function modalSpecRow(label, value) {
    if (!value || value === '—') return '';
    return `<div class="modal-spec"><label>${label}</label><span>${value}</span></div>`;
  }

  function openModal(id) {
    const p = getProductFull(id);
    if (!p) return;

    const categoryLabels = (p.categories || [])
      .map((c) => GOAL_CATEGORIES[c]?.label)
      .filter(Boolean)
      .map((l) => `<span class="modal-category">${l}</span>`)
      .join('');

    const relatedIds = getRelatedProductIds(p);
    const related = relatedIds.map((rid) => {
      const r = PRODUCTS[rid];
      return `<button type="button" class="modal-related-chip" data-detail="${rid}" style="--chip-color:${r.color}">${r.name}</button>`;
    }).join('');

    const coaLine = p.currentLot
      ? `<p class="modal-lot">Lot <a href="coa.html?batch=${p.currentLot}" class="modal-lot-link">${p.currentLot}</a> · ${p.lotPurity || p.purity} purity · <a href="coa.html" class="modal-lot-link">COA lookup</a></p>`
      : '<p class="modal-lot"><a href="coa.html" class="modal-lot-link">COA lookup</a> · batch-specific certificate included</p>';

    modalContent.innerHTML = `
      <div class="modal-simple-head" style="--hero-accent:${p.color}">
        <div class="modal-simple-accent" aria-hidden="true"></div>
        <div class="modal-simple-head-inner">
          ${categoryLabels ? `<div class="modal-categories">${categoryLabels}</div>` : ''}
          <h2>${p.name}</h2>
          <p class="modal-tagline">${p.tagline}</p>
          <p class="modal-price" id="modalLivePrice">${SF.formatStartingAt(p)}</p>
          ${coaLine}
        </div>
      </div>

      <div class="modal-body-wrap modal-body-simple">
        <p class="modal-lead">${p.longDescription || p.description}</p>

        <div class="modal-specs modal-specs-compact">
          ${modalSpecRow('Purity (HPLC)', p.purity)}
          ${modalSpecRow('Form', p.form)}
          ${modalSpecRow('Format', (p.sizes || []).join(', '))}
          ${modalSpecRow('Identity (MS)', 'Confirmed')}
          ${modalSpecRow('Endotoxins', '&lt;0.1 EU/mg')}
          ${modalSpecRow('CAS', p.cas)}
          ${modalSpecRow('Sequence', p.sequence)}
        </div>

        <p class="modal-simple-quality">HPLC and mass spectrometry verified · COA included with every order.</p>

        <div class="modal-protocol-note modal-protocol-note-compact">
          <strong>Research use only.</strong> For in-vitro laboratory research by qualified personnel only.
        </div>

        ${related ? `<div class="modal-related"><h4>Also in this category</h4><div class="modal-related-chips">${related}</div></div>` : ''}

        <div class="modal-actions modal-actions-simple">
          ${buildSizeSelector(p, p.defaultVariant)}
          <button class="btn-primary" id="modalAddBtn" data-add="${p.id}">${SF.publicCtaLabel()}</button>
        </div>
      </div>
      <div class="modal-sticky-bar" id="modalStickyBar">
        <span class="modal-sticky-name">${p.name}</span>
        <span class="modal-sticky-price" id="modalStickyPrice">${SF.formatStartingAt(p)}</span>
        <button class="btn-primary btn-sm" data-add="${p.id}">Add to Bag</button>
      </div>
    `;

    selectedModalSize = p.defaultVariant;
    $('#modalSize')?.addEventListener('change', () => updateModalPrice(p));
    updateModalPrice(p);
    const modalScroll = $('#modalScroll');
    if (modalScroll) modalScroll.scrollTop = 0;
    window.RenvoaTrack?.('view_item', { item_id: id });
    productModal.classList.add('active');
    productModal.setAttribute('aria-hidden', 'false');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    productModal.classList.remove('active');
    productModal.setAttribute('aria-hidden', 'true');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderGoalTile(pid, index = 0) {
    const p = PRODUCTS[pid];
    const cfg = getTileConfig(pid, index);
    if (!p) return '';
    const ctaClass = cfg.light ? 'link-cta light' : 'link-cta';
    const badge = cfg.badge ? `<span class="tile-badge">${cfg.badge}</span>` : '';
    return `
      <article class="product-tile goal-float-tile ${cfg.theme}" data-product="${pid}">
        <div class="tile-content">
          ${badge}
          <h3>${p.name}</h3>
          <p class="tile-tagline">${cfg.tagline}</p>
          <p class="tile-price">${SF.formatStartingAt(p)}</p>
          <div class="tile-ctas">
            <a href="#" class="${ctaClass}" data-add="${pid}">${SF.publicCtaLabel()} <span class="chevron">›</span></a>
            <a href="#" class="${ctaClass}" data-detail="${pid}">Learn more <span class="chevron">›</span></a>
          </div>
        </div>
        <div class="tile-visual ${cfg.visual}"></div>
      </article>`;
  }

  function openGoalOverlay(goalId) {
    const resolved = resolveGoalId(goalId);
    const goal = GOAL_CATEGORIES[resolved];
    if (!goal) return;

    if (activeGoal === resolved) {
      closeGoalOverlay();
      return;
    }

    activeGoal = resolved;

    $$('.goal-card').forEach((card) => {
      card.classList.toggle('active', resolveGoalId(card.dataset.goal) === resolved);
    });

    goalOverlayTitle.textContent = goal.label;
    goalOverlayTiles.innerHTML = goal.products.map((pid, i) => renderGoalTile(pid, i)).join('');

    goalOverlay.classList.add('active');
    goalOverlay.setAttribute('aria-hidden', 'false');
    goalGrid.classList.add('dimmed');
    $('#goals').classList.add('overlay-open');
  }

  function closeGoalOverlay() {
    activeGoal = null;
    goalOverlay.classList.remove('active');
    goalOverlay.setAttribute('aria-hidden', 'true');
    goalGrid.classList.remove('dimmed');
    $('#goals').classList.remove('overlay-open');
    $$('.goal-card').forEach((card) => card.classList.remove('active'));
  }

  function applyGoalFilter(goalId) {
    openGoalOverlay(goalId);
  }

  function clearGoalFilter() {
    closeGoalOverlay();
    filterBar.hidden = true;
    $$('.product-tile').forEach((tile) => {
      tile.classList.remove('filtered-out', 'filtered-in');
    });
  }

  function scrollToProduct(id) {
    closeModal();
    const tile = document.querySelector(`[data-product="${id}"]`);
    if (tile) {
      tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tile.classList.add('highlight-pulse');
      setTimeout(() => tile.classList.remove('highlight-pulse'), 2000);
    }
  }

  function openSearch() {
    searchOverlay.classList.add('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
    setTimeout(() => searchInput.focus(), 100);
  }

  function closeSearch() {
    searchOverlay.classList.remove('active');
  }

  function renderSearchResults(query) {
    if (!query.trim()) {
      searchResults.innerHTML = '';
      return;
    }
    const q = query.toLowerCase();
    const matches = Object.values(PRODUCTS).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.researchAreas || []).some((a) => a.toLowerCase().includes(q)) ||
        (p.categories || []).some((c) => GOAL_CATEGORIES[c]?.label.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><span>No results found</span></div>';
      return;
    }

    searchResults.innerHTML = matches
      .map(
        (p) => `
      <div class="search-result-item" data-detail="${p.id}">
        <span class="search-result-name">${p.name}</span>
        <span class="search-result-price">${SF.formatStartingAt(p)}</span>
      </div>`
      )
      .join('');
  }

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      e.preventDefault();
      addToCart(addBtn.dataset.add, getModalSelectedSize());
    }

    const detailBtn = e.target.closest('[data-detail]');
    if (detailBtn) {
      e.preventDefault();
      closeSearch();
      openModal(detailBtn.dataset.detail);
    }

    const scrollBtn = e.target.closest('[data-detail-scroll]');
    if (scrollBtn) {
      e.preventDefault();
      scrollToProduct(scrollBtn.dataset.detailScroll);
    }

    const goalCard = e.target.closest('[data-goal]');
    if (goalCard) {
      e.preventDefault();
      applyGoalFilter(goalCard.dataset.goal);
    }

    const qtyBtn = e.target.closest('.qty-btn');
    if (qtyBtn) {
      const { action, id, size } = qtyBtn.dataset;
      const item = cart.find((i) => i.id === id && (i.size || '') === (size || ''));
      if (!item) return;
      if (action === 'increase') item.qty++;
      if (action === 'decrease') item.qty = Math.max(0, item.qty - 1);
      if (item.qty === 0) cart = cart.filter((i) => !(i.id === id && (i.size || '') === (size || '')));
      saveCart();
      updateCartUI();
    }

    const removeBtn = e.target.closest('[data-action="remove"]');
    if (removeBtn) {
      const { id, size } = removeBtn.dataset;
      cart = cart.filter((i) => !(i.id === id && (i.size || '') === (size || '')));
      saveCart();
      updateCartUI();
    }

    const checkoutBtn = e.target.closest('.btn-checkout');
    if (checkoutBtn) {
      e.preventDefault();
      window.location.href = 'checkout.html';
    }
  });

  filterClear?.addEventListener('click', clearGoalFilter);
  goalOverlayClose?.addEventListener('click', closeGoalOverlay);
  goalOverlayBackdrop?.addEventListener('click', closeGoalOverlay);

  cartBtn?.addEventListener('click', openCart);
  cartClose?.addEventListener('click', closeCart);
  cartOverlay?.addEventListener('click', closeCart);
  searchBtn?.addEventListener('click', openSearch);
  searchClose?.addEventListener('click', closeSearch);
  searchOverlay?.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearch();
  });
  searchInput?.addEventListener('input', (e) => renderSearchResults(e.target.value));
  modalClose?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', closeModal);

  navHamburger?.addEventListener('click', () => {
    navLinks?.classList.toggle('mobile-open');
  });

  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('visible', entry.isIntersecting);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  function observeReveals(root) {
    const scope = root || document;
    scope.querySelectorAll('.reveal').forEach((el) => {
      if (el.dataset.revealObserved) return;
      el.dataset.revealObserved = '1';
      revealObserver.observe(el);
    });
  }

  observeReveals();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      closeSearch();
      closeModal();
      closeGoalOverlay();
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const goalParam = urlParams.get('goal');
  if (goalParam && GOAL_CATEGORIES[resolveGoalId(goalParam)]) {
    setTimeout(() => applyGoalFilter(goalParam), 400);
  } else if (window.location.hash.startsWith('#goal-')) {
    const goalId = window.location.hash.replace('#goal-', '');
    if (GOAL_CATEGORIES[resolveGoalId(goalId)]) setTimeout(() => applyGoalFilter(goalId), 400);
  }
  const productParam = urlParams.get('product');
  if (productParam && PRODUCTS[productParam]) {
    setTimeout(() => openModal(productParam), 500);
  }

  // Hero rotation
  const HERO_SLIDES = [
    { id: 'semaglutide', eyebrow: 'Featured', title: 'Semaglutide.<br>GLP-1 analog.', sub: 'Research-grade lyophilized vial — HPLC verified for in-vitro metabolic pathway studies.', label: 'Semaglutide' },
    { id: 'bpc-157', eyebrow: 'Popular', title: 'BPC-157.<br>Pentadecapeptide.', sub: '≥99% purity. HPLC verified. 5mg & 10mg lyophilized vials.', label: 'BPC-157' },
    { id: 'tirzepatide', eyebrow: 'New', title: 'Tirzepatide.<br>Dual pathway analog.', sub: 'GIP/GLP-1 receptor analog for in-vitro endocrine signaling research.', label: 'Tirzepatide' },
  ];
  let heroIndex = 0;
  const heroEyebrow = $('#heroEyebrow');
  const heroTitle = $('#heroTitle');
  const heroSub = $('#heroSub');
  const heroBuy = $('#heroBuy');
  const heroLearn = $('#heroLearn');
  const heroLabel = $('#heroVialLabel');
  const heroDots = $$('.hero-dot');

  function setHeroSlide(i) {
    const s = HERO_SLIDES[i];
    if (!s || !heroTitle) return;
    heroIndex = i;
    if (heroEyebrow) heroEyebrow.textContent = s.eyebrow;
    heroTitle.innerHTML = s.title;
    if (heroSub) heroSub.innerHTML = s.sub;
    if (heroBuy) {
      const hp = PRODUCTS[s.id];
      heroBuy.dataset.add = s.id;
      heroBuy.innerHTML = hp ? `${SF.formatStartingAt(hp)} <span class="chevron">›</span>` : `Shop <span class="chevron">›</span>`;
    }
    if (heroLearn) heroLearn.dataset.detail = s.id;
    if (heroLabel) heroLabel.textContent = s.label;
    heroDots.forEach((d, j) => d.classList.toggle('active', j === i));
  }

  if (heroTitle) {
    setHeroSlide(0);
    setInterval(() => setHeroSlide((heroIndex + 1) % HERO_SLIDES.length), 6000);
    heroDots.forEach((dot, i) => dot.addEventListener('click', () => setHeroSlide(i)));
  }

  // Email capture
  $('#emailForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#emailInput').value.trim();
    if (!email) return;
    const subs = JSON.parse(localStorage.getItem('renvoa-subscribers') || '[]');
    subs.push({ email, date: new Date().toISOString() });
    localStorage.setItem('renvoa-subscribers', JSON.stringify(subs));
    $('#emailForm').hidden = true;
    $('#emailSuccess').hidden = false;
    window.RenvoaTrack?.('subscribe', { method: 'email' });
  });

  renderProductGrid();
  updateCartUI();
  syncProductTilePrices();
})();