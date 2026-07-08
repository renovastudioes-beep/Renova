window.RenvoaStudios = (function () {
  'use strict';

  const KEYS = {
    inquiries: 'renova-studio-inquiries',
    bookings: 'renvoa-studio-bookings',
    clients: 'renova-studio-clients',
    appointments: 'renova-studio-appointments',
    transactions: 'renova-studio-transactions',
    calendarSettings: 'renova-studio-calendar-settings',
    pricingOverrides: 'renova-studio-pricing-overrides',
    settings: 'renova-studio-settings',
    staff: 'renova-studio-staff',
    clientCredits: 'renova-studio-client-credits',
    programOverrides: 'renova-studio-program-overrides',
    clientPhotos: 'renova-studio-client-photos',
    programVisitLog: 'renova-studio-program-visit-log',
    programWarrantyLog: 'renova-studio-program-warranty-log',
  };

  const CLIENT_PHOTO_MAX_PER_CLIENT = 80;
  const CLIENT_PHOTO_MAX_DIM = 1280;
  const CLIENT_PHOTO_JPEG_QUALITY = 0.82;

  const FINANCE_PLACEHOLDER_RE = /490892601652954419|HDLSGOIGBN|sitecode=HDLS/i;

  const CONSUMER_FINANCE_APPLY_URL = window.STUDIO_FINANCE_CONSUMER_APPLY_URL
    || 'https://www.carecredit.com/apply/';

  const DEFAULT_FINANCE_URL = CONSUMER_FINANCE_APPLY_URL;

  const DEFAULT_SETTINGS = {
    financeUrl: '',
    financeMerchantId: '',
    phone: '',
    email: '',
    location: '',
  };

  const STAFF_ROLES = ['Owner', 'Stylist', 'Clinician', 'Front Desk', 'Admin'];

  const APPT_STATUS = {
    scheduled: { id: 'scheduled', label: 'Scheduled', color: '#2563EB' },
    checked_in: { id: 'checked_in', label: 'Checked In', color: '#D97706' },
    in_progress: { id: 'in_progress', label: 'In Progress', color: '#7C3AED' },
    with_provider: { id: 'with_provider', label: 'With Provider', color: '#0D9488' },
    completed: { id: 'completed', label: 'Completed', color: '#059669' },
    no_show: { id: 'no_show', label: 'No Show', color: '#EF4444' },
    canceled: { id: 'canceled', label: 'Canceled', color: '#6B7280' },
  };

  const DEFAULT_CALENDAR = {
    startHour: 8,
    endHour: 18,
    slotMinutes: 30,
    columns: 3,
    columnLabels: ['Chair 1', 'Chair 2', 'Chair 3'],
    enableDragDrop: true,
  };

  const SCHEDULING_FEE = 29;
  const POS_OVERRIDE_PIN = '1214';
  const CLIENT_SESSION_KEY = 'renova-studio-client-session';
  const CLIENT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
  /** Portal auth survives navigation within the page only — cleared on refresh */
  let clientPortalSessionMemory = null;
  const RESCHEDULE_POLICY = { freeWindowHours: 48, lateFee: 50 };
  const ATTENDANCE_VIOLATION_POLICY = {
    lookbackHours: 24,
    lateCancelHours: 24,
    maxRefundPercent: 0.5,
    minRetainAmount: SCHEDULING_FEE,
  };
  const SCHEDULE_VISIT_TYPES = {
    program: [
      { id: 'emergency', label: 'Emergency repair', desc: 'Urgent lift, tear, or bond issue' },
      { id: 'fitting', label: 'Fitting', desc: 'Adjust fit, base, or placement' },
      { id: 'maint', label: 'Maintenance', desc: 'Scheduled upkeep between major services' },
      { id: 'reattach', label: 'Reattachment', desc: 'Remove, clean, and re-bond' },
      { id: 'cut_blend', label: 'Trim & blend', desc: 'Perimeter cut and integration' },
      { id: 'wash', label: 'Wash & style', desc: 'Cleanse and finish' },
    ],
    womens_program: [
      { id: 'emergency', label: 'Emergency repair', desc: 'Urgent fix or reposition' },
      { id: 'fitting', label: 'Fitting', desc: 'Adjust topper or system fit' },
      { id: 'maint', label: 'Maintenance', desc: 'Routine program visit' },
      { id: 'color', label: 'Color refresh', desc: 'Tone or dimension update' },
      { id: 'wash', label: 'Wash & style', desc: 'Cleanse and blow dry finish' },
    ],
    womens_extensions: [
      { id: 'emergency', label: 'Emergency repair', desc: 'Slip, bond, or damage fix' },
      { id: 'moveup', label: 'Move-up', desc: 'Maintenance reposition' },
      { id: 'fitting', label: 'Trim & blend', desc: 'Blend cut and shape' },
      { id: 'wash', label: 'Wash & style', desc: 'Cleanse and finish' },
    ],
    clinical: [
      { id: 'tricho', label: 'Trichology follow-up', desc: 'Scalp health check-in' },
      { id: 'prp', label: 'PRP session', desc: 'Scheduled PRP therapy' },
      { id: 'lllt', label: 'LLLT session', desc: 'Laser therapy visit' },
      { id: 'emergency', label: 'Urgent consult', desc: 'Same-week clinical concern' },
    ],
    default: [
      { id: 'maint', label: 'Follow-up visit', desc: 'Prepaid program visit' },
      { id: 'emergency', label: 'Emergency', desc: 'Urgent visit' },
    ],
    none: [
      { id: 'consult', label: 'System consultation', desc: 'Private fitting and program planning for restoration clients' },
      { id: 'barber', label: "Men's barbering", desc: 'Cuts, beard, scalp — book the service directly', category: 'mens_grooming' },
      { id: 'salon', label: "Women's salon", desc: 'Cuts, color, blowouts — pick a salon service', category: 'womens_styling' },
    ],
  };
  const FIRST_VISIT_TAG = 'First visit';
  const PUBLIC_BOOKING_SCARCITY = {
    maxPerDay: 4,
    minPerDay: 2,
    showRatio: 0.35,
  };
  const PUBLIC_SAME_DAY_LEAD_MINUTES = 60;

  function read(key, fallback) {
    if (window.StudioStorage?.read) {
      return window.StudioStorage.read(key, fallback);
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  const writeFingerprints = new Map();

  function write(key, value) {
    let fp = '';
    try {
      fp = JSON.stringify(value);
    } catch {
      fp = String(Date.now());
    }
    const unchanged = writeFingerprints.get(key) === fp;
    if (
      !unchanged
      && [
        KEYS.clients,
        KEYS.appointments,
        KEYS.transactions,
        KEYS.programOverrides,
        KEYS.clientCredits,
        KEYS.programVisitLog,
        KEYS.programWarrantyLog,
      ].includes(key)
    ) {
      invalidateClientDataCaches();
    }
    writeFingerprints.set(key, fp);
    if (window.StudioStorage?.write) {
      window.StudioStorage.write(key, value);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function parseISODate(iso) {
    const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function addDaysToISO(iso, days) {
    const d = parseISODate(iso);
    d.setDate(d.getDate() + (Number(days) || 0));
    return d.toISOString().slice(0, 10);
  }

  function daysBetweenISO(fromIso, toIso) {
    const ms = parseISODate(toIso) - parseISODate(fromIso);
    return Math.round(ms / 86400000);
  }

  function parseDurationMin(str) {
    if (!str) return 30;
    const m = String(str).match(/(\d+)/);
    return m ? Number(m[1]) : 30;
  }

  function getProviderDurationMin(service) {
    if (!service) return 30;
    if (service.providerTime != null && service.providerTime !== '') {
      return Number(service.providerTime);
    }
    return parseDurationMin(service.duration);
  }

  function getAppointmentDurationMin(service) {
    if (!service) return 60;
    if (service.appointmentTime != null && service.appointmentTime !== '') {
      return Number(service.appointmentTime);
    }
    const provider = getProviderDurationMin(service);
    if (provider >= 45) return provider;
    if (provider <= 15) return 30;
    if (provider <= 25) return 30;
    if (provider <= 35) return 45;
    if (provider <= 42) return 60;
    return Math.ceil(provider / 15) * 15;
  }

  function formatClientDuration(service) {
    if (!service) return '60 min';
    if (service.isAddon || String(service.duration || '').toLowerCase() === 'add-on') {
      return service.duration || 'Add-on';
    }
    return `${getAppointmentDurationMin(service)} min`;
  }

  function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  function formatTime12(time) {
    if (!time) return '';
    const [h, m] = String(time).split(':').map(Number);
    if (Number.isNaN(h)) return String(time);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  }

  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function addMinutesToTime(time, add) {
    return minutesToTime(timeToMinutes(time) + add);
  }

  function getCalendarSettings() {
    return { ...DEFAULT_CALENDAR, ...read(KEYS.calendarSettings, {}) };
  }

  function saveCalendarSettings(patch) {
    write(KEYS.calendarSettings, { ...getCalendarSettings(), ...patch });
    return getCalendarSettings();
  }

  function getTimeSlots() {
    const { startHour, endHour, slotMinutes } = getCalendarSettings();
    const slots = [];
    for (let m = startHour * 60; m < endHour * 60; m += slotMinutes) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }

  function getPricingOverrides() {
    return read(KEYS.pricingOverrides, {});
  }

  function savePricingOverride(serviceId, patch) {
    const all = getPricingOverrides();
    all[serviceId] = { ...(all[serviceId] || {}), ...patch };
    write(KEYS.pricingOverrides, all);
    return all[serviceId];
  }

  function getServices() {
    const overrides = getPricingOverrides();
    return (window.STUDIO_SERVICES || []).map((s) => {
      const o = overrides[s.id] || {};
      const appointmentTime = o.appointmentTime ?? s.appointmentTime;
      const providerTime = o.providerTime ?? s.providerTime;
      const merged = {
        ...s,
        price: o.price ?? s.price,
        duration: o.duration ?? s.duration,
        appointmentTime,
        providerTime,
        active: o.active !== false,
      };
      if (!o.duration && appointmentTime != null && !merged.isAddon) {
        merged.duration = `${appointmentTime} min`;
      }
      return merged;
    }).filter((s) => s.active !== false);
  }

  function getService(id) {
    const svc = getServices().find((s) => s.id === id);
    if (svc) return svc;
    if (id && String(id).endsWith('-f')) {
      const pifId = String(id).replace(/-f$/, '');
      const pif = getServices().find((s) => s.id === pifId);
      if (pif && isPayInFullTier(pif)) return buildFinanceTier(pif);
    }
    return undefined;
  }

  function formatPrice(n) {
    const num = Number(n) || 0;
    if (num === 0) return '$0';
    const hasCents = Math.round(num * 100) % 100 !== 0;
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    });
  }

  function roundFinanceTotalTo99(amount) {
    if (typeof window.roundFinanceTotalTo99 === 'function') {
      return window.roundFinanceTotalTo99(amount);
    }
    const n = Math.round(amount);
    if (n <= 0) return 0;
    if (n % 100 === 99) return n;
    const candidate = Math.floor(n / 100) * 100 + 99;
    if (candidate > n) return candidate - 100;
    return candidate;
  }

  function computeFinancePackagePrice(opts) {
    if (typeof window.computeFinancePackagePrice === 'function') {
      return window.computeFinancePackagePrice(opts);
    }
    let base = Number(opts?.pifAmount ?? opts?.pifPrice) || 0;
    if (!base) {
      const visits = Number(opts?.visits) || 0;
      const perVisit = Number(opts?.pifPerVisit) || 0;
      if (visits && perVisit) base = perVisit * visits;
    }
    if (!base) return 0;
    return roundFinanceTotalTo99(base * 1.2);
  }

  function computeFinancePrice(pifAmount) {
    if (typeof window.computeFinancePrice === 'function') {
      return window.computeFinancePrice(pifAmount);
    }
    return computeFinancePackagePrice({ pifAmount });
  }

  function findQuarterlySibling(pifSvc) {
    if (!pifSvc?.id) return undefined;
    const byId = getServices().find((s) => s.id === `${pifSvc.id}-q`);
    if (byId) return byId;
    const base = programBaseName(pifSvc.name);
    return getServices().find((s) => programBaseName(s.name) === base && paymentType(s.name) === 'Quarterly');
  }

  function buildFinanceTier(pifSvc) {
    const visits = pifSvc.appointmentsIncluded || 0;
    const price = computeFinancePackagePrice({ pifAmount: pifSvc.price });
    return {
      ...pifSvc,
      id: `${pifSvc.id}-f`,
      name: `${programBaseName(pifSvc.name)} — Finance`,
      price,
      appointmentValue: visits ? Math.round(price / visits) : pifSvc.appointmentValue,
      isFinanceTier: true,
      financeFromId: pifSvc.id,
    };
  }

  function shortName(name) {
    return name
      .replace(/ — Pay in Full$/, '')
      .replace(/ — Annual Package$/, '')
      .replace(/ — Quarterly$/, ' · Quarterly')
      .replace(/ — Finance$/, ' · Finance');
  }

  function paymentType(name) {
    if (name.includes('Quarterly')) return 'Quarterly';
    if (name.includes('Finance')) return 'Finance';
    if (name.includes('Pay in Full') || name.includes('Annual Package')) return 'Pay in full';
    return null;
  }

  function isPayInFullTier(svc) {
    return paymentType(svc?.name) === 'Pay in full';
  }

  function findPayInFullTier(services) {
    return (services || []).find((s) => isPayInFullTier(s));
  }

  function getPackageWarranty() {
    return window.STUDIO_PACKAGE_WARRANTY || {
      summary: 'Full hair warranty with proper care',
      gracePeriodDays: 14,
      lateFee: 50,
      details: [],
    };
  }

  function formatPackageVisitsLabel(svc, planType) {
    const visits = svc?.appointmentsIncluded;
    if (!visits) return svc?.duration || '';
    if (planType === 'Quarterly') return `${visits} visit${visits === 1 ? '' : 's'} this quarter`;
    return `${visits} visit${visits === 1 ? '' : 's'}`;
  }

  function formatExtensionVisitsLabel(extCfg, planId) {
    const total = extCfg?.appointmentsIncluded || 0;
    if (!total) return '';
    if (planId === 'quarterly') {
      const qVisits = Math.max(1, Math.round(total / 4));
      return `${qVisits} visit${qVisits === 1 ? '' : 's'} this quarter`;
    }
    return `${total} visit${total === 1 ? '' : 's'}`;
  }

  function formatPackageWarrantyHtml() {
    const w = getPackageWarranty();
    const details = (w.details || []).map((line) => `<li>${line}</li>`).join('');
    return `
      <div class="studio-package-warranty">
        <p class="studio-program-modal-label">Package warranty</p>
        <p class="studio-ext-length-note"><strong>${w.summary}</strong></p>
        ${details ? `<ul class="studio-program-modal-highlights">${details}</ul>` : ''}
      </div>`;
  }

  function getQuarterlyMinPayment() {
    return window.STUDIO_QUARTERLY_MIN_PAYMENT ?? 1000;
  }

  function isQuarterlyPaymentEligible(amount) {
    return Number(amount) >= getQuarterlyMinPayment();
  }

  function getExtensionQuarterlyPayment(lengthRow) {
    if (!lengthRow?.quarterly) return 0;
    return lengthRow.quarterly / 4;
  }

  function isExtensionQuarterlyEligible(lengthRow) {
    return isQuarterlyPaymentEligible(getExtensionQuarterlyPayment(lengthRow));
  }

  function isServiceQuarterlyEligible(svc) {
    if (!svc || paymentType(svc.name) !== 'Quarterly') return true;
    return isQuarterlyPaymentEligible(svc.price);
  }

  function filterEligiblePaymentTiers(services) {
    return (services || []).filter((svc) => isServiceQuarterlyEligible(svc));
  }

  function normalizeServiceCategory(category, service) {
    if (category === 'barbering') {
      if (service?.gender === 'women') return 'womens_styling';
      return 'mens_grooming';
    }
    return category;
  }

  function isInternalBookingService(svc) {
    return svc?.id === 'c5' || svc?.internalBooking === true;
  }

  function isPublicHiddenService(svc) {
    return svc?.publicHidden === true;
  }

  function filterServices({ gender, category } = {}) {
    const cats = window.STUDIO_CATEGORIES || {};
    return getServices().filter((s) => {
      const svcCategory = normalizeServiceCategory(s.category, s);
      if (category && svcCategory !== category && s.category !== category) return false;
      const cat = cats[svcCategory] || cats[s.category];
      if (s.gender && gender === 'men' && s.gender === 'women') return false;
      if (s.gender && gender === 'women' && s.gender === 'men') return false;
      if (cat?.gender === 'men' && gender && gender !== 'men') return false;
      if (cat?.gender === 'women' && gender && gender !== 'women') return false;
      return true;
    });
  }

  function getPublicBookableServices(opts = {}) {
    return filterServices(opts).filter((s) => !isInternalBookingService(s) && !s.isAddon && !isPublicHiddenService(s));
  }

  function visibleCategories(gender) {
    return Object.values(window.STUDIO_CATEGORIES || {})
      .filter((c) => c.gender === 'all' || c.gender === gender)
      .sort((a, b) => a.order - b.order);
  }

  function defaultCategoryForGender(gender) {
    const offerings = window.STUDIO_GENDER_OFFERINGS || {};
    return offerings[gender]?.defaultCategory || (gender === 'men' ? 'program' : 'womens_extensions');
  }

  function getPublicLine(lineId) {
    return window.STUDIO_PUBLIC_LINES?.[lineId] || null;
  }

  function visibleCategoriesForLine(line, gender) {
    const lineMeta = getPublicLine(line);
    if (!lineMeta) return visibleCategories(gender);
    const allowed = new Set(lineMeta.categories || []);
    return Object.values(window.STUDIO_CATEGORIES || {})
      .filter((c) => allowed.has(c.id))
      .filter((c) => {
        if (!lineMeta.usesGender || !gender) return true;
        return c.gender === 'all' || c.gender === gender;
      })
      .sort((a, b) => a.order - b.order);
  }

  function defaultCategoryForLine(line, gender) {
    const lineMeta = getPublicLine(line);
    if (!lineMeta) return defaultCategoryForGender(gender);
    if (lineMeta.usesGender && gender) {
      return lineMeta.defaultCategory?.[gender] || defaultCategoryForGender(gender);
    }
    return lineMeta.defaultCategory || lineMeta.categories?.[0] || 'clinical';
  }

  function resolveBookingGender(line, gender) {
    const lineMeta = getPublicLine(line);
    if (lineMeta?.implicitGender) return lineMeta.implicitGender;
    return gender || '';
  }

  function readClientSessionRaw() {
    return clientPortalSessionMemory;
  }

  function writeClientSessionRaw(value) {
    clientPortalSessionMemory = value;
    try { sessionStorage.removeItem(CLIENT_SESSION_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(CLIENT_SESSION_KEY); } catch { /* ignore */ }
    return true;
  }

  function clearClientSessionRaw() {
    clientPortalSessionMemory = null;
    try { sessionStorage.removeItem(CLIENT_SESSION_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(CLIENT_SESSION_KEY); } catch { /* ignore */ }
  }

  function generatePortalCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function normalizePortalCode(code) {
    return String(code || '').replace(/\D/g, '');
  }

  const PORTAL_PW_SALT = 'onyx-studios-portal-v1';

  async function hashPortalPassword(password) {
    const text = PORTAL_PW_SALT + String(password || '');
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const data = new TextEncoder().encode(text);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381;
    for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h) ^ text.charCodeAt(i);
    return `fb${(h >>> 0).toString(16)}`;
  }

  function clientNeedsPortalPassword(client) {
    return !!(client && !client.portalPasswordHash);
  }

  function findReturningClientForBooking(phone, email) {
    const client = findClientByPhone(phone);
    if (!client) return null;
    const emailMatch = (client.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase();
    if (!emailMatch) return null;
    const n = normalizePhone(phone);
    const prior = getAppointments().filter((a) =>
      !['canceled', 'no_show'].includes(a.status)
      && (a.clientId === client.id || normalizePhone(a.clientPhone) === n)
    );
    return prior.length > 0 ? client : null;
  }

  function matchClientPortalSecret(client, secret) {
    if (!client || secret == null || secret === '') return false;
    const raw = String(secret).trim();
    const code = normalizePortalCode(raw);
    if (code.length === 6 && normalizePortalCode(client.portalCode) === code) return true;
    return false;
  }

  async function matchClientPortalPassword(client, password) {
    if (!client?.portalPasswordHash || !password) return false;
    const hash = await hashPortalPassword(password);
    return hash === client.portalPasswordHash;
  }

  async function setClientPortalPassword(clientId, password, confirm) {
    if (!clientId) return { error: 'Client not found.' };
    if (!password || String(password).length < 8) {
      return { error: 'Password must be at least 8 characters.' };
    }
    if (confirm != null && password !== confirm) {
      return { error: 'Passwords do not match.' };
    }
    const hash = await hashPortalPassword(password);
    const client = updateClient(clientId, { portalPasswordHash: hash });
    return { client };
  }

  function ensureClientPortalAccess(clientId) {
    if (!clientId) return null;
    const client = getClient(clientId);
    if (!client) return null;
    if (client.portalCode) return client;
    return updateClient(clientId, { portalCode: generatePortalCode() });
  }

  function findClientForPortalLogin(phone, email, secret) {
    const client = findClientByPhone(phone);
    if (!client) return null;
    const emailMatch = (client.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase();
    if (!emailMatch) return null;
    if (matchClientPortalSecret(client, secret)) return client;
    return null;
  }

  async function loginClientPortal(phone, email, secret, opts = {}) {
    const client = findClientByPhone(phone);
    if (!client) {
      return { error: 'We could not find a matching profile. Check your phone and email.' };
    }
    const emailMatch = (client.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase();
    if (!emailMatch) {
      return { error: 'We could not find a matching profile. Check your phone and email.' };
    }

    const mode = opts.mode === 'password' ? 'password' : (opts.mode === 'code' ? 'code' : null);
    let authed = false;

    if (mode === 'code') {
      authed = matchClientPortalSecret(client, secret);
      if (!authed) {
        return { error: 'Incorrect access code. Check the 6-digit code from your confirmation email or use the Password tab if you have set one.' };
      }
    } else if (mode === 'password') {
      if (!client.portalPasswordHash) {
        return { error: 'No portal password on file yet. Sign in with your 6-digit access code first — you can create a password after if you want.' };
      }
      authed = await matchClientPortalPassword(client, secret);
      if (!authed) {
        return { error: 'Incorrect password. Try again or switch to the Access code tab.' };
      }
    } else {
      authed = matchClientPortalSecret(client, secret);
      if (!authed && client.portalPasswordHash) {
        authed = await matchClientPortalPassword(client, secret);
      }
      if (!authed) {
        return { error: 'Incorrect access code or password. Use one or the other — not both.' };
      }
    }

    if (!writeClientSessionRaw(JSON.stringify({ clientId: client.id, at: Date.now() }))) {
      return { error: 'Could not save login session. Allow site storage and try again.' };
    }
    syncClientLinkedRecords(client, { force: true });
    return {
      client: getClient(client.id) || client,
      needsPassword: clientNeedsPortalPassword(client),
    };
  }

  async function setupAuthedClientPortalPassword(password, confirm) {
    const client = getAuthedClient();
    if (!client) return { error: 'Please sign in first.' };
    const saved = await setClientPortalPassword(client.id, password, confirm);
    if (saved?.error) return saved;
    return { client: saved.client, needsPassword: false };
  }

  async function setupClientPortalPassword(phone, email, code, password, confirm) {
    const client = findClientForPortalLogin(phone, email, code);
    if (!client) {
      return { error: 'We could not verify your access code. Check your phone, email, and 6-digit code.' };
    }
    const saved = await setClientPortalPassword(client.id, password, confirm);
    if (saved?.error) return saved;
    if (!writeClientSessionRaw(JSON.stringify({ clientId: client.id, at: Date.now() }))) {
      return { error: 'Password saved but login failed. Sign in with your new password.' };
    }
    return { client: saved.client, needsPassword: false };
  }

  function getClientSession() {
    const raw = readClientSessionRaw();
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (!data?.clientId || !data?.at) return null;
      if (Date.now() - data.at > CLIENT_SESSION_TTL_MS) {
        clearClientSessionRaw();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function isClientPortalAuthed() {
    const session = getClientSession();
    return !!(session && getClient(session.clientId));
  }

  function getAuthedClient() {
    const session = getClientSession();
    if (!session) return null;
    return getClient(session.clientId) || null;
  }

  function logoutClientPortal() {
    clearClientSessionRaw();
  }

  function appointmentDateTime(appt) {
    if (!appt?.date || !appt?.startTime) return null;
    return new Date(`${appt.date}T${appt.startTime}:00`);
  }

  function hoursUntilAppointment(appt) {
    const dt = appointmentDateTime(appt);
    if (!dt || Number.isNaN(dt.getTime())) return Infinity;
    return (dt.getTime() - Date.now()) / (1000 * 60 * 60);
  }

  function hoursSinceAppointment(appt) {
    const dt = appointmentDateTime(appt);
    if (!dt || Number.isNaN(dt.getTime())) return Infinity;
    return (Date.now() - dt.getTime()) / (1000 * 60 * 60);
  }

  function wasLateCancellation(appt) {
    if (appt?.status !== 'canceled') return !!(appt?.lateCancel);
    if (appt.lateCancel) return true;
    if (!appt.canceledAt) return false;
    const apptDt = appointmentDateTime(appt);
    const cancelDt = new Date(appt.canceledAt);
    if (!apptDt || Number.isNaN(cancelDt.getTime())) return false;
    const hoursBefore = (apptDt.getTime() - cancelDt.getTime()) / (1000 * 60 * 60);
    return hoursBefore < ATTENDANCE_VIOLATION_POLICY.lateCancelHours && hoursBefore >= 0;
  }

  function isRecentAttendanceViolation(appt) {
    const hoursAgo = hoursSinceAppointment(appt);
    if (hoursAgo < 0 || hoursAgo > ATTENDANCE_VIOLATION_POLICY.lookbackHours) return false;
    if (appt.status === 'no_show') return true;
    if (appt.status === 'canceled' && wasLateCancellation(appt)) return true;
    return false;
  }

  function clientHasRecentAttendanceViolation(clientId, phone) {
    return getClientAppointments(clientId, phone).some(isRecentAttendanceViolation);
  }

  function calcPrepaidBookingRefund(prepaidAmount) {
    const amt = Math.max(0, Number(prepaidAmount) || 0);
    if (!amt) return { refundable: 0, retained: 0, refundPercent: 0 };
    const half = amt * ATTENDANCE_VIOLATION_POLICY.maxRefundPercent;
    const retained = Math.max(ATTENDANCE_VIOLATION_POLICY.minRetainAmount, half);
    const refundable = Math.max(0, Math.round((amt - retained) * 100) / 100);
    return {
      refundable,
      retained: Math.round((amt - refundable) * 100) / 100,
      refundPercent: amt ? refundable / amt : 0,
    };
  }

  function getClientBookingPaymentPolicy(clientId, phone) {
    const violated = clientHasRecentAttendanceViolation(clientId, phone);
    return {
      requiresFullPrice: violated,
      violationRecent: violated,
      refundRetainMin: ATTENDANCE_VIOLATION_POLICY.minRetainAmount,
      maxRefundPercent: ATTENDANCE_VIOLATION_POLICY.maxRefundPercent,
      message: violated
        ? 'Because of a recent no-show or late cancellation (within 24 hours), full service price is required when booking online. If you cancel, you receive at most a 50% refund — we retain $29 or half your payment, whichever is greater.'
        : '',
    };
  }

  function resolvePublicBookingPrepayAmount(data) {
    const client = findClientByPhone(data.clientPhone);
    const policy = getClientBookingPaymentPolicy(client?.id, data.clientPhone);
    if (!policy.requiresFullPrice) {
      return { amount: SCHEDULING_FEE, mode: 'scheduling_fee', policy };
    }

    const bookIds = resolveBookServiceIds(data);
    const bookSvcs = bookIds.map((id) => getService(id)).filter(Boolean);
    const bookSvc = bookSvcs[0] || getService(data.bookServiceId || data.serviceId);
    const bookingMode = data.bookingMode || 'consult';
    const isDirect = bookingMode === 'direct' && bookSvc && (
      bookSvcs.length > 1
        ? bookSvcs.every((s) => resolvePublicBookingMode(s) === 'direct')
        : resolvePublicBookingMode(bookSvc) === 'direct'
    );
    let amount = SCHEDULING_FEE;
    if (isDirect && bookSvcs.length) {
      amount = combineDirectBookingServices(bookSvcs, data.luxAddons || []).price;
    } else if (bookSvcs.length) {
      amount = bookSvcs.reduce(
        (max, s) => Math.max(max, s.consultFromPrice || s.price || 0),
        window.STUDIO_COLOR_CONSULT_FROM || 225,
      );
    } else if (bookSvc) {
      amount = isDirect
        ? (bookSvc.price || 0) + calcMensLuxAddonTotal(data.luxAddons || [])
        : (bookSvc.consultFromPrice || bookSvc.price || window.STUDIO_COLOR_CONSULT_FROM || 225);
    }
    return {
      amount: Math.max(amount, SCHEDULING_FEE),
      mode: 'full_prepay',
      policy,
    };
  }

  function getAppointmentChangePolicy(appt) {
    const hours = hoursUntilAppointment(appt);
    const allowed = !!(appt && appt.status === 'scheduled');
    const withinFreeWindow = hours >= RESCHEDULE_POLICY.freeWindowHours;
    return {
      allowed,
      withinFreeWindow,
      feeRequired: allowed && !withinFreeWindow,
      feeAmount: allowed && !withinFreeWindow ? RESCHEDULE_POLICY.lateFee : 0,
      hoursUntil: hours,
    };
  }

  function getReschedulePolicy(appt) {
    const base = getAppointmentChangePolicy(appt);
    return {
      ...base,
      message: !base.allowed
        ? 'This appointment cannot be rescheduled online.'
        : base.withinFreeWindow
          ? 'Free to reschedule — your appointment is more than 48 hours away.'
          : `Within 48 hours — a $${RESCHEDULE_POLICY.lateFee} reschedule fee applies.`,
    };
  }

  function getCancellationPolicy(appt) {
    if (appt?.attendancePenaltyBooking && (appt.prepaidAtBooking || 0) > 0) {
      const refund = calcPrepaidBookingRefund(appt.prepaidAtBooking);
      const allowed = !!(appt && appt.status === 'scheduled');
      return {
        allowed,
        withinFreeWindow: false,
        feeRequired: false,
        attendancePenalty: true,
        prepaidRefund: refund,
        feeAmount: 0,
        hoursUntil: hoursUntilAppointment(appt),
        message: allowed
          ? `Prepaid booking — canceling refunds up to ${formatPrice(refund.refundable)}. We retain ${formatPrice(refund.retained)} ($${ATTENDANCE_VIOLATION_POLICY.minRetainAmount} or 50%, whichever is greater).`
          : 'This appointment cannot be canceled online.',
      };
    }
    const base = getAppointmentChangePolicy(appt);
    return {
      ...base,
      message: !base.allowed
        ? 'This appointment cannot be canceled online.'
        : base.withinFreeWindow
          ? 'Free to cancel — your appointment is more than 48 hours away.'
          : `Within 48 hours — a $${RESCHEDULE_POLICY.lateFee} cancellation fee applies.`,
    };
  }

  // ——— Inquiries ———
  function getInquiries() {
    return read(KEYS.inquiries, []).sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function updateInquiry(id, patch) {
    const list = getInquiries();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    write(KEYS.inquiries, list);
    return list[idx];
  }

  // ——— Clients ———
  function stableClientId(client, idx) {
    const basis = [
      client?.id,
      client?.phone,
      client?.email,
      client?.name,
      client?.createdAt,
      idx,
    ].map((v) => String(v || '').trim().toLowerCase()).join('|');
    let hash = 0;
    for (let i = 0; i < basis.length; i += 1) {
      hash = ((hash << 5) - hash) + basis.charCodeAt(i);
      hash |= 0;
    }
    return 'SC-' + Math.abs(hash).toString(36).toUpperCase().padStart(8, '0').slice(0, 8);
  }

  function normalizeClientsList(raw) {
    const list = Array.isArray(raw) ? raw : [];
    const byId = new Map();
    let changed = list.length !== raw?.length;
    list.forEach((c, idx) => {
      if (!c || typeof c !== 'object') {
        changed = true;
        return;
      }
      let id = String(c.id || '').trim();
      if (!id || id === 'undefined' || id === 'null') {
        id = stableClientId(c, idx);
        changed = true;
      }
      const entry = { ...c, id };
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, entry);
        return;
      }
      changed = true;
      const prevAt = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
      const nextAt = new Date(entry.updatedAt || entry.createdAt || 0).getTime();
      byId.set(id, nextAt >= prevAt ? entry : prev);
    });
    const normalized = [...byId.values()];
    if (changed) write(KEYS.clients, normalized);
    return normalized;
  }

  function getClients() {
    return normalizeClientsList(read(KEYS.clients, []))
      .sort((a, b) => {
        const diff = new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        if (diff !== 0) return diff;
        return (a.name || '').localeCompare(b.name || '');
      });
  }

  function getClient(id) {
    return getClients().find((c) => c.id === id) || null;
  }

  function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function findClientByPhone(phone) {
    const n = normalizePhone(phone);
    return getClients().find((c) => normalizePhone(c.phone) === n) || null;
  }

  function normalizeClientName(name) {
    return (name || '').trim().toLowerCase();
  }

  function findClientsByName(name) {
    const n = normalizeClientName(name);
    if (!n || n.length < 3) return [];
    return getClients().filter((c) => normalizeClientName(c.name) === n);
  }

  function findClientForUpsert(data) {
    const list = getClients();
    if (data.id) return list.find((c) => c.id === data.id) || null;
    const byPhone = findClientByPhone(data.phone);
    if (byPhone) return byPhone;
    if (!normalizePhone(data.phone)) {
      const sameName = findClientsByName(data.name);
      if (sameName.length === 1) return sameName[0];
    }
    return null;
  }

  function isSchedulingFeeTransaction(tx) {
    const items = tx?.items || [];
    return items.length === 1 && String(items[0].name || '').includes('Scheduling fee');
  }

  function getClientCreditEntries(clientId) {
    if (!clientId) return [];
    return read(KEYS.clientCredits, [])
      .filter((e) => e.clientId === clientId)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function creditEntryForTransaction(transactionId) {
    if (!transactionId) return null;
    return read(KEYS.clientCredits, []).find((e) => e.transactionId === transactionId) || null;
  }

  function getClientCreditBalance(clientId) {
    return getClientCreditEntries(clientId).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }

  function addClientCreditEntry(clientId, amount, meta = {}) {
    if (!clientId || amount === 0 || amount === null || Number.isNaN(Number(amount))) return null;
    if (meta.transactionId && creditEntryForTransaction(meta.transactionId)) {
      return creditEntryForTransaction(meta.transactionId);
    }
    const entry = {
      id: 'SCR-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      clientId,
      amount: Number(amount),
      type: meta.type || 'deposit',
      at: new Date().toISOString(),
      appointmentId: meta.appointmentId || '',
      transactionId: meta.transactionId || '',
      notes: meta.notes || '',
    };
    const list = read(KEYS.clientCredits, []);
    list.unshift(entry);
    write(KEYS.clientCredits, list);
    return entry;
  }

  function recordSchedulingFeeCredit(clientId, appointmentId, transactionId) {
    if (!clientId || !transactionId) return null;
    return addClientCreditEntry(clientId, SCHEDULING_FEE, {
      type: 'scheduling_deposit',
      appointmentId,
      transactionId,
      notes: `$${SCHEDULING_FEE} scheduling fee paid — studio credit`,
    });
  }

  function applyClientCredit(clientId, amount, meta = {}) {
    const balance = getClientCreditBalance(clientId);
    const applied = Math.min(balance, Math.max(0, Number(amount) || 0));
    if (!clientId || applied <= 0) return { applied: 0, balance };
    addClientCreditEntry(clientId, -applied, {
      type: 'applied',
      transactionId: meta.transactionId || '',
      appointmentId: meta.appointmentId || '',
      notes: meta.notes || 'Studio credit applied',
    });
    return { applied, balance: getClientCreditBalance(clientId) };
  }

  function hasSchedulingDepositPaid(appointmentId) {
    if (!appointmentId) return false;
    const appt = getAppointment(appointmentId);
    if (appt?.schedulingFeePaid) return true;
    return getTransactions().some((tx) =>
      tx.appointmentId === appointmentId && isSchedulingFeeTransaction(tx) && tx.status === 'completed'
    );
  }

  function getAppointmentCreditStatus(appt) {
    if (!appt) return { eligible: false, paid: false, credited: false, amount: 0 };
    const amount = appt.schedulingFee || 0;
    const eligible = !!(appt.schedulingFeeCredit || amount);
    const paid = eligible && hasSchedulingDepositPaid(appt.id);
    const credited = paid && !!creditEntryForTransaction(
      getTransactions().find((tx) => tx.appointmentId === appt.id && isSchedulingFeeTransaction(tx))?.id
    );
    return { eligible, paid, credited, amount: paid ? amount : 0 };
  }

  function syncClientCreditsFromTransactions() {
    getTransactions()
      .filter((tx) => isSchedulingFeeTransaction(tx) && tx.clientId && tx.status === 'completed')
      .forEach((tx) => {
        recordSchedulingFeeCredit(tx.clientId, tx.appointmentId, tx.id);
        if (tx.appointmentId) {
          const list = getAppointments();
          const idx = list.findIndex((a) => a.id === tx.appointmentId);
          if (idx !== -1 && !list[idx].schedulingFeePaid) {
            list[idx] = { ...list[idx], schedulingFeePaid: true };
            write(KEYS.appointments, list);
          }
        }
      });
  }

  function isFirstTimeClient(clientId, phone) {
    let id = clientId;
    if (!id && phone) id = findClientByPhone(phone)?.id;
    if (!id) return true;
    const completed = getAppointments().filter((a) => a.clientId === id && a.status === 'completed').length;
    if (completed > 0) return false;
    const serviceTxs = getTransactions().filter((t) => t.clientId === id && !isSchedulingFeeTransaction(t)).length;
    return serviceTxs === 0;
  }

  function syncClientVisitTag(clientId) {
    if (!clientId) return;
    const client = getClient(clientId);
    if (!client) return;
    const firstTime = isFirstTimeClient(clientId);
    const tags = client.tags || [];
    const hasTag = tags.includes(FIRST_VISIT_TAG);
    if (firstTime && !hasTag) {
      updateClient(clientId, { tags: [...tags, FIRST_VISIT_TAG] });
    } else if (!firstTime && hasTag) {
      updateClient(clientId, { tags: tags.filter((t) => t !== FIRST_VISIT_TAG) });
    }
  }

  function upsertClient(data) {
    const list = getClients();
    const existing = findClientForUpsert(data);
    const now = new Date().toISOString();
    if (existing) {
      const next = { ...existing, ...data, updatedAt: now };
      if ('birthday' in data) next.birthday = normalizeBirthday(data.birthday) || '';
      const idx = list.findIndex((c) => c.id === existing.id);
      list[idx] = next;
      write(KEYS.clients, list);
      syncClientLinkedRecords(next);
      return next;
    }
    const client = {
      id: 'SC-' + Date.now().toString(36).toUpperCase(),
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      gender: data.gender || '',
      birthday: normalizeBirthday(data.birthday) || '',
      portalCode: data.portalCode || generatePortalCode(),
      notes: data.notes || '',
      tags: data.tags || [FIRST_VISIT_TAG],
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(client);
    write(KEYS.clients, list);
    syncClientLinkedRecords(client);
    return client;
  }

  function updateClient(id, patch) {
    const list = getClients();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    write(KEYS.clients, list);
    return list[idx];
  }

  function deleteClient(id) {
    const list = getClients().filter((c) => c.id !== id);
    write(KEYS.clients, list);
  }

  function findDuplicateClientGroups() {
    const clients = getClients();
    const groups = [];
    const seen = new Set();

    const byPhone = new Map();
    clients.forEach((c) => {
      const phone = normalizePhone(c.phone);
      if (!phone || phone.length < 7) return;
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone).push(c);
    });
    byPhone.forEach((list) => {
      if (list.length < 2) return;
      const key = `phone:${normalizePhone(list[0].phone)}`;
      if (seen.has(key)) return;
      seen.add(key);
      groups.push({ id: key, reason: 'Same phone number', clients: list });
    });

    const byName = new Map();
    clients.forEach((c) => {
      const name = (c.name || '').trim().toLowerCase();
      if (!name || name.length < 3) return;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(c);
    });
    byName.forEach((list, name) => {
      if (list.length < 2) return;
      const normalizedPhones = list
        .map((c) => normalizePhone(c.phone))
        .filter((p) => p.length >= 7);
      if (normalizedPhones.length === list.length && new Set(normalizedPhones).size === 1) return;
      const key = `name:${name}`;
      if (seen.has(key)) return;
      seen.add(key);
      groups.push({ id: key, reason: 'Same client name', clients: list });
    });

    return groups;
  }

  function getDuplicateGroupsForClient(clientId) {
    return findDuplicateClientGroups().filter((g) =>
      g.clients.some((c) => c.id === clientId) && g.clients.length > 1
    );
  }

  function getMergeCandidatesForClient(clientId, query) {
    const selected = getClient(clientId);
    if (!selected) return [];
    const selectedName = normalizeClientName(selected.name);
    const priorityIds = new Set();
    getDuplicateGroupsForClient(clientId).forEach((g) => {
      g.clients.forEach((c) => { if (c.id !== clientId) priorityIds.add(c.id); });
    });
    if (selectedName) {
      findClientsByName(selected.name).forEach((c) => {
        if (c.id !== clientId) priorityIds.add(c.id);
      });
    }
    const priority = [...priorityIds]
      .map((id) => getClient(id))
      .filter(Boolean)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const q = String(query || '').trim().toLowerCase();
    const searchMatches = (q ? searchClients(q) : getClients())
      .filter((c) => c.id !== clientId && !priorityIds.has(c.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const seen = new Set();
    return [...priority, ...searchMatches]
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .slice(0, 50);
  }

  function appointmentMatchesClient(appt, client) {
    if (!appt || !client) return false;
    if (appt.clientId && appt.clientId === client.id) return true;
    const clientPhone = normalizePhone(client.phone);
    const apptPhone = normalizePhone(appt.clientPhone);
    if (clientPhone && apptPhone && clientPhone === apptPhone) return true;
    const clientEmail = (client.email || '').trim().toLowerCase();
    const apptEmail = (appt.clientEmail || '').trim().toLowerCase();
    if (clientEmail && apptEmail && clientEmail === apptEmail) return true;
    const clientName = (client.name || '').trim().toLowerCase();
    const apptName = (appt.clientName || '').trim().toLowerCase();
    return !!(clientName && apptName && clientName === apptName);
  }

  function transactionMatchesClient(tx, client) {
    if (!tx || !client) return false;
    if (tx.clientId && tx.clientId === client.id) return true;
    if (tx.appointmentId) {
      const appt = getAppointment(tx.appointmentId);
      if (appt && appointmentMatchesClient(appt, client)) return true;
    }
    const txName = (tx.clientName || '').trim().toLowerCase();
    const clientName = (client.name || '').trim().toLowerCase();
    if (txName && clientName && txName === clientName) return true;
    const clientPhone = normalizePhone(client.phone);
    const txPhone = normalizePhone(tx.clientPhone);
    return !!(clientPhone && txPhone && clientPhone === txPhone);
  }

  function linkAppointmentToClient(appt, client) {
    if (!appt || !client?.id) return appt;
    if (appt.clientId === client.id) return appt;
    if (!appointmentMatchesClient(appt, client)) return appt;
    return updateAppointment(appt.id, {
      clientId: client.id,
      clientName: client.name || appt.clientName,
      clientPhone: client.phone || appt.clientPhone,
      clientEmail: client.email || appt.clientEmail,
    });
  }

  function ensureClientAppointmentAccess(appt, client) {
    if (!client) return { error: 'Please sign in to continue.' };
    if (!appt) return { error: 'Appointment not found.' };
    if (appt.clientId === client.id) return { appointment: appt };
    if (!appointmentMatchesClient(appt, client)) {
      return { error: 'This appointment is not on your profile.' };
    }
    const linked = linkAppointmentToClient(appt, client);
    return { appointment: linked || appt };
  }

  const clientSyncCache = new Map();
  const CLIENT_SYNC_TTL_MS = 120000;
  const clientSummaryCache = new Map();
  const CLIENT_SUMMARY_TTL_MS = 15000;
  const voidedTxProcessed = new Set();

  function invalidateClientDataCaches(clientId) {
    if (clientId) {
      clientSyncCache.delete(clientId);
      clientSummaryCache.delete(clientId);
    } else {
      clientSyncCache.clear();
      clientSummaryCache.clear();
    }
    voidedTxProcessed.clear();
  }

  function syncClientLinkedRecords(client, opts = {}) {
    if (!client?.id) return { linked: 0 };
    const cached = clientSyncCache.get(client.id);
    if (!opts.force && cached && (Date.now() - cached.at) < CLIENT_SYNC_TTL_MS) {
      return { linked: cached.linked };
    }
    let linked = 0;

    const apptList = getAppointments();
    let apptsDirty = false;
    const appts = apptList.map((a) => {
      if (a.clientId === client.id) return a;
      if (!appointmentMatchesClient(a, client)) return a;
      apptsDirty = true;
      linked += 1;
      return {
        ...a,
        clientId: client.id,
        clientName: client.name || a.clientName,
        clientPhone: client.phone || a.clientPhone,
        clientEmail: client.email || a.clientEmail,
      };
    });
    if (apptsDirty) write(KEYS.appointments, appts);

    const txList = getTransactions();
    let txsDirty = false;
    const txs = txList.map((t) => {
      if (t.clientId === client.id) return t;
      if (!transactionMatchesClient(t, client)) return t;
      txsDirty = true;
      linked += 1;
      return { ...t, clientId: client.id, clientName: client.name || t.clientName };
    });
    if (txsDirty) write(KEYS.transactions, txs);

    const visitLog = getProgramVisitLog();
    let visitDirty = false;
    const visits = visitLog.map((e) => {
      if (e.clientId === client.id) return e;
      if (e.appointmentId) {
        const appt = appts.find((a) => a.id === e.appointmentId) || getAppointment(e.appointmentId);
        if (appt && (appt.clientId === client.id || appointmentMatchesClient(appt, client))) {
          visitDirty = true;
          linked += 1;
          return { ...e, clientId: client.id };
        }
      }
      return e;
    });
    if (visitDirty) write(KEYS.programVisitLog, visits);

    const warrantyLog = getProgramWarrantyLog();
    let warrantyDirty = false;
    const warranties = warrantyLog.map((e) => {
      if (e.clientId === client.id) return e;
      if (e.appointmentId) {
        const appt = appts.find((a) => a.id === e.appointmentId) || getAppointment(e.appointmentId);
        if (appt && (appt.clientId === client.id || appointmentMatchesClient(appt, client))) {
          warrantyDirty = true;
          linked += 1;
          return { ...e, clientId: client.id };
        }
      }
      if (e.transactionId) {
        const tx = txs.find((t) => t.id === e.transactionId) || getTransactions().find((t) => t.id === e.transactionId);
        if (tx && transactionMatchesClient(tx, client)) {
          warrantyDirty = true;
          linked += 1;
          return { ...e, clientId: client.id };
        }
      }
      return e;
    });
    if (warrantyDirty) write(KEYS.programWarrantyLog, warranties);

    const credits = read(KEYS.clientCredits, []);
    let creditsDirty = false;
    const nextCredits = credits.map((e) => {
      if (e.clientId === client.id) return e;
      if (e.appointmentId) {
        const appt = appts.find((a) => a.id === e.appointmentId) || getAppointment(e.appointmentId);
        if (appt && (appt.clientId === client.id || appointmentMatchesClient(appt, client))) {
          creditsDirty = true;
          linked += 1;
          return { ...e, clientId: client.id };
        }
      }
      if (e.transactionId) {
        const tx = txs.find((t) => t.id === e.transactionId) || getTransactions().find((t) => t.id === e.transactionId);
        if (tx && transactionMatchesClient(tx, client)) {
          creditsDirty = true;
          linked += 1;
          return { ...e, clientId: client.id };
        }
      }
      return e;
    });
    if (creditsDirty) write(KEYS.clientCredits, nextCredits);

    const overrides = read(KEYS.programOverrides, []);
    let overridesDirty = false;
    const nextOverrides = overrides.map((o) => {
      if (o.clientId === client.id) return o;
      if (o.transactionId) {
        const tx = txs.find((t) => t.id === o.transactionId) || getTransactions().find((t) => t.id === o.transactionId);
        if (tx && transactionMatchesClient(tx, client)) {
          overridesDirty = true;
          linked += 1;
          return { ...o, clientId: client.id };
        }
      }
      return o;
    });
    if (overridesDirty) write(KEYS.programOverrides, nextOverrides);

    clientSyncCache.set(client.id, { at: Date.now(), linked });
    if (linked > 0) invalidateClientDataCaches(client.id);
    return { linked };
  }

  function previewClientMerge(primaryId, secondaryId) {
    if (!primaryId || !secondaryId || primaryId === secondaryId) return null;
    const primary = getClient(primaryId);
    const secondary = getClient(secondaryId);
    if (!primary || !secondary) return null;
    const appointments = getAppointments().filter((a) => appointmentMatchesClient(a, secondary)).length;
    const transactions = getTransactions().filter((t) => transactionMatchesClient(t, secondary)).length;
    const credits = getClientCreditEntries(secondaryId).length;
    const programOverrides = getProgramOverrides(secondaryId).length;
    return {
      primary,
      secondary,
      appointments,
      transactions,
      credits,
      programOverrides,
      creditBalance: getClientCreditBalance(secondaryId),
    };
  }

  function mergeClients(primaryId, secondaryId) {
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return { error: 'Choose two different profiles to merge.' };
    }
    const primary = getClient(primaryId);
    const secondary = getClient(secondaryId);
    if (!primary || !secondary) return { error: 'Client not found.' };

    const preview = previewClientMerge(primaryId, secondaryId);
    const mergedName = primary.name || secondary.name;

    const appts = getAppointments().map((a) => {
      if (!appointmentMatchesClient(a, secondary)) return a;
      return {
        ...a,
        clientId: primaryId,
        clientName: mergedName,
        clientPhone: primary.phone || secondary.phone || a.clientPhone,
        clientEmail: primary.email || secondary.email || a.clientEmail,
      };
    });
    write(KEYS.appointments, appts);

    const txs = getTransactions().map((t) => {
      if (!transactionMatchesClient(t, secondary)) return t;
      return { ...t, clientId: primaryId, clientName: mergedName };
    });
    write(KEYS.transactions, txs);

    const credits = read(KEYS.clientCredits, []).map((e) =>
      e.clientId === secondaryId ? { ...e, clientId: primaryId } : e
    );
    write(KEYS.clientCredits, credits);

    const overrides = read(KEYS.programOverrides, []).map((o) =>
      o.clientId === secondaryId ? { ...o, clientId: primaryId } : o
    );
    write(KEYS.programOverrides, overrides);

    const warrantyLog = read(KEYS.programWarrantyLog, []).map((e) =>
      e.clientId === secondaryId ? { ...e, clientId: primaryId } : e
    );
    write(KEYS.programWarrantyLog, warrantyLog);
    const visitLog = read(KEYS.programVisitLog, []).map((e) =>
      e.clientId === secondaryId ? { ...e, clientId: primaryId } : e
    );
    write(KEYS.programVisitLog, visitLog);

    mergeClientPhotos(primaryId, secondaryId);

    const contactNotes = [];
    if (secondary.phone && normalizePhone(secondary.phone) !== normalizePhone(primary.phone)) {
      contactNotes.push(`Merged phone: ${secondary.phone}`);
    }
    if (secondary.email && (secondary.email || '').trim().toLowerCase() !== (primary.email || '').trim().toLowerCase()) {
      contactNotes.push(`Merged email: ${secondary.email}`);
    }

    const mergedNotes = [
      primary.notes,
      secondary.notes,
      ...contactNotes,
      `Merged duplicate profile ${secondary.name} (${secondaryId}) on ${todayISO()}.`,
    ].filter(Boolean).join('\n');
    const mergedTags = [...new Set([...(primary.tags || []), ...(secondary.tags || [])])];
    const updated = updateClient(primaryId, {
      name: mergedName,
      email: primary.email || secondary.email,
      phone: primary.phone || secondary.phone,
      gender: primary.gender || secondary.gender,
      birthday: primary.birthday || secondary.birthday || '',
      notes: mergedNotes,
      tags: mergedTags,
    });
    deleteClient(secondaryId);
    syncClientVisitTag(primaryId);
    return {
      success: true,
      primaryId,
      mergedName: updated?.name || mergedName,
      secondaryName: secondary.name,
      moved: {
        appointments: preview?.appointments || 0,
        transactions: preview?.transactions || 0,
        credits: preview?.credits || 0,
        programOverrides: preview?.programOverrides || 0,
      },
    };
  }

  function getClientVisitRecords(clientId) {
    const client = getClient(clientId);
    if (!client) return [];
    return getClientAppointments(clientId, client.phone)
      .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`))
      .map((a) => ({
        appointmentId: a.id,
        date: a.date,
        startTime: a.startTime,
        serviceName: a.intendedService || a.serviceName,
        status: a.status,
        notes: a.notes || '',
        providerSession: a.providerSession,
        intakeCompleted: !!a.intakeCompleted,
        intakeSkipped: !!a.intakeSkipped,
        intakeSkippedForms: a.intakeSkippedForms || [],
        intakeForms: a.intakeForms || [],
        intakeData: a.intakeData || {},
        intakeEmailedAt: a.intakeEmailedAt || '',
        beforePhotosAt: a.beforePhotosAt || '',
        afterPhotosAt: a.afterPhotosAt || '',
        packageVisit: !!a.packageVisit,
        programName: a.programName || '',
      }));
  }

  function markVisitPhotos(apptId, kind) {
    const now = new Date().toISOString();
    const patch = kind === 'before' ? { beforePhotosAt: now } : { afterPhotosAt: now };
    return updateAppointment(apptId, patch);
  }

  function getClientPhotoStore() {
    return read(KEYS.clientPhotos, {});
  }

  function writeClientPhotoStore(store) {
    write(KEYS.clientPhotos, store);
  }

  function getClientPhotos(clientId) {
    if (!clientId) return [];
    const store = getClientPhotoStore();
    return (store[clientId] || []).slice().sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function getClientPhotosForAppointment(clientId, appointmentId, kind) {
    return getClientPhotos(clientId).filter((p) => {
      if (appointmentId && p.appointmentId !== appointmentId) return false;
      if (kind && p.kind !== kind) return false;
      return true;
    });
  }

  function compressImageFile(file, maxDim = CLIENT_PHOTO_MAX_DIM, quality = CLIENT_PHOTO_JPEG_QUALITY) {
    return new Promise((resolve, reject) => {
      if (!file?.type?.startsWith('image/')) {
        reject(new Error('Not an image'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          const scale = Math.min(1, maxDim / Math.max(w, h, 1));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', quality),
            width: w,
            height: h,
          });
        };
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  function addClientPhoto(clientId, opts = {}) {
    const client = getClient(clientId);
    if (!client || !opts.dataUrl) return { error: 'Could not save photo.' };
    const store = getClientPhotoStore();
    const list = store[clientId] || [];
    const photo = {
      id: `PH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId,
      appointmentId: opts.appointmentId || '',
      kind: opts.kind || 'progress',
      label: opts.label || '',
      at: new Date().toISOString(),
      dataUrl: opts.dataUrl,
      width: opts.width || 0,
      height: opts.height || 0,
    };
    list.unshift(photo);
    store[clientId] = list.slice(0, CLIENT_PHOTO_MAX_PER_CLIENT);
    writeClientPhotoStore(store);
    return { photo };
  }

  async function addClientPhotosFromFiles(clientId, files, opts = {}) {
    const added = [];
    const errors = [];
    const fileList = Array.from(files || []).filter((f) => f?.type?.startsWith('image/'));
    for (const file of fileList) {
      try {
        const compressed = await compressImageFile(file);
        const result = addClientPhoto(clientId, { ...compressed, ...opts });
        if (result?.photo) added.push(result.photo);
        else errors.push(file.name || 'photo');
      } catch {
        errors.push(file.name || 'photo');
      }
    }
    return { added, errors };
  }

  function removeClientPhoto(clientId, photoId) {
    const store = getClientPhotoStore();
    const list = store[clientId] || [];
    const next = list.filter((p) => p.id !== photoId);
    if (next.length === list.length) return { error: 'Photo not found.' };
    store[clientId] = next;
    writeClientPhotoStore(store);
    return { ok: true };
  }

  function mergeClientPhotos(primaryId, secondaryId) {
    if (!primaryId || !secondaryId || primaryId === secondaryId) return;
    const store = getClientPhotoStore();
    const primary = store[primaryId] || [];
    const secondary = store[secondaryId] || [];
    if (!secondary.length) return;
    store[primaryId] = [...secondary.map((p) => ({ ...p, clientId: primaryId })), ...primary]
      .slice(0, CLIENT_PHOTO_MAX_PER_CLIENT);
    delete store[secondaryId];
    writeClientPhotoStore(store);
  }

  // ——— Appointments ———
  function getAppointments() {
    return read(KEYS.appointments, []).sort((a, b) => {
      const da = `${a.date}T${a.startTime}`;
      const db = `${b.date}T${b.startTime}`;
      return new Date(da) - new Date(db);
    });
  }

  function getAppointmentsForDate(date) {
    return getAppointments().filter((a) => a.date === date && a.status !== 'canceled');
  }

  function getAppointment(id) {
    return getAppointments().find((a) => a.id === id) || null;
  }

  function findConflict(date, startTime, endTime, column, excludeId) {
    const appts = getAppointmentsForDate(date).filter(
      (a) => a.column === column && a.id !== excludeId
    );
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    return appts.find((a) => {
      const aStart = timeToMinutes(a.startTime);
      const aEnd = timeToMinutes(a.endTime || a.startTime);
      return start < aEnd && end > aStart;
    }) || null;
  }

  function getAvailableSlots(date, column, duration, excludeId) {
    const slots = [];
    eachAvailabilityStart(duration, (slot) => {
      const end = addMinutesToTime(slot, duration);
      if (!findConflict(date, slot, end, column, excludeId)) slots.push(slot);
    });
    return slots;
  }

  function findAvailableColumn(date, startTime, endTime, excludeId) {
    const { columns } = getCalendarSettings();
    for (let col = 1; col <= columns; col++) {
      if (!findConflict(date, startTime, endTime, col, excludeId)) return col;
    }
    return null;
  }

  function hashDateSeed(date) {
    return String(date || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  }

  function curatePublicDisplaySlots(slots, date) {
    const { maxPerDay, minPerDay, showRatio } = PUBLIC_BOOKING_SCARCITY;
    if (!slots.length) return { display: [], totalAvailable: 0 };

    const sorted = [...slots].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const ratioTarget = Math.max(minPerDay, Math.ceil(sorted.length * showRatio));
    const target = Math.min(maxPerDay, ratioTarget);
    if (sorted.length <= target) {
      return { display: sorted, totalAvailable: sorted.length };
    }

    const seed = hashDateSeed(date);
    const periods = [
      { until: 12 * 60 },
      { until: 15 * 60 },
      { until: 18 * 60 },
      { until: 24 * 60 },
    ];
    const buckets = periods.map(() => []);
    sorted.forEach((slot) => {
      const mins = timeToMinutes(slot.time);
      const bucket = buckets.find((_, i) => mins < periods[i].until);
      if (bucket) bucket.push(slot);
    });

    const picked = [];
    const activeBuckets = buckets.filter((b) => b.length);
    activeBuckets.forEach((bucket, bucketIdx) => {
      const ordered = [...bucket].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      const idx = (seed + bucketIdx * 11) % ordered.length;
      const choice = ordered[idx];
      if (!picked.some((p) => p.time === choice.time)) picked.push(choice);
    });

    for (let i = 0; i < sorted.length && picked.length < target; i += 1) {
      const idx = (seed + i * 5) % sorted.length;
      const choice = sorted[idx];
      if (!picked.some((p) => p.time === choice.time)) picked.push(choice);
    }

    picked.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return { display: picked.slice(0, target), totalAvailable: sorted.length };
  }

  function getPublicMinBookableMinutes(date) {
    if (date !== todayISO()) return 0;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + PUBLIC_SAME_DAY_LEAD_MINUTES;
  }

  function isPublicSlotBookable(date, startTime) {
    return timeToMinutes(startTime) >= getPublicMinBookableMinutes(date);
  }

  function collectPublicOpenSlots(date, duration) {
    const seen = new Set();
    const slots = [];
    const minMins = getPublicMinBookableMinutes(date);
    eachAvailabilityStart(duration, (time) => {
      if (seen.has(time)) return;
      if (timeToMinutes(time) < minMins) return;
      const end = addMinutesToTime(time, duration);
      const column = findAvailableColumn(date, time, end);
      if (column) {
        seen.add(time);
        slots.push({ time, column });
      }
    });
    return slots;
  }

  function getPublicAvailableSlots(date, duration) {
    return curatePublicDisplaySlots(collectPublicOpenSlots(date, duration), date).display;
  }

  function getPublicSlotAvailability(date, duration) {
    return curatePublicDisplaySlots(collectPublicOpenSlots(date, duration), date);
  }

  function getFinanceMonthlyPayment(financeTotal) {
    if (typeof window.getFinanceMonthlyPayment === 'function') {
      return window.getFinanceMonthlyPayment(financeTotal);
    }
    const total = Number(financeTotal) || 0;
    if (!total) return 0;
    const months = window.STUDIO_FINANCE_TERM_MONTHS ?? 12;
    return Math.round(total / months);
  }

  function buildFromPriceResult(candidates) {
    const valid = (candidates || []).filter((c) => Number(c.amount) > 0);
    if (!valid.length) return { amount: 0, suffix: '', display: '' };
    const best = valid.sort((a, b) => a.amount - b.amount)[0];
    const suffix = best.suffix || '';
    return {
      amount: best.amount,
      suffix,
      display: `From ${formatPrice(best.amount)}${suffix}`,
    };
  }

  function publicFromPriceOpts(opts = {}) {
    return {
      excludeFinance: opts.excludeFinance ?? !!window.ONYX_STUDIO_PUBLIC_BOOKING,
      publicDisplay: opts.publicDisplay ?? !!window.ONYX_STUDIO_PUBLIC_BOOKING,
    };
  }

  function isFromPriceQuarterlyEligible(amount, opts = {}) {
    const amt = Number(amount);
    if (!amt || amt <= 0) return false;
    if (opts.publicDisplay) return true;
    return isQuarterlyPaymentEligible(amt);
  }

  function getExtensionFromPriceCandidates(family, opts = {}) {
    const priceOpts = publicFromPriceOpts(opts);
    const { excludeFinance } = priceOpts;
    const cfg = getConfigurableExtension(family);
    const candidates = [];
    if (cfg?.lengths?.length) {
      cfg.lengths.forEach((row) => {
        const pif = row.pif ?? 0;
        const qPay = getExtensionQuarterlyPayment(row);
        if (isFromPriceQuarterlyEligible(qPay, priceOpts)) {
          candidates.push({ amount: qPay, suffix: '/quarter' });
        }
        if (!excludeFinance) {
          const financeTotal = computeFinancePackagePrice({ pifAmount: pif });
          const financeMo = getFinanceMonthlyPayment(financeTotal);
          if (financeMo) candidates.push({ amount: financeMo, suffix: '/mo' });
        }
        if (pif) candidates.push({ amount: pif, suffix: '' });
      });
    }
    getServices()
      .filter((s) => programBaseName(s.name) === family && paymentType(s.name) === 'Quarterly')
      .forEach((s) => {
        if (isFromPriceQuarterlyEligible(s.price, priceOpts)) {
          candidates.push({ amount: s.price, suffix: '/quarter' });
        }
      });
    return candidates;
  }

  function getSystemFromPrice(services, base, opts = {}) {
    const priceOpts = publicFromPriceOpts(opts);
    const { excludeFinance } = priceOpts;
    const tiers = services.filter((s) => programBaseName(s.name) === base);
    const quarterly = tiers.find((s) => paymentType(s.name) === 'Quarterly')?.price;
    const pifSvc = tiers.find((s) => isPayInFullTier(s));
    const pif = pifSvc?.price;
    const financeTier = tiers.find((s) => s.isFinanceTier || paymentType(s.name) === 'Finance');
    const financeTotal = financeTier?.price
      || (pifSvc ? computeFinancePackagePrice({ pifAmount: pifSvc.price }) : 0);
    const candidates = [];
    if (quarterly && isFromPriceQuarterlyEligible(quarterly, priceOpts)) {
      candidates.push({ amount: quarterly, suffix: '/quarter' });
    }
    if (!excludeFinance) {
      const financeMo = getFinanceMonthlyPayment(financeTotal);
      if (financeMo) candidates.push({ amount: financeMo, suffix: '/mo' });
    }
    if (pif) candidates.push({ amount: pif, suffix: '' });
    return buildFromPriceResult(candidates);
  }

  function getExtensionPublicFromPrice(family, opts = {}) {
    const cfg = getConfigurableExtension(family);
    if (!cfg?.lengths?.length) {
      const from = extensionFromPrice(family);
      return from
        ? { amount: from, suffix: '', display: `From ${formatPrice(from)}` }
        : { amount: 0, suffix: '', display: '' };
    }
    return buildFromPriceResult(getExtensionFromPriceCandidates(family, opts));
  }

  /** Monthly payment equivalents for public category "from" lines (quarterly ÷ 3, annual plan ÷ 12, finance ÷ 12). */
  function getFamilyMonthlyPaymentAmounts(services, base, category, opts = {}) {
    const priceOpts = publicFromPriceOpts(opts);
    const amounts = [];
    if (isExtensionCategory(category)) {
      const cfg = getConfigurableExtension(base);
      cfg?.lengths?.forEach((row) => {
        if (row.quarterly) {
          amounts.push(row.quarterly / 12);
          const installment = getExtensionQuarterlyPayment(row);
          if (installment) amounts.push(installment / 3);
        }
        const pif = row.pif ?? 0;
        if (pif) {
          const finMo = getFinanceMonthlyPayment(computeFinancePackagePrice({ pifAmount: pif }));
          if (finMo) amounts.push(finMo);
        }
      });
    }
    const tiers = (services || []).filter((s) => programBaseName(s.name) === base);
    const quarterly = tiers.find((s) => paymentType(s.name) === 'Quarterly');
    if (quarterly?.price && isFromPriceQuarterlyEligible(quarterly.price, priceOpts)) {
      amounts.push(quarterly.price / 3);
    }
    const pifSvc = tiers.find((s) => isPayInFullTier(s));
    if (pifSvc?.price) {
      const finMo = getFinanceMonthlyPayment(computeFinancePackagePrice({ pifAmount: pifSvc.price }));
      if (finMo) amounts.push(finMo);
    }
    return amounts.filter((a) => Number(a) > 0);
  }

  function formatCategoryMonthlyFromLine(category, amount) {
    const price = formatPrice(Math.round(amount));
    if (category === 'womens_extensions') return `Extension options from ${price} a month`;
    if (category === 'program') return `Men\u2019s hair systems from ${price} a month`;
    if (category === 'womens_program') return `Hair systems & toppers from ${price} a month`;
    if (category === 'clinical') return `Clinical programs from ${price} a month`;
    return `Programs from ${price} a month`;
  }

  function getCategoryLowestMonthlyFrom(category, gender, opts = {}) {
    const families = getProgramFamilies({ gender, category });
    if (!families.length) return { amount: 0, display: '' };
    let min = Infinity;
    families.forEach((grp) => {
      getFamilyMonthlyPaymentAmounts(grp.services, grp.base, category, opts).forEach((a) => {
        if (a < min) min = a;
      });
    });
    if (!Number.isFinite(min)) return { amount: 0, display: '' };
    const rounded = Math.round(min);
    return {
      amount: rounded,
      display: formatCategoryMonthlyFromLine(category, rounded),
    };
  }

  function usesCategoryMonthlyFrom(category) {
    return ['womens_extensions', 'program'].includes(category);
  }

  function getPublicFromPrice(services, base, category, opts = {}) {
    const priceOpts = publicFromPriceOpts(opts);
    if (isExtensionCategory(category)) return getExtensionPublicFromPrice(base, priceOpts);
    if (['program', 'womens_program', 'clinical'].includes(category)) return getSystemFromPrice(services, base, priceOpts);
    const match = services.filter((s) => programBaseName(s.name) === base || s.name === base);
    const list = match.length ? match : services;
    const consultSvc = list.find((s) => s.publicBooking === 'consult');
    if (consultSvc) {
      const from = consultSvc.consultFromPrice || window.STUDIO_COLOR_CONSULT_FROM || consultSvc.price;
      return { amount: from, suffix: '', display: `Starting from ${formatPrice(from)}` };
    }
    const prices = list.map((s) => s.price).filter((p) => p > 0);
    if (!prices.length) return { amount: 0, suffix: '', display: '' };
    const min = Math.min(...prices);
    return { amount: min, suffix: '', display: formatPrice(min) };
  }

  function resolvePublicBookingMode(svc) {
    if (!svc) return 'consult';
    if (svc.publicBooking === 'direct') return 'direct';
    if (svc.publicBooking === 'consult') return 'consult';
    if (['mens_grooming', 'womens_styling'].includes(svc.category)) return 'direct';
    return 'consult';
  }

  function resolvePublicConsultLabel(interest, opts = {}) {
    const line = opts.line || '';
    const category = opts.category || '';
    const name = String(interest || '').trim();
    if (line === 'barber' || line === 'salon') {
      return name ? `Color consultation — ${name}` : 'Color consultation';
    }
    if (category === 'womens_extensions') {
      return name ? `Extension consultation — ${name}` : 'Extension consultation';
    }
    if (category === 'womens_program' || category === 'program') {
      return name ? `Fitting consultation — ${name}` : 'Fitting consultation';
    }
    if (category === 'clinical') {
      return name ? `Trichology consultation — ${name}` : 'Trichology consultation';
    }
    return name ? `Consultation — ${name}` : 'New Client Fitting';
  }

  function getMensLuxAddons() {
    return window.STUDIO_MENS_LUX_ADDONS || [];
  }

  function getMensLuxAddon(id) {
    return getMensLuxAddons().find((a) => a.id === id) || null;
  }

  function isLuxAddonId(id) {
    return !!getMensLuxAddon(id);
  }

  function luxAddonAsService(lux) {
    if (!lux) return null;
    return {
      id: lux.id,
      name: lux.name,
      price: lux.price,
      category: 'lux_addon',
      isLuxAddon: true,
      duration: 'Add-on',
    };
  }

  function resolveApptLuxAddonIds(appt) {
    if (!appt) return [];
    const fromField = Array.isArray(appt.luxAddons) ? appt.luxAddons : [];
    const fromBooked = (appt.bookedServices || [])
      .filter((row) => row?.mode === 'lux_addon' && row.serviceId)
      .map((row) => row.serviceId);
    return [...new Set([...fromField, ...fromBooked].filter(Boolean))];
  }

  function calcMensLuxAddonTotal(addonIds) {
    const addons = getMensLuxAddons();
    return (addonIds || []).reduce((sum, id) => {
      const item = addons.find((a) => a.id === id);
      return sum + (item?.price || 0);
    }, 0);
  }

  function calcDirectBookingDuration(svc, luxAddonIds) {
    if (!svc) return 60;
    let mins = getAppointmentDurationMin(svc);
    if (svc.luxAddonsEligible && (luxAddonIds || []).length >= 2) {
      mins += window.STUDIO_LUX_ADDON_EXTRA_MIN || 15;
    }
    return mins;
  }

  function calcDirectBookingSchedulingDuration(svc, luxAddonIds) {
    if (!svc) return 30;
    let mins = getProviderDurationMin(svc);
    if (svc.luxAddonsEligible && (luxAddonIds || []).length >= 2) {
      mins += window.STUDIO_LUX_ADDON_EXTRA_MIN || 15;
    }
    return mins;
  }

  function getSchedulingDurationMin(service, luxAddonIds) {
    if (!service) return 30;
    if (service.luxAddonsEligible && luxAddonIds) {
      return calcDirectBookingSchedulingDuration(service, luxAddonIds);
    }
    return getProviderDurationMin(service);
  }

  function getAvailabilityStepMin(blockMinutes) {
    const { slotMinutes } = getCalendarSettings();
    if (blockMinutes <= 30) return Math.min(15, slotMinutes);
    return slotMinutes;
  }

  function eachAvailabilityStart(blockMinutes, fn) {
    const { startHour, endHour } = getCalendarSettings();
    const step = getAvailabilityStepMin(blockMinutes);
    for (let m = startHour * 60; m < endHour * 60; m += step) {
      fn(minutesToTime(m));
    }
  }

  function formatLuxAddonNote(luxAddonIds) {
    const addons = getMensLuxAddons();
    const names = (luxAddonIds || []).map((id) => addons.find((a) => a.id === id)?.name).filter(Boolean);
    return names.length ? `Lux add-ons: ${names.join(', ')}` : '';
  }

  function getPublicBookableDates(daysAhead = 56) {
    const out = [];
    const start = new Date();
    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d.getDay() === 0) continue;
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  function searchClients(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return getClients();
    const tokens = q.split(/\s+/).filter(Boolean);
    const phoneQ = normalizePhone(q);
    return getClients().filter((c) => {
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = normalizePhone(c.phone);
      const portal = String(c.portalCode || '').toLowerCase();
      const notes = (c.notes || '').toLowerCase();
      const matchesToken = (token) => {
        const t = token.toLowerCase();
        const phoneToken = normalizePhone(token);
        return name.includes(t)
          || email.includes(t)
          || (phoneToken.length >= 3 && phone.includes(phoneToken))
          || portal.includes(t)
          || notes.includes(t);
      };
      if (tokens.length > 1) return tokens.every(matchesToken);
      return matchesToken(q)
        || (phoneQ.length >= 3 && phone.includes(phoneQ));
    });
  }

  function resolveBookingExtras(data = {}) {
    const VF = window.StudioVisitFlow;
    const prefs = VF?.buildClientPreferences
      ? VF.buildClientPreferences(data.clientPreferences || data)
      : (data.clientPreferences || null);
    const prefNote = VF?.formatClientPreferencesNote?.(prefs) || '';
    const baseNotes = String(data.notes || '').trim();
    const notes = [baseNotes, prefNote].filter(Boolean).join('\n\n');
    const inspoFromPrefs = prefs?.inspoPhotos || [];
    const inspoFromData = Array.isArray(data.bookingInspoPhotos) ? data.bookingInspoPhotos : [];
    const bookingInspoPhotos = inspoFromData.length ? inspoFromData : inspoFromPrefs;
    return {
      clientPreferences: prefs,
      bookingInspoPhotos,
      notes,
    };
  }

  function isOnlineBookingSource(source) {
    return source === 'client_portal' || source === 'website';
  }

  function getOnlineBookingSourceLabel(source) {
    if (source === 'client_portal') return 'Client portal';
    if (source === 'website') return 'Website';
    return '';
  }

  function getAppointmentInspoPhotos(appt) {
    if (!appt) return [];
    const seen = new Set();
    const out = [];
    const push = (photo) => {
      const key = photo?.id || photo?.dataUrl;
      if (!photo?.dataUrl || !key || seen.has(key)) return;
      seen.add(key);
      out.push(photo);
    };
    (appt.bookingInspoPhotos || []).forEach(push);
    (appt.clientPreferences?.inspoPhotos || []).forEach(push);
    if (appt.clientId) {
      getClientPhotos(appt.clientId)
        .filter((p) => p.appointmentId === appt.id && (p.kind === 'inspo' || p.kind === 'reference'))
        .forEach(push);
    }
    return out;
  }

  function appointmentHasBookingPrep(appt) {
    if (!appt) return false;
    const prefs = appt.clientPreferences || {};
    return getAppointmentInspoPhotos(appt).length > 0
      || !!String(prefs.hairLikes || '').trim()
      || !!String(prefs.hairDislikes || '').trim()
      || !!String(prefs.priorServices || '').trim()
      || !!String(prefs.beverageLabel || prefs.beverage || '').trim();
  }

  function persistBookingInspoPhotos(apptId, clientId, photos = []) {
    if (!apptId || !clientId || !photos.length) return;
    const existing = getClientPhotos(clientId).filter((p) => p.appointmentId === apptId && p.kind === 'inspo');
    const existingUrls = new Set(existing.map((p) => p.dataUrl));
    photos.forEach((photo) => {
      if (!photo?.dataUrl || existingUrls.has(photo.dataUrl)) return;
      addClientPhoto(clientId, {
        appointmentId: apptId,
        kind: 'inspo',
        label: photo.name || 'Inspiration',
        dataUrl: photo.dataUrl,
        width: photo.width || 0,
        height: photo.height || 0,
      });
    });
  }

  function getPendingOnlineBookings() {
    const today = todayISO();
    return sortApptsByTime(
      getAppointments().filter((a) =>
        a.status === 'scheduled'
        && isOnlineBookingSource(a.source)
        && !a.bookingReviewedAt
        && a.date >= today,
      ),
    ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function markBookingReviewed(apptId) {
    return updateAppointment(apptId, { bookingReviewedAt: new Date().toISOString() });
  }

  function createAppointment(data) {
    const svc = data.serviceId ? getService(data.serviceId) : null;
    const bookingExtras = resolveBookingExtras(data);
    const duration = data.duration || getAppointmentDurationMin(svc);
    const schedulingDuration = data.schedulingDuration
      ?? data.providerDuration
      ?? getProviderDurationMin(svc);
    const startTime = data.startTime || '09:00';
    const endTime = data.endTime || addMinutesToTime(startTime, schedulingDuration);
    const column = data.column || 1;
    const conflict = findConflict(data.date || todayISO(), startTime, endTime, column);
    if (conflict) {
      return { error: `Conflict with ${conflict.clientName} at ${formatTime12(conflict.startTime)} (Chair ${conflict.column})` };
    }

    const existingClient = data.clientPhone
      ? findClientByPhone(data.clientPhone)
      : (findClientsByName(data.clientName)[0] || null);
    const appt = {
      id: 'SA-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(),
      status: data.status || 'scheduled',
      createdAt: new Date().toISOString(),
      clientId: data.clientId || existingClient?.id || '',
      clientName: data.clientName || '',
      clientPhone: data.clientPhone || '',
      clientEmail: data.clientEmail || '',
      serviceId: data.serviceId || '',
      serviceName: data.serviceName || (svc ? shortName(svc.name) : ''),
      appointmentType: data.appointmentType || svc?.category || 'clinical',
      date: data.date || todayISO(),
      startTime,
      endTime,
      duration,
      providerDuration: schedulingDuration,
      column,
      notes: bookingExtras.notes,
      price: data.price ?? svc?.price ?? 0,
      source: data.source || 'admin',
      schedulingFee: data.schedulingFee || 0,
      schedulingFeeCredit: !!data.schedulingFeeCredit,
      schedulingFeePaid: !!data.schedulingFeePaid,
      intendedService: data.intendedService || '',
      bookServiceId: data.bookServiceId || '',
      bookServiceIds: data.bookServiceIds || [],
      bookedServices: data.bookedServices || [],
      attendancePenaltyBooking: !!data.attendancePenaltyBooking,
      prepaidAtBooking: data.prepaidAtBooking || 0,
      prepaidBookingTxId: data.prepaidBookingTxId || '',
      fromPriceDisplay: data.fromPriceDisplay || '',
      checkedInAt: data.checkedInAt || '',
      inProgressAt: data.inProgressAt || '',
      withProviderAt: data.withProviderAt || '',
      completedAt: data.completedAt || '',
      intakeCompleted: !!data.intakeCompleted,
      intakeSkipped: !!data.intakeSkipped,
      intakeSkippedForms: data.intakeSkippedForms || [],
      intakeForms: data.intakeForms || [],
      intakeData: data.intakeData || {},
      intakeEmailedAt: data.intakeEmailedAt || '',
      providerSession: data.providerSession || null,
      scheduledVisitType: data.scheduledVisitType || '',
      scheduledVisitTypeId: data.scheduledVisitTypeId || '',
      clientPreferences: bookingExtras.clientPreferences,
      bookingInspoPhotos: bookingExtras.bookingInspoPhotos,
      bookingReviewedAt: data.bookingReviewedAt || '',
      luxAddons: data.luxAddons || [],
      beforePhotosAt: data.beforePhotosAt || '',
      afterPhotosAt: data.afterPhotosAt || '',
      extOptions: data.extOptions || null,
      packageVisit: !!data.packageVisit,
      packagePurchase: !!data.packagePurchase,
      programId: data.programId || '',
      programName: data.programName || '',
      programPaymentPlan: data.programPaymentPlan || '',
      visitNumber: data.visitNumber || 0,
      visitsIncluded: data.visitsIncluded || 0,
      visitValue: data.visitValue || 0,
    };
    const resolvedClientId = appt.clientId || existingClient?.id || data.clientId || '';
    if (resolvedClientId) appt.clientId = resolvedClientId;
    applyPackageContextToAppointment(appt, data, resolvedClientId);
    if (appt.status !== 'scheduled') applyStatusTimestamps(appt, appt.status, 'scheduled');
    const list = getAppointments();
    list.push(appt);
    write(KEYS.appointments, list);
    if (data.clientPhone || data.clientName) {
      const client = upsertClient({
        id: appt.clientId,
        name: data.clientName,
        phone: data.clientPhone,
        email: data.clientEmail,
        gender: svc?.gender || data.gender || '',
      });
      appt.clientId = client.id;
      const list = getAppointments();
      const idx = list.findIndex((a) => a.id === appt.id);
      if (idx !== -1) {
        list[idx].clientId = client.id;
        write(KEYS.appointments, list);
      }
      syncClientVisitTag(client.id);
    }
    if (bookingExtras.bookingInspoPhotos?.length && appt.clientId) {
      persistBookingInspoPhotos(appt.id, appt.clientId, bookingExtras.bookingInspoPhotos);
    }
    return appt;
  }

  function applyStatusTimestamps(appt, newStatus, prevStatus) {
    if (!newStatus || newStatus === prevStatus) return appt;
    const now = new Date().toISOString();
    if (newStatus === 'checked_in' && !appt.checkedInAt) appt.checkedInAt = now;
    if (newStatus === 'in_progress') {
      if (!appt.checkedInAt) appt.checkedInAt = now;
      appt.inProgressAt = now;
    }
    if (newStatus === 'with_provider') {
      if (!appt.checkedInAt) appt.checkedInAt = now;
      if (!appt.inProgressAt) appt.inProgressAt = now;
      appt.withProviderAt = now;
    }
    if (newStatus === 'completed' && !appt.completedAt) appt.completedAt = now;
    if (newStatus === 'no_show' && !appt.noShowAt) appt.noShowAt = now;
    if (newStatus === 'scheduled') {
      appt.checkedInAt = '';
      appt.inProgressAt = '';
      appt.withProviderAt = '';
      appt.completedAt = '';
    }
    return appt;
  }

  function getApptElapsedSummary(appt) {
    const now = Date.now();
    const lines = [];
    if (appt.status === 'scheduled' && appt.date === todayISO()) {
      const start = new Date(`${appt.date}T${appt.startTime}`).getTime();
      if (!Number.isNaN(start) && now > start) {
        lines.push({ label: 'Awaiting arrival', ms: now - start });
      }
    }
    if (appt.checkedInAt && ['checked_in', 'in_progress'].includes(appt.status)) {
      lines.push({ label: appt.status === 'checked_in' ? 'Waiting' : 'Here', ms: now - new Date(appt.checkedInAt).getTime() });
    }
    if (appt.status === 'in_progress' && appt.inProgressAt) {
      lines.push({ label: 'In progress', ms: now - new Date(appt.inProgressAt).getTime() });
    }
    if (appt.status === 'with_provider' && appt.withProviderAt) {
      lines.push({ label: 'With provider', ms: now - new Date(appt.withProviderAt).getTime() });
    }
    return lines;
  }

  function needsIntake(appt) {
    if (!appt || appt.intakeCompleted || appt.intakeSkipped) return false;
    return isFirstTimeClient(appt.clientId, appt.clientPhone);
  }

  function portalIntakeFormsIncomplete(appt) {
    if (!appt) return false;
    const VF = window.StudioVisitFlow;
    if (!VF) return false;
    const forms = VF.getPortalIntakeForms?.(appt) || VF.INTAKE_FORMS || [];
    const signed = appt.intakeForms || [];
    const data = appt.intakeData || {};
    const skipped = appt.intakeSkippedForms || [];
    return forms.some((f) => {
      if (f.signAtVisit) return false;
      const ready = VF.portalIntakeFormReady(f, signed, data, skipped);
      if (skipped.includes(f.id) && !ready) return true;
      return !ready;
    });
  }

  function clientNeedsPortalIntake(appt) {
    if (!appt) return false;
    if (['canceled', 'completed', 'no_show'].includes(appt.status)) return false;
    return portalIntakeFormsIncomplete(appt);
  }

  function getIntakeFormStatus(appt) {
    const VF = window.StudioVisitFlow;
    const portalForms = VF?.getPortalIntakeForms?.(appt) || VF?.INTAKE_FORMS || [];
    const visitForms = VF?.getVisitSignForms?.(appt) || [];
    const signed = appt?.intakeForms || [];
    const skipped = appt?.intakeSkippedForms || [];
    const data = appt?.intakeData || {};
    const portalItems = portalForms.map((form, index) => {
      const ready = !!(VF && VF.portalIntakeFormReady(form, signed, data, skipped));
      let status = 'pending';
      if (ready) status = 'complete';
      else if (skipped.includes(form.id)) status = 'skipped';
      else if (signed.includes(form.id)) status = 'in_progress';
      return {
        index,
        id: form.id,
        label: form.label,
        desc: form.desc,
        required: !!form.required,
        signed: signed.includes(form.id),
        skipped: skipped.includes(form.id),
        ready,
        status,
        signAtVisit: false,
        portal: true,
      };
    });
    const visitItems = visitForms.map((form) => ({
      index: null,
      id: form.id,
      label: form.label,
      desc: form.desc,
      required: !!form.required,
      signed: signed.includes(form.id),
      skipped: skipped.includes(form.id),
      ready: !!(VF && VF.intakeFormReady(form, signed, data, skipped)),
      status: 'at_visit',
      signAtVisit: true,
      portal: false,
    }));
    const items = [...portalItems, ...visitItems];
    const requiredTotal = portalItems.filter((i) => i.required).length;
    const requiredDone = portalItems.filter((i) => i.required && i.ready).length;
    const optionalTotal = portalItems.filter((i) => !i.required).length;
    const optionalDone = portalItems.filter((i) => !i.required && i.ready).length;
    return {
      forms: items,
      portalForms: portalItems,
      requiredTotal,
      requiredDone,
      requiredRemaining: Math.max(0, requiredTotal - requiredDone),
      optionalTotal,
      optionalDone,
      optionalRemaining: Math.max(0, optionalTotal - optionalDone),
      totalForms: portalItems.length,
      completedForms: portalItems.filter((i) => i.ready).length,
      allComplete: portalItems.every((i) => i.ready),
      intakeComplete: !!(appt?.intakeCompleted || isPortalIntakeComplete(appt)),
      canEdit: true,
    };
  }

  function getClientPortalFormsAppointments(clientId, phone) {
    return getClientAppointments(clientId, phone)
      .filter((a) => !['canceled', 'no_show'].includes(a.status))
      .filter((a) => clientNeedsPortalIntake(a)
        || a.intakeCompleted
        || (a.intakeForms || []).length
        || (a.intakeSkippedForms || []).length)
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  }

  function isPortalIntakeComplete(appt) {
    const VF = window.StudioVisitFlow;
    if (!appt || !VF) return false;
    const forms = VF.getPortalIntakeForms?.(appt) || [];
    const signed = appt.intakeForms || [];
    const data = appt.intakeData || {};
    const skipped = appt.intakeSkippedForms || [];
    const requiredReady = forms
      .filter((f) => f.required)
      .every((f) => VF.portalIntakeFormReady(f, signed, data, skipped));
    const skippedResolved = skipped.every((id) => {
      const form = forms.find((f) => f.id === id);
      return !form || VF.portalIntakeFormReady(form, signed, data, skipped);
    });
    return requiredReady && skippedResolved;
  }

  function isIntakeComplete(appt) {
    const VF = window.StudioVisitFlow;
    if (!appt || !VF) return false;
    if (appt.intakeSkipped) return true;
    const forms = VF.getIntakeFormsForAppointment?.(appt) || VF.INTAKE_FORMS || [];
    const signed = appt.intakeForms || [];
    const data = appt.intakeData || {};
    const skipped = appt.intakeSkippedForms || [];
    return forms
      .filter((f) => f.required)
      .every((f) => VF.intakeFormReady(f, signed, data, skipped));
  }

  function getClientPendingIntakeAppointments(clientId, phone) {
    return getClientAppointments(clientId, phone)
      .filter((a) => !['canceled', 'completed', 'no_show'].includes(a.status))
      .filter((a) => clientNeedsPortalIntake(a))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  }

  function saveClientPortalIntake(apptId, patch = {}) {
    const client = getAuthedClient();
    if (!client) return { error: 'Please sign in to save intake forms.' };
    const access = ensureClientAppointmentAccess(getAppointment(apptId), client);
    if (access.error) return { error: access.error };
    const appt = access.appointment;
    if (['canceled', 'completed', 'no_show'].includes(appt.status)) {
      return { error: 'This appointment is no longer open for intake.' };
    }

    const intakeData = { ...(appt.intakeData || {}), ...(patch.intakeData || {}) };
    const intakeForms = patch.intakeForms != null ? patch.intakeForms : (appt.intakeForms || []);
    const intakeSkippedForms = patch.intakeSkippedForms != null
      ? patch.intakeSkippedForms
      : (appt.intakeSkippedForms || []);
    const merged = {
      ...appt,
      intakeData,
      intakeForms,
      intakeSkippedForms,
    };
    const complete = patch.intakeCompleted != null ? patch.intakeCompleted : isPortalIntakeComplete(merged);
    const portalForms = window.StudioVisitFlow?.getPortalIntakeForms?.(merged) || [];
    const skippedRemaining = intakeSkippedForms.filter((id) => {
      const form = portalForms.find((f) => f.id === id);
      return form && !window.StudioVisitFlow.portalIntakeFormReady(form, intakeForms, intakeData, intakeSkippedForms);
    });
    const updated = updateAppointment(apptId, {
      intakeData,
      intakeForms,
      intakeSkippedForms: skippedRemaining,
      intakeCompleted: complete,
      intakeSkipped: skippedRemaining.length > 0,
      intakePortalCompletedAt: complete ? (patch.intakePortalCompletedAt || new Date().toISOString()) : appt.intakePortalCompletedAt,
    });
    return { appointment: updated, intakeCompleted: complete };
  }

  function getClientAllergies(clientId, phone) {
    const VF = window.StudioVisitFlow;
    if (!VF?.hasAllergies) return '';
    const appts = getClientAppointments(clientId, phone)
      .filter((a) => a.intakeData && Object.keys(a.intakeData).length)
      .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
    for (const appt of appts) {
      if (VF.hasAllergies(appt)) return VF.getAllergiesText(appt);
    }
    return '';
  }

  function clientHasAllergies(clientId, phone, appt) {
    const VF = window.StudioVisitFlow;
    if (!VF) return false;
    if (appt && VF.hasAllergies(appt)) return true;
    return !!getClientAllergies(clientId, phone);
  }

  function canAdvanceVisit(appt, targetStatus) {
    if (!appt || !targetStatus) return false;
    if (needsIntake(appt) && ['in_progress', 'with_provider', 'completed'].includes(targetStatus)) {
      return false;
    }
    return true;
  }

  function saveAppointmentVisit(apptId, patch) {
    return updateAppointment(apptId, patch);
  }

  function updateAppointment(id, patch) {
    const list = getAppointments();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const prev = list[idx];
    const next = { ...prev, ...patch };
    if (patch.status) applyStatusTimestamps(next, patch.status, prev.status);
    if (patch.status === 'completed' && next.packageVisit && next.programId && next.clientId) {
      if (!next.packageVisitRedeemedAt) {
        next.packageVisitRedeemedAt = new Date().toISOString();
      }
      recordProgramVisitRedemption({
        clientId: next.clientId,
        programId: next.programId,
        programName: next.programName,
        visitNumber: next.visitNumber,
        visitsIncluded: next.visitsIncluded,
        visitValue: next.visitValue,
        appointmentId: next.id,
        transactionId: next.prepaidBookingTxId || '',
        serviceName: next.serviceName,
        visitDate: next.date,
        redeemedAt: next.packageVisitRedeemedAt,
      });
    }
    if (patch.startTime && !patch.endTime) {
      const block = patch.schedulingDuration
        ?? patch.providerDuration
        ?? next.providerDuration
        ?? patch.duration
        ?? next.duration
        ?? 30;
      next.endTime = addMinutesToTime(patch.startTime, block);
    } else if (patch.startTime && patch.endTime) {
      next.endTime = patch.endTime;
    }
    list[idx] = next;
    write(KEYS.appointments, list);
    if (patch.status) syncClientVisitTag(next.clientId);
    return next;
  }

  function deleteAppointment(id) {
    const list = getAppointments().filter((a) => a.id !== id);
    write(KEYS.appointments, list);
  }

  // ——— Transactions (Register) ———
  function getTransactions() {
    return read(KEYS.transactions, []).sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function getShelfItems() {
    return (window.STUDIO_SHELF_ITEMS || []).map((item) => ({ ...item, active: item.active !== false }));
  }

  function getShelfItem(id) {
    return getShelfItems().find((item) => item.id === id) || null;
  }

  function filterShelfItems({ category, query } = {}) {
    const q = String(query || '').trim().toLowerCase();
    return getShelfItems().filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      return (item.name || '').toLowerCase().includes(q)
        || (item.sku || '').toLowerCase().includes(q);
    });
  }

  function getShelfCategories() {
    return Object.values(window.STUDIO_SHELF_CATEGORIES || {})
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function isShelfPosItem(item) {
    return !!(item?.shelfItem || String(item?.id || '').startsWith('sh-'));
  }

  function createTransaction(data) {
    const tx = {
      id: 'STX-' + Date.now().toString(36).toUpperCase(),
      at: new Date().toISOString(),
      status: data.status || 'completed',
      type: data.type || 'sale',
      paymentMethod: data.paymentMethod || 'card',
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      walkIn: !!data.walkIn,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      total: data.total || 0,
      notes: data.notes || '',
      appointmentId: data.appointmentId || '',
      creditApplied: data.creditApplied || 0,
      cashTendered: data.cashTendered || 0,
      cashChange: data.cashChange || 0,
      refundOf: data.refundOf || '',
      refundedAmount: data.refundedAmount || 0,
    };
    const list = getTransactions();
    list.unshift(tx);
    write(KEYS.transactions, list);
    if (tx.clientId) {
      const client = getClient(tx.clientId);
      if (client) syncClientLinkedRecords(client);
      if (!isSchedulingFeeTransaction(tx)) syncClientVisitTag(tx.clientId);
    } else if (tx.appointmentId) {
      const appt = getAppointment(tx.appointmentId);
      if (appt?.clientId) {
        const client = getClient(appt.clientId);
        if (client) syncClientLinkedRecords(client);
      }
    }
    return tx;
  }

  // ——— Legacy bookings alias ———
  function getBookings() {
    return getAppointments();
  }

  function createBooking(data) {
    const svc = getService(data.serviceId);
    return createAppointment({
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      serviceId: data.serviceId,
      date: data.scheduledDate,
      startTime: data.startTime || '10:00',
      notes: data.notes,
      price: svc?.price,
    });
  }

  function createPublicBooking(data) {
    const wasReturning = !!findReturningClientForBooking(data.clientPhone, data.clientEmail);
    const bookingMode = data.bookingMode || 'consult';
    const bookIds = resolveBookServiceIds(data);
    const bookSvcs = bookIds.map((id) => getService(id)).filter(Boolean);
    const bookSvc = bookSvcs[0] || getService(data.bookServiceId || data.serviceId);
    const isDirect = bookingMode === 'direct' && bookSvc && (
      bookSvcs.length > 1
        ? bookSvcs.every((s) => resolvePublicBookingMode(s) === 'direct')
        : resolvePublicBookingMode(bookSvc) === 'direct'
    );
    const consultSvc = getService('c5');
    const combinedDirect = isDirect && bookSvcs.length
      ? combineDirectBookingServices(bookSvcs, data.luxAddons)
      : null;
    const duration = data.duration || (combinedDirect
      ? combinedDirect.duration
      : isDirect
        ? calcDirectBookingDuration(bookSvc, data.luxAddons)
        : getAppointmentDurationMin(consultSvc));
    const schedulingDuration = data.schedulingDuration || (combinedDirect
      ? combinedDirect.schedulingDuration
      : isDirect
        ? calcDirectBookingSchedulingDuration(bookSvc, data.luxAddons)
        : getProviderDurationMin(consultSvc));
    const startTime = data.startTime;
    if (!isPublicSlotBookable(data.date, startTime)) {
      return { error: 'Same-day appointments must be at least one hour from now. Please choose a later time.' };
    }
    const endTime = addMinutesToTime(startTime, schedulingDuration);
    const column = data.column || findAvailableColumn(data.date, startTime, endTime);
    if (!column) return { error: 'That time is no longer available. Please choose another slot.' };

    const interest = data.intendedService || data.serviceLabel || '';
    const luxNote = isDirect ? formatLuxAddonNote(data.luxAddons) : '';
    const addonTotal = isDirect ? calcMensLuxAddonTotal(data.luxAddons) : 0;
    const prepay = resolvePublicBookingPrepayAmount(data);
    const requiresFullPrice = prepay.mode === 'full_prepay';
    const dueToday = prepay.amount;
    const feeNote = requiresFullPrice
      ? `$${dueToday} service prepayment (50% max refund — we retain $${ATTENDANCE_VIOLATION_POLICY.minRetainAmount} or half, whichever is greater).`
      : `$${SCHEDULING_FEE} scheduling fee paid (non-refundable, credit toward service).`;

    const visitTypeId = data.line === 'barber' ? 'barber' : data.line === 'salon' ? 'salon' : '';
    const bookedForActivity = bookSvcs.length ? bookSvcs : (bookSvc ? [bookSvc] : []);
    const defaultProviderActivity = window.StudioVisitFlow?.resolveActivityForServices?.(bookedForActivity) || '';

    let appt;
    if (isDirect) {
      const svcLabel = [combinedDirect?.serviceName || shortName(bookSvc.name), luxNote].filter(Boolean).join(' · ');
      appt = createAppointment({
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        serviceId: combinedDirect?.serviceId || bookSvc.id,
        serviceName: svcLabel,
        appointmentType: bookSvc?.category || data.category || '',
        scheduledVisitTypeId: visitTypeId,
        providerSession: defaultProviderActivity ? { activityId: defaultProviderActivity } : null,
        date: data.date,
        startTime,
        endTime,
        duration,
        schedulingDuration,
        providerDuration: schedulingDuration,
        column,
        gender: data.gender,
        source: 'website',
        schedulingFee: requiresFullPrice ? dueToday : SCHEDULING_FEE,
        schedulingFeeCredit: !requiresFullPrice,
        attendancePenaltyBooking: requiresFullPrice,
        prepaidAtBooking: requiresFullPrice ? dueToday : 0,
        fromPriceDisplay: data.fromPriceDisplay || '',
        price: combinedDirect?.price ?? ((bookSvc.price || 0) + addonTotal),
        bookServiceId: bookSvc.id,
        bookServiceIds: combinedDirect?.bookServiceIds || bookIds,
        bookedServices: combinedDirect?.bookedServices || [],
        luxAddons: data.luxAddons || [],
        notes: [feeNote, luxNote, data.notes].filter(Boolean).join('\n'),
        clientPreferences: data.clientPreferences,
        bookingInspoPhotos: data.bookingInspoPhotos,
      });
    } else {
      const consultLabel = resolvePublicConsultLabel(interest, {
        line: data.line,
        category: data.category,
      });
      appt = createAppointment({
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        serviceId: 'c5',
        serviceName: consultLabel,
        appointmentType: bookSvc?.category || data.category || 'clinical',
        scheduledVisitTypeId: visitTypeId,
        providerSession: defaultProviderActivity ? { activityId: defaultProviderActivity } : null,
        date: data.date,
        startTime,
        endTime,
        duration,
        schedulingDuration,
        column,
        gender: data.gender,
        source: 'website',
        schedulingFee: requiresFullPrice ? dueToday : SCHEDULING_FEE,
        schedulingFeeCredit: !requiresFullPrice,
        attendancePenaltyBooking: requiresFullPrice,
        prepaidAtBooking: requiresFullPrice ? dueToday : 0,
        intendedService: interest,
        bookServiceId: bookSvc?.id || data.bookServiceId || '',
        bookServiceIds: bookIds,
        bookedServices: bookSvcs.map((s) => ({
          serviceId: s.id,
          serviceName: shortName(s.name),
          price: s.price || 0,
          mode: resolvePublicBookingMode(s),
        })),
        fromPriceDisplay: data.fromPriceDisplay || '',
        price: requiresFullPrice ? dueToday : 0,
        notes: [feeNote, data.notes].filter(Boolean).join('\n'),
        clientPreferences: data.clientPreferences,
        bookingInspoPhotos: data.bookingInspoPhotos,
      });
    }
    if (appt?.error) return appt;

    const client = ensureClientPortalAccess(appt.clientId);
    const tx = createTransaction({
      clientId: client?.id || appt.clientId,
      clientName: data.clientName,
      items: [{
        name: requiresFullPrice ? 'Service prepayment (attendance policy)' : 'Scheduling fee (studio credit)',
        price: dueToday,
        qty: 1,
      }],
      subtotal: dueToday,
      total: dueToday,
      paymentMethod: 'card',
      appointmentId: appt.id,
      notes: requiresFullPrice
        ? 'Full service prepayment after recent no-show/late cancel — 50% max refund on cancellation.'
        : 'Non-refundable scheduling fee — applied as credit toward any Onyx Studios service.',
    });
    updateAppointment(appt.id, {
      schedulingFeePaid: true,
      prepaidBookingTxId: tx.id,
    });
    if (!requiresFullPrice && (client?.id || appt.clientId)) {
      recordSchedulingFeeCredit(client?.id || appt.clientId, appt.id, tx.id);
    }
    const refreshed = getClient(client?.id || appt.clientId);
    return {
      appointment: getAppointment(appt.id),
      transaction: tx,
      portalCode: refreshed?.portalCode || client?.portalCode || '',
      clientId: refreshed?.id || client?.id || '',
      isReturning: wasReturning,
      needsPortalPassword: clientNeedsPortalPassword(refreshed),
      bookingMode: isDirect ? 'direct' : 'consult',
      requiresFullPrice,
      prepaidAmount: dueToday,
      paymentPolicy: prepay.policy,
    };
  }

  function createClientPortalBooking(data) {
    const client = getAuthedClient();
    if (!client) return { error: 'Please sign in to book appointments.' };

    const paymentPolicy = getClientBookingPaymentPolicy(client.id, client.phone);
    if (paymentPolicy.requiresFullPrice && !data.prepaidConfirmed) {
      return {
        error: paymentPolicy.message || 'Full service price is required. Please book on our website or call the studio.',
        requiresFullPrice: true,
        paymentPolicy,
      };
    }

    const bookIds = resolveBookServiceIds(data);
    const bookSvcs = bookIds.map((id) => getService(id)).filter(Boolean);
    const svc = bookSvcs[0] || (data.serviceId ? getService(data.serviceId) : null);
    if (!svc) return { error: 'Please select at least one service.' };

    const duration = data.duration || (bookSvcs.length > 1
      ? bookSvcs.reduce((sum, s) => sum + getAppointmentDurationMin(s), 0)
      : getAppointmentDurationMin(svc));
    const schedulingDuration = data.schedulingDuration || (bookSvcs.length > 1
      ? bookSvcs.reduce((sum, s) => sum + getSchedulingDurationMin(s), 0)
      : getProviderDurationMin(svc));
    const startTime = data.startTime;
    if (!isPublicSlotBookable(data.date, startTime)) {
      return { error: 'Same-day appointments must be at least one hour from now. Please choose a later time.' };
    }
    const endTime = addMinutesToTime(startTime, schedulingDuration);
    const column = data.column || findAvailableColumn(data.date, startTime, endTime);
    if (!column) return { error: 'That time is no longer available. Please choose another slot.' };

    const packagePreview = previewPackageBooking(client.id, {
      serviceId: svc.id,
      extOptions: data.extOptions,
    });
    if (packagePreview?.error) return { error: packagePreview.error };
    if (packagePreview?.mode === 'purchase_needed') {
      return {
        error: packagePreview.message || 'Complete program enrollment at the studio before booking prepaid visits.',
      };
    }

    const serviceLabel = data.serviceLabel
      || (bookSvcs.length > 1 ? bookSvcs.map((s) => shortName(s.name)).join(' + ') : shortName(svc.name));
    const bookPrice = packagePreview?.mode === 'included'
      ? 0
      : (bookSvcs.length > 1
        ? bookSvcs.reduce((sum, s) => sum + (s.price || 0), 0)
        : (packagePreview?.price ?? svc.price ?? 0));
    const appt = createAppointment({
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
      serviceId: svc.id,
      serviceName: serviceLabel,
      date: data.date,
      startTime,
      endTime,
      duration,
      schedulingDuration,
      providerDuration: schedulingDuration,
      column,
      gender: client.gender || data.gender,
      source: 'client_portal',
      price: bookPrice,
      intendedService: packagePreview?.mode === 'included' ? packagePreview.serviceLabel : (data.intendedService || ''),
      bookServiceId: svc.id,
      bookServiceIds: bookIds.length ? bookIds : (data.serviceId ? [data.serviceId] : []),
      bookedServices: bookSvcs.map((s) => ({
        serviceId: s.id,
        serviceName: shortName(s.name),
        price: s.price || 0,
        mode: resolvePublicBookingMode(s),
      })),
      packageVisit: packagePreview?.mode === 'included' ? undefined : false,
      notes: data.notes || '',
      clientPreferences: data.clientPreferences,
      bookingInspoPhotos: data.bookingInspoPhotos,
    });
    if (appt?.error) return appt;
    return { appointment: getAppointment(appt.id), packagePreview };
  }

  function rescheduleClientAppointment(apptId, data, opts = {}) {
    const client = getAuthedClient();
    if (!client) return { error: 'Please sign in to manage appointments.' };

    const access = ensureClientAppointmentAccess(getAppointment(apptId), client);
    if (access.error) return { error: access.error };
    const appt = access.appointment;

    const policy = getReschedulePolicy(appt);
    if (!policy.allowed) return { error: policy.message };

    if (policy.feeRequired && !opts.feePaid) {
      return {
        error: `Changes within ${RESCHEDULE_POLICY.freeWindowHours} hours require a $${RESCHEDULE_POLICY.lateFee} fee.`,
        feeRequired: true,
        feeAmount: RESCHEDULE_POLICY.lateFee,
        policy,
      };
    }

    const svc = data.serviceId ? getService(data.serviceId) : getService(appt.serviceId);
    const duration = data.duration || appt.duration || parseDurationMin(svc?.duration);
    const startTime = data.startTime;
    if (startTime && data.date && !isPublicSlotBookable(data.date, startTime)) {
      return { error: 'Same-day appointments must be at least one hour from now. Please choose a later time.' };
    }

    let feeTransaction = null;
    if (policy.feeRequired && opts.feePaid) {
      feeTransaction = createTransaction({
        clientId: client.id,
        clientName: client.name,
        items: [{
          name: 'Reschedule fee (within 48 hours)',
          price: RESCHEDULE_POLICY.lateFee,
          qty: 1,
        }],
        subtotal: RESCHEDULE_POLICY.lateFee,
        total: RESCHEDULE_POLICY.lateFee,
        paymentMethod: 'card',
        appointmentId: apptId,
        notes: 'Non-refundable reschedule fee — appointment moved within 48-hour window.',
      });
    }

    const result = rescheduleAppointment(apptId, { ...data, duration });
    if (result?.error) return result;

    const updated = updateAppointment(apptId, {
      rescheduledAt: new Date().toISOString(),
      rescheduleCount: (appt.rescheduleCount || 0) + 1,
      lastRescheduleFee: policy.feeRequired ? RESCHEDULE_POLICY.lateFee : 0,
      rescheduleFeePaid: !!policy.feeRequired,
    });
    return { appointment: updated, policy, feeTransaction };
  }

  function cancelClientAppointment(apptId, opts = {}) {
    const client = getAuthedClient();
    if (!client) return { error: 'Please sign in to manage appointments.' };

    const access = ensureClientAppointmentAccess(getAppointment(apptId), client);
    if (access.error) return { error: access.error };
    const appt = access.appointment;

    const policy = getCancellationPolicy(appt);
    if (!policy.allowed) return { error: policy.message };

    if (policy.attendancePenalty) {
      const refund = policy.prepaidRefund || calcPrepaidBookingRefund(appt.prepaidAtBooking);
      let refundTransaction = null;
      if (refund.refundable > 0) {
        refundTransaction = createTransaction({
          clientId: client.id,
          clientName: client.name,
          type: 'refund',
          items: [{
            name: 'Appointment prepayment refund (50% max policy)',
            price: -refund.refundable,
            qty: 1,
          }],
          subtotal: -refund.refundable,
          total: -refund.refundable,
          paymentMethod: 'card',
          appointmentId: apptId,
          refundOf: appt.prepaidBookingTxId || '',
          notes: `Retained ${formatPrice(refund.retained)} per attendance policy ($${ATTENDANCE_VIOLATION_POLICY.minRetainAmount} or 50%, whichever is greater).`,
        });
        if (refundTransaction?.id) {
          addClientCreditEntry(client.id, refund.refundable, {
            source: 'prepaid_refund',
            appointmentId: apptId,
            transactionId: refundTransaction.id,
            notes: 'Prepaid booking cancellation refund',
          });
        }
      }
      const updated = updateAppointment(apptId, {
        status: 'canceled',
        canceledAt: new Date().toISOString(),
        canceledBy: 'client_portal',
        lateCancel: hoursUntilAppointment(appt) < ATTENDANCE_VIOLATION_POLICY.lateCancelHours,
        prepaidRefundAmount: refund.refundable,
        prepaidRetainedAmount: refund.retained,
      });
      return { appointment: updated, policy, refundTransaction, refund };
    }

    if (policy.feeRequired && !opts.feePaid) {
      return {
        error: `Cancellations within ${RESCHEDULE_POLICY.freeWindowHours} hours require a $${RESCHEDULE_POLICY.lateFee} fee.`,
        feeRequired: true,
        feeAmount: RESCHEDULE_POLICY.lateFee,
        policy,
      };
    }

    let feeTransaction = null;
    if (policy.feeRequired && opts.feePaid) {
      feeTransaction = createTransaction({
        clientId: client.id,
        clientName: client.name,
        items: [{
          name: 'Cancellation fee (within 48 hours)',
          price: RESCHEDULE_POLICY.lateFee,
          qty: 1,
        }],
        subtotal: RESCHEDULE_POLICY.lateFee,
        total: RESCHEDULE_POLICY.lateFee,
        paymentMethod: 'card',
        appointmentId: apptId,
        notes: 'Non-refundable cancellation fee — appointment canceled within 48-hour window.',
      });
    }

    const updated = updateAppointment(apptId, {
      status: 'canceled',
      canceledAt: new Date().toISOString(),
      canceledBy: 'client_portal',
      lateCancel: hoursUntilAppointment(appt) < ATTENDANCE_VIOLATION_POLICY.lateCancelHours,
      lastCancelFee: policy.feeRequired ? RESCHEDULE_POLICY.lateFee : 0,
      cancelFeePaid: !!policy.feeRequired,
    });
    return { appointment: updated, policy, feeTransaction };
  }

  function updateBooking(id, patch) {
    return updateAppointment(id, { status: patch.status || undefined, ...patch });
  }

  function getSettings() {
    const meta = window.STUDIO_META || {};
    const saved = read(KEYS.settings, {});
    return {
      ...DEFAULT_SETTINGS,
      phone: meta.phone || '',
      email: meta.email || '',
      location: meta.location || '',
      ...saved,
      financeUrl: normalizeFinanceUrl(
        (saved.financeUrl || '').trim() || meta.financeUrl || DEFAULT_FINANCE_URL
      ),
    };
  }

  function normalizeFinanceUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed || FINANCE_PLACEHOLDER_RE.test(trimmed)) return '';
    return trimmed;
  }

  function isFinancePlaceholderUrl(url) {
    return FINANCE_PLACEHOLDER_RE.test(String(url || '').trim());
  }

  function getFinanceCustomUrl() {
    const saved = read(KEYS.settings, {});
    return normalizeFinanceUrl(saved.financeUrl);
  }

  /** URL loaded in the finance iframe — custom provider link or carecredit.com/apply. */
  function getFinanceEmbedUrl() {
    return getFinanceCustomUrl() || CONSUMER_FINANCE_APPLY_URL;
  }

  function getFinanceUrl() {
    return getFinanceEmbedUrl();
  }

  function getFinanceMerchantId() {
    return (getSettings().financeMerchantId || '').trim();
  }

  function isFinanceConfigured() {
    return !!getFinanceMerchantId() || !!getFinanceEmbedUrl();
  }

  function isConsumerFinanceEmbedUrl(url) {
    const u = String(url || '').trim().toLowerCase();
    return u.includes('carecredit.com/apply');
  }

  /** Synchrony blocks iframe embedding — application must open in a secure window. */
  function requiresFinancePopup(url) {
    const u = String(url || '').trim().toLowerCase();
    return !u || isConsumerFinanceEmbedUrl(u) || u.includes('mysynchrony.com') || u.includes('synchrony.com');
  }

  let financeApplyPopup = null;

  function openCareCreditApplyWindow(url, opts = {}) {
    const applyUrl = url || getFinanceEmbedUrl() || CONSUMER_FINANCE_APPLY_URL;
    if (financeApplyPopup && !financeApplyPopup.closed) {
      try {
        financeApplyPopup.location.href = applyUrl;
        financeApplyPopup.focus();
        return financeApplyPopup;
      } catch (_) {
        financeApplyPopup = null;
      }
    }
    const w = Math.min(window.screen.availWidth, 1120);
    const h = Math.min(window.screen.availHeight, Math.max(720, window.innerHeight - 24));
    const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2));
    const features = [
      'popup=yes',
      `width=${w}`,
      `height=${h}`,
      `left=${left}`,
      `top=${top}`,
      'resizable=yes',
      'scrollbars=yes',
      'noopener=no',
    ].join(',');
    const win = window.open(applyUrl, 'onyx_carecredit_apply', features);
    if (win) {
      financeApplyPopup = win;
      win.focus();
      return win;
    }
    if (!opts.silent) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
    }
    return null;
  }

  function escapeFinanceHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderFinanceLauncherPanel(config = {}, state = 'idle') {
    const label = config.label || '';
    const amount = config.amount ? formatPrice(config.amount) : '';
    const applyUrl = config.url || getFinanceEmbedUrl() || CONSUMER_FINANCE_APPLY_URL;
    const statusMsg = state === 'open'
      ? 'CareCredit is open in a secure window. Complete your application there, then close this panel when finished.'
      : state === 'blocked'
        ? 'Your browser blocked the application window. Tap the button below to open CareCredit.'
        : 'CareCredit\'s application runs in a secure window on top of this page — Synchrony does not allow embedding the full apply form here.';
    return `
      <div class="studio-finance-launcher">
        <div class="studio-finance-launcher-icon" aria-hidden="true">✦</div>
        <h3>CareCredit application</h3>
        ${label ? `<p class="studio-finance-launcher-program">Financing for <strong>${escapeFinanceHtml(label)}</strong>${amount ? ` · ${escapeFinanceHtml(amount)}` : ''}</p>` : ''}
        <p class="studio-finance-launcher-lead">${statusMsg}</p>
        <ol class="studio-finance-launcher-steps">
          <li>Tap <strong>Open CareCredit application</strong></li>
          <li>Pre-qualify or apply on <strong>carecredit.com</strong></li>
          <li>Return here when you&apos;re done — enrollment is confirmed at your visit</li>
        </ol>
        <button type="button" class="btn-primary btn-full" id="studioFinanceOpenApplyBtn">Open CareCredit application</button>
        <p class="studio-finance-launcher-foot">Opens <a href="${escapeFinanceHtml(applyUrl)}" target="_blank" rel="noopener noreferrer">carecredit.com/apply</a> in a secure window · Apply by phone <a href="tel:18006770718">(800) 677-0718</a></p>
      </div>`;
  }

  function initFinanceLauncher(container, config, opts = {}) {
    let popupState = 'idle';
    const paint = (state = popupState) => {
      popupState = state;
      container.innerHTML = renderFinanceLauncherPanel(config, state);
      container.querySelector('#studioFinanceOpenApplyBtn')?.addEventListener('click', () => {
        const win = openCareCreditApplyWindow(config.url);
        paint(win ? 'open' : 'blocked');
      });
    };
    paint('idle');
    if (opts.autoOpen) {
      const win = openCareCreditApplyWindow(config.url, { silent: true });
      paint(win ? 'open' : 'idle');
    }
    return { mode: 'launcher', config };
  }

  function getFinanceSetupUrl() {
    return window.STUDIO_FINANCE_PROVIDER_SETUP_URL || 'https://www.carecredit.com/customlink/';
  }

  function renderFinanceSetupPanel() {
    const setupUrl = getFinanceSetupUrl();
    const hadPlaceholder = isFinancePlaceholderUrl(read(KEYS.settings, {}).financeUrl)
      || isFinancePlaceholderUrl(window.STUDIO_META?.financeUrl);
    return `
      <div class="studio-finance-setup">
        <h3>Connect your CareCredit application</h3>
        ${hadPlaceholder ? '<p class="studio-finance-setup-warn"><strong>The demo financing link is inactive.</strong> CareCredit shows &ldquo;We are no longer accepting applications&rdquo; until you add your studio&rsquo;s real link or merchant ID.</p>' : ''}
        <p>Onyx Studios needs your <strong>CareCredit Provider Center</strong> credentials — the same custom link or merchant ID tied to your enrolled practice.</p>
        <ol class="studio-finance-setup-steps">
          <li>Sign in at <a href="${setupUrl}" target="_blank" rel="noopener noreferrer">carecredit.com/customlink</a> (Provider Center).</li>
          <li>Copy your <strong>custom application URL</strong> <em>or</em> your <strong>merchant ID</strong> from Marketing Toolkit → Add to website.</li>
          <li>In the business portal go to <strong>Clinic → Settings</strong> and paste it under Financing.</li>
          <li>Save — the embedded application on this site will load your live CareCredit form.</li>
        </ol>
        <p class="studio-finance-setup-foot">Not enrolled yet? <a href="https://www.carecredit.com/providers/contact-team/" target="_blank" rel="noopener noreferrer">Get started with CareCredit</a> or call Provider Support <a href="tel:18008567779">(800) 856-7779</a>.</p>
      </div>`;
  }

  function getFinanceEmbedConfig(opts = {}) {
    return {
      url: getFinanceEmbedUrl(),
      merchantId: getFinanceMerchantId(),
      amount: opts.amount || null,
      label: opts.label || '',
      clientName: opts.clientName || '',
    };
  }

  let financeWidgetScriptLoading = null;

  function loadFinanceWidgetScript() {
    if (document.getElementById('syfMPPScript')) {
      return Promise.resolve();
    }
    if (financeWidgetScriptLoading) return financeWidgetScriptLoading;
    financeWidgetScriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://pdpone.syfpos.com/mpp/UniFi.js';
      script.id = 'syfMPPScript';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('CareCredit widget failed to load'));
      document.head.insertAdjacentElement('afterbegin', script);
    });
    return financeWidgetScriptLoading;
  }

  function initFinanceEmbed(container, opts = {}) {
    if (!container) return { mode: 'none' };
    const config = { ...getFinanceEmbedConfig(opts), ...opts };
    container.innerHTML = '';

    if (config.merchantId) {
      const mount = document.createElement('div');
      mount.id = 'care-credit-widget';
      mount.className = 'studio-finance-widget-mount';
      container.appendChild(mount);
      window.syfWidgetObject = {
        flowType: 'GENERIC',
        subFlowType: 'CARECREDIT',
        syfMerchantId: config.merchantId,
      };
      loadFinanceWidgetScript()
        .then(() => {
          if (typeof window._syfSpyInit === 'function') {
            return window._syfSpyInit();
          }
          return null;
        })
        .catch(() => {
          container.innerHTML = '';
          return initFinanceLauncher(container, config, opts);
        });
      return { mode: 'widget', config };
    }

    const embedUrl = config.url || CONSUMER_FINANCE_APPLY_URL;
    if (!embedUrl) {
      container.innerHTML = renderFinanceSetupPanel();
      return { mode: 'setup', config };
    }
    return initFinanceLauncher(container, { ...config, url: embedUrl }, opts);
  }

  function openFinanceApplication(opts = {}) {
    const url = getFinanceUrl();
    if (opts.external || opts.newTab) {
      openCareCreditApplyWindow(url);
      return true;
    }
    window.dispatchEvent(new CustomEvent('studio-open-finance', { detail: { ...opts, autoOpen: opts.autoOpen !== false } }));
    return true;
  }

  function saveSettings(patch) {
    const next = { ...getSettings(), ...patch };
    write(KEYS.settings, next);
    return next;
  }

  function getStaff() {
    return read(KEYS.staff, []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  function addStaff(data) {
    const list = getStaff();
    const member = {
      id: 'SS-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      name: data.name || '',
      role: data.role || 'Stylist',
      email: data.email || '',
      phone: data.phone || '',
      active: data.active !== false,
      createdAt: new Date().toISOString(),
    };
    list.push(member);
    write(KEYS.staff, list);
    return member;
  }

  function updateStaff(id, patch) {
    const list = getStaff();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    write(KEYS.staff, list);
    return list[idx];
  }

  function removeStaff(id) {
    write(KEYS.staff, getStaff().filter((s) => s.id !== id));
  }

  function programBaseName(name) {
    return String(name || '')
      .replace(/ — Pay in Full$/, '')
      .replace(/ — Annual Package$/, '')
      .replace(/ — Quarterly$/, '')
      .replace(/ — Finance$/, '');
  }

  function isPackageCategory(category) {
    return (window.STUDIO_PACKAGE_CATEGORIES || ['program', 'womens_extensions', 'womens_program']).includes(category);
  }

  function isExtensionCategory(category) {
    return category === (window.STUDIO_EXTENSION_CATEGORY || 'womens_extensions');
  }

  function getConfigurableExtension(family) {
    const id = (window.STUDIO_EXT_FAMILY_IDS || {})[family];
    return id ? (window.STUDIO_CONFIGURABLE_EXTENSIONS || {})[id] : null;
  }

  function getExtensionConfig(family) {
    return getConfigurableExtension(family);
  }

  function getExtensionWizardSteps(family) {
    const cfg = getConfigurableExtension(family);
    const steps = [];
    if (cfg?.subOptions?.length) steps.push('subtype');
    if (cfg?.shadeGroups?.length) steps.push('shade');
    steps.push('length', 'payment');
    return steps;
  }

  function getExtensionLengthRow(family, lengthInches) {
    const cfg = getConfigurableExtension(family);
    if (!cfg) return null;
    const inches = Number(lengthInches);
    return cfg.lengths.find((l) => l.inches === inches) || null;
  }

  function extensionFromPrice(family) {
    return getExtensionPublicFromPrice(family).amount || 0;
  }

  function extensionPriceDisplay(family) {
    return getExtensionPublicFromPrice(family).display || '';
  }

  function formatIncludedHairSummary(cfg) {
    if (!cfg?.includedQuantity) return null;
    const qty = cfg.includedQuantity;
    const pack = cfg.unitsPerPack;
    const label = cfg.unitLabel;
    const grams = cfg.weftWeightGrams || cfg.supplierCost?.gramsPerWeft;
    if (pack && label) return `${qty} packs (${pack} ${label} per pack)`;
    if (label === 'weft' && grams) return `${qty} wefts (${grams}g each) included`;
    if (label) return `${qty} ${label}${qty === 1 ? '' : 's'} included`;
    return `${qty} wefts included`;
  }

  function getExtensionShadeGroups(family) {
    return getConfigurableExtension(family)?.shadeGroups || [];
  }

  function getExtensionShadeSurcharge(options) {
    const cfg = getConfigurableExtension(options?.family || '');
    const premiums = cfg?.shadeRetailPremium;
    if (!premiums || !options?.shade) return 0;
    return premiums[options.shade] ?? 0;
  }

  function getExtensionSupplierWeftCost(family, lengthInches, shade) {
    const cfg = getConfigurableExtension(family);
    const byLen = cfg?.supplierCost?.byLength;
    if (!byLen) return 0;
    const inches = Number(lengthInches);
    const row = byLen[inches] || byLen[String(inches)];
    if (!row) return 0;
    const tone = shade || cfg.shadeGroups?.[0] || 'Dark';
    return row[tone] ?? row.Dark ?? 0;
  }

  function calcExtensionSupplierOrderCost(options) {
    const cfg = getConfigurableExtension(options?.family);
    if (!cfg?.supplierCost) return null;
    const length = Number(options?.length);
    const shade = options?.shade || cfg.shadeGroups?.[0] || 'Dark';
    const perWeft = getExtensionSupplierWeftCost(options.family, length, shade);
    const pieceCount = (cfg.includedQuantity || 0) + (options?.additionalQty || 0);
    const hairCost = perWeft * pieceCount;
    const minPieces = cfg.supplierCost.handlingFee?.minPieces ?? 8;
    const handling = pieceCount > 0 && pieceCount < minPieces
      ? (cfg.supplierCost.handlingFee?.fee ?? 0)
      : 0;
    return {
      perWeft,
      pieceCount,
      shade,
      length,
      hairCost,
      handling,
      total: hairCost + handling,
    };
  }

  function getExtensionSupplierSummary(options) {
    const supplier = calcExtensionSupplierOrderCost(options);
    if (!supplier) return null;
    const retail = options?.paymentPlan ? getExtensionPlanTotal(options) : 0;
    const margin = retail - supplier.total;
    const marginPct = retail > 0 ? Math.round((margin / retail) * 1000) / 10 : 0;
    return { ...supplier, retail, margin, marginPct };
  }

  function getExtensionBasePlanPrice(options, planId) {
    const row = getExtensionLengthRow(options?.family, options?.length);
    if (!row) return 0;
    const plan = planId || options?.paymentPlan || 'pif';
    const surcharge = getExtensionShadeSurcharge(options);
    if (plan === 'finance') {
      return computeFinancePackagePrice({ pifAmount: (row.pif ?? 0) + surcharge });
    }
    return (row[plan] ?? row.pif ?? 0) + surcharge;
  }

  function getExtensionAdditionalTotal(options) {
    const cfg = getConfigurableExtension(options?.family || '');
    if (!cfg?.additionalItem) return 0;
    return (options?.additionalQty || 0) * cfg.additionalItem.price;
  }

  /** Full plan price shown in UI — quarterly values are the annual plan total */
  function getExtensionPlanTotal(options) {
    const base = getExtensionBasePlanPrice(options);
    return Math.max(0, base + getExtensionAdditionalTotal(options));
  }

  /** Amount charged at checkout — quarterly bills 1/4 of base plan today; add-ons are due in full */
  function getExtensionAmountDue(options) {
    const base = getExtensionBasePlanPrice(options);
    const add = getExtensionAdditionalTotal(options);
    if (!base && !add) return 0;
    if (options?.paymentPlan === 'quarterly') return base / 4 + add;
    return base + add;
  }

  function computeExtensionPrice(svc, options) {
    const due = getExtensionAmountDue(options);
    return due || svc?.price || 0;
  }

  function getExtensionPricingMeta(options) {
    const isQuarterly = options?.paymentPlan === 'quarterly';
    const annualPlanTotal = isQuarterly ? getExtensionBasePlanPrice(options) : null;
    return {
      annualPlanTotal,
      amountDueToday: getExtensionAmountDue(options),
      paymentFrequency: options?.paymentPlan || 'pif',
    };
  }

  function getExtensionAppointmentValue(options) {
    const row = getExtensionLengthRow(options?.family, options?.length);
    if (!row?.apptValues) return null;
    const plan = options?.paymentPlan || 'pif';
    const cfg = getConfigurableExtension(options?.family || '');
    const visits = cfg?.appointmentsIncluded || 0;
    const surcharge = getExtensionShadeSurcharge(options);
    if (plan === 'finance' && visits) {
      const total = getExtensionBasePlanPrice(options, 'finance');
      return total ? Math.round(total / visits) : null;
    }
    if (surcharge > 0 && visits) {
      const total = getExtensionBasePlanPrice(options);
      return total ? Math.round(total / visits) : null;
    }
    const planIdx = { pif: 0, quarterly: 1 }[plan] ?? 0;
    return row.apptValues[planIdx] ?? null;
  }

  function formatExtensionLabel(family, options) {
    const cfg = getConfigurableExtension(family);
    const parts = [family];
    if (options?.length) parts.push(`${options.length}″`);
    if (options?.subType) parts.push(options.subType);
    if (options?.shade) parts.push(options.shade);
    const plan = (window.STUDIO_EXT_PAYMENT_PLANS || []).find((p) => p.id === options?.paymentPlan);
    if (plan) parts.push(plan.label);
    if (options?.additionalQty > 0 && cfg?.additionalItem) {
      parts.push(`+${options.additionalQty} ${cfg.additionalItem.label}`);
    }
    return parts.join(' · ');
  }

  function defaultExtensionOptions(family) {
    const cfg = getConfigurableExtension(family);
    const defaultLen = cfg?.lengths?.find((l) => l.inches === 18) || cfg?.lengths?.[0];
    return {
      family,
      length: defaultLen?.inches || 18,
      subType: cfg?.subOptions?.[0] || null,
      shade: cfg?.shadeGroups?.[0] || null,
      paymentPlan: null,
      additionalQty: 0,
    };
  }

  const EXT_WIZARD_STEPS = ['subtype', 'shade', 'length', 'payment'];

  function getProgramFamilyInfo(base) {
    return (window.STUDIO_PROGRAM_FAMILIES || {})[base] || null;
  }

  function groupPrograms(services) {
    const groups = {};
    services.forEach((svc) => {
      const base = programBaseName(svc.name);
      if (!groups[base]) {
        const meta = getProgramFamilyInfo(base) || {};
        groups[base] = {
          base,
          services: [],
          featured: !!meta.featured || !!svc.featured,
          category: svc.category,
          tagline: meta.tagline || '',
          description: meta.description || '',
          highlights: meta.highlights || [],
        };
      }
      groups[base].services.push(svc);
      if (svc.featured) groups[base].featured = true;
    });
    return Object.values(groups).map((grp) => {
      const filtered = filterEligiblePaymentTiers(grp.services);
      const pif = findPayInFullTier(filtered);
      const services = pif ? [...filtered, buildFinanceTier(pif)] : filtered;
      return { ...grp, services };
    }).sort((a, b) => {
      const extOrder = window.STUDIO_EXTENSION_FAMILY_ORDER || [];
      if (a.category === 'womens_extensions' && b.category === 'womens_extensions' && extOrder.length) {
        const rank = (base) => {
          const idx = extOrder.indexOf(base);
          return idx === -1 ? extOrder.length : idx;
        };
        const diff = rank(a.base) - rank(b.base);
        if (diff !== 0) return diff;
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.base.localeCompare(b.base);
    });
  }

  function getExtensionLeadFamily() {
    return window.STUDIO_EXTENSION_LEAD_FAMILY || 'Butterfly Weft';
  }

  function getExtensionFamilyBadge(base) {
    if (base === getExtensionLeadFamily()) return 'Signature method';
    return null;
  }

  function getProgramFamilies({ gender, category } = {}) {
    let services = filterServices({ gender, category }).filter((s) => s.isPackage);
    if (window.ONYX_STUDIO_PUBLIC_BOOKING) {
      services = services.filter((s) => !isPublicHiddenService(s));
    }
    return groupPrograms(services);
  }

  function programFromPrice(services, base) {
    const category = services[0]?.category;
    if (base && isExtensionCategory(category)) {
      return getExtensionPublicFromPrice(base).amount;
    }
    if (base && ['program', 'womens_program'].includes(category)) {
      return getSystemFromPrice(services, base).amount;
    }
    const prices = services.map((s) => s.price).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : 0;
  }

  function slotIndex(time, settings) {
    const slots = getTimeSlots();
    const idx = slots.indexOf(time);
    if (idx >= 0) return idx;
    const t = timeToMinutes(time);
    const { startHour, slotMinutes } = settings || getCalendarSettings();
    return Math.floor((t - startHour * 60) / slotMinutes);
  }

  function getNowSlotLine(settings) {
    const today = todayISO();
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const { startHour, endHour } = settings || getCalendarSettings();
    const startMins = startHour * 60;
    const endMins = endHour * 60;
    const slotMins = settings?.slotMinutes || 30;
    const offsetFromStart = mins - startMins + now.getSeconds() / 60 + now.getMilliseconds() / 60000;
    if (offsetFromStart < 0 || mins >= endMins) return null;
    const idx = Math.floor(offsetFromStart / slotMins);
    const pct = (offsetFromStart % slotMins) / slotMins;
    return { today, index: idx, pct, time: minutesToTime(mins) };
  }

  function rescheduleAppointment(id, data) {
    const appt = getAppointment(id);
    if (!appt) return { error: 'Appointment not found' };
    const svc = data.serviceId ? getService(data.serviceId) : getService(appt.serviceId);
    const duration = data.duration || appt.duration || getAppointmentDurationMin(svc);
    const schedulingDuration = data.schedulingDuration
      ?? appt.providerDuration
      ?? getProviderDurationMin(svc);
    const startTime = data.startTime || appt.startTime;
    const endTime = addMinutesToTime(startTime, schedulingDuration);
    const date = data.date || appt.date;
    const column = data.column || appt.column;
    const conflict = findConflict(date, startTime, endTime, column, id);
    if (conflict) {
      return { error: `Conflict with ${conflict.clientName} at ${formatTime12(conflict.startTime)}` };
    }
    return updateAppointment(id, {
      date,
      startTime,
      endTime,
      duration,
      schedulingDuration,
      providerDuration: schedulingDuration,
      column,
    });
  }

  function apptCoversSlot(appt, slot, settings) {
    const start = timeToMinutes(appt.startTime);
    const end = timeToMinutes(appt.endTime || appt.startTime);
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + (settings?.slotMinutes || 30);
    return start < slotEnd && end > slotStart;
  }

  function apptStartsAtSlot(appt, slot) {
    return appt.startTime === slot;
  }

  function apptSlotSpan(appt, settings) {
    const mins = appt.duration || parseDurationMin(appt.endTime ? null : '30');
    const dur = appt.endTime
      ? timeToMinutes(appt.endTime) - timeToMinutes(appt.startTime)
      : mins;
    return Math.max(1, Math.ceil(dur / (settings?.slotMinutes || 30)));
  }

  function getClientAppointments(clientId, phone) {
    const n = normalizePhone(phone);
    return getAppointments().filter((a) =>
      a.clientId === clientId || (n && normalizePhone(a.clientPhone) === n)
    );
  }

  function getClientTransactions(clientId) {
    const client = getClient(clientId);
    if (!client) return getTransactions().filter((t) => t.clientId === clientId);
    return getTransactions().filter((t) => transactionMatchesClient(t, client));
  }

  function formatPaymentPlanLabel(plan) {
    const labels = {
      pif: 'Pay in full',
      quarterly: 'Quarterly',
      finance: 'Finance',
      'Pay in full': 'Pay in full',
      Quarterly: 'Quarterly',
      Finance: 'Finance',
    };
    return labels[plan] || plan || 'Standard';
  }

  function resolveProgramFromTxItem(item) {
    if (isShelfPosItem(item)) return null;
    const svc = item.id ? getService(item.id) : null;
    if (svc?.isPackage) {
      return {
        programName: programBaseName(svc.name),
        serviceId: svc.id,
        label: shortName(svc.name),
        paymentPlan: paymentType(svc.name) || 'Standard',
        visitsIncluded: svc.appointmentsIncluded || 0,
        visitValue: svc.appointmentValue || 0,
        category: svc.category,
        duration: svc.duration,
        extOptions: null,
      };
    }
    if (item.extOptions?.family) {
      const cfg = getExtensionConfig(item.extOptions.family);
      const baseSvc = getServices().find((s) =>
        s.isPackage && programBaseName(s.name) === item.extOptions.family
      );
      return {
        programName: item.extOptions.family,
        serviceId: item.id,
        label: formatExtensionLabel(item.extOptions.family, item.extOptions),
        paymentPlan: item.extOptions.paymentPlan || 'pif',
        visitsIncluded: cfg?.appointmentsIncluded || baseSvc?.appointmentsIncluded || 0,
        visitValue: getExtensionAppointmentValue(item.extOptions) || baseSvc?.appointmentValue || 0,
        category: 'womens_extensions',
        duration: baseSvc?.duration || '',
        extOptions: item.extOptions,
      };
    }
    return null;
  }

  const PACKAGE_ACTIVE_STATUSES = ['scheduled', 'checked_in', 'in_progress', 'with_provider'];

  function apptProgramFamily(appt) {
    if (!appt) return '';
    if (appt.programName) return appt.programName;
    if (appt.extOptions?.family) return appt.extOptions.family;
    const svc = appt.serviceId ? getService(appt.serviceId) : null;
    if (svc?.isPackage) return programBaseName(svc.name);
    if (appt.intendedService) return appt.intendedService;
    if (svc && isPackageCategory(svc.category)) return programBaseName(svc.name) || svc.name;
    return '';
  }

  function apptMatchesProgram(appt, program) {
    if (!appt || !program) return false;
    if (appt.programId && appt.programId === program.id) return true;
    const family = apptProgramFamily(appt);
    if (family && family === program.programName) return true;
    return false;
  }

  function apptCountsAsProgramVisit(appt, program) {
    if (!appt?.packageVisit) return false;
    if (appt.programId && program?.id) return appt.programId === program.id;
    return apptMatchesProgram(appt, program);
  }

  function countProgramAppts(program, appts, statuses) {
    return appts.filter((a) => statuses.includes(a.status) && apptCountsAsProgramVisit(a, program)).length;
  }

  function computeNextPackageVisitNumber(program, extraScheduled = 0) {
    if (!program) return 1;
    return (program.visitsUsed || 0) + (program.visitsScheduled || 0) + (extraScheduled || 0) + 1;
  }

  function normalizeExcludeAppointmentIds(opts = {}) {
    const ids = [];
    if (opts.excludeAppointmentId) ids.push(opts.excludeAppointmentId);
    if (Array.isArray(opts.excludeAppointmentIds)) ids.push(...opts.excludeAppointmentIds);
    return [...new Set(ids.filter(Boolean))];
  }

  function getAdjustedProgramVisitCounts(clientId, program, excludeIds) {
    if (!program) return null;
    let visitsUsed = program.visitsUsed || 0;
    let visitsScheduled = program.visitsScheduled || 0;
    const ids = Array.isArray(excludeIds) ? excludeIds : (excludeIds ? [excludeIds] : []);
    ids.forEach((excludeAppointmentId) => {
      const appt = getAppointment(excludeAppointmentId);
      if (appt && apptCountsAsProgramVisit(appt, program)) {
        if (appt.status === 'completed') visitsUsed = Math.max(0, visitsUsed - 1);
        else if (PACKAGE_ACTIVE_STATUSES.includes(appt.status)) {
          visitsScheduled = Math.max(0, visitsScheduled - 1);
        }
      }
    });
    return {
      ...program,
      visitsUsed,
      visitsScheduled,
      visitsRemaining: Math.max(0, (program.visitsIncluded || 0) - visitsUsed - visitsScheduled),
    };
  }

  function getProgramVisitLog() {
    return read(KEYS.programVisitLog, []);
  }

  function recordProgramVisitRedemption(entry) {
    if (!entry?.clientId || !entry?.programId) return null;
    const list = getProgramVisitLog();
    if (entry.appointmentId && list.some((e) => e.appointmentId === entry.appointmentId)) {
      return list.find((e) => e.appointmentId === entry.appointmentId);
    }
    const row = {
      id: 'PVL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      clientId: entry.clientId,
      programId: entry.programId,
      programName: entry.programName || '',
      visitNumber: entry.visitNumber || 0,
      visitsIncluded: entry.visitsIncluded || 0,
      visitValue: entry.visitValue || 0,
      appointmentId: entry.appointmentId || '',
      transactionId: entry.transactionId || '',
      serviceName: entry.serviceName || '',
      visitDate: entry.visitDate || todayISO(),
      redeemedAt: entry.redeemedAt || new Date().toISOString(),
    };
    list.push(row);
    write(KEYS.programVisitLog, list);
    return row;
  }

  function getProgramVisitHistory(clientId, programId) {
    if (!clientId) return [];
    const logged = getProgramVisitLog().filter((e) => e.clientId === clientId && (!programId || e.programId === programId));
    const seenAppts = new Set(logged.map((e) => e.appointmentId).filter(Boolean));
    const client = getClient(clientId);
    const fromAppts = getClientAppointments(clientId, client?.phone)
      .filter((a) => a.packageVisit && a.status === 'completed' && (!programId || a.programId === programId))
      .map((a) => ({
        id: `appt-${a.id}`,
        clientId,
        programId: a.programId,
        programName: a.programName,
        visitNumber: a.visitNumber,
        visitsIncluded: a.visitsIncluded,
        visitValue: a.visitValue,
        appointmentId: a.id,
        transactionId: '',
        serviceName: a.serviceName,
        visitDate: a.date,
        redeemedAt: a.packageVisitRedeemedAt || a.completedAt || `${a.date}T${a.startTime || '12:00'}:00`,
      }))
      .filter((e) => !seenAppts.has(e.appointmentId));
    return [...logged, ...fromAppts]
      .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
  }

  function refreshPackageVisitFields(clientId, opts = {}) {
    const baseProgram = opts.programId
      ? (getClientProgramSummary(clientId, { force: true }).programs || []).find((p) =>
        p.id === opts.programId && isProgramEnrollmentActive(p) && (p.visitsRemaining || 0) > 0)
      : findActiveProgramForBooking(clientId, opts);
    if (!baseProgram || !isProgramEnrollmentActive(baseProgram) || (baseProgram.visitsRemaining || 0) <= 0) return null;
    const excludeIds = normalizeExcludeAppointmentIds(opts);
    const program = excludeIds.length
      ? getAdjustedProgramVisitCounts(clientId, baseProgram, excludeIds)
      : baseProgram;
    if (!program || (program.visitsRemaining || 0) <= 0) return null;
    const visitNumber = computeNextPackageVisitNumber(program, opts.extraScheduled || 0);
    return {
      packageVisit: true,
      packagePurchase: false,
      programId: program.id,
      programName: program.programName,
      programPaymentPlan: program.paymentLabel || program.paymentPlan || '',
      visitNumber,
      visitsIncluded: program.visitsIncluded || 0,
      visitValue: program.visitValue || 0,
      price: 0,
      visitsUsed: program.visitsUsed || 0,
      visitsScheduled: program.visitsScheduled || 0,
      visitsRemaining: program.visitsRemaining || 0,
    };
  }

  function redeemPackageVisitOnAppointment(apptId, data = {}) {
    const appt = getAppointment(apptId);
    if (!appt?.clientId) return { error: 'Appointment not found.' };
    const allowed = assertPackageVisitRedemptionAllowed(appt.clientId, data.programId || appt.programId, apptId);
    if (allowed.error) return { error: allowed.error, needsCancelPrompt: allowed.needsCancelPrompt };
    const redeemedAt = data.redeemedAt || new Date().toISOString();
    const fresh = refreshPackageVisitFields(appt.clientId, {
      programId: data.programId,
      programName: data.programName,
      serviceId: appt.serviceId,
      extOptions: appt.extOptions,
      excludeAppointmentId: apptId,
    });
    const fields = {
      ...(fresh || {}),
      ...data,
      programId: data.programId || fresh?.programId,
      programName: data.programName || fresh?.programName,
      visitNumber: data.visitNumber || appt.visitNumber || fresh?.visitNumber,
      visitsIncluded: data.visitsIncluded || appt.visitsIncluded || fresh?.visitsIncluded,
      visitValue: data.visitValue ?? appt.visitValue ?? fresh?.visitValue,
      programPaymentPlan: data.programPaymentPlan || appt.programPaymentPlan || fresh?.programPaymentPlan,
    };
    if (!fields?.programId || !fields.visitNumber) return { error: 'No prepaid visits available.' };
    const patch = {
      ...fields,
      packageVisit: true,
      price: 0,
      packageVisitRedeemedAt: redeemedAt,
      serviceName: data.serviceName || formatPackageVisitServiceName(
        fields.programName,
        fields.visitNumber,
        fields.visitsIncluded,
      ),
    };
    const updated = updateAppointment(apptId, patch);
    recordProgramVisitRedemption({
      clientId: appt.clientId,
      programId: fields.programId,
      programName: fields.programName,
      visitNumber: fields.visitNumber,
      visitsIncluded: fields.visitsIncluded,
      visitValue: fields.visitValue,
      appointmentId: apptId,
      transactionId: data.transactionId || '',
      serviceName: patch.serviceName,
      visitDate: appt.date || todayISO(),
      redeemedAt,
    });
    return { appointment: updated, fields };
  }

  const PACKAGE_WARRANTY_INTERVALS = {
    program: 21,
    womens_program: 28,
    womens_extensions: 42,
    clinical: 28,
    default: 28,
  };

  function programQualifiesForWarranty(program) {
    if (!program || program.voided) return false;
    return isPackageCategory(program.category);
  }

  function apptCountsAsWarrantyMaintenance(appt, program) {
    if (!appt || appt.status !== 'completed') return false;
    return apptMatchesProgram(appt, program);
  }

  function getProgramWarrantyLog() {
    return read(KEYS.programWarrantyLog, []);
  }

  function getClientWarrantyHistory(clientId, programId) {
    if (!clientId) return [];
    return getProgramWarrantyLog()
      .filter((e) => e.clientId === clientId && (!programId || e.programId === programId))
      .sort((a, b) => new Date(b.redeemedAt || b.at) - new Date(a.redeemedAt || a.at));
  }

  function recordWarrantyReinstatement(entry) {
    if (!entry?.clientId || !entry?.programId) return null;
    const list = getProgramWarrantyLog();
    const redeemedAt = entry.redeemedAt || new Date().toISOString();
    if (entry.transactionId && list.some((e) => e.transactionId === entry.transactionId && e.programId === entry.programId)) {
      return list.find((e) => e.transactionId === entry.transactionId && e.programId === entry.programId);
    }
    const row = {
      id: 'PWL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      clientId: entry.clientId,
      programId: entry.programId,
      programName: entry.programName || '',
      amount: entry.amount || 0,
      transactionId: entry.transactionId || '',
      appointmentId: entry.appointmentId || '',
      anchorDate: entry.anchorDate || '',
      recommendedByDate: entry.recommendedByDate || '',
      graceDeadline: entry.graceDeadline || '',
      daysLate: entry.daysLate || 0,
      notes: entry.notes || '',
      redeemedAt,
    };
    list.push(row);
    write(KEYS.programWarrantyLog, list);
    saveProgramOverride(entry.clientId, entry.programId, {
      warrantyReinstatedAt: redeemedAt,
      warrantyStatus: '',
      warrantyForcedActive: false,
    });
    return row;
  }

  function findWarrantyAnchor(program, appts, clientId) {
    const override = getProgramOverride(clientId, program.id);
    const completed = appts
      .filter((a) => apptCountsAsWarrantyMaintenance(a, program))
      .sort((a, b) => `${a.date}T${a.startTime || '00:00'}`.localeCompare(`${b.date}T${b.startTime || '00:00'}`));

    if (override?.warrantyReinstatedAt) {
      const reinstatedDate = override.warrantyReinstatedAt.slice(0, 10);
      const afterReinstate = completed.filter((a) => a.date >= reinstatedDate);
      if (afterReinstate.length) {
        const last = afterReinstate[afterReinstate.length - 1];
        return { date: last.date, appointmentId: last.id, source: 'visit', label: 'Last completed visit' };
      }
      return {
        date: reinstatedDate,
        source: 'reinstatement',
        label: 'Warranty reinstated',
      };
    }

    if (completed.length) {
      const last = completed[completed.length - 1];
      return { date: last.date, appointmentId: last.id, source: 'visit', label: 'Last completed visit' };
    }

    const enrolled = (program.purchasedAt || '').slice(0, 10) || todayISO();
    return { date: enrolled, source: 'enrollment', label: 'Program enrollment' };
  }

  function computeProgramWarranty(program, appts, clientId, asOfDate) {
    const policy = getPackageWarranty();
    const base = {
      applies: false,
      status: 'not_applicable',
      label: 'N/A',
      summary: policy.summary || '',
      reinstatementFee: policy.lateFee || 50,
      graceDays: policy.gracePeriodDays || 14,
    };
    if (!programQualifiesForWarranty(program)) return base;

    const override = getProgramOverride(clientId, program.id);
    const manuallyVoided = override?.active === false || program.voided || program.manuallyVoided;
    if (manuallyVoided || program.refunded || program.fullyRefunded) {
      const inactiveLabel = program.refunded || program.fullyRefunded ? 'Refunded' : 'Voided';
      return {
        ...base,
        applies: true,
        status: 'voided',
        label: inactiveLabel,
        statusDetail: `${inactiveLabel} — hair warranty is not active on this program.`,
        needsReinstatement: false,
        history: getClientWarrantyHistory(clientId, program.id).slice(0, 8),
        lastReinstatement: null,
      };
    }

    const today = asOfDate || todayISO();
    const intervalDays = PACKAGE_WARRANTY_INTERVALS[program.category] || PACKAGE_WARRANTY_INTERVALS.default;
    const anchor = findWarrantyAnchor(program, appts, clientId);
    const recommendedByDate = addDaysToISO(anchor.date, intervalDays);
    const graceDeadline = addDaysToISO(recommendedByDate, base.graceDays);
    const history = getClientWarrantyHistory(clientId, program.id).slice(0, 8);
    const lastReinstatement = history[0] || null;

    if (override?.warrantyStatus === 'waived') {
      return {
        ...base,
        applies: true,
        status: 'waived',
        label: 'Waived',
        statusDetail: 'Warranty requirement waived on this account.',
        anchorDate: anchor.date,
        anchorSource: anchor.source,
        anchorLabel: anchor.label,
        anchorAppointmentId: anchor.appointmentId || '',
        recommendedByDate,
        graceDeadline,
        intervalDays,
        needsReinstatement: false,
        history,
        lastReinstatement,
      };
    }

    let status = 'active';
    let label = 'Active';
    let statusDetail = `On track — next visit due by ${recommendedByDate}.`;
    if (override?.warrantyStatus === 'lapsed') {
      status = 'lapsed';
      label = 'Lapsed';
      statusDetail = `Marked lapsed manually — ${formatPrice(base.reinstatementFee)} fee to reinstate.`;
    } else if (override?.warrantyStatus === 'active' && override?.warrantyForcedActive) {
      status = 'active';
      label = 'Active';
      statusDetail = 'Marked active manually by staff.';
    } else if (today > graceDeadline) {
      status = 'lapsed';
      label = 'Lapsed';
      const daysLate = daysBetweenISO(graceDeadline, today);
      statusDetail = `${daysLate} day${daysLate !== 1 ? 's' : ''} past grace — ${formatPrice(base.reinstatementFee)} fee to reinstate.`;
    } else if (today > recommendedByDate) {
      status = 'grace';
      label = 'Grace period';
      const daysLeft = daysBetweenISO(today, graceDeadline);
      statusDetail = `Past recommended window — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in ${base.graceDays}-day grace.`;
    }

    const daysUntilDue = daysBetweenISO(today, recommendedByDate);
    return {
      ...base,
      applies: true,
      status,
      label,
      statusDetail,
      anchorDate: anchor.date,
      anchorSource: anchor.source,
      anchorLabel: anchor.label,
      anchorAppointmentId: anchor.appointmentId || '',
      recommendedByDate,
      graceDeadline,
      intervalDays,
      daysUntilDue,
      daysPastDeadline: status === 'lapsed' ? Math.max(0, daysBetweenISO(graceDeadline, today)) : 0,
      needsReinstatement: status === 'lapsed',
      history,
      lastReinstatement,
    };
  }

  function attachWarrantyToPrograms(programs, appts, clientId) {
    (programs || []).forEach((p) => {
      p.warranty = computeProgramWarranty(p, appts, clientId);
    });
    return programs;
  }

  function getClientWarrantySummary(clientId) {
    const summary = getClientProgramSummary(clientId);
    const programs = (summary.programs || []).filter((p) => p.warranty?.applies);
    const lapsed = programs.filter((p) => p.warranty?.needsReinstatement);
    return { programs, lapsed, history: getClientWarrantyHistory(clientId).slice(0, 10) };
  }

  function warrantyReinstatementPosItem(program) {
    if (!program?.warranty?.needsReinstatement) return null;
    const fee = program.warranty.reinstatementFee || getPackageWarranty().lateFee || 50;
    return {
      id: `warranty-${program.id}`,
      name: `Warranty reinstatement — ${program.programName}`,
      price: fee,
      qty: 1,
      warrantyReinstatement: true,
      programId: program.id,
      programName: program.programName,
      reinstatementFee: fee,
      anchorDate: program.warranty.anchorDate,
      recommendedByDate: program.warranty.recommendedByDate,
      graceDeadline: program.warranty.graceDeadline,
      daysLate: program.warranty.daysPastDeadline || 0,
    };
  }

  function getProgramOverrides(clientId) {
    if (!clientId) return [];
    return read(KEYS.programOverrides, []).filter((o) => o.clientId === clientId);
  }

  function getProgramOverride(clientId, programId) {
    return getProgramOverrides(clientId).find((o) => o.programId === programId) || null;
  }

  function saveProgramOverride(clientId, programId, patch) {
    if (!clientId || !programId) return { error: 'Program not found.' };
    const list = read(KEYS.programOverrides, []);
    const idx = list.findIndex((o) => o.clientId === clientId && o.programId === programId);
    const existing = idx >= 0 ? list[idx] : {
      id: 'POV-' + Date.now().toString(36).toUpperCase(),
      clientId,
      programId,
      createdAt: new Date().toISOString(),
    };
    const next = {
      ...existing,
      ...patch,
      clientId,
      programId,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    write(KEYS.programOverrides, list);
    invalidateClientDataCaches(clientId);
    return { success: true, override: next };
  }

  function getProgramRefundMeta(tx, item, itemIndex, items) {
    const refunded = Math.max(0, Number(tx?.refundedAmount) || 0);
    const itemPaid = Math.max(0, (Number(item?.price) || 0) * (Number(item?.qty) || 1));
    if (!refunded || !itemPaid) {
      return { refundedAmount: 0, netPaid: itemPaid, fullyRefunded: false, partiallyRefunded: false };
    }
    const programItems = (items || [])
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => resolveProgramFromTxItem(row));
    let itemRefund = refunded;
    if (programItems.length > 1) {
      const programTotal = programItems.reduce(
        (sum, { row }) => sum + Math.max(0, (Number(row.price) || 0) * (Number(row.qty) || 1)),
        0,
      );
      itemRefund = programTotal > 0
        ? Math.round((itemPaid / programTotal) * refunded * 100) / 100
        : 0;
    }
    const netPaid = Math.max(0, Math.round((itemPaid - itemRefund) * 100) / 100);
    return {
      refundedAmount: itemRefund,
      netPaid,
      fullyRefunded: itemPaid > 0 && netPaid <= 0,
      partiallyRefunded: itemRefund > 0 && netPaid > 0,
    };
  }

  function resolveProgramOverrideForProgram(program, overrides, itemIndex) {
    if (!program || !overrides?.length) return null;
    return overrides.find((o) => o.programId === program.id)
      || overrides.find((o) => o.transactionId === program.transactionId && (o.itemIndex == null || o.itemIndex === itemIndex))
      || null;
  }

  function finalizeProgramEnrollmentStatus(program) {
    const p = { ...program };
    if (p.voided) {
      p.enrollmentStatus = p.refunded ? 'refunded' : 'voided';
      p.enrollmentLabel = p.refunded ? 'Refunded' : 'Voided';
      p.visitsRemaining = 0;
      return p;
    }
    if (p.fullyRefunded) {
      p.voided = true;
      p.refunded = true;
      p.enrollmentStatus = 'refunded';
      p.enrollmentLabel = 'Refunded';
      p.visitsRemaining = 0;
      return p;
    }
    if (p.partiallyRefunded) {
      p.enrollmentStatus = 'partial_refund';
      p.enrollmentLabel = 'Partially refunded';
      if ((p.totalPaid || 0) > 0 && (p.visitsIncluded || 0) > 0 && !p.visitsIncludedOverride) {
        const ratio = Math.max(0, Math.min(1, (p.netPaid || 0) / p.totalPaid));
        const prorated = Math.max(0, Math.floor((p.visitsIncluded || 0) * ratio));
        p.visitsIncluded = Math.min(p.visitsIncluded, prorated);
        p.visitsRemaining = Math.max(0, (p.visitsIncluded || 0) - (p.visitsUsed || 0) - (p.visitsScheduled || 0));
      }
      return p;
    }
    if ((p.visitsIncluded || 0) > 0 && (p.visitsRemaining || 0) <= 0 && (p.visitsUsed || 0) >= (p.visitsIncluded || 0)) {
      p.enrollmentStatus = 'completed';
      p.enrollmentLabel = 'Completed';
      return p;
    }
    p.enrollmentStatus = 'active';
    p.enrollmentLabel = 'Active';
    return p;
  }

  function isProgramEnrollmentActive(program) {
    if (!program || program.voided || program.refunded || program.fullyRefunded) return false;
    return (program.visitsRemaining || 0) > 0;
  }

  function applyProgramOverrideToProgram(program, override) {
    if (!override) return program;
    const p = { ...program, hasOverride: true, overrideNotes: override.notes || '' };
    if (override.visitsIncluded != null && override.visitsIncluded !== '') {
      p.visitsIncluded = Math.max(0, Number(override.visitsIncluded) || 0);
      p.visitsIncludedOverride = p.visitsIncluded;
    }
    if (override.visitValue != null && override.visitValue !== '') {
      p.visitValue = Math.max(0, Number(override.visitValue) || 0);
      p.visitValueOverride = p.visitValue;
    }
    if (override.visitsUsedOffset != null && override.visitsUsedOffset !== '') {
      p.visitsUsedOffset = Number(override.visitsUsedOffset) || 0;
      p.visitsUsed = Math.max(0, (p.visitsUsed || 0) + p.visitsUsedOffset);
    }
    if (override.active === false) {
      p.voided = true;
      p.manuallyVoided = true;
      p.visitsRemaining = 0;
    } else if (override.active === true && !p.fullyRefunded && !p.refunded) {
      p.voided = false;
      p.manuallyVoided = false;
    }
    if (override.warrantyStatus) {
      p.warrantyStatusOverride = override.warrantyStatus;
    }
    if (override.warrantyReinstatedAt) {
      p.warrantyReinstatedAt = override.warrantyReinstatedAt;
    }
    return p;
  }

  function allocateProgramVisits(programs, appts, clientId) {
    const overrides = clientId ? getProgramOverrides(clientId) : [];
    const sorted = [...programs].sort((a, b) => new Date(a.purchasedAt) - new Date(b.purchasedAt));
    sorted.forEach((p, i) => {
      const start = p.purchasedAt.slice(0, 10);
      const end = sorted[i + 1]?.purchasedAt.slice(0, 10) || '9999-12-31';
      const inWindow = appts.filter((a) => a.date >= start && a.date < end && a.status !== 'canceled');
      p.visitsUsed = countProgramAppts(p, inWindow, ['completed']);
      p.visitsScheduled = countProgramAppts(p, inWindow, PACKAGE_ACTIVE_STATUSES);
      const override = resolveProgramOverrideForProgram(p, overrides, p.itemIndex);
      Object.assign(p, applyProgramOverrideToProgram(p, override));
      if (!p.voided && !p.fullyRefunded) {
        p.visitsRemaining = Math.max(0, (p.visitsIncluded || 0) - p.visitsUsed - p.visitsScheduled);
      } else if (p.voided || p.fullyRefunded) {
        p.visitsRemaining = 0;
      }
      Object.assign(p, finalizeProgramEnrollmentStatus(p));
    });
    return sorted;
  }

  function voidProgramsForRefundedTransaction(clientId, transactionId, notes) {
    const tx = getTransactions().find((t) => t.id === transactionId);
    if (!tx || getRefundableAmount(tx) > 0) return;
    (tx.items || []).forEach((item, idx) => {
      if (!resolveProgramFromTxItem(item)) return;
      const programId = `${transactionId}-${idx}`;
      const refundMeta = getProgramRefundMeta(tx, item, idx, tx.items);
      const existing = getProgramOverride(clientId, programId);
      if (existing?.active === false && refundMeta.fullyRefunded) return;
      saveProgramOverride(clientId, programId, {
        active: false,
        transactionId,
        itemIndex: idx,
        notes: notes || 'Auto-voided — sale fully refunded',
      });
    });
    invalidateClientDataCaches(clientId);
  }

  function resolveProgramForAppointment(appt, clientId) {
    if (!appt || !clientId) return null;
    const programs = getClientProgramSummary(clientId, { force: true }).programs || [];
    if (appt.programId) {
      const byId = programs.find((p) => p.id === appt.programId);
      if (byId) return byId;
    }
    if (appt.programName) {
      return programs.find((p) => p.programName === appt.programName) || null;
    }
    return null;
  }

  function appointmentUsesInactiveProgram(appt, clientId) {
    if (!appt?.packageVisit || !clientId) return false;
    const program = resolveProgramForAppointment(appt, clientId);
    if (!program) return false;
    return !isProgramEnrollmentActive(program);
  }

  function getFuturePackageAppointmentsForInactivePrograms(clientId) {
    if (!clientId) return { appointments: [], details: [], programs: [] };
    const summary = getClientProgramSummary(clientId, { force: true });
    const inactivePrograms = (summary.programs || []).filter((p) => !isProgramEnrollmentActive(p));
    if (!inactivePrograms.length) return { appointments: [], details: [], programs: [] };

    const today = todayISO();
    const details = [];
    getClientAppointments(clientId)
      .filter((a) => a.packageVisit && !['canceled', 'completed', 'no_show'].includes(a.status))
      .filter((a) => (a.date || '') >= today)
      .forEach((appt) => {
        const program = inactivePrograms.find((p) =>
          (appt.programId && p.id === appt.programId)
          || (appt.programName && p.programName === appt.programName),
        );
        if (program) details.push({ appointment: appt, program });
      });

    return {
      appointments: details.map((d) => d.appointment),
      details,
      programs: inactivePrograms,
    };
  }

  function cancelFuturePackageAppointmentsForInactivePrograms(clientId, opts = {}) {
    const { details } = getFuturePackageAppointmentsForInactivePrograms(clientId);
    const programIds = new Set((opts.programIds || []).filter(Boolean));
    const toCancel = programIds.size
      ? details.filter((d) => programIds.has(d.program.id))
      : details;
    let canceled = 0;
    toCancel.forEach(({ appointment: appt, program }) => {
      const retail = getPostVisitRetailPrice(appt, clientId) || appt.price || 0;
      updateAppointment(appt.id, {
        status: 'canceled',
        packageVisit: false,
        price: retail,
        notes: [appt.notes, `Canceled — ${program.enrollmentLabel || 'package'} no longer active`].filter(Boolean).join('\n'),
      });
      canceled += 1;
    });
    if (canceled) invalidateClientDataCaches(clientId);
    return { canceled, appointments: toCancel.map((d) => d.appointment) };
  }

  function assertPackageVisitRedemptionAllowed(clientId, programId, apptId) {
    if (!clientId) return { error: 'Link a client before applying a package visit.' };
    const summary = getClientProgramSummary(clientId, { force: true });
    const program = programId
      ? (summary.programs || []).find((p) => p.id === programId)
      : null;
    if (!program || !isProgramEnrollmentActive(program)) {
      return {
        error: 'This package is no longer active. Cancel future prepaid appointments or charge full retail price.',
        needsCancelPrompt: true,
      };
    }
    const appt = apptId ? getAppointment(apptId) : null;
    if (appt && appointmentUsesInactiveProgram(appt, clientId)) {
      return {
        error: 'This appointment was booked as a prepaid visit on an inactive package. Cancel it or charge full price.',
        needsCancelPrompt: true,
      };
    }
    const blocked = getFuturePackageAppointmentsForInactivePrograms(clientId);
    if (blocked.appointments.length) {
      return {
        error: 'Future prepaid appointments exist on an inactive package. Cancel them before applying visit credit.',
        needsCancelPrompt: true,
        blocked,
      };
    }
    return { ok: true, program };
  }

  function getRefundedTotalForTransaction(transactionId) {
    if (!transactionId) return 0;
    return getTransactions()
      .filter((t) => t.type === 'refund' && t.refundOf === transactionId)
      .reduce((sum, t) => sum + Math.abs(Number(t.total) || 0), 0);
  }

  function getRefundableAmount(tx) {
    if (!tx || tx.type === 'refund' || tx.status === 'voided') return 0;
    const total = Math.max(0, Number(tx.total) || 0);
    const refunded = Math.max(
      Number(tx.refundedAmount) || 0,
      getRefundedTotalForTransaction(tx.id),
    );
    return Math.max(0, Math.round((total - refunded) * 100) / 100);
  }

  function getClientRefundableTransactions(clientId) {
    if (!clientId) return [];
    return getClientTransactions(clientId)
      .filter((t) => getRefundableAmount(t) > 0)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function addManualClientCredit(clientId, amount, notes) {
    const amt = Number(amount);
    if (!clientId || !amt || Number.isNaN(amt)) return { error: 'Enter a non-zero credit amount.' };
    const entry = addClientCreditEntry(clientId, amt, {
      type: amt > 0 ? 'manual_add' : 'manual_remove',
      notes: notes || (amt > 0 ? 'Manual credit added' : 'Manual credit removed'),
    });
    if (!entry) return { error: 'Could not update credit balance.' };
    return { success: true, entry, balance: getClientCreditBalance(clientId) };
  }

  function issueClientRefund(clientId, transactionId, amount, notes) {
    const list = [...getTransactions()];
    const idx = list.findIndex((t) => t.id === transactionId);
    const tx = idx >= 0 ? list[idx] : null;
    const client = getClient(clientId);
    if (!tx || !client || !transactionMatchesClient(tx, client)) return { error: 'Transaction not found.' };
    if (tx.type === 'refund') return { error: 'Cannot refund a refund transaction.' };
    const refundable = getRefundableAmount(tx);
    const refundAmt = Math.min(refundable, Math.max(0, Number(amount) || 0));
    if (refundAmt <= 0) return { error: 'Nothing left to refund on this transaction.' };

    const itemLabel = (tx.items || []).map((i) => i.name).filter(Boolean).join(', ') || 'Sale';
    const refundTx = {
      id: 'STX-' + Date.now().toString(36).toUpperCase(),
      at: new Date().toISOString(),
      status: 'completed',
      type: 'refund',
      paymentMethod: tx.paymentMethod || 'card',
      clientId,
      clientName: tx.clientName,
      walkIn: false,
      items: [{ name: `Refund — ${itemLabel}`, price: -refundAmt, qty: 1 }],
      subtotal: -refundAmt,
      discount: 0,
      total: -refundAmt,
      notes: notes || `Refund for transaction ${transactionId}`,
      appointmentId: tx.appointmentId || '',
      creditApplied: 0,
      refundOf: transactionId,
      refundedAmount: 0,
    };
    const newRefundedAmount = Math.round(((Number(tx.refundedAmount) || 0) + refundAmt) * 100) / 100;
    list[idx] = { ...tx, refundedAmount: newRefundedAmount };
    list.unshift(refundTx);
    write(KEYS.transactions, list);
    if (client) {
      syncClientLinkedRecords(client);
      if (!isSchedulingFeeTransaction(refundTx)) syncClientVisitTag(clientId);
    }
    const remaining = getRefundableAmount(list[idx]);
    if (remaining <= 0) {
      voidProgramsForRefundedTransaction(clientId, transactionId, notes || 'Auto-voided — sale fully refunded');
    }
    invalidateClientDataCaches(clientId);
    const blocked = getFuturePackageAppointmentsForInactivePrograms(clientId);
    return {
      success: true,
      refund: refundTx,
      amount: refundAmt,
      needsInactiveProgramPrompt: blocked.appointments.length > 0,
      inactiveProgramBlocked: blocked,
    };
  }

  function adjustClientProgram(clientId, programId, data) {
    const summary = getClientProgramSummary(clientId);
    const program = (summary.programs || []).find((p) => p.id === programId);
    if (!program) return { error: 'Program not found on this client.' };
    const patch = {};
    if (data.visitsIncluded !== undefined && data.visitsIncluded !== '') {
      patch.visitsIncluded = Math.max(0, Number(data.visitsIncluded) || 0);
    }
    if (data.visitValue !== undefined && data.visitValue !== '') {
      patch.visitValue = Math.max(0, Number(data.visitValue) || 0);
    }
    if (data.visitsUsedOffset !== undefined && data.visitsUsedOffset !== '') {
      patch.visitsUsedOffset = Number(data.visitsUsedOffset) || 0;
    }
    if (data.active !== undefined) patch.active = data.active !== false;
    if (data.notes !== undefined) patch.notes = String(data.notes || '').trim();
    if (data.warrantyStatus !== undefined) {
      const status = String(data.warrantyStatus || '').trim();
      if (!status || status === 'auto') {
        patch.warrantyStatus = '';
        patch.warrantyForcedActive = false;
      } else {
        patch.warrantyStatus = status;
        patch.warrantyForcedActive = status === 'active';
      }
    }
    if (data.warrantyNotes !== undefined) patch.warrantyNotes = String(data.warrantyNotes || '').trim();
    if (program.transactionId != null) patch.transactionId = program.transactionId;
    if (program.itemIndex != null) patch.itemIndex = program.itemIndex;
    return saveProgramOverride(clientId, programId, patch);
  }

  function findActiveProgramForBooking(clientId, opts = {}) {
    if (!clientId) return null;
    const summary = getClientProgramSummary(clientId);
    const programs = (summary.programs || []).filter((p) => isProgramEnrollmentActive(p));
    if (!programs.length) return null;

    if (opts.programId) {
      const byId = programs.find((p) => p.id === opts.programId);
      if (byId) return byId;
    }

    const svc = opts.serviceId ? getService(opts.serviceId) : null;
    const family = opts.extOptions?.family
      || (svc?.isPackage ? programBaseName(svc.name) : '')
      || opts.programName
      || '';
    const category = opts.category || svc?.category || (opts.extOptions ? 'womens_extensions' : '');

    if (family) {
      const exact = programs.find((p) => p.programName === family);
      if (exact) return exact;
    }
    if (category) {
      const inCat = programs.filter((p) => p.category === category);
      if (inCat.length === 1) return inCat[0];
      if (inCat.length > 1) {
        return inCat.sort((a, b) => (b.visitValue || 0) - (a.visitValue || 0))[0];
      }
    }
    return programs.sort((a, b) => (b.visitValue || 0) - (a.visitValue || 0))[0];
  }

  function formatPackageVisitServiceName(programName, visitNumber, visitsIncluded) {
    return `${programName} · Visit ${visitNumber} of ${visitsIncluded}`;
  }

  function formatFollowUpVisitName(programName, visitNumber, visitsIncluded) {
    if (visitNumber && visitsIncluded) {
      return `${programName} · Follow-up ${visitNumber} of ${visitsIncluded}`;
    }
    return `${programName} · Follow-up visit`;
  }

  function getMaintenanceServiceForProgram(program) {
    if (!program) return null;
    const family = program.programName;
    const services = getServices();
    const pif = services.find((s) =>
      s.isPackage && programBaseName(s.name) === family && paymentType(s.name) === 'Pay in full'
    );
    if (pif) return pif;
    const anyFamily = services.find((s) =>
      s.isPackage && programBaseName(s.name) === family
    );
    return anyFamily || getService(program.serviceId) || null;
  }

  function getScheduleVisitTypes(category) {
    return SCHEDULE_VISIT_TYPES[category] || SCHEDULE_VISIT_TYPES.default;
  }

  function getNonPackageVisitTypes() {
    return SCHEDULE_VISIT_TYPES.none || [{ id: 'consult', label: 'System consultation', desc: 'Private fitting and program planning for new clients' }];
  }

  function getNonPackageVisitType(id) {
    return getNonPackageVisitTypes().find((t) => t.id === id) || null;
  }

  function getNonPackageBookableServices(visitTypeId) {
    const type = getNonPackageVisitType(visitTypeId);
    const category = type?.category
      || (visitTypeId === 'barber' ? 'mens_grooming' : visitTypeId === 'salon' ? 'womens_styling' : '');
    if (!category) return [];
    return filterServices({ category }).filter((s) => !s.isPackage && !s.isAddon);
  }

  function getScheduleVisitType(category, id) {
    return getScheduleVisitTypes(category).find((t) => t.id === id) || null;
  }

  function getSystemConsultationService(gender) {
    const g = gender === 'women' ? 'women' : 'men';
    return getService('c5')
      || filterServices({ gender: g, category: 'clinical' }).find((s) => !s.isPackage)
      || filterServices({ category: 'clinical' }).find((s) => !s.isPackage)
      || null;
  }

  function resolveBookServiceIds(opts = {}) {
    if (Array.isArray(opts.bookServiceIds) && opts.bookServiceIds.length) {
      return [...new Set(opts.bookServiceIds.filter(Boolean))];
    }
    return opts.bookServiceId ? [opts.bookServiceId] : [];
  }

  function combineNonPackageBooking(svcs, visitType, gender, visitTypeId) {
    const names = svcs.map((s) => shortName(s.name));
    const bookedServices = svcs.map((s) => ({
      serviceId: s.id,
      serviceName: shortName(s.name),
      price: s.price || 0,
      mode: resolvePublicBookingMode(s),
    }));
    const bookServiceIds = svcs.map((s) => s.id);
    const totalPrice = svcs.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalDuration = svcs.reduce((sum, s) => sum + getAppointmentDurationMin(s), 0);
    const totalScheduling = svcs.reduce((sum, s) => sum + getSchedulingDurationMin(s), 0);
    const hasConsult = svcs.some((s) => resolvePublicBookingMode(s) === 'consult');

    if (!hasConsult) {
      return {
        mode: 'direct_service',
        serviceId: svcs[0].id,
        serviceName: names.join(' + '),
        price: totalPrice,
        duration: totalDuration,
        schedulingDuration: totalScheduling,
        appointmentType: svcs[0]?.category || visitType?.category || '',
        scheduledVisitType: visitType.label,
        scheduledVisitTypeId: visitTypeId,
        providerSession: { activityId: window.StudioVisitFlow?.resolveActivityForServices?.(svcs) || 'service' },
        bookServiceId: svcs[0].id,
        bookServiceIds,
        bookedServices,
      };
    }

    const consultSvc = getSystemConsultationService(gender);
    const consultSvcs = svcs.filter((s) => resolvePublicBookingMode(s) === 'consult');
    const fromAmt = consultSvcs.reduce((max, s) => Math.max(max, s.consultFromPrice || s.price || 0), 0);
    return {
      mode: 'color_consult',
      serviceId: consultSvc?.id || 'c5',
      serviceName: `${names.join(' + ')} · consultation`,
      price: 0,
      duration: totalDuration,
      schedulingDuration: totalScheduling,
      appointmentType: consultSvcs[0]?.category || visitType?.category || '',
      scheduledVisitType: visitType.label,
      scheduledVisitTypeId: visitTypeId,
      intendedService: names.join(' + '),
      bookServiceId: svcs[0].id,
      bookServiceIds,
      bookedServices,
      fromPriceDisplay: fromAmt ? `Starting from ${formatPrice(fromAmt)}` : '',
      providerSession: { activityId: window.StudioVisitFlow?.resolveActivityForServices?.(consultSvcs) || 'consult' },
    };
  }

  function combineDirectBookingServices(svcs, luxAddons = []) {
    const names = svcs.map((s) => shortName(s.name));
    const bookedServices = svcs.map((s) => ({
      serviceId: s.id,
      serviceName: shortName(s.name),
      price: s.price || 0,
      mode: resolvePublicBookingMode(s),
    }));
    (luxAddons || []).forEach((id) => {
      const lux = getMensLuxAddon(id);
      if (!lux) return;
      bookedServices.push({
        serviceId: lux.id,
        serviceName: lux.name,
        price: lux.price,
        mode: 'lux_addon',
      });
    });
    const addonTotal = calcMensLuxAddonTotal(luxAddons);
    const basePrice = svcs.reduce((sum, s) => sum + (s.price || 0), 0);
    let duration = svcs.reduce((sum, s) => sum + getAppointmentDurationMin(s), 0);
    let schedulingDuration = svcs.reduce((sum, s) => sum + getSchedulingDurationMin(s), 0);
    if (svcs.length === 1 && svcs[0].luxAddonsEligible) {
      duration = calcDirectBookingDuration(svcs[0], luxAddons);
      schedulingDuration = calcDirectBookingSchedulingDuration(svcs[0], luxAddons);
    }
    return {
      serviceId: svcs[0].id,
      serviceName: names.join(' + '),
      price: basePrice + addonTotal,
      duration,
      schedulingDuration,
      bookServiceIds: svcs.map((s) => s.id),
      bookedServices,
      intendedService: names.join(' + '),
    };
  }

  function resolveCalendarBooking(clientId, opts = {}) {
    if (!clientId) return { error: 'Select a client first.' };

    const client = getClient(clientId);
    const gender = client?.gender || opts.gender || 'men';
    const nonPackageVisit = opts.visitTypeId ? getNonPackageVisitType(opts.visitTypeId) : null;
    const bookSvc = opts.bookServiceId ? getService(opts.bookServiceId) : (opts.serviceId ? getService(opts.serviceId) : null);
    const bookingNewEnrollment = !!(bookSvc?.isPackage || opts.extOptions?.family) && opts.usePrepaid === false;
    const usePrepaid = opts.usePrepaid !== false && !nonPackageVisit && !bookingNewEnrollment;
    const program = usePrepaid ? findActiveProgramForBooking(clientId, opts) : null;

    if (program && (program.visitsRemaining || 0) > 0) {
      const types = getScheduleVisitTypes(program.category);
      const visitTypeId = opts.visitTypeId || types[0]?.id;
      const visitType = getScheduleVisitType(program.category, visitTypeId);
      if (!visitType) return { error: 'Select a visit type.' };

      const followUp = getProgramFollowUpBooking(clientId, { programName: program.programName });
      if (!followUp) {
        return {
          error: `No prepaid visits remaining on ${program.programName}. Renew at the register before scheduling.`,
        };
      }

      const svc = followUp.service;
      return {
        mode: 'package_followup',
        serviceId: svc.id,
        serviceName: `${visitType.label} · ${formatFollowUpVisitName(program.programName, followUp.visitNumber, followUp.visitsIncluded)}`,
        price: 0,
        duration: getAppointmentDurationMin(svc),
        schedulingDuration: getSchedulingDurationMin(svc),
        scheduledVisitType: visitType.label,
        scheduledVisitTypeId: visitType.id,
        providerSession: { activityId: visitType.id },
        packageFields: followUp.packageFields,
        programName: program.programName,
        visitNumber: followUp.visitNumber,
        visitsIncluded: followUp.visitsIncluded,
      };
    }

    const visitTypeId = opts.visitTypeId || 'consult';
    const visitType = getNonPackageVisitType(visitTypeId) || getNonPackageVisitTypes()[0];

    if (visitTypeId === 'barber' || visitTypeId === 'salon') {
      const catalog = getNonPackageBookableServices(visitTypeId);
      const ids = resolveBookServiceIds(opts);
      const validSvcs = ids
        .map((id) => getService(id))
        .filter((s) => s && catalog.some((c) => c.id === s.id));

      if (!validSvcs.length) {
        if (opts.requireService) {
          return { error: `Select at least one ${visitType.label.toLowerCase()} service.` };
        }
        return {
          mode: 'direct_service',
          needsService: true,
          serviceId: '',
          serviceName: visitType.label,
          price: 0,
          duration: 60,
          schedulingDuration: 60,
          scheduledVisitType: visitType.label,
          scheduledVisitTypeId: visitTypeId,
        };
      }

      return combineNonPackageBooking(validSvcs, visitType, gender, visitTypeId);
    }

    const consultSvc = getSystemConsultationService(gender);
    return {
      mode: 'consultation',
      serviceId: consultSvc?.id || 'c5',
      serviceName: visitType?.label || 'System consultation',
      price: 0,
      duration: getAppointmentDurationMin(consultSvc),
      schedulingDuration: getSchedulingDurationMin(consultSvc),
      scheduledVisitType: visitType?.label || 'System consultation',
      scheduledVisitTypeId: 'consult',
      providerSession: { activityId: 'consult' },
      packageVisit: false,
    };
  }

  function getProgramFollowUpBooking(clientId, opts = {}) {
    const program = findActiveProgramForBooking(clientId, opts);
    if (!program || (program.visitsRemaining || 0) <= 0) return null;
    const svc = getMaintenanceServiceForProgram(program);
    if (!svc) return null;
    const fields = buildPackageVisitFields(clientId, {
      serviceId: svc.id,
      extOptions: program.extOptions,
      programName: program.programName,
    });
    const visitNumber = fields?.visitNumber || computeNextPackageVisitNumber(program);
    return {
      service: svc,
      program,
      visitNumber,
      visitsIncluded: program.visitsIncluded,
      displayName: formatFollowUpVisitName(program.programName, visitNumber, program.visitsIncluded),
      reason: `Prepaid follow-up on ${program.programName}`,
      packageFields: fields,
    };
  }

  function buildPackageVisitFields(clientId, opts = {}) {
    return refreshPackageVisitFields(clientId, opts);
  }

  function shouldBookAsPackageVisit(clientId, data = {}) {
    if (!clientId || data.packagePurchase || data.packageVisit === false) return false;
    const svc = data.serviceId ? getService(data.serviceId) : null;
    const isPackageSvc = !!(svc?.isPackage || data.extOptions?.family || isPackageCategory(svc?.category));
    if (!isPackageSvc) return false;
    return !!findActiveProgramForBooking(clientId, {
      serviceId: data.serviceId,
      extOptions: data.extOptions,
      category: svc?.category,
    });
  }

  function applyPackageContextToAppointment(appt, data, clientId) {
    if (!clientId || data.packagePurchase || data.packageVisit === false) return appt;
    if (appt.packageVisit && appt.programId) return appt;
    if (!shouldBookAsPackageVisit(clientId, {
      serviceId: appt.serviceId,
      extOptions: appt.extOptions,
      packagePurchase: data.packagePurchase,
      packageVisit: data.packageVisit,
    })) {
      return appt;
    }
    const fields = buildPackageVisitFields(clientId, {
      serviceId: appt.serviceId,
      extOptions: appt.extOptions,
    });
    if (!fields) return appt;
    Object.assign(appt, fields);
    appt.serviceName = formatPackageVisitServiceName(
      fields.programName,
      fields.visitNumber,
      fields.visitsIncluded
    );
    return appt;
  }

  function previewPackageBooking(clientId, opts = {}) {
    const svc = opts.serviceId ? getService(opts.serviceId) : null;
    const extPrice = opts.extOptions?.family
      ? computeExtensionPrice(getServices().find((s) =>
        s.isPackage && programBaseName(s.name) === opts.extOptions.family
      ), opts.extOptions)
      : null;
    const retailPrice = extPrice ?? svc?.price ?? 0;
    const serviceLabel = opts.extOptions?.family
      ? formatExtensionLabel(opts.extOptions.family, opts.extOptions)
      : (svc ? shortName(svc.name) : 'Service');
    const isPackageSvc = !!(svc?.isPackage || opts.extOptions?.family || isPackageCategory(svc?.category));

    if (!clientId) {
      return { mode: 'retail', price: retailPrice, serviceLabel };
    }

    const program = isPackageSvc ? findActiveProgramForBooking(clientId, opts) : null;
    if (program) {
      if ((program.visitsRemaining || 0) <= 0) {
        return {
          mode: 'exhausted',
          error: `No prepaid visits remaining on ${program.programName}. Renew at POS before booking another included visit.`,
          programName: program.programName,
        };
      }
      const fields = buildPackageVisitFields(clientId, opts);
      return {
        mode: 'included',
        price: 0,
        programName: program.programName,
        paymentPlan: program.paymentLabel || program.paymentPlan,
        visitNumber: fields.visitNumber,
        visitsIncluded: fields.visitsIncluded,
        visitsRemaining: program.visitsRemaining,
        visitValue: program.visitValue || 0,
        serviceLabel: formatPackageVisitServiceName(
          program.programName,
          fields.visitNumber,
          fields.visitsIncluded
        ),
      };
    }

    if (isPackageSvc) {
      return {
        mode: 'purchase_needed',
        price: retailPrice,
        serviceLabel,
        message: 'No active program on file — complete POS enrollment before scheduling prepaid visits.',
      };
    }

    return { mode: 'retail', price: retailPrice, serviceLabel };
  }

  function getPackageVisitLabel(appt) {
    if (!appt?.packageVisit) return '';
    return `Visit ${appt.visitNumber || '?'}/${appt.visitsIncluded || '?'}`;
  }

  function getAppointmentCheckoutDisplay(appt) {
    if (!appt) return { amount: 0, label: '$0', prepaid: false };
    if (appt.packageVisit) {
      return {
        amount: 0,
        label: `Prepaid · ${getPackageVisitLabel(appt)}`,
        prepaid: true,
        visitValue: appt.visitValue || 0,
      };
    }
    return { amount: appt.price || 0, label: formatPrice(appt.price || 0), prepaid: false };
  }

  function getAppointmentPosItem(appt) {
    const items = getAppointmentPosCartItems(appt);
    return items[0] || null;
  }

  function packageVisitPosItemFromFields(fields, label) {
    if (!fields?.programId) return null;
    return {
      id: fields.serviceId || `pkg-${fields.programId}-v${fields.visitNumber}`,
      name: label || formatPackageVisitServiceName(fields.programName, fields.visitNumber, fields.visitsIncluded),
      price: 0,
      qty: 1,
      packageVisit: true,
      programId: fields.programId,
      programName: fields.programName,
      programPaymentPlan: fields.programPaymentPlan || '',
      visitNumber: fields.visitNumber,
      visitsIncluded: fields.visitsIncluded,
      visitValue: fields.visitValue || 0,
      visitsUsed: fields.visitsUsed,
      visitsScheduled: fields.visitsScheduled,
      visitsRemaining: fields.visitsRemaining,
    };
  }

  function getAppointmentPosCartItems(appt) {
    if (!appt) return [];
    const VF = window.StudioVisitFlow;
    if (appt.packageVisit && appointmentUsesInactiveProgram(appt, appt.clientId)) {
      const retail = getPostVisitRetailPrice(appt, appt.clientId);
      const svc = appt.serviceId ? getService(appt.serviceId) : null;
      return [{
        id: appt.serviceId || `inactive-pkg-${appt.id}`,
        name: `${appt.serviceName || shortName(svc?.name || 'Service')} — inactive package (full price)`,
        price: retail,
        qty: 1,
        postVisitApptId: appt.id,
        postVisitServiceLine: true,
        inactivePackageBlocked: true,
      }];
    }
    if (appt.packageVisit) {
      const item = packageVisitPosItemFromFields({
        programId: appt.programId,
        programName: appt.programName,
        programPaymentPlan: appt.programPaymentPlan,
        visitNumber: appt.visitNumber,
        visitsIncluded: appt.visitsIncluded,
        visitValue: appt.visitValue,
        serviceId: appt.serviceId,
      }, `Included visit — ${appt.programName || appt.serviceName} (${getPackageVisitLabel(appt)})`);
      return item ? [item] : [];
    }
    if (appt.providerSession && VF?.buildProviderPosLineItems) {
      const fromSession = VF.buildProviderPosLineItems(appt, appt.providerSession);
      if (fromSession.length) return fromSession;
    }

    const billable = VF?.resolveApptBillableServices?.(appt) || [];
    if (billable.length) {
      const hasLuxAddon = billable.some((svc) => svc.isLuxAddon);
      return billable.map((svc, idx) => ({
        id: svc.id,
        name: shortName(svc.name),
        price: hasLuxAddon || billable.length > 1
          ? (svc.price || 0)
          : (appt.price > 0 ? appt.price : (svc.price || 0)),
        qty: 1,
        luxAddon: !!svc.isLuxAddon,
        extOptions: idx === 0 && !svc.isLuxAddon ? (appt.extOptions || null) : null,
      }));
    }

    const svc = appt.serviceId ? getService(appt.serviceId) : null;
    if (VF?.isBillableAppointmentService?.(svc)) {
      const price = appt.price > 0 ? appt.price : (svc.price || 0);
      return [{
        id: svc.id,
        name: appt.serviceName || shortName(svc.name),
        price,
        qty: 1,
        extOptions: appt.extOptions || null,
      }];
    }

    if (appt.serviceName) {
      return [{
        id: appt.serviceId || 'visit',
        name: appt.serviceName,
        price: appt.price || 0,
        qty: 1,
        extOptions: appt.extOptions || null,
      }];
    }
    return [];
  }

  function getPostVisitRetailPrice(appt, clientId) {
    if (!appt) return 0;
    if (appt.price > 0) return appt.price;
    const program = clientId ? findActiveProgramForBooking(clientId, {
      serviceId: appt.serviceId,
      extOptions: appt.extOptions,
      programName: appt.programName,
    }) : null;
    if (program?.visitValue) return program.visitValue;
    const svc = appt.serviceId ? getService(appt.serviceId) : null;
    return svc?.appointmentValue || svc?.price || 0;
  }

  function getPostVisitCheckoutCartItems(appt) {
    if (!appt) return [];
    if (appt.packageVisit) {
      const items = getAppointmentPosCartItems(appt);
      return items.map((item) => ({
        ...item,
        postVisitApptId: appt.id,
        postVisitServiceLine: !item.packageVisit,
      }));
    }
    const baseItems = getAppointmentPosCartItems(appt);
    if (!baseItems.length) return [];
    const inactiveBlocked = appt.clientId && getFuturePackageAppointmentsForInactivePrograms(appt.clientId).appointments.length > 0;
    const program = appt.clientId && !inactiveBlocked ? findActiveProgramForBooking(appt.clientId, {
      serviceId: appt.serviceId,
      extOptions: appt.extOptions,
      programName: appt.programName,
    }) : null;
    const hasPrepaid = !!(program && (program.visitsRemaining || 0) > 0);
    const retail = hasPrepaid ? getPostVisitRetailPrice(appt, appt.clientId) : 0;
    return baseItems.map((item, idx) => {
      const linePrice = hasPrepaid && retail > 0
        ? (baseItems.length === 1 ? retail : (item.price || retail))
        : item.price;
      return {
        ...item,
        price: linePrice,
        originalRetailPrice: linePrice,
        postVisitServiceLine: true,
        postVisitApptId: appt.id,
        prepaidAvailable: hasPrepaid,
        programId: program?.id || '',
        programName: program?.programName || '',
        visitValue: program?.visitValue || linePrice,
        qty: item.qty || 1,
        lineKey: `${item.id || 'line'}-${idx}`,
      };
    });
  }

  function applyPackageVisitToCartItem(item, fresh, apptId) {
    const retail = item.originalRetailPrice ?? item.price ?? fresh.visitValue ?? 0;
    return {
      ...item,
      price: 0,
      packageVisit: true,
      packageVisitApplied: true,
      originalRetailPrice: retail,
      programId: fresh.programId,
      programName: fresh.programName,
      programPaymentPlan: fresh.programPaymentPlan || '',
      visitNumber: fresh.visitNumber,
      visitsIncluded: fresh.visitsIncluded,
      visitValue: fresh.visitValue,
      visitsUsed: fresh.visitsUsed,
      visitsScheduled: fresh.visitsScheduled,
      visitsRemaining: fresh.visitsRemaining,
      postVisitApptId: apptId,
      postVisitServiceLine: true,
      prepaidAvailable: true,
    };
  }

  function getConsultFor(clientId, phone) {
    const appts = getClientAppointments(clientId, phone)
      .filter((a) => a.status !== 'canceled' && a.intendedService)
      .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
    const latest = appts[0];
    if (!latest) return null;
    return {
      programName: latest.intendedService,
      fromPriceDisplay: latest.fromPriceDisplay || '',
      appointmentId: latest.id,
      date: latest.date,
      startTime: latest.startTime,
      status: latest.status,
      source: latest.source || 'admin',
    };
  }

  function getClientProgramSummary(clientId, opts = {}) {
    const client = getClient(clientId);
    if (!client) {
      return { programs: [], consultFor: null, nextAppointment: null, stats: {} };
    }

    const cached = clientSummaryCache.get(clientId);
    if (!opts.force && cached && (Date.now() - cached.at) < CLIENT_SUMMARY_TTL_MS) {
      return cached.data;
    }

    syncClientLinkedRecords(client);
    const appts = getClientAppointments(clientId, client.phone);
    const txs = getClientTransactions(clientId);
    const trackableAppts = appts.filter((a) => !['canceled', 'no_show'].includes(a.status));
    const completedAppts = trackableAppts
      .filter((a) => a.status === 'completed')
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

    txs.forEach((tx) => {
      if (isSchedulingFeeTransaction(tx) || tx.type === 'refund') return;
      if (voidedTxProcessed.has(tx.id)) return;
      if ((Number(tx.total) || 0) > 0 && getRefundableAmount(tx) <= 0) {
        voidProgramsForRefundedTransaction(clientId, tx.id);
      }
      voidedTxProcessed.add(tx.id);
    });

    const programs = [];
    txs.forEach((tx) => {
      if (isSchedulingFeeTransaction(tx) || tx.type === 'refund') return;
      (tx.items || []).forEach((item, idx) => {
        const base = resolveProgramFromTxItem(item);
        if (!base) return;
        const meta = getProgramFamilyInfo(base.programName) || {};
        const refundMeta = getProgramRefundMeta(tx, item, idx, tx.items);
        programs.push({
          ...base,
          id: `${tx.id}-${idx}`,
          itemIndex: idx,
          purchasedAt: tx.at,
          transactionId: tx.id,
          totalPaid: (item.price || 0) * (item.qty || 1),
          netPaid: refundMeta.netPaid,
          refundedAmount: refundMeta.refundedAmount,
          fullyRefunded: refundMeta.fullyRefunded,
          partiallyRefunded: refundMeta.partiallyRefunded,
          paymentLabel: formatPaymentPlanLabel(base.paymentPlan),
          tagline: meta.tagline || '',
          highlights: meta.highlights || [],
        });
      });
    });

    allocateProgramVisits(programs, trackableAppts, clientId);
    attachWarrantyToPrograms(programs, trackableAppts, clientId);

    const consultFor = programs.length ? null : getConsultFor(clientId, client.phone);

    const upcoming = appts
      .filter((a) => !['canceled', 'completed', 'no_show'].includes(a.status))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
    const nextAppointment = upcoming[0] || null;

    const serviceSpend = txs
      .filter((t) => !isSchedulingFeeTransaction(t))
      .reduce((s, t) => s + (Number(t.total) || 0), 0);

    const creditBalance = getClientCreditBalance(clientId);
    const creditEntries = getClientCreditEntries(clientId);

    const result = {
      programs,
      consultFor,
      nextAppointment,
      creditBalance,
      creditEntries,
      stats: {
        totalVisits: completedAppts.length,
        lifetimeSpend: serviceSpend,
        memberSince: (client.createdAt || '').slice(0, 10),
        upcomingCount: upcoming.length,
        creditBalance,
      },
    };
    clientSummaryCache.set(clientId, { at: Date.now(), data: result });
    return result;
  }

  function sortApptsByTime(list) {
    return [...list].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  }

  function getLateTodayAppointments(graceMin = 5) {
    const today = todayISO();
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    return sortApptsByTime(
      getAppointmentsForDate(today)
        .filter((a) => a.status === 'scheduled')
        .map((a) => ({ ...a, lateMinutes: nowMins - timeToMinutes(a.startTime) }))
        .filter((a) => a.lateMinutes >= graceMin)
    );
  }

  function clientHasUpcomingVisit(clientId, phone, fromDate) {
    const day = fromDate || todayISO();
    return getClientAppointments(clientId, phone).some(
      (a) => !['canceled', 'completed', 'no_show'].includes(a.status) && a.date >= day
    );
  }

  function getClientsNeedingNextVisit() {
    const today = todayISO();
    const appts = getAppointments();
    const clients = getClients();
    const seen = new Set();
    const needs = [];

    function push(entry) {
      const key = entry.clientId || entry.clientName;
      if (!key || seen.has(key)) return;
      seen.add(key);
      needs.push(entry);
    }

    getLateTodayAppointments().forEach((a) => {
      push({
        type: 'late',
        clientId: a.clientId,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        appointmentId: a.id,
        detail: `${formatTime12(a.startTime)} appointment — ${Math.floor(a.lateMinutes)} min late`,
        serviceName: a.serviceName,
        priority: 0,
      });
    });

    appts
      .filter((a) => a.date === today && a.status === 'no_show')
      .forEach((a) => {
        if (clientHasUpcomingVisit(a.clientId, a.clientPhone)) return;
        push({
          type: 'no_show',
          clientId: a.clientId,
          clientName: a.clientName,
          clientPhone: a.clientPhone,
          appointmentId: a.id,
          detail: `No-show today — book a replacement visit`,
          serviceName: a.serviceName,
          priority: 1,
        });
      });

    clients.forEach((client) => {
      if (clientHasUpcomingVisit(client.id, client.phone)) return;

      const summary = getClientProgramSummary(client.id);
      const activePrograms = (summary.programs || []).filter((p) => isProgramEnrollmentActive(p));
      if (activePrograms.length) {
        const p = activePrograms.sort((a, b) => (b.visitsRemaining || 0) - (a.visitsRemaining || 0))[0];
        push({
          type: 'prepaid',
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          detail: `${p.visitsRemaining} prepaid visit${p.visitsRemaining !== 1 ? 's' : ''} left — no future booking`,
          serviceName: p.programName,
          priority: 2,
        });
        return;
      }

      const completed = getClientAppointments(client.id, client.phone)
        .filter((a) => a.status === 'completed')
        .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
      const last = completed[0];
      if (!last) return;

      const rec = window.StudioRebook?.buildRecommendation(last);
      if (!rec?.date || rec.date > today) return;

      push({
        type: 'past_due',
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        detail: `Follow-up due — last visit ${last.date}`,
        serviceName: rec.serviceName,
        recommendedDate: rec.date,
        priority: 3,
      });
    });

    return needs.sort((a, b) => a.priority - b.priority || a.clientName.localeCompare(b.clientName));
  }

  function normalizeBirthday(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (/^\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw + (raw.length === 10 ? '' : 'T12:00:00'));
    if (Number.isNaN(parsed.getTime())) return '';
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    if (raw.length <= 5) return `${month}-${day}`;
    return `${parsed.getFullYear()}-${month}-${day}`;
  }

  function birthdayMonthDay(birthday) {
    const normalized = normalizeBirthday(birthday);
    if (!normalized) return null;
    return normalized.length === 10 ? normalized.slice(5) : normalized;
  }

  function daysUntilBirthday(birthday, today = todayISO()) {
    const monthDay = birthdayMonthDay(birthday);
    if (!monthDay) return null;
    const [month, day] = monthDay.split('-').map(Number);
    const ref = new Date(today + 'T12:00:00');
    const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
    let year = ref.getFullYear();
    let nextUtc = Date.UTC(year, month - 1, day);
    if (nextUtc < refUtc) nextUtc = Date.UTC(year + 1, month - 1, day);
    return Math.round((nextUtc - refUtc) / 86400000);
  }

  function getAgeOnNextBirthday(birthday, daysUntil, today = todayISO()) {
    const normalized = normalizeBirthday(birthday);
    if (!normalized || normalized.length !== 10) return null;
    const birthYear = Number(normalized.slice(0, 4));
    if (!birthYear) return null;
    const ref = new Date(today + 'T12:00:00');
    let year = ref.getFullYear();
    if (daysUntil > 0) {
      const [month, day] = birthdayMonthDay(normalized).split('-').map(Number);
      const thisYearUtc = Date.UTC(year, month - 1, day);
      const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
      if (thisYearUtc < refUtc) year += 1;
    }
    return year - birthYear;
  }

  function formatBirthdayLabel(birthday) {
    const monthDay = birthdayMonthDay(birthday);
    if (!monthDay) return '';
    const [month, day] = monthDay.split('-').map(Number);
    return new Date(2000, month - 1, day).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  }

  function formatBirthdayCountdown(daysUntil) {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `In ${daysUntil} days`;
  }

  function getClientBirthdayPrompts(withinDays = 7) {
    const today = todayISO();
    return getClients()
      .map((client) => {
        const daysUntil = daysUntilBirthday(client.birthday, today);
        if (daysUntil == null || daysUntil > withinDays) return null;
        return {
          clientId: client.id,
          clientName: client.name || 'Unnamed',
          phone: client.phone || '',
          email: client.email || '',
          birthday: normalizeBirthday(client.birthday),
          birthdayLabel: formatBirthdayLabel(client.birthday),
          daysUntil,
          isToday: daysUntil === 0,
          countdownLabel: formatBirthdayCountdown(daysUntil),
          turningAge: getAgeOnNextBirthday(client.birthday, daysUntil, today),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysUntil - b.daysUntil || a.clientName.localeCompare(b.clientName));
  }

  function getTransactionsInRange(startIso, endIso) {
    return getTransactions().filter((t) => {
      const d = (t.at || '').slice(0, 10);
      return d >= startIso && d <= endIso;
    });
  }

  function buildClinicFinanceSummary(startIso, endIso) {
    const A = window.RenvoaAdmin;
    const model = A?.getPlModel ? A.getPlModel() : {};
    const txs = getTransactionsInRange(startIso, endIso);
    const sales = txs.filter((t) => t.type !== 'refund');
    const refundTxs = txs.filter((t) => t.type === 'refund');
    const grossRevenue = sales.reduce((s, t) => s + (t.total || 0), 0);
    const discounts = sales.reduce((s, t) => s + (t.discount || 0), 0);
    const creditApplied = sales.reduce((s, t) => s + (t.creditApplied || 0), 0);
    const refunds = refundTxs.reduce((s, t) => s + Math.abs(t.total || 0), 0);
    const netRevenue = grossRevenue - refunds;
    const processing = sales.reduce((s, t) => s + (t.total || 0) * (model.processingRate ?? 0.029) + (model.processingFee ?? 0.30), 0);
    const serviceCostRate = model.clinicServiceCostRate ?? 0.18;
    const cogs = netRevenue * serviceCostRate;
    const grossProfit = netRevenue - cogs;
    const marketing = netRevenue * (model.clinicMarketingPct ?? 0.08);
    const fixedOverhead = A?.prorateFixedOverhead
      ? A.prorateFixedOverhead(startIso, endIso) * (model.clinicOverheadShare ?? 0.45)
      : 0;
    const ebitda = grossProfit - processing - marketing - fixedOverhead;

    return {
      source: 'clinic',
      transactionCount: sales.length,
      orderCount: sales.length,
      grossRevenue: netRevenue,
      discounts,
      creditApplied,
      refunds,
      cogs,
      grossProfit,
      grossMargin: netRevenue ? grossProfit / netRevenue : 0,
      processing,
      marketing,
      fixedOverhead,
      ebitda,
      avgOrderValue: sales.length ? netRevenue / sales.length : 0,
      lineItems: txs,
    };
  }

  function getClinicFinanceSummary(options = {}) {
    const A = window.RenvoaAdmin;
    const range = A?.resolveFinanceRange
      ? A.resolveFinanceRange(options.preset, options.startDate, options.endDate)
      : { startDate: todayISO(), endDate: todayISO(), label: 'Today' };
    const activeSource = options.source || 'clinic';
    const clinic = A?.applyPlAdjustmentsToSummary
      ? A.applyPlAdjustmentsToSummary(buildClinicFinanceSummary(range.startDate, range.endDate), range.startDate, range.endDate, activeSource)
      : buildClinicFinanceSummary(range.startDate, range.endDate);
    const priorRange = A?.getPriorFinanceRange
      ? A.getPriorFinanceRange(range.startDate, range.endDate)
      : { startDate: range.startDate, endDate: range.endDate };
    const prior = A?.applyPlAdjustmentsToSummary
      ? A.applyPlAdjustmentsToSummary(buildClinicFinanceSummary(priorRange.startDate, priorRange.endDate), priorRange.startDate, priorRange.endDate, activeSource)
      : buildClinicFinanceSummary(priorRange.startDate, priorRange.endDate);
    return {
      ...clinic,
      range,
      priorRange,
      prior,
      plModel: A?.getPlModel ? A.getPlModel() : {},
      compare: {
        grossRevenue: A?.pctChange ? A.pctChange(clinic.grossRevenue, prior.grossRevenue) : 0,
        ebitda: A?.pctChange ? A.pctChange(clinic.ebitda, prior.ebitda) : 0,
        orderCount: A?.pctChange ? A.pctChange(clinic.transactionCount, prior.transactionCount) : 0,
      },
    };
  }

  function getDashboardStats() {
    const today = todayISO();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const appts = getAppointments();
    const txs = getTransactions();
    const clients = getClients();
    const cal = getCalendarSettings();
    const todayAll = sortApptsByTime(appts.filter((a) => a.date === today));
    const todayActive = todayAll.filter((a) => !['canceled', 'completed', 'no_show'].includes(a.status));
    const bookedSlots = todayActive.reduce((sum, a) => sum + apptSlotSpan(a, cal), 0);
    const totalSlots = getTimeSlots().length * cal.columns;
    const lateToday = getLateTodayAppointments();
    const lateMap = new Map(lateToday.map((a) => [a.id, a.lateMinutes]));
    const birthdayPrompts = getClientBirthdayPrompts(7);
    const birthdaysToday = birthdayPrompts.filter((b) => b.isToday);
    const birthdaysUpcoming = birthdayPrompts.filter((b) => !b.isToday);
    return {
      todayAppointments: todayAll.length,
      weekRevenue: txs.filter((t) => t.at >= weekAgo).reduce((s, t) => s + (t.total || 0), 0),
      monthRevenue: txs.filter((t) => t.at >= monthAgo).reduce((s, t) => s + (t.total || 0), 0),
      newInquiries: getInquiries().filter((i) => i.status === 'new').length,
      totalClients: clients.length,
      completedToday: todayAll.filter((a) => a.status === 'completed').length,
      canceledToday: todayAll.filter((a) => a.status === 'canceled').length,
      noShowsToday: todayAll.filter((a) => a.status === 'no_show').length,
      noShowsWeek: appts.filter((a) => a.status === 'no_show' && a.date >= weekAgo.slice(0, 10)).length,
      chairUtilization: totalSlots ? Math.round((bookedSlots / totalSlots) * 100) : 0,
      todaySchedule: todayAll.map((a) => ({
        ...a,
        isLate: lateMap.has(a.id),
        lateMinutes: lateMap.get(a.id) || 0,
      })),
      upcomingToday: todayActive,
      lateToday,
      needsNextVisit: getClientsNeedingNextVisit(),
      firstVisitsToday: todayActive.filter((a) => isFirstTimeClient(a.clientId, a.clientPhone)).length,
      recentTransactions: txs.slice(0, 5),
      birthdaysToday,
      birthdaysUpcoming,
      birthdayCountToday: birthdaysToday.length,
      birthdayCountWeek: birthdayPrompts.length,
      pendingOnlineBookings: getPendingOnlineBookings(),
    };
  }

  function shiftDate(iso, days) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function weekDates(centerDate) {
    const d = new Date(centerDate + 'T12:00:00');
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return x.toISOString().slice(0, 10);
    });
  }

  function syncAllClientVisitTags() {
    const list = getClients();
    if (!list.length) return;
    const now = new Date().toISOString();
    let dirty = false;
    const next = list.map((client) => {
      const firstTime = isFirstTimeClient(client.id);
      const tags = client.tags || [];
      const hasTag = tags.includes(FIRST_VISIT_TAG);
      if (firstTime && !hasTag) {
        dirty = true;
        return { ...client, tags: [...tags, FIRST_VISIT_TAG], updatedAt: now };
      }
      if (!firstTime && hasTag) {
        dirty = true;
        return { ...client, tags: tags.filter((t) => t !== FIRST_VISIT_TAG), updatedAt: now };
      }
      return client;
    });
    if (dirty) write(KEYS.clients, next);
  }

  function seedDemoData() {
    if (window.ONYX_STUDIO_PUBLIC_BOOKING) return;
    if (read('renova-studio-seeded', false)) return;
    if (getAppointments().length || getClients().length) {
      write('renova-studio-seeded', true);
      return;
    }
    const services = window.STUDIO_SERVICES || [];
    const svc = services.find((s) => s.category === 'program' && s.gender !== 'women') || services[0];
    if (!svc) return;

    const today = todayISO();
    const tomorrow = shiftDate(today, 1);

    if (!getStaff().length) {
      addStaff({ name: 'Studio Lead', role: 'Owner', email: 'lead@onyxstudios.com', active: true });
      addStaff({ name: 'Chair Specialist', role: 'Stylist', email: 'stylist@onyxstudios.com', active: true });
    }

    upsertClient({
      name: 'Alex Morgan',
      phone: '5550101001',
      email: 'alex@example.com',
      gender: 'men',
      birthday: today,
      portalCode: '482910',
    });
    upsertClient({
      name: 'Jordan Lee',
      phone: '5550101002',
      email: 'jordan@example.com',
      gender: 'women',
      birthday: shiftDate(today, 3),
      portalCode: '719384',
    });

    createAppointment({
      clientName: 'Alex Morgan',
      clientPhone: '5550101001',
      serviceId: svc.id,
      date: today,
      startTime: '09:00',
      column: 1,
    });
    const longSvc = services.find((s) => s.id === 'c3') || svc;
    const checkedInDemo = new Date(Date.now() - 18 * 60000).toISOString();
    createAppointment({
      clientName: 'Jordan Lee',
      clientPhone: '5550101002',
      serviceId: longSvc.id,
      date: today,
      startTime: '10:30',
      column: 2,
      status: 'checked_in',
      checkedInAt: checkedInDemo,
    });
    createAppointment({
      clientName: 'Alex Morgan',
      clientPhone: '5550101001',
      serviceId: svc.id,
      date: tomorrow,
      startTime: '14:00',
      column: 1,
    });

    write('renova-studio-seeded', true);
  }

  function migrateClientPortalCodes() {
    getClients().forEach((c) => {
      if (!c.portalCode) ensureClientPortalAccess(c.id);
    });
    const alex = findClientByPhone('5550101001');
    const jordan = findClientByPhone('5550101002');
    if (alex && !alex.portalCode) updateClient(alex.id, { portalCode: '482910' });
    if (jordan && !jordan.portalCode) updateClient(jordan.id, { portalCode: '719384' });
  }

  function runStudioDataBootTasks() {
    clearClientSessionRaw();
    seedDemoData();
    migrateClientPortalCodes();
    syncAllClientVisitTags();
    syncClientCreditsFromTransactions();
  }

  function scheduleStudioDataBootTasks() {
    const run = () => {
      try {
        runStudioDataBootTasks();
      } catch (err) {
        console.error('Studio data boot tasks failed:', err);
      }
    };
    if (window.StudioStorage?.whenReady) {
      window.StudioStorage.whenReady().then(run);
    } else {
      run();
    }
  }

  function bindStudioStorageRefresh() {
    const storage = window.StudioStorage;
    if (!storage?.onChange) return;
    const syncKeys = new Set([
      KEYS.clients,
      KEYS.appointments,
      KEYS.transactions,
      KEYS.clientCredits,
      KEYS.programOverrides,
      KEYS.programVisitLog,
      KEYS.programWarrantyLog,
    ]);
    storage.onChange((key) => {
      if (syncKeys.has(key)) {
        writeFingerprints.delete(key);
        invalidateClientDataCaches();
      }
    });
  }

  scheduleStudioDataBootTasks();
  bindStudioStorageRefresh();

  return {
    KEYS,
    APPT_STATUS,
    STAFF_ROLES,
    getSettings,
    getFinanceUrl,
    getFinanceCustomUrl,
    getFinanceEmbedUrl,
    getFinanceMerchantId,
    isFinanceConfigured,
    isConsumerFinanceEmbedUrl,
    requiresFinancePopup,
    openCareCreditApplyWindow,
    renderFinanceLauncherPanel,
    initFinanceLauncher,
    normalizeFinanceUrl,
    isFinancePlaceholderUrl,
    getFinanceSetupUrl,
    renderFinanceSetupPanel,
    getFinanceEmbedConfig,
    initFinanceEmbed,
    openFinanceApplication,
    saveSettings,
    getStaff,
    addStaff,
    updateStaff,
    removeStaff,
    programBaseName,
    groupPrograms,
    isPackageCategory,
    isExtensionCategory,
    getExtensionConfig,
    getExtensionLeadFamily,
    getExtensionFamilyBadge,
    getConfigurableExtension,
    getExtensionWizardSteps,
    getExtensionLengthRow,
    extensionFromPrice,
    extensionPriceDisplay,
    formatIncludedHairSummary,
    getExtensionShadeGroups,
    getExtensionShadeSurcharge,
    getExtensionSupplierWeftCost,
    calcExtensionSupplierOrderCost,
    getExtensionSupplierSummary,
    getExtensionBasePlanPrice,
    getExtensionAdditionalTotal,
    getExtensionPlanTotal,
    getExtensionAmountDue,
    getExtensionPricingMeta,
    computeExtensionPrice,
    getExtensionAppointmentValue,
    formatExtensionLabel,
    defaultExtensionOptions,
    EXT_WIZARD_STEPS,
    getProgramFamilyInfo,
    getProgramFamilies,
    programFromPrice,
    slotIndex,
    getNowSlotLine,
    rescheduleAppointment,
    apptCoversSlot,
    apptStartsAtSlot,
    apptSlotSpan,
    findConflict,
    getAvailableSlots,
    findAvailableColumn,
    PUBLIC_BOOKING_SCARCITY,
    PUBLIC_SAME_DAY_LEAD_MINUTES,
    isPublicSlotBookable,
    getPublicAvailableSlots,
    getPublicSlotAvailability,
    getPublicFromPrice,
    getCategoryLowestMonthlyFrom,
    getFamilyMonthlyPaymentAmounts,
    formatCategoryMonthlyFromLine,
    usesCategoryMonthlyFrom,
    resolvePublicBookingMode,
    resolvePublicConsultLabel,
    getMensLuxAddons,
    getMensLuxAddon,
    isLuxAddonId,
    luxAddonAsService,
    resolveApptLuxAddonIds,
    calcMensLuxAddonTotal,
    calcDirectBookingDuration,
    calcDirectBookingSchedulingDuration,
    getSchedulingDurationMin,
    getAvailabilityStepMin,
    formatLuxAddonNote,
    getFinanceMonthlyPayment,
    buildFromPriceResult,
    getExtensionFromPriceCandidates,
    getSystemFromPrice,
    getExtensionPublicFromPrice,
    getPublicBookableDates,
    createPublicBooking,
    SCHEDULING_FEE,
    POS_OVERRIDE_PIN,
    RESCHEDULE_POLICY,
    ATTENDANCE_VIOLATION_POLICY,
    clientHasRecentAttendanceViolation,
    getClientBookingPaymentPolicy,
    resolvePublicBookingPrepayAmount,
    calcPrepaidBookingRefund,
    isRecentAttendanceViolation,
    loginClientPortal,
    setupClientPortalPassword,
    setupAuthedClientPortalPassword,
    setClientPortalPassword,
    clientNeedsPortalPassword,
    findReturningClientForBooking,
    logoutClientPortal,
    isClientPortalAuthed,
    getAuthedClient,
    appointmentMatchesClient,
    ensureClientAppointmentAccess,
    syncClientLinkedRecords,
    invalidateClientDataCaches,
    ensureClientPortalAccess,
    getAppointmentChangePolicy,
    getReschedulePolicy,
    getCancellationPolicy,
    hoursUntilAppointment,
    createClientPortalBooking,
    rescheduleClientAppointment,
    cancelClientAppointment,
    getClientCreditBalance,
    getClientCreditEntries,
    addManualClientCredit,
    getRefundableAmount,
    getRefundedTotalForTransaction,
    getClientRefundableTransactions,
    issueClientRefund,
    getProgramOverrides,
    getProgramOverride,
    saveProgramOverride,
    adjustClientProgram,
    applyClientCredit,
    recordSchedulingFeeCredit,
    hasSchedulingDepositPaid,
    getAppointmentCreditStatus,
    syncClientCreditsFromTransactions,
    isSchedulingFeeTransaction,
    searchClients,
    getInquiries,
    updateInquiry,
    FIRST_VISIT_TAG,
    isFirstTimeClient,
    syncClientVisitTag,
    getClients,
    getClient,
    upsertClient,
    updateClient,
    deleteClient,
    findDuplicateClientGroups,
    getDuplicateGroupsForClient,
    getMergeCandidatesForClient,
    findClientsByName,
    previewClientMerge,
    mergeClients,
    getClientVisitRecords,
    markVisitPhotos,
    getClientPhotos,
    getClientPhotosForAppointment,
    addClientPhoto,
    addClientPhotosFromFiles,
    removeClientPhoto,
    compressImageFile,
    isOnlineBookingSource,
    getOnlineBookingSourceLabel,
    getAppointmentInspoPhotos,
    appointmentHasBookingPrep,
    getPendingOnlineBookings,
    markBookingReviewed,
    findClientByPhone,
    getClientAppointments,
    getClientTransactions,
    getClientProgramSummary,
    isProgramEnrollmentActive,
    resolveProgramForAppointment,
    appointmentUsesInactiveProgram,
    getFuturePackageAppointmentsForInactivePrograms,
    cancelFuturePackageAppointmentsForInactivePrograms,
    assertPackageVisitRedemptionAllowed,
    previewPackageBooking,
    getAppointmentCheckoutDisplay,
    getAppointmentPosItem,
    getAppointmentPosCartItems,
    getPostVisitCheckoutCartItems,
    getPostVisitRetailPrice,
    applyPackageVisitToCartItem,
    packageVisitPosItemFromFields,
    getPackageVisitLabel,
    findActiveProgramForBooking,
    buildPackageVisitFields,
    getMaintenanceServiceForProgram,
    SCHEDULE_VISIT_TYPES,
    getScheduleVisitTypes,
    getScheduleVisitType,
    getNonPackageVisitTypes,
    getNonPackageVisitType,
    getNonPackageBookableServices,
    getSystemConsultationService,
    resolveBookServiceIds,
    combineNonPackageBooking,
    combineDirectBookingServices,
    resolveCalendarBooking,
    getProgramFollowUpBooking,
    computeNextPackageVisitNumber,
    refreshPackageVisitFields,
    recordProgramVisitRedemption,
    getProgramVisitHistory,
    redeemPackageVisitOnAppointment,
    programQualifiesForWarranty,
    computeProgramWarranty,
    getClientWarrantySummary,
    getClientWarrantyHistory,
    recordWarrantyReinstatement,
    warrantyReinstatementPosItem,
    formatPackageVisitServiceName,
    formatFollowUpVisitName,
    getConsultFor,
    formatPaymentPlanLabel,
    getAppointments,
    getAppointmentsForDate,
    getAppointment,
    createAppointment,
    updateAppointment,
    applyStatusTimestamps,
    getApptElapsedSummary,
    needsIntake,
    clientNeedsPortalIntake,
    portalIntakeFormsIncomplete,
    getIntakeFormStatus,
    getClientPortalFormsAppointments,
    isIntakeComplete,
    isPortalIntakeComplete,
    getClientPendingIntakeAppointments,
    saveClientPortalIntake,
    canAdvanceVisit,
    getClientAllergies,
    clientHasAllergies,
    saveAppointmentVisit,
    deleteAppointment,
    getTransactions,
    createTransaction,
    getBookings,
    createBooking,
    updateBooking,
    getServices,
    getService,
    getShelfItems,
    getShelfItem,
    filterShelfItems,
    getShelfCategories,
    isShelfPosItem,
    filterServices,
    getPublicBookableServices,
    isInternalBookingService,
    visibleCategories,
    normalizeServiceCategory,
    defaultCategoryForGender,
    getPublicLine,
    visibleCategoriesForLine,
    defaultCategoryForLine,
    resolveBookingGender,
    formatPrice,
    shortName,
    paymentType,
    computeFinancePrice,
    computeFinancePackagePrice,
    roundFinanceTotalTo99,
    buildFinanceTier,
    getPackageWarranty,
    formatPackageVisitsLabel,
    formatExtensionVisitsLabel,
    formatPackageWarrantyHtml,
    getQuarterlyMinPayment,
    isQuarterlyPaymentEligible,
    getExtensionQuarterlyPayment,
    isExtensionQuarterlyEligible,
    isServiceQuarterlyEligible,
    filterEligiblePaymentTiers,
    parseDurationMin,
    getProviderDurationMin,
    getAppointmentDurationMin,
    formatClientDuration,
    getCalendarSettings,
    saveCalendarSettings,
    getTimeSlots,
    timeToMinutes,
    formatTime12,
    minutesToTime,
    addMinutesToTime,
    getPricingOverrides,
    savePricingOverride,
    getDashboardStats,
    getClinicFinanceSummary,
    buildClinicFinanceSummary,
    getTransactionsInRange,
    getClientBirthdayPrompts,
    formatBirthdayLabel,
    formatBirthdayCountdown,
    normalizeBirthday,
    getLateTodayAppointments,
    getClientsNeedingNextVisit,
    todayISO,
    shiftDate,
    weekDates,
  };
})();