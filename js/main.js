(function () {
  'use strict';

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

  const TILE_CONFIG = {
    'tb-500':       { theme: 'tile-dark',     visual: 'vial-tb',   badge: 'Popular', tagline: 'Thymosin Beta-4 fragment.<br>5mg lyophilized.', light: true },
    'recovery-stack': { theme: 'tile-gradient', visual: 'vial-bpc', badge: 'Bundle', tagline: 'BPC-157 5mg + TB-500 5mg.<br>Recovery bundle.', light: true },
    'gh-stack':     { theme: 'tile-accent',   visual: 'vial-ipa',  badge: 'Bundle', tagline: 'Ipamorelin + CJC-1295.<br>GH axis stack.', light: true },
    'bpc-157':      { theme: 'tile-light',    visual: 'vial-bpc',  tagline: 'Body Protection Compound.<br>5mg &amp; 10mg options.' },
    'semaglutide':  { theme: 'tile-gradient', visual: 'vial-sema', badge: 'New', tagline: 'GLP-1 receptor agonist.<br>Research-grade 2mg.', light: true },
    'ipamorelin':   { theme: 'tile-light',    visual: 'vial-ipa',  tagline: 'Selective GH secretagogue.<br>2mg per vial.' },
    'cjc-1295':     { theme: 'tile-dark',     visual: 'vial-cjc',  tagline: 'GHRH analog, no DAC.<br>2mg lyophilized.', light: true },
    'ghk-cu':       { theme: 'tile-accent',   visual: 'vial-ghk',  tagline: 'Copper peptide complex.<br>50mg per vial.', light: true },
  };

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
    const opts = Object.entries(p.variants)
      .map(([key, v]) => `<option value="${key}"${key === selected ? ' selected' : ''}>${v.label}</option>`)
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
    const label = SF.formatStartingAt(p);
    if (priceEl) priceEl.textContent = label;
    if (addBtn) addBtn.textContent = SF.publicCtaLabel();
    const sticky = $('#modalStickyPrice');
    if (sticky) sticky.textContent = label;
    selectedModalSize = size;
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

  function initModalTabs() {
    const tabs = $$('.modal-tab');
    const panels = $$('.modal-panel');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === target));
        panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === target));
      });
    });
  }

  function getProductFull(id) {
    return { ...PRODUCTS[id], ...(PRODUCT_DETAILS[id] || {}) };
  }

  function openModal(id) {
    const p = getProductFull(id);
    if (!p) return;

    const areaTags = (p.researchAreas || []).map((a) => `<span class="modal-tag">${a}</span>`).join('');
    const highlights = (p.researchHighlights || []).map((h) => `<li>${h}</li>`).join('');
    const categoryLabels = (p.categories || [])
      .map((c) => GOAL_CATEGORIES[c]?.label)
      .filter(Boolean)
      .map((l) => `<span class="modal-category">${l}</span>`)
      .join('');

    const gallery = (p.gallery || [])
      .map((g) => `
        <figure class="modal-gallery-item">
          <img src="${g.src}" alt="${g.alt}" loading="lazy">
          <figcaption>${g.caption}</figcaption>
        </figure>`)
      .join('');

    const useCases = (p.useCases || [])
      .map((u) => `
        <article class="modal-usecase">
          <div class="modal-usecase-img">
            <img src="${u.image}" alt="${u.alt}" loading="lazy">
          </div>
          <div class="modal-usecase-body">
            <h4>${u.title}</h4>
            <p>${u.description}</p>
          </div>
        </article>`)
      .join('');

    const deepDive = (p.deepDive || [])
      .map((d) => `
        <div class="modal-deep-block">
          <h4>${d.heading}</h4>
          <p>${d.body}</p>
        </div>`)
      .join('');

    const studyModels = (p.studyModels || []).map((m) => `<span class="modal-tag">${m}</span>`).join('');
    const citations = (p.citations || [])
      .map((c) => `<li><strong>${c.text}</strong><span>${c.source}</span></li>`)
      .join('');

    const faq = (p.faq || [])
      .map((f) => `
        <details class="modal-faq-item">
          <summary>${f.q}</summary>
          <p>${f.a}</p>
        </details>`)
      .join('');

    const steps = (p.reconstitutionSteps || [])
      .map((s, i) => `<li><span class="step-num">${i + 1}</span>${s}</li>`)
      .join('');

    const related = (p.related || [])
      .filter((rid) => PRODUCTS[rid])
      .map((rid) => {
        const r = PRODUCTS[rid];
        return `<button type="button" class="modal-related-chip" data-detail="${rid}" style="--chip-color:${r.color}">${r.name}</button>`;
      })
      .join('');

    modalContent.innerHTML = `
      <div class="modal-hero-banner" style="--hero-accent:${p.color}">
        <img class="modal-hero-img" src="${p.heroImage || 'images/products/lab-research.jpg'}" alt="${p.name} research context">
        <div class="modal-hero-overlay"></div>
        <div class="modal-hero-text">
          <p class="modal-hero-eyebrow">${p.heroCaption || 'Laboratory research'}</p>
          <h2>${p.name}</h2>
          <p class="modal-tagline">${p.tagline}</p>
          <p class="modal-price" id="modalLivePrice">${SF.formatStartingAt(p)}</p>
          ${p.currentLot ? `<p class="modal-lot">Current lot: <a href="coa.html?batch=${p.currentLot}" class="modal-lot-link">${p.currentLot}</a> · ${p.lotPurity || p.purity} purity</p>` : ''}
          ${categoryLabels ? `<div class="modal-categories">${categoryLabels}</div>` : ''}
        </div>
      </div>

      <div class="modal-body-wrap">
        <nav class="modal-tabs modal-tabs-sticky" role="tablist">
          <button class="modal-tab active" data-tab="overview" type="button" role="tab">Overview</button>
          <button class="modal-tab" data-tab="research" type="button" role="tab">Research</button>
          <button class="modal-tab" data-tab="gallery" type="button" role="tab">In the Lab</button>
          <button class="modal-tab" data-tab="specs" type="button" role="tab">Specifications</button>
          <button class="modal-tab" data-tab="protocol" type="button" role="tab">Protocol</button>
        </nav>

        <div class="modal-panels">
          <div class="modal-panel active" data-panel="overview" role="tabpanel">
            <p class="modal-lead">${p.longDescription || p.description}</p>
            <div class="modal-split">
              <div class="modal-split-text">
                <h4 class="modal-section-title">Mechanism of Action</h4>
                <p class="modal-text">${p.mechanism || ''}</p>
                <h4 class="modal-section-title">Research Areas</h4>
                <div class="modal-tags">${areaTags}</div>
              </div>
              <div class="modal-split-img">
                <img src="${(p.gallery && p.gallery[0]?.src) || p.heroImage}" alt="${p.name} research" loading="lazy">
              </div>
            </div>
            <h4 class="modal-section-title">Research Applications</h4>
            <div class="modal-usecases">${useCases}</div>
          </div>

          <div class="modal-panel" data-panel="research" role="tabpanel">
            <div class="modal-deep-dive">${deepDive}</div>
            <h4 class="modal-section-title">Key Research Highlights</h4>
            <ul class="modal-list">${highlights}</ul>
            <h4 class="modal-section-title">Common Study Models</h4>
            <div class="modal-tags">${studyModels}</div>
            <h4 class="modal-section-title">Selected References</h4>
            <ul class="modal-citations">${citations}</ul>
            <p class="modal-disclaimer-inline">All citations refer to preclinical and in-vitro research. Not intended for human or animal use.</p>
          </div>

          <div class="modal-panel" data-panel="gallery" role="tabpanel">
            <p class="modal-gallery-intro">How researchers use ${p.name} across laboratory and clinical research settings.</p>
            <div class="modal-gallery">${gallery}</div>
            <div class="modal-gallery-disclaimer">
              <strong>Research use only.</strong> Images depict research contexts and laboratory applications. ONYX Peptides products are not intended for human consumption or self-administration.
            </div>
          </div>

          <div class="modal-panel" data-panel="specs" role="tabpanel">
            <div class="modal-specs">
              <div class="modal-spec"><label>Purity (HPLC)</label><span>${p.purity}</span></div>
              <div class="modal-spec"><label>Identity (MS)</label><span>Confirmed</span></div>
              <div class="modal-spec"><label>Form</label><span>${p.form}</span></div>
              <div class="modal-spec"><label>Available Sizes</label><span>${p.sizes.join(', ')}</span></div>
              <div class="modal-spec"><label>Storage</label><span>${p.storage}</span></div>
              <div class="modal-spec"><label>Endotoxins</label><span>&lt;0.1 EU/mg</span></div>
              <div class="modal-spec"><label>CAS Number</label><span>${p.cas}</span></div>
              <div class="modal-spec"><label>Molecular Weight</label><span>${p.molecularWeight || '—'}</span></div>
              <div class="modal-spec modal-spec-wide"><label>Sequence</label><span>${p.sequence}</span></div>
            </div>
            <div class="modal-testing-card">
              <h4>Quality Testing</h4>
              <p>Every batch is independently verified by third-party HPLC and mass spectrometry. A batch-specific Certificate of Analysis ships with your order.</p>
              <div class="modal-testing-grid">
                <span>✓ HPLC purity</span>
                <span>✓ MS identity</span>
                <span>✓ Endotoxin screen</span>
                <span>✓ COA included</span>
              </div>
            </div>
            <h4 class="modal-section-title">Frequently Asked Questions</h4>
            <div class="modal-faq">${faq}</div>
          </div>

          <div class="modal-panel" data-panel="protocol" role="tabpanel">
            <h4 class="modal-section-title">Reconstitution Steps</h4>
            <ol class="modal-steps">${steps}</ol>
            <h4 class="modal-section-title">General Reconstitution Notes</h4>
            <p class="modal-text">${p.reconstitution || ''}</p>
            <h4 class="modal-section-title">Handling &amp; Storage</h4>
            <p class="modal-text">${p.handling || p.storage}</p>
            <div class="modal-protocol-note">
              <strong>Research use only.</strong> For in-vitro laboratory experimentation by qualified professionals. Not for human or animal consumption.
            </div>
          </div>
        </div>

        ${related ? `<div class="modal-related"><h4>Related Peptides</h4><div class="modal-related-chips">${related}</div></div>` : ''}

        <div class="modal-actions">
          ${buildSizeSelector(p, p.defaultVariant)}
          <button class="btn-primary" id="modalAddBtn" data-add="${p.id}">${SF.publicCtaLabel()}</button>
          <a href="product.html?p=${p.id}" class="btn-secondary">Share product</a>
        </div>
      </div>
      <div class="modal-sticky-bar" id="modalStickyBar">
        <span class="modal-sticky-name">${p.name}</span>
        <span class="modal-sticky-price" id="modalStickyPrice">${SF.formatStartingAt(p)}</span>
        <button class="btn-primary btn-sm" data-add="${p.id}">Add to Bag</button>
      </div>
    `;

    selectedModalSize = p.defaultVariant;
    initModalTabs();
    $('#modalSize')?.addEventListener('change', () => updateModalPrice(p));
    updateModalPrice(p);
    const modalScroll = $('#modalScroll');
    if (modalScroll) modalScroll.scrollTop = 0;
    window.RenvoaTrack?.('view_item', { item_id: id });
    productModal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    productModal.classList.remove('active');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderGoalTile(pid) {
    const p = PRODUCTS[pid];
    const cfg = TILE_CONFIG[pid];
    if (!p || !cfg) return '';
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
    const goal = GOAL_CATEGORIES[goalId];
    if (!goal) return;

    if (activeGoal === goalId) {
      closeGoalOverlay();
      return;
    }

    activeGoal = goalId;

    $$('.goal-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.goal === goalId);
    });

    goalOverlayTitle.textContent = goal.label;
    goalOverlayTiles.innerHTML = goal.products.map(renderGoalTile).join('');

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

  filterClear.addEventListener('click', clearGoalFilter);
  goalOverlayClose.addEventListener('click', closeGoalOverlay);
  goalOverlayBackdrop.addEventListener('click', closeGoalOverlay);

  cartBtn.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  searchBtn.addEventListener('click', openSearch);
  searchClose.addEventListener('click', closeSearch);
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearch();
  });
  searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);

  navHamburger.addEventListener('click', () => {
    navLinks.classList.toggle('mobile-open');
  });

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('visible', entry.isIntersecting);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  $$('.reveal').forEach((el) => revealObserver.observe(el));

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
  if (goalParam && GOAL_CATEGORIES[goalParam]) {
    setTimeout(() => applyGoalFilter(goalParam), 400);
  } else if (window.location.hash.startsWith('#goal-')) {
    const goalId = window.location.hash.replace('#goal-', '');
    if (GOAL_CATEGORIES[goalId]) setTimeout(() => applyGoalFilter(goalId), 400);
  }
  const productParam = urlParams.get('product');
  if (productParam && PRODUCTS[productParam]) {
    setTimeout(() => openModal(productParam), 500);
  }

  // Hero rotation
  const HERO_SLIDES = [
    { id: 'bpc-157', eyebrow: 'Featured', title: 'BPC-157.<br>Precision redefined.', sub: '≥99% purity. HPLC verified. Lyophilized for maximum stability.', price: 49, label: 'BPC-157' },
    { id: 'semaglutide', eyebrow: 'New', title: 'Semaglutide.<br>GLP-1 research.', sub: 'The benchmark GLP-1 receptor agonist for metabolic pathway studies.', price: 89, label: 'Semaglutide' },
    { id: 'tb-500', eyebrow: 'Popular', title: 'TB-500.<br>Repair pathways.', sub: 'Thymosin Beta-4 fragment for cell migration and tissue research.', price: 65, label: 'TB-500' },
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
    if (heroSub) heroSub.innerHTML = s.sub + '<br>For in-vitro laboratory research only.';
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

  updateCartUI();
})();