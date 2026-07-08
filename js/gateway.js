(function () {
  'use strict';

  const gateway = document.getElementById('renovaGateway');
  if (!gateway) return;

  const hero = document.querySelector('.gateway-hero-center');
  const splitLine = document.querySelector('.gateway-split-line');
  const divider = document.querySelector('.gateway-divider');
  const peptidesPanel = gateway.querySelector('[data-side="peptides"]');
  const hairPanel = gateway.querySelector('[data-side="hair"]');
  const canHover = window.matchMedia('(hover: hover)').matches;
  const stackedQuery = window.matchMedia('(max-width: 768px)');
  const touchQuery = window.matchMedia('(max-width: 1024px), (hover: none) and (pointer: coarse)');
  const isStackedLayout = () => stackedQuery.matches;
  const isMobile = () => isStackedLayout();
  const isTouchUI = () => touchQuery.matches || !canHover;

  const ROUTES = {
    peptides: 'peptides.html',
    hair: 'studios.html',
  };
  const SWIPE_DISTANCE = 36;
  const SWIPE_VELOCITY = 0.24;
  const STACKED_SWIPE_COMMIT = 14;
  const OPEN_FOCUS = 0.28;

  const SPLIT_CENTER = 0.5;
  const SPLIT_MAX = 0.7;
  const SPLIT_MIN = 0.3;
  const FOLLOW_IN = 10.5;
  const FOLLOW_OUT = 6.5;
  const POINTER_SMOOTH = 12;
  const NAV_EXPAND_MS = 760;
  const NAV_FADE_MS = 900;

  let split = SPLIT_CENTER;
  let targetSplit = SPLIT_CENTER;
  let pointerRatio = SPLIT_CENTER;
  let isInside = false;
  let rafId = null;
  let lastTime = 0;

  const parallax = {
    peptides: { x: 0, y: 0, tx: 0, ty: 0 },
    hair: { x: 0, y: 0, tx: 0, ty: 0 },
  };

  function splitFromRatio(ratio) {
    if (ratio <= 0.5) {
      return SPLIT_MAX + (SPLIT_CENTER - SPLIT_MAX) * (ratio / 0.5);
    }
    return SPLIT_CENTER + (SPLIT_MIN - SPLIT_CENTER) * ((ratio - 0.5) / 0.5);
  }

  function focusFromSplit(value) {
    const pFocus = Math.max(0, Math.min(1, (value - SPLIT_CENTER) / (SPLIT_MAX - SPLIT_CENTER)));
    const hFocus = Math.max(0, Math.min(1, (SPLIT_CENTER - value) / (SPLIT_CENTER - SPLIT_MIN)));
    return { pFocus, hFocus, focus: Math.max(pFocus, hFocus) };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothStep(current, target, rate, dt) {
    const t = 1 - Math.exp(-rate * dt);
    return lerp(current, target, t);
  }

  function updateHero(pFocus, hFocus, focus) {
    if (!hero) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;

    if (pFocus > hFocus && pFocus > 0.01 && peptidesPanel) {
      const rect = peptidesPanel.getBoundingClientRect();
      tx = rect.left + rect.width / 2;
      ty = rect.top + Math.min(88, Math.max(52, rect.height * 0.09));
    } else if (hFocus > 0.01 && hairPanel) {
      const rect = hairPanel.getBoundingClientRect();
      tx = rect.left + rect.width / 2;
      ty = rect.top + Math.min(88, Math.max(52, rect.height * 0.09));
    }

    const x = lerp(cx, tx, focus);
    const y = lerp(cy, ty, focus);
    const scale = lerp(1, 0.3, focus);
    const anchor = -50 * (1 - focus);

    hero.style.left = `${x}px`;
    hero.style.top = `${y}px`;
    hero.style.transform = `translate(-50%, ${anchor}%) scale(${scale})`;
    hero.style.opacity = String(lerp(1, 0.38, focus));
    hero.style.zIndex = focus > 0.22 ? '4' : '30';

    hero.classList.toggle('is-in-panel', focus > 0.15);
    hero.classList.toggle('is-in-hair', hFocus > pFocus && focus > 0.15);

    const sub = hero.querySelector('.gateway-hero-sub');
    if (sub) sub.style.opacity = String(lerp(1, 0, Math.min(1, focus * 1.4)));
  }

  function updateProductParallax(side, focus, dt) {
    const panel = side === 'peptides' ? peptidesPanel : hairPanel;
    const product = panel?.querySelector('.gateway-product');
    const state = parallax[side];
    if (!product || !state) return;

    state.x = smoothStep(state.x, state.tx, 16, dt);
    state.y = smoothStep(state.y, state.ty, 16, dt);

    if (focus < 0.05) {
      product.style.removeProperty('transform');
      return;
    }

    const baseScale = 0.82 + 0.26 * focus;
    const lift = 12 - 20 * focus;
    product.style.transform = `scale(${baseScale}) translate(${state.x * focus}px, ${state.y * focus + lift}px)`;
  }

  function applyState(value) {
    const { pFocus, hFocus, focus } = focusFromSplit(value);
    const leftFr = value * 100;
    const rightFr = (1 - value) * 100;

    if (isMobile()) {
      gateway.style.gridTemplateRows = `${leftFr}fr ${rightFr}fr`;
      gateway.style.removeProperty('grid-template-columns');
    } else {
      gateway.style.gridTemplateColumns = `${leftFr}fr ${rightFr}fr`;
      gateway.style.removeProperty('grid-template-rows');
    }

    gateway.style.setProperty('--split', String(value));
    gateway.style.setProperty('--p-focus', String(pFocus));
    gateway.style.setProperty('--h-focus', String(hFocus));
    gateway.style.setProperty('--focus', String(focus));

    const splitPos = `${value * 100}%`;
    if (splitLine) {
      if (isMobile()) {
        splitLine.style.top = splitPos;
        splitLine.style.removeProperty('left');
      } else {
        splitLine.style.left = splitPos;
        splitLine.style.removeProperty('top');
      }
    }

    if (divider) {
      divider.style.opacity = String(lerp(0.35, 0, focus));
      divider.style.transform = `translate(-50%, -50%) scale(${lerp(1, 0.5, focus)})`;
      if (!isMobile()) divider.style.left = splitPos;
    }

    peptidesPanel?.classList.toggle('is-panel-hot', pFocus > 0.32);
    hairPanel?.classList.toggle('is-panel-hot', hFocus > 0.32);

    if (peptidesPanel) peptidesPanel.style.zIndex = pFocus >= hFocus && focus > 0.05 ? '8' : '1';
    if (hairPanel) hairPanel.style.zIndex = hFocus > pFocus && focus > 0.05 ? '8' : '1';

    gateway.classList.toggle('is-tracking', isInside && focus > 0.04);

    updateHero(pFocus, hFocus, focus);
    return { pFocus, hFocus };
  }

  function tick(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;

    const followRate = isInside ? FOLLOW_IN : FOLLOW_OUT;
    split = smoothStep(split, targetSplit, followRate, dt);

    const { pFocus, hFocus } = applyState(split);
    updateProductParallax('peptides', pFocus, dt);
    updateProductParallax('hair', hFocus, dt);

    const settled = Math.abs(split - targetSplit) < 0.0004;
    const centered = Math.abs(split - SPLIT_CENTER) < 0.0004;

    if (isInside || !settled || (!isInside && !centered)) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    split = targetSplit;
    applyState(split);
    rafId = null;
    lastTime = 0;
  }

  function queueTick() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function setPointerRatio(ratio) {
    pointerRatio = ratio;
    targetSplit = splitFromRatio(pointerRatio);
    queueTick();
  }

  function nudgePointerRatio(ratio) {
    pointerRatio = smoothStep(pointerRatio, ratio, POINTER_SMOOTH, 0.016);
    targetSplit = splitFromRatio(pointerRatio);
    queueTick();
  }

  function resetParallax() {
    Object.values(parallax).forEach((state) => {
      state.x = 0;
      state.y = 0;
      state.tx = 0;
      state.ty = 0;
    });
  }

  function resetToCenter() {
    isInside = false;
    targetSplit = SPLIT_CENTER;
    pointerRatio = SPLIT_CENTER;
    gateway.classList.remove('is-tracking');
    peptidesPanel?.classList.remove('is-panel-hot');
    hairPanel?.classList.remove('is-panel-hot');
    resetParallax();
    gateway.querySelectorAll('.gateway-product').forEach((el) => {
      el.style.removeProperty('transform');
    });
    queueTick();
  }

  if (canHover && !isTouchUI()) {
    gateway.addEventListener('mouseenter', (e) => {
      isInside = true;
      const ratio = isMobile() ? e.clientY / window.innerHeight : e.clientX / window.innerWidth;
      pointerRatio = ratio;
      setPointerRatio(ratio);
    });

    gateway.addEventListener('mousemove', (e) => {
      isInside = true;
      const ratio = isMobile() ? e.clientY / window.innerHeight : e.clientX / window.innerWidth;
      nudgePointerRatio(ratio);
    });

    gateway.addEventListener('mouseleave', resetToCenter);
  }

  window.addEventListener('resize', () => {
    applyState(split);
  });

  [peptidesPanel, hairPanel].forEach((panel) => {
    if (!panel) return;
    const side = panel.dataset.side;

    panel.addEventListener('focusin', () => {
      isInside = true;
      const ratio = side === 'peptides' ? 0 : 1;
      pointerRatio = ratio;
      setPointerRatio(ratio);
    });

    if (canHover && !isTouchUI()) {
      panel.addEventListener('mousemove', (e) => {
        const focusVar = side === 'peptides' ? '--p-focus' : '--h-focus';
        const focus = parseFloat(getComputedStyle(gateway).getPropertyValue(focusVar)) || 0;
        if (focus < 0.2) return;

        const rect = panel.getBoundingClientRect();
        const state = parallax[side];
        state.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
        state.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 5;
        queueTick();
      });

      panel.addEventListener('mouseleave', () => {
        const state = parallax[side];
        state.tx = 0;
        state.ty = 0;
      });
    }
  });

  let touchedSide = null;
  let navigating = false;

  function ratioFromPoint(clientX, clientY) {
    return isMobile() ? clientY / window.innerHeight : clientX / window.innerWidth;
  }

  function ratioFromSwipeDelta(startRatio, dy) {
    const shift = (-dy / window.innerHeight) * 1.35;
    return Math.max(0, Math.min(1, startRatio + shift));
  }

  function dominantSideFromFocus(value = split) {
    const { pFocus, hFocus } = focusFromSplit(value);
    if (pFocus >= OPEN_FOCUS && pFocus >= hFocus) return 'peptides';
    if (hFocus >= OPEN_FOCUS) return 'hair';
    return null;
  }

  function sideFromStackedSwipe(dy, dragged = false) {
    if (!dragged && Math.abs(dy) < STACKED_SWIPE_COMMIT) return null;
    if (Math.abs(dy) < 1) return null;
    return dy < 0 ? 'hair' : 'peptides';
  }

  function prefetchRoute(url) {
    if (!url || document.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = url;
    document.head.appendChild(link);
  }

  function commitNavigation(side) {
    const url = ROUTES[side];
    if (!url) return;
    try {
      sessionStorage.setItem('onyx-gateway-enter', side);
    } catch (_) { /* private mode */ }
    const go = () => {
      window.location.href = url;
    };
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(go);
      return;
    }
    go();
  }

  function navigateToSide(side) {
    if (navigating || !ROUTES[side]) return;
    navigating = true;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = 0;
    }

    prefetchRoute(ROUTES[side]);

    gateway.classList.add('is-navigating', `is-navigating-${side}`);
    document.body.classList.add('gateway-opening', `gateway-opening-${side}`);
    gateway.classList.remove('is-tracking', 'is-swiping');
    isInside = false;

    gateway.style.setProperty('--p-focus', side === 'peptides' ? '1' : '0');
    gateway.style.setProperty('--h-focus', side === 'hair' ? '1' : '0');
    gateway.style.setProperty('--focus', '1');

    if (hero) hero.style.opacity = '0';
    if (splitLine) splitLine.style.opacity = '0';
    if (divider) {
      divider.style.opacity = '0';
      divider.style.transform = 'translate(-50%, -50%) scale(0.5)';
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      commitNavigation(side);
    };

    const onGridSettled = (e) => {
      if (e.target !== gateway) return;
      if (!e.propertyName.includes('grid')) return;
      gateway.removeEventListener('transitionend', onGridSettled);
      window.setTimeout(finish, 140);
    };

    gateway.addEventListener('transitionend', onGridSettled);
    window.setTimeout(finish, NAV_FADE_MS);
    window.setTimeout(() => {
      gateway.classList.add('is-navigating-ready');
      document.body.classList.add('gateway-opening-ready');
    }, NAV_EXPAND_MS * 0.5);
  }

  function resolveSideFromSwipe(dx, dy, dragged = false) {
    if (isStackedLayout()) {
      if (Math.abs(dy) < Math.abs(dx) * 0.55) return null;
      return sideFromStackedSwipe(dy, dragged);
    }
    if (Math.abs(dx) < Math.abs(dy) * 0.85) return null;
    return dx > 0 ? 'peptides' : 'hair';
  }

  function shouldOpenFromSwipe(dx, dy, durationMs) {
    const axis = isStackedLayout() ? dy : dx;
    const velocity = Math.abs(axis) / Math.max(durationMs, 1);
    return Math.abs(axis) >= SWIPE_DISTANCE || velocity >= SWIPE_VELOCITY;
  }

  let suppressPanelClick = false;

  [peptidesPanel, hairPanel].forEach((panel) => {
    if (!panel) return;
    const side = panel.dataset.side;
    panel.addEventListener('mouseenter', () => prefetchRoute(ROUTES[side]));
    panel.addEventListener('focus', () => prefetchRoute(ROUTES[side]));
    panel.addEventListener('click', (e) => {
      if (navigating || suppressPanelClick) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      navigateToSide(side);
    });
  });

  if (isTouchUI()) {
    gateway.classList.add('is-touch-ui');
    document.body.classList.add('gateway-touch');
    let touchStart = null;
    let touchDragging = false;
    let touchActive = false;
    const touchSurface = document.documentElement;

    function clearTouchState() {
      touchStart = null;
      touchDragging = false;
      touchActive = false;
      gateway.classList.remove('is-swiping');
    }

    function finishTouchNavigation(side, e) {
      if (!side || navigating) return false;
      e?.preventDefault();
      suppressPanelClick = true;
      window.setTimeout(() => {
        suppressPanelClick = false;
      }, 700);
      navigateToSide(side);
      return true;
    }

    function beginPointer(e) {
      if (navigating || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
      const ratio = ratioFromPoint(e.clientX, e.clientY);
      touchStart = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        at: Date.now(),
        ratio,
      };
      touchDragging = false;
      touchActive = true;
      isInside = true;
      pointerRatio = ratio;
      setPointerRatio(ratio);
      try {
        touchSurface.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    }

    function movePointer(e) {
      if (!touchStart || navigating || e.pointerId !== touchStart.pointerId) return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      if (!touchDragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        touchDragging = true;
        gateway.classList.add('is-swiping');
      }
      if (!touchDragging) return;
      e.preventDefault();
      const ratio = isStackedLayout()
        ? ratioFromSwipeDelta(touchStart.ratio, dy)
        : ratioFromPoint(e.clientX, e.clientY);
      if (isStackedLayout()) setPointerRatio(ratio);
      else nudgePointerRatio(ratio);
    }

    function endPointer(e) {
      if (!touchStart || navigating || e.pointerId !== touchStart.pointerId) return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      const durationMs = Date.now() - touchStart.at;
      gateway.classList.remove('is-swiping');

      try {
        if (touchSurface.hasPointerCapture?.(e.pointerId)) {
          touchSurface.releasePointerCapture(e.pointerId);
        }
      } catch (_) {
        /* ignore */
      }

      if (touchDragging) {
        let side = resolveSideFromSwipe(dx, dy, true);
        const focusSide = dominantSideFromFocus(targetSplit);

        if (isStackedLayout()) {
          if (side) finishTouchNavigation(side, e);
          else if (focusSide) finishTouchNavigation(focusSide, e);
          else resetToCenter();
        } else {
          const strongSwipe = shouldOpenFromSwipe(dx, dy, durationMs);
          if (!side || !strongSwipe) side = focusSide;
          if (side && strongSwipe) finishTouchNavigation(side, e);
          else resetToCenter();
        }
      } else if (isStackedLayout()) {
        const ratio = ratioFromPoint(e.clientX, e.clientY);
        setPointerRatio(ratio);
        const tapSide = ratio < 0.5 ? 'peptides' : 'hair';
        finishTouchNavigation(tapSide, e);
      } else {
        const ratio = ratioFromPoint(e.clientX, e.clientY);
        setPointerRatio(ratio);
        const focusSide = dominantSideFromFocus(targetSplit);
        if (focusSide) touchedSide = focusSide;
        else resetToCenter();
      }

      clearTouchState();
    }

    touchSurface.addEventListener('pointerdown', beginPointer, { passive: true });
    touchSurface.addEventListener('pointermove', movePointer, { passive: false });
    touchSurface.addEventListener('pointerup', endPointer, { passive: false });
    touchSurface.addEventListener('pointercancel', () => {
      clearTouchState();
      resetToCenter();
    }, { passive: true });
  }

  applyState(SPLIT_CENTER);
})();