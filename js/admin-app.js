(function () {
  'use strict';

  const A = window.RenvoaAdmin;
  const C = window.RenvoaCart;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function showFatal(msg) {
    document.body.insertAdjacentHTML('beforeend',
      `<p style="position:fixed;bottom:20px;left:20px;right:20px;background:#ff3b30;color:#fff;padding:16px;border-radius:12px;z-index:9999;font-family:system-ui;">${msg}</p>`);
  }

  if (!A) {
    showFatal('Admin failed to load. Hard-refresh (Cmd+Shift+R) and confirm /js/admin-data.js loads.');
  }
  if (!C) {
    showFatal('Cart module missing — check that /js/cart.js and /js/products.js load before admin-app.js.');
  }

  let activeView = 'overview';
  let businessMode = 'peptide';
  const CLINIC_SETTINGS_TABS = ['settings', 'pricing', 'staff'];
  let selectedOrderId = null;
  let selectedCustomerEmail = null;
  let selectedCRMEmail = null;
  let crmSubView = 'contacts';
  let crmStageFilter = '';
  let crmSearch = '';
  let posSubView = 'quotes';
  let financePreset = 'mtd';
  let financeStartDate = '';
  let financeEndDate = '';
  let financeSource = 'peptide';
  let financeShowModel = false;
  let financeEditingAdjustmentId = '';
  let selectedPOSOrderId = null;
  let studioSubView = 'dashboard';
  let selectedStudioInquiryId = null;
  let selectedStudioClientId = null;
  let selectedStudioAppointmentId = null;
  let selectedStudioStaffId = null;
  let studioGender = 'men';
  let studioCategory = 'program';
  let studioCalendarDate = null;
  let studioCalendarView = 'day';
  let studioPosCart = { clientName: '', clientId: '', items: [], discount: 0 };
  let studioPosMode = 'client';
  let studioShelfCategory = 'products';
  let studioPosApplyCredit = true;
  let studioPosAuthOpen = false;
  let studioPosAuthAction = null;
  let studioPosAuthPending = null;
  let studioPresentOpen = false;
  let studioFinanceOpen = false;
  let studioFinanceContext = null;
  let studioFinanceEventBound = false;
  let studioPrefill = null;
  let studioPosSearch = '';
  let studioClientSearch = '';
  let studioClientAdding = false;
  let studioFlash = '';
  let studioFlashType = 'info';
  let studioApptServiceId = null;
  let studioApptDraftDate = null;
  let studioApptDraftCol = null;
  let studioApptDraftTime = null;
  let selectedStudioTransactionId = null;
  let studioOpenProgramBase = null;
  let studioProgramModalMode = 'pos';
  let studioBookGender = 'men';
  let studioBookCategory = 'program';
  let studioCalChairFilter = 0;
  let studioApptReschedule = false;
  let studioCalMoveMode = false;
  let studioRescheduleDraft = null;
  let studioProgramStep = 'length';
  let studioExtOptions = null;
  let studioBookWizardOpen = false;
  let studioBookWizardStep = 'when';
  let studioBookClientName = '';
  let studioBookClientPhone = '';
  let studioBookNotes = '';
  let studioBookHairLikes = '';
  let studioBookHairDislikes = '';
  let studioBookPriorServices = '';
  let studioBookBeverage = '';
  let studioBookInspoPhotos = [];
  let studioBookVisitType = '';
  let studioBookClientId = '';
  let studioApptModalOpen = false;
  let studioIntakeWizardOpen = false;
  let studioIntakeApptId = null;
  let studioIntakeStep = 0;
  let studioIntakeSigned = [];
  let studioIntakeData = {};
  let studioIntakeSkippedForms = [];
  let studioAllergyModalOpen = false;
  let studioAllergyApptId = null;
  let studioProviderWizardOpen = false;
  let studioProviderApptId = null;
  let studioProviderStep = 'activity';
  let studioProviderDraft = null;
  let studioRebookOpen = false;
  let studioRebookApptId = null;
  let studioRebookSource = null;
  let studioRebookDraft = null;
  let studioClientTab = 'overview';
  let studioClientMergeSecondaryId = null;
  let studioClientMergeSearch = '';
  let studioPhotoPromptOpen = false;
  let studioPhotoPromptKind = null;
  let studioPhotoPromptApptId = null;
  let studioPhotoPromptPending = null;
  let studioPostVisitApptId = null;
  let studioPostVisitSource = null;
  let studioPostVisitAwaitingCheckout = false;
  let studioPostVisitPendingRebookApptId = null;
  let pendingPhotoUploadCtx = null;
  let activeCameraStream = null;

  function studioNotify(msg, type) {
    studioFlash = msg;
    studioFlashType = type || 'info';
  }

  function closePosAuthModal() {
    studioPosAuthOpen = false;
    studioPosAuthAction = null;
    studioPosAuthPending = null;
  }

  function openPosAuthModal(action, pending) {
    studioPosAuthOpen = true;
    studioPosAuthAction = action;
    studioPosAuthPending = pending;
  }

  function applyPosAuthOverride(pin) {
    const expected = window.RenvoaStudios?.POS_OVERRIDE_PIN || '1214';
    if (String(pin || '').trim() !== expected) {
      studioNotify('Incorrect manager PIN.', 'error');
      return false;
    }
    if (studioPosAuthAction === 'discount') {
      const amount = Math.max(0, Number(studioPosAuthPending?.discount) || 0);
      const gross = studioPosCart.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
      studioPosCart.discount = Math.min(amount, gross);
      studioNotify(studioPosCart.discount
        ? `Discount of ${window.RenvoaStudios.formatPrice(studioPosCart.discount)} applied.`
        : 'Discount removed.', 'success');
    } else if (studioPosAuthAction === 'price') {
      const idx = studioPosAuthPending?.itemIndex;
      const item = studioPosCart.items[idx];
      if (item) {
        const nextPrice = Math.max(0, Number(studioPosAuthPending?.price) || 0);
        if (item.originalPrice == null) item.originalPrice = item.price;
        item.price = nextPrice;
        item.priceOverride = true;
        studioNotify(`Price updated to ${window.RenvoaStudios.formatPrice(nextPrice)}.`, 'success');
      }
    } else if (studioPosAuthAction === 'client_save') {
      const S = window.RenvoaStudios;
      const p = studioPosAuthPending || {};
      S?.updateClient(p.id, p.patch);
      studioNotify('Client saved.', 'success');
    } else if (studioPosAuthAction === 'client_create') {
      const S = window.RenvoaStudios;
      const client = S?.upsertClient(studioPosAuthPending?.data || {});
      if (client) {
        studioClientAdding = false;
        selectedStudioClientId = client.id;
        studioNotify(`${client.name} added.`, 'success');
      }
    } else if (studioPosAuthAction === 'client_merge') {
      const S = window.RenvoaStudios;
      const p = studioPosAuthPending || {};
      const result = S?.mergeClients(p.primaryId, p.secondaryId);
      if (result?.error) {
        studioNotify(result.error, 'error');
        closePosAuthModal();
        return false;
      }
      selectedStudioClientId = result.primaryId;
      studioClientMergeSecondaryId = null;
      studioClientMergeSearch = '';
      const moved = result.moved || {};
      const parts = [
        moved.appointments ? `${moved.appointments} appointment${moved.appointments !== 1 ? 's' : ''}` : '',
        moved.transactions ? `${moved.transactions} sale${moved.transactions !== 1 ? 's' : ''}` : '',
        moved.credits ? `${moved.credits} credit entr${moved.credits !== 1 ? 'ies' : 'y'}` : '',
      ].filter(Boolean);
      studioNotify(
        parts.length
          ? `Merged ${result.secondaryName} into ${result.mergedName} — moved ${parts.join(', ')}.`
          : `Merged ${result.secondaryName} into ${result.mergedName}.`,
        'success'
      );
    } else if (studioPosAuthAction === 'client_credit') {
      const S = window.RenvoaStudios;
      const p = studioPosAuthPending || {};
      const result = S?.addManualClientCredit(p.clientId, p.amount, p.notes);
      if (result?.error) {
        studioNotify(result.error, 'error');
        closePosAuthModal();
        return false;
      }
      studioNotify(`Credit updated — new balance ${S.formatPrice(result.balance)}.`, 'success');
    } else if (studioPosAuthAction === 'client_refund') {
      const S = window.RenvoaStudios;
      const p = studioPosAuthPending || {};
      const result = S?.issueClientRefund(p.clientId, p.transactionId, p.amount, p.notes);
      if (result?.error) {
        studioNotify(result.error, 'error');
        closePosAuthModal();
        return false;
      }
      studioNotify(`Refund of ${S.formatPrice(result.amount)} recorded.`, 'success');
    } else if (studioPosAuthAction === 'client_program') {
      const S = window.RenvoaStudios;
      const p = studioPosAuthPending || {};
      const result = S?.adjustClientProgram(p.clientId, p.programId, p.data);
      if (result?.error) {
        studioNotify(result.error, 'error');
        closePosAuthModal();
        return false;
      }
      studioNotify('Program adjustments saved.', 'success');
    } else if (studioPosAuthAction === 'client_warranty') {
      const S = window.RenvoaStudios;
      const p = studioPosAuthPending || {};
      const result = S?.adjustClientProgram(p.clientId, p.programId, p.data);
      if (result?.error) {
        studioNotify(result.error, 'error');
        closePosAuthModal();
        return false;
      }
      studioNotify('Warranty settings saved.', 'success');
    }
    closePosAuthModal();
    return true;
  }

  const loginEl = $('#adminLogin');
  const appEl = $('#adminApp');
  const mainEl = $('#adminMain');

  function statusMeta(id) {
    return A.ORDER_STATUSES.find((s) => s.id === id) || A.ORDER_STATUSES[0];
  }

  function crmStageMeta(id) {
    return A.CRM_STAGES.find((s) => s.id === id) || A.CRM_STAGES[0];
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pct(current, target) {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  function itemLabel(item) {
    return C.getItemLabel(item);
  }

  function formatOrderTotal(order) {
    if (!order) return '—';
    if (order.pricingStatus === 'pending' || order.total == null) return 'Pending quote';
    return A.formatMoney(order.total);
  }

  function getOrderPricing(order) {
    if (!order) return null;
    if (order.pricedLines?.length) {
      return {
        lines: order.pricedLines,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        cogs: order.cogs,
        margin: order.margin,
      };
    }
    if (order.internalPricing) return order.internalPricing;
    return window.RenvoaPOS?.priceCartItems(order.items || [], order.bacWater) || null;
  }

  function pricingStatusLabel(order) {
    if (!order) return '';
    return order.pricingStatus === 'pending' ? 'Quote pending' : 'Pricing confirmed';
  }

  function renderLogin() {
    showPanel('login');
  }

  function showPanel(panel) {
    if (loginEl) {
      loginEl.hidden = panel !== 'login';
      loginEl.style.display = panel === 'login' ? '' : 'none';
    }
    if (appEl) {
      appEl.hidden = panel !== 'app';
      appEl.style.display = panel === 'app' ? '' : 'none';
    }
  }

  function renderApp() {
    showPanel('app');
    const meta = $('#adminMeta');
    if (meta) {
      const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const storage = window.StudioStorage;
      const mode = storage?.getMode?.() || 'local';
      const cloudLabel = mode === 'cloud' ? ' · Cloud sync on' : (mode === 'local-fallback' ? ' · Cloud offline' : '');
      meta.textContent = date + cloudLabel;
    }
    try {
      updateNewBadge();
      updateCrmBadge();
      updatePosBadge();
      updateStudioBadge();
      updateBusinessModeUI();
      renderView();
    } catch (err) {
      console.error('RENVOA admin render error:', err);
      if (mainEl) {
        mainEl.innerHTML = `<div class="admin-panel"><h2>Something went wrong loading the dashboard</h2><p>${esc(err.message)}</p><button type="button" class="btn-primary btn-sm" id="adminRetryBtn">Retry</button></div>`;
        $('#adminRetryBtn')?.addEventListener('click', renderApp);
      }
    }
  }

  function updateNewBadge() {
    const badge = $('#newOrdersBadge');
    if (!badge || !A) return;
    const count = A.getOrders().filter((o) => o.status === 'new').length;
    badge.textContent = count || '';
    badge.hidden = !count;
  }

  function updateCrmBadge() {
    const badge = $('#crmTasksBadge');
    if (!badge) return;
    const stats = A.getCRMStats();
    const count = stats.overdue + stats.dueToday;
    badge.textContent = count || '';
    badge.hidden = !count;
  }

  function updatePosBadge() {
    const badge = $('#posQuotesBadge');
    if (!badge) return;
    const count = A.getOrders().filter((o) => o.pricingStatus === 'pending').length;
    badge.textContent = count || '';
    badge.hidden = !count;
  }

  function updateStudioBadge() {
    const badge = $('#studioInquiriesBadge');
    const S = window.RenvoaStudios;
    if (!badge || !S) return;
    const count = S.getInquiries().filter((i) => i.status === 'new').length;
    badge.textContent = count || '';
    badge.hidden = !count;
  }

  function clinicNavActiveId() {
    if (activeView === 'finance') return 'finance';
    return CLINIC_SETTINGS_TABS.includes(studioSubView) ? 'settings' : studioSubView;
  }

  function updateBusinessModeUI() {
    const switchEl = $('#businessModeSwitch');
    if (switchEl) switchEl.dataset.mode = businessMode;
    $$('[data-nav-mode]').forEach((group) => {
      group.hidden = group.dataset.navMode !== businessMode;
    });
    $$('[data-business-mode]').forEach((btn) => {
      const active = btn.dataset.businessMode === businessMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const badge = $('#businessModeBadge');
    if (badge) badge.textContent = businessMode === 'clinic' ? 'Clinic' : 'Peptide';
    updateNavActiveState();
  }

  function updateNavActiveState() {
    if (businessMode === 'peptide') {
      $$('[data-nav-mode="peptide"] .admin-nav-item').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === activeView);
      });
      return;
    }
    const activeClinicTab = clinicNavActiveId();
    $$('[data-nav-mode="clinic"] .admin-nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.clinicTab === activeClinicTab);
    });
  }

  function setBusinessMode(mode) {
    if (mode !== 'peptide' && mode !== 'clinic') return;
    businessMode = mode;
    updateBusinessModeUI();
    renderView();
  }

  function captureInputFocus() {
    const active = document.activeElement;
    if (!active || !mainEl?.contains(active)) return null;
    const tag = active.tagName?.toLowerCase();
    if (!['input', 'textarea', 'select'].includes(tag)) return null;
    const inputs = [...mainEl.querySelectorAll('input, textarea, select')];
    return {
      id: active.id || '',
      name: active.name || '',
      type: active.type || '',
      index: inputs.indexOf(active),
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
    };
  }

  function restoreInputFocus(state) {
    if (!state || !mainEl) return;
    let el = state.id ? document.getElementById(state.id) : null;
    if (!el && state.name) {
      const named = mainEl.querySelectorAll(`[name="${state.name}"]`);
      el = named.length === 1 ? named[0] : null;
    }
    if (!el && state.index >= 0) {
      const inputs = [...mainEl.querySelectorAll('input, textarea, select')];
      el = inputs[state.index] || null;
    }
    if (!el || el.disabled) return;
    el.focus({ preventScroll: true });
    if (typeof state.selectionStart === 'number' && typeof el.setSelectionRange === 'function') {
      try {
        const end = typeof state.selectionEnd === 'number' ? state.selectionEnd : state.selectionStart;
        el.setSelectionRange(state.selectionStart, end);
      } catch (_) { /* type=number etc. */ }
    }
  }

  let renderViewDebounce = null;

  function scheduleRenderView(ms = 0) {
    if (renderViewDebounce) clearTimeout(renderViewDebounce);
    if (ms > 0) {
      renderViewDebounce = setTimeout(() => {
        renderViewDebounce = null;
        renderView();
      }, ms);
      return;
    }
    renderView();
  }

  function syncStudioClientSelection() {
    if (businessMode !== 'clinic' || studioSubView !== 'clients' || studioClientAdding) return;
    const S = window.RenvoaStudios;
    if (!S) return;
    const list = S.searchClients(studioClientSearch);
    if (!list.length) {
      selectedStudioClientId = null;
      return;
    }
    if (!selectedStudioClientId || !S.getClient(selectedStudioClientId)) {
      selectedStudioClientId = list[0].id;
    }
  }

  function selectStudioClient(clientId) {
    const S = window.RenvoaStudios;
    const id = String(clientId || '').trim();
    if (!id || !S?.getClient(id)) return false;
    selectedStudioClientId = id;
    studioClientAdding = false;
    try {
      const mergeOptions = S.getMergeCandidatesForClient(id, '') || [];
      const selectedName = (S.getClient(id)?.name || '').trim().toLowerCase();
      studioClientMergeSecondaryId = mergeOptions.find((c) =>
        (c.name || '').trim().toLowerCase() === selectedName
      )?.id || mergeOptions[0]?.id || null;
    } catch (err) {
      console.error('Studio client merge preset failed:', err);
      studioClientMergeSecondaryId = null;
    }
    return true;
  }

  function resolveStudioClientPrimaryId() {
    const S = window.RenvoaStudios;
    if (selectedStudioClientId && S?.getClient(selectedStudioClientId)) return selectedStudioClientId;
    const hidden = $('#studioClientId')?.value;
    if (hidden && S?.getClient(hidden)) return hidden;
    const detailId = document.querySelector('.studio-client-detail')?.dataset?.clientId;
    if (detailId && S?.getClient(detailId)) return detailId;
    const list = S?.searchClients(studioClientSearch) || [];
    return list[0]?.id || null;
  }

  function openClientMergeAuth(primaryId, secondaryId) {
    const S = window.RenvoaStudios;
    const primary = S?.getClient(primaryId);
    const secondary = S?.getClient(secondaryId);
    if (!primary || !secondary) {
      studioNotify('One or both client profiles could not be found.', 'error');
      return;
    }
    const preview = S.previewClientMerge(primaryId, secondaryId);
    openPosAuthModal('client_merge', {
      primaryId,
      secondaryId,
      primaryName: primary.name || 'Primary',
      secondaryName: secondary.name || 'Duplicate',
      preview,
    });
  }

  function renderView() {
    if (!mainEl) {
      showFatal('Admin UI failed to mount — #adminMain not found in the page.');
      return;
    }
    if (!A) return;
    syncStudioClientSelection();
    const focusState = captureInputFocus();
    const views = {
      overview: renderOverview,
      pos: renderPOS,
      studios: renderStudios,
      orders: renderOrders,
      pipeline: renderPipeline,
      crm: renderCRM,
      messages: renderMessages,
      finance: renderFinance,
      goals: renderGoals,
    };
    try {
    const viewKey = (businessMode === 'clinic' && activeView !== 'finance') ? 'studios' : activeView;
    mainEl.classList.toggle('admin-main-clinic', businessMode === 'clinic');
    mainEl.innerHTML = views[viewKey]?.() || '';
    bindViewEvents();
    if (businessMode === 'clinic') bindStudioEvents();
    updateNavActiveState();
    window.StudioApptTimers?.syncForCalendarView(businessMode === 'clinic' && studioSubView === 'calendar');
    restoreInputFocus(focusState);
    if (businessMode === 'clinic' && studioFinanceOpen) {
      requestAnimationFrame(() => initStudioFinanceEmbed());
    }
    } catch (err) {
      console.error('RENVOA admin view error:', err);
      mainEl.innerHTML = `<div class="admin-panel"><h2>Could not load this section</h2><p>${esc(err.message)}</p><button type="button" class="btn-primary btn-sm" id="adminRetryBtn">Retry</button></div>`;
      $('#adminRetryBtn')?.addEventListener('click', renderView);
    }
  }

  function kpiCard(label, value, sub, accent) {
    return `<div class="admin-kpi${accent ? ' admin-kpi-accent' : ''}">
      <p class="admin-kpi-label">${label}</p>
      <p class="admin-kpi-value">${value}</p>
      ${sub ? `<p class="admin-kpi-sub">${sub}</p>` : ''}
    </div>`;
  }

  function progressBar(label, current, target, format = (n) => n) {
    const p = pct(current, target);
    return `<div class="admin-progress">
      <div class="admin-progress-head">
        <span>${label}</span>
        <span>${format(current)} / ${format(target)}</span>
      </div>
      <div class="admin-progress-track"><div class="admin-progress-fill" style="width:${p}%"></div></div>
      <p class="admin-progress-pct">${p}% of goal</p>
    </div>`;
  }

  function renderOverview() {
    const finance = A.getFinanceSummary();
    const goals = A.getGoals();
    const pipeline = A.getPipelineCounts();
    const newCount = pipeline.new || 0;
    const inFlight = (pipeline.processing || 0) + (pipeline.packed || 0) + (pipeline.shipped || 0);
    const recent = A.getOrders().slice(0, 5);

    return `
      <div class="admin-page-head">
        <h1>Overview</h1>
        <p>Live snapshot of orders, revenue, and goal progress this month.</p>
      </div>
      <div class="admin-kpi-grid">
        ${kpiCard('New orders', newCount, 'Awaiting fulfillment', true)}
        ${kpiCard('Pending quotes', A.getOrders().filter((o) => o.pricingStatus === 'pending').length, 'Confirm in POS', true)}
        ${kpiCard('In pipeline', inFlight, 'Processing → shipped')}
        ${kpiCard('Revenue (MTD)', A.formatMoney(finance.grossRevenue), `${finance.monthOrders} orders`)}
        ${kpiCard('Est. EBITDA', A.formatMoney(finance.ebitda), 'After marketing & overhead')}
      </div>
      <div class="admin-split">
        <section class="admin-panel">
          <h2>Goal progress</h2>
          ${progressBar('Monthly revenue', finance.grossRevenue, goals.monthlyRevenue, A.formatMoney)}
          ${progressBar('Monthly orders', finance.monthOrders, goals.monthlyOrders, (n) => n)}
          ${progressBar('Monthly profit target', Math.max(0, finance.ebitda), goals.monthlyProfit, A.formatMoney)}
        </section>
        <section class="admin-panel">
          <h2>Pipeline</h2>
          <div class="admin-pipeline-mini">
            ${A.ORDER_STATUSES.filter((s) => s.id !== 'cancelled').map((s) => `
              <div class="admin-pipeline-mini-item">
                <span class="admin-status-dot" style="background:${s.color}"></span>
                <span>${s.label}</span>
                <strong>${pipeline[s.id] || 0}</strong>
              </div>`).join('')}
          </div>
        </section>
      </div>
      <section class="admin-panel">
        <div class="admin-panel-head">
          <h2>Recent orders</h2>
          <button type="button" class="link-cta admin-link-btn" data-goto="orders">View all</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              ${recent.map((o) => `
                <tr class="admin-row-click" data-order="${o.id}">
                  <td><strong>${o.id}</strong></td>
                  <td>${o.customer?.name || '—'}</td>
                  <td>${formatOrderTotal(o)}</td>
                  <td><span class="admin-status-pill" style="--pill-color:${statusMeta(o.status).color}">${statusMeta(o.status).label}</span></td>
                  <td>${A.formatDate(o.date)}</td>
                </tr>`).join('') || '<tr><td colspan="5" class="admin-empty-cell">No orders yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function orderDetailPanel(order) {
    if (!order) return '<p class="admin-empty">Select an order to view details.</p>';

    const timeline = (order.statusHistory || []).slice().reverse().map((h) => `
      <li>
        <span class="admin-timeline-dot" style="background:${statusMeta(h.status).color}"></span>
        <div>
          <strong>${statusMeta(h.status).label}</strong>
          <span>${A.formatDate(h.at)}</span>
          ${h.note ? `<p>${h.note}</p>` : ''}
        </div>
      </li>`).join('');

    const pricing = getOrderPricing(order);
    const isPending = order.pricingStatus === 'pending';
    const pricingColor = isPending ? '#ff9f0a' : '#30d158';

    const items = (pricing?.lines || (order.items || []).map((item) => ({
      label: itemLabel(item),
      qty: item.qty,
      lineTotal: C.getItemPrice(item) * item.qty,
    }))).map((line) => `
      <div class="admin-line-item">
        <span>${line.label || line.productName} × ${line.qty}</span>
        <span>${A.formatMoney(line.lineTotal)}${isPending ? ' <em class="admin-fine">(preview)</em>' : ''}</span>
      </div>`).join('');

    const subtotal = pricing?.subtotal ?? order.subtotal;
    const shipping = pricing?.shipping ?? order.shipping;
    const total = pricing?.total ?? order.total;
    const cogs = pricing?.cogs ?? (order.cogs != null ? order.cogs : A.orderCogs(order));
    const margin = pricing?.margin ?? (order.margin != null ? order.margin : (total || 0) - cogs);

    return `
      <div class="admin-detail">
        <div class="admin-detail-head">
          <div>
            <h2>${order.id}</h2>
            <p>${A.formatDate(order.date)} · ${order.customer?.email}</p>
          </div>
          <div class="admin-detail-badges">
            <span class="admin-status-pill" style="--pill-color:${pricingColor}">${pricingStatusLabel(order)}</span>
            <span class="admin-status-pill" style="--pill-color:${statusMeta(order.status).color}">${statusMeta(order.status).label}</span>
          </div>
        </div>

        ${isPending ? `<div class="admin-pos-banner">
          <p>Client submitted a quote request — line pricing is hidden on the public site.</p>
          <button type="button" class="btn-primary btn-sm" data-goto="pos" data-pos-order="${order.id}">Confirm pricing in POS</button>
        </div>` : ''}

        <div class="admin-detail-grid">
          <div>
            <h3>Customer</h3>
            <p><strong>${order.customer?.name}</strong></p>
            <p>${order.customer?.email}</p>
            ${order.customer?.phone ? `<p>${order.customer.phone}</p>` : ''}
          </div>
          <div>
            <h3>Ship to</h3>
            <p>${order.shipping?.line1}</p>
            ${order.shipping?.line2 ? `<p>${order.shipping.line2}</p>` : ''}
            <p>${order.shipping?.city}, ${order.shipping?.state} ${order.shipping?.zip}</p>
          </div>
        </div>

        <h3>Items ${isPending ? '<span class="admin-fine">(POS preview)</span>' : ''}</h3>
        ${items || '<p class="admin-empty">No line items.</p>'}
        <div class="admin-line-item"><span>Subtotal</span><span>${subtotal != null ? A.formatMoney(subtotal) : '—'}</span></div>
        <div class="admin-line-item"><span>Shipping</span><span>${shipping != null ? (shipping === 0 ? 'Free' : A.formatMoney(shipping)) : '—'}</span></div>
        <div class="admin-line-item admin-line-total"><span>Total</span><span>${formatOrderTotal(order)}</span></div>
        <p class="admin-detail-meta">COGS ${A.formatMoney(cogs)} · Margin ${A.formatMoney(margin)}${order.pricedAt ? ` · Confirmed ${A.formatDate(order.pricedAt)}` : ''}</p>

        <h3>Update status</h3>
        <div class="admin-status-form">
          <select id="orderStatusSelect">
            ${A.ORDER_STATUSES.map((s) => `<option value="${s.id}"${s.id === order.status ? ' selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <input type="text" id="statusNoteInput" placeholder="Note (optional)">
          <button type="button" class="btn-primary btn-sm" id="updateStatusBtn">Update</button>
        </div>

        <label class="form-field"><span>Tracking number</span>
          <input type="text" id="trackingInput" value="${order.tracking || ''}" placeholder="Carrier tracking #">
        </label>
        <button type="button" class="btn-secondary btn-sm" id="saveTrackingBtn">Save tracking</button>

        <label class="form-field"><span>Internal notes</span>
          <textarea id="internalNotesInput" rows="3" placeholder="Fulfillment notes, COA batch, etc.">${order.internalNotes || ''}</textarea>
        </label>
        <button type="button" class="btn-secondary btn-sm" id="saveNotesBtn">Save notes</button>

        <h3>Timeline</h3>
        <ul class="admin-timeline">${timeline}</ul>

        <button type="button" class="btn-primary btn-sm" id="emailCustomerBtn">Email customer</button>
      </div>`;
  }

  function renderOrders() {
    const orders = A.getOrders();
    const selected = orders.find((o) => o.id === selectedOrderId) || orders[0];
    if (!selectedOrderId && selected) selectedOrderId = selected.id;

    const statusFilter = $('#orderStatusFilter')?.value;

    return `
      <div class="admin-page-head">
        <h1>Orders</h1>
        <p>Review new orders, update fulfillment status, and track shipments.</p>
      </div>
      <div class="admin-orders-layout">
        <section class="admin-panel admin-panel-list">
          <div class="admin-panel-head">
            <h2>All orders (${orders.length})</h2>
            <select id="orderStatusFilter" class="admin-select">
              <option value="">All statuses</option>
              ${A.ORDER_STATUSES.map((s) => `<option value="${s.id}">${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="admin-order-list" id="orderList">
            ${orders.filter((o) => !statusFilter || o.status === statusFilter).map((o) => `
              <button type="button" class="admin-order-card${o.id === selectedOrderId ? ' active' : ''}" data-order="${o.id}">
                <div class="admin-order-card-top">
                  <strong>${o.id}</strong>
                  <span class="admin-status-pill" style="--pill-color:${statusMeta(o.status).color}">${statusMeta(o.status).label}</span>
                </div>
                <p>${o.customer?.name}</p>
                <div class="admin-order-card-bottom">
                  <span>${formatOrderTotal(o)}</span>
                  <span>${A.formatDate(o.date)}</span>
                </div>
              </button>`).join('') || '<p class="admin-empty">No orders match this filter.</p>'}
          </div>
        </section>
        <section class="admin-panel admin-panel-detail" id="orderDetail">
          ${orderDetailPanel(selected)}
        </section>
      </div>`;
  }

  function renderPipeline() {
    const orders = A.getOrders().filter((o) => o.status !== 'cancelled' && o.status !== 'delivered');
    const columns = A.ORDER_STATUSES.filter((s) => !['cancelled', 'delivered'].includes(s.id));

    return `
      <div class="admin-page-head">
        <h1>Pipeline</h1>
        <p>Drag-free kanban view of orders moving through fulfillment.</p>
      </div>
      <div class="admin-kanban">
        ${columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);
          return `<div class="admin-kanban-col">
            <div class="admin-kanban-head" style="--pill-color:${col.color}">
              <span>${col.label}</span>
              <strong>${colOrders.length}</strong>
            </div>
            <div class="admin-kanban-cards">
              ${colOrders.map((o) => `
                <button type="button" class="admin-kanban-card" data-order="${o.id}">
                  <strong>${o.id}</strong>
                  <span>${o.customer?.name}</span>
                  <span>${formatOrderTotal(o)}</span>
                </button>`).join('') || '<p class="admin-kanban-empty">—</p>'}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderPOS() {
    const POS = window.RenvoaPOS;
    if (!POS) {
      return `<div class="admin-panel"><h2>POS unavailable</h2><p>pos-data.js did not load. Refresh the page.</p></div>`;
    }

    const pending = A.getOrders().filter((o) => o.pricingStatus === 'pending');
    const catalog = POS.getCatalog().filter((p) => p.id !== 'bac-water');

    if (posSubView === 'catalog') {
      const rows = catalog.map((p) => {
        const variantRows = Object.entries(p.variants).map(([key, v]) => `
          <tr data-product="${p.id}" data-variant="${key}">
            <td>${esc(p.name)}</td>
            <td>${esc(v.label)}</td>
            <td><input type="number" class="pos-price-input" data-field="price" value="${v.price}" min="0" step="0.01"></td>
            <td><input type="number" class="pos-price-input" data-field="cogs" value="${v.cogs}" min="0" step="0.01"></td>
            <td>${A.formatMoney(RenvoaStorefront.getStartingPrice(PRODUCTS[p.id]))}</td>
            <td><button type="button" class="btn-secondary btn-sm pos-save-variant" data-product="${p.id}" data-variant="${key}">Save</button></td>
          </tr>`).join('');
        return variantRows;
      }).join('');

      return `
        <div class="admin-page-head">
          <h1>POS — Price catalog</h1>
          <p>Internal variant pricing and COGS. Public storefront shows starting-at only.</p>
        </div>
        <div class="crm-subnav">
          <button type="button" class="crm-subnav-btn" data-pos-tab="quotes">Quote queue <span class="admin-nav-badge admin-nav-badge-warn">${pending.length || ''}</span></button>
          <button type="button" class="crm-subnav-btn active" data-pos-tab="catalog">Price catalog</button>
        </div>
        <section class="admin-panel">
          <p class="admin-fine">Storefront starting-at prices are derived from the lowest variant price and are not edited here.</p>
          <div class="admin-table-wrap">
            <table class="admin-table admin-table-sm pos-catalog-table">
              <thead><tr><th>Product</th><th>Variant</th><th>Price ($)</th><th>COGS ($)</th><th>Public starting at</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>`;
    }

    const selected = pending.find((o) => o.id === selectedPOSOrderId) || pending[0];
    if (!selectedPOSOrderId && selected) selectedPOSOrderId = selected.id;

    const pricing = selected ? getOrderPricing(selected) : null;

    const quoteList = pending.map((o) => `
      <button type="button" class="admin-order-card${o.id === selectedPOSOrderId ? ' active' : ''}" data-pos-order="${o.id}">
        <div class="admin-order-card-top">
          <strong>${o.id}</strong>
          <span class="admin-status-pill" style="--pill-color:#ff9f0a">Quote</span>
        </div>
        <p>${o.customer?.name}</p>
        <div class="admin-order-card-bottom">
          <span>${(o.items || []).length} item${(o.items || []).length !== 1 ? 's' : ''}</span>
          <span>${A.formatDate(o.date)}</span>
        </div>
      </button>`).join('');

    const quoteDetail = selected ? `
      <div class="pos-quote-detail">
        <div class="admin-detail-head">
          <div>
            <h2>${selected.id}</h2>
            <p>${selected.customer?.name} · ${selected.customer?.email}</p>
          </div>
        </div>
        <div class="admin-detail-grid">
          <div>
            <h3>Ship to</h3>
            <p>${selected.shipping?.line1}</p>
            <p>${selected.shipping?.city}, ${selected.shipping?.state} ${selected.shipping?.zip}</p>
          </div>
          <div>
            <h3>Contact</h3>
            <p>${selected.customer?.phone || '—'}</p>
            <p class="admin-fine">Submitted ${A.formatDate(selected.date)}</p>
          </div>
        </div>
        <h3>Line items</h3>
        ${(pricing?.lines || []).map((line) => `
          <div class="admin-line-item">
            <span>${esc(line.label)} × ${line.qty}</span>
            <span>${A.formatMoney(line.unitPrice)} × ${line.qty} = ${A.formatMoney(line.lineTotal)}</span>
          </div>`).join('') || '<p class="admin-empty">No items.</p>'}
        <div class="admin-line-item"><span>Subtotal</span><span>${A.formatMoney(pricing?.subtotal || 0)}</span></div>
        <div class="admin-line-item"><span>Shipping</span><span>${pricing?.shipping === 0 ? 'Free' : A.formatMoney(pricing?.shipping || 0)}</span></div>
        <div class="admin-line-item admin-line-total"><span>Total</span><span>${A.formatMoney(pricing?.total || 0)}</span></div>
        <p class="admin-detail-meta">COGS ${A.formatMoney(pricing?.cogs || 0)} · Margin ${A.formatMoney(pricing?.margin || 0)}</p>
        <div class="pos-quote-actions">
          <button type="button" class="btn-primary" id="confirmPosPricingBtn" data-order="${selected.id}">Confirm pricing &amp; start processing</button>
          <button type="button" class="btn-secondary btn-sm" data-goto="orders" data-order="${selected.id}">View in Orders</button>
          <a href="mailto:${esc(selected.customer?.email)}?subject=${encodeURIComponent('ONYX Peptides — Quote for ' + selected.id)}" class="btn-secondary btn-sm">Email quote</a>
        </div>
        <p class="admin-fine pos-quote-hint">Confirming locks in totals and moves the order to Processing. The customer never sees these amounts on the public site.</p>
      </div>` : '<p class="admin-empty">Select a quote request to price and confirm.</p>';

    return `
      <div class="admin-page-head">
        <h1>POS — Quote queue</h1>
        <p>Price order requests submitted from the public storefront. Clients only see “starting at” and pending quotes.</p>
      </div>
      <div class="crm-subnav">
        <button type="button" class="crm-subnav-btn active" data-pos-tab="quotes">Quote queue <span class="admin-nav-badge admin-nav-badge-warn">${pending.length || ''}</span></button>
        <button type="button" class="crm-subnav-btn" data-pos-tab="catalog">Price catalog</button>
      </div>
      <div class="admin-orders-layout">
        <section class="admin-panel admin-panel-list">
          <h2>Pending quotes (${pending.length})</h2>
          <div class="admin-order-list">
            ${quoteList || '<p class="admin-empty">No pending quotes — new order requests will appear here.</p>'}
          </div>
        </section>
        <section class="admin-panel admin-panel-detail">
          ${quoteDetail}
        </section>
      </div>`;
  }

  function getStudioCtx() {
    const S = window.RenvoaStudios;
    return {
      studioSubView,
      studioGender,
      studioCategory,
      studioCalendarDate: studioCalendarDate || S?.todayISO(),
      studioCalendarView,
      studioPosCart,
      studioPosMode,
      studioShelfCategory,
      studioPosApplyCredit,
      studioPosAuthOpen,
      studioPosAuthAction,
      studioPosAuthPending,
      studioPresentOpen,
      studioFinanceOpen,
      studioFinanceContext,
      selectedStudioInquiryId,
      selectedStudioClientId,
      selectedStudioAppointmentId,
      selectedStudioStaffId,
      selectedStudioTransactionId,
      studioPrefill,
      studioPosSearch,
      studioClientSearch,
      studioClientAdding,
      studioFlash,
      studioFlashType,
      studioApptServiceId,
      studioApptDraftDate,
      studioApptDraftCol,
      studioApptDraftTime,
      studioOpenProgramBase,
      studioProgramModalMode,
      studioBookGender,
      studioBookCategory,
      studioCalChairFilter,
      studioApptReschedule,
      studioCalMoveMode,
      studioRescheduleDraft,
      studioProgramStep,
      studioExtOptions,
      studioBookWizardOpen,
      studioBookWizardStep,
      studioBookClientName,
      studioBookClientPhone,
      studioBookNotes,
      studioBookHairLikes,
      studioBookHairDislikes,
      studioBookPriorServices,
      studioBookBeverage,
      studioBookInspoPhotos,
      studioBookVisitType,
      studioBookClientId,
      studioApptModalOpen,
      studioIntakeWizardOpen,
      studioIntakeApptId,
      studioIntakeStep,
      studioIntakeSigned,
      studioIntakeData,
      studioIntakeSkippedForms,
      studioAllergyModalOpen,
      studioAllergyApptId,
      studioProviderWizardOpen,
      studioProviderApptId,
      studioProviderStep,
      studioProviderDraft,
      studioRebookOpen,
      studioRebookApptId,
      studioRebookSource,
      studioRebookDraft,
      studioClientTab,
      studioClientMergeSecondaryId,
      studioClientMergeSearch,
      studioPhotoPromptOpen,
      studioPhotoPromptKind,
      studioPhotoPromptApptId,
      studioPhotoPromptPending,
      studioPostVisitApptId,
      studioPostVisitSource,
      studioPostVisitAwaitingCheckout,
      studioPostVisitPendingRebookApptId,
      businessMode,
      clinicSideNav: businessMode === 'clinic',
    };
  }

  function closePhotoPrompt() {
    closeCameraCaptureModal();
    studioPhotoPromptOpen = false;
    studioPhotoPromptKind = null;
    studioPhotoPromptApptId = null;
    studioPhotoPromptPending = null;
  }

  function closeCameraCaptureModal() {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      activeCameraStream = null;
    }
    document.getElementById('studioCameraCaptureModal')?.remove();
  }

  async function acquireCameraStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API unavailable');
    }
    const attempts = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    ];
    let lastErr;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Could not access camera');
  }

  function captureVideoFrameBlob(video) {
    return new Promise((resolve) => {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      if (!w || !h) {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.88);
    });
  }

  async function openClientPhotoCamera(ctx) {
    pendingPhotoUploadCtx = ctx;
    if (!ctx?.clientId) {
      studioNotify('Link a client profile before taking photos.', 'error');
      return;
    }

    closeCameraCaptureModal();

    if (!navigator.mediaDevices?.getUserMedia) {
      triggerPhotoFileInput(ctx, 'camera');
      return;
    }

    let stream;
    try {
      stream = await acquireCameraStream();
    } catch {
      studioNotify('Could not access the camera — trying photo picker instead.', 'warn');
      triggerPhotoFileInput(ctx, 'camera');
      return;
    }

    activeCameraStream = stream;

    const overlay = document.createElement('div');
    overlay.id = 'studioCameraCaptureModal';
    overlay.className = 'studio-camera-capture-modal';
    overlay.innerHTML = `
      <div class="studio-camera-capture-panel" role="dialog" aria-modal="true" aria-label="Camera capture">
        <p class="studio-camera-capture-eyebrow">Live camera</p>
        <video class="studio-camera-capture-video" autoplay playsinline muted></video>
        <p class="studio-camera-capture-hint">Position the client in frame, then tap Capture.</p>
        <div class="studio-camera-capture-actions">
          <button type="button" class="studio-glass-btn studio-glass-btn-secondary" data-camera-cancel>Cancel</button>
          <button type="button" class="studio-glass-btn studio-glass-btn-primary" data-camera-shutter>Capture photo</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const video = overlay.querySelector('video');
    video.srcObject = stream;
    await video.play().catch(() => {});

    overlay.querySelector('[data-camera-cancel]')?.addEventListener('click', () => {
      closeCameraCaptureModal();
      pendingPhotoUploadCtx = null;
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeCameraCaptureModal();
        pendingPhotoUploadCtx = null;
      }
    });

    overlay.querySelector('[data-camera-shutter]')?.addEventListener('click', async () => {
      const shutter = overlay.querySelector('[data-camera-shutter]');
      if (shutter) {
        shutter.disabled = true;
        shutter.textContent = 'Saving…';
      }
      const blob = await captureVideoFrameBlob(video);
      const saveCtx = pendingPhotoUploadCtx;
      closeCameraCaptureModal();
      pendingPhotoUploadCtx = null;
      if (!blob || !saveCtx) {
        studioNotify('Could not capture photo — try again.', 'error');
        return;
      }
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await saveClientPhotoFiles([file], saveCtx);
    });
  }

  function triggerPhotoFileInput(ctx, mode = 'upload') {
    pendingPhotoUploadCtx = ctx;
    const usePrompt = !!(ctx?.appointmentId || studioPhotoPromptOpen);
    const inputId = mode === 'camera'
      ? (usePrompt ? 'photoPromptCameraInput' : 'clientPhotoCameraInput')
      : (usePrompt ? 'photoPromptUploadInput' : 'clientPhotoUploadInput');
    const input = document.getElementById(inputId);
    if (!input) {
      studioNotify('Photo input unavailable — refresh and try again.', 'error');
      pendingPhotoUploadCtx = null;
      return;
    }
    input.value = '';
    input.click();
  }

  function openPhotoPrompt(apptId, kind, pending) {
    studioPhotoPromptOpen = true;
    studioPhotoPromptKind = kind;
    studioPhotoPromptApptId = apptId;
    studioPhotoPromptPending = pending || null;
  }

  function sendApptToRegisterForVisitClose(apptId, source) {
    const S = window.RenvoaStudios;
    const appt = S?.getAppointment(apptId);
    if (!appt) return;
    const firstVisit = S.isFirstTimeClient(appt.clientId, appt.clientPhone);
    studioPostVisitApptId = apptId;
    studioPostVisitSource = source || 'complete';
    studioPostVisitAwaitingCheckout = true;
    studioPostVisitPendingRebookApptId = null;
    const posItems = S.getPostVisitCheckoutCartItems(appt);
    studioPosCart = {
      clientName: appt.clientName,
      clientId: appt.clientId || '',
      items: posItems.length ? posItems : [],
      discount: 0,
    };
    studioPosMode = 'client';
    closeApptModal();
    closeRebookModal();
    studioSubView = 'pos';
    if (firstVisit) {
      studioNotify('First visit — present package options at the register, then schedule their next visit.', 'info');
    } else {
      studioNotify('Ring up this visit at the register first. Schedule follow-up after checkout.', 'success');
    }
  }

  function proceedAfterVisitPhotos(apptId, source) {
    sendApptToRegisterForVisitClose(apptId, source);
  }

  function finishPostVisitCheckout() {
    const S = window.RenvoaStudios;
    const apptId = studioPostVisitApptId;
    const source = studioPostVisitSource;
    if (!apptId || !S) return;
    const appt = S.getAppointment(apptId);
    if (appt && source === 'complete' && appt.status !== 'completed') {
      S.updateAppointment(apptId, { status: 'completed' });
      window.StudioApptTimers?.tick();
    }
    studioPostVisitApptId = null;
    studioPostVisitSource = null;
    studioPostVisitAwaitingCheckout = false;
    studioPostVisitPendingRebookApptId = null;
  }

  function getPostVisitPackageExcludeIds() {
    const ids = [];
    if (studioPostVisitPendingRebookApptId) ids.push(studioPostVisitPendingRebookApptId);
    return ids;
  }

  function returnToPostVisitPos(message) {
    const S = window.RenvoaStudios;
    const apptId = studioPostVisitApptId;
    if (!apptId || !S) return;
    const appt = S.getAppointment(apptId);
    if (!appt) return;
    closeRebookModal();
    const hasPkgInCart = studioPosCart.items.some((i) => i.packageVisit);
    if (!hasPkgInCart) {
      const posItems = S.getPostVisitCheckoutCartItems(appt);
      studioPosCart = {
        clientName: appt.clientName,
        clientId: appt.clientId || '',
        items: posItems.length ? posItems : studioPosCart.items,
        discount: studioPosCart.discount || 0,
      };
    } else {
      studioPosCart.clientName = appt.clientName;
      studioPosCart.clientId = appt.clientId || studioPosCart.clientId;
    }
    studioPosMode = 'client';
    studioSubView = 'pos';
    studioPostVisitAwaitingCheckout = true;
    if (message) studioNotify(message, 'success');
  }

  function openFollowUpScheduler(apptId, options = {}) {
    const S = window.RenvoaStudios;
    const RB = window.StudioRebook;
    const appt = S?.getAppointment(apptId);
    if (!appt || !RB?.buildRecommendation) return false;
    const rec = RB.buildRecommendation(appt);
    if (!rec) return false;
    studioRebookOpen = true;
    studioRebookApptId = apptId;
    studioRebookSource = options.source || studioPostVisitSource || 'complete';
    studioRebookDraft = options.sameDay && RB.buildSameDayDraft
      ? RB.buildSameDayDraft(appt, rec)
      : { ...rec };
    if (!studioPostVisitAwaitingCheckout) {
      studioSubView = 'calendar';
    }
    return true;
  }

  function applyPackageVisitToPosCart() {
    const S = window.RenvoaStudios;
    const apptId = studioPostVisitApptId;
    const appt = S?.getAppointment(apptId);
    if (!appt?.clientId) {
      studioNotify('Link a client before applying a package visit.', 'error');
      return;
    }
    const fresh = S.refreshPackageVisitFields(appt.clientId, {
      serviceId: appt.serviceId,
      extOptions: appt.extOptions,
      programName: appt.programName,
      programId: appt.programId,
      excludeAppointmentIds: getPostVisitPackageExcludeIds(),
    });
    if (!fresh) {
      studioNotify('No prepaid visits on file — enroll a package at the register first.', 'error');
      return;
    }
    const postVisitLines = studioPosCart.items.filter(
      (i) => i.postVisitApptId === apptId && !i.packageVisit,
    );
    let items;
    if (postVisitLines.length) {
      let applied = false;
      items = studioPosCart.items.map((item) => {
        if (item.postVisitApptId !== apptId || item.packageVisit) return item;
        if (!applied) {
          applied = true;
          return S.applyPackageVisitToCartItem(item, fresh, apptId);
        }
        return { ...item, price: 0, coveredByPackageVisit: true };
      });
    } else {
      const posItem = S.packageVisitPosItemFromFields(
        { ...fresh, serviceId: appt.serviceId },
        S.formatPackageVisitServiceName(fresh.programName, fresh.visitNumber, fresh.visitsIncluded),
      );
      if (!posItem) return;
      posItem.postVisitApptId = apptId;
      items = [...studioPosCart.items.filter((i) => !i.packageVisit), posItem];
    }
    studioPosCart = {
      clientName: appt.clientName,
      clientId: appt.clientId,
      items,
      discount: studioPosCart.discount || 0,
    };
    const retail = postVisitLines[0]?.originalRetailPrice ?? postVisitLines[0]?.price ?? fresh.visitValue;
    studioNotify(
      `Visit ${fresh.visitNumber} of ${fresh.visitsIncluded} applied — ${fresh.programName}${retail ? ` (${S.formatPrice(retail)} covered)` : ''}`,
      'success',
    );
  }

  function refreshRebookPackageVisitDraft(appt) {
    const S = window.RenvoaStudios;
    if (!appt?.clientId || !studioRebookDraft?.packageVisit) return;
    const pendingCartPkg = studioPosCart?.items?.find(
      (i) => i.packageVisit && (i.postVisitApptId === studioPostVisitApptId || i.postVisitApptId === appt.id),
    );
    const reserveCurrentVisit = studioPostVisitAwaitingCheckout
      && studioPostVisitApptId
      && !pendingCartPkg
      && !S.getAppointment(studioPostVisitApptId)?.packageVisit;
    const extraScheduled = (pendingCartPkg || reserveCurrentVisit) ? 1 : 0;
    const fresh = S.refreshPackageVisitFields(appt.clientId, {
      programId: studioRebookDraft.programId,
      programName: studioRebookDraft.programName,
      serviceId: studioRebookDraft.serviceId,
      extOptions: appt.extOptions,
      excludeAppointmentIds: [
        studioPostVisitPendingRebookApptId,
        appt.packageVisit ? appt.id : '',
      ].filter(Boolean),
      extraScheduled,
    });
    if (!fresh) return;
    studioRebookDraft = {
      ...studioRebookDraft,
      ...fresh,
      packageVisit: true,
      servicePrice: 0,
      serviceName: S.formatFollowUpVisitName(fresh.programName, fresh.visitNumber, fresh.visitsIncluded),
    };
  }

  function confirmPhotoPrompt(skip) {
    const S = window.RenvoaStudios;
    const apptId = studioPhotoPromptApptId;
    const kind = studioPhotoPromptKind;
    const pending = studioPhotoPromptPending;
    const appt = apptId ? S?.getAppointment(apptId) : null;
    const savedCount = appt?.clientId
      ? S.getClientPhotosForAppointment(appt.clientId, apptId, kind).length
      : 0;
    if (!skip && apptId && S) S.markVisitPhotos(apptId, kind);
    closePhotoPrompt();
    if (pending?.type === 'rebook' || pending?.type === 'post_visit') {
      proceedAfterVisitPhotos(pending.apptId, pending.source);
      return;
    }
    if (pending?.type === 'provider_done') {
      const label = kind === 'before' ? 'Before photos' : 'After photos';
      if (skip) {
        studioNotify('Provider session started.', 'success');
      } else if (savedCount) {
        studioNotify(`${label} saved (${savedCount}) — provider session started.`, 'success');
      } else {
        studioNotify(`${label} noted — provider session started.`, 'success');
      }
    }
  }

  function closeRebookModal() {
    studioRebookOpen = false;
    studioRebookApptId = null;
    studioRebookSource = null;
    studioRebookDraft = null;
  }

  function openRebookModal(apptId, source) {
    const S = window.RenvoaStudios;
    const RB = window.StudioRebook;
    const appt = S?.getAppointment(apptId);
    if (!appt || !RB) return false;
    const rec = RB.buildRecommendation(appt);
    if (!rec) return false;
    studioRebookOpen = true;
    studioRebookApptId = apptId;
    studioRebookSource = source;
    studioRebookDraft = { ...rec };
    return true;
  }

  function syncRebookDraftFromDOM() {
    const S = window.RenvoaStudios;
    const RB = window.StudioRebook;
    const appt = S?.getAppointment(studioRebookApptId);
    if (!studioRebookDraft || !appt) return;
    const serviceId = studioRebookDraft.serviceId;
    const svc = S.getService(serviceId);
    const duration = S.getAppointmentDurationMin(svc);
    const schedulingDuration = S.getSchedulingDurationMin(svc);
    const date = $('#rebookDate')?.value || studioRebookDraft.date;
    const column = Number($('#rebookColumn')?.value) || studioRebookDraft.column;
    const time = $('#rebookTime')?.value || studioRebookDraft.time;
    const settings = S.getCalendarSettings();
    const prepaid = studioRebookDraft.packageVisit;
    studioRebookDraft = {
      ...studioRebookDraft,
      serviceId,
      serviceName: prepaid
        ? studioRebookDraft.serviceName
        : S.shortName(svc?.name || studioRebookDraft.serviceName),
      servicePrice: prepaid ? 0 : (svc?.price || 0),
      duration,
      schedulingDuration,
      date,
      time,
      column,
      chairLabel: settings.columnLabels?.[column - 1] || `Chair ${column}`,
    };
    const slot = RB.pickOptimalSlot(date, schedulingDuration, { ...appt, startTime: time, column });
    if (!S.getAvailableSlots(date, column, schedulingDuration).includes(time) && slot) {
      studioRebookDraft.time = slot.time;
      studioRebookDraft.column = slot.column;
      studioRebookDraft.chairLabel = settings.columnLabels?.[slot.column - 1] || `Chair ${slot.column}`;
    }
  }

  function finishRebookPendingAction() {
    const S = window.RenvoaStudios;
    const apptId = studioRebookApptId;
    const source = studioRebookSource;
    if (studioPostVisitAwaitingCheckout && studioPostVisitApptId) {
      returnToPostVisitPos('Return to register — apply prepaid visit and complete sale.');
      return;
    }
    closeRebookModal();
    if (!apptId || !S) return;
    const appt = S.getAppointment(apptId);
    if (source === 'complete') {
      if (appt && appt.status !== 'completed') {
        S.updateAppointment(apptId, { status: 'completed' });
        studioNotify('Visit completed.', 'success');
        window.StudioApptTimers?.tick();
      }
      closeApptModal();
    } else if (source === 'pos' && appt) {
      const posItems = S.getAppointmentPosCartItems(appt);
      studioPosCart = {
        clientName: appt.clientName,
        clientId: appt.clientId,
        items: posItems.length ? posItems : [],
        discount: 0,
      };
      closeApptModal();
      studioSubView = 'pos';
      studioNotify('Appointment sent to POS.', 'success');
    }
  }

  function confirmRebookSchedule() {
    const S = window.RenvoaStudios;
    syncRebookDraftFromDOM();
    const appt = S?.getAppointment(studioRebookApptId);
    const draft = studioRebookDraft;
    if (!appt || !draft) return;
    const svc = S.getService(draft.serviceId);
    const createData = {
      clientId: appt.clientId,
      clientName: appt.clientName,
      clientPhone: appt.clientPhone,
      clientEmail: appt.clientEmail,
      serviceId: draft.serviceId,
      serviceName: draft.serviceName || svc?.name,
      date: draft.date,
      startTime: draft.time,
      column: draft.column,
      price: draft.packageVisit ? 0 : (svc?.price || draft.servicePrice || 0),
      notes: `Follow-up booked after visit ${appt.id}`,
      source: 'rebook',
    };
    if (draft.packageVisit && appt.clientId) {
      const pendingCartPkg = studioPosCart?.items?.find(
        (i) => i.packageVisit && i.postVisitApptId === studioPostVisitApptId,
      );
      const reserveCurrentVisit = studioPostVisitAwaitingCheckout
        && studioPostVisitApptId
        && !pendingCartPkg
        && !S.getAppointment(studioPostVisitApptId)?.packageVisit;
      const fresh = S.refreshPackageVisitFields(appt.clientId, {
        programId: draft.programId,
        programName: draft.programName,
        serviceId: draft.serviceId,
        extOptions: appt.extOptions,
        excludeAppointmentIds: [
          studioPostVisitPendingRebookApptId,
          appt.packageVisit && appt.status !== 'completed' ? appt.id : '',
        ].filter(Boolean),
        extraScheduled: (pendingCartPkg || reserveCurrentVisit) ? 1 : 0,
      });
      if (fresh) {
        Object.assign(createData, fresh, {
          serviceName: S.formatPackageVisitServiceName(fresh.programName, fresh.visitNumber, fresh.visitsIncluded),
          price: 0,
        });
      } else {
        studioNotify('No prepaid visits remaining on this program.', 'error');
        renderView();
        return;
      }
    } else {
      createData.packageVisit = false;
    }
    const result = S.createAppointment(createData);
    if (result?.error) {
      studioNotify(result.error, 'error');
      renderView();
      return;
    }
    const label = result.packageVisit
      ? `${result.programName || draft.serviceName} · Visit ${result.visitNumber}/${result.visitsIncluded}`
      : draft.serviceName;
    const bookedMsg = `Follow-up booked — ${label} on ${draft.date} at ${S.formatTime12(draft.time)}`;
    if (studioPostVisitAwaitingCheckout && studioPostVisitApptId) {
      studioPostVisitPendingRebookApptId = result.id;
      returnToPostVisitPos(`${bookedMsg} — now apply prepaid visit and complete sale.`);
      renderView();
      return;
    }
    studioNotify(bookedMsg, 'success');
    finishRebookPendingAction();
    renderView();
  }

  function promptRebookOrProceed(apptId, source) {
    const S = window.RenvoaStudios;
    const appt = S?.getAppointment(apptId);
    if (source === 'complete' && appt && !appt.afterPhotosAt) {
      openPhotoPrompt(apptId, 'after', { type: 'post_visit', apptId, source });
      return;
    }
    sendApptToRegisterForVisitClose(apptId, source);
    renderView();
  }

  function closeIntakeWizard() {
    studioIntakeWizardOpen = false;
    studioIntakeApptId = null;
    studioIntakeStep = 0;
    studioIntakeSigned = [];
    studioIntakeData = {};
    studioIntakeSkippedForms = [];
  }

  function openIntakeWizard(apptId) {
    const appt = window.RenvoaStudios?.getAppointment(apptId);
    studioIntakeWizardOpen = true;
    studioIntakeApptId = apptId;
    studioIntakeStep = 0;
    studioIntakeSigned = [...(appt?.intakeForms || [])];
    studioIntakeData = { ...(appt?.intakeData || {}) };
    studioIntakeSkippedForms = [...(appt?.intakeSkippedForms || [])];
  }

  function closeAllergyModal() {
    studioAllergyModalOpen = false;
    studioAllergyApptId = null;
  }

  function openAllergyModal(apptId) {
    const S = window.RenvoaStudios;
    const appt = S?.getAppointment(apptId);
    if (!appt) return;
    const allergies = S.getClientAllergies(appt.clientId, appt.clientPhone)
      || window.StudioVisitFlow?.getAllergiesText(appt)
      || '';
    if (!allergies) return;
    studioAllergyModalOpen = true;
    studioAllergyApptId = apptId;
  }

  function maybeShowAllergyPopup(apptId) {
    const S = window.RenvoaStudios;
    const appt = S?.getAppointment(apptId);
    if (!appt || !S.clientHasAllergies(appt.clientId, appt.clientPhone, appt)) return;
    openAllergyModal(apptId);
  }

  function getIntakeEmailContext(apptId) {
    const S = window.RenvoaStudios;
    const appt = S?.getAppointment(apptId);
    if (!appt) return null;
    const client = appt.clientId ? S.getClient(appt.clientId) : null;
    const useWizardDraft = studioIntakeApptId === apptId && studioIntakeWizardOpen;
    return {
      appt,
      client,
      email: (client?.email || appt.clientEmail || '').trim(),
      intakeData: useWizardDraft ? { ...studioIntakeData } : { ...(appt.intakeData || {}) },
      signed: useWizardDraft ? [...studioIntakeSigned] : [...(appt.intakeForms || [])],
      skipped: useWizardDraft ? [...studioIntakeSkippedForms] : [...(appt.intakeSkippedForms || [])],
    };
  }

  function emailIntakeToClient(apptId, mode = 'current') {
    const S = window.RenvoaStudios;
    const VF = window.StudioVisitFlow;
    if (!S || !VF) return false;
    const ctx = getIntakeEmailContext(apptId);
    if (!ctx) return false;
    if (!ctx.email) {
      studioNotify('No email on file — add an email to the client profile first.', 'error');
      return false;
    }
    const blank = mode === 'blank';
    const url = VF.buildIntakeMailtoUrl(ctx.appt, ctx.client, {
      blank,
      intakeData: ctx.intakeData,
      signed: ctx.signed,
      skipped: ctx.skipped,
    });
    if (!url) {
      studioNotify('Could not build email — check the client email address.', 'error');
      return false;
    }
    window.location.href = url;
    S.saveAppointmentVisit(apptId, { intakeEmailedAt: new Date().toISOString() });
    studioNotify(blank ? 'Opening email with blank intake forms…' : 'Opening email with current intake progress…', 'success');
    return true;
  }

  function copyIntakeToClipboard(apptId, mode = 'current') {
    const VF = window.StudioVisitFlow;
    const ctx = getIntakeEmailContext(apptId);
    if (!VF || !ctx) return;
    const text = VF.formatIntakePlainText(ctx.appt, ctx.client, {
      blank: mode === 'blank',
      intakeData: ctx.intakeData,
      signed: ctx.signed,
      skipped: ctx.skipped,
    });
    navigator.clipboard?.writeText(text).then(() => {
      studioNotify('Intake forms copied — paste into your email client.', 'success');
    }).catch(() => {
      studioNotify('Could not copy — use Download instead.', 'error');
    });
  }

  function downloadIntakeForms(apptId, mode = 'current') {
    const VF = window.StudioVisitFlow;
    const ctx = getIntakeEmailContext(apptId);
    if (!VF || !ctx) return;
    VF.downloadIntakeHtml(ctx.appt, ctx.client, {
      blank: mode === 'blank',
      intakeData: ctx.intakeData,
      signed: ctx.signed,
      skipped: ctx.skipped,
    });
    studioNotify('Intake forms downloaded.', 'success');
  }

  function printIntakeForms(apptId, mode = 'blank') {
    const VF = window.StudioVisitFlow;
    const ctx = getIntakeEmailContext(apptId);
    if (!VF || !ctx) return;
    const ok = VF.printIntakeForms(ctx.appt, ctx.client, {
      blank: mode === 'blank',
      intakeData: ctx.intakeData,
      signed: ctx.signed,
      skipped: ctx.skipped,
    });
    if (!ok) studioNotify('Allow pop-ups to print intake forms.', 'error');
  }

  async function saveClientPhotoFiles(files, ctx) {
    const S = window.RenvoaStudios;
    if (!S || !ctx?.clientId || !files?.length) return;
    const result = await S.addClientPhotosFromFiles(ctx.clientId, files, {
      appointmentId: ctx.appointmentId || '',
      kind: ctx.kind || 'progress',
    });
    if (result.added.length) {
      studioNotify(
        `${result.added.length} photo${result.added.length !== 1 ? 's' : ''} saved to client profile.`,
        'success'
      );
    }
    if (result.errors.length && !result.added.length) {
      studioNotify('Could not save photo — try another image format.', 'error');
    } else if (result.errors.length) {
      studioNotify(`${result.errors.length} file(s) could not be saved.`, 'error');
    }
    renderView();
  }

  function bindClientPhotoInputs() {
    const uploadInput = $('#clientPhotoUploadInput');
    const cameraInput = $('#clientPhotoCameraInput');
    const promptUpload = $('#photoPromptUploadInput');
    const promptCamera = $('#photoPromptCameraInput');

    if (uploadInput) {
      uploadInput.onchange = async () => {
        const ctx = pendingPhotoUploadCtx;
        if (!ctx) return;
        await saveClientPhotoFiles(uploadInput.files, ctx);
        uploadInput.value = '';
        pendingPhotoUploadCtx = null;
      };
    }
    if (cameraInput) {
      cameraInput.onchange = async () => {
        const ctx = pendingPhotoUploadCtx;
        if (!ctx) return;
        await saveClientPhotoFiles(cameraInput.files, ctx);
        cameraInput.value = '';
        pendingPhotoUploadCtx = null;
      };
    }
    if (promptUpload) {
      promptUpload.onchange = async () => {
        const ctx = pendingPhotoUploadCtx;
        if (!ctx) return;
        await saveClientPhotoFiles(promptUpload.files, ctx);
        promptUpload.value = '';
        pendingPhotoUploadCtx = null;
      };
    }
    if (promptCamera) {
      promptCamera.onchange = async () => {
        const ctx = pendingPhotoUploadCtx;
        if (!ctx) return;
        await saveClientPhotoFiles(promptCamera.files, ctx);
        promptCamera.value = '';
        pendingPhotoUploadCtx = null;
      };
    }
  }

  function copyIntakePortalLink(apptId) {
    const VF = window.StudioVisitFlow;
    const url = VF?.buildIntakePortalUrl?.(apptId);
    if (!url) {
      studioNotify('Could not build portal link.', 'error');
      return;
    }
    navigator.clipboard?.writeText(url).then(() => {
      studioNotify('Portal intake link copied — send to your client.', 'success');
    }).catch(() => {
      studioNotify(url, 'info');
    });
  }

  function persistIntakeDraft() {
    const S = window.RenvoaStudios;
    if (!S || !studioIntakeApptId) return;
    S.saveAppointmentVisit(studioIntakeApptId, {
      intakeForms: [...studioIntakeSigned],
      intakeData: { ...studioIntakeData },
      intakeSkippedForms: [...studioIntakeSkippedForms],
    });
  }

  function skipCurrentIntakeForm() {
    const VF = window.StudioVisitFlow;
    const forms = VF?.INTAKE_FORMS || [];
    const form = forms[studioIntakeStep];
    if (!form) return;
    if (!studioIntakeSkippedForms.includes(form.id)) {
      studioIntakeSkippedForms.push(form.id);
    }
    studioIntakeSigned = studioIntakeSigned.filter((id) => id !== form.id);
    persistIntakeDraft();
    if (studioIntakeStep < forms.length - 1) {
      studioIntakeStep += 1;
      if (form.id === VF.ALLERGY_FORM_ID) maybeShowAllergyPopup(studioIntakeApptId);
      return;
    }
    finishIntakeWizard({ fromSkip: true });
  }

  function closeProviderWizard() {
    studioProviderWizardOpen = false;
    studioProviderApptId = null;
    studioProviderStep = 'activity';
    studioProviderDraft = null;
  }

  function openProviderWizard(apptId, opts = {}) {
    const S = window.RenvoaStudios;
    const VF = window.StudioVisitFlow;
    const appt = S?.getAppointment(apptId);
    if (S?.needsIntake(appt)) {
      studioNotify('Complete or skip new client intake before starting the provider session.', 'error');
      openIntakeWizard(apptId);
      return;
    }
    maybeShowAllergyPopup(apptId);
    studioProviderWizardOpen = true;
    studioProviderApptId = apptId;
    studioProviderStep = opts.step || (appt?.providerSession?.activityId ? 'checkout' : 'activity');
    studioProviderDraft = VF?.resolveProviderDraftForAppt?.(appt)
      || { activityId: '', subs: [], details: {}, addonIds: [], lineItems: [], notes: '' };
  }

  function syncProviderDraftFromDOM() {
    const VF = window.StudioVisitFlow;
    const draft = studioProviderDraft || {};
    const activityId = draft.activityId;
    const config = VF?.getActivityConfig?.(activityId) || {};
    const details = { ...(draft.details || {}) };
    (config.detailFields || []).forEach((field) => {
      const key = VF.getFieldKey(field);
      const el = document.querySelector(`[data-provider-detail="${key}"]`);
      if (el) details[key] = el.value;
    });
    draft.details = details;
    draft.notes = $('#providerSessionNotes')?.value?.trim() || draft.notes || '';
    const primarySvc = document.querySelector('[data-provider-primary].active')?.dataset.providerPrimary;
    if (primarySvc) {
      const appt = window.RenvoaStudios?.getAppointment(studioProviderApptId);
      const suggested = VF?.getSuggestedBillableServices(appt, activityId) || [];
      const pick = suggested.find((s) => s.id === primarySvc);
      draft.lineItems = [{ serviceId: primarySvc, qty: 1, packageVisitLine: !!pick?.packageVisitLine }];
    }
    studioProviderDraft = draft;
  }

  function finishProviderWizard() {
    const S = window.RenvoaStudios;
    const VF = window.StudioVisitFlow;
    if (!S || !VF || !studioProviderApptId || !studioProviderDraft?.activityId) return;
    syncProviderDraftFromDOM();
    const appt = S.getAppointment(studioProviderApptId);
    const flow = VF.getProviderFlow(appt);
    const activity = VF.getActivity(flow, studioProviderDraft.activityId);
    const lineItems = studioProviderDraft.lineItems?.length
      ? studioProviderDraft.lineItems
      : VF.resolveDefaultLineItems(appt, studioProviderDraft.activityId);
    const session = {
      activityId: studioProviderDraft.activityId,
      activityLabel: activity?.label || studioProviderDraft.activityId,
      subs: [...(studioProviderDraft.subs || [])],
      details: { ...(studioProviderDraft.details || {}) },
      addonIds: [...(studioProviderDraft.addonIds || [])],
      lineItems: lineItems.map((li) => ({ ...li })),
      notes: studioProviderDraft.notes || '',
      startedAt: appt?.providerSession?.startedAt || new Date().toISOString(),
    };
    const checkoutTotal = VF.computeProviderCheckoutTotal(appt, session);
    const sessionNote = VF.formatProviderSession(session);
    const existingNotes = appt?.notes || '';
    const visitNote = sessionNote ? `Provider session: ${sessionNote}` : '';
    const mergedNotes = [existingNotes, visitNote].filter(Boolean).join('\n');
    const draftAppt = { ...appt, providerSession: session };
    const billablePrimary = VF.resolveApptPrimaryBillableService(draftAppt)
      || (lineItems[0]?.serviceId ? S.getService(lineItems[0].serviceId) : null);
    const apptId = studioProviderApptId;
    S.updateAppointment(apptId, {
      status: 'with_provider',
      providerSession: session,
      notes: mergedNotes,
      price: checkoutTotal > 0 ? checkoutTotal : (appt?.price || billablePrimary?.price || 0),
      serviceId: billablePrimary?.id || appt?.serviceId,
      serviceName: billablePrimary ? S.shortName(billablePrimary.name) : appt?.serviceName,
    });
    closeProviderWizard();
    const updated = S.getAppointment(apptId);
    if (!updated?.beforePhotosAt) {
      openPhotoPrompt(apptId, 'before', { type: 'provider_done' });
    } else {
      studioNotify(`With provider — ${activity?.label || 'session started'}`, 'success');
    }
  }

  function finishIntakeWizard(opts = {}) {
    const S = window.RenvoaStudios;
    const VF = window.StudioVisitFlow;
    if (!S || !studioIntakeApptId) return;
    const forms = VF?.INTAKE_FORMS || [];
    const current = forms[studioIntakeStep];
    if (!opts.fromSkip && current && !studioIntakeSkippedForms.includes(current.id)
      && !VF.intakeFormReady(current, studioIntakeSigned, studioIntakeData)) {
      studioNotify(current.required
        ? 'Complete all fields and have the client sign, or skip this form.'
        : 'Client must sign this form to continue, or skip it.', 'error');
      return;
    }
    const skipped = studioIntakeSkippedForms.length > 0;
    const apptId = studioIntakeApptId;
    S.saveAppointmentVisit(apptId, {
      intakeCompleted: true,
      intakeSkipped: skipped,
      intakeSkippedForms: [...studioIntakeSkippedForms],
      intakeForms: [...studioIntakeSigned],
      intakeData: { ...studioIntakeData },
    });
    closeIntakeWizard();
    if (skipped) {
      studioNotify('Intake flagged — skipped forms show a red triangle on the calendar.', 'warn');
    } else {
      studioNotify('Intake complete — client is ready for their visit.', 'success');
    }
    maybeShowAllergyPopup(apptId);
  }

  function handleCheckIn(apptId) {
    const S = window.RenvoaStudios;
    if (!S) return;
    S.updateAppointment(apptId, { status: 'checked_in' });
    const appt = S.getAppointment(apptId);
    if (S.needsIntake(appt)) {
      openIntakeWizard(apptId);
    }
    studioNotify('Checked in.', 'success');
    window.StudioApptTimers?.tick();
  }

  function closeApptModal() {
    studioApptModalOpen = false;
    studioApptReschedule = false;
    studioRescheduleDraft = null;
    studioCalMoveMode = false;
    selectedStudioAppointmentId = null;
  }

  function openApptModal(id) {
    closeBookWizard();
    selectedStudioAppointmentId = id;
    studioApptModalOpen = true;
    studioApptReschedule = false;
    studioRescheduleDraft = null;
    studioCalMoveMode = false;
    studioFlash = '';
    maybeShowAllergyPopup(id);
  }

  function closeBookWizard() {
    studioBookWizardOpen = false;
    studioBookWizardStep = 'when';
    studioBookVisitType = '';
    studioBookClientId = '';
    closeProgramModal();
  }

  function openBookWizard() {
    studioBookWizardOpen = true;
    studioBookWizardStep = 'when';
    selectedStudioAppointmentId = null;
    studioApptReschedule = false;
    studioCalMoveMode = false;
    studioFlash = '';
  }

  function syncBookWizardFromDOM() {
    studioApptDraftDate = $('#wizardDate')?.value || studioApptDraftDate;
    studioApptDraftCol = Number($('#wizardColumn')?.value || studioApptDraftCol || 1);
    studioApptDraftTime = $('#wizardTime')?.value || studioApptDraftTime;
    studioBookClientName = ($('#wizardClientName')?.value || studioBookClientName || '').trim();
    studioBookClientPhone = ($('#wizardClientPhone')?.value || studioBookClientPhone || '').trim();
    studioBookNotes = ($('#wizardNotes')?.value || studioBookNotes || '').trim();
    studioBookHairLikes = ($('#wizardHairLikes')?.value || studioBookHairLikes || '').trim();
    studioBookHairDislikes = ($('#wizardHairDislikes')?.value || studioBookHairDislikes || '').trim();
    studioBookPriorServices = ($('#wizardPriorServices')?.value || studioBookPriorServices || '').trim();
    studioBookBeverage = $('#wizardBeverage')?.value || studioBookBeverage || '';
    studioApptServiceId = $('#apptService')?.value || studioApptServiceId;
  }

  function bookWizardBookingOpts(overrides = {}) {
    const needsSvc = ['barber', 'salon'].includes(studioBookVisitType);
    return {
      visitTypeId: studioBookVisitType || undefined,
      gender: studioBookGender,
      bookServiceId: needsSvc ? (studioApptServiceId || undefined) : undefined,
      requireService: needsSvc,
      ...overrides,
    };
  }

  function primeNonPackageServiceForVisitType() {
    const S = window.RenvoaStudios;
    if (!S || !['barber', 'salon'].includes(studioBookVisitType)) return;
    const services = S.getNonPackageBookableServices(studioBookVisitType);
    const current = S.getService(studioApptServiceId);
    const category = studioBookVisitType === 'barber' ? 'mens_grooming' : 'womens_styling';
    if (current && current.category === category && services.some((s) => s.id === current.id)) return;
    studioApptServiceId = services.find((s) => s.featured)?.id || services[0]?.id || '';
  }

  function getBookWizardClient(create = false) {
    const S = window.RenvoaStudios;
    const name = (studioBookClientName || '').trim();
    if (!S || !name) return null;
    const matched = (studioBookClientPhone ? S.findClientByPhone(studioBookClientPhone) : null)
      || S.findClientsByName(name)[0]
      || S.getClients().find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
    if (matched) {
      studioBookClientId = matched.id;
      return matched;
    }
    if (studioBookClientId) {
      const byId = S.getClient(studioBookClientId);
      if (byId && byId.name.trim().toLowerCase() === name.toLowerCase()) return byId;
      studioBookClientId = '';
    }
    if (!create) return null;
    const client = S.upsertClient({
      name,
      phone: studioBookClientPhone,
      gender: studioBookGender,
    });
    studioBookClientId = client.id;
    return client;
  }

  function validateBookWizardStep(step) {
    const S = window.RenvoaStudios;
    if (!S) return 'Studio unavailable.';
    if (step === 'when') {
      const draftSvc = S.getService(studioApptServiceId) || S.filterServices({ gender: studioBookGender })[0];
      const dur = S.getSchedulingDurationMin(draftSvc);
      const slots = S.getAvailableSlots(studioApptDraftDate, studioApptDraftCol, dur);
      if (!studioApptDraftDate || !studioApptDraftTime) return 'Choose a date and time.';
      if (!slots.includes(studioApptDraftTime)) return 'That time is no longer available — pick another slot.';
      return null;
    }
    if (step === 'client') {
      if (!studioBookClientName) return 'Enter a client name.';
      return null;
    }
    if (step === 'service') {
      const bookClient = getBookWizardClient(true);
      if (!bookClient) return 'Enter client details first.';
      const program = S.findActiveProgramForBooking(bookClient.id);
      if (program && (program.visitsRemaining || 0) > 0 && !studioBookVisitType) {
        const types = S.getScheduleVisitTypes(program.category);
        if (types[0]) studioBookVisitType = types[0].id;
      } else if (!program && !studioBookVisitType) {
        studioBookVisitType = 'consult';
      }
      primeNonPackageServiceForVisitType();
      const booking = S.resolveCalendarBooking(bookClient.id, bookWizardBookingOpts());
      if (booking?.error) return booking.error;
      if (booking?.serviceId) studioApptServiceId = booking.serviceId;
      return null;
    }
    return null;
  }

  function primeBookServiceSelection() {
    const S = window.RenvoaStudios;
    if (!S) return;
    const bookClient = getBookWizardClient(true);
    if (!bookClient) return;
    const program = S.findActiveProgramForBooking(bookClient.id);
    if (program && (program.visitsRemaining || 0) > 0) {
      if (!studioBookVisitType) {
        studioBookVisitType = S.getScheduleVisitTypes(program.category)[0]?.id || '';
      }
    } else {
      studioBookVisitType = studioBookVisitType || 'consult';
    }
    primeNonPackageServiceForVisitType();
    const booking = S.resolveCalendarBooking(bookClient.id, bookWizardBookingOpts({ requireService: false }));
    if (booking?.serviceId) studioApptServiceId = booking.serviceId;
  }

  function advanceBookWizard(delta) {
    syncBookWizardFromDOM();
    const steps = ['when', 'client', 'service', 'confirm'];
    const idx = steps.indexOf(studioBookWizardStep);
    if (delta > 0) {
      const err = validateBookWizardStep(studioBookWizardStep);
      if (err) {
        studioNotify(err, 'error');
        return;
      }
      if (idx < steps.length - 1) studioBookWizardStep = steps[idx + 1];
      if (studioBookWizardStep === 'service') primeBookServiceSelection();
    } else if (delta < 0 && idx > 0) {
      studioBookWizardStep = steps[idx - 1];
    }
    studioFlash = '';
  }

  function submitStudioBooking() {
    const S = window.RenvoaStudios;
    if (!S) return false;
    syncBookWizardFromDOM();
    const err = validateBookWizardStep('when') || validateBookWizardStep('client') || validateBookWizardStep('service');
    if (err) {
      studioNotify(err, 'error');
      return false;
    }
    const client = getBookWizardClient(true);
    if (!client) {
      studioNotify('Enter client details first.', 'error');
      return false;
    }
    const program = S.findActiveProgramForBooking(client.id);
    if (program && (program.visitsRemaining || 0) > 0 && !studioBookVisitType) {
      const types = S.getScheduleVisitTypes(program.category);
      if (types[0]) studioBookVisitType = types[0].id;
    }
    const booking = S.resolveCalendarBooking(client.id, bookWizardBookingOpts());
    if (booking?.error) {
      studioNotify(booking.error, 'error');
      return false;
    }
    const pkg = booking.packageFields || {};
    const result = S.createAppointment({
      clientId: client.id,
      clientName: studioBookClientName,
      clientPhone: studioBookClientPhone,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      date: studioApptDraftDate,
      startTime: studioApptDraftTime,
      column: studioApptDraftCol,
      price: booking.price,
      duration: booking.duration,
      schedulingDuration: booking.schedulingDuration,
      scheduledVisitType: booking.scheduledVisitType,
      scheduledVisitTypeId: booking.scheduledVisitTypeId,
      appointmentType: booking.appointmentType || '',
      providerSession: booking.providerSession,
      bookServiceId: booking.bookServiceId || '',
      bookServiceIds: booking.bookServiceIds || [],
      bookedServices: booking.bookedServices || [],
      intendedService: booking.intendedService || '',
      fromPriceDisplay: booking.fromPriceDisplay || '',
      packageVisit: booking.mode === 'package_followup' ? true : false,
      packagePurchase: false,
      programId: pkg.programId || '',
      programName: pkg.programName || '',
      programPaymentPlan: pkg.programPaymentPlan || '',
      visitNumber: pkg.visitNumber || 0,
      visitsIncluded: pkg.visitsIncluded || 0,
      visitValue: pkg.visitValue || 0,
      notes: studioBookNotes,
      clientPreferences: window.StudioVisitFlow?.buildClientPreferences?.({
        hairLikes: studioBookHairLikes,
        hairDislikes: studioBookHairDislikes,
        priorServices: studioBookPriorServices,
        beverage: studioBookBeverage,
        inspoPhotos: studioBookInspoPhotos,
      }),
      bookingInspoPhotos: studioBookInspoPhotos,
    });
    if (result?.error) {
      studioNotify(result.error, 'error');
      return false;
    }
    selectedStudioAppointmentId = result.id;
    studioPrefill = null;
    studioApptDraftDate = null;
    studioApptDraftCol = null;
    studioApptDraftTime = null;
    studioBookClientName = '';
    studioBookClientPhone = '';
    studioBookNotes = '';
    studioBookHairLikes = '';
    studioBookHairDislikes = '';
    studioBookPriorServices = '';
    studioBookBeverage = '';
    studioBookInspoPhotos = [];
    studioApptServiceId = null;
    studioExtOptions = null;
    studioBookVisitType = '';
    closeBookWizard();
    const bookedMsg = result.packageVisit
      ? `Booked prepaid visit ${result.visitNumber}/${result.visitsIncluded} for ${result.clientName} at ${S.formatTime12(result.startTime)}`
      : `Booked ${result.clientName} at ${S.formatTime12(result.startTime)}`;
    studioNotify(bookedMsg, 'success');
    return true;
  }

  function openProgramModal(base, mode, category) {
    const S = window.RenvoaStudios;
    if (!S) return;
    studioOpenProgramBase = base;
    studioProgramModalMode = mode || 'pos';
    if (S.isExtensionCategory(category || studioCategory)) {
      const steps = S.getExtensionWizardSteps(base);
      studioProgramStep = steps[0] || 'length';
      studioExtOptions = S.defaultExtensionOptions(base);
    } else {
      studioProgramStep = 'payment';
      studioExtOptions = null;
    }
  }

  function closeProgramModal(keepExtOptions = false) {
    studioOpenProgramBase = null;
    studioProgramStep = 'length';
    if (!keepExtOptions) studioExtOptions = null;
  }

  function extensionWizardSteps() {
    const S = window.RenvoaStudios;
    if (!S || !studioOpenProgramBase) return S?.EXT_WIZARD_STEPS || ['length', 'payment'];
    return S.getExtensionWizardSteps(studioOpenProgramBase);
  }

  function advanceProgramStep(dir) {
    const steps = extensionWizardSteps();
    const idx = steps.indexOf(studioProgramStep);
    if (dir > 0 && idx < steps.length - 1) studioProgramStep = steps[idx + 1];
    if (dir < 0 && idx > 0) studioProgramStep = steps[idx - 1];
  }

  function getExtensionBaseService(family) {
    const S = window.RenvoaStudios;
    if (!S) return null;
    return S.getServices().find((s) =>
      s.category === 'womens_extensions'
      && s.isPackage
      && S.programBaseName(s.name) === family
      && /Pay in Full/i.test(s.name)
    ) || null;
  }

  function addExtensionSelection(paymentPlan, mode) {
    const S = window.RenvoaStudios;
    if (!S || !studioExtOptions?.family) return;
    if (studioPosMode === 'walkin' && mode === 'pos') return;
    if (paymentPlan === 'quarterly') {
      const row = S.getExtensionLengthRow(studioExtOptions.family, studioExtOptions.length);
      if (!S.isExtensionQuarterlyEligible(row)) {
        studioNotify(`Quarterly is only available when the payment is ${S.formatPrice(S.getQuarterlyMinPayment())} or more.`, 'error');
        return;
      }
    }
    studioExtOptions = { ...studioExtOptions, paymentPlan };
    const svc = getExtensionBaseService(studioExtOptions.family);
    const pricing = S.getExtensionPricingMeta(studioExtOptions);
    const price = pricing.amountDueToday;
    const name = S.formatExtensionLabel(studioExtOptions.family, studioExtOptions);
    const cartId = svc?.id || `ext-${studioExtOptions.family}`;
    const extOptions = {
      ...studioExtOptions,
      ...pricing,
    };

    if (mode === 'book') {
      studioApptServiceId = svc?.id || cartId;
      closeProgramModal(true);
      if (studioBookWizardOpen) studioBookWizardStep = 'confirm';
      studioNotify(`${name} selected.`, 'success');
      return;
    }

    const existing = studioPosCart.items.find((i) => i.id === cartId && JSON.stringify(i.extOptions) === JSON.stringify(extOptions));
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else {
      studioPosCart.items.push({
        id: cartId,
        name,
        price,
        qty: 1,
        extOptions,
      });
    }
    closeProgramModal();
    studioNotify(`Added ${name}`, 'success');
  }

  function addProgramSelection(svc, mode) {
    const S = window.RenvoaStudios;
    if (!S) return;
    if (studioPosMode === 'walkin' && mode === 'pos') return;
    if (S.paymentType(svc.name) === 'Quarterly' && !S.isServiceQuarterlyEligible(svc)) {
      studioNotify(`Quarterly is only available when the payment is ${S.formatPrice(S.getQuarterlyMinPayment())} or more.`, 'error');
      return;
    }
    const name = S.shortName(svc.name);

    if (mode === 'book') {
      studioApptServiceId = svc.id;
      closeProgramModal();
      if (studioBookWizardOpen) studioBookWizardStep = 'confirm';
      studioNotify(`${name} selected.`, 'success');
      return;
    }

    const existing = studioPosCart.items.find((i) => i.id === svc.id && !i.extOptions);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else {
      studioPosCart.items.push({
        id: svc.id,
        name,
        price: svc.price,
        qty: 1,
        extOptions: null,
      });
    }
    closeProgramModal();
    studioNotify(`Added ${name}`, 'success');
  }

  function renderStudios() {
    return window.RenvoaStudioUI?.render(studioSubView, getStudioCtx())
      || '<div class="admin-panel"><h2>Studios unavailable</h2><p>studio-pos-ui.js did not load.</p></div>';
  }

  function openStudioFinanceModal(context = {}) {
    const S = window.RenvoaStudios;
    if (!S) return;
    studioFinanceContext = {
      label: context.label || '',
      amount: context.amount || null,
      clientName: context.clientName || studioPosCart.clientName || '',
    };
    studioFinanceOpen = true;
    renderView();
  }

  function closeStudioFinanceModal() {
    studioFinanceOpen = false;
    studioFinanceContext = null;
    renderView();
  }

  function initStudioFinanceEmbed() {
    const S = window.RenvoaStudios;
    const root = document.getElementById('studioFinanceEmbed');
    if (!S || !root || !studioFinanceOpen) return;
    S.initFinanceEmbed(root, {
      ...(studioFinanceContext || {}),
      autoOpen: studioFinanceContext?.autoOpen !== false && !S.getFinanceMerchantId?.(),
    });
  }

  function bindStudioEvents() {
    const S = window.RenvoaStudios;
    if (!S) return;

    $$('[data-studio-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        businessMode = 'clinic';
        studioSubView = el.dataset.studioTab;
        if (el.dataset.studioAddClient) studioClientAdding = true;
        studioFlash = '';
        updateBusinessModeUI();
        renderView();
      });
    });

    $$('[data-studio-appt-dash]').forEach((el) => {
      el.addEventListener('click', () => {
        const appt = S.getAppointment(el.dataset.studioApptDash);
        if (!appt) return;
        studioSubView = 'calendar';
        studioCalendarDate = appt.date;
        openApptModal(appt.id);
        renderView();
      });
    });

    $$('[data-studio-needs-book]').forEach((el) => {
      el.addEventListener('click', () => {
        const client = S.getClient(el.dataset.studioNeedsBook);
        if (!client) return;
        studioSubView = 'calendar';
        studioCalendarDate = S.todayISO();
        studioBookClientName = client.name;
        studioBookClientPhone = client.phone || '';
        studioBookClientId = client.id;
        studioApptDraftDate = S.todayISO();
        openBookWizard();
        studioBookWizardStep = 'when';
        studioFlash = '';
        renderView();
      });
    });

    $$('[data-studio-birthday-client]').forEach((el) => {
      el.addEventListener('click', () => {
        studioSubView = 'clients';
        studioClientTab = 'overview';
        if (selectStudioClient(el.dataset.studioBirthdayClient)) renderView();
      });
    });

    $$('[data-studio-gender]').forEach((el) => {
      el.addEventListener('click', () => {
        studioGender = el.dataset.studioGender;
        const cats = S.visibleCategories(studioGender);
        if (!cats.find((c) => c.id === studioCategory)) {
          studioCategory = S.defaultCategoryForGender(studioGender);
        }
        studioOpenProgramBase = null;
        renderView();
      });
    });

    $$('[data-book-gender]').forEach((el) => {
      el.addEventListener('click', () => {
        studioBookGender = el.dataset.bookGender;
        const cats = S.visibleCategories(studioBookGender);
        studioBookCategory = studioBookGender === 'men' ? 'program' : 'womens_program';
        studioApptServiceId = null;
        studioOpenProgramBase = null;
        renderView();
      });
    });

    $$('[data-book-category]').forEach((el) => {
      el.addEventListener('click', () => {
        studioBookCategory = el.dataset.bookCategory;
        studioApptServiceId = null;
        studioExtOptions = null;
        closeProgramModal();
        renderView();
      });
    });

    $$('[data-book-select]').forEach((el) => {
      el.addEventListener('click', () => {
        const svc = S.getService(el.dataset.bookSelect);
        if (!svc) return;
        if (studioBookWizardOpen) {
          if (!['barber', 'salon'].includes(studioBookVisitType)) return;
          studioApptServiceId = svc.id;
          const bookClient = getBookWizardClient(true);
          if (bookClient) {
            const booking = S.resolveCalendarBooking(bookClient.id, bookWizardBookingOpts({
              bookServiceId: svc.id,
              requireService: false,
            }));
            if (booking?.error) {
              studioNotify(booking.error, 'error');
              return;
            }
          }
          studioNotify(`${S.shortName(svc.name)} selected.`, 'success');
          renderView();
          return;
        }
        studioApptServiceId = svc.id;
        studioExtOptions = null;
        closeProgramModal();
        studioNotify(`${S.shortName(svc.name)} selected.`, 'success');
        renderView();
      });
    });

    $$('[data-book-visit-type]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!studioBookWizardOpen) return;
        const bookClient = getBookWizardClient(true);
        if (!bookClient) {
          studioNotify('Enter client details first.', 'error');
          return;
        }
        studioBookVisitType = el.dataset.bookVisitType;
        if (studioBookVisitType === 'consult') {
          const consult = S.getSystemConsultationService(studioBookGender);
          studioApptServiceId = consult?.id || 'c5';
        } else {
          primeNonPackageServiceForVisitType();
        }
        const booking = S.resolveCalendarBooking(bookClient.id, bookWizardBookingOpts({ requireService: false }));
        if (booking?.error) {
          studioNotify(booking.error, 'error');
          return;
        }
        if (booking?.serviceId) studioApptServiceId = booking.serviceId;
        studioNotify(`${booking.scheduledVisitType || booking.serviceName} selected.`, 'success');
        renderView();
      });
    });

    $$('[data-program-open]').forEach((el) => {
      el.addEventListener('click', () => {
        if (studioBookWizardOpen) return;
        if (studioPosMode === 'walkin' && (el.dataset.programMode || 'pos') === 'pos') return;
        const cat = el.closest('.studio-cal-layout') ? studioBookCategory : studioCategory;
        openProgramModal(el.dataset.programOpen, el.dataset.programMode || 'pos', cat);
        renderView();
      });
    });

    $$('[data-pos-mode]').forEach((el) => {
      el.addEventListener('click', () => {
        const next = el.dataset.posMode;
        if (next === studioPosMode) return;
        studioPosMode = next;
        studioPosSearch = '';
        studioOpenProgramBase = null;
        studioPresentOpen = false;
        studioPosCart = { clientName: '', clientId: '', items: [], discount: 0 };
        if (next === 'walkin') studioShelfCategory = 'products';
        renderView();
      });
    });

    $$('[data-shelf-category]').forEach((el) => {
      el.addEventListener('click', () => {
        studioShelfCategory = el.dataset.shelfCategory;
        renderView();
      });
    });

    $$('[data-shelf-add]').forEach((el) => {
      el.addEventListener('click', () => {
        const item = S.getShelfItem(el.dataset.shelfAdd);
        if (!item) return;
        const existing = studioPosCart.items.find((i) => i.id === item.id);
        if (existing) existing.qty = (existing.qty || 1) + 1;
        else {
          studioPosCart.items.push({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: 1,
            shelfItem: true,
            sku: item.sku || '',
          });
        }
        studioFlash = '';
        renderView();
      });
    });

    $$('[data-program-close]').forEach((el) => {
      el.addEventListener('click', () => {
        closeProgramModal();
        renderView();
      });
    });

    $$('[data-ext-field]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!studioExtOptions) studioExtOptions = { family: studioOpenProgramBase };
        const field = el.dataset.extField;
        const raw = el.dataset.extValue;
        studioExtOptions = { ...studioExtOptions };
        if (field === 'length') {
          studioExtOptions.length = Number(raw);
          studioExtOptions.paymentPlan = null;
        } else if (field === 'shade') {
          studioExtOptions.shade = raw;
          studioExtOptions.paymentPlan = null;
        } else if (field === 'paymentPlan') {
          if (raw === 'quarterly') {
            const row = S.getExtensionLengthRow(studioExtOptions.family, studioExtOptions.length);
            if (!S.isExtensionQuarterlyEligible(row)) {
              studioNotify(`Quarterly is only available when the payment is ${S.formatPrice(S.getQuarterlyMinPayment())} or more.`, 'error');
              renderView();
              return;
            }
          }
          studioExtOptions.paymentPlan = raw;
        } else {
          studioExtOptions[field] = raw;
        }
        renderView();
      });
    });

    $$('[data-program-step-next]').forEach((el) => {
      el.addEventListener('click', () => {
        advanceProgramStep(1);
        renderView();
      });
    });

    $$('[data-program-step-back]').forEach((el) => {
      el.addEventListener('click', () => {
        advanceProgramStep(-1);
        renderView();
      });
    });

    $$('[data-program-select]').forEach((el) => {
      el.addEventListener('click', () => {
        const svc = S.getService(el.dataset.programSelect);
        if (!svc) return;
        addProgramSelection(svc, el.dataset.programMode || 'pos');
        renderView();
      });
    });

    $$('[data-ext-add]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!studioExtOptions?.paymentPlan) {
          studioNotify('Select a payment option first.', 'error');
          renderView();
          return;
        }
        addExtensionSelection(studioExtOptions.paymentPlan, el.dataset.programMode || 'pos');
        renderView();
      });
    });

    $$('[data-ext-qty-delta]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!studioExtOptions) return;
        const delta = Number(el.dataset.extQtyDelta) || 0;
        const next = Math.max(0, Math.min(20, (studioExtOptions.additionalQty || 0) + delta));
        studioExtOptions = { ...studioExtOptions, additionalQty: next };
        renderView();
      });
    });

    $$('[data-ext-qty-input]').forEach((el) => {
      el.addEventListener('input', () => {
        if (!studioExtOptions) return;
        const next = Math.max(0, Math.min(20, Number(el.value) || 0));
        studioExtOptions = { ...studioExtOptions, additionalQty: next };
        scheduleRenderView(0);
      });
    });

    $('#calJumpDate')?.addEventListener('change', (e) => {
      studioCalendarDate = e.target.value;
      renderView();
    });

    $('#calChairFilter')?.addEventListener('change', (e) => {
      studioCalChairFilter = Number(e.target.value) || 0;
      renderView();
    });

    $('#apptRescheduleBtn')?.addEventListener('click', () => {
      const appt = selectedStudioAppointmentId ? S.getAppointment(selectedStudioAppointmentId) : null;
      studioApptReschedule = true;
      studioCalMoveMode = false;
      if (appt) {
        studioRescheduleDraft = { date: appt.date, column: appt.column, time: appt.startTime };
      }
      renderView();
    });

    $$('[data-appt-modal-close]').forEach((el) => {
      el.addEventListener('click', () => {
        closeApptModal();
        renderView();
      });
    });

    $('#cancelRescheduleBtn')?.addEventListener('click', () => {
      studioApptReschedule = false;
      studioRescheduleDraft = null;
      renderView();
    });

    $('#studioRescheduleForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = S.rescheduleAppointment($('#rescheduleApptId').value, {
        date: $('#rescheduleDate').value,
        startTime: $('#rescheduleTime').value,
        column: Number($('#rescheduleColumn').value),
      });
      if (result?.error) {
        studioNotify(result.error, 'error');
        renderView();
        return;
      }
      studioApptReschedule = false;
      studioRescheduleDraft = null;
      studioCalMoveMode = false;
      studioCalendarDate = result.date;
      studioApptModalOpen = true;
      studioNotify('Appointment rescheduled.', 'success');
      renderView();
    });

    $$('[data-studio-category]').forEach((el) => {
      el.addEventListener('click', () => {
        studioCategory = el.dataset.studioCategory;
        studioOpenProgramBase = null;
        renderView();
      });
    });

    $$('[data-studio-inquiry]').forEach((el) => {
      el.addEventListener('click', () => {
        selectedStudioInquiryId = el.dataset.studioInquiry;
        renderView();
      });
    });

    // Client list clicks use document delegation from boot() — survives re-renders reliably.

    $$('[data-studio-staff]').forEach((el) => {
      el.addEventListener('click', () => {
        selectedStudioStaffId = el.dataset.studioStaff;
        renderView();
      });
    });

    function canDropAppt(apptId, target) {
      const appt = S.getAppointment(apptId);
      if (!appt || !target) return false;
      const dur = appt.duration || S.parseDurationMin(S.getService(appt.serviceId)?.duration);
      const end = S.addMinutesToTime(target.startTime, dur);
      return !S.findConflict(target.date, target.startTime, end, target.column, apptId);
    }

    function applyReschedule(apptId, target) {
      const result = S.rescheduleAppointment(apptId, target);
      if (result?.error) {
        studioNotify(result.error, 'error');
        renderView();
        return false;
      }
      selectedStudioAppointmentId = apptId;
      studioCalendarDate = result.date;
      studioApptReschedule = false;
      studioCalMoveMode = false;
      studioApptModalOpen = true;
      studioNotify('Appointment moved.', 'success');
      renderView();
      return true;
    }

    function handleCalSelectSlot(target) {
      studioCalendarDate = target.date;
      selectedStudioAppointmentId = null;
      studioApptReschedule = false;
      studioCalMoveMode = false;
      studioApptDraftDate = target.date;
      studioApptDraftTime = target.startTime;
      studioApptDraftCol = target.column;
      studioPrefill = { date: target.date, time: target.startTime, column: target.column };
      studioFlash = '';
      openBookWizard();
      renderView();
    }

    function handleCalSelectAppt(id) {
      openApptModal(id);
      renderView();
    }

    const calHandlers = {
      isActive: () => businessMode === 'clinic' && studioSubView === 'calendar',
      canDrop: canDropAppt,
      isMoveMode: () => studioCalMoveMode,
      getMoveApptId: () => (studioCalMoveMode ? selectedStudioAppointmentId : null),
      onConflict: () => studioNotify('That slot is not available for this appointment.', 'error'),
      onSelectAppt: handleCalSelectAppt,
      onSelectSlot: handleCalSelectSlot,
      onReschedule: (apptId, target) => applyReschedule(apptId, target),
    };

    if (window.StudioCalendar) {
      window.StudioCalendar.init();
      window.StudioCalendar.configure(calHandlers);
    } else {
      $$('[data-studio-appt]').forEach((el) => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('[data-cal-drag-handle]')) return;
          e.stopPropagation();
          handleCalSelectAppt(el.dataset.studioAppt);
        });
      });
      $$('[data-cal-slot].open').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const parts = el.dataset.calSlot.split('|');
          const target = { date: parts[0], startTime: parts[1], column: Number(parts[2]) };
          if (studioCalMoveMode && selectedStudioAppointmentId) {
            if (canDropAppt(selectedStudioAppointmentId, target)) {
              applyReschedule(selectedStudioAppointmentId, target);
            } else {
              studioNotify('That slot is not available for this appointment.', 'error');
            }
            return;
          }
          handleCalSelectSlot(target);
        });
      });
    }

    $('#apptMoveModeBtn')?.addEventListener('click', () => {
      studioApptModalOpen = false;
      studioCalMoveMode = true;
      studioApptReschedule = false;
      studioNotify('Click an open slot to move this appointment.', 'info');
      renderView();
    });

    $('#cancelMoveModeBtn')?.addEventListener('click', () => {
      studioCalMoveMode = false;
      if (selectedStudioAppointmentId) studioApptModalOpen = true;
      renderView();
    });

    $$('[data-cal-pick-slot]').forEach((el) => {
      el.addEventListener('click', () => {
        const slot = el.dataset.calPickSlot;
        const group = el.getAttribute('name');
        if (group === 'book' || group === 'wizard-book') {
          const input = group === 'wizard-book' ? $('#wizardTime') : $('#apptTime');
          if (input) input.value = slot;
          studioApptDraftTime = slot;
          $$(`[data-cal-pick-slot][name="${group}"]`).forEach((chip) => {
            chip.classList.toggle('active', chip.dataset.calPickSlot === slot);
          });
          renderView();
        } else if (group === 'reschedule') {
          const input = $('#rescheduleTime');
          if (input) input.value = slot;
          if (studioRescheduleDraft) studioRescheduleDraft = { ...studioRescheduleDraft, time: slot };
          $$('[data-cal-pick-slot][name="reschedule"]').forEach((chip) => {
            chip.classList.toggle('active', chip.dataset.calPickSlot === slot);
          });
        } else if (group === 'rebook') {
          const input = $('#rebookTime');
          if (input) input.value = slot;
          if (studioRebookDraft) studioRebookDraft = { ...studioRebookDraft, time: slot };
          $$('[data-cal-pick-slot][name="rebook"]').forEach((chip) => {
            chip.classList.toggle('active', chip.dataset.calPickSlot === slot);
          });
        }
      });
    });

    function syncRescheduleDraft() {
      if (!studioApptReschedule || !selectedStudioAppointmentId) return;
      const appt = S.getAppointment(selectedStudioAppointmentId);
      if (!appt) return;
      const date = $('#rescheduleDate')?.value || studioRescheduleDraft?.date || appt.date;
      const column = Number($('#rescheduleColumn')?.value || studioRescheduleDraft?.column || appt.column);
      const dur = appt.duration || S.parseDurationMin(S.getService(appt.serviceId)?.duration);
      const slots = S.getAvailableSlots(date, column, dur, appt.id);
      let time = $('#rescheduleTime')?.value || studioRescheduleDraft?.time || appt.startTime;
      if (!slots.includes(time)) time = slots[0] || time;
      studioRescheduleDraft = { date, column, time };
    }

    $('#rescheduleDate')?.addEventListener('change', () => {
      syncRescheduleDraft();
      renderView();
    });
    $('#rescheduleColumn')?.addEventListener('change', () => {
      syncRescheduleDraft();
      renderView();
    });

    $$('[data-cal-shift]').forEach((el) => {
      el.addEventListener('click', () => {
        let days = Number(el.dataset.calShift);
        if (studioCalendarView === 'week') days *= 7;
        studioCalendarDate = S.shiftDate(studioCalendarDate || S.todayISO(), days);
        renderView();
      });
    });

    $$('[data-cal-today]').forEach((el) => {
      el.addEventListener('click', () => {
        studioCalendarDate = S.todayISO();
        renderView();
      });
    });

    $$('[data-cal-view]').forEach((el) => {
      el.addEventListener('click', () => {
        studioCalendarView = el.dataset.calView;
        renderView();
      });
    });

    $('#posServiceSearch')?.addEventListener('input', (e) => {
      studioPosSearch = e.target.value;
      scheduleRenderView(180);
    });

    $$('[data-pos-add]').forEach((el) => {
      el.addEventListener('click', () => {
        const svc = S.getService(el.dataset.posAdd);
        if (!svc) return;
        const existing = studioPosCart.items.find((i) => i.id === svc.id);
        if (existing) {
          existing.qty = (existing.qty || 1) + 1;
        } else {
          studioPosCart.items.push({
            id: svc.id,
            name: S.shortName(svc.name),
            price: svc.price,
            qty: 1,
          });
        }
        studioFlash = '';
        renderView();
      });
    });

    $('#posClearCartBtn')?.addEventListener('click', () => {
      studioPosCart.items = [];
      studioPosCart.discount = 0;
      studioPresentOpen = false;
      closePosAuthModal();
      renderView();
    });

    $('#posApplyDiscountBtn')?.addEventListener('click', () => {
      const raw = Number($('#posDiscountInput')?.value);
      const discount = Number.isFinite(raw) ? Math.max(0, raw) : 0;
      openPosAuthModal('discount', { discount });
      renderView();
    });

    $$('[data-pos-apply-price]').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.posApplyPrice);
        const input = $(`[data-pos-price-input="${idx}"]`);
        const raw = Number(input?.value);
        const price = Number.isFinite(raw) ? Math.max(0, raw) : 0;
        openPosAuthModal('price', { itemIndex: idx, price });
        renderView();
      });
    });

    $$('[data-pos-auth-close]').forEach((el) => {
      el.addEventListener('click', () => {
        closePosAuthModal();
        renderView();
      });
    });

    $('#posAuthConfirmBtn')?.addEventListener('click', () => {
      const pin = $('#posAuthPin')?.value || '';
      if (applyPosAuthOverride(pin)) renderView();
      else renderView();
    });

    $('#posAuthPin')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#posAuthConfirmBtn')?.click();
      }
    });

    $$('[data-pos-remove]').forEach((el) => {
      el.addEventListener('click', () => {
        studioPosCart.items.splice(Number(el.dataset.posRemove), 1);
        renderView();
      });
    });

    function resolvePosClient() {
      const name = ($('#posClientName')?.value || studioPosCart.clientName || '').trim();
      const matches = S.findClientsByName(name);
      const existing = (studioPosCart.clientId && S.getClient(studioPosCart.clientId))
        || (matches.length === 1 ? matches[0] : null)
        || matches[0]
        || null;
      return { name, client: existing || null };
    }

    $('#posClientName')?.addEventListener('input', (e) => {
      studioPosCart.clientName = e.target.value;
      const matches = S.findClientsByName(e.target.value.trim());
      studioPosCart.clientId = matches.length === 1
        ? matches[0].id
        : (studioPosCart.clientId && matches.some((c) => c.id === studioPosCart.clientId) ? studioPosCart.clientId : '');
      scheduleRenderView(180);
    });

    $('#posApplyCredit')?.addEventListener('change', (e) => {
      studioPosApplyCredit = e.target.checked;
      renderView();
    });

    $('#posCheckoutBtn')?.addEventListener('click', () => {
      if (!studioPosCart.items.length) return;
      const grossSubtotal = studioPosCart.items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
      const discount = Math.min(studioPosCart.discount || 0, grossSubtotal);
      const netSubtotal = Math.max(0, grossSubtotal - discount);
      const noteParts = [];
      if (discount > 0) noteParts.push(`Discount: ${S.formatPrice(discount)}`);

      if (studioPosMode === 'walkin') {
        const hasNonShelf = studioPosCart.items.some((i) => !S.isShelfPosItem(i));
        if (hasNonShelf) {
          studioNotify('Walk-in sales are limited to shelf items and quick add-ons.', 'error');
          renderView();
          return;
        }
        const label = ($('#posWalkInLabel')?.value || '').trim() || 'Walk-in';
        const total = netSubtotal;
        const tx = S.createTransaction({
          type: 'walkin',
          walkIn: true,
          clientId: '',
          clientName: label,
          items: studioPosCart.items,
          subtotal: grossSubtotal,
          discount,
          creditApplied: 0,
          total,
          paymentMethod: $('#posPaymentMethod')?.value || 'card',
          notes: [noteParts.join(' · '), 'Walk-in shelf sale — no client profile'].filter(Boolean).join(' · '),
        });
        studioPosCart = { clientName: '', clientId: '', items: [], discount: 0 };
        studioPresentOpen = false;
        closePosAuthModal();
        studioSubView = 'transactions';
        selectedStudioTransactionId = tx.id;
        studioNotify(`Walk-in sale recorded — ${S.formatPrice(total)}`, 'success');
        renderView();
        return;
      }

      const { name, client: matched } = resolvePosClient();
      if (!name) {
        studioNotify('Enter a client name before completing the sale.', 'error');
        renderView();
        return;
      }
      const client = S.upsertClient({
        id: matched?.id || studioPosCart.clientId,
        name,
        phone: matched?.phone || '',
        email: matched?.email || '',
      });
      const creditBalance = S.getClientCreditBalance(client.id);
      const applyCheckbox = $('#posApplyCredit');
      const shouldApply = creditBalance > 0 && (applyCheckbox ? applyCheckbox.checked : studioPosApplyCredit);
      const creditToApply = shouldApply ? Math.min(creditBalance, netSubtotal) : 0;
      const total = Math.max(0, netSubtotal - creditToApply);
      if (creditToApply > 0) noteParts.push(`Studio credit applied: ${S.formatPrice(creditToApply)}`);
      const postVisitApptId = studioPostVisitApptId;
      const pkgCartItem = studioPosCart.items.find((i) => i.packageVisit);
      const tx = S.createTransaction({
        clientId: client.id,
        clientName: name,
        items: studioPosCart.items,
        subtotal: grossSubtotal,
        discount,
        creditApplied: creditToApply,
        total,
        paymentMethod: $('#posPaymentMethod')?.value || 'card',
        appointmentId: postVisitApptId || pkgCartItem?.postVisitApptId || '',
        notes: noteParts.join(' · '),
      });
      const warrantyCartItems = studioPosCart.items.filter((i) => i.warrantyReinstatement);
      warrantyCartItems.forEach((item) => {
        const row = S.recordWarrantyReinstatement({
          clientId: client.id,
          programId: item.programId,
          programName: item.programName,
          amount: item.price,
          transactionId: tx.id,
          appointmentId: postVisitApptId || '',
          anchorDate: item.anchorDate,
          recommendedByDate: item.recommendedByDate,
          graceDeadline: item.graceDeadline,
          daysLate: item.daysLate,
          notes: `Reinstated at POS — ${S.formatPrice(item.price)}`,
        });
        if (row) noteParts.push(`Warranty reinstated — ${item.programName}`);
      });
      if (pkgCartItem && (postVisitApptId || pkgCartItem.postVisitApptId)) {
        const redeemApptId = postVisitApptId || pkgCartItem.postVisitApptId;
        const redeem = S.redeemPackageVisitOnAppointment(redeemApptId, {
          programId: pkgCartItem.programId,
          programName: pkgCartItem.programName,
          programPaymentPlan: pkgCartItem.programPaymentPlan,
          visitNumber: pkgCartItem.visitNumber,
          visitsIncluded: pkgCartItem.visitsIncluded,
          visitValue: pkgCartItem.visitValue,
          transactionId: tx.id,
          serviceName: pkgCartItem.name,
        });
        if (redeem?.error) {
          studioNotify(redeem.error, 'warn');
        } else if (redeem?.fields) {
          noteParts.push(`Prepaid visit ${redeem.fields.visitNumber}/${redeem.fields.visitsIncluded} redeemed`);
        }
      }
      if (creditToApply > 0) {
        S.applyClientCredit(client.id, creditToApply, {
          transactionId: tx.id,
          notes: `Applied at POS — ${S.formatPrice(creditToApply)}`,
        });
      }
      const hadPostVisit = !!postVisitApptId;
      const pendingRebookApptId = studioPostVisitPendingRebookApptId;
      studioPosCart = { clientName: '', clientId: '', items: [], discount: 0 };
      studioPosApplyCredit = true;
      studioPresentOpen = false;
      closePosAuthModal();
      if (hadPostVisit) {
        const postVisitSource = studioPostVisitSource;
        finishPostVisitCheckout();
        if (pendingRebookApptId) {
          studioSubView = 'calendar';
          studioNotify('Sale recorded — follow-up is on the calendar.', 'success');
        } else {
          studioSubView = 'calendar';
          if (openFollowUpScheduler(postVisitApptId, { source: postVisitSource })) {
            studioNotify('Sale recorded — schedule their follow-up visit.', 'success');
          } else {
            studioSubView = 'transactions';
            selectedStudioTransactionId = tx.id;
            studioNotify('Sale recorded — visit complete.', 'success');
          }
        }
      } else {
        studioSubView = 'transactions';
        selectedStudioTransactionId = tx.id;
        const msg = creditToApply
          ? `Sale recorded — ${S.formatPrice(total)} due (${S.formatPrice(creditToApply)} credit applied)`
          : `Sale recorded — ${S.formatPrice(total)}`;
        studioNotify(msg, 'success');
      }
      renderView();
    });

    $('#posPaymentMethod')?.addEventListener('change', (e) => {
      if (e.target.value === 'financing') {
        const gross = studioPosCart.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
        const net = Math.max(0, gross - (studioPosCart.discount || 0));
        openStudioFinanceModal({
          label: 'POS checkout',
          amount: net,
          clientName: studioPosCart.clientName,
        });
      }
    });

    $$('[data-open-finance]').forEach((el) => {
      el.addEventListener('click', () => {
        openStudioFinanceModal({
          label: el.dataset.financeLabel || '',
          amount: Number(el.dataset.financeAmount) || null,
          clientName: studioPosCart.clientName,
        });
      });
    });

    $('#studioFinanceCloseBtn')?.addEventListener('click', closeStudioFinanceModal);
    $('#studioFinanceOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'studioFinanceOverlay') closeStudioFinanceModal();
    });

    if (!studioFinanceEventBound) {
      studioFinanceEventBound = true;
      window.addEventListener('studio-open-finance', (e) => {
        openStudioFinanceModal(e.detail || {});
      });
    }

    window.StudioFinanceUI?.bindFinanceTierClicks?.(document.getElementById('adminApp') || document.body, () => ({
      clientName: studioPosCart.clientName,
    }));

    $('#posPresentBtn')?.addEventListener('click', () => {
      if (studioPosMode === 'walkin') {
        studioPosCart.clientName = ($('#posWalkInLabel')?.value || '').trim() || 'Walk-in';
      } else {
        studioPosCart.clientName = $('#posClientName')?.value || studioPosCart.clientName;
      }
      studioPresentOpen = true;
      renderView();
    });

    $('#posPresentCloseBtn')?.addEventListener('click', () => {
      studioPresentOpen = false;
      renderView();
    });

    $$('.studio-save-price').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const id = btn.dataset.service;
        const price = Number(row?.querySelector('[data-field="price"]')?.value);
        const duration = row?.querySelector('[data-field="duration"]')?.value;
        S.savePricingOverride(id, { price, duration });
        btn.textContent = 'Saved';
        setTimeout(() => { btn.textContent = 'Save'; }, 1200);
      });
    });

    $('#saveAllPricesBtn')?.addEventListener('click', () => {
      $$('.studio-save-price').forEach((btn) => {
        const row = btn.closest('tr');
        const id = btn.dataset.service;
        const price = Number(row?.querySelector('[data-field="price"]')?.value);
        const duration = row?.querySelector('[data-field="duration"]')?.value;
        S.savePricingOverride(id, { price, duration });
      });
      studioNotify('All prices saved.', 'success');
      renderView();
    });

    $$('[data-book-wizard-close]').forEach((el) => {
      el.addEventListener('click', () => {
        syncBookWizardFromDOM();
        closeBookWizard();
        renderView();
      });
    });

    $$('[data-book-wizard-step]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = el.dataset.bookWizardStep;
        const steps = ['when', 'client', 'service', 'confirm'];
        const currentIdx = steps.indexOf(studioBookWizardStep);
        const targetIdx = steps.indexOf(target);
        if (targetIdx < 0 || targetIdx > currentIdx) return;
        syncBookWizardFromDOM();
        studioBookWizardStep = target;
        studioFlash = '';
        renderView();
      });
    });

    $('#bookWizardBack')?.addEventListener('click', () => {
      advanceBookWizard(-1);
      renderView();
    });

    $('#bookWizardNext')?.addEventListener('click', () => {
      advanceBookWizard(1);
      renderView();
    });

    $('#bookWizardSubmit')?.addEventListener('click', () => {
      if (submitStudioBooking()) renderView();
      else renderView();
    });

    $('#wizardInspoPhotos')?.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files?.length || !S.compressImageFile) return;
      const room = Math.max(0, 6 - (studioBookInspoPhotos || []).length);
      for (const file of [...files].slice(0, room)) {
        try {
          const compressed = await S.compressImageFile(file);
          studioBookInspoPhotos.push({
            id: `inspo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl: compressed.dataUrl,
            addedAt: new Date().toISOString(),
          });
        } catch (_) { /* skip */ }
      }
      e.target.value = '';
      renderView();
    });

    $('#resumeBookWizardBtn')?.addEventListener('click', () => {
      openBookWizard();
      renderView();
    });

    $('#cancelBookDraftBtn')?.addEventListener('click', () => {
      closeBookWizard();
      studioPrefill = null;
      studioApptDraftDate = null;
      studioApptDraftCol = null;
      studioApptDraftTime = null;
      studioBookClientName = '';
      studioBookClientPhone = '';
      studioBookNotes = '';
      studioApptServiceId = null;
      studioExtOptions = null;
      renderView();
    });

    ['wizardDate', 'wizardColumn'].forEach((id) => {
      $('#' + id)?.addEventListener('change', () => {
        syncBookWizardFromDOM();
        const S = window.RenvoaStudios;
        const draftSvc = S?.getService(studioApptServiceId) || S?.filterServices({ gender: studioBookGender })[0];
        const dur = S?.getSchedulingDurationMin(draftSvc) || 60;
        const slots = S?.getAvailableSlots(studioApptDraftDate, studioApptDraftCol, dur) || [];
        if (!slots.includes(studioApptDraftTime)) {
          studioApptDraftTime = slots[0] || studioApptDraftTime;
        }
        renderView();
      });
    });

    $$('[data-appt-flow]').forEach((el) => {
      el.addEventListener('click', () => {
        const apptId = el.dataset.appt;
        const flow = el.dataset.apptFlow;
        if (flow === 'checkin') handleCheckIn(apptId);
        else if (flow === 'provider') {
          const appt = S.getAppointment(apptId);
          openProviderWizard(apptId, appt?.providerSession?.activityId ? { step: 'checkout' } : {});
        }
        renderView();
      });
    });

    $$('[data-open-intake]').forEach((el) => {
      el.addEventListener('click', () => {
        openIntakeWizard(el.dataset.openIntake);
        renderView();
      });
    });

    $$('[data-intake-close]').forEach((el) => {
      el.addEventListener('click', () => {
        closeIntakeWizard();
        renderView();
      });
    });

    $$('[data-provider-close]').forEach((el) => {
      el.addEventListener('click', () => {
        closeProviderWizard();
        renderView();
      });
    });

    $$('[data-provider-activity]').forEach((el) => {
      el.addEventListener('click', () => {
        const VF = window.StudioVisitFlow;
        const appt = S.getAppointment(studioProviderApptId);
        const activityId = el.dataset.providerActivity;
        studioProviderDraft = {
          ...(studioProviderDraft || {}),
          activityId,
          subs: [],
          details: {},
          addonIds: [],
          lineItems: VF?.resolveDefaultLineItems(appt, activityId) || [],
        };
        renderView();
      });
    });

    $$('[data-provider-sub]').forEach((el) => {
      el.addEventListener('click', () => {
        const sub = el.dataset.providerSub;
        const subs = [...(studioProviderDraft?.subs || [])];
        const idx = subs.indexOf(sub);
        if (idx >= 0) subs.splice(idx, 1);
        else subs.push(sub);
        studioProviderDraft = { ...(studioProviderDraft || {}), subs };
        renderView();
      });
    });

    $$('[data-provider-primary]').forEach((el) => {
      el.addEventListener('click', () => {
        const serviceId = el.dataset.providerPrimary;
        const appt = S.getAppointment(studioProviderApptId);
        const suggested = window.StudioVisitFlow?.getSuggestedBillableServices(appt, studioProviderDraft?.activityId) || [];
        const pick = suggested.find((s) => s.id === serviceId);
        studioProviderDraft = {
          ...(studioProviderDraft || {}),
          lineItems: [{
            serviceId,
            qty: 1,
            packageVisitLine: !!pick?.packageVisitLine,
          }],
        };
        renderView();
      });
    });

    $$('[data-provider-addon]').forEach((el) => {
      el.addEventListener('click', () => {
        const addonId = el.dataset.providerAddon;
        const addonIds = [...(studioProviderDraft?.addonIds || [])];
        const idx = addonIds.indexOf(addonId);
        if (idx >= 0) addonIds.splice(idx, 1);
        else addonIds.push(addonId);
        studioProviderDraft = { ...(studioProviderDraft || {}), addonIds };
        renderView();
      });
    });

    $('#intakeFormSigned')?.addEventListener('change', (e) => {
      const formId = e.target.dataset.intakeSign;
      if (e.target.checked) {
        if (!studioIntakeSigned.includes(formId)) studioIntakeSigned.push(formId);
      } else {
        studioIntakeSigned = studioIntakeSigned.filter((id) => id !== formId);
      }
      renderView();
    });

    $$('.intake-field-input').forEach((input) => {
      const syncField = () => {
        const formId = input.dataset.intakeForm;
        const field = input.dataset.intakeField;
        if (!formId || !field) return;
        const value = input.tagName === 'SELECT' ? input.value : input.value;
        studioIntakeData = {
          ...studioIntakeData,
          [formId]: { ...(studioIntakeData[formId] || {}), [field]: value },
        };
      };
      input.addEventListener('input', syncField);
      input.addEventListener('change', syncField);
    });

    $$('[data-email-intake]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persistIntakeDraft();
        emailIntakeToClient(btn.dataset.emailIntake, btn.dataset.emailMode || 'current');
        renderView();
      });
    });

    $$('[data-download-intake]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persistIntakeDraft();
        downloadIntakeForms(btn.dataset.downloadIntake, btn.dataset.emailMode || 'current');
      });
    });

    $$('[data-print-intake]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persistIntakeDraft();
        printIntakeForms(btn.dataset.printIntake, btn.dataset.emailMode || 'blank');
      });
    });

    $$('[data-copy-intake-portal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        copyIntakePortalLink(btn.dataset.copyIntakePortal);
      });
    });

    $('#intakeWizardBack')?.addEventListener('click', () => {
      if (studioIntakeStep > 0) studioIntakeStep -= 1;
      renderView();
    });

    $('#intakeWizardNext')?.addEventListener('click', () => {
      const VF = window.StudioVisitFlow;
      const forms = VF?.INTAKE_FORMS || [];
      const form = forms[studioIntakeStep];
      if (!window.StudioVisitFlow?.intakeFormReady(form, studioIntakeSigned, studioIntakeData)) {
        studioNotify(form?.required
          ? 'Complete all fields and have the client sign, or skip this form.'
          : 'Client must sign this form to continue, or skip it.', 'error');
        renderView();
        return;
      }
      persistIntakeDraft();
      if (studioIntakeStep < forms.length - 1) studioIntakeStep += 1;
      if (form?.id === VF.ALLERGY_FORM_ID) maybeShowAllergyPopup(studioIntakeApptId);
      renderView();
    });

    $('#intakeWizardFinish')?.addEventListener('click', () => {
      finishIntakeWizard();
      renderView();
    });

    $('#intakeWizardSkip')?.addEventListener('click', () => {
      skipCurrentIntakeForm();
      renderView();
    });

    $('#intakeWizardSkipAll')?.addEventListener('click', () => {
      const VF = window.StudioVisitFlow;
      const forms = VF?.INTAKE_FORMS || [];
      forms.forEach((f) => {
        if (!studioIntakeSkippedForms.includes(f.id) && !studioIntakeSigned.includes(f.id)) {
          studioIntakeSkippedForms.push(f.id);
        }
      });
      studioIntakeSigned = [];
      finishIntakeWizard({ fromSkip: true });
      renderView();
    });

    $$('[data-allergy-close]').forEach((el) => {
      el.addEventListener('click', () => {
        closeAllergyModal();
        renderView();
      });
    });

    $$('[data-view-allergies]').forEach((el) => {
      el.addEventListener('click', () => {
        openAllergyModal(el.dataset.viewAllergies);
        renderView();
      });
    });

    $('#providerWizardBack')?.addEventListener('click', () => {
      const steps = ['activity', 'subs', 'details', 'checkout', 'confirm'];
      const idx = steps.indexOf(studioProviderStep);
      if (idx > 0) studioProviderStep = steps[idx - 1];
      renderView();
    });

    $('#providerWizardNext')?.addEventListener('click', () => {
      const VF = window.StudioVisitFlow;
      const steps = ['activity', 'subs', 'details', 'checkout', 'confirm'];
      const idx = steps.indexOf(studioProviderStep);
      if (studioProviderStep === 'activity' && !studioProviderDraft?.activityId) {
        studioNotify('Select what the provider is doing today.', 'error');
        renderView();
        return;
      }
      if (studioProviderStep === 'details') {
        syncProviderDraftFromDOM();
        const apptForCheckout = S.getAppointment(studioProviderApptId);
        if (!studioProviderDraft?.lineItems?.length) {
          studioProviderDraft = {
            ...studioProviderDraft,
            lineItems: VF?.resolveDefaultLineItems(apptForCheckout, studioProviderDraft?.activityId) || [],
          };
        }
      }
      if (studioProviderStep === 'checkout') {
        syncProviderDraftFromDOM();
        const appt = S.getAppointment(studioProviderApptId);
        if (!studioProviderDraft?.lineItems?.length) {
          studioProviderDraft = {
            ...studioProviderDraft,
            lineItems: VF?.resolveDefaultLineItems(appt, studioProviderDraft?.activityId) || [],
          };
        }
        const hasCharges = (studioProviderDraft?.lineItems?.length || 0) > 0
          || (studioProviderDraft?.addonIds?.length || 0) > 0
          || appt?.packageVisit;
        if (!hasCharges) {
          studioNotify('Select a primary service for the register.', 'error');
          renderView();
          return;
        }
      }
      if (idx >= 0 && idx < steps.length - 1) studioProviderStep = steps[idx + 1];
      renderView();
    });

    $('#providerWizardFinish')?.addEventListener('click', () => {
      finishProviderWizard();
      renderView();
    });

    $$('[data-appt-quick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.apptQuick;
        const labels = {
          checked_in: 'Checked in',
          in_progress: 'In progress',
          with_provider: 'With provider',
          completed: 'Completed',
          no_show: 'No show',
        };
        if (status === 'with_provider') {
          openProviderWizard(btn.dataset.appt);
          renderView();
          return;
        }
        const appt = S.getAppointment(btn.dataset.appt);
        if (!S.canAdvanceVisit(appt, status)) {
          studioNotify('Complete or skip new client intake before continuing the visit.', 'error');
          openIntakeWizard(btn.dataset.appt);
          renderView();
          return;
        }
        if (status === 'completed') {
          promptRebookOrProceed(btn.dataset.appt, 'complete');
          renderView();
          return;
        }
        S.updateAppointment(btn.dataset.appt, { status });
        studioNotify(`${labels[status] || 'Status'} updated.`, 'success');
        window.StudioApptTimers?.tick();
        renderView();
      });
    });

    $('#updateApptStatusBtn')?.addEventListener('click', () => {
      const apptId = $('#updateApptStatusBtn').dataset.appt;
      const status = $('#apptStatusSelect').value;
      const appt = S.getAppointment(apptId);
      if (!S.canAdvanceVisit(appt, status)) {
        studioNotify('Complete or skip new client intake before continuing the visit.', 'error');
        openIntakeWizard(apptId);
        renderView();
        return;
      }
      if (status === 'completed') {
        promptRebookOrProceed(apptId, 'complete');
        renderView();
        return;
      }
      S.updateAppointment(apptId, { status });
      const updated = S.getAppointment(apptId);
      if (status === 'checked_in' && S.needsIntake(updated)) openIntakeWizard(apptId);
      if (status === 'with_provider' && !updated?.providerSession?.activityId) openProviderWizard(apptId);
      window.StudioApptTimers?.tick();
      renderView();
    });

    $('#deleteApptBtn')?.addEventListener('click', () => {
      S.updateAppointment($('#deleteApptBtn').dataset.appt, { status: 'canceled' });
      closeApptModal();
      studioNotify('Appointment canceled.', 'success');
      renderView();
    });

    $('#apptToPosBtn')?.addEventListener('click', () => {
      const apptId = $('#apptToPosBtn').dataset.appt;
      if (!S.getAppointment(apptId)) return;
      sendApptToRegisterForVisitClose(apptId, 'pos');
      renderView();
    });

    $('#posApplyPackageVisitBtn')?.addEventListener('click', () => {
      applyPackageVisitToPosCart();
      renderView();
    });

    $$('[data-pos-warranty-reinstate]').forEach((el) => {
      el.addEventListener('click', () => {
        const programId = el.dataset.posWarrantyReinstate;
        const clientId = studioPosCart.clientId || $('#posClientName')?.value
          ? S.findClientsByName(($('#posClientName')?.value || studioPosCart.clientName || '').trim())[0]?.id
          : '';
        const resolvedClientId = studioPosCart.clientId || clientId;
        if (!resolvedClientId) {
          studioNotify('Link a client before adding warranty reinstatement.', 'error');
          renderView();
          return;
        }
        const program = (S.getClientProgramSummary(resolvedClientId).programs || []).find((p) => p.id === programId);
        const item = S.warrantyReinstatementPosItem(program);
        if (!item) {
          studioNotify('Warranty reinstatement is not required for this program.', 'error');
          renderView();
          return;
        }
        if (studioPosCart.items.some((i) => i.warrantyReinstatement && i.programId === programId)) {
          studioNotify('Warranty reinstatement is already in the cart.', 'info');
          renderView();
          return;
        }
        studioPosCart.items.push(item);
        if (!studioPosCart.clientId) {
          const client = S.getClient(resolvedClientId);
          studioPosCart.clientId = resolvedClientId;
          studioPosCart.clientName = client?.name || studioPosCart.clientName;
        }
        studioNotify(`Added ${S.formatPrice(item.price)} warranty reinstatement for ${program.programName}.`, 'success');
        renderView();
      });
    });

    $$('[data-client-warranty-pos]').forEach((el) => {
      el.addEventListener('click', () => {
        const programId = el.dataset.clientWarrantyPos;
        const clientId = selectedStudioClientId;
        const client = S.getClient(clientId);
        const program = (S.getClientProgramSummary(clientId).programs || []).find((p) => p.id === programId);
        const item = S.warrantyReinstatementPosItem(program);
        if (!item || !client) return;
        studioPosCart = {
          clientName: client.name,
          clientId: client.id,
          items: [item],
          discount: 0,
        };
        studioPosMode = 'client';
        studioSubView = 'pos';
        studioNotify(`POS opened with ${S.formatPrice(item.price)} warranty reinstatement.`, 'success');
        renderView();
      });
    });

    $('#posScheduleFollowUpBtn')?.addEventListener('click', () => {
      const apptId = studioPostVisitApptId;
      const source = studioPostVisitSource;
      if (!apptId) return;
      openFollowUpScheduler(apptId, { source });
      renderView();
    });

    $('#posUseVisitTodayBtn')?.addEventListener('click', () => {
      const apptId = studioPostVisitApptId;
      const source = studioPostVisitSource;
      if (!apptId) return;
      if (openFollowUpScheduler(apptId, { source, sameDay: true })) {
        const appt = S.getAppointment(apptId);
        const RB = window.StudioRebook;
        if (appt && studioRebookDraft && RB?.buildSameDayDraft) {
          studioRebookDraft = RB.buildSameDayDraft(appt, studioRebookDraft);
        }
        if (!studioRebookDraft?.packageVisit && appt?.clientId) {
          const followUp = S.getProgramFollowUpBooking(appt.clientId, {
            serviceId: appt.serviceId,
            extOptions: appt.extOptions,
            programName: appt.programName,
          });
          if (followUp?.packageFields) {
            studioRebookDraft = {
              ...studioRebookDraft,
              packageVisit: true,
              programId: followUp.packageFields.programId,
              programName: followUp.packageFields.programName,
              programPaymentPlan: followUp.packageFields.programPaymentPlan,
              serviceId: followUp.service?.id || studioRebookDraft?.serviceId,
            };
          }
        }
        refreshRebookPackageVisitDraft(appt);
      }
      renderView();
    });

    $('#posFinishVisitBtn')?.addEventListener('click', () => {
      finishPostVisitCheckout();
      studioSubView = 'calendar';
      studioNotify('Visit complete.', 'success');
      renderView();
    });

    $('#rebookUseTodayBtn')?.addEventListener('click', () => {
      const appt = S.getAppointment(studioRebookApptId);
      const RB = window.StudioRebook;
      if (!appt || !studioRebookDraft || !RB?.buildSameDayDraft) return;
      studioRebookDraft = RB.buildSameDayDraft(appt, studioRebookDraft);
      refreshRebookPackageVisitDraft(appt);
      renderView();
    });

    $$('[data-rebook-close]').forEach((el) => {
      el.addEventListener('click', () => {
        finishRebookPendingAction();
        renderView();
      });
    });

    $('#skipRebookBtn')?.addEventListener('click', () => {
      finishRebookPendingAction();
      renderView();
    });

    $('#confirmRebookBtn')?.addEventListener('click', () => {
      confirmRebookSchedule();
    });

    $$('[data-rebook-service]').forEach((el) => {
      el.addEventListener('click', () => {
        const svc = S.getService(el.dataset.rebookService);
        const appt = S.getAppointment(studioRebookApptId);
        if (!svc || !studioRebookDraft || !appt) return;
        const duration = S.getAppointmentDurationMin(svc);
        const schedulingDuration = S.getSchedulingDurationMin(svc);
        const slot = window.StudioRebook?.pickOptimalSlot(studioRebookDraft.date, schedulingDuration, appt);
        studioRebookDraft = {
          ...studioRebookDraft,
          serviceId: svc.id,
          serviceName: S.shortName(svc.name),
          servicePrice: svc.price || 0,
          duration,
          schedulingDuration,
          time: slot?.time || studioRebookDraft.time,
          column: slot?.column || studioRebookDraft.column,
          chairLabel: slot
            ? (S.getCalendarSettings().columnLabels?.[slot.column - 1] || `Chair ${slot.column}`)
            : studioRebookDraft.chairLabel,
        };
        renderView();
      });
    });

    $('#rebookDate')?.addEventListener('change', () => {
      syncRebookDraftFromDOM();
      const appt = S.getAppointment(studioRebookApptId);
      const draft = studioRebookDraft;
      if (!draft || !appt) return;
      const slot = window.StudioRebook?.pickOptimalSlot(draft.date, draft.schedulingDuration || draft.duration, appt);
      if (slot) {
        studioRebookDraft = { ...studioRebookDraft, time: slot.time, column: slot.column };
      }
      renderView();
    });

    $('#rebookColumn')?.addEventListener('change', () => {
      syncRebookDraftFromDOM();
      const draft = studioRebookDraft;
      if (!draft) return;
      const slots = S.getAvailableSlots(draft.date, draft.column, draft.schedulingDuration || draft.duration);
      if (slots.length && !slots.includes(draft.time)) {
        studioRebookDraft = { ...studioRebookDraft, time: slots[0] };
      }
      renderView();
    });

    $('#clientSearch')?.addEventListener('input', (e) => {
      studioClientSearch = e.target.value;
      scheduleRenderView(180);
    });

    $('#addClientBtn')?.addEventListener('click', () => {
      studioClientAdding = true;
      selectedStudioClientId = null;
      renderView();
    });

    $('#cancelAddClientBtn')?.addEventListener('click', () => {
      studioClientAdding = false;
      renderView();
    });

    $('#studioClientNewForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      openPosAuthModal('client_create', {
        data: {
          name: $('#studioClientNewName').value.trim(),
          email: $('#studioClientNewEmail').value.trim(),
          phone: $('#studioClientNewPhone').value.trim(),
          birthday: $('#studioClientNewBirthday')?.value || '',
          notes: $('#studioClientNewNotes').value.trim(),
        },
      });
      renderView();
    });

    $('#studioClientForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      openPosAuthModal('client_save', {
        id: $('#studioClientId').value,
        patch: {
          name: $('#studioClientNameEdit').value.trim(),
          email: $('#studioClientEmailEdit').value.trim(),
          phone: $('#studioClientPhoneEdit').value.trim(),
          birthday: $('#studioClientBirthdayEdit')?.value || '',
          notes: $('#studioClientNotesEdit').value.trim(),
        },
      });
      renderView();
    });

    $('#clientMergeBtn')?.addEventListener('click', () => {
      const primaryId = resolveStudioClientPrimaryId();
      const secondaryId = $('#clientMergeSelect')?.value || studioClientMergeSecondaryId;
      if (!primaryId) {
        studioNotify('Select the client profile to keep.', 'error');
        renderView();
        return;
      }
      if (!secondaryId) {
        studioNotify('Select a duplicate profile to merge.', 'error');
        renderView();
        return;
      }
      if (primaryId === secondaryId) {
        studioNotify('Choose a different profile to merge into this one.', 'error');
        renderView();
        return;
      }
      openClientMergeAuth(primaryId, secondaryId);
      renderView();
    });

    $('#clientMergeSearch')?.addEventListener('input', (e) => {
      studioClientMergeSearch = e.target.value;
      scheduleRenderView(180);
    });

    $('#clientManualMergeSelect')?.addEventListener('change', (e) => {
      studioClientMergeSecondaryId = e.target.value || null;
      renderView();
    });

    $('#clientMergeSelect')?.addEventListener('change', (e) => {
      studioClientMergeSecondaryId = e.target.value || null;
      renderView();
    });

    $('#clientManualMergeBtn')?.addEventListener('click', () => {
      const primaryId = resolveStudioClientPrimaryId();
      const secondaryId = $('#clientManualMergeSelect')?.value || studioClientMergeSecondaryId;
      if (!primaryId) {
        studioNotify('Select the client profile to keep.', 'error');
        renderView();
        return;
      }
      if (!secondaryId) {
        studioNotify('Select another client profile to merge in.', 'error');
        renderView();
        return;
      }
      if (primaryId === secondaryId) {
        studioNotify('Choose a different profile to merge into this one.', 'error');
        renderView();
        return;
      }
      openClientMergeAuth(primaryId, secondaryId);
      renderView();
    });

    $('#clientCreditForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const clientId = selectedStudioClientId;
      const amount = Number($('#clientCreditAmount')?.value);
      if (!amount) {
        studioNotify('Enter a non-zero credit amount.', 'error');
        renderView();
        return;
      }
      openPosAuthModal('client_credit', {
        clientId,
        amount,
        notes: $('#clientCreditNotes')?.value?.trim() || '',
      });
      renderView();
    });

    function syncRefundAmountFromSelect() {
      const sel = $('#clientRefundTx');
      const opt = sel?.selectedOptions?.[0];
      const max = Number(opt?.dataset?.refundable) || 0;
      const input = $('#clientRefundAmount');
      if (input && max > 0 && (!input.value || Number(input.value) > max)) {
        input.value = max;
      }
      const hint = $('#clientRefundMaxHint');
      if (hint) hint.textContent = max ? `Up to ${S.formatPrice(max)} refundable on this sale.` : '';
    }

    $('#clientRefundTx')?.addEventListener('change', syncRefundAmountFromSelect);
    syncRefundAmountFromSelect();

    $('#clientRefundForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const clientId = selectedStudioClientId;
      const transactionId = $('#clientRefundTx')?.value;
      const amount = Number($('#clientRefundAmount')?.value);
      const tx = S.getTransactions().find((t) => t.id === transactionId);
      const max = S.getRefundableAmount(tx);
      if (!transactionId || !amount || amount > max) {
        studioNotify(`Refund cannot exceed ${S.formatPrice(max)}.`, 'error');
        renderView();
        return;
      }
      openPosAuthModal('client_refund', {
        clientId,
        transactionId,
        amount,
        notes: $('#clientRefundNotes')?.value?.trim() || '',
      });
      renderView();
    });

    $$('[data-client-warranty-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const clientId = selectedStudioClientId;
        const programId = form.dataset.clientWarrantyForm;
        const summary = S.getClientProgramSummary(clientId);
        const program = (summary.programs || []).find((p) => p.id === programId);
        openPosAuthModal('client_warranty', {
          clientId,
          programId,
          programName: program?.programName || 'Program',
          data: {
            warrantyStatus: form.querySelector('[name="warrantyStatus"]')?.value,
            warrantyNotes: form.querySelector('[name="warrantyNotes"]')?.value?.trim() || '',
          },
        });
        renderView();
      });
    });

    $$('[data-client-program-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const clientId = selectedStudioClientId;
        const programId = form.dataset.clientProgramForm;
        const summary = S.getClientProgramSummary(clientId);
        const program = (summary.programs || []).find((p) => p.id === programId);
        const data = {
          visitsIncluded: form.querySelector('[name="visitsIncluded"]')?.value,
          visitValue: form.querySelector('[name="visitValue"]')?.value,
          visitsUsedOffset: form.querySelector('[name="visitsUsedOffset"]')?.value,
          active: form.querySelector('[name="active"]')?.checked,
          notes: form.querySelector('[name="notes"]')?.value?.trim() || '',
        };
        openPosAuthModal('client_program', {
          clientId,
          programId,
          programName: program?.programName || 'Program',
          data,
        });
        renderView();
      });
    });

    $$('[data-client-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        studioClientTab = el.dataset.clientTab;
        renderView();
      });
    });

    $$('[data-photo-prompt-close]').forEach((el) => {
      el.addEventListener('click', () => {
        closePhotoPrompt();
        renderView();
      });
    });

    $('#photoPromptConfirmBtn')?.addEventListener('click', () => {
      confirmPhotoPrompt(false);
      renderView();
    });

    $('#photoPromptSkipBtn')?.addEventListener('click', () => {
      confirmPhotoPrompt(true);
      renderView();
    });

    $$('[data-client-photo-upload]').forEach((el) => {
      el.addEventListener('click', () => {
        triggerPhotoFileInput({
          clientId: el.dataset.clientPhotoUpload,
          kind: 'progress',
        }, 'upload');
      });
    });

    $$('[data-client-photo-camera]').forEach((el) => {
      el.addEventListener('click', () => {
        openClientPhotoCamera({
          clientId: el.dataset.clientPhotoCamera,
          kind: 'progress',
        });
      });
    });

    $$('[data-photo-prompt-upload]').forEach((el) => {
      el.addEventListener('click', () => {
        triggerPhotoFileInput({
          clientId: el.dataset.photoPromptUpload,
          appointmentId: el.dataset.photoAppt || '',
          kind: el.dataset.photoKind || 'progress',
        }, 'upload');
      });
    });

    $$('[data-photo-prompt-camera]').forEach((el) => {
      el.addEventListener('click', () => {
        openClientPhotoCamera({
          clientId: el.dataset.photoPromptCamera,
          appointmentId: el.dataset.photoAppt || '',
          kind: el.dataset.photoKind || 'progress',
        });
      });
    });

    $$('[data-delete-client-photo]').forEach((el) => {
      el.addEventListener('click', () => {
        const ownerId = el.dataset.clientPhotoOwner;
        const photoId = el.dataset.deleteClientPhoto;
        const result = S.removeClientPhoto(ownerId, photoId);
        if (result?.error) {
          studioNotify(result.error, 'error');
        } else {
          studioNotify('Photo removed.', 'success');
        }
        renderView();
      });
    });

    bindClientPhotoInputs();

    $$('[data-prefill-pos-client]').forEach((el) => {
      el.addEventListener('click', () => {
        const c = S.getClient(el.dataset.prefillPosClient);
        if (!c) return;
        studioPosMode = 'client';
        studioPosCart = { clientName: c.name, clientId: c.id, items: [], discount: 0 };
        studioSubView = 'pos';
        studioFlash = '';
        renderView();
      });
    });

    $$('[data-studio-tx]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.studioTx;
        selectedStudioTransactionId = selectedStudioTransactionId === id ? null : id;
        renderView();
      });
    });

    $('#markInquiryContactedBtn')?.addEventListener('click', () => {
      S.updateInquiry($('#markInquiryContactedBtn').dataset.inquiry, { status: 'contacted' });
      updateStudioBadge();
      renderView();
    });

    $('#studioSettingsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      S.saveSettings({
        financeUrl: $('#studioFinanceUrl').value.trim(),
        financeMerchantId: $('#studioFinanceMerchantId')?.value.trim() || '',
        phone: $('#studioSettingsPhone').value.trim(),
        email: $('#studioSettingsEmail').value.trim(),
        location: $('#studioSettingsLocation').value.trim(),
      });
      studioNotify('Settings saved.', 'success');
      renderView();
    });

    $('#studioCalendarForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const cols = Number($('#calColumns').value) || 3;
      const labels = $('#calChairLabels').value.split(',').map((s) => s.trim()).filter(Boolean);
      S.saveCalendarSettings({
        startHour: Number($('#calStartHour').value),
        endHour: Number($('#calEndHour').value),
        slotMinutes: Number($('#calSlotMinutes').value),
        columns: cols,
        columnLabels: labels.length ? labels : Array.from({ length: cols }, (_, i) => `Chair ${i + 1}`),
      });
      studioNotify('Calendar settings saved.', 'success');
      renderView();
    });

    $('#studioCloudMigrateBtn')?.addEventListener('click', async () => {
      const storage = window.StudioStorage;
      if (!storage?.migrateLocalToCloud) {
        studioNotify('Cloud storage is not configured.', 'error');
        return;
      }
      try {
        const result = await storage.migrateLocalToCloud();
        studioNotify(`Uploaded ${result.migrated} data collection${result.migrated !== 1 ? 's' : ''} to cloud.`, 'success');
        renderView();
      } catch (err) {
        studioNotify(err.message || 'Cloud upload failed.', 'error');
      }
    });

    $('#addStaffBtn')?.addEventListener('click', () => {
      selectedStudioStaffId = null;
      renderView();
    });

    $('#studioStaffForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      S.updateStaff($('#studioStaffId').value, {
        name: $('#studioStaffName').value.trim(),
        role: $('#studioStaffRole').value,
        email: $('#studioStaffEmail').value.trim(),
        phone: $('#studioStaffPhone').value.trim(),
        active: $('#studioStaffActive').checked,
      });
      renderView();
    });

    $('#studioStaffNewForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const member = S.addStaff({
        name: $('#studioStaffNewName').value.trim(),
        role: $('#studioStaffNewRole').value,
        email: $('#studioStaffNewEmail').value.trim(),
      });
      selectedStudioStaffId = member.id;
      renderView();
    });

    $('#removeStaffBtn')?.addEventListener('click', () => {
      S.removeStaff($('#removeStaffBtn').dataset.staff);
      selectedStudioStaffId = null;
      renderView();
    });

    $$('[data-prefill-name]').forEach((el) => {
      el.addEventListener('click', () => {
        studioPrefill = {
          name: el.dataset.prefillName,
          phone: el.dataset.prefillPhone || '',
        };
        if (el.dataset.prefillGender) {
          studioGender = el.dataset.prefillGender;
          studioBookGender = el.dataset.prefillGender;
          studioBookCategory = el.dataset.prefillGender === 'women' ? 'womens_program' : 'program';
        }
        studioSubView = 'calendar';
        selectedStudioAppointmentId = null;
        renderView();
      });
    });

    $$('[data-prefill-client]').forEach((el) => {
      el.addEventListener('click', () => {
        const c = S.getClient(el.dataset.prefillClient);
        if (c) {
          studioPrefill = { name: c.name, phone: c.phone };
          studioSubView = 'calendar';
          selectedStudioAppointmentId = null;
          renderView();
        }
      });
    });

    if (studioPrefill && studioSubView === 'calendar') {
      if (studioPrefill.name) studioBookClientName = studioPrefill.name;
      if (studioPrefill.phone) studioBookClientPhone = studioPrefill.phone;
      const { date, time, column } = studioPrefill;
      studioPrefill = (date || time || column != null) ? { date, time, column } : null;
    }

  }

  function renderMessages() {
    const customers = A.getCustomers();
    const messages = A.getMessages();
    const selected = customers.find((c) => c.email === selectedCustomerEmail) || customers[0];
    if (!selectedCustomerEmail && selected) selectedCustomerEmail = selected.email;

    const thread = messages.filter((m) => m.customerEmail === selectedCustomerEmail);

    return `
      <div class="admin-page-head">
        <h1>Messages</h1>
        <p>Client communication log — compose outbound emails and track threads.</p>
      </div>
      <div class="admin-messages-layout">
        <section class="admin-panel admin-panel-list">
          <h2>Clients</h2>
          <div class="admin-client-list">
            ${customers.map((c) => `
              <button type="button" class="admin-client-card${c.email === selectedCustomerEmail ? ' active' : ''}" data-client="${c.email}">
                <strong>${c.name}</strong>
                <span>${c.email}</span>
                <span>${c.orders.length} order${c.orders.length !== 1 ? 's' : ''} · ${A.formatMoney(c.totalSpent)}</span>
              </button>`).join('') || '<p class="admin-empty">No customers yet — orders will appear here.</p>'}
          </div>
          <h3 class="admin-subhead">Wholesale inquiries</h3>
          <div class="admin-inquiry-list">
            ${A.getWholesaleInquiries().slice(0, 5).map((inq) => `
              <div class="admin-inquiry-card">
                <strong>${inq.name || 'Inquiry'}</strong>
                <span>${inq.email}</span>
                <p>${inq.products || ''}${inq.notes ? ` — ${inq.notes}` : ''}</p>
              </div>`).join('') || '<p class="admin-empty">No wholesale inquiries.</p>'}
          </div>
          <h3 class="admin-subhead">Newsletter (${A.getSubscribers().length})</h3>
          <p class="admin-subscribers">${A.getSubscribers().slice(0, 8).join(', ') || 'No subscribers yet.'}</p>
        </section>
        <section class="admin-panel">
          ${selected ? `
            <div class="admin-panel-head">
              <h2>${selected.name}</h2>
              <a href="mailto:${selected.email}?subject=${encodeURIComponent('ONYX Peptides — Your order')}" class="link-cta admin-link-btn">Open in Mail</a>
            </div>
            <div class="admin-thread">
              ${thread.map((m) => `
                <div class="admin-msg ${m.direction}">
                  <div class="admin-msg-head">
                    <strong>${m.direction === 'outbound' ? 'You' : selected.name}</strong>
                    <span>${A.formatDate(m.at)}${m.auto ? ' · auto' : ''}</span>
                  </div>
                  <p class="admin-msg-subject">${m.subject}</p>
                  <p class="admin-msg-body">${m.body}</p>
                </div>`).join('') || '<p class="admin-empty">No messages yet for this client.</p>'}
            </div>
            <form class="admin-compose" id="composeForm">
              <label class="form-field"><span>Subject</span><input type="text" id="composeSubject" required></label>
              <label class="form-field"><span>Message</span><textarea id="composeBody" rows="5" required></textarea></label>
              <div class="admin-compose-actions">
                <button type="submit" class="btn-primary btn-sm">Log &amp; send via Mail</button>
              </div>
            </form>` : '<p class="admin-empty">Select a client to view messages.</p>'}
        </section>
      </div>`;
  }

  function crmContactCard(c, active) {
    const stage = crmStageMeta(c.stage);
    const follow = A.getNextFollowUp(c);
    const today = new Date().toISOString().slice(0, 10);
    const taskClass = follow && !follow.done
      ? (follow.due?.slice(0, 10) < today ? ' crm-task-overdue' : follow.due?.slice(0, 10) === today ? ' crm-task-today' : '')
      : '';
    return `<button type="button" class="admin-client-card crm-contact-card${active ? ' active' : ''}${taskClass}" data-crm="${esc(c.email)}">
      <div class="crm-card-top">
        <strong>${esc(c.name || c.email)}</strong>
        <span class="admin-status-pill" style="--pill-color:${stage.color}">${stage.label}</span>
      </div>
      <span>${esc(c.company || c.email)}</span>
      <span>${c.orderCount} order${c.orderCount !== 1 ? 's' : ''} · ${A.formatMoney(c.totalSpent)}${follow && !follow.done ? ` · Due ${follow.due?.slice(0, 10)}` : ''}</span>
    </button>`;
  }

  function crmContactDetail(contact) {
    if (!contact) return '<p class="admin-empty">Select a contact to view their profile.</p>';

    const stage = crmStageMeta(contact.stage);
    const messages = A.getMessages().filter((m) => m.customerEmail === contact.email);
    const activities = [
      ...(contact.activities || []),
      ...(contact.notes || []).map((n) => ({ type: 'note', at: n.at, text: n.text })),
      ...messages.map((m) => ({
        type: m.direction === 'outbound' ? 'email-out' : 'email-in',
        at: m.at,
        text: `${m.subject}: ${m.body.slice(0, 120)}${m.body.length > 120 ? '…' : ''}`,
      })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at));

    const openTasks = (contact.followUps || []).filter((f) => !f.done);
    const doneTasks = (contact.followUps || []).filter((f) => f.done);

    return `
      <div class="crm-detail">
        <div class="admin-detail-head">
          <div>
            <h2>${esc(contact.name || contact.email)}</h2>
            <p>${esc(contact.title)}${contact.title && contact.company ? ' · ' : ''}${esc(contact.company)}</p>
            <p>${esc(contact.email)}${contact.phone ? ` · ${esc(contact.phone)}` : ''}</p>
          </div>
          <span class="admin-status-pill" style="--pill-color:${stage.color}">${stage.label}</span>
        </div>

        <div class="crm-detail-stats">
          <div><span>Lifetime value</span><strong>${A.formatMoney(contact.totalSpent)}</strong></div>
          <div><span>Orders</span><strong>${contact.orderCount}</strong></div>
          <div><span>Source</span><strong>${esc(contact.source)}</strong></div>
          <div><span>Last contact</span><strong>${contact.lastContact ? A.formatDate(contact.lastContact) : '—'}</strong></div>
        </div>

        <div class="crm-quick-actions">
          <a href="mailto:${esc(contact.email)}" class="btn-secondary btn-sm">Email</a>
          <button type="button" class="btn-secondary btn-sm" id="crmLogCallBtn">Log call</button>
          <button type="button" class="btn-secondary btn-sm" data-goto="messages" data-crm-email="${esc(contact.email)}">Messages</button>
        </div>

        <form id="crmProfileForm" class="crm-profile-form">
          <div class="form-row crm-form-row">
            <label class="form-field"><span>Name</span><input type="text" id="crmName" value="${esc(contact.name)}"></label>
            <label class="form-field"><span>Company</span><input type="text" id="crmCompany" value="${esc(contact.company)}"></label>
          </div>
          <div class="form-row crm-form-row">
            <label class="form-field"><span>Title</span><input type="text" id="crmTitle" value="${esc(contact.title)}"></label>
            <label class="form-field"><span>Phone</span><input type="tel" id="crmPhone" value="${esc(contact.phone)}"></label>
          </div>
          <div class="form-row crm-form-row">
            <label class="form-field"><span>Stage</span>
              <select id="crmStage">
                ${A.CRM_STAGES.map((s) => `<option value="${s.id}"${s.id === contact.stage ? ' selected' : ''}>${s.label}</option>`).join('')}
              </select>
            </label>
            <label class="form-field"><span>Tags (comma-separated)</span>
              <input type="text" id="crmTags" value="${esc((contact.tags || []).join(', '))}">
            </label>
          </div>
          <button type="submit" class="btn-primary btn-sm">Save profile</button>
        </form>

        ${contact.orderCount ? `
          <h3>Order history</h3>
          <div class="admin-table-wrap">
            <table class="admin-table admin-table-sm">
              <thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${contact.orders.map((o) => `
                  <tr class="admin-row-click" data-order="${o.id}">
                    <td>${o.id}</td>
                    <td>${A.formatMoney(o.total)}</td>
                    <td><span class="admin-status-pill" style="--pill-color:${statusMeta(o.status).color}">${statusMeta(o.status).label}</span></td>
                    <td>${A.formatDate(o.date)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}

        <h3>Follow-ups</h3>
        <form id="crmFollowUpForm" class="crm-inline-form">
          <input type="date" id="crmFollowDue" required>
          <input type="text" id="crmFollowNote" placeholder="Follow-up note" required>
          <button type="submit" class="btn-primary btn-sm">Schedule</button>
        </form>
        <ul class="crm-task-list">
          ${openTasks.map((f) => `
            <li class="crm-task-item">
              <div>
                <strong>${esc(f.note)}</strong>
                <span>Due ${f.due?.slice(0, 10)}</span>
              </div>
              <button type="button" class="btn-secondary btn-sm" data-complete-followup="${f.id}">Done</button>
            </li>`).join('') || '<li class="crm-task-empty">No open follow-ups.</li>'}
        </ul>
        ${doneTasks.length ? `<p class="admin-fine">${doneTasks.length} completed follow-up${doneTasks.length !== 1 ? 's' : ''}</p>` : ''}

        <h3>Notes</h3>
        <form id="crmNoteForm" class="crm-inline-form">
          <textarea id="crmNoteText" rows="2" placeholder="Add an internal note…" required></textarea>
          <button type="submit" class="btn-primary btn-sm">Add note</button>
        </form>
        <ul class="crm-notes-list">
          ${(contact.notes || []).map((n) => `
            <li><span>${A.formatDate(n.at)}</span><p>${esc(n.text)}</p></li>`).join('') || '<li class="crm-task-empty">No notes yet.</li>'}
        </ul>

        <h3>Activity</h3>
        <ul class="crm-activity-list">
          ${activities.slice(0, 12).map((a) => `
            <li>
              <span class="crm-activity-type">${esc(a.type)}</span>
              <span>${A.formatDate(a.at)}</span>
              <p>${esc(a.text)}</p>
            </li>`).join('') || '<li class="crm-task-empty">No activity logged.</li>'}
        </ul>
      </div>`;
  }

  function renderCRM() {
    const stats = A.getCRMStats();
    const contacts = A.getCRMContacts().filter((c) => {
      const q = crmSearch.toLowerCase();
      const matchSearch = !q || [c.name, c.email, c.company, ...(c.tags || [])].join(' ').toLowerCase().includes(q);
      const matchStage = !crmStageFilter || c.stage === crmStageFilter;
      return matchSearch && matchStage;
    });

    const selected = contacts.find((c) => c.email === selectedCRMEmail)
      || A.getCRMContacts().find((c) => c.email === selectedCRMEmail)
      || contacts[0];
    if (!selectedCRMEmail && selected) selectedCRMEmail = selected.email;

    const today = new Date().toISOString().slice(0, 10);
    const allTasks = A.getCRMContacts().flatMap((c) =>
      (c.followUps || []).filter((f) => !f.done).map((f) => ({ ...f, contact: c }))
    ).sort((a, b) => new Date(a.due) - new Date(b.due));

    if (crmSubView === 'pipeline') {
      return `
        <div class="admin-page-head">
          <h1>CRM — Pipeline</h1>
          <p>Contacts by lifecycle stage — leads through VIP.</p>
        </div>
        <div class="crm-subnav">
          <button type="button" class="crm-subnav-btn${crmSubView === 'contacts' ? ' active' : ''}" data-crm-tab="contacts">Contacts</button>
          <button type="button" class="crm-subnav-btn active" data-crm-tab="pipeline">Pipeline</button>
          <button type="button" class="crm-subnav-btn" data-crm-tab="tasks">Tasks <span class="admin-nav-badge">${stats.openTasks || ''}</span></button>
        </div>
        <div class="crm-pipeline-board">
          ${A.CRM_STAGES.map((stage) => {
            const stageContacts = A.getCRMContacts().filter((c) => c.stage === stage.id);
            return `<div class="crm-pipeline-col">
              <div class="admin-kanban-head" style="--pill-color:${stage.color}">
                <span>${stage.label}</span>
                <strong>${stageContacts.length}</strong>
              </div>
              <div class="admin-kanban-cards">
                ${stageContacts.map((c) => `
                  <button type="button" class="admin-kanban-card crm-pipeline-card" data-crm="${esc(c.email)}">
                    <strong>${esc(c.name || c.email)}</strong>
                    <span>${esc(c.company || c.source)}</span>
                    <span>${A.formatMoney(c.totalSpent)} · ${c.orderCount} orders</span>
                  </button>`).join('') || '<p class="admin-kanban-empty">—</p>'}
              </div>
            </div>`;
          }).join('')}
        </div>`;
    }

    if (crmSubView === 'tasks') {
      return `
        <div class="admin-page-head">
          <h1>CRM — Tasks</h1>
          <p>Follow-ups and outreach scheduled across your contact base.</p>
        </div>
        <div class="crm-subnav">
          <button type="button" class="crm-subnav-btn" data-crm-tab="contacts">Contacts</button>
          <button type="button" class="crm-subnav-btn" data-crm-tab="pipeline">Pipeline</button>
          <button type="button" class="crm-subnav-btn active" data-crm-tab="tasks">Tasks <span class="admin-nav-badge">${stats.openTasks || ''}</span></button>
        </div>
        <div class="admin-kpi-grid crm-kpi-grid">
          ${kpiCard('Due today', stats.dueToday, 'Needs attention today', stats.dueToday > 0)}
          ${kpiCard('Overdue', stats.overdue, 'Past due follow-ups', stats.overdue > 0)}
          ${kpiCard('Open tasks', stats.openTasks, 'All scheduled follow-ups')}
          ${kpiCard('Total contacts', stats.totalContacts, `${stats.leads} leads · ${stats.customers} customers`)}
        </div>
        <section class="admin-panel">
          <h2>All follow-ups</h2>
          <ul class="crm-task-list crm-task-list-full">
            ${allTasks.map((f) => {
              const overdue = f.due?.slice(0, 10) < today;
              const dueToday = f.due?.slice(0, 10) === today;
              return `<li class="crm-task-item${overdue ? ' crm-task-overdue-row' : dueToday ? ' crm-task-today-row' : ''}">
                <div>
                  <strong>${esc(f.note)}</strong>
                  <span><button type="button" class="crm-link-btn" data-crm="${esc(f.contact.email)}">${esc(f.contact.name || f.contact.email)}</button> · Due ${f.due?.slice(0, 10)}</span>
                </div>
                <button type="button" class="btn-secondary btn-sm" data-complete-followup="${f.id}" data-crm-email="${esc(f.contact.email)}">Done</button>
              </li>`;
            }).join('') || '<li class="crm-task-empty">No open tasks — you\'re caught up.</li>'}
          </ul>
        </section>`;
    }

    return `
      <div class="admin-page-head">
        <h1>CRM</h1>
        <p>Manage contacts, track relationships, notes, and follow-ups across orders, leads, and wholesale.</p>
      </div>
      <div class="crm-subnav">
        <button type="button" class="crm-subnav-btn active" data-crm-tab="contacts">Contacts</button>
        <button type="button" class="crm-subnav-btn" data-crm-tab="pipeline">Pipeline</button>
        <button type="button" class="crm-subnav-btn" data-crm-tab="tasks">Tasks <span class="admin-nav-badge">${stats.openTasks || ''}</span></button>
      </div>
      <div class="admin-kpi-grid crm-kpi-grid">
        ${kpiCard('Contacts', stats.totalContacts, `${stats.leads} leads`)}
        ${kpiCard('Customers', stats.customers, 'Active buyers')}
        ${kpiCard('Pipeline value', A.formatMoney(stats.pipelineValue), 'Lifetime revenue')}
        ${kpiCard('Tasks due', stats.dueToday + stats.overdue, `${stats.overdue} overdue`, stats.overdue > 0)}
      </div>
      <div class="crm-stage-bar">
        ${A.CRM_STAGES.map((s) => `
          <button type="button" class="crm-stage-chip${crmStageFilter === s.id ? ' active' : ''}" data-crm-stage="${s.id}" style="--pill-color:${s.color}">
            ${s.label} <strong>${stats.byStage[s.id] || 0}</strong>
          </button>`).join('')}
        ${crmStageFilter ? '<button type="button" class="crm-stage-clear" data-crm-stage="">Clear filter</button>' : ''}
      </div>
      <div class="admin-orders-layout crm-layout">
        <section class="admin-panel admin-panel-list">
          <div class="crm-list-toolbar">
            <input type="search" id="crmSearch" placeholder="Search contacts…" value="${esc(crmSearch)}">
            <button type="button" class="btn-secondary btn-sm" id="crmAddToggle">+ Add</button>
          </div>
          <form id="crmAddForm" class="crm-add-form" hidden>
            <label class="form-field"><span>Name *</span><input type="text" id="crmAddName" required></label>
            <label class="form-field"><span>Email *</span><input type="email" id="crmAddEmail" required></label>
            <label class="form-field"><span>Company</span><input type="text" id="crmAddCompany"></label>
            <label class="form-field"><span>Stage</span>
              <select id="crmAddStage">
                ${A.CRM_STAGES.map((s) => `<option value="${s.id}">${s.label}</option>`).join('')}
              </select>
            </label>
            <button type="submit" class="btn-primary btn-sm">Create contact</button>
          </form>
          <div class="admin-client-list crm-contact-list">
            ${contacts.map((c) => crmContactCard(c, c.email === selectedCRMEmail)).join('')
              || '<p class="admin-empty">No contacts match your search.</p>'}
          </div>
        </section>
        <section class="admin-panel admin-panel-detail" id="crmDetail">
          ${crmContactDetail(selected)}
        </section>
      </div>`;
  }

  function formatFinanceCompare(pct) {
    if (pct == null || !Number.isFinite(pct)) return '';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% vs prior period`;
  }

  function getActiveFinanceSummary() {
    const opts = {
      preset: financePreset,
      startDate: financeStartDate,
      endDate: financeEndDate,
      source: financeSource,
    };
    const S = window.RenvoaStudios;
    if (financeSource === 'clinic' && S?.getClinicFinanceSummary) {
      return S.getClinicFinanceSummary(opts);
    }
    if (financeSource === 'combined' && S?.getClinicFinanceSummary) {
      const peptide = A.getFinanceSummary(opts);
      const clinic = S.getClinicFinanceSummary(opts);
      const combined = A.combineFinanceSummaries([peptide, clinic]);
      const priorCombined = A.combineFinanceSummaries([peptide.prior, clinic.prior]);
      return {
        ...combined,
        range: peptide.range,
        priorRange: peptide.priorRange,
        prior: priorCombined,
        compare: {
          grossRevenue: A.pctChange(combined.grossRevenue, priorCombined.grossRevenue),
          ebitda: A.pctChange(combined.ebitda, priorCombined.ebitda),
          orderCount: A.pctChange(combined.orderCount, priorCombined.orderCount),
        },
        peptide,
        clinic,
      };
    }
    return A.getFinanceSummary(opts);
  }

  function financePlValueLabel(val) {
    if (val < 0) return '−' + A.formatMoney(Math.abs(val)).slice(1);
    return A.formatMoney(val);
  }

  function financeAdjustmentTailRows(f) {
    const rows = [];
    const hasAdj = (f.plAdjustments || []).length > 0;
    if (!hasAdj) return rows;
    rows.push(['Est. EBITDA (calculated)', f.ebitdaBeforeAdjustments ?? f.ebitda, false]);
    (f.plAdjustments || []).forEach((adj) => {
      rows.push([`Adj · ${adj.label}`, adj.amount, false]);
    });
    rows.push(['Adjusted EBITDA', f.adjustedEbitda ?? f.ebitda, true]);
    return rows;
  }

  function financePlRows(f) {
    const model = f.plModel || A.getPlModel();
    let base = [];
    if (financeSource === 'clinic') {
      base = [
        ['Register revenue', f.grossRevenue, true],
        ...(f.discounts ? [['POS discounts', -f.discounts, false]] : []),
        ...(f.creditApplied ? [['Studio credit applied', -f.creditApplied, false]] : []),
        [`Est. service delivery (${(model.clinicServiceCostRate * 100).toFixed(0)}%)`, -f.cogs, false],
        ['Gross profit', f.grossProfit, true],
        ['Payment processing', -f.processing, false],
        [`Marketing (${(model.clinicMarketingPct * 100).toFixed(0)}%)`, -f.marketing, false],
        [`Fixed overhead (${(model.clinicOverheadShare * 100).toFixed(0)}% share)`, -f.fixedOverhead, false],
      ];
    } else if (financeSource === 'combined') {
      base = [
        ['Total revenue', f.grossRevenue, true],
        ['Peptide COGS', -(f.peptide?.cogs || 0), false],
        ['Clinic service costs', -(f.clinic?.cogs || 0), false],
        ['Gross profit', f.grossProfit, true],
        ['Payment processing', -f.processing, false],
        ['Refund reserve / refunds', -(f.refunds || 0), false],
        ['Marketing', -f.marketing, false],
        ['Fixed overhead (prorated)', -f.fixedOverhead, false],
      ];
    } else {
      base = [
        ['Gross revenue', f.grossRevenue, true],
        ['Cost of goods sold', -f.cogs, false],
        ['Gross profit', f.grossProfit, true],
        ['Payment processing', -f.processing, false],
        [`Refund reserve (${(model.refundRate * 100).toFixed(0)}%)`, -f.refunds, false],
        [`Marketing (${(model.marketingPct * 100).toFixed(0)}%)`, -f.marketing, false],
        ['Fixed overhead (prorated)', -f.fixedOverhead, false],
      ];
    }
    const tail = financeAdjustmentTailRows(f);
    if (tail.length) return [...base, ...tail];
    base.push(['Est. EBITDA', f.ebitda, true]);
    return base;
  }

  function renderFinanceAdjustments(f, range) {
    const adjustments = f.plAdjustments || [];
    const editing = financeEditingAdjustmentId ? A.getPlAdjustment(financeEditingAdjustmentId) : null;
    const typeOptions = A.PL_ADJUSTMENT_TYPES.map((t) =>
      `<option value="${t.id}"${(editing?.type || 'other') === t.id ? ' selected' : ''}>${esc(t.label)}</option>`
    ).join('');
    const sourceOptions = A.PL_ADJUSTMENT_SOURCES.map((s) =>
      `<option value="${s}"${(editing?.source || (financeSource === 'combined' ? 'all' : financeSource)) === s ? ' selected' : ''}>${esc(s === 'all' ? 'All lines' : s.charAt(0).toUpperCase() + s.slice(1))}</option>`
    ).join('');

    return `
      <section class="admin-panel admin-finance-adjustments">
        <div class="admin-panel-head">
          <h2>P&amp;L adjustments</h2>
          <button type="button" class="btn-secondary btn-sm" id="financeToggleModelBtn">${financeShowModel ? 'Hide model' : 'Model assumptions'}</button>
        </div>
        <p class="admin-fine">Manual journal entries for the selected range. Use negative amounts for expenses. Applies to <strong>${esc(financeSource)}</strong> view and combined totals.</p>
        <form class="admin-finance-adj-form" id="financeAdjustmentForm">
          <input type="hidden" name="adjustmentId" value="${esc(editing?.id || '')}">
          <label class="form-field"><span>Date</span><input type="date" name="date" required value="${esc(editing?.date || range.endDate)}"></label>
          <label class="form-field admin-finance-adj-wide"><span>Label</span><input type="text" name="label" required placeholder="e.g. Rent true-up, Owner draw" value="${esc(editing?.label || '')}"></label>
          <label class="form-field"><span>Amount</span><input type="number" name="amount" step="0.01" required placeholder="-500 or 1200" value="${editing ? editing.amount : ''}"></label>
          <label class="form-field"><span>Type</span><select name="type">${typeOptions}</select></label>
          <label class="form-field"><span>Applies to</span><select name="source">${sourceOptions}</select></label>
          <label class="form-field admin-finance-adj-wide"><span>Notes</span><input type="text" name="notes" placeholder="Optional" value="${esc(editing?.notes || '')}"></label>
          <div class="admin-finance-adj-actions">
            <button type="submit" class="btn-primary btn-sm">${editing ? 'Save adjustment' : 'Add adjustment'}</button>
            ${editing ? '<button type="button" class="btn-secondary btn-sm" id="financeAdjCancelEditBtn">Cancel</button>' : ''}
          </div>
        </form>
        <div class="admin-table-wrap">
          <table class="admin-table admin-table-sm">
            <thead><tr><th>Date</th><th>Label</th><th>Type</th><th>Line</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              ${adjustments.map((adj) => `
                <tr>
                  <td>${esc(adj.date)}</td>
                  <td>${esc(adj.label)}${adj.notes ? `<small class="admin-fine">${esc(adj.notes)}</small>` : ''}</td>
                  <td>${esc(A.PL_ADJUSTMENT_TYPES.find((t) => t.id === adj.type)?.label || adj.type)}</td>
                  <td>${esc(adj.source === 'all' ? 'All' : adj.source)}</td>
                  <td class="${adj.amount < 0 ? 'admin-pl-neg' : ''}">${financePlValueLabel(adj.amount)}</td>
                  <td class="admin-finance-adj-btns">
                    <button type="button" class="btn-secondary btn-sm" data-finance-edit-adj="${adj.id}">Edit</button>
                    <button type="button" class="btn-secondary btn-sm" data-finance-delete-adj="${adj.id}">Delete</button>
                  </td>
                </tr>`).join('') || `<tr><td colspan="6" class="admin-empty-cell">No adjustments in ${esc(range.label)}.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function renderFinanceModelPanel() {
    if (!financeShowModel) return '';
    const model = A.getPlModel();
    return `
      <section class="admin-panel admin-finance-model">
        <h2>Model assumptions</h2>
        <p class="admin-fine">Overrides apply to calculated P&amp;L lines (before manual adjustments).</p>
        <form id="financeModelForm" class="admin-finance-model-form">
          <label class="form-field"><span>Monthly fixed overhead ($)</span><input type="number" name="monthlyFixedOverhead" min="0" step="1" value="${model.monthlyFixedOverhead}"></label>
          <label class="form-field"><span>Peptide marketing (%)</span><input type="number" name="marketingPct" min="0" max="100" step="0.1" value="${(model.marketingPct * 100).toFixed(1)}"></label>
          <label class="form-field"><span>Peptide refund reserve (%)</span><input type="number" name="refundRate" min="0" max="100" step="0.1" value="${(model.refundRate * 100).toFixed(1)}"></label>
          <label class="form-field"><span>Outbound ship cost ($)</span><input type="number" name="outboundShipCost" min="0" step="0.01" value="${model.outboundShipCost}"></label>
          <label class="form-field"><span>Clinic service cost (%)</span><input type="number" name="clinicServiceCostRate" min="0" max="100" step="0.1" value="${(model.clinicServiceCostRate * 100).toFixed(1)}"></label>
          <label class="form-field"><span>Clinic marketing (%)</span><input type="number" name="clinicMarketingPct" min="0" max="100" step="0.1" value="${(model.clinicMarketingPct * 100).toFixed(1)}"></label>
          <label class="form-field"><span>Clinic overhead share (%)</span><input type="number" name="clinicOverheadShare" min="0" max="100" step="0.1" value="${(model.clinicOverheadShare * 100).toFixed(1)}"></label>
          <button type="submit" class="btn-primary btn-sm">Save assumptions</button>
        </form>
      </section>`;
  }

  function renderFinanceLineItems(f) {
    if (financeSource === 'clinic') {
      const txs = (f.lineItems || []).filter((t) => t.type !== 'refund');
      return `
        <h2>Register sales</h2>
        <div class="admin-table-wrap">
          <table class="admin-table admin-table-sm">
            <thead><tr><th>Transaction</th><th>Client</th><th>Revenue</th><th>Date</th></tr></thead>
            <tbody>
              ${txs.map((t) => `
                <tr>
                  <td>${esc(t.id)}</td>
                  <td>${esc(t.clientName || '—')}</td>
                  <td>${window.RenvoaStudios?.formatPrice(t.total) || A.formatMoney(t.total)}</td>
                  <td>${A.formatDate(t.at)}</td>
                </tr>`).join('') || '<tr><td colspan="4" class="admin-empty-cell">No register sales in this range.</td></tr>'}
            </tbody>
          </table>
        </div>`;
    }
    const orders = f.lineItems || A.getOrdersInRange(f.range.startDate, f.range.endDate);
    return `
      <h2>Revenue by order</h2>
      <div class="admin-table-wrap">
        <table class="admin-table admin-table-sm">
          <thead><tr><th>Order</th><th>Revenue</th><th>COGS</th><th>Contribution</th></tr></thead>
          <tbody>
            ${orders.map((o) => `
              <tr>
                <td>${esc(o.id)}</td>
                <td>${A.formatMoney(o.total)}</td>
                <td>${A.formatMoney(A.orderCogs(o))}</td>
                <td>${A.formatMoney(A.calcOrderProfit(o))}</td>
              </tr>`).join('') || '<tr><td colspan="4" class="admin-empty-cell">No orders in this range.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  }

  function renderFinance() {
    const f = getActiveFinanceSummary();
    const goals = A.getGoals();
    const range = f.range || A.resolveFinanceRange(financePreset, financeStartDate, financeEndDate);
    const rows = financePlRows(f);
    const countLabel = financeSource === 'clinic' ? 'transactions' : 'orders';
    const count = f.transactionCount ?? f.orderCount ?? f.monthOrders ?? 0;
    const presets = [
      ['mtd', 'Month to date'],
      ['last_month', 'Last month'],
      ['last_7_days', 'Last 7 days'],
      ['last_30_days', 'Last 30 days'],
      ['last_90_days', 'Last 90 days'],
      ['ytd', 'Year to date'],
      ['all_time', 'All time'],
    ];
    const sources = [
      ['peptide', 'Peptide'],
      ['clinic', 'Clinic'],
      ['combined', 'Combined'],
    ];
    const goalRevenue = financePreset === 'mtd' || financePreset === 'last_month'
      ? goals.monthlyRevenue
      : null;

    return `
      <div class="admin-page-head">
        <h1>Finance &amp; P&amp;L</h1>
        <p>Actuals for <strong>${esc(range.label)}</strong> (${A.formatRangeLabel(range.startDate, range.endDate)}) with prior-period comparison.</p>
      </div>
      <section class="admin-panel admin-finance-toolbar">
        <div class="admin-finance-toolbar-row">
          <div class="admin-finance-presets" role="tablist" aria-label="Date range presets">
            ${presets.map(([id, label]) => `
              <button type="button" class="admin-finance-preset${financePreset === id ? ' active' : ''}" data-finance-preset="${id}">${label}</button>`).join('')}
          </div>
          <div class="admin-finance-sources" role="tablist" aria-label="Business line">
            ${sources.map(([id, label]) => `
              <button type="button" class="admin-finance-source${financeSource === id ? ' active' : ''}" data-finance-source="${id}">${label}</button>`).join('')}
          </div>
        </div>
        <div class="admin-finance-custom">
          <label class="form-field admin-finance-date-field">
            <span>From</span>
            <input type="date" id="financeStartDate" value="${esc(financePreset === 'custom' ? financeStartDate : range.startDate)}">
          </label>
          <label class="form-field admin-finance-date-field">
            <span>To</span>
            <input type="date" id="financeEndDate" value="${esc(financePreset === 'custom' ? financeEndDate : range.endDate)}">
          </label>
          <button type="button" class="btn-secondary btn-sm" id="financeApplyRangeBtn">Apply custom range</button>
          <span class="admin-fine">${A.daysInclusive(range.startDate, range.endDate)} day${A.daysInclusive(range.startDate, range.endDate) !== 1 ? 's' : ''} · Prior: ${esc(A.formatRangeLabel(f.priorRange.startDate, f.priorRange.endDate))}</span>
        </div>
      </section>
      <div class="admin-kpi-grid">
        ${kpiCard('Revenue', A.formatMoney(f.grossRevenue), formatFinanceCompare(f.compare?.grossRevenue))}
        ${kpiCard('Gross margin', (f.grossMargin * 100).toFixed(1) + '%', financeSource === 'clinic' ? 'After est. service costs' : 'After landed COGS')}
        ${kpiCard(`Avg ${countLabel.slice(0, -1)} value`, A.formatMoney(f.avgOrderValue), `${count} ${countLabel}`)}
        ${kpiCard((f.plAdjustments || []).length ? 'Adjusted EBITDA' : 'Est. EBITDA', A.formatMoney(f.ebitda), formatFinanceCompare(f.compare?.ebitda) || ((f.plAdjustments || []).length ? `${f.plAdjustments.length} adjustment${f.plAdjustments.length !== 1 ? 's' : ''}` : (f.ebitda >= 0 ? 'On track' : 'Below break-even')))}
      </div>
      ${renderFinanceModelPanel()}
      <div class="admin-split">
        <section class="admin-panel">
          <h2>P&amp;L statement</h2>
          <div class="admin-pl-table">
            ${rows.map(([label, val, bold]) => `
              <div class="admin-pl-row${bold ? ' admin-pl-bold' : ''}">
                <span>${label}</span>
                <span class="${val < 0 ? 'admin-pl-neg' : ''}">${financePlValueLabel(val)}</span>
              </div>`).join('')}
          </div>
          <p class="admin-fine">${financeSource === 'clinic'
            ? `Clinic model uses editable assumptions below. Manual adjustments layer on top.`
            : financeSource === 'combined'
              ? 'Combined view sums peptide orders and clinic register sales, including adjustments from both lines.'
              : 'Peptide model uses editable assumptions. Manual adjustments layer on top.'}
            <a href="../RENVOA_CLINIC_PL.xlsx">Full spreadsheet →</a></p>
        </section>
        <section class="admin-panel">
          ${renderFinanceLineItems(f)}
          ${goalRevenue ? progressBar('Revenue vs monthly goal', f.grossRevenue, goalRevenue, A.formatMoney) : ''}
        </section>
      </div>
      ${renderFinanceAdjustments(f, range)}`;
  }

  function renderGoals() {
    const goals = A.getGoals();
    const f = A.getFinanceSummary();

    return `
      <div class="admin-page-head">
        <h1>Goals</h1>
        <p>Set monthly targets and track progress against live order data.</p>
      </div>
      <div class="admin-split">
        <section class="admin-panel">
          <h2>Current month</h2>
          ${progressBar('Revenue', f.grossRevenue, goals.monthlyRevenue, A.formatMoney)}
          ${progressBar('Orders', f.monthOrders, goals.monthlyOrders, (n) => n)}
          ${progressBar('EBITDA / profit', Math.max(0, f.ebitda), goals.monthlyProfit, A.formatMoney)}
          <p class="admin-goal-gap">Gap to revenue goal: <strong>${A.formatMoney(Math.max(0, goals.monthlyRevenue - f.grossRevenue))}</strong></p>
          <p class="admin-goal-gap">Orders needed at current AOV: <strong>${f.avgOrderValue ? Math.ceil(Math.max(0, goals.monthlyRevenue - f.grossRevenue) / f.avgOrderValue) : '—'}</strong></p>
        </section>
        <section class="admin-panel">
          <h2>Edit targets</h2>
          <form id="goalsForm" class="admin-goals-form">
            <label class="form-field"><span>Monthly revenue target ($)</span>
              <input type="number" id="goalRevenue" value="${goals.monthlyRevenue}" min="0" step="100">
            </label>
            <label class="form-field"><span>Monthly orders target</span>
              <input type="number" id="goalOrders" value="${goals.monthlyOrders}" min="0" step="1">
            </label>
            <label class="form-field"><span>Monthly profit / EBITDA target ($)</span>
              <input type="number" id="goalProfit" value="${goals.monthlyProfit}" min="0" step="100">
            </label>
            <label class="form-field"><span>Quarterly revenue target ($)</span>
              <input type="number" id="goalQuarterly" value="${goals.quarterlyRevenue || goals.monthlyRevenue * 3}" min="0" step="500">
            </label>
            <button type="submit" class="btn-primary">Save goals</button>
            <p class="admin-save-ok" id="goalsSaved" hidden>Goals saved.</p>
          </form>
        </section>
      </div>
      <section class="admin-panel">
        <h2>Year 1 benchmarks (from P&amp;L model)</h2>
        <div class="admin-benchmark-grid">
          <div><span>Break-even orders/mo</span><strong>~102</strong></div>
          <div><span>Base case orders/mo</span><strong>150</strong></div>
          <div><span>Year 1 EBITDA (base)</span><strong>~$5K</strong></div>
          <div><span>Launch ramp M1 → M12</span><strong>40 → 200</strong></div>
        </div>
      </section>`;
  }

  function bindViewEvents() {
    $$('[data-goto]').forEach((el) => {
      el.addEventListener('click', () => {
        if (el.dataset.crmEmail) {
          selectedCustomerEmail = el.dataset.crmEmail;
        }
        if (el.dataset.posOrder) {
          selectedPOSOrderId = el.dataset.posOrder;
          posSubView = 'quotes';
        }
        if (el.dataset.order) {
          selectedOrderId = el.dataset.order;
        }
        if (el.dataset.studioTab) {
          studioSubView = el.dataset.studioTab;
        }
        if (el.dataset.prefillName) {
          studioPrefill = {
            name: el.dataset.prefillName || '',
            phone: el.dataset.prefillPhone || '',
          };
        }
        if (el.dataset.goto) {
          businessMode = 'peptide';
          activeView = el.dataset.goto;
          updateBusinessModeUI();
        }
        renderView();
      });
    });

    $$('[data-pos-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        posSubView = el.dataset.posTab;
        renderView();
      });
    });

    $$('[data-pos-order]:not([data-goto])').forEach((el) => {
      el.addEventListener('click', () => {
        selectedPOSOrderId = el.dataset.posOrder;
        renderView();
      });
    });

    $('#confirmPosPricingBtn')?.addEventListener('click', () => {
      const orderId = $('#confirmPosPricingBtn').dataset.order;
      const order = A.getOrders().find((o) => o.id === orderId);
      if (!order || !window.RenvoaPOS) return;
      const pricing = getOrderPricing(order);
      if (!pricing) return;
      window.RenvoaPOS.applyPricingToOrder(orderId, pricing);
      selectedPOSOrderId = null;
      selectedOrderId = orderId;
      updatePosBadge();
      updateNewBadge();
      renderView();
    });

    $$('.pos-save-variant').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        if (!row || !window.RenvoaPOS) return;
        const productId = btn.dataset.product;
        const variantKey = btn.dataset.variant;
        const price = Number(row.querySelector('[data-field="price"]')?.value);
        const cogs = Number(row.querySelector('[data-field="cogs"]')?.value);
        const overrides = JSON.parse(localStorage.getItem('renvoa-pos-pricing') || '{}');
        const existing = overrides[productId] || {};
        const variants = { ...(existing.variants || {}) };
        variants[variantKey] = { ...(variants[variantKey] || {}), price, cogs };
        window.RenvoaPOS.updateProductPricing(productId, { variants });
        btn.textContent = 'Saved';
        setTimeout(() => { btn.textContent = 'Save'; }, 1500);
      });
    });

    $$('.admin-row-click, .admin-order-card:not([data-pos-order]):not([data-studio-inquiry]):not([data-studio-client]):not([data-studio-staff]), .admin-kanban-card').forEach((el) => {
      el.addEventListener('click', () => {
        selectedOrderId = el.dataset.order;
        if (activeView === 'pipeline' || el.classList.contains('admin-row-click')) {
          businessMode = 'peptide';
          activeView = 'orders';
          updateBusinessModeUI();
        }
        renderView();
      });
    });

    $$('.admin-client-card').forEach((el) => {
      el.addEventListener('click', () => {
        selectedCustomerEmail = el.dataset.client;
        renderView();
      });
    });

    $$('[data-crm]').forEach((el) => {
      el.addEventListener('click', () => {
        selectedCRMEmail = el.dataset.crm;
        if (crmSubView === 'pipeline' || crmSubView === 'tasks') {
          crmSubView = 'contacts';
        }
        renderView();
      });
    });

    $$('[data-crm-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        crmSubView = el.dataset.crmTab;
        renderView();
      });
    });

    $$('[data-crm-stage]').forEach((el) => {
      el.addEventListener('click', () => {
        crmStageFilter = el.dataset.crmStage;
        renderView();
      });
    });

    $$('.crm-pipeline-card').forEach((el) => {
      el.addEventListener('click', () => {
        selectedCRMEmail = el.dataset.crm;
        crmSubView = 'contacts';
        renderView();
      });
    });

    $('#crmSearch')?.addEventListener('input', (e) => {
      crmSearch = e.target.value;
      scheduleRenderView(180);
    });

    $('#crmAddToggle')?.addEventListener('click', () => {
      const form = $('#crmAddForm');
      if (form) form.hidden = !form.hidden;
    });

    $('#crmAddForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const contact = A.addCRMContact({
        name: $('#crmAddName').value.trim(),
        email: $('#crmAddEmail').value.trim(),
        company: $('#crmAddCompany').value.trim(),
        stage: $('#crmAddStage').value,
        source: 'manual',
      });
      if (contact) {
        selectedCRMEmail = contact.email;
        crmSearch = '';
        crmSubView = 'contacts';
        updateCrmBadge();
        renderView();
      }
    });

    $('#crmProfileForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedCRMEmail) return;
      A.updateCRMContact(selectedCRMEmail, {
        name: $('#crmName').value.trim(),
        company: $('#crmCompany').value.trim(),
        title: $('#crmTitle').value.trim(),
        phone: $('#crmPhone').value.trim(),
        stage: $('#crmStage').value,
        tags: $('#crmTags').value.split(',').map((t) => t.trim()).filter(Boolean),
      });
      updateCrmBadge();
      renderView();
    });

    $('#crmNoteForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('#crmNoteText').value;
      A.addCRMNote(selectedCRMEmail, text);
      updateCrmBadge();
      renderView();
    });

    $('#crmFollowUpForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      A.addCRMFollowUp(selectedCRMEmail, $('#crmFollowDue').value, $('#crmFollowNote').value);
      updateCrmBadge();
      renderView();
    });

    $$('[data-complete-followup]').forEach((el) => {
      el.addEventListener('click', () => {
        const email = el.dataset.crmEmail || selectedCRMEmail;
        A.completeCRMFollowUp(email, el.dataset.completeFollowup);
        updateCrmBadge();
        renderView();
      });
    });

    $('#crmLogCallBtn')?.addEventListener('click', () => {
      const note = prompt('Call notes:');
      if (note?.trim()) {
        A.addCRMActivity(selectedCRMEmail, { type: 'call', text: note.trim() });
        updateCrmBadge();
        renderView();
      }
    });

    $('#orderStatusFilter')?.addEventListener('change', renderView);

    $('#updateStatusBtn')?.addEventListener('click', () => {
      const status = $('#orderStatusSelect').value;
      const note = $('#statusNoteInput').value.trim();
      A.updateOrder(selectedOrderId, { status, statusNote: note });
      updateNewBadge();
      updatePosBadge();
      renderView();
    });

    $('#saveTrackingBtn')?.addEventListener('click', () => {
      A.updateOrder(selectedOrderId, { tracking: $('#trackingInput').value.trim() });
      renderView();
    });

    $('#saveNotesBtn')?.addEventListener('click', () => {
      A.updateOrder(selectedOrderId, { internalNotes: $('#internalNotesInput').value.trim() });
      renderView();
    });

    $('#emailCustomerBtn')?.addEventListener('click', () => {
      const order = A.getOrders().find((o) => o.id === selectedOrderId);
      if (!order) return;
      const subject = encodeURIComponent(`ONYX Peptides — Order ${order.id}`);
      const body = encodeURIComponent(`Hi ${order.customer?.name},\n\nRegarding your order ${order.id}...\n\n— ONYX Peptides`);
      window.location.href = `mailto:${order.customer?.email}?subject=${subject}&body=${body}`;
    });

    $('#composeForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const subject = $('#composeSubject').value.trim();
      const body = $('#composeBody').value.trim();
      const customer = A.getCustomers().find((c) => c.email === selectedCustomerEmail);
      if (!customer) return;

      A.addMessage({
        customerEmail: customer.email,
        customerName: customer.name,
        subject,
        body,
        direction: 'outbound',
      });

      window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });

    $$('[data-finance-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        financePreset = btn.dataset.financePreset;
        financeStartDate = '';
        financeEndDate = '';
        renderView();
      });
    });

    $$('[data-finance-source]').forEach((btn) => {
      btn.addEventListener('click', () => {
        financeSource = btn.dataset.financeSource;
        renderView();
      });
    });

    $('#financeToggleModelBtn')?.addEventListener('click', () => {
      financeShowModel = !financeShowModel;
      renderView();
    });

    $('#financeAdjustmentForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        date: String(fd.get('date') || '').trim(),
        label: String(fd.get('label') || '').trim(),
        amount: Number(fd.get('amount')),
        type: String(fd.get('type') || 'other'),
        source: String(fd.get('source') || 'all'),
        notes: String(fd.get('notes') || '').trim(),
      };
      if (!payload.label || !Number.isFinite(payload.amount)) return;
      const id = String(fd.get('adjustmentId') || '').trim();
      if (id) A.updatePlAdjustment(id, payload);
      else A.addPlAdjustment(payload);
      financeEditingAdjustmentId = '';
      renderView();
    });

    $('#financeAdjCancelEditBtn')?.addEventListener('click', () => {
      financeEditingAdjustmentId = '';
      renderView();
    });

    $$('[data-finance-edit-adj]').forEach((btn) => {
      btn.addEventListener('click', () => {
        financeEditingAdjustmentId = btn.dataset.financeEditAdj;
        renderView();
      });
    });

    $$('[data-finance-delete-adj]').forEach((btn) => {
      btn.addEventListener('click', () => {
        A.deletePlAdjustment(btn.dataset.financeDeleteAdj);
        if (financeEditingAdjustmentId === btn.dataset.financeDeleteAdj) financeEditingAdjustmentId = '';
        renderView();
      });
    });

    $('#financeModelForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      A.savePlModel({
        monthlyFixedOverhead: Number(fd.get('monthlyFixedOverhead')),
        marketingPct: Number(fd.get('marketingPct')) / 100,
        refundRate: Number(fd.get('refundRate')) / 100,
        outboundShipCost: Number(fd.get('outboundShipCost')),
        clinicServiceCostRate: Number(fd.get('clinicServiceCostRate')) / 100,
        clinicMarketingPct: Number(fd.get('clinicMarketingPct')) / 100,
        clinicOverheadShare: Number(fd.get('clinicOverheadShare')) / 100,
      });
      renderView();
    });

    $('#financeApplyRangeBtn')?.addEventListener('click', () => {
      const start = $('#financeStartDate')?.value || '';
      const end = $('#financeEndDate')?.value || '';
      if (!start || !end) {
        studioNotify('Choose both start and end dates.', 'error');
        renderView();
        return;
      }
      financePreset = 'custom';
      financeStartDate = start;
      financeEndDate = end;
      renderView();
    });

    $('#goalsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      A.saveGoals({
        monthlyRevenue: Number($('#goalRevenue').value),
        monthlyOrders: Number($('#goalOrders').value),
        monthlyProfit: Number($('#goalProfit').value),
        quarterlyRevenue: Number($('#goalQuarterly').value),
      });
      const saved = $('#goalsSaved');
      if (saved) {
        saved.hidden = false;
        setTimeout(() => { saved.hidden = true; }, 2500);
      }
      renderView();
    });
  }

  function handleLogin(e) {
    if (e) e.preventDefault();
    const sysErr = $('#loginSystemError');
    const errEl = $('#loginError');
    const btn = $('#loginBtn');
    if (!A) {
      if (sysErr) {
        sysErr.textContent = 'Admin scripts did not load. Hard-refresh the page (Cmd+Shift+R).';
        sysErr.hidden = false;
      }
      return;
    }
    if (!window.__renvoaAdminReady) {
      if (sysErr) {
        sysErr.textContent = 'Portal is still loading — wait a moment and try again.';
        sysErr.hidden = false;
      }
      return;
    }
    const pw = ($('#loginPassword')?.value || '').trim();
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Unlocking…';
    }
    try {
      if (A.login(pw)) {
        if (errEl) errEl.hidden = true;
        if (sysErr) sysErr.hidden = true;
        renderApp();
      } else if (errEl) {
        errEl.hidden = false;
        if (sysErr) sysErr.hidden = true;
      }
    } catch (err) {
      console.error('RENVOA admin login error:', err);
      if (sysErr) {
        sysErr.textContent = 'Login error: ' + err.message;
        sysErr.hidden = false;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Unlock';
      }
    }
  }

  function markPortalReady() {
    window.__renvoaAdminReady = true;
    const btn = $('#loginBtn');
    const input = $('#loginPassword');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Unlock';
    }
    if (input && !input.value) input.placeholder = 'onyx2026';
  }

  async function boot() {
    if (!A) {
      const sysErr = $('#loginSystemError');
      if (sysErr) {
        sysErr.textContent = 'Admin scripts did not load. Hard-refresh (Cmd+Shift+R) or use http://localhost:8080/admin/index.html';
        sysErr.hidden = false;
      }
      const btn = $('#loginBtn');
      if (btn) btn.textContent = 'Unavailable';
      return;
    }

    const btn = $('#loginBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = window.StudioStorage?.isCloudEnabled?.() ? 'Connecting cloud…' : 'Loading portal…';
    }
    try {
      const storageStatus = await window.StudioStorage?.whenReady?.();
      if (storageStatus?.error) {
        const sysErr = $('#loginSystemError');
        if (sysErr) {
          sysErr.textContent = `Cloud sync unavailable (${storageStatus.error}). Using local data on this device.`;
          sysErr.hidden = false;
        }
      }
    } catch (err) {
      console.error('Studio storage boot error', err);
    }

    $('#loginForm')?.addEventListener('submit', handleLogin);
    markPortalReady();
    window.StudioCalendar?.init();

    mainEl?.addEventListener('click', (e) => {
      const card = e.target.closest('[data-studio-client]');
      if (!card || !mainEl.contains(card)) return;
      if (businessMode !== 'clinic' || studioSubView !== 'clients') return;
      if (selectStudioClient(card.dataset.studioClient)) renderView();
    });

    $('#logoutBtn')?.addEventListener('click', () => {
      A?.logout();
      renderLogin();
    });

    $$('[data-business-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setBusinessMode(btn.dataset.businessMode);
      });
    });

    $$('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        businessMode = 'peptide';
        activeView = btn.dataset.view;
        if (btn.dataset.view === 'finance' && financeSource === 'clinic') financeSource = 'peptide';
        updateBusinessModeUI();
        renderView();
      });
    });

    $$('[data-clinic-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.clinicTab === 'finance') {
          businessMode = 'clinic';
          activeView = 'finance';
          financeSource = 'clinic';
          studioFlash = '';
          updateBusinessModeUI();
          renderView();
          return;
        }
        businessMode = 'clinic';
        studioSubView = btn.dataset.clinicTab;
        studioFlash = '';
        updateBusinessModeUI();
        renderView();
      });
    });

    window.StudioStorage?.onChange?.(() => {
      if (A?.isAuthed() && businessMode === 'clinic') scheduleRenderView();
    });

    window.addEventListener('studio-storage-remote', () => {
      if (A?.isAuthed() && businessMode === 'clinic') scheduleRenderView();
    });

    if (A?.isAuthed()) {
      try { A.ensureSeedData(); } catch (err) { console.error(err); }
      renderApp();
    } else {
      renderLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot(); });
  } else {
    boot();
  }
})();