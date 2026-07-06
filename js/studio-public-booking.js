(function () {
  'use strict';

  const RS = () => window.RenvoaStudios;
  const $ = (s, r = document) => r.querySelector(s);

  const STEPS = [
    { id: 'service', label: 'Service' },
    { id: 'schedule', label: 'Date & time' },
    { id: 'details', label: 'Your info' },
    { id: 'pay', label: 'Scheduling fee' },
  ];

  const state = {
    step: 0,
    line: null,
    gender: null,
    category: null,
    familyBase: '',
    serviceId: '',
    intendedService: '',
    fromPriceDisplay: '',
    duration: 60,
    date: '',
    time: '',
    column: 1,
    name: '',
    email: '',
    phone: '',
    notes: '',
    hairLikes: '',
    hairDislikes: '',
    priorServices: '',
    beverage: '',
    inspoPhotos: [],
    error: '',
    confirmed: null,
    returningClient: null,
    bookingMode: 'consult',
    bookServiceId: '',
    luxAddons: [],
    pendingInterest: '',
    pendingServiceId: '',
  };

  function checkReturningClient() {
    if (!state.phone || !state.email || !RS()?.findReturningClientForBooking) {
      state.returningClient = null;
      return;
    }
    state.returningClient = RS().findReturningClientForBooking(state.phone, state.email);
  }

  function bookingPaymentInfo() {
    const RSapi = RS();
    if (!RSapi?.resolvePublicBookingPrepayAmount) {
      return { amount: RSapi?.SCHEDULING_FEE || 29, requiresFullPrice: false, mode: 'scheduling_fee', policy: null };
    }
    return RSapi.resolvePublicBookingPrepayAmount({
      clientPhone: state.phone,
      clientEmail: state.email,
      bookingMode: state.bookingMode,
      bookServiceId: state.bookServiceId || state.serviceId,
      bookServiceIds: state.bookServiceIds?.length ? state.bookServiceIds : (state.bookServiceId || state.serviceId ? [state.bookServiceId || state.serviceId] : []),
      serviceId: state.serviceId,
      intendedService: state.intendedService,
      luxAddons: state.luxAddons,
    });
  }

  function renderAttendancePenaltyBanner() {
    const pay = bookingPaymentInfo();
    if (!pay.requiresFullPrice) return '';
    return `
      <div class="studio-returning-banner studio-attendance-policy-banner" role="status">
        <strong>Full prepayment required</strong>
        <p>${esc(pay.policy?.message || 'Because of a recent no-show or late cancellation, full service price is due today. Cancellations refund at most 50% — we retain $29 or half your payment, whichever is greater.')}</p>
      </div>`;
  }

  function renderReturningBanner() {
    if (!state.returningClient) return '';
    const name = state.returningClient.name?.split(' ')[0] || 'there';
    const hasPw = !!state.returningClient.portalPasswordHash;
    return `
      <div class="studio-returning-banner" role="status">
        <strong>Hi there again, ${esc(name)}!</strong>
        <p>We see you&apos;ve been here before — thanks for returning. ${hasPw ? 'Sign in to your portal anytime to manage visits.' : 'Want to set up your client portal to reschedule and book prepaid visits?'}</p>
        ${!hasPw ? `<button type="button" class="btn-secondary btn-sm" data-book-portal-setup>Set up my portal</button>` : `<button type="button" class="btn-secondary btn-sm" data-book-portal-login>Go to portal</button>`}
      </div>`;
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function fmtShortDate(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function fmtTime12(time) {
    if (RS()?.formatTime12) return RS().formatTime12(time);
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function lineMeta(line) {
    return RS()?.getPublicLine?.(line) || window.STUDIO_PUBLIC_LINES?.[line] || {};
  }

  function defaultCategory() {
    if (!state.line) return 'clinical';
    return RS()?.defaultCategoryForLine?.(state.line, state.gender)
      || lineMeta(state.line).defaultCategory
      || 'clinical';
  }

  function bookingGender() {
    return RS()?.resolveBookingGender?.(state.line, state.gender) || state.gender || '';
  }

  function needsGenderStep() {
    if (state.category === 'clinical') return false;
    const meta = lineMeta(state.line);
    return !!(meta.usesGender && !state.gender);
  }

  function publicBookableServices(gender, category) {
    return RS()?.getPublicBookableServices?.({ gender, category })
      || RS().filterServices({ gender, category }).filter((s) => s.id !== 'c5' && !s.isAddon);
  }

  function bookingUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      hashParams.forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    }
    return params;
  }

  function resolveBookingCategory(categoryId, line, gender) {
    const cats = RS()?.visibleCategoriesForLine?.(line, gender) || [];
    const allowed = new Set(cats.map((c) => c.id));
    return allowed.has(categoryId) ? categoryId : null;
  }

  function initBookingFromPage() {
    const params = bookingUrlParams();
    let line = params.get('line');
    let gender = params.get('gender') || params.get('book');
    const categoryParam = params.get('category');
    if (!line && (gender === 'men' || gender === 'women')) line = 'clinic';
    if (line && window.STUDIO_PUBLIC_LINES?.[line]) {
      state.line = line;
      state.category = defaultCategory();
    }
    if (gender === 'men' || gender === 'women') {
      state.gender = gender;
      if (!state.line) state.line = 'clinic';
      state.category = defaultCategory();
    }
    if (categoryParam && state.line) {
      const resolved = resolveBookingCategory(categoryParam, state.line, state.gender);
      if (resolved) state.category = resolved;
    }
    if (window.studioActiveLine && !state.line) {
      state.line = window.studioActiveLine;
      state.category = defaultCategory();
    }
    state.pendingInterest = params.get('interest') || '';
    state.pendingServiceId = params.get('service') || '';
  }

  function matchServiceInterest(services, interest) {
    const needle = interest.trim().toLowerCase();
    if (!needle) return null;
    return services.find((s) => {
      const short = RS().shortName(s.name).toLowerCase();
      const full = String(s.name || '').toLowerCase();
      return short === needle
        || full === needle
        || short.includes(needle)
        || full.includes(needle);
    }) || null;
  }

  function applyBookingDeepLink() {
    const interest = state.pendingInterest;
    const serviceId = state.pendingServiceId;
    if ((!interest && !serviceId) || state.step !== 0 || state.confirmed) return;

    const cat = state.category || defaultCategory();
    const gender = bookingGender();

    if (serviceId) {
      const svc = RS().getService(serviceId);
      if (svc && !RS().isInternalBookingService?.(svc)) {
        selectService(svc);
        state.pendingServiceId = '';
        state.pendingInterest = '';
        return;
      }
    }

    if (!interest) return;

    if (RS()?.isPackageCategory?.(cat) || cat === 'clinical') {
      const families = RS().getProgramFamilies({ gender, category: cat });
      const needle = interest.trim().toLowerCase();
      const family = families.find((f) => f.base.toLowerCase() === needle
        || f.base.toLowerCase().includes(needle));
      if (family) {
        selectFamily(family);
        state.pendingInterest = '';
        state.pendingServiceId = '';
        return;
      }
    }

    const services = publicBookableServices(gender, cat);
    const svc = matchServiceInterest(services, interest);
    if (svc) selectService(svc);

    state.pendingInterest = '';
    state.pendingServiceId = '';
  }

  function applyExternalLine(line) {
    if (!line || line === 'portal' || !window.STUDIO_PUBLIC_LINES?.[line] || state.line === line) return;
    state.line = line;
    state.gender = lineMeta(line).usesGender ? state.gender : null;
    state.category = defaultCategory();
    state.familyBase = '';
    state.serviceId = '';
    state.intendedService = '';
    state.fromPriceDisplay = '';
    state.step = 0;
    state.error = '';
    render();
  }

  function consultationService() {
    return RS().getService('c5') || RS().getServices().find((s) => s.category === 'clinical');
  }

  function isBarberSalonLine() {
    return state.line === 'barber' || state.line === 'salon';
  }

  function selectedBookService() {
    const id = state.bookServiceId || state.serviceId;
    return id ? RS().getService(id) : null;
  }

  function refreshBookingDuration() {
    const svc = selectedBookService();
    if (state.bookingMode === 'direct' && svc) {
      state.duration = RS().calcDirectBookingDuration(svc, state.luxAddons);
      state.schedulingDuration = RS().calcDirectBookingSchedulingDuration(svc, state.luxAddons);
      return;
    }
    const consult = consultationService();
    state.duration = RS().getAppointmentDurationMin(consult);
    state.schedulingDuration = RS().getProviderDurationMin(consult);
  }

  function directServicePriceDisplay(svc) {
    const addonTotal = RS().calcMensLuxAddonTotal(state.luxAddons);
    const total = (svc?.price || 0) + addonTotal;
    return RS().formatPrice(total);
  }

  function categoryMonthlyFrom(cat) {
    if (!RS()?.usesCategoryMonthlyFrom?.(cat)) return null;
    return RS().getCategoryLowestMonthlyFrom(cat, bookingGender());
  }

  function selectFamily(family) {
    const svc = consultationService();
    const cat = family.category || state.category;
    const categoryFrom = categoryMonthlyFrom(cat);
    state.familyBase = family.base;
    state.bookingMode = 'consult';
    state.bookServiceId = '';
    state.luxAddons = [];
    state.serviceId = svc?.id || '';
    state.intendedService = family.base;
    state.fromPriceDisplay = categoryFrom?.display || '';
    refreshBookingDuration();
    state.error = '';
  }

  function selectService(svc) {
    const mode = RS().resolvePublicBookingMode(svc);
    state.familyBase = '';
    state.luxAddons = [];
    state.bookingMode = mode;
    state.bookServiceId = svc.id;

    if (mode === 'direct') {
      state.serviceId = svc.id;
      state.intendedService = RS().shortName(svc.name);
      state.fromPriceDisplay = directServicePriceDisplay(svc);
      refreshBookingDuration();
    } else {
      const consult = consultationService();
      const fromAmt = svc.consultFromPrice || window.STUDIO_COLOR_CONSULT_FROM || svc.price;
      state.serviceId = consult?.id || 'c5';
      state.intendedService = RS().shortName(svc.name);
      state.fromPriceDisplay = `Starting from ${RS().formatPrice(fromAmt)}`;
      refreshBookingDuration();
    }
    state.error = '';
  }

  function syncLuxAddon(id, checked) {
    const svc = selectedBookService();
    if (!svc?.luxAddonsEligible) return;
    const set = new Set(state.luxAddons);
    if (checked) set.add(id);
    else set.delete(id);
    state.luxAddons = [...set];
    state.fromPriceDisplay = directServicePriceDisplay(svc);
    refreshBookingDuration();
  }

  function renderLuxAddonPicker() {
    const svc = selectedBookService();
    if (!svc?.luxAddonsEligible || state.bookingMode !== 'direct') return '';
    const addons = RS().getMensLuxAddons();
    const extraMin = (state.luxAddons.length >= 2) ? (window.STUDIO_LUX_ADDON_EXTRA_MIN || 15) : 0;
    return `
      <div class="studio-book-lux-addons">
        <p class="studio-book-lux-title">Optional lux add-ons <span>+$30 each</span></p>
        <p class="studio-book-lux-note">Included in the <strong>Lux Cut</strong>. Add any two or more and we reserve an extra ${window.STUDIO_LUX_ADDON_EXTRA_MIN || 15} minutes.</p>
        <div class="studio-book-lux-grid">
          ${addons.map((a) => `
            <label class="studio-book-lux-option">
              <input type="checkbox" data-book-lux-addon="${a.id}"${state.luxAddons.includes(a.id) ? ' checked' : ''}>
              <span><strong>${esc(a.name)}</strong><em>+${RS().formatPrice(a.price)}</em></span>
            </label>`).join('')}
        </div>
        ${extraMin ? `<p class="studio-book-lux-time" role="status">+${extraMin} min added to your visit (${state.duration} min total)</p>` : ''}
      </div>`;
  }

  function isPackageConsultCategory(cat) {
    return RS()?.isPackageCategory?.(cat)
      ?? ['program', 'womens_program', 'womens_extensions', 'clinical'].includes(cat);
  }

  function packageConsultLabel(cat) {
    if (cat === 'womens_extensions') return 'Extension consultation';
    if (cat === 'womens_program' || cat === 'program') return 'Fitting consultation';
    if (cat === 'clinical') return 'Trichology consultation';
    return 'Private consultation';
  }

  function serviceStepLeadCopy(cat) {
    if (isBarberSalonLine()) {
      return `Cuts and grooming book directly. Color reserves a consultation. $${RS().SCHEDULING_FEE} scheduling fee credited at your visit. <a href="#portal">Returning client? Sign in</a>.`;
    }
    if (cat === 'womens_extensions') {
      return `Pick a method below to see what&apos;s included. First visit is always a consultation — length, shade, and plan confirmed in-studio.`;
    }
    if (cat === 'program' || cat === 'womens_program') {
      return `Pick a program below to review what&apos;s included. New clients book a fitting consultation first.`;
    }
    if (cat === 'clinical') {
      return `One-time <strong>$225</strong> trichology consultation — book your private scalp and hair-loss evaluation directly.`;
    }
    return `Starting prices for reference. Online booking reserves a private consultation.`;
  }

  function scheduleStepLeadCopy() {
    if (state.bookingMode === 'direct') {
      return `Private studio — <strong>${state.duration} min</strong> for ${esc(state.intendedService)}.`;
    }
    if (isBarberSalonLine()) {
      return `Color consultation — <strong>${state.duration} min</strong> to plan ${esc(state.intendedService)}.`;
    }
    const cat = state.category || defaultCategory();
    if (cat === 'womens_extensions') {
      return `<strong>${esc(packageConsultLabel(cat))}</strong> — <strong>${state.duration} min</strong> to plan ${esc(state.intendedService)}. Install length, shade, and payment options are confirmed in-studio.`;
    }
    if (cat === 'program' || cat === 'womens_program') {
      return `<strong>${esc(packageConsultLabel(cat))}</strong> — <strong>${state.duration} min</strong> for ${esc(state.intendedService)}.`;
    }
    if (cat === 'clinical') {
      return `<strong>${esc(state.intendedService)}</strong> — <strong>${state.duration} min</strong> · one-time <strong>$225</strong> fee.`;
    }
    return `Private studio sessions — <strong>${state.duration} min</strong> consultation for ${esc(state.intendedService)}.`;
  }

  function consultConfirmTitle(bookingMode, category, line) {
    if (bookingMode === 'direct') return 'Appointment booked.';
    if (category === 'womens_extensions') return 'Extension consultation booked.';
    if (category === 'program' || category === 'womens_program') return 'Fitting consultation booked.';
    if (category === 'clinical') return 'Trichology consultation booked.';
    if (line === 'barber' || line === 'salon') return 'Color consultation booked.';
    return 'Consultation booked.';
  }

  function renderProgramFamilyDetail(grp) {
    if (!grp) return '';
    const meta = RS().getProgramFamilyInfo(grp.base) || {};
    const isExt = grp.category === 'womens_extensions';
    const extCfg = isExt ? RS().getExtensionConfig(grp.base) : null;
    const pif = (grp.services || []).find((s) => RS().paymentType(s.name) === 'Pay in full');
    const visits = pif?.appointmentsIncluded || grp.services[0]?.appointmentsIncluded;
    const highlights = meta.highlights?.length ? meta.highlights : [];
    const includedHair = extCfg ? RS().formatIncludedHairSummary(extCfg) : null;
    const lengthRange = extCfg?.lengths?.length
      ? `${extCfg.lengths[0].inches}″–${extCfg.lengths[extCfg.lengths.length - 1].inches}″ lengths`
      : '';
    const shadePremium = extCfg?.shadeRetailPremium?.Blonde;
    const shadeNote = extCfg?.shadeGroups?.length
      ? `${extCfg.shadeGroups.join(', ')} shades${shadePremium ? ` · Blonde & Balayage +${RS().formatPrice(shadePremium)}` : ''}`
      : '';
    return `
      <div class="studio-book-program-detail" id="studioBookProgramDetail">
        <div class="studio-book-consult-banner" role="status">
          <span class="studio-book-consult-banner-badge">${esc(packageConsultLabel(grp.category))}</span>
          <p><strong>First visit = consultation.</strong> You&apos;re reserving time to plan ${esc(grp.base)} — not checking out for a full install today. Your scheduling fee is credited toward your program.</p>
        </div>
        <div class="studio-book-program-detail-head">
          <h4>${esc(grp.base)}</h4>
          ${meta.tagline ? `<p class="studio-book-program-tagline">${esc(meta.tagline)}</p>` : ''}
        </div>
        ${meta.description ? `<p class="studio-book-program-desc">${esc(meta.description)}</p>` : ''}
        <div class="studio-book-program-includes">
          <p class="studio-book-program-includes-label">What&apos;s included</p>
          <ul class="studio-book-program-highlights">
            ${visits ? `<li>${visits} studio visit${visits === 1 ? '' : 's'} in program</li>` : ''}
            ${includedHair ? `<li>${esc(includedHair)}</li>` : ''}
            ${lengthRange ? `<li>${esc(lengthRange)}</li>` : ''}
            ${shadeNote ? `<li>${esc(shadeNote)}</li>` : ''}
            ${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
          </ul>
        </div>
      </div>`;
  }

  function renderLineSwitch(activeLine) {
    const lines = Object.values(window.STUDIO_PUBLIC_LINES || {}).sort((a, b) => a.order - b.order);
    const idx = lines.findIndex((l) => l.id === activeLine);
    return `
      <div class="studio-book-line-switch" data-line="${esc(activeLine || 'clinic')}" role="tablist" aria-label="Studio line">
        <div class="studio-book-line-track">
          <span class="studio-book-line-bubble" aria-hidden="true" style="--line-index: ${Math.max(0, idx)}"></span>
          ${lines.map((l) => `
            <button type="button" class="studio-book-line-btn${l.id === activeLine ? ' active' : ''}" data-book-line="${l.id}" role="tab">${esc(l.label)}</button>
          `).join('')}
        </div>
      </div>`;
  }

  function renderProgress() {
    return `<ol class="studio-book-progress" aria-label="Booking progress">${STEPS.map((s, i) => {
      const done = i < state.step;
      const active = i === state.step;
      return `<li class="${done ? 'done' : ''}${active ? ' active' : ''}"><span>${i + 1}</span>${esc(s.label)}</li>`;
    }).join('')}</ol>`;
  }

  function renderServiceStep() {
    if (!state.line) {
      const lines = Object.values(window.STUDIO_PUBLIC_LINES || {}).sort((a, b) => a.order - b.order);
      return `
        <div class="studio-book-step-head">
          <h3>What are you visiting for?</h3>
          <p>Choose Clinic for restoration &amp; extensions, Barber for grooming, or Salon for styling — then pick your service.</p>
        </div>
        <div class="studio-book-line-pick">
          ${lines.map((l) => `
            <button type="button" class="studio-book-line-card" data-book-line="${l.id}">
              <span class="studio-book-line-label">${esc(l.label)}</span>
              <span>${esc(l.headline)}</span>
              <small>${esc(l.summary)}</small>
            </button>`).join('')}
        </div>`;
    }

    if (needsGenderStep()) {
      const offerings = window.STUDIO_GENDER_OFFERINGS || {};
      return `
        ${renderLineSwitch(state.line)}
        <div class="studio-book-step-head">
          <button type="button" class="studio-book-back" data-book-back-line>← Change</button>
          <h3>Clinic — who is this for?</h3>
          <p>Men&apos;s hair systems and women&apos;s extension programs are tailored separately.</p>
        </div>
        <div class="studio-book-gender-pick">
          <button type="button" class="studio-book-gender-card" data-book-gender="men">
            <span class="studio-book-gender-label">${esc(offerings.men?.title || 'Men')}</span>
            <span>${esc(offerings.men?.headline || 'Hair systems')}</span>
            <small>${esc(offerings.men?.summary || '')}</small>
          </button>
          <button type="button" class="studio-book-gender-card" data-book-gender="women">
            <span class="studio-book-gender-label">${esc(offerings.women?.title || 'Women')}</span>
            <span>${esc(offerings.women?.headline || 'Butterfly Bar')}</span>
            <small>${esc(offerings.women?.summary || '')}</small>
          </button>
        </div>`;
    }

    const meta = lineMeta(state.line);
    const cats = RS().visibleCategoriesForLine(state.line, state.gender);
    const cat = state.category || defaultCategory();
    const gender = bookingGender();
    const isClinicalCat = cat === 'clinical';
    const isPackage = RS().isPackageCategory(cat);
    const families = (isPackage || isClinicalCat)
      ? RS().getProgramFamilies({ gender, category: cat })
      : [];
    const services = (isPackage && !isClinicalCat)
      ? []
      : publicBookableServices(gender, cat).filter((s) => !s.isPackage);

    const packageConsult = (isPackage || isClinicalCat) && isPackageConsultCategory(cat);
    const serviceStepTitle = packageConsult
      ? (cat === 'womens_extensions'
        ? `${meta.label} — choose your extension method`
        : cat === 'clinical'
          ? `${meta.label} — trichology consultation`
          : `${meta.label} — choose your program`)
      : `${meta.label} — what are you interested in?`;

    const showCategoryMonthly = RS().usesCategoryMonthlyFrom?.(cat);
    const categoryFrom = showCategoryMonthly ? categoryMonthlyFrom(cat) : null;

    const familyCards = families.map((grp) => {
      const visits = grp.services[0]?.appointmentsIncluded;
      const selected = state.familyBase === grp.base;
      const extBadge = grp.category === 'womens_extensions' ? RS().getExtensionFamilyBadge?.(grp.base) : null;
      const badges = [
        packageConsult ? '<span class="studio-book-badge studio-book-badge-consult">Consult first</span>' : '',
        extBadge ? `<span class="studio-book-badge studio-book-badge-feature">${esc(extBadge)}</span>` : '',
        !packageConsult && grp.featured ? '<span class="studio-book-badge studio-book-badge-feature">Popular</span>' : '',
      ].filter(Boolean).join('');
      return `
        <button type="button" class="studio-book-option studio-book-option-program${selected ? ' selected' : ''}${grp.featured ? ' featured' : ''}${badges ? ' has-badges' : ''}"
          data-book-family="${esc(grp.base)}" aria-expanded="${selected ? 'true' : 'false'}" aria-controls="studioBookProgramDetail">
          ${badges ? `<div class="studio-book-option-badges">${badges}</div>` : ''}
          <div class="studio-book-option-body">
            <strong class="studio-book-option-title">${esc(grp.base)}</strong>
            ${grp.tagline ? `<span class="studio-book-tag">${esc(grp.tagline)}</span>` : ''}
            <span class="studio-book-meta">${visits ? `${visits} visits · ${esc(RS().formatClientDuration(grp.services[0]))}` : esc(RS().formatClientDuration(grp.services[0]))}</span>
            <span class="studio-book-option-hint">${selected ? 'Details below' : 'Tap for what\u2019s included'}</span>
          </div>
        </button>`;
    }).join('');

    const serviceCards = services.map((svc) => {
      const isConsult = RS().resolvePublicBookingMode(svc) === 'consult';
      const from = isConsult
        ? { display: `From ${RS().formatPrice(svc.consultFromPrice || window.STUDIO_COLOR_CONSULT_FROM || svc.price)}` }
        : { display: RS().formatPrice(svc.price) };
      const selected = state.bookServiceId === svc.id || state.serviceId === svc.id;
      const badges = [
        isConsult ? '<span class="studio-book-badge studio-book-badge-consult">Color consult</span>' : '',
        svc.featured && !isConsult ? '<span class="studio-book-badge studio-book-badge-feature">Popular</span>' : '',
      ].filter(Boolean).join('');
      return `
        <button type="button" class="studio-book-option${selected ? ' selected' : ''}${svc.featured ? ' featured' : ''}${badges ? ' has-badges' : ''}"
          data-book-service="${svc.id}">
          ${badges ? `<div class="studio-book-option-badges">${badges}</div>` : ''}
          <div class="studio-book-option-body">
            <div class="studio-book-option-head">
              <strong>${esc(RS().shortName(svc.name))}</strong>
              <span class="studio-book-from">${esc(from.display || 'Complimentary')}</span>
            </div>
            <span class="studio-book-meta">${esc(RS().formatClientDuration(svc))}${isConsult ? ' · consultation' : ''}</span>
          </div>
        </button>`;
    }).join('');

    const hasSelection = state.familyBase || state.bookServiceId || state.serviceId;
    const backTarget = meta.usesGender ? 'gender' : 'line';
    const selectedFamily = state.familyBase
      ? families.find((f) => f.base === state.familyBase)
      : null;
    const programDetail = selectedFamily ? renderProgramFamilyDetail(selectedFamily) : '';
    const consultSummaryLabel = state.bookingMode === 'consult'
      ? (selectedFamily && packageConsult
        ? packageConsultLabel(cat)
        : (isBarberSalonLine() ? 'Color consultation' : 'Private consultation'))
      : '';

    return `
      ${renderLineSwitch(state.line)}
      <div class="studio-book-step-head">
        <button type="button" class="studio-book-back" data-book-back-${backTarget}>← Change</button>
        <h3>${esc(serviceStepTitle)}</h3>
        <p>${serviceStepLeadCopy(cat)}</p>
      </div>
      <div class="studio-book-cat-bar studio-book-cat-bar-public">
        ${cats.map((c) => `<button type="button" class="studio-book-cat${c.id === cat ? ' active' : ''}" data-book-category="${c.id}">${esc(c.label)}</button>`).join('')}
      </div>
      ${categoryFrom?.display ? `<p class="studio-book-category-from" role="status">${esc(categoryFrom.display)}</p>` : ''}
      ${isPackage && cat === 'womens_extensions' ? `<p class="studio-book-ext-lead"><strong>${esc(RS().getExtensionLeadFamily?.() || 'Butterfly Weft')}</strong> is our signature method on the Butterfly Bar. Your first online booking is always a <strong>consultation</strong>.</p>` : ''}
      <div class="studio-book-options">${isPackage ? familyCards : serviceCards}</div>
      ${programDetail}
      ${hasSelection ? `
        ${renderLuxAddonPicker()}
        <div class="studio-book-selection-summary">
          <div class="studio-book-selection-main">
            <span class="studio-book-selection-label">${selectedFamily && packageConsult ? 'Booking' : 'Selected'}</span>
            <strong class="studio-book-selection-name">${esc(state.intendedService)}</strong>
          </div>
          <div class="studio-book-selection-meta">
            ${state.fromPriceDisplay ? `<span class="studio-book-selection-price">${esc(state.fromPriceDisplay)}</span>` : ''}
            ${state.bookingMode === 'direct'
              ? '<span class="studio-book-selection-type">Direct service booking</span>'
              : consultSummaryLabel
                ? `<span class="studio-book-selection-type">${esc(consultSummaryLabel)}</span>`
                : ''}
          </div>
        </div>
        <button type="button" class="btn-primary btn-full studio-book-next" data-book-next>${selectedFamily && packageConsult ? 'Continue to book consultation' : 'Continue'}</button>
      ` : ''}`;
  }

  function renderScheduleStep() {
    const dates = RS().getPublicBookableDates(42);
    if (!state.date && dates.length) state.date = dates[0];
    const blockMins = state.schedulingDuration || state.duration;
    const availability = state.date ? RS().getPublicSlotAvailability(state.date, blockMins) : { display: [], totalAvailable: 0 };
    const slots = availability.display || [];
    const scarcity = availability.totalAvailable > slots.length;
    const isToday = state.date === RS().todayISO();
    if (state.time && !slots.some((s) => s.time === state.time)) {
      state.time = slots[0]?.time || '';
      state.column = slots[0]?.column || 1;
    } else if (!state.time && slots[0]) {
      state.time = slots[0].time;
      state.column = slots[0].column;
    }

    return `
      <div class="studio-book-step-head">
        <h3>Pick a date &amp; time</h3>
        <p>${scheduleStepLeadCopy()}</p>
        ${slots.length ? `<p class="studio-book-scarcity-hint">${isToday ? 'Same-day booking available — times start at least 1 hour from now.' : scarcity ? 'High demand — limited consultation times are released online each day.' : 'A few openings remain for this date.'}</p>` : isToday ? '<p class="studio-book-scarcity-hint">No same-day openings left online — choose a later date or call the studio.</p>' : ''}
      </div>
      <div class="studio-book-date-scroll">
        ${dates.map((d) => `
          <button type="button" class="studio-book-date${d === state.date ? ' selected' : ''}" data-book-date="${d}">
            <span>${fmtShortDate(d)}</span>
          </button>`).join('')}
      </div>
      <div class="studio-book-times">
        ${slots.length ? slots.map((slot) => `
          <button type="button" class="studio-book-time${slot.time === state.time ? ' selected' : ''}"
            data-book-time="${slot.time}" data-book-column="${slot.column}">${fmtTime12(slot.time)}</button>
        `).join('') : '<p class="studio-book-empty">Fully booked online for this day — try another date or call the studio.</p>'}
      </div>
      ${state.time ? `<button type="button" class="btn-primary btn-full studio-book-next" data-book-next>Continue</button>` : ''}`;
  }

  function renderBookingPreferencesFields() {
    const VF = window.StudioVisitFlow;
    const beverages = VF?.getArrivalBeverages?.() || [];
    const photos = state.inspoPhotos || [];
    return `
      <section class="studio-book-prefs">
        <h4>Help us prepare your visit</h4>
        <p class="studio-book-fine">Optional — inspiration and preferences so your chair is ready when you arrive.</p>
        <label class="form-field"><span>What you liked about past hair services</span>
          <textarea name="hairLikes" rows="2" placeholder="Cuts, color, stylists, products you loved…">${esc(state.hairLikes)}</textarea></label>
        <label class="form-field"><span>What you did not like</span>
          <textarea name="hairDislikes" rows="2" placeholder="Anything to avoid…">${esc(state.hairDislikes)}</textarea></label>
        <label class="form-field"><span>Prior hair services (last 12 months)</span>
          <textarea name="priorServices" rows="2" placeholder="Salon, barber, color, extensions…">${esc(state.priorServices)}</textarea></label>
        <label class="form-field"><span>21+ arrival beverage</span>
          <select name="beverage">
            ${beverages.map((b) => `<option value="${esc(b.id)}"${state.beverage === b.id ? ' selected' : ''}>${esc(b.label)}</option>`).join('')}
          </select></label>
        <label class="form-field studio-book-inspo-upload">
          <span>Inspiration photos</span>
          <input type="file" id="publicInspoPhotos" accept="image/*" multiple>
          <small>Up to 6 reference photos.</small>
        </label>
        ${photos.length ? `<div class="studio-book-inspo-preview">${photos.map((p) => `<img src="${p.dataUrl}" alt="${esc(p.name || 'Inspo')}">`).join('')}</div>` : ''}
      </section>`;
  }

  function renderDetailsStep() {
    checkReturningClient();
    const pay = bookingPaymentInfo();
    return `
      <div class="studio-book-step-head">
        <h3>Your contact details</h3>
        <p>We&apos;ll send confirmation to your email and text reminders to your phone.</p>
      </div>
      ${renderReturningBanner()}
      ${renderAttendancePenaltyBanner()}
      <form class="studio-book-form" id="studioBookDetailsForm">
        <label class="form-field"><span>Full name *</span><input type="text" name="name" required value="${esc(state.name)}"></label>
        <label class="form-field"><span>Email *</span><input type="email" name="email" required value="${esc(state.email)}"></label>
        <label class="form-field"><span>Phone *</span><input type="tel" name="phone" required value="${esc(state.phone)}"></label>
        ${renderBookingPreferencesFields()}
        <label class="form-field"><span>Other notes (optional)</span><textarea name="notes" rows="2" placeholder="Anything else we should know?">${esc(state.notes)}</textarea></label>
        <button type="submit" class="btn-primary btn-full">${pay.requiresFullPrice ? 'Continue to payment' : 'Continue to scheduling fee'}</button>
      </form>`;
  }

  function renderPayStep() {
    const pay = bookingPaymentInfo();
    const dueToday = pay.amount;
    const requiresFullPrice = pay.requiresFullPrice;
    checkReturningClient();
    return `
      <div class="studio-book-step-head">
        <h3>Secure your appointment</h3>
        ${requiresFullPrice
          ? `<p>Full <strong>service price</strong> is required today because of a recent no-show or late cancellation. If you cancel, you receive at most a <strong>50% refund</strong> — we retain <strong>$29 or half your payment, whichever is greater</strong>.</p>`
          : `<p>A non-refundable <strong>$${RS().SCHEDULING_FEE} scheduling fee</strong> reserves your time and is applied as credit toward any Onyx Studios service.</p>`}
      </div>
      ${renderReturningBanner()}
      ${renderAttendancePenaltyBanner()}
      <div class="studio-book-summary-card">
        <div class="studio-book-summary-row"><span>${isPackageConsultCategory(state.category) && state.bookingMode === 'consult' ? 'Consultation for' : 'Service'}</span><strong>${esc(state.intendedService)}</strong></div>
        ${state.fromPriceDisplay && !requiresFullPrice ? `<div class="studio-book-summary-row"><span>Program from</span><strong>${esc(state.fromPriceDisplay)}</strong></div>` : ''}
        <div class="studio-book-summary-row"><span>Date</span><strong>${esc(fmtDate(state.date))}</strong></div>
        <div class="studio-book-summary-row"><span>Time</span><strong>${esc(fmtTime12(state.time))}</strong></div>
        <div class="studio-book-summary-row studio-book-summary-total"><span>Due today</span><strong>${RS().formatPrice(dueToday)}</strong></div>
      </div>
      <form class="studio-book-form" id="studioBookPayForm">
        <label class="form-field"><span>Name on card *</span><input type="text" name="cardName" required autocomplete="cc-name"></label>
        <label class="form-field"><span>Card number *</span><input type="text" name="cardNumber" required inputmode="numeric" placeholder="4242 4242 4242 4242" autocomplete="cc-number"></label>
        <div class="studio-book-card-row">
          <label class="form-field"><span>Expiry *</span><input type="text" name="cardExpiry" required placeholder="MM/YY" autocomplete="cc-exp"></label>
          <label class="form-field"><span>CVC *</span><input type="text" name="cardCvc" required inputmode="numeric" autocomplete="cc-csc"></label>
        </div>
        <p class="studio-book-fee-note">${requiresFullPrice
          ? 'By paying today, you agree to the attendance policy: cancellations refund at most 50%, and we retain $29 or half your payment, whichever is greater.'
          : 'By paying the scheduling fee, you agree it is non-refundable and will be credited toward any service or program you choose at your visit.'}</p>
        <button type="submit" class="btn-primary btn-full" id="studioBookPayBtn">Pay ${RS().formatPrice(dueToday)} &amp; confirm</button>
      </form>`;
  }

  function renderConfirm() {
    const appt = state.confirmed?.appointment;
    const portalCode = state.confirmed?.portalCode || '';
    const isReturning = state.confirmed?.isReturning;
    const needsPw = state.confirmed?.needsPortalPassword !== false;
    if (!appt) return '';
    const firstName = state.name?.split(' ')[0] || 'there';
    return `
      <div class="studio-book-confirm">
        <div class="studio-book-confirm-icon" aria-hidden="true">✓</div>
        <h3>${esc(consultConfirmTitle(state.confirmed?.bookingMode, state.category, state.line))}</h3>
        ${isReturning ? `
          <div class="studio-returning-banner">
            <strong>Hi there again, ${esc(firstName)}!</strong>
            <p>Thanks for returning — we&apos;re glad to see you again. Your visit is confirmed below.</p>
          </div>
        ` : state.confirmed?.requiresFullPrice
          ? `<p>Confirmation sent to <strong>${esc(state.email)}</strong>. Your ${RS().formatPrice(state.confirmed?.prepaidAmount || 0)} prepayment is on file — canceling refunds at most 50% (we retain $29 or half, whichever is greater).</p>`
          : `<p>Confirmation sent to <strong>${esc(state.email)}</strong>. Your $${RS().SCHEDULING_FEE} scheduling fee has been applied as studio credit.</p>`}
        <div class="studio-book-summary-card">
          <div class="studio-book-summary-row"><span>Visit type</span><strong>${state.confirmed?.bookingMode === 'direct'
            ? esc(appt.serviceName || state.intendedService)
            : esc(RS().resolvePublicConsultLabel?.(appt.intendedService || state.intendedService, {
              line: state.line,
              category: state.category,
            }) || 'Consultation')}</strong></div>
          ${appt.intendedService ? `<div class="studio-book-summary-row"><span>Interest</span><strong>${esc(appt.intendedService)}</strong></div>` : ''}
          <div class="studio-book-summary-row"><span>When</span><strong>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</strong></div>
          <div class="studio-book-summary-row"><span>Reference</span><strong>${esc(appt.id)}</strong></div>
        </div>
        ${portalCode ? `
          <div class="studio-portal-access-card">
            <p><strong>Your client portal access code</strong></p>
            <p class="studio-portal-access-code">${esc(portalCode)}</p>
            <p class="studio-book-fine">Save this code. Sign in with your phone, email, and this code — or optionally add a password later from the portal.</p>
            ${needsPw ? `
              <button type="button" class="btn-primary btn-full" data-book-portal-setup-now>Set up my portal now</button>
              <p class="studio-book-fine">Optional — you can also do this later from the Portal tab.</p>
            ` : ''}
          </div>
        ` : ''}
        <p class="studio-book-fine">Reschedules and cancellations more than 48 hours out are free in the portal. Within 48 hours, a $${RS().RESCHEDULE_POLICY?.lateFee || 50} fee applies.</p>

      </div>`;
  }

  function render() {
    const root = $('#studioBookRoot');
    if (!root) return;

    if (state.confirmed) {
      root.innerHTML = renderConfirm();
      return;
    }

    const stepRenderers = [renderServiceStep, renderScheduleStep, renderDetailsStep, renderPayStep];
    const body = stepRenderers[state.step]?.() || '';

    root.innerHTML = `
      ${renderProgress()}
      ${state.error ? `<div class="studio-book-error" role="alert">${esc(state.error)}</div>` : ''}
      ${body}
      ${state.step > 0 ? `<button type="button" class="studio-book-back-link" data-book-prev>← Back</button>` : ''}`;
  }

  function selectLine(line) {
    state.line = line;
    state.gender = lineMeta(line).usesGender ? null : null;
    state.category = defaultCategory();
    state.familyBase = '';
    state.serviceId = '';
    state.intendedService = '';
    state.fromPriceDisplay = '';
    state.error = '';
    if (window.setStudioLine) window.setStudioLine(line, { skipBooking: true, skipScroll: true });
    requestAnimationFrame(() => {
      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function bind() {
    const root = $('#studioBookRoot');
    if (!root) return;

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-book-portal-setup]') || e.target.closest('[data-book-portal-setup-now]')) {
        window.studioPortalOpen?.({
          phone: state.phone,
          email: state.email,
          code: state.confirmed?.portalCode || '',
          setup: true,
        });
        return;
      }

      if (e.target.closest('[data-book-portal-login]')) {
        window.studioPortalOpen?.({
          phone: state.phone,
          email: state.email,
          login: true,
          password: !!state.returningClient?.portalPasswordHash,
        });
        return;
      }

      const lineBtn = e.target.closest('[data-book-line]');
      if (lineBtn) {
        selectLine(lineBtn.dataset.bookLine);
        render();
        return;
      }

      const genderBtn = e.target.closest('[data-book-gender]');
      if (genderBtn) {
        state.gender = genderBtn.dataset.bookGender;
        state.category = defaultCategory();
        state.familyBase = '';
        state.serviceId = '';
        state.intendedService = '';
        state.fromPriceDisplay = '';
        state.error = '';
        render();
        return;
      }

      if (e.target.closest('[data-book-back-line]')) {
        state.line = null;
        state.gender = null;
        state.category = null;
        state.familyBase = '';
        state.serviceId = '';
        render();
        return;
      }

      if (e.target.closest('[data-book-back-gender]')) {
        state.gender = null;
        state.category = defaultCategory();
        state.familyBase = '';
        state.serviceId = '';
        render();
        return;
      }

      const catBtn = e.target.closest('[data-book-category]');
      if (catBtn) {
        state.category = catBtn.dataset.bookCategory;
        state.familyBase = '';
        state.serviceId = '';
        state.intendedService = '';
        state.fromPriceDisplay = '';
        render();
        return;
      }

      const familyBtn = e.target.closest('[data-book-family]');
      if (familyBtn) {
        const base = familyBtn.dataset.bookFamily;
        const cat = state.category || defaultCategory();
        const families = RS().getProgramFamilies({ gender: bookingGender(), category: cat });
        const family = families.find((f) => f.base === base);
        if (family) selectFamily(family);
        render();
        requestAnimationFrame(() => {
          document.getElementById('studioBookProgramDetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        return;
      }

      const svcBtn = e.target.closest('[data-book-service]');
      if (svcBtn) {
        const svc = RS().getService(svcBtn.dataset.bookService);
        if (svc) selectService(svc);
        render();
        return;
      }

      const dateBtn = e.target.closest('[data-book-date]');
      if (dateBtn) {
        state.date = dateBtn.dataset.bookDate;
        state.time = '';
        state.error = '';
        render();
        return;
      }

      const timeBtn = e.target.closest('[data-book-time]');
      if (timeBtn) {
        state.time = timeBtn.dataset.bookTime;
        state.column = Number(timeBtn.dataset.bookColumn) || 1;
        state.error = '';
        render();
        return;
      }

      if (e.target.closest('[data-book-next]')) {
        if (state.step === 0 && (state.familyBase || state.serviceId)) {
          state.step = 1;
          state.error = '';
          render();
        } else if (state.step === 1 && state.time) {
          state.step = 2;
          state.error = '';
          render();
        }
        return;
      }

      if (e.target.closest('[data-book-prev]')) {
        if (state.step > 0) {
          state.step -= 1;
          state.error = '';
          render();
        }
      }
    });

    root.addEventListener('change', async (e) => {
      const lux = e.target.closest('[data-book-lux-addon]');
      if (lux) {
        syncLuxAddon(lux.dataset.bookLuxAddon, lux.checked);
        render();
        return;
      }
      if (e.target.id === 'publicInspoPhotos') {
        const RSapi = RS();
        if (!RSapi?.compressImageFile || !e.target.files?.length) return;
        const room = Math.max(0, 6 - (state.inspoPhotos || []).length);
        for (const file of [...e.target.files].slice(0, room)) {
          try {
            const compressed = await RSapi.compressImageFile(file);
            state.inspoPhotos.push({
              id: `inspo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              dataUrl: compressed.dataUrl,
              addedAt: new Date().toISOString(),
            });
          } catch (_) { /* skip */ }
        }
        e.target.value = '';
        render();
      }
    });

    root.addEventListener('submit', (e) => {
      if (e.target.id === 'studioBookDetailsForm') {
        e.preventDefault();
        const fd = new FormData(e.target);
        state.name = String(fd.get('name') || '').trim();
        state.email = String(fd.get('email') || '').trim();
        state.phone = String(fd.get('phone') || '').trim();
        state.notes = String(fd.get('notes') || '').trim();
        state.hairLikes = String(fd.get('hairLikes') || '').trim();
        state.hairDislikes = String(fd.get('hairDislikes') || '').trim();
        state.priorServices = String(fd.get('priorServices') || '').trim();
        state.beverage = String(fd.get('beverage') || '').trim();
        if (!state.name || !state.email || !state.phone) {
          state.error = 'Please fill in all required fields.';
          render();
          return;
        }
        checkReturningClient();
        state.step = 3;
        state.error = '';
        render();
        return;
      }

      if (e.target.id === 'studioBookPayForm') {
        e.preventDefault();
        const btn = $('#studioBookPayBtn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Processing…';
        }
        state.error = '';

        const lineLabel = lineMeta(state.line).label || state.line;
        const VF = window.StudioVisitFlow;
        const prefs = VF?.buildClientPreferences?.({
          hairLikes: state.hairLikes,
          hairDislikes: state.hairDislikes,
          priorServices: state.priorServices,
          beverage: state.beverage,
          inspoPhotos: state.inspoPhotos,
        });
        const result = RS().createPublicBooking({
          clientName: state.name,
          clientEmail: state.email,
          clientPhone: state.phone,
          gender: bookingGender(),
          line: state.line,
          category: state.category,
          familyBase: state.familyBase,
          serviceId: state.serviceId,
          bookServiceId: state.bookServiceId || state.serviceId,
          bookingMode: state.bookingMode,
          luxAddons: state.luxAddons,
          serviceLabel: state.intendedService,
          intendedService: state.intendedService,
          fromPriceDisplay: state.fromPriceDisplay,
          date: state.date,
          startTime: state.time,
          column: state.column,
          duration: state.duration,
          schedulingDuration: state.schedulingDuration || state.duration,
          clientPreferences: prefs,
          bookingInspoPhotos: prefs?.inspoPhotos || [],
          notes: [state.notes, state.line ? `Line: ${lineLabel}` : ''].filter(Boolean).join('\n'),
        });

        if (result?.error) {
          state.error = result.error;
          if (btn) {
            btn.disabled = false;
            const pay = bookingPaymentInfo();
            btn.textContent = `Pay ${RS().formatPrice(pay.amount)} & confirm`;
          }
          render();
          return;
        }

        state.confirmed = {
          ...result,
          portalCode: result?.portalCode || '',
          bookingMode: result?.bookingMode || state.bookingMode,
          category: state.category,
          line: state.line,
        };
        render();
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function init() {
    if (!window.RenvoaStudios) return;
    const root = $('#studioBookRoot');
    if (!root) return;
    initBookingFromPage();
    render();
    applyBookingDeepLink();
    render();
    bind();
    root.addEventListener('input', (e) => {
      if (e.target.closest('#studioBookDetailsForm')) {
        const form = $('#studioBookDetailsForm');
        if (!form) return;
        state.phone = String(form.querySelector('[name="phone"]')?.value || '').trim();
        state.email = String(form.querySelector('[name="email"]')?.value || '').trim();
        checkReturningClient();
        const banner = root.querySelector('.studio-returning-banner');
        const next = renderReturningBanner();
        if (banner && next) banner.outerHTML = next;
        else if (!banner && next && form) form.insertAdjacentHTML('beforebegin', next);
        else if (banner && !next) banner.remove();
      }
    });

    window.addEventListener('studio-line-change', (e) => {
      const line = e.detail?.line;
      if (line && line !== 'portal' && state.step === 0 && !state.confirmed) applyExternalLine(line);
    });
    if ((state.line || state.gender) && window.location.hash.startsWith('#book')) {
      $('#book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.studioBookingApplyLine = applyExternalLine;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();