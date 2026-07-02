window.RenvoaAdmin = (function () {
  'use strict';

  const KEYS = {
    orders: 'renvoa-orders',
    messages: 'renvoa-admin-messages',
    goals: 'renvoa-admin-goals',
    crm: 'renvoa-crm-contacts',
    session: 'renvoa-admin-session',
    seeded: 'renvoa-admin-seeded',
  };

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

  const PL_MODEL = {
    monthlyFixedOverhead: 1850,
    marketingPct: 0.25,
    processingRate: 0.029,
    processingFee: 0.30,
    refundRate: 0.03,
    outboundShipCost: 12,
  };

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

  function isAuthed() {
    const session = sessionStorage.getItem(KEYS.session);
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
    const expected = RENVOA_CONFIG?.adminPassword || 'renvoa2026';
    if ((password || '').trim() !== expected) return false;
    sessionStorage.setItem(KEYS.session, JSON.stringify({ at: Date.now() }));
    try {
      ensureSeedData();
    } catch (err) {
      console.error('RENVOA admin seed error:', err);
    }
    return true;
  }

  function logout() {
    sessionStorage.removeItem(KEYS.session);
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
      tracking: '',
      internalNotes: '',
      statusHistory: [{ status: 'new', at: order.date || new Date().toISOString(), note: 'Order placed' }],
    };
    orders.unshift(enriched);
    saveOrders(orders);

    addMessage({
      customerEmail: order.customer?.email,
      customerName: order.customer?.name,
      orderId: order.id,
      subject: `Order confirmation — ${order.id}`,
      body: `Hi ${order.customer?.name || 'there'},\n\nThank you for your RENVOA CLINIC order (${order.id}). We're preparing your shipment and will send tracking once it leaves our facility.\n\n— RENVOA CLINIC`,
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
    total += PL_MODEL.outboundShipCost;
    return total;
  }

  function getMonthKey(dateIso) {
    const d = new Date(dateIso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function getCurrentMonthOrders() {
    const key = getMonthKey(new Date().toISOString());
    return getOrders().filter((o) => o.status !== 'cancelled' && getMonthKey(o.date) === key);
  }

  function calcOrderProfit(order) {
    const revenue = order.total || 0;
    const cogs = orderCogs(order);
    const processing = revenue * PL_MODEL.processingRate + PL_MODEL.processingFee;
    const refundReserve = revenue * PL_MODEL.refundRate;
    return revenue - cogs - processing - refundReserve;
  }

  function getFinanceSummary() {
    const monthOrders = getCurrentMonthOrders();
    const allActive = getOrders().filter((o) => o.status !== 'cancelled');
    const grossRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
    const grossRevenueAll = allActive.reduce((s, o) => s + (o.total || 0), 0);
    const cogs = monthOrders.reduce((s, o) => s + orderCogs(o), 0);
    const processing = monthOrders.reduce((s, o) => s + (o.total || 0) * PL_MODEL.processingRate + PL_MODEL.processingFee, 0);
    const refunds = grossRevenue * PL_MODEL.refundRate;
    const grossProfit = grossRevenue - cogs;
    const marketing = grossRevenue * PL_MODEL.marketingPct;
    const ebitda = grossProfit - processing - refunds - marketing - PL_MODEL.monthlyFixedOverhead;
    const orderProfit = monthOrders.reduce((s, o) => s + calcOrderProfit(o), 0);

    return {
      monthOrders: monthOrders.length,
      grossRevenue,
      grossRevenueAll,
      cogs,
      grossProfit,
      grossMargin: grossRevenue ? grossProfit / grossRevenue : 0,
      processing,
      refunds,
      marketing,
      fixedOverhead: PL_MODEL.monthlyFixedOverhead,
      ebitda,
      orderProfit,
      avgOrderValue: monthOrders.length ? grossRevenue / monthOrders.length : 0,
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
        body: `Hi ${o.customer.name},\n\nThank you for your RENVOA CLINIC order (${o.id}). We're preparing your shipment.\n\n— RENVOA CLINIC`,
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
    PL_MODEL,
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