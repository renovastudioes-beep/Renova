/**
 * Embedded CareCredit / Synchrony financing — Apple-glass overlay for public site & portal.
 * Loads on studios.html; admin POS uses studio-pos-ui overlay instead.
 */
(function () {
  'use strict';

  const RS = () => window.RenvoaStudios;

  const PAYMENT_ORDER = { 'Pay in full': 0, Quarterly: 1, Finance: 2, Standard: 3 };

  const state = {
    open: false,
    context: null,
  };

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sortPaymentTiers(services) {
    const S = RS();
    return [...(services || [])].sort((a, b) => {
      const pa = PAYMENT_ORDER[S?.paymentType?.(a.name) || 'Standard'] ?? 9;
      const pb = PAYMENT_ORDER[S?.paymentType?.(b.name) || 'Standard'] ?? 9;
      return pa - pb;
    });
  }

  function formatPrice(n) {
    return RS()?.formatPrice?.(n) || `$${n}`;
  }

  function close() {
    state.open = false;
    state.context = null;
    const root = document.getElementById('studioFinanceOverlayRoot');
    if (root) root.remove();
    document.body.classList.remove('studio-finance-body-lock');
  }

  function initEmbed() {
    const mount = document.getElementById('studioFinanceEmbed');
    const S = RS();
    if (!mount || !S?.initFinanceEmbed) return;
    const ctx = state.context || {};
    S.initFinanceEmbed(mount, {
      ...ctx,
      autoOpen: ctx.autoOpen !== false && !S.getFinanceMerchantId?.(),
    });
  }

  function renderOverlay() {
    if (!state.open) {
      close();
      return;
    }

    const fin = state.context || {};
    const S = RS();
    const amount = fin.amount ? formatPrice(fin.amount) : '';
    const hasWidget = !!S?.getFinanceMerchantId?.();
    const configured = S?.isFinanceConfigured?.() ?? !!S?.getFinanceUrl?.();
    const brand = window.STUDIO_META?.brand || 'Onyx Studios';

    let root = document.getElementById('studioFinanceOverlayRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'studioFinanceOverlayRoot';
      document.body.appendChild(root);
    }

    root.innerHTML = `
      <div id="studioFinanceOverlay" class="studio-finance-fullscreen studio-finance-public" role="dialog" aria-modal="true" aria-labelledby="studioFinanceTitle">
        <div class="studio-finance-shell studio-glass-panel">
          <header class="studio-finance-head">
            <div>
              <p class="studio-eyebrow">${esc(brand)}</p>
              <h2 id="studioFinanceTitle">Financing</h2>
              <p class="studio-finance-lead">${fin.label
                ? `Pre-qualify for <strong>${esc(fin.label)}</strong>${amount ? ` · ${esc(amount)}` : ''}`
                : 'Apply or pre-qualify with CareCredit — right here on our site.'}
              ${fin.clientName ? `<br><span class="studio-finance-client">${esc(fin.clientName)}</span>` : ''}</p>
            </div>
            <div class="studio-finance-head-actions">
              <button type="button" class="studio-glass-btn studio-glass-btn-secondary studio-finance-close" id="studioFinanceCloseBtn" aria-label="Close financing">Close</button>
            </div>
          </header>
          <div class="studio-finance-embed-wrap">
            <div id="studioFinanceEmbed" class="studio-finance-embed studio-finance-embed-glass" data-finance-mode="${hasWidget ? 'widget' : (configured ? 'launcher' : 'setup')}"></div>
          </div>
          <p class="studio-finance-foot">CareCredit · ${hasWidget ? 'official embedded widget' : 'secure application window'} · ${esc(brand)}</p>
        </div>
      </div>`;

    document.body.classList.add('studio-finance-body-lock');
    root.querySelector('#studioFinanceCloseBtn')?.addEventListener('click', close);
    root.querySelector('#studioFinanceOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'studioFinanceOverlay') close();
    });
    requestAnimationFrame(initEmbed);
  }

  function open(context = {}) {
    state.open = true;
    state.context = {
      label: context.label || '',
      amount: context.amount ?? null,
      clientName: context.clientName || '',
    };
    renderOverlay();
    return true;
  }

  function getFinancingProgramGroups() {
    const S = RS();
    if (!S?.getProgramFamilies) return [];
    const groups = [];
    const add = (gender, category) => {
      (S.getProgramFamilies({ gender, category }) || []).forEach((grp) => {
        groups.push({ ...grp, gender, category });
      });
    };
    add('men', 'program');
    add('men', 'clinical');
    add('women', 'womens_program');
    add('women', 'womens_extensions');
    return groups;
  }

  /** Extension payment tiers for public consult browse — only Finance is actionable. */
  function renderExtensionPaymentTiers(base, opts = {}) {
    const S = RS();
    const cfg = S?.getExtensionConfig?.(base);
    const plans = window.STUDIO_EXT_PAYMENT_PLANS || [];
    if (!cfg?.lengths?.length || !plans.length) return '';

    const hint = opts.hint || 'Starting prices by length — confirmed at your consultation. Only Finance opens CareCredit.';
    const tiers = plans.map((plan) => {
      let minPrice = Infinity;
      let financeTotal = 0;
      cfg.lengths.forEach((row) => {
        let price = 0;
        if (plan.id === 'finance') {
          price = S.computeFinancePackagePrice({ pifAmount: row.pif ?? 0 });
          if (price > 0 && price < minPrice) {
            minPrice = price;
            financeTotal = price;
          }
        } else if (plan.id === 'quarterly') {
          if (!S.isExtensionQuarterlyEligible(row)) return;
          price = row.quarterly ?? 0;
        } else {
          price = row.pif ?? 0;
        }
        if (price > 0 && price < minPrice) minPrice = price;
      });
      if (!Number.isFinite(minPrice)) return null;
      return { plan, minPrice, financeTotal: financeTotal || minPrice };
    }).filter(Boolean);

    return `
      <div class="studio-finance-tiers-block">
        <p class="studio-finance-tiers-label">Payment options · ${esc(base)}</p>
        <p class="studio-finance-tiers-hint">${esc(hint)}</p>
        <div class="studio-program-tier-btns studio-finance-tier-btns">
          ${tiers.map(({ plan, minPrice, financeTotal }) => {
            const isFinance = plan.id === 'finance';
            const priceDisplay = isFinance ? formatPrice(financeTotal) : `From ${formatPrice(minPrice)}`;
            const visits = cfg.appointmentsIncluded || 0;
            const visitsNote = visits ? `${visits} visits included` : '';
            const inner = `
              <span class="studio-program-plan">${esc(plan.label)}</span>
              <strong class="studio-tier-price">${priceDisplay}</strong>
              <small>${visitsNote}${plan.id === 'quarterly' ? ' · annual plan' : ''}${isFinance ? ' · tap to apply' : ' · reference only'}</small>
              ${isFinance ? '<span class="studio-tier-finance-cta">Apply for financing → opens CareCredit</span>' : ''}`;
            if (isFinance) {
              return `
              <button type="button" class="studio-tier-option studio-tier-finance"
                data-finance-apply data-finance-amount="${financeTotal}" data-finance-label="${esc(base)} — Finance">
                ${inner}
              </button>`;
            }
            return `<div class="studio-tier-option studio-tier-option-info" aria-label="${esc(plan.label)} plan">${inner}</div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /** Payment tier cards — PIF, Quarterly, Finance (apply opens overlay). */
  function renderProgramTiers(grp, opts = {}) {
    const S = RS();
    if (!grp?.services?.length) return '';

    const tiers = sortPaymentTiers(grp.services);
    const hint = opts.hint || 'Pay in full and quarterly are reference pricing — only Finance opens CareCredit.';

    return `
      <div class="studio-finance-tiers-block">
        <p class="studio-finance-tiers-label">Payment options · ${esc(grp.base)}</p>
        <p class="studio-finance-tiers-hint">${esc(hint)}</p>
        <div class="studio-program-tier-btns studio-finance-tier-btns">
          ${tiers.map((svc) => {
            const plan = S.paymentType(svc.name) || 'Standard';
            const isFinance = plan === 'Finance' || svc.isFinanceTier;
            const visitsLabel = S.formatPackageVisitsLabel(svc, plan);
            const inner = `
              <span class="studio-program-plan">${esc(plan)}</span>
              <strong class="studio-tier-price">${formatPrice(svc.price)}</strong>
              <small>${esc(visitsLabel || svc.duration || '')}${svc.appointmentValue ? ` · ~${formatPrice(svc.appointmentValue)}/visit` : ''}${plan === 'Quarterly' ? ' · billed quarterly' : ''}${isFinance ? ' · apply in-site' : ''}</small>
              ${isFinance ? '<span class="studio-tier-finance-cta">Apply for financing → opens CareCredit</span>' : ''}`;
            if (isFinance) {
              return `
              <button type="button" class="studio-tier-option studio-tier-finance"
                data-finance-apply data-finance-service="${esc(svc.id)}" data-finance-label="${esc(S.shortName(svc.name))}" data-finance-amount="${svc.price}">
                ${inner}
              </button>`;
            }
            return `<div class="studio-tier-option studio-tier-option-info" aria-label="${esc(plan)} plan">${inner}</div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function isAdminFinanceContext() {
    return !!document.querySelector('.admin-app, .admin-shell, #adminApp, #adminRoot');
  }

  function launchFinanceApply(detail = {}) {
    const payload = {
      label: detail.label || '',
      amount: detail.amount ?? null,
      clientName: detail.clientName || '',
      autoOpen: detail.autoOpen !== false,
    };
    if (isAdminFinanceContext()) {
      window.dispatchEvent(new CustomEvent('studio-open-finance', { detail: payload }));
      return;
    }
    open(payload);
  }

  function bindFinanceTierClicks(root, getContext) {
    if (!root || root.dataset.financeClicksBound === '1') return;
    root.dataset.financeClicksBound = '1';
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-finance-apply]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const ctx = typeof getContext === 'function' ? getContext(btn) : {};
      const svcId = btn.dataset.financeService;
      const svc = svcId ? RS()?.getService?.(svcId) : null;
      const amount = Number(btn.dataset.financeAmount) || svc?.price || null;
      if (!amount) return;
      launchFinanceApply({
        label: btn.dataset.financeLabel || (svc ? RS().shortName(svc.name) : ''),
        amount,
        clientName: ctx.clientName || '',
        autoOpen: true,
      });
    });
  }

  function handleFinanceEvent(e) {
    if (isAdminFinanceContext()) return;
    open(e.detail || {});
  }

  function renderFinancePage() {
    const S = RS();
    const groups = getFinancingProgramGroups();
    const cats = window.STUDIO_CATEGORIES || {};
    const brand = window.STUDIO_META?.brand || 'Onyx Studios';
    const canApply = S?.isFinanceConfigured?.() ?? !!S?.getFinanceUrl?.();

    return `
      <div class="studio-finance-page">
        ${!canApply ? `<div class="studio-book-error" role="status">Financing setup is in progress — call the studio to apply today.</div>` : ''}
        ${groups.length ? groups.map((grp) => `
          <section class="studio-portal-finance-program studio-finance-page-program">
            <div class="studio-portal-finance-program-head">
              <span class="studio-portal-finance-cat">${esc(cats[grp.category]?.label || grp.category)}</span>
              <h3>${esc(grp.base)}</h3>
              ${grp.tagline ? `<p>${esc(grp.tagline)}</p>` : ''}
            </div>
            ${renderProgramTiers(grp, {
              hint: canApply
                ? 'Tap Apply for financing — CareCredit opens in a secure window while you stay on ' + brand + '.'
                : 'Financing preview — apply in-studio or call us.',
            })}
          </section>
        `).join('') : '<p class="studio-portal-empty">Program pricing is loading…</p>'}
      </div>`;
  }

  let financePageBound = false;

  function mountFinancePage() {
    const root = document.getElementById('studioFinancePageRoot');
    if (!root) return;
    root.innerHTML = renderFinancePage();
    if (!financePageBound) {
      bindFinanceTierClicks(root, () => ({}));
      financePageBound = true;
      window.addEventListener('studio-line-change', (e) => {
        if (e.detail?.line === 'finance') mountFinancePage();
      });
    }
  }

  window.StudioFinanceUI = {
    open,
    close,
    renderProgramTiers,
    renderExtensionPaymentTiers,
    renderFinancePage,
    getFinancingProgramGroups,
    bindFinanceTierClicks,
    mountFinancePage,
    isOpen: () => state.open,
  };

  window.addEventListener('studio-open-finance', handleFinanceEvent);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) close();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFinancePage);
  } else {
    mountFinancePage();
  }
})();