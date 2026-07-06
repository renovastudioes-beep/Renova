window.RenvoaAdmin = (function () {
  'use strict';

  const KEYS = {
    orders: 'renvoa-orders',
    messages: 'renvoa-admin-messages',
    goals: 'renvoa-admin-goals',
    crm: 'renvoa-crm-contacts',
    session: 'renvoa-admin-session',
    seeded: 'renvoa-admin-seeded',
    plAdjustments: 'renvoa-pl-adjustments',
    plModel: 'renvoa-pl-model',
  };

  const PL_ADJUSTMENT_SOURCES = ['all', 'peptide', 'clinic'];
  const PL_ADJUSTMENT_TYPES = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'expense', label: 'Expense' },
    { id: 'cogs', label: 'COGS / delivery' },
    { id: 'other', label: 'Other (EBITDA)' },
  ];

  const CRM_STAGES = [
    { id: 'lead', label: 'Lead', color: '#86868b' },
    { id: 'qualified', label: 'Qualified', color: '#0071e3' },
    { id: 'customer', label: 'Customer', color: '#30d158' },
    { id: 'repeat', label: 'Repeat', color: '#5ac8fa' },
    { id: 'vip', label: 'VIP', color: '#bf5af2' },
    { id: 'churned', label: 'Churned', color: '#ff3b30' },
  ];

  const CRM_SOURCES = ['order', 'wholesale', 'subscriber', 'manual', 'referral'];

  const ORDER_STATUSES = [
    { id: 'new', label: 'New', color: '#0071e3' },
    { id: 'processing', label: 'Processing', color: '#bf5af2' },
    { id: 'packed', label: 'Packed', color: '#ff9f0a' },
    { id: 'shipped', label: 'Shipped', color: '#30d158' },
    { id: 'delivered', label: 'Delivered', color: '#34c759' },
    { id: 'cancelled', label: 'Cancelled', color: '#ff3b30' },
  ];

  const LANDED_COGS = {
    'bpc-157': 19,
    'tb-500': 33,
    'semaglutide': 12,
    'ipamorelin': 13,
    'cjc-1295': 18,
    'ghk-cu': 17,
    'recovery-stack': 52,
    'gh-stack': 28,
    'bac-water': 4,
  };

  const DEFAULT_PL_MODEL = {
    monthlyFixedOverhead: 1850,
    marketingPct: 0.25,
    processingRate: 0.029,
    processingFee: 0.30,
    refundRate: 0.03,
    outboundShipCost: 12,
    clinicServiceCostRate: 0.18,
    clinicMarketingPct: 0.08,
    clinicOverheadShare: 0.45,
  };

  function getPlModel() {
    return { ...DEFAULT_PL_MODEL, ...read(KEYS.plModel, {}) };
  }

  function savePlModel(patch) {
    const next = { ...getPlModel(), ...patch };
    write(KEYS.plModel, next);
    return next;
  }

  function getPlAdjustments() {
    return read(KEYS.plAdjustments, []).sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
  }

  function getPlAdjustment(id) {
    return getPlAdjustments().find((a) => a.id === id) || null;
  }

  function addPlAdjustment(data) {
    const list = getPlAdjustments();
    const entry = {
      id: 'PLA-' + Date.now().toString(36).toUpperCase(),
      date: data.date || todayISO(),
      label: data.label || 'Adjustment',
      amount: Number(data.amount) || 0,
      type: data.type || 'other',
      source: PL_ADJUSTMENT_SOURCES.includes(data.source) ? data.source : 'all',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(entry);
    write(KEYS.plAdjustments, list);
    return entry;
  }

  function updatePlAdjustment(id, patch) {
    const list = getPlAdjustments();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    list[idx] = {
      ...list[idx],
      ...patch,
      amount: patch.amount != null ? Number(patch.amount) : list[idx].amount,
      updatedAt: new Date().toISOString(),
    };
    write(KEYS.plAdjustments, list);
    return list[idx];
  }

  function deletePlAdjustment(id) {
    const list = getPlAdjustments().filter((a) => a.id !== id);
    write(KEYS.plAdjustments, list);
  }

  function plAdjustmentAppliesToSource(adj, activeSource) {
    if (!adj) return false;
    if (adj.source === 'all') return true;
    if (activeSource === 'combined') return true;
    return adj.source === activeSource;
  }

  function getPlAdjustmentsInRange(startIso, endIso, activeSource) {
    return getPlAdjustments().filter((a) => {
      const d = (a.date || '').slice(0, 10);
      if (!d || d < startIso || d > endIso) return false;
      return plAdjustmentAppliesToSource(a, activeSource);
    });
  }

  function summarizePlAdjustments(adjustments) {
    const revenue = adjustments.filter((a) => a.type === 'revenue').reduce((s, a) => s + a.amount, 0);
    const expense = adjustments.filter((a) => a.type === 'expense').reduce((s, a) => s + a.amount, 0);
    const cogs = adjustments.filter((a) => a.type === 'cogs').reduce((s, a) => s + a.amount, 0);
    const other = adjustments.filter((a) => a.type === 'other').reduce((s, a) => s + a.amount, 0);
    const net = adjustments.reduce((s, a) => s + a.amount, 0);
    return { revenue, expense, cogs, other, net, count: adjustments.length };
  }

  function applyPlAdjustmentsToSummary(summary, startIso, endIso, activeSource) {
    const adjustments = getPlAdjustmentsInRange(startIso, endIso, activeSource);
    const adj = summarizePlAdjustments(adjustments);
    const baseEbitda = summary.ebitda || 0;
    const adjustedEbitda = baseEbitda + adj.net;
    return {
      ...summary,
      plAdjustments: adjustments,
      adjustmentsSummary: adj,
      adjustmentsNet: adj.net,
      ebitdaBeforeAdjustments: baseEbitda,
      ebitda: adjustedEbitda,
      adjustedEbitda,
    };
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatMoney(n) {
    return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  function readSessionRaw() {
    try {
      return sessionStorage.getItem(KEYS.session) || localStorage.getItem(KEYS.session);
    } catch {
      try {
        return localStorage.getItem(KEYS.session);
      } catch {
        return null;
      }
    }
  }

  function writeSessionRaw(value) {
    try {
      sessionStorage.setItem(KEYS.session, value);
      return true;
    } catch {
      try {
        localStorage.setItem(KEYS.session, value);
        return true;
      } catch {
        return false;
      }
    }
  }

  function clearSessionRaw() {
    try { sessionStorage.removeItem(KEYS.session); } catch { /* ignore */ }
    try { localStorage.removeItem(KEYS.session); } catch { /* ignore */ }
  }

  function isAuthed() {
    const session = readSessionRaw();
    if (!session) return false;
    try {
      const data = JSON.parse(session);
      const maxAge = 8 * 60 * 60 * 1000;
      return Date.now() - data.at < maxAge;
    } catch {
      return false;
    }
  }

  function login(password) {
    const cfg = window.RENVOA_CONFIG;
    const expected = String(cfg?.adminPassword || 'onyx2026').trim().toLowerCase();
    const attempt = String(password || '').trim().toLowerCase();
    if (!attempt || attempt !== expected) return false;
    if (!writeSessionRaw(JSON.stringify({ at: Date.now() }))) {
      throw new Error('Could not save login session. Allow site storage and try again.');
    }
    try {
      ensureSeedData();
    } catch (err) {
      console.error('RENVOA admin seed error:', err);
    }
    return true;
  }

  function logout() {
    clearSessionRaw();
  }

  function getOrders() {
    return read(KEYS.orders, []).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function saveOrders(orders) {
    write(KEYS.orders, orders);
  }

  function registerOrder(order) {
    const orders = getOrders();
    const enriched = {
      ...order,
      status: 'new',
      pricingStatus: order.pricingStatus || (order.total != null ? 'confirmed' : 'pending'),
      tracking: '',
      internalNotes: '',
      statusHistory: [{ status: 'new', at: order.date || new Date().toISOString(), note: 'Order placed' }],
    };
    orders.unshift(enriched);
    saveOrders(orders);

    const isQuote = enriched.pricingStatus === 'pending';
    addMessage({
      customerEmail: order.customer?.email,
      customerName: order.customer?.name,
      orderId: order.id,
      subject: isQuote ? `Order request received — ${order.id}` : `Order confirmation — ${order.id}`,
      body: isQuote
        ? `Hi ${order.customer?.name || 'there'},\n\nWe've received your order request (${order.id}). Our team will confirm final pricing and send payment and shipping details shortly.\n\n— ONYX Peptides`
        : `Hi ${order.customer?.name || 'there'},\n\nThank you for your ONYX Peptides order (${order.id}). We're preparing your shipment and will send tracking once it leaves our facility.\n\n— ONYX Peptides`,
      direction: 'outbound',
      auto: true,
    });

    return enriched;
  }

  function updateOrder(id, patch) {
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;

    const prev = orders[idx];
    const next = { ...prev, ...patch };

    if (patch.status && patch.status !== prev.status) {
      next.statusHistory = [
        ...(prev.statusHistory || []),
        { status: patch.status, at: new Date().toISOString(), note: patch.statusNote || '' },
      ];
    }

    orders[idx] = next;
    saveOrders(orders);
    return next;
  }

  function getMessages() {
    return read(KEYS.messages, []).sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function addMessage(msg) {
    const messages = getMessages();
    const entry = {
      id: 'MSG-' + Date.now().toString(36).toUpperCase(),
      at: new Date().toISOString(),
      read: msg.direction === 'outbound',
      ...msg,
    };
    messages.unshift(entry);
    write(KEYS.messages, messages);
    return entry;
  }

  function getGoals() {
    return read(KEYS.goals, {
      monthlyRevenue: 14000,
      monthlyOrders: 150,
      monthlyProfit: 5000,
      quarterlyRevenue: 42000,
    });
  }

  function saveGoals(goals) {
    write(KEYS.goals, goals);
  }

  function getItemCogs(item) {
    const unit = LANDED_COGS[item.id] || 15;
    return unit * (item.qty || 1);
  }

  function orderCogs(order) {
    let total = (order.items || []).reduce((sum, item) => sum + getItemCogs(item), 0);
    if (order.bacWater) total += LANDED_COGS['bac-water'];
    total += getPlModel().outboundShipCost;
    return total;
  }

  function getMonthKey(dateIso) {
    const d = new Date(dateIso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function shiftISODate(iso, days) {
    const d = new Date((iso || todayISO()) + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function startOfMonthISO(iso = todayISO()) {
    const d = new Date(iso + 'T12:00:00');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  function endOfMonthISO(iso = todayISO()) {
    const d = new Date(iso + 'T12:00:00');
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return end.toISOString().slice(0, 10);
  }

  function daysInclusive(startIso, endIso) {
    const start = new Date(startIso + 'T12:00:00');
    const end = new Date(endIso + 'T12:00:00');
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
  }

  function formatRangeLabel(startIso, endIso) {
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    const start = new Date(startIso + 'T12:00:00').toLocaleDateString('en-US', opts);
    const end = new Date(endIso + 'T12:00:00').toLocaleDateString('en-US', opts);
    return startIso === endIso ? start : `${start} – ${end}`;
  }

  function resolveFinanceRange(preset, customStart, customEnd) {
    const today = todayISO();
    const presets = {
      mtd: { startDate: startOfMonthISO(today), endDate: today, label: 'Month to date' },
      last_month: {
        startDate: startOfMonthISO(shiftISODate(startOfMonthISO(today), -1)),
        endDate: endOfMonthISO(shiftISODate(startOfMonthISO(today), -1)),
        label: 'Last month',
      },
      last_7_days: { startDate: shiftISODate(today, -6), endDate: today, label: 'Last 7 days' },
      last_30_days: { startDate: shiftISODate(today, -29), endDate: today, label: 'Last 30 days' },
      last_90_days: { startDate: shiftISODate(today, -89), endDate: today, label: 'Last 90 days' },
      ytd: { startDate: `${today.slice(0, 4)}-01-01`, endDate: today, label: 'Year to date' },
      all_time: { startDate: '2000-01-01', endDate: today, label: 'All time' },
    };
    if (preset === 'custom' && customStart && customEnd) {
      const startDate = customStart <= customEnd ? customStart : customEnd;
      const endDate = customStart <= customEnd ? customEnd : customStart;
      return { preset, startDate, endDate, label: formatRangeLabel(startDate, endDate) };
    }
    const resolved = presets[preset] || presets.mtd;
    return { preset: preset in presets ? preset : 'mtd', ...resolved };
  }

  function getPriorFinanceRange(startIso, endIso) {
    const days = daysInclusive(startIso, endIso);
    return {
      startDate: shiftISODate(startIso, -days),
      endDate: shiftISODate(endIso, -days),
    };
  }

  function prorateFixedOverhead(startIso, endIso) {
    const model = getPlModel();
    const start = new Date(startIso + 'T12:00:00');
    const end = new Date(endIso + 'T12:00:00');
    let total = 0;
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const rangeStart = start > monthStart ? start : monthStart;
      const rangeEnd = end < monthEnd ? end : monthEnd;
      if (rangeStart <= rangeEnd) {
        const daysInMonth = monthEnd.getDate();
        const daysInRange = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
        total += model.monthlyFixedOverhead * (daysInRange / daysInMonth);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return total;
  }

  function getOrdersInRange(startIso, endIso) {
    return getOrders().filter((o) => {
      if (o.status === 'cancelled') return false;
      const d = (o.date || '').slice(0, 10);
      return d >= startIso && d <= endIso;
    });
  }

  function getCurrentMonthOrders() {
    const today = todayISO();
    return getOrdersInRange(startOfMonthISO(today), today);
  }

  function calcOrderProfit(order) {
    const revenue = order.total || 0;
    const cogs = orderCogs(order);
    const model = getPlModel();
    const processing = revenue * model.processingRate + model.processingFee;
    const refundReserve = revenue * model.refundRate;
    return revenue - cogs - processing - refundReserve;
  }

  function buildPeptideFinanceSummary(startIso, endIso) {
    const model = getPlModel();
    const rangeOrders = getOrdersInRange(startIso, endIso);
    const grossRevenue = rangeOrders.reduce((s, o) => s + (o.total || 0), 0);
    const cogs = rangeOrders.reduce((s, o) => s + orderCogs(o), 0);
    const processing = rangeOrders.reduce((s, o) => s + (o.total || 0) * model.processingRate + model.processingFee, 0);
    const refunds = grossRevenue * model.refundRate;
    const grossProfit = grossRevenue - cogs;
    const marketing = grossRevenue * model.marketingPct;
    const fixedOverhead = prorateFixedOverhead(startIso, endIso);
    const ebitda = grossProfit - processing - refunds - marketing - fixedOverhead;
    const orderProfit = rangeOrders.reduce((s, o) => s + calcOrderProfit(o), 0);

    return {
      source: 'peptide',
      orderCount: rangeOrders.length,
      grossRevenue,
      cogs,
      grossProfit,
      grossMargin: grossRevenue ? grossProfit / grossRevenue : 0,
      processing,
      refunds,
      marketing,
      fixedOverhead,
      ebitda,
      orderProfit,
      avgOrderValue: rangeOrders.length ? grossRevenue / rangeOrders.length : 0,
      lineItems: rangeOrders,
    };
  }

  function getFinanceSummary(options = {}) {
    const range = resolveFinanceRange(options.preset, options.startDate, options.endDate);
    const activeSource = options.source || 'peptide';
    const peptide = applyPlAdjustmentsToSummary(
      buildPeptideFinanceSummary(range.startDate, range.endDate),
      range.startDate,
      range.endDate,
      activeSource
    );
    const allActive = getOrders().filter((o) => o.status !== 'cancelled');
    const grossRevenueAll = allActive.reduce((s, o) => s + (o.total || 0), 0);
    const priorRange = getPriorFinanceRange(range.startDate, range.endDate);
    const prior = applyPlAdjustmentsToSummary(
      buildPeptideFinanceSummary(priorRange.startDate, priorRange.endDate),
      priorRange.startDate,
      priorRange.endDate,
      activeSource
    );

    return {
      ...peptide,
      monthOrders: peptide.orderCount,
      grossRevenueAll,
      range,
      priorRange,
      prior,
      plModel: getPlModel(),
      compare: {
        grossRevenue: pctChange(peptide.grossRevenue, prior.grossRevenue),
        ebitda: pctChange(peptide.ebitda, prior.ebitda),
        orderCount: pctChange(peptide.orderCount, prior.orderCount),
      },
    };
  }

  function pctChange(current, previous) {
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  function combineFinanceSummaries(parts) {
    const valid = parts.filter(Boolean);
    const grossRevenue = valid.reduce((s, p) => s + (p.grossRevenue || 0), 0);
    const cogs = valid.reduce((s, p) => s + (p.cogs || 0), 0);
    const processing = valid.reduce((s, p) => s + (p.processing || 0), 0);
    const refunds = valid.reduce((s, p) => s + (p.refunds || 0), 0);
    const marketing = valid.reduce((s, p) => s + (p.marketing || 0), 0);
    const fixedOverhead = valid.reduce((s, p) => s + (p.fixedOverhead || 0), 0);
    const discounts = valid.reduce((s, p) => s + (p.discounts || 0), 0);
    const creditApplied = valid.reduce((s, p) => s + (p.creditApplied || 0), 0);
    const grossProfit = grossRevenue - cogs;
    const ebitdaBeforeAdjustments = valid.reduce((s, p) => s + (p.ebitdaBeforeAdjustments ?? p.ebitda ?? 0), 0);
    const adjustmentsNet = valid.reduce((s, p) => s + (p.adjustmentsNet || 0), 0);
    const plAdjustments = valid.flatMap((p) => p.plAdjustments || []);
    const ebitda = valid.reduce((s, p) => s + (p.ebitda || 0), 0);
    const orderCount = valid.reduce((s, p) => s + (p.orderCount || p.transactionCount || 0), 0);
    return {
      source: 'combined',
      orderCount,
      transactionCount: orderCount,
      grossRevenue,
      discounts,
      creditApplied,
      cogs,
      grossProfit,
      grossMargin: grossRevenue ? grossProfit / grossRevenue : 0,
      processing,
      refunds,
      marketing,
      fixedOverhead,
      ebitdaBeforeAdjustments,
      adjustmentsNet,
      plAdjustments,
      adjustmentsSummary: summarizePlAdjustments(plAdjustments),
      ebitda,
      adjustedEbitda: ebitda,
      avgOrderValue: orderCount ? grossRevenue / orderCount : 0,
      parts: valid,
    };
  }

  function getPipelineCounts() {
    const counts = {};
    ORDER_STATUSES.forEach((s) => { counts[s.id] = 0; });
    getOrders().forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
  }

  function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
  }

  function getCRMStore() {
    return read(KEYS.crm, {});
  }

  function saveCRMStore(store) {
    write(KEYS.crm, store);
  }

  function inferStage(orderCount, totalSpent) {
    if (orderCount >= 3 || totalSpent >= 300) return 'vip';
    if (orderCount >= 2) return 'repeat';
    if (orderCount >= 1) return 'customer';
    return 'lead';
  }

  function buildBaseContact(email, partial = {}) {
    const key = normalizeEmail(email);
    const store = getCRMStore();
    const saved = store[key] || {};
    const orders = partial.orders || [];
    const orderCount = orders.length;
    const totalSpent = partial.totalSpent ?? orders.reduce((s, o) => s + (o.total || 0), 0);
    const lastOrder = orders[0];

    return {
      id: saved.id || 'CNT-' + key.replace(/[^a-z0-9]/g, '').slice(0, 12).toUpperCase(),
      email: key,
      name: saved.name || partial.name || '',
      phone: saved.phone || partial.phone || '',
      company: saved.company || partial.company || '',
      title: saved.title || partial.title || '',
      stage: saved.stage || partial.stage || inferStage(orderCount, totalSpent),
      source: saved.source || partial.source || 'order',
      tags: saved.tags || partial.tags || [],
      notes: saved.notes || [],
      activities: saved.activities || [],
      followUps: saved.followUps || [],
      orders,
      orderCount,
      totalSpent,
      lastOrderDate: lastOrder?.date || saved.lastOrderDate || null,
      lastContact: saved.lastContact || partial.lastContact || null,
      createdAt: saved.createdAt || partial.createdAt || new Date().toISOString(),
      updatedAt: saved.updatedAt || new Date().toISOString(),
    };
  }

  function getCRMContacts() {
    const map = new Map();

    getOrders().forEach((o) => {
      const email = normalizeEmail(o.customer?.email);
      if (!email) return;
      const existing = map.get(email) || { orders: [], totalSpent: 0, name: '', phone: '' };
      existing.orders.push(o);
      existing.totalSpent += o.total || 0;
      existing.name = o.customer.name || existing.name;
      existing.phone = o.customer.phone || existing.phone;
      existing.source = 'order';
      map.set(email, existing);
    });

    getWholesaleInquiries().forEach((inq) => {
      const email = normalizeEmail(inq.email);
      if (!email) return;
      const existing = map.get(email) || { orders: [], totalSpent: 0 };
      existing.name = inq.name || existing.name;
      existing.phone = inq.phone || existing.phone;
      existing.company = inq.company || existing.company;
      if (!existing.orders?.length) {
        existing.stage = existing.stage || 'qualified';
        existing.source = 'wholesale';
      }
      map.set(email, existing);
    });

    getSubscribers().forEach((email) => {
      const key = normalizeEmail(email);
      if (!key || map.has(key)) return;
      map.set(key, {
        orders: [],
        totalSpent: 0,
        name: key.split('@')[0],
        source: 'subscriber',
        stage: 'lead',
      });
    });

    const store = getCRMStore();
    Object.keys(store).forEach((email) => {
      if (!map.has(email)) {
        map.set(email, { orders: [], totalSpent: 0, ...store[email] });
      }
    });

    return [...map.entries()]
      .map(([email, partial]) => buildBaseContact(email, partial))
      .sort((a, b) => {
        const aDue = getNextFollowUp(a)?.due || '';
        const bDue = getNextFollowUp(b)?.due || '';
        if (aDue && bDue) return new Date(aDue) - new Date(bDue);
        if (aDue) return -1;
        if (bDue) return 1;
        return b.totalSpent - a.totalSpent;
      });
  }

  function getNextFollowUp(contact) {
    const open = (contact.followUps || []).filter((f) => !f.done).sort((a, b) => new Date(a.due) - new Date(b.due));
    return open[0] || null;
  }

  function getCRMContact(email) {
    return getCRMContacts().find((c) => c.email === normalizeEmail(email)) || null;
  }

  function persistContact(contact) {
    const store = getCRMStore();
    const key = normalizeEmail(contact.email);
    store[key] = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      company: contact.company,
      title: contact.title,
      stage: contact.stage,
      source: contact.source,
      tags: contact.tags,
      notes: contact.notes,
      activities: contact.activities,
      followUps: contact.followUps,
      lastContact: contact.lastContact,
      createdAt: contact.createdAt,
      updatedAt: new Date().toISOString(),
    };
    saveCRMStore(store);
    return getCRMContact(key);
  }

  function updateCRMContact(email, patch) {
    const contact = getCRMContact(email);
    if (!contact) return null;
    return persistContact({ ...contact, ...patch, email: contact.email });
  }

  function addCRMContact(data) {
    const email = normalizeEmail(data.email);
    if (!email) return null;
    if (getCRMContact(email)) return updateCRMContact(email, data);
    const contact = buildBaseContact(email, {
      ...data,
      source: data.source || 'manual',
      stage: data.stage || 'lead',
      createdAt: new Date().toISOString(),
    });
    return persistContact(contact);
  }

  function addCRMNote(email, text) {
    const contact = getCRMContact(email);
    if (!contact || !text.trim()) return null;
    const note = { id: 'N-' + Date.now(), at: new Date().toISOString(), text: text.trim() };
    contact.notes = [note, ...(contact.notes || [])];
    contact.lastContact = note.at;
    contact.activities = [{ type: 'note', at: note.at, text: text.trim() }, ...(contact.activities || [])];
    return persistContact(contact);
  }

  function addCRMActivity(email, activity) {
    const contact = getCRMContact(email);
    if (!contact) return null;
    const entry = { id: 'A-' + Date.now(), at: new Date().toISOString(), ...activity };
    contact.activities = [entry, ...(contact.activities || [])];
    contact.lastContact = entry.at;
    return persistContact(contact);
  }

  function addCRMFollowUp(email, due, note) {
    const contact = getCRMContact(email);
    if (!contact) return null;
    const task = {
      id: 'F-' + Date.now(),
      due,
      note: note.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    contact.followUps = [...(contact.followUps || []), task];
    return persistContact(contact);
  }

  function completeCRMFollowUp(email, followUpId) {
    const contact = getCRMContact(email);
    if (!contact) return null;
    contact.followUps = (contact.followUps || []).map((f) =>
      f.id === followUpId ? { ...f, done: true, completedAt: new Date().toISOString() } : f
    );
    return persistContact(contact);
  }

  function getCRMStats() {
    const contacts = getCRMContacts();
    const today = new Date().toISOString().slice(0, 10);
    const openTasks = contacts.flatMap((c) =>
      (c.followUps || []).filter((f) => !f.done).map((f) => ({ ...f, contact: c }))
    );
    const dueToday = openTasks.filter((f) => f.due?.slice(0, 10) === today);
    const overdue = openTasks.filter((f) => f.due?.slice(0, 10) < today);

    const byStage = {};
    CRM_STAGES.forEach((s) => { byStage[s.id] = 0; });
    contacts.forEach((c) => { if (byStage[c.stage] !== undefined) byStage[c.stage]++; });

    return {
      totalContacts: contacts.length,
      customers: contacts.filter((c) => ['customer', 'repeat', 'vip'].includes(c.stage)).length,
      leads: contacts.filter((c) => ['lead', 'qualified'].includes(c.stage)).length,
      openTasks: openTasks.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      byStage,
      pipelineValue: contacts.reduce((s, c) => s + c.totalSpent, 0),
    };
  }

  function getCustomers() {
    return getCRMContacts()
      .filter((c) => c.orderCount > 0)
      .map((c) => ({
        email: c.email,
        name: c.name,
        phone: c.phone,
        orders: c.orders,
        totalSpent: c.totalSpent,
      }));
  }

  function getWholesaleInquiries() {
    return read('renvoa-wholesale', []);
  }

  function getSubscribers() {
    return read('renvoa-subscribers', []);
  }

  function ensureSeedData() {
    if (localStorage.getItem(KEYS.seeded)) return;
    if (getOrders().length > 0) {
      localStorage.setItem(KEYS.seeded, '1');
      return;
    }

    const now = Date.now();
    const samples = [
      {
        id: 'RC-DEMO001',
        date: new Date(now - 2 * 3600000).toISOString(),
        status: 'new',
        tracking: '',
        internalNotes: '',
        customer: { name: 'Dr. Sarah Chen', email: 'schen@pacificbiolab.edu', phone: '415-555-0142' },
        shipping: { line1: '1200 Research Park Dr', line2: 'Suite 4B', city: 'San Diego', state: 'CA', zip: '92121' },
        items: [{ id: 'bpc-157', size: '5mg', qty: 2 }, { id: 'tb-500', size: '5mg', qty: 1 }],
        bacWater: true,
        subtotal: 179,
        shipping: 0,
        total: 179,
        qualified: true,
        statusHistory: [{ status: 'new', at: new Date(now - 2 * 3600000).toISOString(), note: 'Order placed' }],
      },
      {
        id: 'RC-DEMO002',
        date: new Date(now - 86400000 * 2).toISOString(),
        status: 'processing',
        tracking: '',
        internalNotes: 'COA docs attached. Cold pack ready.',
        customer: { name: 'Marcus Webb', email: 'm.webb@cellpath.io', phone: '' },
        shipping: { line1: '88 Innovation Way', line2: '', city: 'Austin', state: 'TX', zip: '78701' },
        items: [{ id: 'semaglutide', size: '2mg', qty: 1 }],
        bacWater: false,
        subtotal: 89,
        shipping: 9.95,
        total: 98.95,
        qualified: true,
        statusHistory: [
          { status: 'new', at: new Date(now - 86400000 * 2).toISOString(), note: 'Order placed' },
          { status: 'processing', at: new Date(now - 86400000).toISOString(), note: 'Picked for fulfillment' },
        ],
      },
      {
        id: 'RC-DEMO003',
        date: new Date(now - 86400000 * 5).toISOString(),
        status: 'shipped',
        tracking: '1Z999AA10123456784',
        internalNotes: '',
        customer: { name: 'Elena Rostova', email: 'e.rostova@longevitylab.org', phone: '312-555-0198' },
        shipping: { line1: '450 Lake Shore Blvd', line2: 'Lab 12', city: 'Chicago', state: 'IL', zip: '60611' },
        items: [{ id: 'recovery-stack', size: 'bundle', qty: 1 }, { id: 'ghk-cu', size: '50mg', qty: 1 }],
        bacWater: true,
        subtotal: 146,
        shipping: 9.95,
        total: 155.95,
        qualified: true,
        statusHistory: [
          { status: 'new', at: new Date(now - 86400000 * 5).toISOString(), note: 'Order placed' },
          { status: 'processing', at: new Date(now - 86400000 * 4).toISOString(), note: 'Fulfillment started' },
          { status: 'packed', at: new Date(now - 86400000 * 3.5).toISOString(), note: 'Cold-chain packed' },
          { status: 'shipped', at: new Date(now - 86400000 * 3).toISOString(), note: 'FedEx overnight' },
        ],
      },
    ];

    saveOrders(samples);
    saveGoals(getGoals());

    samples.forEach((o) => {
      addMessage({
        customerEmail: o.customer.email,
        customerName: o.customer.name,
        orderId: o.id,
        subject: `Order confirmation — ${o.id}`,
        body: `Hi ${o.customer.name},\n\nThank you for your ONYX Peptides order (${o.id}). We're preparing your shipment.\n\n— ONYX Peptides`,
        direction: 'outbound',
        auto: true,
      });
    });

    addMessage({
      customerEmail: 'm.webb@cellpath.io',
      customerName: 'Marcus Webb',
      orderId: 'RC-DEMO002',
      subject: 'Re: COA for Semaglutide batch',
      body: 'Hi Marcus — attaching the batch COA for RC-SEM26-0401. Let us know if you need additional documentation for your IRB filing.',
      direction: 'inbound',
    });

    const crmSeed = {
      'schen@pacificbiolab.edu': {
        company: 'Pacific BioLab',
        title: 'Principal Investigator',
        stage: 'repeat',
        tags: ['university', 'recovery-research'],
        notes: [{ id: 'N1', at: new Date(now - 86400000 * 10).toISOString(), text: 'Interested in BPC/TB pairing for tendon studies. May order monthly.' }],
        followUps: [{ id: 'F1', due: new Date(now + 86400000 * 3).toISOString().slice(0, 10), note: 'Check in on repeat order timing', done: false, createdAt: new Date(now - 86400000).toISOString() }],
        activities: [{ type: 'call', at: new Date(now - 86400000 * 7).toISOString(), text: 'Intro call — discussed COA requirements and cold-chain shipping.' }],
      },
      'm.webb@cellpath.io': {
        company: 'CellPath Research',
        title: 'Lab Director',
        stage: 'customer',
        tags: ['biotech', 'metabolic'],
        followUps: [{ id: 'F2', due: new Date(now).toISOString().slice(0, 10), note: 'Send Semaglutide COA follow-up', done: false, createdAt: new Date(now - 3600000).toISOString() }],
      },
      'e.rostova@longevitylab.org': {
        company: 'Longevity Lab Institute',
        title: 'Research Coordinator',
        stage: 'vip',
        tags: ['longevity', 'bundles'],
        notes: [{ id: 'N2', at: new Date(now - 86400000 * 2).toISOString(), text: 'VIP client — prefers Recovery Stack + GHK-Cu combos. Fast responder.' }],
      },
      'j.kim@northwest.edu': {
        id: 'CNT-JKIM',
        name: 'Dr. James Kim',
        company: 'Northwest University',
        title: 'Postdoctoral Researcher',
        stage: 'qualified',
        source: 'referral',
        tags: ['referral', 'GH-research'],
        notes: [{ id: 'N3', at: new Date(now - 86400000 * 4).toISOString(), text: 'Referred by Elena Rostova. Requested GH stack pricing for 3-month protocol.' }],
        followUps: [{ id: 'F3', due: new Date(now + 86400000 * 2).toISOString().slice(0, 10), note: 'Send GH stack quote + research agreement', done: false, createdAt: new Date(now - 86400000 * 4).toISOString() }],
        createdAt: new Date(now - 86400000 * 4).toISOString(),
      },
    };
    write(KEYS.crm, Object.fromEntries(
      Object.entries(crmSeed).map(([email, data]) => [email, { ...data, updatedAt: new Date().toISOString() }])
    ));

    localStorage.setItem(KEYS.seeded, '1');
  }

  return {
    KEYS,
    ORDER_STATUSES,
    PL_MODEL: DEFAULT_PL_MODEL,
    DEFAULT_PL_MODEL,
    PL_ADJUSTMENT_SOURCES,
    PL_ADJUSTMENT_TYPES,
    getPlModel,
    savePlModel,
    getPlAdjustments,
    getPlAdjustment,
    addPlAdjustment,
    updatePlAdjustment,
    deletePlAdjustment,
    getPlAdjustmentsInRange,
    applyPlAdjustmentsToSummary,
    summarizePlAdjustments,
    LANDED_COGS,
    isAuthed,
    login,
    logout,
    getOrders,
    registerOrder,
    updateOrder,
    getMessages,
    addMessage,
    getGoals,
    saveGoals,
    getFinanceSummary,
    buildPeptideFinanceSummary,
    combineFinanceSummaries,
    resolveFinanceRange,
    getOrdersInRange,
    getPriorFinanceRange,
    formatRangeLabel,
    daysInclusive,
    todayISO,
    shiftISODate,
    startOfMonthISO,
    endOfMonthISO,
    prorateFixedOverhead,
    pctChange,
    getPipelineCounts,
    getCustomers,
    getWholesaleInquiries,
    getSubscribers,
    getCurrentMonthOrders,
    calcOrderProfit,
    orderCogs,
    formatMoney,
    formatDate,
    ensureSeedData,
    CRM_STAGES,
    CRM_SOURCES,
    getCRMContacts,
    getCRMContact,
    getCRMStats,
    getNextFollowUp,
    updateCRMContact,
    addCRMContact,
    addCRMNote,
    addCRMActivity,
    addCRMFollowUp,
    completeCRMFollowUp,
  };
})();