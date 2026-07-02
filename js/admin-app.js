(function () {
  'use strict';

  const A = window.RenvoaAdmin;
  const C = window.RenvoaCart;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  if (!A) {
    document.body.insertAdjacentHTML('beforeend',
      '<p style="position:fixed;bottom:20px;left:20px;right:20px;background:#ff3b30;color:#fff;padding:16px;border-radius:12px;z-index:9999;font-family:system-ui;">Admin failed to load. Refresh the page or check that /js/admin-data.js is reachable.</p>');
  }

  let activeView = 'overview';
  let selectedOrderId = null;
  let selectedCustomerEmail = null;
  let selectedCRMEmail = null;
  let crmSubView = 'contacts';
  let crmStageFilter = '';
  let crmSearch = '';

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
      meta.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    try {
      updateNewBadge();
      updateCrmBadge();
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

  function renderView() {
    const views = {
      overview: renderOverview,
      orders: renderOrders,
      pipeline: renderPipeline,
      crm: renderCRM,
      messages: renderMessages,
      finance: renderFinance,
      goals: renderGoals,
    };
    mainEl.innerHTML = views[activeView]?.() || '';
    bindViewEvents();
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
                  <td>${A.formatMoney(o.total)}</td>
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

    const items = (order.items || []).map((item) => `
      <div class="admin-line-item">
        <span>${itemLabel(item)} × ${item.qty}</span>
        <span>${A.formatMoney(C.getItemPrice(item) * item.qty)}</span>
      </div>`).join('');

    return `
      <div class="admin-detail">
        <div class="admin-detail-head">
          <div>
            <h2>${order.id}</h2>
            <p>${A.formatDate(order.date)} · ${order.customer?.email}</p>
          </div>
          <span class="admin-status-pill" style="--pill-color:${statusMeta(order.status).color}">${statusMeta(order.status).label}</span>
        </div>

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

        <h3>Items</h3>
        ${items}
        ${order.bacWater ? '<div class="admin-line-item"><span>Bacteriostatic Water 30mL</span><span>$12.00</span></div>' : ''}
        <div class="admin-line-item admin-line-total"><span>Total</span><span>${A.formatMoney(order.total)}</span></div>
        <p class="admin-detail-meta">Est. COGS ${A.formatMoney(A.orderCogs(order))} · Est. contribution ${A.formatMoney(A.calcOrderProfit(order))}</p>

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
                  <span>${A.formatMoney(o.total)}</span>
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
                  <span>${A.formatMoney(o.total)}</span>
                </button>`).join('') || '<p class="admin-kanban-empty">—</p>'}
            </div>
          </div>`;
        }).join('')}
      </div>`;
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
              <a href="mailto:${selected.email}?subject=${encodeURIComponent('RENVOA CLINIC — Your order')}" class="link-cta admin-link-btn">Open in Mail</a>
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

  function renderFinance() {
    const f = A.getFinanceSummary();
    const goals = A.getGoals();
    const orders = A.getCurrentMonthOrders();

    const rows = [
      ['Gross revenue', f.grossRevenue, true],
      ['Cost of goods sold', -f.cogs, false],
      ['Gross profit', f.grossProfit, true],
      ['Payment processing', -f.processing, false],
      ['Refund reserve (3%)', -f.refunds, false],
      ['Marketing (25%)', -f.marketing, false],
      ['Fixed overhead', -f.fixedOverhead, false],
      ['Est. EBITDA', f.ebitda, true],
    ];

    return `
      <div class="admin-page-head">
        <h1>Finance &amp; P&amp;L</h1>
        <p>Actuals from live orders blended with your Year 1 model assumptions.</p>
      </div>
      <div class="admin-kpi-grid">
        ${kpiCard('Revenue (MTD)', A.formatMoney(f.grossRevenue), `All-time ${A.formatMoney(f.grossRevenueAll)}`)}
        ${kpiCard('Gross margin', (f.grossMargin * 100).toFixed(1) + '%', 'After landed COGS')}
        ${kpiCard('Avg order value', A.formatMoney(f.avgOrderValue), `${f.monthOrders} orders this month`)}
        ${kpiCard('Est. EBITDA', A.formatMoney(f.ebitda), f.ebitda >= 0 ? 'On track' : 'Below break-even')}
      </div>
      <div class="admin-split">
        <section class="admin-panel">
          <h2>Monthly P&amp;L (actuals)</h2>
          <div class="admin-pl-table">
            ${rows.map(([label, val, bold]) => `
              <div class="admin-pl-row${bold ? ' admin-pl-bold' : ''}">
                <span>${label}</span>
                <span class="${val < 0 ? 'admin-pl-neg' : ''}">${val < 0 ? '−' + A.formatMoney(Math.abs(val)).slice(1) : A.formatMoney(val)}</span>
              </div>`).join('')}
          </div>
          <p class="admin-fine">Model assumptions: 25% marketing, $1,850/mo fixed overhead, 2.9% + $0.30 processing, 3% refund reserve. <a href="../RENVOA_CLINIC_PL.xlsx">Full spreadsheet →</a></p>
        </section>
        <section class="admin-panel">
          <h2>Revenue by order</h2>
          <div class="admin-table-wrap">
            <table class="admin-table admin-table-sm">
              <thead><tr><th>Order</th><th>Revenue</th><th>COGS</th><th>Contribution</th></tr></thead>
              <tbody>
                ${orders.map((o) => `
                  <tr>
                    <td>${o.id}</td>
                    <td>${A.formatMoney(o.total)}</td>
                    <td>${A.formatMoney(A.orderCogs(o))}</td>
                    <td>${A.formatMoney(A.calcOrderProfit(o))}</td>
                  </tr>`).join('') || '<tr><td colspan="4" class="admin-empty-cell">No orders this month.</td></tr>'}
              </tbody>
            </table>
          </div>
          ${progressBar('Revenue vs goal', f.grossRevenue, goals.monthlyRevenue, A.formatMoney)}
        </section>
      </div>`;
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
        activeView = el.dataset.goto;
        $$('.admin-nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === activeView));
        renderView();
      });
    });

    $$('.admin-row-click, .admin-order-card, .admin-kanban-card').forEach((el) => {
      el.addEventListener('click', () => {
        selectedOrderId = el.dataset.order;
        if (activeView === 'pipeline' || el.classList.contains('admin-row-click')) {
          activeView = 'orders';
          $$('.admin-nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === 'orders'));
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
      renderView();
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
      const subject = encodeURIComponent(`RENVOA CLINIC — Order ${order.id}`);
      const body = encodeURIComponent(`Hi ${order.customer?.name},\n\nRegarding your order ${order.id}...\n\n— RENVOA CLINIC`);
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

  $('#loginForm')?.addEventListener('submit', handleLogin);

  $('#logoutBtn')?.addEventListener('click', () => {
    A.logout();
    renderLogin();
  });

  $$('.admin-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeView = btn.dataset.view;
      $$('.admin-nav-item').forEach((n) => n.classList.toggle('active', n === btn));
      renderView();
    });
  });

  if (A?.isAuthed()) {
    try { A.ensureSeedData(); } catch (err) { console.error(err); }
    renderApp();
  } else {
    renderLogin();
  }
})();