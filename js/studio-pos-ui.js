window.RenvoaStudioUI = (function () {
  'use strict';

  const S = () => window.RenvoaStudios;
  const META = () => window.STUDIO_META || {};
  const CATS = () => window.STUDIO_CATEGORIES || {};

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function fmtTime12(time) {
    return S()?.formatTime12(time) || time || '';
  }

  const BOOK_WIZARD_STEPS = [
    { id: 'when', label: 'When' },
    { id: 'client', label: 'Who' },
    { id: 'service', label: 'What' },
    { id: 'confirm', label: 'Review' },
  ];

  function flashBanner(msg, type) {
    if (!msg) return '';
    return `<div class="studio-flash studio-flash-${type || 'info'}">${esc(msg)}</div>`;
  }

  function firstVisitBadge(clientId, phone) {
    if (!S()?.isFirstTimeClient(clientId, phone)) return '';
    return '<span class="studio-first-visit-badge">First visit</span>';
  }

  function intakeSkippedBadge(appt) {
    if (!window.StudioVisitFlow?.intakeSkippedBadge(appt)) return '';
    return window.StudioVisitFlow.intakeSkippedTriangle();
  }

  function allergyAlertBadge(appt) {
    if (!S()?.clientHasAllergies(appt?.clientId, appt?.clientPhone, appt)) return '';
    return `<button type="button" class="studio-allergy-badge" data-view-allergies="${esc(appt.id)}" title="View allergies" aria-label="View allergies">⚠</button>`;
  }

  function packageVisitBadge(appt) {
    if (!appt?.packageVisit) return '';
    const label = S().getPackageVisitLabel(appt);
    return `<span class="studio-cal-pkg-badge" title="${esc(appt.programName || 'Prepaid visit')}">${esc(label)}</span>`;
  }

  function onlineBookingBadge(appt) {
    if (!S()?.isOnlineBookingSource?.(appt?.source)) return '';
    const label = S().getOnlineBookingSourceLabel(appt.source) || 'Online';
    return `<span class="studio-cal-online-badge" title="${esc(label)} booking">${esc(label === 'Client portal' ? 'Portal' : label)}</span>`;
  }

  function bookingPrepBadge(appt) {
    if (!S()?.appointmentHasBookingPrep?.(appt)) return '';
    const photoCount = S().getAppointmentInspoPhotos(appt).length;
    const title = photoCount ? `${photoCount} inspo photo${photoCount !== 1 ? 's' : ''} & preferences` : 'Client shared preferences';
    return `<span class="studio-cal-prep-badge" title="${esc(title)}">📷</span>`;
  }

  function renderBookingInspoThumb(photo) {
    if (!photo?.dataUrl) return '';
    return `
      <a href="${esc(photo.dataUrl)}" target="_blank" rel="noopener" class="studio-book-inspo-thumb" title="${esc(photo.name || 'Inspiration photo')}">
        <img src="${esc(photo.dataUrl)}" alt="${esc(photo.name || 'Inspiration')}" loading="lazy">
      </a>`;
  }

  function renderAppointmentBookingPrepPanel(appt) {
    if (!appt) return '';
    const prefs = appt.clientPreferences || {};
    const photos = S().getAppointmentInspoPhotos(appt);
    const hasPrefs = !!String(prefs.hairLikes || '').trim()
      || !!String(prefs.hairDislikes || '').trim()
      || !!String(prefs.priorServices || '').trim()
      || !!String(prefs.beverageLabel || '').trim();
    const isOnline = S().isOnlineBookingSource(appt.source);
    const needsContact = isOnline && !appt.bookingReviewedAt && appt.status === 'scheduled';
    if (!photos.length && !hasPrefs && !isOnline) return '';

    const sourceLabel = S().getOnlineBookingSourceLabel(appt.source);
    const contactBits = [
      appt.clientPhone ? `<a href="tel:${esc(appt.clientPhone.replace(/\D/g, ''))}" class="studio-appt-contact-link">${esc(appt.clientPhone)}</a>` : '',
      appt.clientEmail ? `<a href="mailto:${esc(appt.clientEmail)}" class="studio-appt-contact-link">${esc(appt.clientEmail)}</a>` : '',
    ].filter(Boolean);

    return `
      <div class="studio-appt-booking-prep${needsContact ? ' studio-appt-booking-prep--new' : ''}">
        <div class="studio-appt-booking-prep-head">
          <div>
            <span class="studio-appt-booking-prep-eyebrow">${needsContact ? 'New online booking' : 'Booking details from client'}</span>
            <strong>${sourceLabel ? `${esc(sourceLabel)} · ` : ''}${needsContact ? 'Contact before visit' : 'Shared at booking'}</strong>
          </div>
          ${needsContact ? `<button type="button" class="btn-secondary btn-sm" data-mark-booking-reviewed="${esc(appt.id)}">Mark contacted</button>` : ''}
        </div>
        ${needsContact && contactBits.length ? `<p class="studio-appt-booking-contact">${contactBits.join(' · ')}</p>` : ''}
        ${hasPrefs ? `
          <div class="studio-appt-booking-prefs">
            ${prefs.hairLikes ? `<div class="studio-appt-booking-pref"><span>Likes</span><p>${esc(prefs.hairLikes)}</p></div>` : ''}
            ${prefs.hairDislikes ? `<div class="studio-appt-booking-pref"><span>Avoid</span><p>${esc(prefs.hairDislikes)}</p></div>` : ''}
            ${prefs.priorServices ? `<div class="studio-appt-booking-pref"><span>Prior services</span><p>${esc(prefs.priorServices)}</p></div>` : ''}
            ${prefs.beverageLabel ? `<div class="studio-appt-booking-pref"><span>21+ beverage</span><p>${esc(prefs.beverageLabel)}</p></div>` : ''}
          </div>` : ''}
        ${photos.length ? `
          <div class="studio-appt-booking-photos">
            <span class="studio-appt-booking-photos-label">Inspiration photos (${photos.length})</span>
            <div class="studio-book-inspo-preview studio-book-inspo-preview--appt">
              ${photos.map((p) => renderBookingInspoThumb(p)).join('')}
            </div>
          </div>` : ''}
      </div>`;
  }

  function renderDashboardOnlineBookingItem(appt) {
    const photos = S().getAppointmentInspoPhotos(appt);
    const prefs = appt.clientPreferences || {};
    const sourceLabel = S().getOnlineBookingSourceLabel(appt.source) || 'Online';
    const contact = [appt.clientPhone, appt.clientEmail].filter(Boolean).join(' · ');
    const prefBits = [
      photos.length ? `${photos.length} photo${photos.length !== 1 ? 's' : ''}` : '',
      prefs.hairLikes ? 'likes noted' : '',
      prefs.hairDislikes ? 'avoid list' : '',
      prefs.priorServices ? 'prior services' : '',
      prefs.beverageLabel || '',
    ].filter(Boolean);
    return `
      <li class="studio-timeline-click studio-online-booking-item" data-studio-appt-dash="${esc(appt.id)}">
        <span class="studio-online-booking-tag">${esc(sourceLabel)}</span>
        <div>
          <strong>${esc(appt.clientName)}${firstVisitBadge(appt.clientId, appt.clientPhone)}</strong>
          <span>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))} · ${esc(appt.serviceName)}${contact ? ` · ${esc(contact)}` : ''}</span>
          ${prefBits.length ? `<small>${esc(prefBits.join(' · '))}</small>` : ''}
        </div>
        <span class="studio-online-booking-action">Review →</span>
      </li>`;
  }

  function renderPackageVisitBanner(appt) {
    if (!appt?.packageVisit) return '';
    const checkout = S().getAppointmentCheckoutDisplay(appt);
    const redeemedLine = appt.packageVisitRedeemedAt
      ? `<small>Redeemed ${esc(formatVisitRedeemedAt(appt.packageVisitRedeemedAt))}</small>`
      : '';
    return `
      <div class="studio-package-visit-banner">
        <span>Prepaid program visit</span>
        <strong>${esc(appt.programName || appt.serviceName)}</strong>
        <p>${esc(S().getPackageVisitLabel(appt))}${appt.programPaymentPlan ? ` · ${esc(appt.programPaymentPlan)}` : ''} · ${checkout.label}</p>
        ${checkout.visitValue ? `<small>Visit value ${S().formatPrice(checkout.visitValue)} — no charge at checkout</small>` : '<small>No charge at checkout — visit prepaid</small>'}
        ${redeemedLine}
      </div>`;
  }

  function renderClientProgramHints(clientId) {
    if (!clientId) return '';
    const summary = S().getClientProgramSummary(clientId);
    const active = (summary.programs || []).filter((p) => S().isProgramEnrollmentActive(p));
    if (!active.length) return '';
    return `
      <div class="studio-book-program-hints">
        ${active.map((p) => `
          <p class="studio-glass-hint studio-glass-hint-credit">
            <strong>${esc(p.programName)}</strong> — ${p.visitsRemaining} prepaid visit${p.visitsRemaining !== 1 ? 's' : ''} remaining (${p.visitsUsed}/${p.visitsIncluded} used)
          </p>`).join('')}
      </div>`;
  }

  function formatVisitRedeemedAt(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function renderPosProgramVisitPanel(clientId, cartItems) {
    if (!clientId) return '';
    const summary = S().getClientProgramSummary(clientId);
    const programs = summary.programs || [];
    if (!programs.length) return '';
    const pkgInCart = (cartItems || []).filter((i) => i.packageVisit);
    const retailDue = (cartItems || []).filter(
      (i) => i.postVisitServiceLine && (i.price || 0) > 0 && !i.packageVisit,
    );
    const balanceDue = retailDue.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0);
    const history = S().getProgramVisitHistory(clientId).slice(0, 5);
    return `
      <div class="studio-pos-program-panel">
        <p class="studio-pos-program-panel-title">Program visits</p>
        ${balanceDue > 0 ? `
          <p class="studio-pos-program-balance-due">
            <strong>Balance due: ${S().formatPrice(balanceDue)}</strong>
            <small>Apply package visit to zero out today&apos;s visit</small>
          </p>` : ''}
        ${programs.map((p) => `
          <div class="studio-pos-program-row${!S().isProgramEnrollmentActive(p) || p.voided || p.refunded ? ' is-inactive' : ''}">
            <div class="studio-pos-program-row-head">
              <strong>${esc(p.programName)}</strong>
              ${renderProgramEnrollmentBadge(p)}
            </div>
            <span>${p.visitsUsed}/${p.visitsIncluded} used · ${p.visitsScheduled} scheduled · <em>${p.visitsRemaining} left</em></span>
            ${p.visitValue ? `<small>${S().formatPrice(p.visitValue)} per visit value</small>` : ''}
            ${renderProgramVisitBar(p.visitsUsed + (p.visitsScheduled || 0), p.visitsIncluded)}
          </div>`).join('')}
        ${pkgInCart.length ? `
          <div class="studio-pos-program-redeem">
            <span>Redeeming now</span>
            ${pkgInCart.map((item) => `
              <strong>Visit ${item.visitNumber} of ${item.visitsIncluded}</strong>
              <small>${esc(item.programName || item.name)} · ${S().formatPrice(0)} at register${item.originalRetailPrice ? ` · was ${S().formatPrice(item.originalRetailPrice)}` : ''}${item.visitsUsed != null ? ` · ${item.visitsUsed} used before this` : ''}</small>
            `).join('')}
          </div>` : ''}
        ${history.length ? `
          <div class="studio-pos-program-history">
            <span>Recent visits used</span>
            <ul>
              ${history.map((h) => `
                <li>
                  <strong>Visit ${h.visitNumber}/${h.visitsIncluded}</strong> · ${esc(h.programName || '')}
                  <small>${formatVisitRedeemedAt(h.redeemedAt)}${h.visitDate ? ` · appt ${esc(h.visitDate)}` : ''}</small>
                </li>`).join('')}
            </ul>
          </div>` : ''}
      </div>`;
  }

  function clientProgramLine(clientId) {
    const summary = S().getClientProgramSummary(clientId);
    const activePrograms = (summary.programs || []).filter((p) => S().isProgramEnrollmentActive(p));
    const displayPrograms = activePrograms.length ? activePrograms : summary.programs;
    if (displayPrograms.length) {
      const p = activePrograms[0] || displayPrograms[displayPrograms.length - 1];
      const visits = p.visitsIncluded
        ? ` · ${p.visitsUsed}/${p.visitsIncluded} used${p.visitsScheduled ? ` · ${p.visitsScheduled} scheduled` : ''}`
        : '';
      const warranty = p.warranty?.needsReinstatement ? ' · warranty lapsed' : (p.warranty?.status === 'grace' ? ' · warranty grace' : '');
      const inactiveNote = !S().isProgramEnrollmentActive(p) ? ` · ${p.enrollmentLabel || 'Inactive'}` : '';
      return esc(p.programName) + visits + warranty + inactiveNote;
    }
    if (summary.consultFor) {
      return `Consult for — ${esc(summary.consultFor.programName)}`;
    }
    return 'No program on file';
  }

  function renderClientStats(stats) {
    if (!stats) return '';
    const credit = stats.creditBalance || 0;
    return `
      <div class="studio-client-stats">
        <div class="studio-client-stat${credit > 0 ? ' studio-client-stat-credit' : ''}"><span>Studio credit</span><strong>${S().formatPrice(credit)}</strong></div>
        <div class="studio-client-stat"><span>Visits</span><strong>${stats.totalVisits || 0}</strong></div>
        <div class="studio-client-stat"><span>Lifetime spend</span><strong>${S().formatPrice(stats.lifetimeSpend || 0)}</strong></div>
        <div class="studio-client-stat"><span>Upcoming</span><strong>${stats.upcomingCount || 0}</strong></div>
        <div class="studio-client-stat"><span>Member since</span><strong>${stats.memberSince ? fmtDate(stats.memberSince) : '—'}</strong></div>
      </div>`;
  }

  function renderClientCreditLedger(entries) {
    if (!entries?.length) return '';
    const labels = {
      scheduling_deposit: 'Deposit paid',
      deposit: 'Credit added',
      applied: 'Credit applied',
      manual_add: 'Credit added',
      manual_remove: 'Credit removed',
    };
    return `
      <section class="studio-client-credit-section">
        <h3>Studio credit</h3>
        <ul class="studio-client-credit-ledger">
          ${entries.slice(0, 8).map((e) => `
            <li class="studio-client-credit-entry${e.amount < 0 ? ' is-applied' : ' is-deposit'}">
              <div>
                <strong>${labels[e.type] || 'Adjustment'}</strong>
                <span>${new Date(e.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <em>${e.amount < 0 ? '−' : '+'}${S().formatPrice(Math.abs(e.amount))}</em>
              ${e.notes ? `<small>${esc(e.notes)}</small>` : ''}
            </li>`).join('')}
        </ul>
      </section>`;
  }

  function warrantyStatusClass(status) {
    const map = {
      active: 'is-active',
      grace: 'is-grace',
      lapsed: 'is-lapsed',
      waived: 'is-waived',
      voided: 'is-voided',
    };
    return map[status] || '';
  }

  function renderWarrantyStatusBadge(warranty) {
    if (!warranty?.applies) return '';
    return `<span class="studio-warranty-badge ${warrantyStatusClass(warranty.status)}">${esc(warranty.label)}</span>`;
  }

  function programEnrollmentStatusClass(status) {
    const map = {
      active: 'is-active',
      voided: 'is-voided',
      refunded: 'is-refunded',
      partial_refund: 'is-partial-refund',
      completed: 'is-completed',
    };
    return map[status] || '';
  }

  function renderProgramEnrollmentBadge(program) {
    if (!program?.enrollmentLabel) return '';
    return `<span class="studio-program-status-badge ${programEnrollmentStatusClass(program.enrollmentStatus)}">${esc(program.enrollmentLabel)}</span>`;
  }

  function renderWarrantyDetailBlock(warranty, compact) {
    if (!warranty?.applies) return '';
    return `
      <div class="studio-warranty-detail${compact ? ' is-compact' : ''}">
        <div class="studio-warranty-detail-head">
          ${renderWarrantyStatusBadge(warranty)}
          <span class="studio-warranty-detail-summary">${esc(warranty.statusDetail || '')}</span>
        </div>
        <dl class="studio-warranty-meta">
          <div><dt>Anchor</dt><dd>${esc(warranty.anchorLabel || '—')} · ${fmtDate(warranty.anchorDate)}</dd></div>
          <div><dt>Due by</dt><dd>${fmtDate(warranty.recommendedByDate)}</dd></div>
          <div><dt>Grace ends</dt><dd>${fmtDate(warranty.graceDeadline)}</dd></div>
          ${warranty.needsReinstatement ? `<div><dt>Reinstate</dt><dd>${S().formatPrice(warranty.reinstatementFee)}</dd></div>` : ''}
        </dl>
        ${warranty.lastReinstatement ? `<p class="studio-warranty-last">Last reinstated ${formatVisitRedeemedAt(warranty.lastReinstatement.redeemedAt)} · ${S().formatPrice(warranty.lastReinstatement.amount || 0)}</p>` : ''}
      </div>`;
  }

  function renderWarrantyHistoryList(history, limit = 5) {
    if (!history?.length) return '';
    return `
      <div class="studio-warranty-history">
        <span>Reinstatement history</span>
        <ul>
          ${history.slice(0, limit).map((h) => `
            <li>
              <strong>${S().formatPrice(h.amount || 0)}</strong> · ${esc(h.programName || '')}
              <small>${formatVisitRedeemedAt(h.redeemedAt)}${h.daysLate ? ` · ${h.daysLate} days late` : ''}</small>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  function renderPosWarrantyPanel(clientId, cartItems) {
    if (!clientId) return '';
    const summary = S().getClientWarrantySummary(clientId);
    const programs = summary.programs || [];
    if (!programs.length) return '';
    const reinstateInCart = (cartItems || []).filter((i) => i.warrantyReinstatement);
    const lapsed = programs.filter((p) => p.warranty?.needsReinstatement);
    return `
      <div class="studio-pos-warranty-panel">
        <p class="studio-pos-warranty-panel-title">Hair warranty</p>
        ${programs.map((p) => `
          <div class="studio-pos-warranty-row${p.warranty?.needsReinstatement ? ' needs-reinstate' : ''}">
            <div class="studio-pos-warranty-row-head">
              <strong>${esc(p.programName)}</strong>
              ${renderWarrantyStatusBadge(p.warranty)}
            </div>
            <span>${esc(p.warranty?.statusDetail || '')}</span>
            ${p.warranty?.applies ? `<small>Due ${fmtDate(p.warranty.recommendedByDate)} · grace until ${fmtDate(p.warranty.graceDeadline)}</small>` : ''}
            ${p.warranty?.needsReinstatement && !reinstateInCart.some((i) => i.programId === p.id)
              ? `<button type="button" class="btn-secondary btn-sm studio-pos-warranty-add" data-pos-warranty-reinstate="${esc(p.id)}">Add ${S().formatPrice(p.warranty.reinstatementFee)} reinstatement</button>`
              : ''}
          </div>`).join('')}
        ${reinstateInCart.length ? `
          <div class="studio-pos-warranty-redeem">
            <span>Charging now</span>
            ${reinstateInCart.map((item) => `
              <strong>${esc(item.name)}</strong>
              <small>${S().formatPrice(item.price)} at register</small>
            `).join('')}
          </div>` : ''}
        ${renderWarrantyHistoryList(summary.history, 3)}
      </div>`;
  }

  function renderProgramVisitBar(used, total) {
    if (!total) return '';
    const pct = Math.min(100, Math.round((used / total) * 100));
    return `
      <div class="studio-program-visits">
        <div class="studio-program-visits-head">
          <span>Visits used</span>
          <strong>${used} of ${total}</strong>
        </div>
        <div class="studio-program-visits-bar"><span style="width:${pct}%"></span></div>
      </div>`;
  }

  function renderClientProgramSection(summary) {
    if (summary.programs.length) {
      return `
        <section class="studio-client-program-section">
          <h3>Programs</h3>
          <div class="studio-client-program-list">
            ${summary.programs.map((p) => `
              <article class="studio-client-program-card${p.voided || p.refunded ? ' is-inactive' : ''}">
                <div class="studio-client-program-head">
                  <div>
                    <strong>${esc(p.programName)}</strong>
                    ${p.tagline ? `<p class="studio-client-program-tag">${esc(p.tagline)}</p>` : ''}
                  </div>
                  <div class="studio-client-program-head-badges">
                    ${renderProgramEnrollmentBadge(p)}
                    <span class="studio-client-program-plan">${esc(p.paymentLabel)}</span>
                  </div>
                </div>
                ${p.extOptions ? `
                  <dl class="studio-client-program-details">
                    ${p.extOptions.length ? `<div><dt>Length</dt><dd>${p.extOptions.length}″</dd></div>` : ''}
                    ${p.extOptions.subType ? `<div><dt>Type</dt><dd>${esc(p.extOptions.subType)}</dd></div>` : ''}
                    ${p.extOptions.additionalQty > 0 ? `<div><dt>Add-ons</dt><dd>+${p.extOptions.additionalQty}</dd></div>` : ''}
                  </dl>` : ''}
                ${p.visitsIncluded ? renderProgramVisitBar(p.visitsUsed + (p.visitsScheduled || 0), p.visitsIncluded) : ''}
                ${p.warranty?.applies ? renderWarrantyDetailBlock(p.warranty, true) : ''}
                ${p.warranty?.history?.length ? renderWarrantyHistoryList(p.warranty.history, 3) : ''}
                <dl class="studio-client-program-meta">
                  ${p.duration ? `<div><dt>Session</dt><dd>${esc(p.duration)}</dd></div>` : ''}
                  ${p.visitValue ? `<div><dt>Per visit</dt><dd>${S().formatPrice(p.visitValue)}</dd></div>` : ''}
                  <div><dt>Enrolled</dt><dd>${new Date(p.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>
                  <div><dt>Paid</dt><dd>${S().formatPrice(p.netPaid != null ? p.netPaid : p.totalPaid)}${p.refundedAmount ? ` <small class="studio-client-refund-note">(${S().formatPrice(p.refundedAmount)} refunded)</small>` : ''}</dd></div>
                  ${p.enrollmentStatus && p.enrollmentStatus !== 'active' ? `<div><dt>Status</dt><dd>${esc(p.enrollmentLabel)}</dd></div>` : ''}
                </dl>
                ${(p.highlights || []).length ? `<ul class="studio-client-program-highlights">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
              </article>`).join('')}
          </div>
        </section>`;
    }

    if (summary.consultFor) {
      const c = summary.consultFor;
      return `
        <section class="studio-client-program-section">
          <h3>Program status</h3>
          <article class="studio-client-program-card studio-client-program-consult">
            <p class="studio-client-consult-label">Consult for</p>
            <strong class="studio-client-consult-name">${esc(c.programName)}</strong>
            ${c.fromPriceDisplay ? `<p class="studio-client-consult-price">${esc(c.fromPriceDisplay)}</p>` : ''}
            <dl class="studio-client-program-meta">
              <div><dt>Consultation</dt><dd>${fmtDate(c.date)} · ${esc(fmtTime12(c.startTime))}</dd></div>
              <div><dt>Status</dt><dd>${esc(S().APPT_STATUS[c.status]?.label || c.status)}</dd></div>
              ${c.source === 'website' ? '<div><dt>Source</dt><dd>Website booking</dd></div>' : ''}
            </dl>
            <p class="admin-fine">No program enrolled yet — complete POS checkout or mark consultation complete to enroll.</p>
          </article>
        </section>`;
    }

    return `
      <section class="studio-client-program-section">
        <h3>Program status</h3>
        <article class="studio-client-program-card studio-client-program-empty">
          <p>No program on file.</p>
          <p class="admin-fine">Book a consultation or enroll via POS when they&apos;re ready.</p>
        </article>
      </section>`;
  }

  function renderClientNextAppt(next) {
    if (!next) return '';
    return `
      <div class="studio-client-next-appt">
        <span>Next visit</span>
        <strong>${fmtDate(next.date)} · ${esc(fmtTime12(next.startTime))}</strong>
        <em>${esc(next.intendedService || next.serviceName)}</em>
      </div>`;
  }

  const SETTINGS_SECTIONS = ['settings', 'pricing', 'staff'];

  function topNavActiveId(active) {
    return SETTINGS_SECTIONS.includes(active) ? 'settings' : active;
  }

  function subnav(active, newInquiries, sideNav) {
    if (sideNav) return '';
    const activeId = topNavActiveId(active);
    const tabs = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'pos', label: 'POS' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'clients', label: 'Clients' },
      { id: 'inquiries', label: 'Inquiries', badge: newInquiries },
      { id: 'transactions', label: 'Register' },
      { id: 'settings', label: 'Settings' },
    ];
    return `<div class="studio-pos-subnav-wrap"><div class="studio-pos-subnav">${tabs.map((t) =>
      `<button type="button" class="studio-pos-tab${t.id === activeId ? ' active' : ''}" data-studio-tab="${t.id}">${t.label}${t.badge ? ` <span class="admin-nav-badge">${t.badge}</span>` : ''}</button>`
    ).join('')}</div></div>`;
  }

  function settingsSubnav(active) {
    const sections = [
      { id: 'settings', label: 'General' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'staff', label: 'Team' },
    ];
    return `<div class="studio-settings-subnav-wrap"><div class="studio-settings-subnav">${sections.map((s) =>
      `<button type="button" class="studio-settings-tab${s.id === active ? ' active' : ''}" data-studio-tab="${s.id}">${s.label}</button>`
    ).join('')}</div></div>`;
  }

  function statusLegend() {
    return `<div class="studio-cal-legend">${Object.values(S().APPT_STATUS).map((st) =>
      `<span><i style="background:${st.color}"></i>${st.label}</span>`
    ).join('')}</div>`;
  }

  function renderBonusPoolPanel(viewDate) {
    const BP = window.StudioBonusPool;
    if (!BP) return '';
    const monthKey = BP.monthKeyFromDate(viewDate || S().todayISO());
    const today = S().todayISO();
    const isCurrentMonth = monthKey === BP.monthKeyFromDate(today);
    const month = BP.computeMonth(monthKey);
    const todayStats = isCurrentMonth ? BP.daySummary(monthKey, today) : null;

    const metric = (label, value, triggered, detail) => `
      <div class="studio-bonus-metric${triggered ? ' studio-bonus-metric--hit' : ''}">
        <p class="studio-bonus-metric-label">${esc(label)}</p>
        <p class="studio-bonus-metric-value">${esc(value)}</p>
        <p class="studio-bonus-metric-detail">${triggered ? '✓ ' : ''}${esc(detail)}</p>
      </div>`;

    const todayGrid = todayStats ? `
      <div class="studio-bonus-today-grid">
        ${metric(
          'Appt value',
          BP.formatMoney(todayStats.scheduledAppointmentValue),
          todayStats.appointmentValueTriggered,
          todayStats.appointmentValueTriggered
            ? `+$${BP.APPT_VALUE_BONUS}`
            : `Need $${Math.max(0, BP.APPT_VALUE_TRIGGER - todayStats.scheduledAppointmentValue).toLocaleString()}`
        )}
        ${metric(
          'Net collections',
          BP.formatMoney(todayStats.netCollections),
          todayStats.netCollectionsTriggered,
          todayStats.netCollectionsTriggered
            ? `+${BP.formatMoney(todayStats.netCollectionsBonus)}`
            : `Need $${Math.max(0, BP.DAILY_NET_GOAL - todayStats.netCollections).toLocaleString()}`
        )}
        ${metric(
          'Streak',
          todayStats.streakDay > 0 ? `Day ${todayStats.streakDay}` : 'No streak',
          todayStats.streakDay > 0,
          todayStats.streakDay > 0
            ? `@ ${BP.formatPercent(todayStats.streakPercent)}`
            : 'Resets on miss'
        )}
      </div>` : '';

    const historyRows = [...month.days].reverse().map((day) => {
      const isToday = day.date === today;
      return `
        <div class="studio-bonus-history-row${isToday ? ' studio-bonus-history-row--today' : ''}">
          <span class="studio-bonus-history-date">${isToday ? 'Today' : esc(BP.formatShortDate(day.date))}</span>
          <span class="studio-bonus-history-triggers">
            <span class="studio-bonus-trigger${day.appointmentValueTriggered ? ' hit' : ''}" title="Appt value ≥ $${BP.APPT_VALUE_TRIGGER.toLocaleString()}">T1</span>
            <span class="studio-bonus-trigger${day.netCollectionsTriggered ? ' hit' : ''}" title="Net collections ≥ $${BP.DAILY_NET_GOAL.toLocaleString()}">T2</span>
          </span>
          <span class="studio-bonus-history-streak">${day.streakDay > 0 ? `Day ${day.streakDay}` : '—'}</span>
          <span class="studio-bonus-history-net">${esc(BP.formatMoney(day.netCollections))}</span>
          <span class="studio-bonus-history-bonus">${esc(BP.formatMoney(day.dayTotal))}</span>
        </div>`;
    }).join('');

    return `
      <details class="studio-bonus-pool" open>
        <summary class="studio-bonus-pool-head">
          <div class="studio-bonus-pool-title">
            <span class="studio-bonus-pool-icon" aria-hidden="true">🏆</span>
            <div>
              <p class="studio-bonus-pool-eyebrow">Team bonus pool</p>
              <p class="studio-bonus-pool-month">${esc(BP.monthLabel(monthKey))}</p>
            </div>
          </div>
          <div class="studio-bonus-pool-mtd">
            <strong>${esc(BP.formatMoney(month.poolTotal))}</strong>
            <span>MTD pool</span>
          </div>
        </summary>
        <div class="studio-bonus-pool-body">
          <p class="studio-bonus-pool-lead">Daily net collections goal <strong>$${BP.DAILY_NET_GOAL.toLocaleString()}</strong> — streak bonus compounds (5% → 10%) each consecutive day you hit it. Appt value ≥ $${BP.APPT_VALUE_TRIGGER.toLocaleString()} adds $${BP.APPT_VALUE_BONUS}.</p>
          ${todayGrid}
          <div class="studio-bonus-history">
            <div class="studio-bonus-history-head" aria-hidden="true">
              <span>Date</span>
              <span>Triggers</span>
              <span>Streak</span>
              <span>Net coll.</span>
              <span>Bonus</span>
            </div>
            ${historyRows || '<p class="studio-bonus-empty">No qualifying days this month yet.</p>'}
          </div>
        </div>
      </details>`;
  }

  function apptMovable(status) {
    return !['canceled', 'completed', 'no_show'].includes(status);
  }

  function renderApptBlock(a, gridStyle, compact) {
    const color = S().APPT_STATUS[a.status]?.color || '#2563EB';
    const webBadge = a.source === 'website' ? '<span class="studio-cal-web-badge">Web</span>' : '';
    const onlineBadge = onlineBookingBadge(a);
    const prepBadge = bookingPrepBadge(a);
    const newBadge = firstVisitBadge(a.clientId, a.clientPhone);
    const movable = apptMovable(a.status);
    const statusClass = a.status ? ` studio-cal-status-${a.status.replace('_', '-')}` : '';
    const animStatuses = ['scheduled', 'checked_in', 'in_progress', 'with_provider'];
    const animClass = animStatuses.includes(a.status) ? ' studio-cal-status-live' : '';
    return `<div class="studio-cal-v2-block${compact ? ' studio-cal-v2-block-sm' : ''}${movable ? ' studio-cal-v2-block-movable' : ''}${a.packageVisit ? ' studio-cal-pkg-visit' : ''}${statusClass}${animClass}"
      data-studio-appt="${a.id}" data-appt-movable="${movable ? 'true' : 'false'}"
      data-appt-status="${esc(a.status)}"
      data-appt-date="${esc(a.date)}"
      data-appt-start="${esc(a.startTime)}"
      data-checked-in-at="${esc(a.checkedInAt || '')}"
      data-in-progress-at="${esc(a.inProgressAt || '')}"
      data-with-provider-at="${esc(a.withProviderAt || '')}"
      tabindex="0" role="button"
      style="${gridStyle};--status-color:${color};z-index:3">
      <span class="studio-cal-status-pulse" aria-hidden="true"></span>
      ${movable ? '<span class="studio-cal-drag-handle" data-cal-drag-handle title="Drag to move">⋮⋮</span>' : ''}
      <div class="studio-cal-block-body">
        <strong>${esc(a.clientName)}${newBadge}${intakeSkippedBadge(a)}${allergyAlertBadge(a)}${packageVisitBadge(a)}${onlineBadge || webBadge}${prepBadge}</strong>
        ${compact
          ? `<small>${esc(fmtTime12(a.startTime))}</small>`
          : `<small>${esc(a.scheduledVisitType || (a.packageVisit ? a.programName || a.serviceName : (a.intendedService || a.serviceName)))}</small>
             <span>${esc(fmtTime12(a.startTime))}–${esc(fmtTime12(a.endTime))}${a.packageVisit ? ` · ${esc(S().getPackageVisitLabel(a))}` : ''}</span>`}
        <span class="studio-cal-appt-timer" data-appt-timer hidden></span>
      </div>
    </div>`;
  }

  function renderSlotChipPicker(slots, selected, name) {
    if (!slots.length) {
      return '<p class="admin-fine studio-warn">No open slots for this date and chair.</p>';
    }
    return `<div class="studio-cal-slot-picker" role="listbox" aria-label="Available times">
      ${slots.map((slot) => `
        <button type="button" class="studio-cal-slot-chip${slot === selected ? ' active' : ''}"
          data-cal-pick-slot="${slot}" name="${name}">${fmtTime12(slot)}</button>`).join('')}
    </div>`;
  }

  const PAYMENT_ORDER = { 'Pay in full': 0, Quarterly: 1, Finance: 2, Standard: 3 };

  function sortPaymentTiers(services) {
    return [...services].sort((a, b) => {
      const pa = PAYMENT_ORDER[S().paymentType(a.name) || 'Standard'] ?? 9;
      const pb = PAYMENT_ORDER[S().paymentType(b.name) || 'Standard'] ?? 9;
      return pa - pb;
    });
  }

  function renderExtLengthGrid(lengths, selectedInches) {
    return `<div class="studio-ext-length-grid">${lengths.map((row) => `
      <button type="button" class="studio-ext-option studio-ext-length${row.inches === Number(selectedInches) ? ' active' : ''}"
        data-ext-field="length" data-ext-value="${row.inches}">
        <strong>${row.inches}″</strong>
      </button>`).join('')}</div>`;
  }

  function renderExtPaymentOptions(lengthRow, extCfg, extOpts) {
    const selectedPlan = extOpts.paymentPlan;
    const additionalQty = extOpts.additionalQty;
    const plans = (window.STUDIO_EXT_PAYMENT_PLANS || []).filter((plan) => {
      if (plan.id !== 'quarterly') return true;
      return S().isExtensionQuarterlyEligible(lengthRow);
    });
    const addPrice = (additionalQty || 0) * (extCfg?.additionalItem?.price || 0);
    const activePlan = selectedPlan === 'quarterly' && !S().isExtensionQuarterlyEligible(lengthRow)
      ? null
      : selectedPlan;
    return `<div class="studio-ext-payment-list">${plans.map((plan) => {
      const pricingOpts = { ...extOpts, paymentPlan: plan.id };
      const base = S().getExtensionBasePlanPrice(pricingOpts);
      const planTotal = plan.annualDisplay ? base : base + addPrice;
      const dueToday = plan.id === 'quarterly' ? base / 4 + addPrice : base + addPrice;
      const apptVal = S().getExtensionAppointmentValue(pricingOpts);
      const visitsLabel = S().formatExtensionVisitsLabel(extCfg, plan.id);
      const active = activePlan === plan.id;
      const priceLabel = plan.annualDisplay
        ? `<span class="studio-ext-annual-label">Annual plan</span><strong class="studio-tier-price">${S().formatPrice(planTotal)}</strong>`
        : `<strong class="studio-tier-price">${S().formatPrice(planTotal)}</strong>`;
      const isFinance = plan.id === 'finance';
      const financeAttrs = isFinance
        ? ` data-finance-apply data-finance-amount="${planTotal}" data-finance-label="${esc(extOpts.family || extCfg?.family || '')} — Finance"`
        : '';
      return `
        <button type="button" class="studio-ext-payment${active ? ' active' : ''}${isFinance ? ' studio-ext-payment-finance' : ''}" data-ext-field="paymentPlan" data-ext-value="${plan.id}"${financeAttrs}>
          <div class="studio-ext-payment-left">
            <span class="studio-program-plan">${esc(plan.label)}</span>
            ${plan.badge ? `<span class="studio-tier-badge">${esc(plan.badge)}</span>` : ''}
            <small>${visitsLabel}${apptVal ? ` · ~${S().formatPrice(apptVal)}/visit` : ''}</small>
            ${plan.id === 'quarterly' ? `<small class="studio-ext-due-today">Due today: ${S().formatPrice(dueToday)} · covers visits this quarter</small>` : ''}
            ${isFinance ? '<small class="studio-ext-finance-cta">Opens CareCredit / Synchrony application →</small>' : ''}
          </div>
          <div class="studio-ext-payment-price">${priceLabel}</div>
        </button>`;
    }).join('')}</div>`;
  }

  function renderExtensionConfigurePanel(base, extCfg, extOpts, mode, grp) {
    const lengthRow = S().getExtensionLengthRow(base, extOpts.length);
    const includedSummary = S().formatIncludedHairSummary(extCfg);
    const plans = window.STUDIO_EXT_PAYMENT_PLANS || [];
    const effectivePaymentPlan = extOpts.paymentPlan === 'quarterly' && lengthRow && !S().isExtensionQuarterlyEligible(lengthRow)
      ? null
      : extOpts.paymentPlan;
    const selectedPlan = plans.find((p) => p.id === effectivePaymentPlan);
    const isQuarterly = effectivePaymentPlan === 'quarterly';
    const pricingOpts = effectivePaymentPlan ? { ...extOpts, paymentPlan: effectivePaymentPlan } : null;
    const planTotal = lengthRow && pricingOpts
      ? (isQuarterly ? S().getExtensionBasePlanPrice(pricingOpts) : S().getExtensionPlanTotal(pricingOpts))
      : null;
    const dueToday = lengthRow && pricingOpts ? S().getExtensionAmountDue(pricingOpts) : null;

    return `
      ${extCfg.subOptions?.length ? `
        <p class="studio-program-modal-label">Select weft type</p>
        <p class="studio-ext-length-note">Flip, Invisi Flip, Genius Flip, and Twin-Genius Flip share the same supplier grid.</p>
        ${renderExtSubTypeGrid(extCfg.subOptions, extOpts.subType)}` : ''}
      ${extCfg.shadeGroups?.length ? `
        <p class="studio-program-modal-label">Select shade group</p>
        ${renderExtShadeGrid(extCfg.shadeGroups, extOpts.shade, base)}` : ''}
      <p class="studio-program-modal-label">Select length</p>
      ${includedSummary ? `<p class="studio-ext-included">${esc(includedSummary)}</p>` : ''}
      ${renderExtLengthGrid(extCfg.lengths, extOpts.length)}
      ${lengthRow ? `
        <p class="studio-program-modal-label">Payment option</p>
        <p class="studio-ext-length-note">Price updates based on ${extOpts.length}″ length</p>
        ${renderExtPaymentOptions(lengthRow, extCfg, extOpts)}
        ${!S().isExtensionQuarterlyEligible(lengthRow) ? '<p class="studio-ext-length-note">Quarterly billing requires a payment of ' + esc(S().formatPrice(S().getQuarterlyMinPayment())) + ' or more — pay in full or finance for this length.</p>' : ''}` : ''}
      ${extCfg.additionalItem && lengthRow ? `
        <div class="studio-ext-additional">
          <label class="form-field studio-ext-additional-field">
            <span>${esc(extCfg.additionalItem.label)} (+${S().formatPrice(extCfg.additionalItem.price)} each)</span>
            <div class="studio-ext-qty">
              <button type="button" class="btn-secondary btn-sm" data-ext-qty-delta="-1">−</button>
              <input type="number" min="0" max="20" value="${extOpts.additionalQty || 0}" data-ext-qty-input>
              <button type="button" class="btn-secondary btn-sm" data-ext-qty-delta="1">+</button>
            </div>
          </label>
        </div>` : ''}
      ${lengthRow && (!extCfg.shadeGroups?.length || extOpts.shade) ? renderExtensionSupplierPanel(extOpts) : ''}
      ${lengthRow && effectivePaymentPlan ? `
        <div class="studio-ext-summary-panel">
          <p class="studio-program-modal-label">Summary</p>
          <dl class="studio-ext-summary-dl">
            <div><dt>Length</dt><dd>${extOpts.length}″</dd></div>
            ${extOpts.subType ? `<div><dt>Type</dt><dd>${esc(extOpts.subType)}</dd></div>` : ''}
            ${extOpts.shade ? `<div><dt>Shade</dt><dd>${esc(extOpts.shade)}</dd></div>` : ''}
            <div><dt>Payment</dt><dd>${esc(selectedPlan?.label || '')}</dd></div>
            ${isQuarterly ? `<div><dt>Annual plan</dt><dd>${S().formatPrice(planTotal)}</dd></div>` : ''}
            <div class="studio-ext-summary-total"><dt>${isQuarterly ? 'Due today' : 'Total'}</dt><dd>${S().formatPrice(dueToday)}</dd></div>
          </dl>
        </div>` : ''}`;
  }

  function renderExtSubTypeGrid(subOptions, selected) {
    return `<div class="studio-ext-option-grid">${subOptions.map((opt) => `
      <button type="button" class="studio-ext-option${opt === selected ? ' active' : ''}"
        data-ext-field="subType" data-ext-value="${esc(opt)}">
        <strong>${esc(opt)}</strong>
      </button>`).join('')}</div>`;
  }

  function renderExtShadeGrid(shadeGroups, selected, family) {
    const premiums = S().getExtensionConfig(family)?.shadeRetailPremium || {};
    return `<div class="studio-ext-option-grid studio-ext-shade-grid">${shadeGroups.map((shade) => {
      const premium = premiums[shade] || 0;
      const premiumLabel = premium ? `<small>+${S().formatPrice(premium)}</small>` : '';
      return `
      <button type="button" class="studio-ext-option${shade === selected ? ' active' : ''}"
        data-ext-field="shade" data-ext-value="${esc(shade)}">
        <strong>${esc(shade)}</strong>
        ${premiumLabel}
      </button>`;
    }).join('')}</div>`;
  }

  function renderExtensionSupplierPanel(extOpts) {
    const summary = S().getExtensionSupplierSummary(extOpts);
    if (!summary) return '';
    const handlingNote = summary.handling > 0
      ? `<small>Handling applies — under ${S().getExtensionConfig(extOpts.family)?.supplierCost?.handlingFee?.minPieces || 8} wefts per order</small>`
      : `<small>No handling fee (8+ wefts)</small>`;
    return `
      <div class="studio-ext-supplier-panel">
        <p class="studio-program-modal-label">Supplier cost (startup)</p>
        <dl class="studio-ext-summary-dl studio-ext-supplier-dl">
          <div><dt>Weft cost</dt><dd>${S().formatPrice(summary.perWeft)} × ${summary.pieceCount}</dd></div>
          <div><dt>Hair subtotal</dt><dd>${S().formatPrice(summary.hairCost)}</dd></div>
          <div><dt>Handling</dt><dd>${summary.handling ? S().formatPrice(summary.handling) : '$0'}</dd></div>
          <div><dt>Total COGS</dt><dd>${S().formatPrice(summary.total)}</dd></div>
          ${summary.retail ? `
            <div><dt>Client plan</dt><dd>${S().formatPrice(summary.retail)}</dd></div>
            <div class="studio-ext-summary-total"><dt>Est. margin</dt><dd>${S().formatPrice(summary.margin)} (${summary.marginPct}%)</dd></div>
          ` : ''}
        </dl>
        ${handlingNote}
      </div>`;
  }

  function renderProgramModal(ctx) {
    const base = ctx.studioOpenProgramBase;
    if (!base) return '';
    const cat = ctx.studioCategory;
    const families = S().getProgramFamilies({ gender: ctx.studioGender, category: cat });
    const grp = families.find((g) => g.base === base);
    if (!grp) return '';
    const mode = ctx.studioProgramModalMode || 'pos';
    const isExt = S().isExtensionCategory(grp.category);
    const extCfg = isExt ? S().getExtensionConfig(base) : null;
    const extOpts = { family: base, ...(ctx.studioExtOptions || S().defaultExtensionOptions(base)) };
    const tiers = sortPaymentTiers(grp.services);

    let body = '';
    if (isExt && extCfg) {
      body = renderExtensionConfigurePanel(base, extCfg, extOpts, mode, grp);
    } else {
      body = `
        <p class="studio-program-modal-label">Select payment plan</p>
        <div class="studio-program-tier-btns">
          ${tiers.map((svc) => {
            const plan = S().paymentType(svc.name) || 'Standard';
            const isFinance = plan === 'Finance' || svc.isFinanceTier;
            const visitsLabel = S().formatPackageVisitsLabel(svc, plan);
            const financeUrl = isFinance ? S().getFinanceUrl() : '';
            return `
            <button type="button" class="studio-tier-option${isFinance ? ' studio-tier-finance' : ''}" data-program-select="${svc.id}" data-program-mode="${mode}"${isFinance ? ` data-finance-apply data-finance-amount="${svc.price}" data-finance-label="${esc(S().shortName(svc.name))}"` : ''}>
              <span class="studio-program-plan">${esc(plan)}</span>
              <strong class="studio-tier-price">${S().formatPrice(svc.price)}</strong>
              <small>${visitsLabel ? esc(visitsLabel) : esc(svc.duration)}${svc.appointmentValue ? ` · ~${S().formatPrice(svc.appointmentValue)}/visit` : ''}${plan === 'Quarterly' ? ' · covers visits this quarter' : ''}${isFinance ? ' · opens financing application' : ''}</small>
              ${isFinance && financeUrl ? '<span class="studio-tier-finance-cta">Apply for financing →</span>' : ''}
            </button>`;
          }).join('')}
        </div>`;
    }

    const canAddExt = isExt && extOpts.length && extOpts.paymentPlan
      && (!extCfg?.subOptions?.length || extOpts.subType)
      && (!extCfg?.shadeGroups?.length || extOpts.shade);

    return `
      <div class="studio-program-modal" id="studioProgramModal">
        <button type="button" class="studio-program-modal-backdrop studio-glass-backdrop" data-program-close aria-label="Close"></button>
        <div class="studio-program-modal-panel studio-program-modal-wide studio-glass-panel" role="dialog" aria-modal="true">
          <button type="button" class="studio-program-modal-x" data-program-close>×</button>
          ${grp.featured ? '<span class="studio-pos-badge">Popular</span>' : ''}
          <p class="studio-program-modal-eyebrow">${esc(CATS()[grp.category]?.label || '')}</p>
          <h2>${esc(grp.base)}</h2>
          ${grp.tagline ? `<p class="studio-program-modal-tag">${esc(grp.tagline)}</p>` : ''}
          ${grp.description ? `<p class="studio-program-modal-desc">${esc(grp.description)}</p>` : ''}
          ${body}
          ${S().isPackageCategory(grp.category) ? S().formatPackageWarrantyHtml() : ''}
          <div class="studio-program-modal-actions">
            ${canAddExt ? `<button type="button" class="btn-primary btn-sm" data-ext-add data-program-mode="${mode}">${mode === 'book' ? 'Select for booking' : 'Add to cart'}</button>` : ''}
            <button type="button" class="btn-secondary btn-sm studio-program-cancel" data-program-close>Cancel</button>
          </div>
        </div>
      </div>`;
  }

  function renderFamilyCards(families, search, mode) {
    const q = (search || '').toLowerCase();
    const list = q
      ? families.filter((g) => g.base.toLowerCase().includes(q) || (g.tagline || '').toLowerCase().includes(q))
      : families;
    return list.map((grp) => {
      const isExt = grp.category === 'womens_extensions';
      const from = S().getPublicFromPrice(grp.services, grp.base, grp.category);
      const priceLabel = from.display || S().formatPrice(S().programFromPrice(grp.services, grp.base));
      const visits = grp.services[0]?.appointmentsIncluded;
      const extCfg = isExt ? S().getExtensionConfig(grp.base) : null;
      const lengthNote = extCfg?.lengths?.length ? `${extCfg.lengths.length} lengths (14″–${extCfg.lengths[extCfg.lengths.length - 1].inches}″)` : '';
      const extBadge = isExt ? S().getExtensionFamilyBadge(grp.base) : null;
      return `
        <button type="button" class="studio-family-card${grp.featured ? ' featured' : ''}" data-program-open="${esc(grp.base)}" data-program-mode="${mode || 'pos'}">
          ${extBadge ? `<span class="studio-pos-badge">${esc(extBadge)}</span>` : (grp.featured ? '<span class="studio-pos-badge">Popular</span>' : '')}
          <h3>${esc(grp.base)}</h3>
          ${grp.tagline ? `<p class="studio-family-tag">${esc(grp.tagline)}</p>` : ''}
          <p class="studio-family-meta">${visits ? `${visits} visits` : esc(grp.services[0]?.duration || '')}${lengthNote ? ` · ${lengthNote}` : ` · ${grp.services.length} plan${grp.services.length > 1 ? 's' : ''}`}</p>
          <p class="studio-family-from"><strong>${esc(priceLabel)}</strong>${isExt ? ' <small>by length</small>' : ''}</p>
          <span class="studio-family-cta">${grp.category === 'womens_extensions' ? 'Configure →' : 'Choose plan →'}</span>
        </button>`;
    }).join('');
  }

  function renderServiceCards(services) {
    return services.map((svc) => `
      <button type="button" class="studio-pos-service-card" data-pos-add="${svc.id}">
        <div class="studio-pos-service-top">
          ${svc.featured ? '<span class="studio-pos-badge">Popular</span>' : ''}
          <strong>${esc(S().shortName(svc.name))}</strong>
        </div>
        <p class="studio-pos-price">${S().formatPrice(svc.price)}</p>
        <p class="studio-pos-meta">${esc(svc.duration)}${svc.appointmentsIncluded ? ` · ${svc.appointmentsIncluded} visits` : ''}</p>
      </button>`).join('');
  }

  function renderShelfCards(items) {
    return items.map((item) => `
      <button type="button" class="studio-pos-service-card studio-shelf-card" data-shelf-add="${item.id}">
        <div class="studio-pos-service-top">
          ${item.featured ? '<span class="studio-pos-badge">Popular</span>' : ''}
          <strong>${esc(item.name)}</strong>
        </div>
        <p class="studio-pos-price">${S().formatPrice(item.price)}</p>
        <p class="studio-pos-meta">${item.sku ? esc(item.sku) : esc(item.duration || 'Shelf item')}</p>
      </button>`).join('');
  }

  function renderBookServiceTiles(services, selectedId) {
    if (!services.length) return '<p class="admin-fine">No services in this category.</p>';
    return services.map((svc) => {
      const selected = svc.id === selectedId;
      return `
        <button type="button" class="studio-family-card studio-book-service-tile${selected ? ' selected' : ''}${svc.featured ? ' featured' : ''}"
          data-book-select="${svc.id}">
          ${svc.featured ? '<span class="studio-pos-badge">Popular</span>' : ''}
          <h3>${esc(S().shortName(svc.name))}</h3>
          <p class="studio-family-meta">${esc(svc.duration)}</p>
          <p class="studio-family-from"><strong>${S().formatPrice(svc.price)}</strong></p>
          <span class="studio-family-cta">${selected ? 'Selected' : 'Select →'}</span>
        </button>`;
    }).join('');
  }

  function renderCalDayGridV2(date, dayAppts, settings, slots, chairFilter) {
    const cols = settings.columns;
    const rows = slots.length;
    const nowLine = date === S().todayISO() ? S().getNowSlotLine(settings) : null;
    const filtered = chairFilter
      ? dayAppts.filter((a) => a.column === chairFilter)
      : dayAppts;

    const calStyle = `--cols:${cols};--rows:${rows};--slot-h:48px${nowLine ? `;--now-row:${nowLine.index + 2};--now-pct:${nowLine.pct}` : ''}`;
    let html = `<div class="studio-cal-v2" style="${calStyle}">`;
    html += '<div class="studio-cal-v2-corner" style="grid-column:1;grid-row:1"></div>';
    for (let c = 0; c < cols; c++) {
      html += `<div class="studio-cal-v2-colhead" style="grid-column:${c + 2};grid-row:1">${esc(settings.columnLabels[c] || `Chair ${c + 1}`)}</div>`;
    }

    slots.forEach((slot, rowIdx) => {
      const gridRow = rowIdx + 2;
      html += `<div class="studio-cal-v2-time" style="grid-column:1;grid-row:${gridRow}">${fmtTime12(slot)}</div>`;
      for (let col = 1; col <= cols; col++) {
        const gridCol = col + 1;
        if (chairFilter && col !== chairFilter) {
          html += `<div class="studio-cal-v2-slot muted" style="grid-column:${gridCol};grid-row:${gridRow}"></div>`;
          continue;
        }
        const colAppts = filtered.filter((a) => a.column === col);
        const occupied = colAppts.some((a) => S().apptCoversSlot(a, slot, settings) && !S().apptStartsAtSlot(a, slot));
        const starting = colAppts.some((a) => S().apptStartsAtSlot(a, slot));
        if (occupied) {
          html += `<div class="studio-cal-v2-slot occupied" style="grid-column:${gridCol};grid-row:${gridRow}"></div>`;
        } else if (!starting) {
          html += `<div class="studio-cal-v2-slot open" role="button" tabindex="0" style="grid-column:${gridCol};grid-row:${gridRow}" data-cal-slot="${date}|${slot}|${col}"></div>`;
        } else {
          html += `<div class="studio-cal-v2-slot booked-bg" style="grid-column:${gridCol};grid-row:${gridRow}"></div>`;
        }
      }
    });

    filtered.forEach((a) => {
      const row = S().slotIndex(a.startTime, settings);
      if (row < 0 || row >= rows) return;
      const span = S().apptSlotSpan(a, settings);
      html += renderApptBlock(a, `grid-column:${a.column + 1};grid-row:${row + 2} / span ${span}`, false);
    });

    if (nowLine) html += '<div class="studio-cal-now-line" data-cal-now-line></div>';
    html += '</div>';
    return html;
  }

  function renderCalWeekGridV2(dates, allAppts, settings, slots, chairFilter) {
    const rows = slots.length;
    let html = `<div class="studio-cal-v2 studio-cal-v2-week" style="--cols:7;--rows:${rows};--slot-h:40px">`;
    html += '<div class="studio-cal-v2-corner" style="grid-column:1;grid-row:1"></div>';
    dates.forEach((d, i) => {
      html += `<div class="studio-cal-v2-colhead${d === S().todayISO() ? ' today' : ''}" style="grid-column:${i + 2};grid-row:1">${fmtDate(d)}</div>`;
    });

    slots.forEach((slot, rowIdx) => {
      const gridRow = rowIdx + 2;
      html += `<div class="studio-cal-v2-time" style="grid-column:1;grid-row:${gridRow}">${fmtTime12(slot)}</div>`;
      dates.forEach((d, dayIdx) => {
        const gridCol = dayIdx + 2;
        const dayAppts = allAppts.filter((a) => a.date === d && (!chairFilter || a.column === chairFilter));
        const occupied = dayAppts.some((a) => S().apptCoversSlot(a, slot, settings) && !S().apptStartsAtSlot(a, slot));
        const starting = dayAppts.some((a) => S().apptStartsAtSlot(a, slot));
        if (occupied) {
          html += `<div class="studio-cal-v2-slot occupied" style="grid-column:${gridCol};grid-row:${gridRow}"></div>`;
        } else if (!starting) {
          html += `<div class="studio-cal-v2-slot open" role="button" tabindex="0" style="grid-column:${gridCol};grid-row:${gridRow}" data-cal-slot="${d}|${slot}|${chairFilter || 1}"></div>`;
        } else {
          html += `<div class="studio-cal-v2-slot booked-bg" style="grid-column:${gridCol};grid-row:${gridRow}"></div>`;
        }
      });
    });

    dates.forEach((d, dayIdx) => {
      const dayAppts = allAppts.filter((a) => a.date === d && (!chairFilter || a.column === chairFilter));
      dayAppts.forEach((a) => {
        const row = S().slotIndex(a.startTime, settings);
        if (row < 0) return;
        const span = S().apptSlotSpan(a, settings);
        html += renderApptBlock(a, `grid-column:${dayIdx + 2};grid-row:${row + 2} / span ${span}`, true);
      });
    });

    html += '</div>';
    return html;
  }

  function resolveBookWizardClient(ctx) {
    const clientName = (ctx.studioBookClientName || '').trim();
    const clientPhone = (ctx.studioBookClientPhone || '').trim();
    if (!clientName && !clientPhone && !ctx.studioBookClientId) return null;
    const matched = (clientPhone ? S().findClientByPhone(clientPhone) : null)
      || (clientName ? S().findClientsByName(clientName)[0] : null)
      || (clientName ? S().getClients().find((c) => c.name.trim().toLowerCase() === clientName.toLowerCase()) : null);
    if (matched) return matched;
    if (ctx.studioBookClientId) {
      const byId = S().getClient(ctx.studioBookClientId);
      if (byId) return byId;
    }
    return null;
  }

  function renderNonPackageVisitPicker(ctx, draftSvcId, clientId, visitTypeId) {
    const types = S().getNonPackageVisitTypes();
    const activeTypeId = visitTypeId || types[0]?.id || 'consult';
    const activeType = types.find((t) => t.id === activeTypeId) || types[0];
    const needsServicePicker = activeTypeId === 'barber' || activeTypeId === 'salon';
    const selectedSvcId = ctx.studioApptServiceId || '';
    const services = needsServicePicker ? S().getNonPackageBookableServices(activeTypeId) : [];
    const selectedForTiles = services.some((s) => s.id === selectedSvcId) ? selectedSvcId : '';
    const bookServiceId = needsServicePicker ? (selectedForTiles || undefined) : undefined;
    const resolved = clientId
      ? S().resolveCalendarBooking(clientId, {
        visitTypeId: activeTypeId,
        gender: ctx.studioBookGender,
        bookServiceId,
      })
      : null;

    let serviceId = resolved?.serviceId || '';
    let serviceName = resolved?.serviceName || activeType?.label || 'System consultation';
    if (!serviceId) {
      if (activeTypeId === 'consult') {
        const consultSvc = S().getSystemConsultationService(ctx.studioBookGender);
        serviceId = consultSvc?.id || draftSvcId || 'c5';
        serviceName = activeType?.label || 'System consultation';
      } else if (selectedForTiles) {
        const sel = S().getService(selectedForTiles);
        serviceId = sel?.id || '';
        serviceName = sel ? S().shortName(sel.name) : serviceName;
      }
    }

    const hint = activeTypeId === 'consult'
      ? 'No active program on file — book a <strong>system consultation</strong> for restoration, or choose barber/salon for standalone grooming.'
      : activeTypeId === 'barber'
        ? 'Pick a barber service below. Cuts and beard book directly; color reserves a consultation.'
        : 'Pick a salon service below. Cuts and blowouts book directly; color reserves a consultation.';

    return `
      <div class="studio-book-visit-context">
        <p class="studio-glass-hint">${hint}</p>
      </div>
      <p class="studio-glass-lead">Visit type</p>
      <div class="studio-book-visit-types">
        ${types.map((t) => `
          <button type="button" class="studio-family-card studio-book-visit-tile${activeTypeId === t.id ? ' selected' : ''}"
            data-book-visit-type="${t.id}">
            <h3>${esc(t.label)}</h3>
            <p class="studio-family-tag">${esc(t.desc)}</p>
            <span class="studio-family-cta">${activeTypeId === t.id ? 'Selected' : 'Select →'}</span>
          </button>`).join('')}
      </div>
      ${needsServicePicker ? `
        <p class="studio-glass-lead">Service</p>
        <div class="studio-book-services studio-book-visit-types">
          ${renderBookServiceTiles(services, selectedForTiles)}
        </div>` : ''}
      <input type="hidden" id="apptService" value="${serviceId}">
      <p class="admin-fine">Selected: <strong id="apptSelectedLabel">${esc(serviceName)}</strong></p>`;
  }

  function renderBookServicePicker(ctx, draftSvcId) {
    const clientName = (ctx.studioBookClientName || '').trim();
    const bookClient = resolveBookWizardClient(ctx);
    const clientId = ctx.studioBookClientId || bookClient?.id || '';
    const visitTypeId = ctx.studioBookVisitType || '';
    const program = clientId ? S().findActiveProgramForBooking(clientId) : null;

    if (!clientId && !clientName) {
      return `
        <p class="admin-fine studio-glass-hint-warn">Enter the client name on the previous step, then continue here to select a visit type.</p>
        <input type="hidden" id="apptService" value="">`;
    }

    const nonPackageTypes = S().getNonPackageVisitTypes().map((t) => t.id);
    const usingNonPackage = ctx.studioBookUsePrepaid === false
      || (visitTypeId && nonPackageTypes.includes(visitTypeId));

    if (program && (program.visitsRemaining || 0) > 0 && !usingNonPackage) {
      const types = S().getScheduleVisitTypes(program.category);
      const activeTypeId = visitTypeId || types[0]?.id || '';
      const draft = S().resolveCalendarBooking(clientId, { visitTypeId: activeTypeId, programId: program.id });
      return `
        <div class="studio-book-visit-context">
          <p class="studio-glass-hint studio-glass-hint-credit">
            <strong>${esc(program.programName)}</strong> — ${program.visitsRemaining} prepaid visit${program.visitsRemaining !== 1 ? 's' : ''} remaining
          </p>
          <button type="button" class="link-cta studio-book-mode-switch" data-book-use-nonpackage>Book consult, barber, or salon instead (paid visit)</button>
        </div>
        <p class="studio-glass-lead">What is this prepaid visit for?</p>
        <div class="studio-book-visit-types">
          ${types.map((t) => `
            <button type="button" class="studio-family-card studio-book-visit-tile${activeTypeId === t.id ? ' selected' : ''}"
              data-book-visit-type="${t.id}">
              <h3>${esc(t.label)}</h3>
              <p class="studio-family-tag">${esc(t.desc)}</p>
              <span class="studio-family-cta">${activeTypeId === t.id ? 'Selected' : 'Select →'}</span>
            </button>`).join('')}
        </div>
        <input type="hidden" id="apptService" value="${draft?.serviceId || draftSvcId || ''}">
        <p class="admin-fine">Selected: <strong id="apptSelectedLabel">${esc(draft?.serviceName || 'Choose a visit type')}</strong></p>`;
    }

    if (program && (program.visitsRemaining || 0) > 0 && usingNonPackage) {
      const nonPkgHtml = renderNonPackageVisitPicker(ctx, draftSvcId, clientId, visitTypeId || 'consult');
      return `
        <div class="studio-book-visit-context">
          <p class="studio-glass-hint studio-glass-hint-credit">
            <strong>${esc(program.programName)}</strong> — ${program.visitsRemaining} prepaid visit${program.visitsRemaining !== 1 ? 's' : ''} still on account
          </p>
          <button type="button" class="link-cta studio-book-mode-switch" data-book-use-prepaid>Use a prepaid program visit instead</button>
        </div>
        ${nonPkgHtml}`;
    }

    return renderNonPackageVisitPicker(ctx, draftSvcId, clientId, visitTypeId);
  }

  function renderBookWizardPreferences(ctx) {
    const VF = window.StudioVisitFlow;
    const beverages = VF?.getArrivalBeverages?.() || [];
    const photos = ctx.studioBookInspoPhotos || [];
    return `
      <div class="studio-glass-book-prefs">
        <p class="studio-glass-lead">Visit preferences</p>
        <p class="studio-glass-hint">Optional — inspo, hair history, and 21+ beverage so the chair is ready on arrival.</p>
        <div class="studio-glass-fields">
          <label class="studio-glass-field studio-glass-field-full">
            <span>Likes from past hair services</span>
            <textarea id="wizardHairLikes" rows="2" placeholder="What worked well before">${esc(ctx.studioBookHairLikes || '')}</textarea>
          </label>
          <label class="studio-glass-field studio-glass-field-full">
            <span>Dislikes / things to avoid</span>
            <textarea id="wizardHairDislikes" rows="2" placeholder="Damage, tone, wait times, styles to skip">${esc(ctx.studioBookHairDislikes || '')}</textarea>
          </label>
          <label class="studio-glass-field studio-glass-field-full">
            <span>Prior services (last 12 months)</span>
            <textarea id="wizardPriorServices" rows="2" placeholder="Salon, barber, color, extensions, systems…">${esc(ctx.studioBookPriorServices || '')}</textarea>
          </label>
          <label class="studio-glass-field studio-glass-field-full">
            <span>21+ arrival beverage</span>
            <select id="wizardBeverage">
              ${beverages.map((b) => `<option value="${esc(b.id)}"${(ctx.studioBookBeverage || '') === b.id ? ' selected' : ''}>${esc(b.label)}</option>`).join('')}
            </select>
          </label>
          <label class="studio-glass-field studio-glass-field-full">
            <span>Inspiration photos</span>
            <input type="file" id="wizardInspoPhotos" accept="image/*" multiple>
          </label>
        </div>
        ${photos.length ? `<div class="studio-book-inspo-preview">${photos.map((p) => `<img src="${p.dataUrl}" alt="${esc(p.name || 'Inspo')}">`).join('')}</div>` : ''}
      </div>`;
  }

  function renderBookWizardModal(ctx) {
    if (!ctx.studioBookWizardOpen) return '';
    const settings = S().getSettings();
    const step = ctx.studioBookWizardStep || 'when';
    const stepIdx = BOOK_WIZARD_STEPS.findIndex((s) => s.id === step);
    const bookGender = ctx.studioBookGender || 'men';
    const bookCat = ctx.studioBookCategory || (bookGender === 'men' ? 'program' : 'womens_program');
    const defaultSvc = S().filterServices({ gender: bookGender, category: bookCat }).find((s) => s.isPackage)
      || S().filterServices({ gender: bookGender, category: bookCat })[0]
      || S().getServices()[0];
    const draftSvcId = ctx.studioApptServiceId || defaultSvc?.id;
    const draftSvc = S().getService(draftSvcId);
    const draftClientDuration = draftSvc ? S().getAppointmentDurationMin(draftSvc) : 60;
    const draftSchedulingDuration = draftSvc ? S().getSchedulingDurationMin(draftSvc) : 60;
    const draftDate = ctx.studioApptDraftDate || ctx.studioPrefill?.date || S().todayISO();
    const draftCol = ctx.studioApptDraftCol || ctx.studioPrefill?.column || 1;
    const availSlots = S().getAvailableSlots(draftDate, draftCol, draftSchedulingDuration);
    const draftTime = ctx.studioApptDraftTime || ctx.studioPrefill?.time || availSlots[0] || '09:00';
    const chairLabel = settings.columnLabels?.[draftCol - 1] || `Chair ${draftCol}`;
    const clientName = ctx.studioBookClientName || ctx.studioPrefill?.name || '';
    const clientPhone = ctx.studioBookClientPhone || ctx.studioPrefill?.phone || '';
    const notes = ctx.studioBookNotes || '';
    const extOpts = ctx.studioExtOptions;
    const bookClient = resolveBookWizardClient(ctx)
      || (clientName
        ? (clientPhone ? S().findClientByPhone(clientPhone) : null)
          || S().findClientsByName(clientName)[0]
          || S().getClients().find((c) => c.name === clientName)
        : null);
    const bookClientId = ctx.studioBookClientId || bookClient?.id || '';
    const program = bookClientId ? S().findActiveProgramForBooking(bookClientId) : null;
    const visitTypeId = ctx.studioBookVisitType || (program ? S().getScheduleVisitTypes(program.category)[0]?.id : 'consult');
    const bookServiceId = ['barber', 'salon'].includes(visitTypeId) ? (ctx.studioApptServiceId || undefined) : undefined;
    const calendarBooking = bookClientId
      ? S().resolveCalendarBooking(bookClientId, { visitTypeId, gender: bookGender, bookServiceId })
      : null;
    const serviceLabel = calendarBooking?.serviceName
      || (draftSvc ? S().shortName(draftSvc.name) : 'Not selected');
    const progressPct = ((stepIdx + 1) / BOOK_WIZARD_STEPS.length) * 100;
    const chairEndTime = draftSvc ? S().addMinutesToTime(draftTime, draftSchedulingDuration) : '';
    const clientEndTime = draftSvc ? S().addMinutesToTime(draftTime, draftClientDuration) : '';

    const stepPanels = {
      when: `
        <div class="studio-glass-hero-slot">
          <p class="studio-glass-hero-day">${fmtDate(draftDate)}</p>
          <p class="studio-glass-hero-time">${fmtTime12(draftTime)}</p>
          <p class="studio-glass-hero-meta">${esc(chairLabel)}${chairEndTime ? ` · chair until ${fmtTime12(chairEndTime)}` : ''}</p>
        </div>
        <div class="studio-glass-fields">
          <label class="studio-glass-field">
            <span>Date</span>
            <input type="date" id="wizardDate" value="${draftDate}">
          </label>
          <label class="studio-glass-field">
            <span>Chair</span>
            <select id="wizardColumn">${Array.from({ length: settings.columns }, (_, i) => {
              const n = i + 1;
              return `<option value="${n}"${n === draftCol ? ' selected' : ''}>${esc(settings.columnLabels[i] || `Chair ${n}`)}</option>`;
            }).join('')}</select>
          </label>
          <div class="studio-glass-field studio-glass-field-full">
            <span>Available times</span>
            <input type="hidden" id="wizardTime" value="${draftTime}">
            ${renderSlotChipPicker(availSlots.length ? availSlots : S().getTimeSlots(), draftTime, 'wizard-book')}
            ${!availSlots.length ? '<small class="studio-glass-hint studio-glass-hint-warn">No open slots — try another chair or date.</small>' : ''}
          </div>
        </div>`,
      client: `
        <p class="studio-glass-lead">Who is this appointment for?</p>
        <div class="studio-glass-fields">
          <label class="studio-glass-field studio-glass-field-full">
            <span>Client name</span>
            <input type="text" id="wizardClientName" required value="${esc(clientName)}" placeholder="Full name" list="wizardClientList" autocomplete="name">
            <datalist id="wizardClientList">${S().getClients().slice(0, 30).map((c) => `<option value="${esc(c.name)}">${esc(c.phone)}</option>`).join('')}</datalist>
          </label>
          <label class="studio-glass-field studio-glass-field-full">
            <span>Phone</span>
            <input type="tel" id="wizardClientPhone" value="${esc(clientPhone)}" placeholder="Optional" autocomplete="tel">
          </label>
        </div>
        ${renderClientProgramHints(bookClientId)}`,
      service: `
        <div class="studio-glass-service-picker">
          ${renderBookServicePicker(ctx, draftSvcId)}
        </div>
        ${draftSvc ? `<p class="studio-glass-hint">Client time ${draftClientDuration} min${clientEndTime ? ` · ends ~${fmtTime12(clientEndTime)}` : ''}${draftSchedulingDuration !== draftClientDuration ? ` · chair ${draftSchedulingDuration} min` : ''}</p>` : ''}`,
      confirm: `
        <p class="studio-glass-lead">Review and confirm this booking.</p>
        <div class="studio-glass-summary">
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">When</span>
            <div class="studio-glass-summary-value">
              <strong>${fmtDate(draftDate)}</strong>
              <span>${fmtTime12(draftTime)}${clientEndTime ? ` – ${fmtTime12(clientEndTime)}` : ''} · ${esc(chairLabel)}</span>
            </div>
          </div>
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">Client</span>
            <div class="studio-glass-summary-value">
              <strong>${esc(clientName || '—')}</strong>
              ${clientPhone ? `<span>${esc(clientPhone)}</span>` : ''}
            </div>
          </div>
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">Visit</span>
            <div class="studio-glass-summary-value">
              <strong>${esc(calendarBooking?.serviceName || serviceLabel)}</strong>
              ${calendarBooking?.mode === 'package_followup'
                ? `<span class="studio-glass-hint-credit">Prepaid visit — ${S().formatPrice(0)} at checkout</span>`
                : calendarBooking?.mode === 'consultation'
                  ? `<span class="studio-glass-hint">System consultation — enroll at register after visit</span>`
                  : calendarBooking?.mode === 'direct_service'
                    ? `<span class="studio-glass-hint">${S().formatPrice(calendarBooking.price || 0)} — collect at register</span>`
                    : calendarBooking?.mode === 'color_consult'
                      ? `<span class="studio-glass-hint">Color consultation${calendarBooking.fromPriceDisplay ? ` · ${esc(calendarBooking.fromPriceDisplay)}` : ''}</span>`
                      : ''}
            </div>
          </div>
          ${calendarBooking?.mode === 'package_followup' ? `
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">Program</span>
            <div class="studio-glass-summary-value">
              <strong>${esc(calendarBooking.programName)}</strong>
              <span>Visit ${calendarBooking.visitNumber} of ${calendarBooking.visitsIncluded}</span>
            </div>
          </div>` : ''}
        </div>
        ${renderBookWizardPreferences(ctx)}
        <label class="studio-glass-field studio-glass-field-full">
          <span>Internal notes</span>
          <textarea id="wizardNotes" rows="2" placeholder="Optional staff notes">${esc(notes)}</textarea>
        </label>`,
    };

    const stepTitle = { when: 'Pick a time', client: 'Client details', service: 'Visit type', confirm: 'Confirm booking' };
    const stepSubtitle = {
      when: 'Adjust the slot you chose on the calendar.',
      client: 'Search existing clients or enter someone new.',
      service: 'Prepaid clients pick a visit type — or book consultation, barber, or salon without a package.',
      confirm: 'Everything looks right? Book when ready.',
    };

    return `
      <div class="studio-glass-wizard" id="studioBookWizard">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-book-wizard-close aria-label="Close booking"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel" role="dialog" aria-modal="true" aria-labelledby="bookWizardTitle">
          <button type="button" class="studio-glass-wizard-close" data-book-wizard-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">New appointment</p>
          <h2 id="bookWizardTitle" class="studio-glass-wizard-title">${stepTitle[step]}</h2>
          <p class="studio-glass-wizard-sub">${stepSubtitle[step]}</p>
          <div class="studio-glass-progress" aria-hidden="true">
            <div class="studio-glass-progress-track"><span class="studio-glass-progress-fill" style="width:${progressPct}%"></span></div>
            <div class="studio-glass-progress-steps">
              ${BOOK_WIZARD_STEPS.map((s, i) => `
                <button type="button" class="studio-glass-progress-step${s.id === step ? ' active' : ''}${i < stepIdx ? ' done' : ''}"
                  data-book-wizard-step="${s.id}"${i > stepIdx ? ' disabled' : ''}>${s.label}</button>`).join('')}
            </div>
          </div>
          <div class="studio-glass-wizard-body">${stepPanels[step] || ''}</div>
          <div class="studio-glass-wizard-footer">
            ${stepIdx > 0 ? '<button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="bookWizardBack">Back</button>' : '<span></span>'}
            ${step === 'confirm'
              ? `<button type="button" class="studio-glass-btn studio-glass-btn-primary" id="bookWizardSubmit"${!availSlots.length ? ' disabled' : ''}>Book appointment</button>`
              : `<button type="button" class="studio-glass-btn studio-glass-btn-primary" id="bookWizardNext"${step === 'when' && !availSlots.length ? ' disabled' : ''}>Continue</button>`}
          </div>
        </div>
      </div>`;
  }

  function renderVisitFlowStepper(appt) {
    const VF = window.StudioVisitFlow;
    if (!VF) return '';
    const steps = VF.FLOW_STEPS;
    const statusOrder = steps.map((s) => s.id);
    const idx = statusOrder.indexOf(appt.status);
    const activeIdx = idx >= 0 ? idx : 0;
    const pct = ((activeIdx + 1) / steps.length) * 100;
    return `
      <div class="studio-visit-flow">
        <div class="studio-visit-flow-track"><span style="width:${pct}%"></span></div>
        <div class="studio-visit-flow-steps">
          ${steps.map((s, i) => `
            <span class="studio-visit-flow-step${i === activeIdx ? ' active' : ''}${i < activeIdx ? ' done' : ''}">${s.label}</span>`).join('')}
        </div>
      </div>`;
  }

  function renderIntakeField(form, field, intakeData) {
    const VF = window.StudioVisitFlow;
    const key = VF?.getFieldKey(field) || field;
    const label = VF?.getFieldLabel(field) || field;
    const type = typeof field === 'object' ? field.type || 'text' : 'text';
    const required = VF?.isFieldRequired(form, field);
    const formData = intakeData[form.id] || {};
    const value = VF?.getFieldValue(formData, field) || '';
    const placeholder = typeof field === 'object' ? field.placeholder || '' : '';
    const reqMark = required ? ' <em class="studio-intake-req">*</em>' : '';
    const common = `class="intake-field-input" data-intake-form="${form.id}" data-intake-field="${esc(key)}"`;

    if (type === 'textarea') {
      return `
        <label class="studio-glass-field studio-glass-field-full studio-intake-field">
          <span>${esc(label)}${reqMark}</span>
          <textarea ${common} rows="3" placeholder="${esc(placeholder || 'Client response')}">${esc(value)}</textarea>
        </label>`;
    }
    if (type === 'select') {
      const options = (typeof field === 'object' ? field.options : null) || ['Yes', 'No'];
      return `
        <label class="studio-glass-field studio-glass-field-full studio-intake-field">
          <span>${esc(label)}${reqMark}</span>
          <select ${common}>
            <option value="">Select…</option>
            ${options.map((opt) => `<option value="${esc(opt)}"${value === opt ? ' selected' : ''}>${esc(opt)}</option>`).join('')}
          </select>
        </label>`;
    }
    const inputType = type === 'date' ? 'date' : type === 'tel' ? 'tel' : 'text';
    return `
      <label class="studio-glass-field studio-glass-field-full studio-intake-field">
        <span>${esc(label)}${reqMark}</span>
        <input type="${inputType}" ${common} value="${esc(value)}" placeholder="${esc(placeholder || 'Client response')}">
      </label>`;
  }

  function renderIntakeEmailActions(apptId, clientEmail, emailedAt) {
    const VF = window.StudioVisitFlow;
    const portalUrl = VF?.buildIntakePortalUrl?.(apptId) || '';
    const emailHint = clientEmail
      ? `<span class="studio-intake-email-hint">${esc(clientEmail)}</span>`
      : '<span class="studio-intake-email-hint studio-intake-email-missing">No email on file — add in client profile</span>';
    const emailed = emailedAt
      ? `<span class="studio-intake-emailed-tag">Emailed ${new Date(emailedAt).toLocaleDateString()}</span>`
      : '';
    return `
      <div class="studio-intake-email-bar">
        <div class="studio-intake-email-copy">
          <strong>Send to client</strong>
          ${emailHint}
          ${emailed}
          ${portalUrl ? `<a class="studio-intake-portal-link" href="${esc(portalUrl)}" target="_blank" rel="noopener">Portal intake link</a>` : ''}
        </div>
        <div class="studio-intake-email-actions">
          <button type="button" class="studio-glass-btn studio-glass-btn-secondary studio-intake-email-btn" data-email-intake="${apptId}" data-email-mode="blank">Email blank forms</button>
          <button type="button" class="studio-glass-btn studio-glass-btn-secondary studio-intake-email-btn" data-email-intake="${apptId}" data-email-mode="current">Email progress</button>
          <button type="button" class="studio-glass-btn studio-glass-btn-secondary" data-print-intake="${apptId}" data-email-mode="blank">Print</button>
          <button type="button" class="studio-glass-btn studio-glass-btn-secondary studio-intake-email-btn" data-download-intake="${apptId}" data-email-mode="current">Download</button>
          ${portalUrl ? `<button type="button" class="studio-glass-btn studio-glass-btn-secondary" data-copy-intake-portal="${apptId}">Copy portal link</button>` : ''}
        </div>
      </div>`;
  }

  function renderIntakeWizardModal(ctx) {
    if (!ctx.studioIntakeWizardOpen || !ctx.studioIntakeApptId) return '';
    const appt = S().getAppointment(ctx.studioIntakeApptId);
    if (!appt) return '';
    const VF = window.StudioVisitFlow;
    const forms = VF?.getIntakeFormsForAppointment?.(appt) || VF?.INTAKE_FORMS || [];
    const step = ctx.studioIntakeStep || 0;
    const signed = ctx.studioIntakeSigned || appt.intakeForms || [];
    const skippedForms = ctx.studioIntakeSkippedForms || appt.intakeSkippedForms || [];
    const intakeData = ctx.studioIntakeData || appt.intakeData || {};
    const form = forms[step];
    if (!form) return '';
    const stepIdx = step;
    const progressPct = ((stepIdx + 1) / forms.length) * 100;
    const isSigned = signed.includes(form.id);
    const isSkipped = skippedForms.includes(form.id);
    const formReady = VF?.intakeFormReady(form, signed, intakeData, skippedForms);
    const canAdvance = isSkipped || formReady;
    const client = appt.clientId ? S().getClient(appt.clientId) : null;
    const clientEmail = client?.email || appt.clientEmail || '';

    return `
      <div class="studio-glass-wizard studio-visit-modal studio-intake-modal" id="studioIntakeModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-intake-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel studio-intake-panel-wide" role="dialog" aria-modal="true">
          <button type="button" class="studio-glass-wizard-close" data-intake-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">New client intake</p>
          <h2 class="studio-glass-wizard-title">${esc(appt.clientName)}</h2>
          <p class="studio-glass-wizard-sub">Step ${stepIdx + 1} of ${forms.length} — detailed forms &amp; signatures before the visit begins.</p>
          ${renderIntakeEmailActions(appt.id, clientEmail, appt.intakeEmailedAt)}
          <div class="studio-glass-progress" aria-hidden="true">
            <div class="studio-glass-progress-track"><span class="studio-glass-progress-fill" style="width:${progressPct}%"></span></div>
          </div>
          <div class="studio-glass-wizard-body studio-intake-wizard-body">
            <article class="studio-intake-form-card${isSigned ? ' is-signed' : ''}${isSkipped ? ' is-skipped' : ''}">
              <div class="studio-intake-form-head">
                <h3>${esc(form.label)}</h3>
                ${isSkipped ? '<span class="studio-intake-skipped-label">Skipped</span>' : form.required ? '<span class="studio-intake-required">Required</span>' : '<span class="studio-intake-optional">Optional</span>'}
              </div>
              <p class="studio-glass-lead">${esc(form.desc)}</p>
              ${form.intro ? `<p class="studio-intake-intro">${esc(form.intro)}</p>` : ''}
              ${VF?.renderFormPolicyLinksHtml?.(form, esc) || ''}
              ${(form.clauses || []).length ? `<ul class="studio-intake-checklist">${form.clauses.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
              <div class="studio-intake-fields">
                ${VF.normalizeFormFields(form).map((f) => renderIntakeField(form, f, intakeData)).join('')}
              </div>
              ${VF.renderSignaturePadHtml?.(form.id, intakeData[form.id] || {}, esc) || ''}
              ${isSkipped ? '<p class="studio-intake-skipped-note">This form was skipped — tap Continue or fill it out and sign to complete it now.</p>' : ''}
            </article>
          </div>
          <div class="studio-glass-wizard-footer studio-intake-wizard-footer">
            <div class="studio-intake-wizard-footer-main">
              ${stepIdx > 0 ? '<button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="intakeWizardBack">Back</button>' : '<span></span>'}
              ${stepIdx < forms.length - 1
                ? `<button type="button" class="studio-glass-btn studio-glass-btn-primary" id="intakeWizardNext"${!canAdvance ? ' disabled' : ''}>Continue</button>`
                : `<button type="button" class="studio-glass-btn studio-glass-btn-primary" id="intakeWizardFinish"${!canAdvance ? ' disabled' : ''}>Complete intake</button>`}
            </div>
            <div class="studio-intake-wizard-skip-row">
              <button type="button" class="studio-glass-btn studio-glass-btn-secondary studio-intake-skip-btn" id="intakeWizardSkip"${isSkipped ? ' disabled' : ''}>Skip this form</button>
              <button type="button" class="studio-glass-btn studio-intake-skip-all-btn" id="intakeWizardSkipAll">Skip all remaining</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderAllergyModal(ctx) {
    if (!ctx.studioAllergyModalOpen || !ctx.studioAllergyApptId) return '';
    const appt = S().getAppointment(ctx.studioAllergyApptId);
    if (!appt) return '';
    const allergies = S().getClientAllergies(appt.clientId, appt.clientPhone)
      || window.StudioVisitFlow?.getAllergiesText(appt)
      || '';
    if (!allergies) return '';
    return `
      <div class="studio-glass-wizard studio-allergy-modal" id="studioAllergyModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-allergy-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel studio-allergy-panel" role="alertdialog" aria-modal="true" aria-labelledby="allergyModalTitle">
          <button type="button" class="studio-glass-wizard-close" data-allergy-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow studio-allergy-eyebrow">Allergy alert</p>
          <h2 id="allergyModalTitle" class="studio-glass-wizard-title">${esc(appt.clientName)}</h2>
          <p class="studio-glass-wizard-sub">Review before starting any service.</p>
          <div class="studio-glass-wizard-body">
            <div class="studio-allergy-alert-card">
              <span class="studio-allergy-alert-icon" aria-hidden="true">⚠</span>
              <div>
                <strong>Known allergies</strong>
                <p>${esc(allergies)}</p>
              </div>
            </div>
          </div>
          <div class="studio-glass-wizard-footer">
            <span></span>
            <button type="button" class="studio-glass-btn studio-glass-btn-primary" data-allergy-close>Acknowledged</button>
          </div>
        </div>
      </div>`;
  }

  function getPostVisitFlowMeta(ctx) {
    if (!ctx.studioPostVisitApptId || !ctx.studioPostVisitAwaitingCheckout || ctx.studioPosMode === 'walkin') return null;
    const appt = S().getAppointment(ctx.studioPostVisitApptId);
    if (!appt) return null;
    const cartItems = ctx.studioPosCart?.items || [];
    const followUp = appt.clientId
      ? S().getProgramFollowUpBooking(appt.clientId, {
        serviceId: appt.serviceId,
        extOptions: appt.extOptions,
        programName: appt.programName,
        programId: appt.programId,
      })
      : null;
    const inactivePackageAppt = appt.clientId && S().appointmentUsesInactiveProgram(appt, appt.clientId);
    const inactiveFuture = appt.clientId
      ? S().getFuturePackageAppointmentsForInactivePrograms(appt.clientId).appointments.length > 0
      : false;
    const followProgram = followUp?.packageFields?.programId && appt.clientId
      ? (S().getClientProgramSummary(appt.clientId).programs || []).find((p) => p.id === followUp.packageFields.programId)
      : null;
    const followProgramInactive = followProgram && !S().isProgramEnrollmentActive(followProgram);
    const hasPrepaid = !!(followUp?.packageFields) && !inactivePackageAppt && !inactiveFuture && !followProgramInactive;
    const cartPkg = cartItems.find((i) => i.packageVisit && (i.packageVisitApplied || i.price === 0));
    const cartHasPkg = !!cartPkg || (!!appt.packageVisit && !inactivePackageAppt);
    const needsApply = hasPrepaid && !cartHasPkg;
    const pendingRebook = ctx.studioPostVisitPendingRebookApptId
      ? S().getAppointment(ctx.studioPostVisitPendingRebookApptId)
      : null;
    const followUpDone = !!pendingRebook || !!ctx.studioPostVisitFollowUpSkipped;
    let step = 'complete_payment';
    if (needsApply) step = 'apply_visit';
    else if (!followUpDone) step = 'book_followup';

    const program = appt.clientId && followUp?.packageFields?.programId
      ? (S().getClientProgramSummary(appt.clientId).programs || []).find((p) => p.id === followUp.packageFields.programId)
      : (appt.clientId ? (S().getClientProgramSummary(appt.clientId).programs || []).find((p) => p.visitsRemaining > 0) : null);

    const visitsRemainingAfter = cartPkg?.visitsRemaining != null
      ? Math.max(0, cartPkg.visitsRemaining - 1)
      : (program?.visitsRemaining ?? null);

    return {
      appt,
      step,
      hasPrepaid,
      cartHasPkg,
      cartPkg,
      followUp,
      pendingRebook,
      followUpDone,
      program,
      visitsRemainingAfter,
      visitBalanceDue: cartItems
        .filter((i) => i.postVisitServiceLine && (i.price || 0) > 0 && !i.packageVisit)
        .reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0),
      firstVisit: S().isFirstTimeClient(appt.clientId, appt.clientPhone),
      inactivePackageAppt,
      inactiveFuture,
    };
  }

  function renderPostVisitStepper(step, hasPrepaid) {
    const steps = hasPrepaid
      ? [
        { id: 'apply_visit', label: 'Apply visit' },
        { id: 'book_followup', label: 'Book follow-up' },
        { id: 'complete_payment', label: 'Complete payment' },
      ]
      : [
        { id: 'book_followup', label: 'Book follow-up' },
        { id: 'complete_payment', label: 'Complete payment' },
      ];
    const activeIdx = steps.findIndex((s) => s.id === step);
    return `
      <ol class="studio-post-visit-steps" aria-label="Visit checkout steps">
        ${steps.map((s, i) => `
          <li class="studio-post-visit-step${i === activeIdx ? ' is-active' : ''}${i < activeIdx ? ' is-done' : ''}">
            <span class="studio-post-visit-step-num">${i + 1}</span>
            <span class="studio-post-visit-step-label">${esc(s.label)}</span>
          </li>`).join('')}
      </ol>`;
  }

  function renderPostVisitRegisterStatus(ctx, dueTotal) {
    const meta = getPostVisitFlowMeta(ctx);
    if (!meta) return '';
    const { appt, step, cartHasPkg, cartPkg, pendingRebook, followUpDone, program, visitsRemainingAfter } = meta;
    const statusMeta = S().APPT_STATUS[appt.status] || {};
    const pkgLabel = cartHasPkg
      ? (cartPkg
        ? `Visit ${cartPkg.visitNumber}/${cartPkg.visitsIncluded} applied${cartPkg.programName ? ` · ${cartPkg.programName}` : ''}`
        : (appt.packageVisit ? S().getPackageVisitLabel(appt) : 'Applied'))
      : (meta.hasPrepaid ? 'Not applied — tap Apply visit above' : 'No prepaid visit on file');
    const followLabel = pendingRebook
      ? `${fmtDate(pendingRebook.date)} · ${fmtTime12(pendingRebook.startTime)}${pendingRebook.packageVisit ? ` · ${S().getPackageVisitLabel(pendingRebook)}` : ''}`
      : (ctx.studioPostVisitFollowUpSkipped ? 'Skipped' : (step === 'book_followup' ? 'Not scheduled yet' : 'Not scheduled'));
    const remainingLabel = visitsRemainingAfter != null
      ? `${visitsRemainingAfter} visit${visitsRemainingAfter !== 1 ? 's' : ''} remaining`
      : (program?.visitsRemaining != null ? `${program.visitsRemaining} remaining` : '—');

    return `
      <div class="studio-pos-visit-status">
        <p class="studio-pos-visit-status-title">Visit checkout</p>
        <dl class="studio-pos-visit-status-grid">
          <div class="studio-pos-visit-status-row">
            <dt>Appointment</dt>
            <dd><span class="studio-pos-visit-pill" style="--pill-color:${statusMeta.color || '#2563EB'}">${esc(statusMeta.label || appt.status)}</span> · ${esc(appt.serviceName)}</dd>
          </div>
          <div class="studio-pos-visit-status-row${cartHasPkg ? ' is-good' : (meta.hasPrepaid ? ' is-warn' : '')}">
            <dt>Package visit</dt>
            <dd>${esc(pkgLabel)}${cartHasPkg && remainingLabel !== '—' ? ` <em>(${esc(remainingLabel)})</em>` : ''}</dd>
          </div>
          <div class="studio-pos-visit-status-row${pendingRebook ? ' is-good' : ''}">
            <dt>Follow-up</dt>
            <dd>${esc(followLabel)}</dd>
          </div>
          <div class="studio-pos-visit-status-row studio-pos-visit-status-due">
            <dt>Due today</dt>
            <dd><strong>${S().formatPrice(dueTotal)}</strong></dd>
          </div>
        </dl>
      </div>`;
  }

  function renderPostVisitBanner(ctx) {
    const meta = getPostVisitFlowMeta(ctx);
    if (!meta) return '';
    const {
      appt, step, hasPrepaid, followUp, pendingRebook, visitBalanceDue, firstVisit,
    } = meta;
    const warrantySummary = appt.clientId ? S().getClientWarrantySummary(appt.clientId) : null;
    const lapsedWarranty = (warrantySummary?.lapsed || [])[0];
    const warrantyWarn = lapsedWarranty
      ? `<p class="studio-post-visit-warranty-warn"><strong>Warranty lapsed</strong> — ${esc(lapsedWarranty.programName)} needs a ${S().formatPrice(lapsedWarranty.warranty.reinstatementFee)} reinstatement at the register.</p>`
      : '';

    const inactiveWarn = meta.inactivePackageAppt || meta.inactiveFuture
      ? '<p class="studio-post-visit-inactive-warn"><strong>Package inactive or refunded</strong> — prepaid visit credit cannot be used. Cancel future prepaid appointments or charge full retail price.</p>'
      : '';

    const stepLead = {
      apply_visit: hasPrepaid
        ? `This client has a prepaid visit on file. Apply it now so today&apos;s service is covered before booking follow-up and payment.`
        : (meta.inactivePackageAppt || meta.inactiveFuture
          ? 'Prepaid visit credit is blocked until future appointments on the inactive package are canceled.'
          : ''),
      book_followup: firstVisit
        ? 'Present package options if needed, then book their next visit before completing payment.'
        : 'Book their follow-up visit on the calendar, or skip if they will call to schedule.',
      complete_payment: pendingRebook
        ? 'Follow-up is booked and the visit is applied. Complete payment to finish checkout.'
        : 'Ready to complete payment and close out this visit.',
    };

    let primaryAction = '';
    let secondaryActions = '';
    if (step === 'apply_visit') {
      primaryAction = '<button type="button" class="studio-glass-btn studio-glass-btn-primary studio-post-visit-cta" id="posApplyPackageVisitBtn">Apply visit</button>';
      if (visitBalanceDue > 0) {
        secondaryActions = `<p class="studio-post-visit-balance">Retail balance: <strong>${S().formatPrice(visitBalanceDue)}</strong> — will drop to <strong>${S().formatPrice(0)}</strong> when visit is applied.</p>`;
      }
      if (followUp?.displayName) {
        secondaryActions += `<p class="studio-post-visit-hint">${esc(followUp.displayName)} on file</p>`;
      }
    } else if (step === 'book_followup') {
      primaryAction = '<button type="button" class="studio-glass-btn studio-glass-btn-primary studio-post-visit-cta" id="posScheduleFollowUpBtn">Book follow-up</button>';
      secondaryActions = `
        <button type="button" class="studio-glass-btn studio-glass-btn-ghost" id="posSkipFollowUpBtn">Skip follow-up</button>
        ${hasPrepaid ? '<button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="posUseVisitTodayBtn">Same-day follow-up</button>' : ''}`;
    } else {
      primaryAction = '<span class="studio-post-visit-ready">Ready for payment — use <strong>Complete payment</strong> in the register.</span>';
    }

    return `
      <div class="studio-post-visit-banner studio-post-visit-banner--${step}" id="studioPostVisitBanner">
        <div class="studio-post-visit-banner-head">
          <span class="studio-post-visit-eyebrow">End of visit</span>
          <strong>${firstVisit ? 'First visit checkout' : 'Visit checkout'}</strong>
          <p>${esc(appt.clientName)} · ${esc(appt.serviceName)}</p>
          ${renderPostVisitStepper(step, hasPrepaid)}
          <p class="studio-post-visit-lead">${stepLead[step] || ''}</p>
          ${inactiveWarn}
          ${warrantyWarn}
        </div>
        <div class="studio-post-visit-actions">
          ${primaryAction}
          ${secondaryActions}
        </div>
      </div>`;
  }

  function renderRebookModal(ctx) {
    if (!ctx.studioRebookOpen || !ctx.studioRebookApptId || !ctx.studioRebookDraft) return '';
    const appt = S().getAppointment(ctx.studioRebookApptId);
    const draft = ctx.studioRebookDraft;
    if (!appt || !draft) return '';
    const RB = window.StudioRebook;
    const settings = S().getCalendarSettings();
    const svc = S().getService(draft.serviceId);
    const duration = draft.duration || S().parseDurationMin(svc?.duration);
    const availSlots = S().getAvailableSlots(draft.date, draft.column, duration);
    const alternates = RB?.getAlternateServices(appt, draft.serviceId) || [svc].filter(Boolean);
    const awaitingRegister = !!ctx.studioPostVisitAwaitingCheckout;
    const registerDone = !awaitingRegister && (appt.status === 'completed' || ctx.studioRebookSource === 'pos');
    const subLabel = awaitingRegister
      ? 'Book follow-up — you\'ll return to the register to apply prepaid visit and complete sale'
      : (registerDone ? 'Register complete — book their follow-up' : 'After register');
    const endTime = S().addMinutesToTime(draft.time, duration);
    const prepaid = !!draft.packageVisit;
    const canUseToday = prepaid || (appt.clientId && S().getProgramFollowUpBooking(appt.clientId, {
      serviceId: appt.serviceId,
      extOptions: appt.extOptions,
      programName: appt.programName,
    })?.packageFields);

    return `
      <div class="studio-glass-wizard studio-visit-modal studio-rebook-modal" id="studioRebookModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-rebook-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel studio-glass-wizard-panel-wide" role="dialog" aria-modal="true">
          <button type="button" class="studio-glass-wizard-close" data-rebook-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">Follow-up booking</p>
          <h2 class="studio-glass-wizard-title">Schedule follow-up</h2>
          <p class="studio-glass-wizard-sub">${esc(appt.clientName)} · ${subLabel}</p>
          <div class="studio-glass-wizard-body">
            <div class="studio-rebook-rec-card${prepaid ? ' is-prepaid' : ''}">
              <span class="studio-rebook-rec-label">${draft.sameDay ? 'Same day' : `Recommended ${esc(draft.intervalLabel || '')}`}</span>
              <strong>${esc(draft.serviceName)}</strong>
              ${prepaid ? '<span class="studio-rebook-prepaid-badge">Prepaid visit</span>' : ''}
              <p>${esc(draft.reason)}</p>
              ${prepaid
                ? '<span class="studio-rebook-rec-value studio-rebook-rec-prepaid">$0 — uses one prepaid visit</span>'
                : (draft.servicePrice ? `<span class="studio-rebook-rec-value">${S().formatPrice(draft.servicePrice)} visit value</span>` : '')}
              ${draft.programName && prepaid ? `<span class="studio-rebook-rec-hint">${esc(draft.programName)}${draft.visitNumber && draft.visitsIncluded ? ` · Visit ${draft.visitNumber} of ${draft.visitsIncluded}` : ''}</span>` : ''}
              ${!prepaid ? `<span class="studio-rebook-rec-hint">${esc(draft.businessNote || '')}</span>` : ''}
            </div>
            ${alternates.length > 1 ? `
              <div class="studio-rebook-service-pick">
                <span>Or choose service</span>
                <div class="studio-provider-subs">
                  ${alternates.map((s) => `
                    <button type="button" class="studio-cal-slot-chip studio-provider-sub${s.id === draft.serviceId ? ' active' : ''}"
                      data-rebook-service="${s.id}">${esc(S().shortName(s.name))}</button>`).join('')}
                </div>
              </div>` : ''}
            <div class="studio-glass-hero-slot studio-glass-hero-slot-compact studio-rebook-hero">
              <p class="studio-glass-hero-day">${fmtDate(draft.date)}</p>
              <p class="studio-glass-hero-time">${fmtTime12(draft.time)}${endTime ? ` – ${fmtTime12(endTime)}` : ''}</p>
              <p class="studio-glass-hero-meta">${esc(draft.chairLabel || settings.columnLabels?.[draft.column - 1] || `Chair ${draft.column}`)}</p>
            </div>
            <div class="studio-glass-fields">
              <label class="studio-glass-field">
                <span>Date</span>
                <input type="date" id="rebookDate" value="${draft.date}">
              </label>
              <label class="studio-glass-field">
                <span>Chair</span>
                <select id="rebookColumn">${Array.from({ length: settings.columns }, (_, i) => {
                  const n = i + 1;
                  return `<option value="${n}"${n === draft.column ? ' selected' : ''}>${esc(settings.columnLabels[i] || `Chair ${n}`)}</option>`;
                }).join('')}</select>
              </label>
              <div class="studio-glass-field studio-glass-field-full">
                <span>Available times</span>
                <input type="hidden" id="rebookTime" value="${draft.time}">
                ${renderSlotChipPicker(availSlots.length ? availSlots : S().getTimeSlots(), draft.time, 'rebook')}
                ${!availSlots.length ? '<small class="studio-glass-hint studio-glass-hint-warn">No open slots — try another chair or date.</small>' : ''}
              </div>
            </div>
          </div>
          <div class="studio-glass-wizard-footer">
            <button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="skipRebookBtn">Not now</button>
            ${canUseToday && !draft.sameDay ? '<button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="rebookUseTodayBtn">Use visit today</button>' : ''}
            <button type="button" class="studio-glass-btn studio-glass-btn-primary" id="confirmRebookBtn"${!availSlots.length ? ' disabled' : ''}>Schedule follow-up</button>
          </div>
        </div>
      </div>`;
  }

  function renderProviderDetailField(field, details) {
    const VF = window.StudioVisitFlow;
    const key = VF.getFieldKey(field);
    const label = VF.getFieldLabel(field);
    const value = VF.getFieldValue(details || {}, field);
    const type = field.type || 'text';
    if (type === 'textarea') {
      return `<label class="studio-glass-field studio-glass-field-full"><span>${esc(label)}</span><textarea rows="2" data-provider-detail="${esc(key)}" placeholder="${esc(field.placeholder || '')}">${esc(value)}</textarea></label>`;
    }
    if (type === 'select') {
      const options = field.options || [];
      return `<label class="studio-glass-field studio-glass-field-full"><span>${esc(label)}</span><select data-provider-detail="${esc(key)}"><option value="">Select…</option>${options.map((o) => `<option value="${esc(o)}"${value === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    }
    return `<label class="studio-glass-field studio-glass-field-full"><span>${esc(label)}</span><input type="text" data-provider-detail="${esc(key)}" value="${esc(value)}" placeholder="${esc(field.placeholder || '')}"></label>`;
  }

  function renderProviderWizardModal(ctx) {
    if (!ctx.studioProviderWizardOpen || !ctx.studioProviderApptId) return '';
    const appt = S().getAppointment(ctx.studioProviderApptId);
    if (!appt) return '';
    const VF = window.StudioVisitFlow;
    const flow = VF?.getProviderFlow(appt);
    const step = ctx.studioProviderStep || 'activity';
    const draft = ctx.studioProviderDraft || {};
    const activities = flow?.activities || [];
    const selectedActivity = draft.activityId ? VF.getActivity(flow, draft.activityId) : null;
    const selectedSubs = draft.subs || [];
    const activityConfig = draft.activityId ? VF.getActivityConfig(draft.activityId) : null;
    const suggestedServices = draft.activityId ? VF.getSuggestedBillableServices(appt, draft.activityId) : [];
    const addonOptions = VF.getProviderAddonOptions(appt);
    const selectedAddons = draft.addonIds || [];
    const draftPrimary = draft.lineItems?.[0]?.serviceId || '';
    const draftPrimarySvc = draftPrimary ? S().getService(draftPrimary) : null;
    const apptPrimary = VF?.resolveApptPrimaryBillableService?.(appt);
    const primaryId = (VF?.isBillableAppointmentService?.(draftPrimarySvc) ? draftPrimary : '')
      || apptPrimary?.id
      || (VF?.isBillableAppointmentService?.(S().getService(appt.serviceId)) ? appt.serviceId : '')
      || '';
    const checkoutPreview = draft.activityId ? VF.buildProviderPosLineItems(appt, {
      ...draft,
      lineItems: draft.lineItems?.length ? draft.lineItems : VF.resolveDefaultLineItems(appt, draft.activityId),
    }) : [];
    const checkoutTotal = checkoutPreview.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

    let body = '';
    if (step === 'activity') {
      body = `
        <p class="studio-glass-lead">What is the provider doing during this visit?</p>
        <p class="studio-glass-hint">${esc(flow?.label || 'Service')} · ${esc(appt.intendedService || appt.serviceName)}</p>
        <div class="studio-provider-activity-grid">
          ${activities.map((act) => `
            <button type="button" class="studio-provider-activity${draft.activityId === act.id ? ' selected' : ''}"
              data-provider-activity="${act.id}">
              <strong>${esc(act.label)}</strong>
              <span>${esc(act.desc)}</span>
            </button>`).join('')}
        </div>`;
    } else if (step === 'subs' && selectedActivity) {
      body = `
        <p class="studio-glass-lead">${esc(selectedActivity.label)} — what was completed today?</p>
        <div class="studio-provider-subs">
          ${(selectedActivity.subs || []).map((sub) => `
            <button type="button" class="studio-cal-slot-chip studio-provider-sub${selectedSubs.includes(sub) ? ' active' : ''}"
              data-provider-sub="${esc(sub)}">${esc(sub)}</button>`).join('')}
        </div>
        <p class="studio-glass-hint">Select all steps performed — used on the visit record and register receipt.</p>`;
    } else if (step === 'details' && selectedActivity) {
      const fields = activityConfig?.detailFields || [];
      body = `
        <p class="studio-glass-lead">${esc(selectedActivity.label)} — formula &amp; product details</p>
        ${fields.length
          ? `<div class="studio-provider-detail-fields">${fields.map((f) => renderProviderDetailField(f, draft.details)).join('')}</div>`
          : '<p class="studio-glass-hint">No extra fields for this activity — continue to set register charges.</p>'}
        <label class="studio-glass-field studio-glass-field-full">
          <span>Provider notes</span>
          <textarea id="providerSessionNotes" rows="2" placeholder="Optional session notes">${esc(draft.notes || '')}</textarea>
        </label>`;
    } else if (step === 'checkout' && selectedActivity) {
      body = `
        <p class="studio-glass-lead">What goes on the register for checkout?</p>
        <p class="studio-glass-hint">Primary service — tap to set the main charge. Add-ons bill separately.</p>
        <div class="studio-provider-checkout-section">
          <span class="studio-provider-checkout-label">Primary service</span>
          <div class="studio-provider-subs">
            ${suggestedServices.length ? suggestedServices.map((svc) => `
              <button type="button" class="studio-cal-slot-chip studio-provider-sub studio-provider-primary${primaryId === svc.id ? ' active' : ''}"
                data-provider-primary="${svc.id}">
                ${esc(svc.packageVisitLine ? svc.name : S().shortName(svc.name))} · ${S().formatPrice(svc.price || 0)}
              </button>`).join('') : `
              <p class="studio-glass-hint studio-glass-hint-warn">No billable services found — add-ons may still apply at checkout.</p>`}
          </div>
        </div>
        ${addonOptions.length ? `
          <div class="studio-provider-checkout-section">
            <span class="studio-provider-checkout-label">Add-ons completed</span>
            <div class="studio-provider-subs">
              ${addonOptions.map((svc) => `
                <button type="button" class="studio-cal-slot-chip studio-provider-sub${selectedAddons.includes(svc.id) ? ' active' : ''}"
                  data-provider-addon="${svc.id}">
                  ${esc(S().shortName(svc.name))} · ${S().formatPrice(svc.price || 0)}
                </button>`).join('')}
            </div>
          </div>` : ''}
        <div class="studio-provider-checkout-total">
          <span>Register preview</span>
          <strong>${S().formatPrice(checkoutTotal)}</strong>
          ${checkoutPreview.length ? `<small>${checkoutPreview.map((i) => esc(i.name)).join(' + ')}</small>` : '<small class="studio-glass-hint-warn">Tap a primary service above — prepaid visits can be $0</small>'}
        </div>`;
    } else if (step === 'confirm' && selectedActivity) {
      const detailSummary = VF.formatProviderDetailSummary(draft);
      body = `
        <div class="studio-glass-summary">
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">Activity</span>
            <div class="studio-glass-summary-value"><strong>${esc(selectedActivity.label)}</strong><span>${esc(selectedActivity.desc)}</span></div>
          </div>
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">Completed</span>
            <div class="studio-glass-summary-value"><strong>${selectedSubs.length ? esc(selectedSubs.join(', ')) : 'General session'}</strong></div>
          </div>
          ${detailSummary ? `
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">Details</span>
            <div class="studio-glass-summary-value"><span>${esc(detailSummary)}</span></div>
          </div>` : ''}
          <div class="studio-glass-summary-row">
            <span class="studio-glass-summary-label">Register total</span>
            <div class="studio-glass-summary-value"><strong>${S().formatPrice(checkoutTotal)}</strong>
              <span>${checkoutPreview.map((i) => `${esc(i.name)} ${S().formatPrice(i.price)}`).join(' · ') || 'No charges set'}</span>
            </div>
          </div>
        </div>`;
    }

    const providerSteps = VF?.PROVIDER_STEPS || [];
    const providerStepIdx = providerSteps.findIndex((s) => s.id === step);
    const providerProgressPct = providerStepIdx >= 0 ? ((providerStepIdx + 1) / providerSteps.length) * 100 : 20;
    const stepTitle = {
      activity: 'With provider',
      subs: 'What was done',
      details: 'Formula & details',
      checkout: 'Register charges',
      confirm: 'Confirm session',
    };
    const footer = step === 'activity'
      ? `<button type="button" class="studio-glass-btn studio-glass-btn-secondary" data-provider-close>Cancel</button>
         <button type="button" class="studio-glass-btn studio-glass-btn-primary" id="providerWizardNext"${!draft.activityId ? ' disabled' : ''}>Continue</button>`
      : step === 'confirm'
        ? `<button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="providerWizardBack">Back</button>
           <button type="button" class="studio-glass-btn studio-glass-btn-primary" id="providerWizardFinish">Save &amp; start session</button>`
        : `<button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="providerWizardBack">Back</button>
           <button type="button" class="studio-glass-btn studio-glass-btn-primary" id="providerWizardNext">Continue</button>`;

    return `
      <div class="studio-glass-wizard studio-visit-modal studio-provider-modal" id="studioProviderModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-provider-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel studio-glass-wizard-panel-wide" role="dialog" aria-modal="true">
          <button type="button" class="studio-glass-wizard-close" data-provider-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">Provider session</p>
          <h2 class="studio-glass-wizard-title">${stepTitle[step]}</h2>
          <p class="studio-glass-wizard-sub">${esc(appt.clientName)} · ${esc(appt.serviceName)}</p>
          <div class="studio-glass-progress" aria-hidden="true">
            <div class="studio-glass-progress-track"><span class="studio-glass-progress-fill" style="width:${providerProgressPct}%"></span></div>
          </div>
          <div class="studio-provider-wizard-steps">
            ${providerSteps.map((s, i) => `
              <span class="studio-provider-wizard-step${i === providerStepIdx ? ' active' : ''}${i < providerStepIdx ? ' done' : ''}">${s.label}</span>`).join('')}
          </div>
          <div class="studio-glass-wizard-body">${body}</div>
          <div class="studio-glass-wizard-footer">${footer}</div>
        </div>
      </div>`;
  }

  function renderApptModal(ctx) {
    if (!ctx.studioApptModalOpen || !ctx.selectedStudioAppointmentId) return '';
    const selected = S().getAppointment(ctx.selectedStudioAppointmentId);
    if (!selected) return '';
    const settings = S().getCalendarSettings();
    const statusMeta = S().APPT_STATUS[selected.status] || {};
    const chairLabel = settings.columnLabels?.[selected.column - 1] || `Chair ${selected.column}`;
    const rescheduling = ctx.studioApptReschedule;

    if (rescheduling) {
      const draft = ctx.studioRescheduleDraft || { date: selected.date, column: selected.column, time: selected.startTime };
      const rescheduleSlots = S().getAvailableSlots(draft.date, draft.column, selected.duration, selected.id);
      const draftChair = settings.columnLabels?.[draft.column - 1] || `Chair ${draft.column}`;
      return `
        <div class="studio-glass-wizard studio-appt-modal" id="studioApptModal">
          <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-appt-modal-close aria-label="Close"></button>
          <div class="studio-glass-wizard-panel studio-glass-panel" role="dialog" aria-modal="true" aria-labelledby="apptModalTitle">
            <button type="button" class="studio-glass-wizard-close" data-appt-modal-close aria-label="Close">×</button>
            <p class="studio-glass-wizard-eyebrow">Change time</p>
            <h2 id="apptModalTitle" class="studio-glass-wizard-title">${esc(selected.clientName)}</h2>
            <p class="studio-glass-wizard-sub">${esc(selected.serviceName)} · currently ${fmtDate(selected.date)} · ${fmtTime12(selected.startTime)}</p>
            <div class="studio-glass-wizard-body">
              ${renderPackageVisitBanner(selected)}
              <div class="studio-glass-hero-slot studio-glass-hero-slot-compact">
                <p class="studio-glass-hero-day">${fmtDate(draft.date)}</p>
                <p class="studio-glass-hero-time">${fmtTime12(draft.time)}</p>
                <p class="studio-glass-hero-meta">${esc(draftChair)}</p>
              </div>
              <form id="studioRescheduleForm" class="studio-glass-fields studio-glass-fields-stack">
                <input type="hidden" id="rescheduleApptId" value="${selected.id}">
                <input type="hidden" id="rescheduleTime" value="${draft.time}">
                <label class="studio-glass-field">
                  <span>Date</span>
                  <input type="date" id="rescheduleDate" value="${draft.date}">
                </label>
                <label class="studio-glass-field">
                  <span>Chair</span>
                  <select id="rescheduleColumn">${Array.from({ length: settings.columns }, (_, i) => {
                    const n = i + 1;
                    return `<option value="${n}"${n === draft.column ? ' selected' : ''}>${esc(settings.columnLabels[i] || `Chair ${n}`)}</option>`;
                  }).join('')}</select>
                </label>
                <div class="studio-glass-field studio-glass-field-full">
                  <span>Available times</span>
                  ${renderSlotChipPicker(rescheduleSlots, draft.time, 'reschedule')}
                </div>
              </form>
            </div>
            <div class="studio-glass-wizard-footer">
              <button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="cancelRescheduleBtn">Back</button>
              <button type="submit" form="studioRescheduleForm" class="studio-glass-btn studio-glass-btn-primary">Save new time</button>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="studio-glass-wizard studio-appt-modal" id="studioApptModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-appt-modal-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel" role="dialog" aria-modal="true" aria-labelledby="apptModalTitle">
          <button type="button" class="studio-glass-wizard-close" data-appt-modal-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">Appointment</p>
          <h2 id="apptModalTitle" class="studio-glass-wizard-title">${esc(selected.clientName)}${firstVisitBadge(selected.clientId, selected.clientPhone)}${intakeSkippedBadge(selected)}${allergyAlertBadge(selected)}</h2>
          <p class="studio-glass-wizard-sub">${esc(selected.intendedService || selected.serviceName)}${selected.source === 'website' ? ' · Web booking' : selected.source === 'client_portal' ? ' · Client portal booking' : ''}</p>
          <div class="studio-glass-wizard-body">
            ${renderAppointmentBookingPrepPanel(selected)}
            ${renderVisitFlowStepper(selected)}
            ${renderPackageVisitBanner(selected)}
            <div class="studio-glass-hero-slot studio-glass-hero-slot-compact" style="--status-color:${statusMeta.color || '#2563EB'}">
              <p class="studio-glass-hero-day">${fmtDate(selected.date)}</p>
              <p class="studio-glass-hero-time">${fmtTime12(selected.startTime)} – ${fmtTime12(selected.endTime)}</p>
              <p class="studio-glass-hero-meta">${esc(chairLabel)} · ${esc(S().getAppointmentCheckoutDisplay(selected).label)}</p>
              <span class="studio-appt-modal-status" style="--pill-color:${statusMeta.color || '#2563EB'}">${esc(statusMeta.label || selected.status)}</span>
            </div>
            ${selected.fromPriceDisplay ? `<p class="studio-glass-hint">${esc(selected.fromPriceDisplay)}</p>` : ''}
            ${(() => {
              const credit = S().getAppointmentCreditStatus(selected);
              if (!credit.eligible) return '';
              if (credit.paid) {
                return `<p class="studio-glass-hint studio-glass-hint-credit">$${credit.amount} scheduling deposit paid — credited to client balance</p>`;
              }
              return `<p class="studio-glass-hint studio-glass-hint-warn">$${selected.schedulingFee || S().SCHEDULING_FEE} deposit not received — no studio credit applied</p>`;
            })()}
            ${selected.clientId && S().getClientCreditBalance(selected.clientId) > 0 ? `<p class="studio-glass-hint">Account credit available: <strong>${S().formatPrice(S().getClientCreditBalance(selected.clientId))}</strong></p>` : ''}
            <div class="studio-appt-live-clock"
              data-appt-live-clock
              data-appt-status="${esc(selected.status)}"
              data-appt-date="${esc(selected.date)}"
              data-appt-start="${esc(selected.startTime)}"
              data-checked-in-at="${esc(selected.checkedInAt || '')}"
              data-in-progress-at="${esc(selected.inProgressAt || '')}"
              data-with-provider-at="${esc(selected.withProviderAt || '')}">
              <span class="studio-appt-clock-icon" aria-hidden="true"></span>
              <div class="studio-appt-clock-copy">
                <span class="studio-appt-clock-label">Live timer</span>
                <span class="studio-appt-clock-text" data-appt-timer>—</span>
              </div>
            </div>
            ${selected.providerSession?.activityLabel ? `
              <div class="studio-provider-session-banner">
                <span>Provider</span>
                <strong>${esc(window.StudioVisitFlow?.formatProviderSession(selected.providerSession) || selected.providerSession.activityLabel)}</strong>
              </div>` : ''}
            ${(() => {
              const posItems = S().getAppointmentPosCartItems(selected);
              const posTotal = posItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
              if (!posItems.length) return '';
              return `
              <div class="studio-appt-pos-preview${posTotal <= 0 ? ' is-zero' : ''}">
                <span>Register checkout</span>
                <strong>${S().formatPrice(posTotal)}</strong>
                <small>${posItems.map((i) => esc(i.name)).join(' · ')}</small>
                ${posTotal <= 0 ? '<em>Update provider session to set services before sending to POS.</em>' : ''}
              </div>`;
            })()}
            ${S().needsIntake(selected) ? `
              <div class="studio-intake-pending-banner">
                <span>New client — complete intake in studio, via portal link, or on paper</span>
                <div class="studio-intake-pending-actions">
                  <button type="button" class="btn-primary btn-sm" data-open-intake="${selected.id}">Start intake</button>
                  <button type="button" class="btn-secondary btn-sm" data-email-intake="${selected.id}" data-email-mode="blank">Email forms</button>
                  <button type="button" class="btn-secondary btn-sm" data-print-intake="${selected.id}" data-email-mode="blank">Print</button>
                  <button type="button" class="btn-secondary btn-sm" data-copy-intake-portal="${selected.id}">Copy portal link</button>
                </div>
              </div>` : selected.intakeSkipped ? `<p class="studio-glass-hint studio-glass-hint-warn">Intake skipped ${intakeSkippedBadge(selected)} — forms not completed</p>`
              : selected.intakeCompleted ? `
                <div class="studio-intake-done-bar">
                  <p class="studio-glass-hint studio-glass-hint-credit">Intake completed</p>
                  <button type="button" class="btn-secondary btn-sm" data-email-intake="${selected.id}" data-email-mode="current">Email copy</button>
                </div>` : ''}
            ${S().clientHasAllergies(selected.clientId, selected.clientPhone, selected) ? `
              <div class="studio-allergy-inline-banner">
                <span>Allergies on file</span>
                <button type="button" class="link-cta" data-view-allergies="${selected.id}">View allergies</button>
              </div>` : ''}
            <div class="studio-appt-quick studio-appt-quick-glass">
              ${selected.status === 'scheduled' ? `<button type="button" class="studio-glass-chip-btn studio-glass-chip-btn-primary" data-appt-flow="checkin" data-appt="${selected.id}">Check in</button>` : ''}
              ${selected.status === 'checked_in' ? (S().needsIntake(selected)
                ? `<button type="button" class="studio-glass-chip-btn studio-glass-chip-btn-primary" data-open-intake="${selected.id}">Complete intake</button>`
                : `<button type="button" class="studio-glass-chip-btn studio-glass-chip-btn-primary" data-appt-quick="in_progress" data-appt="${selected.id}">In progress</button>`) : ''}
              ${selected.status === 'in_progress' ? `<button type="button" class="studio-glass-chip-btn studio-glass-chip-btn-provider" data-appt-flow="provider" data-appt="${selected.id}">With provider</button>` : ''}
              ${selected.status === 'with_provider' ? `
                <span class="studio-glass-chip-btn studio-glass-chip-btn-provider-active">With provider</span>
                <button type="button" class="studio-glass-chip-btn studio-glass-chip-btn-muted" data-appt-flow="provider" data-appt="${selected.id}">Update session</button>` : ''}
              ${['in_progress', 'with_provider'].includes(selected.status) ? `<button type="button" class="studio-glass-chip-btn" data-appt-quick="completed" data-appt="${selected.id}">Complete</button>` : ''}
              ${selected.status === 'checked_in' && selected.intakeCompleted ? `<button type="button" class="studio-glass-chip-btn studio-glass-chip-btn-muted" data-appt-quick="no_show" data-appt="${selected.id}">No show</button>` : ''}
              ${selected.status === 'scheduled' ? `<button type="button" class="studio-glass-chip-btn studio-glass-chip-btn-muted" data-appt-quick="no_show" data-appt="${selected.id}">No show</button>` : ''}
            </div>
            <div class="studio-glass-status-row">
              <label class="studio-glass-field studio-glass-field-grow">
                <span>Status</span>
                <select id="apptStatusSelect">
                  ${Object.values(S().APPT_STATUS).map((st) => `<option value="${st.id}"${st.id === selected.status ? ' selected' : ''}>${st.label}</option>`).join('')}
                </select>
              </label>
              <button type="button" class="studio-glass-btn studio-glass-btn-secondary studio-glass-btn-inline" id="updateApptStatusBtn" data-appt="${selected.id}">Update</button>
            </div>
            ${selected.notes ? `<div class="studio-appt-modal-notes"><span>Notes</span><p>${esc(selected.notes)}</p></div>` : ''}
            <div class="studio-appt-modal-actions">
              ${apptMovable(selected.status) ? `<button type="button" class="studio-glass-btn studio-glass-btn-primary" id="apptMoveModeBtn" data-appt="${selected.id}">Move on calendar</button>` : ''}
              <button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="apptRescheduleBtn" data-appt="${selected.id}">Change time</button>
              <button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="apptToPosBtn" data-appt="${selected.id}">Send to POS</button>
              <button type="button" class="studio-glass-btn studio-glass-btn-danger" id="deleteApptBtn" data-appt="${selected.id}">Cancel appointment</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function pageHead(title, sub) {
    return `<div class="studio-pos-head">
      <div class="studio-pos-brand"><span class="studio-pos-mark">R</span><div>
        <p class="studio-pos-eyebrow">Onyx Studios</p>
        <h1>${title}</h1>
      </div></div>
      <p class="studio-pos-sub">${sub}</p>
    </div>`;
  }

  function renderDashboardBirthdayItem(item) {
    const ageLine = item.turningAge != null ? ` · turning ${item.turningAge}` : '';
    const contact = [item.phone, item.email].filter(Boolean).join(' · ');
    return `
      <li class="studio-timeline-click studio-birthday-item${item.isToday ? ' studio-birthday-today' : ''}" data-studio-birthday-client="${esc(item.clientId)}">
        <span class="studio-birthday-countdown${item.isToday ? ' is-today' : ''}">${esc(item.countdownLabel)}</span>
        <div>
          <strong>${esc(item.clientName)}</strong>
          <span>${esc(item.birthdayLabel)}${ageLine}${contact ? ` · ${esc(contact)}` : ''}</span>
        </div>
        <span class="studio-birthday-action">${item.isToday ? 'Send card →' : 'Open profile →'}</span>
      </li>`;
  }

  function renderDashboardBirthdays(stats) {
    const today = stats.birthdaysToday || [];
    const upcoming = stats.birthdaysUpcoming || [];
    const total = stats.birthdayCountWeek || 0;
    if (!total) {
      return `
        <section class="admin-panel studio-pos-panel studio-dash-birthdays studio-dash-birthdays-empty">
          <div class="admin-panel-head"><h2>Birthday cards</h2></div>
          <p class="admin-empty">No birthdays in the next 7 days. Add birthdays on client profiles to get daily reminders here.</p>
        </section>`;
    }
    return `
      <section class="admin-panel studio-pos-panel studio-dash-birthdays">
        <div class="admin-panel-head">
          <h2>Birthday cards</h2>
          <span class="admin-fine">${total} in the next 7 days</span>
        </div>
        ${today.length ? `
          <div class="studio-birthday-today-banner">
            <strong>${today.length === 1 ? 'Birthday today' : `${today.length} birthdays today`}</strong>
            <span>Send a birthday card before the day ends.</span>
          </div>
          <ul class="studio-pos-timeline studio-birthday-list">
            ${today.map((item) => renderDashboardBirthdayItem(item)).join('')}
          </ul>` : ''}
        ${upcoming.length ? `
          <h3 class="studio-dash-subhead">${today.length ? '7-day countdown' : '7-day countdown — send cards early'}</h3>
          <ul class="studio-pos-timeline studio-birthday-list">
            ${upcoming.map((item) => renderDashboardBirthdayItem(item)).join('')}
          </ul>` : ''}
      </section>`;
  }

  function renderDashboardAttentionItem(item) {
    const typeLabels = {
      late: 'Running late',
      no_show: 'No-show',
      prepaid: 'Book visit',
      past_due: 'Due for visit',
    };
    const clickAttr = item.appointmentId
      ? `data-studio-appt-dash="${item.appointmentId}"`
      : `data-studio-needs-book="${esc(item.clientId)}"`;
    return `
      <li class="studio-timeline-click studio-attention-item studio-attention-${item.type}" ${clickAttr}>
        <span class="studio-attention-tag">${typeLabels[item.type] || 'Action'}</span>
        <div>
          <strong>${esc(item.clientName)}</strong>
          <span>${esc(item.detail)}${item.serviceName ? ` · ${esc(item.serviceName)}` : ''}</span>
        </div>
        <span class="studio-attention-action">${item.appointmentId ? 'Open →' : 'Book →'}</span>
      </li>`;
  }

  function renderDashboard(ctx) {
    const stats = S().getDashboardStats();
    const settings = S().getSettings();
    const schedule = stats.todaySchedule || [];
    const attention = stats.needsNextVisit || [];
    const recentTxs = stats.recentTransactions || [];
    const onlineBookings = stats.pendingOnlineBookings || [];
    return `
      ${pageHead('Ops Dashboard', META().tagline || 'Private hair restoration studio — internal ops')}
      ${subnav('dashboard', stats.newInquiries, ctx.clinicSideNav)}
      ${onlineBookings.length ? `
        <section class="admin-panel studio-pos-panel studio-dash-online-bookings">
          <div class="admin-panel-head">
            <h2>New online bookings</h2>
            <span class="admin-fine">${onlineBookings.length} need pre-visit contact</span>
          </div>
          <p class="studio-dash-online-lead">Clients booked through the portal or website — review inspiration photos and preferences, then reach out before their visit if needed.</p>
          <ul class="studio-pos-timeline studio-online-booking-list">
            ${onlineBookings.map((appt) => renderDashboardOnlineBookingItem(appt)).join('')}
          </ul>
        </section>` : ''}
      <div class="studio-pos-kpi-grid studio-pos-kpi-grid-ops">
        <div class="studio-pos-kpi"><span>Today</span><strong>${stats.todayAppointments}</strong><small>on calendar</small></div>
        <div class="studio-pos-kpi accent"><span>Revenue (7d)</span><strong>${S().formatPrice(stats.weekRevenue)}</strong><small>register</small></div>
        <div class="studio-pos-kpi"><span>Chair use</span><strong>${stats.chairUtilization}%</strong><small>active today</small></div>
        <div class="studio-pos-kpi"><span>Completed</span><strong>${stats.completedToday}</strong><small>today</small></div>
        <div class="studio-pos-kpi${stats.birthdayCountToday ? ' accent' : ''}"><span>Birthdays</span><strong>${stats.birthdayCountToday || 0}</strong><small>today</small></div>
        <div class="studio-pos-kpi warn"><span>Late now</span><strong>${(stats.lateToday || []).length}</strong><small>awaiting arrival</small></div>
        <div class="studio-pos-kpi"><span>Need booking</span><strong>${attention.length}</strong><small>follow-up</small></div>
        <div class="studio-pos-kpi"><span>Card countdown</span><strong>${stats.birthdayCountWeek || 0}</strong><small>next 7 days</small></div>
        <div class="studio-pos-kpi${onlineBookings.length ? ' warn' : ''}"><span>Online bookings</span><strong>${onlineBookings.length}</strong><small>to review</small></div>
        <div class="studio-pos-kpi warn"><span>Inquiries</span><strong>${stats.newInquiries}</strong><small>new</small></div>
        <div class="studio-pos-kpi"><span>No-shows</span><strong>${stats.noShowsToday || 0}</strong><small>today</small></div>
        <div class="studio-pos-kpi"><span>Revenue (30d)</span><strong>${S().formatPrice(stats.monthRevenue)}</strong><small>register</small></div>
      </div>
      ${renderDashboardBirthdays(stats)}
      <div class="admin-split">
        <section class="admin-panel studio-pos-panel studio-dash-schedule">
          <div class="admin-panel-head"><h2>Today&apos;s schedule</h2>
            <button type="button" class="link-cta admin-link-btn" data-studio-tab="calendar">Open calendar</button>
          </div>
          ${schedule.length ? `<ul class="studio-pos-timeline studio-dash-timeline">
            ${schedule.map((a) => `
              <li class="studio-timeline-click studio-timeline-status-${a.status}${a.isLate ? ' studio-timeline-late' : ''}" data-studio-appt-dash="${a.id}">
                <span class="studio-pos-time">${esc(fmtTime12(a.startTime))}</span>
                <div>
                  <strong>${esc(a.clientName)}${firstVisitBadge(a.clientId, a.clientPhone)}${packageVisitBadge(a)}${onlineBookingBadge(a)}${bookingPrepBadge(a)}</strong>
                  <span>${esc(a.serviceName)} · Chair ${a.column}${a.isLate ? ` · <em class="studio-late-flag">${Math.floor(a.lateMinutes || 0)}m late</em>` : ''}</span>
                </div>
                <span class="admin-status-pill" style="--pill-color:${S().APPT_STATUS[a.status]?.color || '#2563EB'}">${esc(S().APPT_STATUS[a.status]?.label || a.status)}</span>
              </li>`).join('')}
          </ul>` : '<p class="admin-empty">No appointments today. Book from Calendar or POS.</p>'}
        </section>
        <section class="admin-panel studio-pos-panel studio-dash-attention">
          <div class="admin-panel-head"><h2>Needs attention</h2>
            <span class="admin-fine">${attention.length} client${attention.length !== 1 ? 's' : ''}</span>
          </div>
          ${attention.length ? `<ul class="studio-pos-timeline studio-attention-list">
            ${attention.map((item) => renderDashboardAttentionItem(item)).join('')}
          </ul>` : '<p class="admin-empty">No late arrivals or follow-ups right now.</p>'}
          <h3 class="studio-dash-subhead">Quick actions</h3>
          <div class="studio-pos-quick">
            <button type="button" class="btn-primary btn-sm" data-studio-tab="pos">New POS sale</button>
            <button type="button" class="btn-secondary btn-sm" data-studio-tab="calendar">Book appointment</button>
            <button type="button" class="btn-secondary btn-sm" data-studio-tab="clients" data-studio-add-client="1">Add client</button>
          </div>
          ${S().getFinanceUrl() ? `<p class="admin-fine">Financing: <button type="button" class="link-cta" data-open-finance>Open embedded CareCredit application</button></p>` : ''}
        </section>
      </div>
      ${recentTxs.length ? `<section class="admin-panel studio-pos-panel studio-ops-recent">
        <div class="admin-panel-head"><h2>Recent register</h2>
          <button type="button" class="link-cta admin-link-btn" data-studio-tab="transactions">View all</button>
        </div>
        <ul class="studio-pos-timeline">
          ${recentTxs.map((t) => `
            <li>
              <span class="studio-pos-time">${new Date(t.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              <div><strong>${esc(t.clientName)}</strong><span>${t.items?.length || 0} items · ${esc(t.paymentMethod)}</span></div>
              <strong class="studio-pos-price-inline">${S().formatPrice(t.total)}</strong>
            </li>`).join('')}
        </ul>
      </section>` : ''}`;
  }

  function calcPosTotals(cart, applyCredit, creditBalance) {
    const items = cart?.items || [];
    const grossSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
    const discount = Math.min(cart?.discount || 0, grossSubtotal);
    const netSubtotal = Math.max(0, grossSubtotal - discount);
    const shouldApply = applyCredit !== false && creditBalance > 0 && netSubtotal > 0;
    const creditApplied = shouldApply ? Math.min(creditBalance, netSubtotal) : 0;
    const dueTotal = Math.max(0, netSubtotal - creditApplied);
    return { grossSubtotal, discount, netSubtotal, creditApplied, dueTotal, shouldApply };
  }

  function renderCashRegisterModal(ctx) {
    if (!ctx.studioCashRegisterOpen) return '';
    const due = ctx.studioCashRegisterDue || 0;
    const tenderRaw = ctx.studioCashTenderInput || '';
    const tender = parseFloat(tenderRaw) || 0;
    const change = Math.max(0, Math.round((tender - due) * 100) / 100);
    const canComplete = due <= 0.005 || tender >= due - 0.005;
    const tenderDisplay = tenderRaw
      ? S().formatPrice(tender)
      : '$0.00';
    const numpadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'];

    return `
      <div class="studio-cash-register-modal" id="studioCashRegisterModal" role="dialog" aria-modal="true" aria-labelledby="cashRegisterTitle">
        <button type="button" class="studio-cash-register-backdrop" data-cash-register-close aria-label="Close cash register"></button>
        <div class="studio-cash-register">
          <div class="studio-cash-register-top">
            <p class="studio-cash-register-brand">Cash Register</p>
            <button type="button" class="studio-cash-register-close" data-cash-register-close aria-label="Close">×</button>
          </div>
          <p id="cashRegisterTitle" class="studio-cash-register-eyebrow">Enter cash received</p>
          <div class="studio-cash-register-display" aria-live="polite">
            <div class="studio-cash-lcd-row">
              <span class="studio-cash-lcd-label">Total due</span>
              <span class="studio-cash-lcd-value">${S().formatPrice(due)}</span>
            </div>
            <div class="studio-cash-lcd-row studio-cash-lcd-tender">
              <span class="studio-cash-lcd-label">Amount tendered</span>
              <span class="studio-cash-lcd-value studio-cash-lcd-input">${esc(tenderDisplay)}</span>
            </div>
            <div class="studio-cash-lcd-row studio-cash-lcd-change${canComplete && tender > 0 ? ' is-ready' : ''}">
              <span class="studio-cash-lcd-label">Change due</span>
              <span class="studio-cash-lcd-value">${S().formatPrice(change)}</span>
            </div>
          </div>
          <div class="studio-cash-quick-row">
            <button type="button" class="studio-cash-quick-btn" data-cash-quick="5">$5</button>
            <button type="button" class="studio-cash-quick-btn" data-cash-quick="10">$10</button>
            <button type="button" class="studio-cash-quick-btn" data-cash-quick="20">$20</button>
            <button type="button" class="studio-cash-quick-btn" data-cash-quick="50">$50</button>
            <button type="button" class="studio-cash-quick-btn" data-cash-quick="100">$100</button>
            <button type="button" class="studio-cash-quick-btn studio-cash-quick-exact" id="posCashExactBtn">Exact</button>
          </div>
          <div class="studio-cash-numpad">
            ${numpadKeys.map((key) => `
              <button type="button" class="studio-cash-numpad-key${key === 'C' ? ' is-clear' : ''}" data-cash-key="${key}">${key === 'C' ? 'CLR' : key}</button>`).join('')}
          </div>
          <div class="studio-cash-register-actions">
            <button type="button" class="studio-cash-register-cancel" data-cash-register-close>Cancel</button>
            <button type="button" class="studio-cash-register-complete" id="posCashRegisterComplete"${canComplete ? '' : ' disabled'}>
              ${canComplete ? `Complete · give ${S().formatPrice(change)} change` : 'Enter amount tendered'}
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderPosAuthModal(ctx) {
    if (!ctx.studioPosAuthOpen) return '';
    const action = ctx.studioPosAuthAction;
    const pending = ctx.studioPosAuthPending || {};
    const meta = {
      discount: {
        title: 'Apply discount',
        lead: `Manager approval required to apply a ${S().formatPrice(Math.max(0, Number(pending.discount) || 0))} discount.`,
      },
      price: {
        title: 'Change price',
        lead: `Manager approval required to set price to ${S().formatPrice(Math.max(0, Number(pending.price) || 0))}.`,
      },
      client_save: {
        title: 'Save client changes',
        lead: 'Admin PIN required to update this client profile.',
      },
      client_create: {
        title: 'Create client profile',
        lead: 'Admin PIN required to add a new client to the system.',
      },
      client_merge: {
        title: 'Merge client profiles',
        lead: (() => {
          const prev = pending.preview || {};
          const parts = [
            prev.appointments ? `${prev.appointments} appointment${prev.appointments !== 1 ? 's' : ''}` : '',
            prev.transactions ? `${prev.transactions} sale${prev.transactions !== 1 ? 's' : ''}` : '',
            prev.credits ? `${prev.credits} credit entr${prev.credits !== 1 ? 'ies' : 'y'}` : '',
            prev.programOverrides ? `${prev.programOverrides} program adjustment${prev.programOverrides !== 1 ? 's' : ''}` : '',
          ].filter(Boolean);
          const moveLine = parts.length ? ` This will move ${parts.join(', ')}.` : '';
          return `Admin PIN required to merge <strong>${esc(pending.secondaryName)}</strong> into <strong>${esc(pending.primaryName)}</strong>.${moveLine} The duplicate profile will be deleted.`;
        })(),
      },
      client_credit: {
        title: 'Adjust studio credit',
        lead: `Admin PIN required to ${Number(pending.amount) < 0 ? 'remove' : 'add'} <strong>${S().formatPrice(Math.abs(Number(pending.amount) || 0))}</strong> studio credit.`,
      },
      client_refund: {
        title: 'Issue refund',
        lead: `Admin PIN required to refund <strong>${S().formatPrice(Math.max(0, Number(pending.amount) || 0))}</strong> to the client.`,
      },
      client_program: {
        title: 'Save program adjustments',
        lead: `Admin PIN required to update <strong>${esc(pending.programName || 'program')}</strong> visits and package details.`,
      },
    };
    const { title, lead } = meta[action] || { title: 'Admin approval', lead: 'Enter the manager PIN to continue.' };

    return `
      <div class="studio-glass-wizard studio-visit-modal studio-pos-auth-modal" id="studioPosAuthModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-pos-auth-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel" role="dialog" aria-modal="true">
          <button type="button" class="studio-glass-wizard-close" data-pos-auth-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">Manager override</p>
          <h2 class="studio-glass-wizard-title">${title}</h2>
          <p class="studio-glass-wizard-sub">${lead}</p>
          <div class="studio-glass-wizard-body">
            <label class="studio-glass-field studio-glass-field-full">
              <span>Admin PIN</span>
              <input type="password" id="posAuthPin" inputmode="numeric" autocomplete="off" placeholder="Enter PIN" autofocus>
            </label>
          </div>
          <div class="studio-glass-wizard-footer">
            <button type="button" class="studio-glass-btn studio-glass-btn-secondary" data-pos-auth-close>Cancel</button>
            <button type="button" class="studio-glass-btn studio-glass-btn-primary" id="posAuthConfirmBtn">Confirm</button>
          </div>
        </div>
      </div>`;
  }

  function renderInactiveProgramModal(ctx) {
    if (!ctx.studioInactiveProgramModalOpen) return '';
    const data = ctx.studioInactiveProgramModalData || {};
    const details = data.details || [];
    const client = ctx.studioInactiveProgramModalClientId
      ? S().getClient(ctx.studioInactiveProgramModalClientId)
      : null;
    return `
      <div class="studio-glass-wizard studio-visit-modal" id="studioInactiveProgramModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-inactive-program-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel" role="dialog" aria-modal="true">
          <button type="button" class="studio-glass-wizard-close" data-inactive-program-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">Package inactive</p>
          <h2 class="studio-glass-wizard-title">Cancel future prepaid visits?</h2>
          <p class="studio-glass-wizard-sub">
            <strong>${esc(client?.name || 'This client')}</strong> has a refunded or voided package, but
            <strong>${details.length}</strong> future appointment${details.length !== 1 ? 's' : ''} still booked as prepaid visits.
            They cannot remain free — cancel them or charge full price at the register.
          </p>
          <div class="studio-glass-wizard-body">
            <ul class="studio-inactive-program-appt-list">
              ${details.map(({ appointment: a, program: p }) => `
                <li>
                  <strong>${fmtDate(a.date)} · ${esc(fmtTime12(a.startTime))}</strong>
                  <span>${esc(a.serviceName || 'Appointment')} · ${esc(p.programName || '')} · ${esc(p.enrollmentLabel || 'Inactive')}</span>
                </li>`).join('')}
            </ul>
          </div>
          <div class="studio-glass-wizard-footer">
            <button type="button" class="studio-glass-btn studio-glass-btn-secondary" data-inactive-program-close>Keep appointments</button>
            <button type="button" class="studio-glass-btn studio-glass-btn-primary" id="cancelInactiveProgramApptsBtn" data-client="${esc(ctx.studioInactiveProgramModalClientId || '')}">Cancel all prepaid appointments</button>
          </div>
        </div>
      </div>`;
  }

  function renderPhotoPromptModal(ctx) {
    if (!ctx.studioPhotoPromptOpen) return '';
    const kind = ctx.studioPhotoPromptKind;
    const appt = ctx.studioPhotoPromptApptId ? S().getAppointment(ctx.studioPhotoPromptApptId) : null;
    const isBefore = kind === 'before';
    const title = isBefore ? 'Take before photos' : 'Take after photos';
    const lead = isBefore
      ? `Provider is entering the room for <strong>${esc(appt?.clientName || 'this client')}</strong>. Capture before photos before starting the session.`
      : `Visit is wrapping up for <strong>${esc(appt?.clientName || 'this client')}</strong>. Capture after photos before scheduling the next visit.`;
    const clientId = appt?.clientId || '';
    const sessionPhotos = clientId && appt
      ? S().getClientPhotosForAppointment(clientId, appt.id, kind)
      : [];

    return `
      <div class="studio-glass-wizard studio-visit-modal studio-photo-prompt-modal" id="studioPhotoPromptModal">
        <button type="button" class="studio-glass-wizard-backdrop studio-glass-backdrop" data-photo-prompt-close aria-label="Close"></button>
        <div class="studio-glass-wizard-panel studio-glass-panel" role="dialog" aria-modal="true">
          <button type="button" class="studio-glass-wizard-close" data-photo-prompt-close aria-label="Close">×</button>
          <p class="studio-glass-wizard-eyebrow">${isBefore ? 'Provider check-in' : 'End of visit'}</p>
          <h2 class="studio-glass-wizard-title">${title}</h2>
          <p class="studio-glass-wizard-sub">${lead}</p>
          ${appt ? `
            <div class="studio-photo-prompt-meta">
              <span>${esc(appt.intendedService || appt.serviceName)}</span>
              <span>${fmtDate(appt.date)} · ${esc(fmtTime12(appt.startTime))}</span>
            </div>` : ''}
          <div class="studio-photo-prompt-capture">
            <button type="button" class="studio-glass-btn studio-glass-btn-primary" data-photo-prompt-camera="${esc(clientId)}" data-photo-kind="${esc(kind)}" data-photo-appt="${esc(appt?.id || '')}"${!clientId ? ' disabled' : ''}>Open camera</button>
            <button type="button" class="studio-glass-btn studio-glass-btn-secondary" data-photo-prompt-upload="${esc(clientId)}" data-photo-kind="${esc(kind)}" data-photo-appt="${esc(appt?.id || '')}"${!clientId ? ' disabled' : ''}>Upload photos</button>
            <input type="file" id="photoPromptUploadInput" accept="image/*" multiple hidden>
            <input type="file" id="photoPromptCameraInput" accept="image/*" capture="environment" hidden>
            ${!clientId ? '<p class="studio-glass-hint studio-glass-hint-warn">Link a client profile to save photos.</p>' : ''}
          </div>
          ${sessionPhotos.length ? `
            <div class="studio-photo-prompt-gallery">
              <p class="studio-photo-prompt-gallery-label">${sessionPhotos.length} photo${sessionPhotos.length !== 1 ? 's' : ''} saved to profile</p>
              <div class="studio-client-photo-grid is-compact">
                ${sessionPhotos.map((p) => renderClientPhotoThumb(p)).join('')}
              </div>
            </div>` : ''}
          <div class="studio-photo-prompt-tips">
            <p>Use consistent lighting and angles. Photos are saved to the client profile automatically.</p>
          </div>
          <div class="studio-glass-wizard-footer">
            <button type="button" class="studio-glass-btn studio-glass-btn-secondary" id="photoPromptSkipBtn">Skip for now</button>
            <button type="button" class="studio-glass-btn studio-glass-btn-primary" id="photoPromptConfirmBtn"${!sessionPhotos.length ? '' : ''}>${sessionPhotos.length ? 'Done' : 'Continue without photos'}</button>
          </div>
        </div>
      </div>`;
  }

  function renderPOS(ctx) {
    const cart = ctx.studioPosCart || { clientName: '', clientId: '', items: [], discount: 0 };
    const isWalkIn = ctx.studioPosMode === 'walkin';
    const search = (ctx.studioPosSearch || '').toLowerCase();

    let catalogHtml = '';
    let genderBar = '';
    let catBar = '';
    let catalogGridClass = 'studio-pos-service-grid';

    if (isWalkIn) {
      const shelfCats = S().getShelfCategories();
      const shelfCat = shelfCats.find((c) => c.id === ctx.studioShelfCategory)?.id || shelfCats[0]?.id || 'products';
      const shelfItems = S().filterShelfItems({ category: shelfCat, query: search });
      catalogHtml = renderShelfCards(shelfItems);
      const activeShelf = shelfCats.find((c) => c.id === shelfCat);
      catBar = `
        <div class="studio-pos-cat-bar">
          ${shelfCats.map((c) => `<button type="button" class="studio-pos-cat${c.id === shelfCat ? ' active' : ''}" data-shelf-category="${c.id}">${esc(c.label)}</button>`).join('')}
        </div>
        ${activeShelf?.description ? `<p class="studio-pos-walkin-note">${esc(activeShelf.description)}</p>` : ''}`;
    } else {
      const services = S().filterServices({ gender: ctx.studioGender, category: ctx.studioCategory });
      const cats = S().visibleCategories(ctx.studioGender);
      if (!cats.find((c) => c.id === ctx.studioCategory)) ctx.studioCategory = cats[0]?.id;
      const useFamilies = S().isPackageCategory(ctx.studioCategory);
      const families = useFamilies ? S().getProgramFamilies({ gender: ctx.studioGender, category: ctx.studioCategory }) : [];
      const filtered = search
        ? services.filter((s) => S().shortName(s.name).toLowerCase().includes(search))
        : services;
      catalogHtml = useFamilies
        ? renderFamilyCards(families, search, 'pos')
        : renderServiceCards(filtered);
      catalogGridClass += useFamilies ? ' studio-family-grid' : '';
      genderBar = `
        <div class="studio-pos-gender-bar">
          <button type="button" class="studio-pos-gender${ctx.studioGender === 'men' ? ' active' : ''}" data-studio-gender="men">Men</button>
          <button type="button" class="studio-pos-gender${ctx.studioGender === 'women' ? ' active' : ''}" data-studio-gender="women">Women</button>
        </div>`;
      catBar = `
        <div class="studio-pos-cat-bar">
          ${cats.map((c) => `<button type="button" class="studio-pos-cat${c.id === ctx.studioCategory ? ' active' : ''}" data-studio-category="${c.id}">${esc(c.label)}</button>`).join('')}
        </div>`;
    }

    const posClient = !isWalkIn && cart.clientId
      ? S().getClient(cart.clientId)
      : (!isWalkIn ? S().getClients().find((c) => c.name === cart.clientName) : null);
    const creditBalance = posClient ? S().getClientCreditBalance(posClient.id) : 0;
    const totals = calcPosTotals(cart, isWalkIn ? false : ctx.studioPosApplyCredit, creditBalance);
    const { grossSubtotal, discount, netSubtotal, creditApplied, dueTotal, shouldApply: applyCredit } = totals;

    const clientField = isWalkIn
      ? `<label class="form-field"><span>Walk-in label (optional)</span>
            <input type="text" id="posWalkInLabel" value="${esc(cart.clientName === 'Walk-in' ? '' : cart.clientName)}" placeholder="Walk-in">
            <p class="studio-pos-walkin-hint">No client profile created — shelf &amp; quick add-ons only. Programs and packages require a client sale.</p>
          </label>`
      : `<label class="form-field"><span>Client</span>
            <input type="text" id="posClientName" value="${esc(cart.clientName)}" placeholder="Client name" list="studioClientList">
            <datalist id="studioClientList">${S().getClients().slice(0, 20).map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
            ${cart.clientId && S().isFirstTimeClient(cart.clientId) ? `<p class="studio-pos-client-tag">${firstVisitBadge(cart.clientId)}</p>` : ''}
            ${creditBalance > 0 ? `<p class="studio-pos-credit-available">Studio credit on file: <strong>${S().formatPrice(creditBalance)}</strong></p>` : ''}
          </label>`;

    return `
      ${pageHead('POS', isWalkIn ? 'Walk-in shelf sales — retail & quick add-ons, no profile required' : 'Ring up services and present pricing to clients in-studio')}
      ${subnav('pos', ctx.newInquiries, ctx.clinicSideNav)}
      ${flashBanner(ctx.studioFlash)}
      ${!isWalkIn ? renderPostVisitBanner(ctx) : ''}
      <div class="studio-pos-mode-bar">
        <button type="button" class="studio-pos-mode${!isWalkIn ? ' active' : ''}" data-pos-mode="client">Client sale</button>
        <button type="button" class="studio-pos-mode${isWalkIn ? ' active' : ''}" data-pos-mode="walkin">Walk-in</button>
      </div>
      <div class="studio-pos-toolbar">
        <input type="search" id="posServiceSearch" class="studio-search" placeholder="${isWalkIn ? 'Search shelf items…' : 'Search services…'}" value="${esc(ctx.studioPosSearch || '')}">
      </div>
      ${genderBar}
      ${catBar}
      <div class="studio-pos-layout">
        <section class="studio-pos-catalog">
          <div class="${catalogGridClass}">${catalogHtml || `<p class="admin-empty">${search ? 'No items match your search.' : 'No items in this category.'}</p>`}</div>
        </section>
        <aside class="studio-pos-register studio-pos-panel${isWalkIn ? ' studio-pos-register-walkin' : ''}${ctx.studioPostVisitApptId && !isWalkIn ? ' studio-pos-register-postvisit' : ''}">
          <h2>${isWalkIn ? 'Walk-in register' : 'Register'}</h2>
          ${!isWalkIn && ctx.studioPostVisitApptId ? renderPostVisitRegisterStatus(ctx, dueTotal) : ''}
          ${clientField}
          ${!isWalkIn && !ctx.studioPostVisitApptId ? renderPosProgramVisitPanel(cart.clientId || posClient?.id, cart.items) : ''}
          ${!isWalkIn ? renderPosWarrantyPanel(cart.clientId || posClient?.id, cart.items) : ''}
          <div class="studio-pos-cart">
            ${cart.items.length ? cart.items.map((item, idx) => `
              <div class="studio-pos-cart-line${item.priceOverride ? ' has-override' : ''}${item.packageVisit ? ' is-pkg-visit' : ''}${item.warrantyReinstatement ? ' is-warranty-reinstate' : ''}${item.postVisitServiceLine && (item.price || 0) > 0 ? ' is-visit-balance' : ''}">
                <div class="studio-pos-cart-line-main">
                  <span>${esc(item.name)}${item.qty > 1 ? ` ×${item.qty}` : ''}${item.packageVisit ? `<small class="studio-cart-pkg-visit">Visit ${item.visitNumber || '?'}/${item.visitsIncluded || '?'} · prepaid</small>` : ''}${item.postVisitServiceLine && (item.price || 0) > 0 && item.prepaidAvailable ? '<small class="studio-cart-visit-balance">Package visit available — apply to zero out</small>' : ''}${item.warrantyReinstatement ? '<small class="studio-cart-warranty-tag">Warranty reinstatement</small>' : ''}${item.extOptions?.paymentPlan === 'quarterly' ? '<small class="studio-cart-quarterly">1st quarterly payment</small>' : ''}</span>
                  <span class="studio-pos-line-total">${item.packageVisitApplied && item.originalRetailPrice ? `<s class="studio-pos-line-was">${S().formatPrice(item.originalRetailPrice)}</s> ` : ''}${S().formatPrice(item.price * (item.qty || 1))}</span>
                  <button type="button" class="studio-pos-remove" data-pos-remove="${idx}">×</button>
                </div>
                <div class="studio-pos-line-adjust">
                  <label class="studio-pos-price-field">
                    <span>Price</span>
                    <input type="number" min="0" step="0.01" class="studio-pos-price-input" data-pos-price-input="${idx}" value="${item.price}">
                  </label>
                  <button type="button" class="btn-secondary btn-sm" data-pos-apply-price="${idx}">Set</button>
                  ${(item.priceOverride && item.originalPrice != null) || (item.packageVisitApplied && item.originalRetailPrice != null)
    ? `<small class="studio-pos-price-was">Was ${S().formatPrice(item.originalPrice ?? item.originalRetailPrice)}</small>`
    : ''}
                </div>
              </div>`).join('') : '<p class="admin-empty">Add services from the catalog.</p>'}
          </div>
          <div class="studio-pos-adjust-block">
            <label class="studio-pos-discount-field">
              <span>Discount ($)</span>
              <input type="number" min="0" step="0.01" id="posDiscountInput" value="${discount > 0 ? discount : ''}" placeholder="0.00">
            </label>
            <button type="button" class="btn-secondary btn-sm" id="posApplyDiscountBtn">Apply</button>
          </div>
          <div class="studio-pos-cart-total"><span>Subtotal</span><strong>${S().formatPrice(grossSubtotal)}</strong></div>
          ${discount > 0 ? `<div class="studio-pos-cart-credit"><span>Discount</span><strong>−${S().formatPrice(discount)}</strong></div>` : ''}
          ${discount > 0 ? `<div class="studio-pos-cart-total"><span>After discount</span><strong>${S().formatPrice(netSubtotal)}</strong></div>` : ''}
          ${creditApplied ? `<div class="studio-pos-cart-credit"><span>Studio credit</span><strong>−${S().formatPrice(creditApplied)}</strong></div>` : ''}
          <div class="studio-pos-cart-total studio-pos-cart-due"><span>Due today</span><strong>${S().formatPrice(dueTotal)}</strong></div>
          ${!isWalkIn && creditBalance > 0 && cart.items.length ? `
            <label class="studio-pos-apply-credit">
              <input type="checkbox" id="posApplyCredit" ${applyCredit ? 'checked' : ''}>
              <span>Apply studio credit (${S().formatPrice(Math.min(creditBalance, netSubtotal))})</span>
            </label>` : ''}
          ${cart.items.length ? '<button type="button" class="btn-secondary btn-sm btn-full" id="posClearCartBtn">Clear cart</button>' : ''}
          <label class="form-field"><span>Payment</span>
            <select id="posPaymentMethod">
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              ${isWalkIn ? '' : '<option value="financing">Financing</option>'}
            </select>
          </label>
          ${(() => {
            const inPostVisit = !isWalkIn && !!ctx.studioPostVisitApptId && !!ctx.studioPostVisitAwaitingCheckout;
            const postMeta = inPostVisit ? getPostVisitFlowMeta(ctx) : null;
            const onPaymentStep = !inPostVisit || postMeta?.step === 'complete_payment';
            const checkoutLabel = inPostVisit ? 'Complete payment' : 'Complete sale';
            const checkoutHint = inPostVisit && !onPaymentStep
              ? `<p class="studio-pos-checkout-hint">${postMeta?.step === 'apply_visit' ? 'Apply the prepaid visit above before completing payment.' : 'Book follow-up or tap Skip follow-up above before completing payment.'}</p>`
              : (inPostVisit && !postMeta
                ? '<p class="studio-pos-checkout-hint">Finish the visit checkout steps above before completing payment.</p>'
                : '');
            const showCheckout = !inPostVisit || onPaymentStep;
            return `${checkoutHint}${showCheckout
              ? `<button type="button" class="btn-primary btn-full" id="posCheckoutBtn" ${!cart.items.length ? 'disabled' : ''}>${checkoutLabel}</button>`
              : '<button type="button" class="btn-primary btn-full" id="posCheckoutBtn" disabled>Complete payment</button>'}`;
          })()}
          <button type="button" class="btn-secondary btn-full" id="posPresentBtn" ${!cart.items.length ? 'disabled' : ''}>Present pricing →</button>
          ${!isWalkIn && S().getFinanceUrl() ? `<button type="button" class="btn-secondary btn-full studio-finance-link" data-open-finance>Open financing application</button>` : ''}
        </aside>
      </div>
      ${isWalkIn ? '' : renderProgramModal({ ...ctx, studioProgramModalMode: 'pos' })}
      ${!isWalkIn && ctx.studioRebookOpen ? renderRebookModal(ctx) : ''}
      ${ctx.studioPresentOpen ? `
      <div id="posPresentOverlay" class="studio-pos-present-fullscreen">
        <button type="button" class="studio-pos-present-close" id="posPresentCloseBtn">Close</button>
        <div class="studio-pos-present-inner">
          <h2>Onyx Studios</h2>
          <h3>${esc(cart.clientName || (ctx.studioPosMode === 'walkin' ? 'Walk-in' : 'Client'))}</h3>
          <ul>${cart.items.map((i) => `<li><span>${esc(i.name)}${i.qty > 1 ? ` ×${i.qty}` : ''}</span><strong>${S().formatPrice(i.price * (i.qty || 1))}</strong></li>`).join('')}</ul>
          ${discount > 0 ? `<p class="studio-pos-present-discount">Discount −${S().formatPrice(discount)}</p>` : ''}
          <p class="studio-pos-present-total">Total ${S().formatPrice(dueTotal)}</p>
          ${S().getFinanceUrl() ? `<button type="button" class="btn-primary btn-sm studio-finance-link" data-open-finance data-finance-amount="${dueTotal}" data-finance-label="Cart total">Apply for financing</button>` : ''}
        </div>
      </div>` : ''}`;
  }

  function renderFinanceOverlay(ctx) {
    if (!ctx.studioFinanceOpen) return '';
    const fin = ctx.studioFinanceContext || {};
    const amount = fin.amount ? S().formatPrice(fin.amount) : '';
    const hasWidget = !!S().getFinanceMerchantId();
    return `
      <div id="studioFinanceOverlay" class="studio-finance-fullscreen" role="dialog" aria-modal="true" aria-labelledby="studioFinanceTitle">
        <div class="studio-finance-shell">
          <header class="studio-finance-head">
            <div>
              <p class="studio-eyebrow">${esc(META().brand || 'Onyx Studios')}</p>
              <h2 id="studioFinanceTitle">CareCredit financing</h2>
              <p class="studio-finance-lead">${fin.label
                ? `Financing for <strong>${esc(fin.label)}</strong>${amount ? ` · ${esc(amount)}` : ''}`
                : 'Apply or pre-qualify without leaving the studio portal.'}
              ${fin.clientName ? `<br><span class="studio-finance-client">${esc(fin.clientName)}</span>` : ''}</p>
            </div>
            <div class="studio-finance-head-actions">
              <button type="button" class="studio-finance-close studio-glass-btn studio-glass-btn-secondary" id="studioFinanceCloseBtn">Close</button>
            </div>
          </header>
          <div class="studio-finance-embed-wrap">
            <div id="studioFinanceEmbed" class="studio-finance-embed" data-finance-mode="${hasWidget ? 'widget' : 'iframe'}"></div>
          </div>
          <p class="studio-finance-foot">Powered by CareCredit · Synchrony Bank. Secure application stays on this screen${hasWidget ? ' via the official CareCredit widget' : ''}.</p>
        </div>
      </div>`;
  }

  function renderPricing(ctx) {
    const services = S().filterServices({ gender: ctx.studioGender, category: ctx.studioCategory });
    const cats = S().visibleCategories(ctx.studioGender);
    const programs = S().groupPrograms(services.filter((s) => s.isPackage));

    const isExtCat = S().isExtensionCategory(ctx.studioCategory);
    const programCards = isExtCat
      ? renderFamilyCards(programs, '', 'pos')
      : programs.map((grp) => `
        <article class="studio-program-card${grp.featured ? ' featured' : ''}">
          ${grp.featured ? '<span class="studio-pos-badge">Popular</span>' : ''}
          <h3>${esc(grp.base)}</h3>
          <div class="studio-program-tiers">
            ${grp.services.map((svc) => {
              const plan = S().paymentType(svc.name) || 'Standard';
              const visitsLabel = S().formatPackageVisitsLabel(svc, plan);
              return `
              <div class="studio-program-tier">
                <span class="studio-program-plan">${esc(plan)}</span>
                <strong>${S().formatPrice(svc.price)}</strong>
                <small>${visitsLabel ? esc(visitsLabel) : esc(svc.duration)}</small>
              </div>`;
            }).join('')}
          </div>
        </article>`).join('');

    const editRows = services.map((svc) => `
      <tr data-service-id="${svc.id}">
        <td>${esc(S().shortName(svc.name))}</td>
        <td><input type="number" class="studio-price-edit" data-field="price" value="${svc.price}" min="0" step="1"></td>
        <td><input type="text" class="studio-price-edit" data-field="duration" value="${esc(svc.duration)}"></td>
        <td>${svc.appointmentsIncluded || '—'}</td>
        <td>${S().paymentType(svc.name) || '—'}</td>
        <td><button type="button" class="btn-secondary btn-sm studio-save-price" data-service="${svc.id}">Save</button></td>
      </tr>`).join('');

    return `
      ${pageHead('Pricing', 'Programs, packages, and service rates')}
      ${subnav('pricing', ctx.newInquiries, ctx.clinicSideNav)}
      ${settingsSubnav('pricing')}
      <div class="studio-pos-gender-bar">
        <button type="button" class="studio-pos-gender${ctx.studioGender === 'men' ? ' active' : ''}" data-studio-gender="men">Men</button>
        <button type="button" class="studio-pos-gender${ctx.studioGender === 'women' ? ' active' : ''}" data-studio-gender="women">Women</button>
      </div>
      <div class="studio-pos-cat-bar">
        ${cats.map((c) => `<button type="button" class="studio-pos-cat${c.id === ctx.studioCategory ? ' active' : ''}" data-studio-category="${c.id}">${esc(c.label)}</button>`).join('')}
      </div>
      ${programs.length ? `<section class="studio-program-section">
        <h2 class="studio-section-title">Programs &amp; packages</h2>
        ${isExtCat ? `<p class="studio-ext-length-note studio-program-section-lead"><strong>${esc(S().getExtensionLeadFamily())}</strong> is our signature method on the Butterfly Bar. Other methods are available when your consult calls for a different approach.</p>` : ''}
        <div class="studio-program-grid${isExtCat ? ' studio-family-grid' : ''}">${programCards}</div>
      </section>` : ''}
      ${renderProgramModal({ ...ctx, studioProgramModalMode: 'pos' })}
      <h2 class="studio-section-title">All services</h2>
      <div class="studio-pos-pricing-cards">
        ${services.filter((s) => !s.isPackage).map((svc) => `
          <article class="studio-pos-price-card${svc.featured ? ' featured' : ''}">
            ${svc.featured ? '<span class="studio-pos-badge">Popular</span>' : ''}
            <h3>${esc(S().shortName(svc.name))}</h3>
            <p class="studio-pos-price-lg">${S().formatPrice(svc.price)}</p>
            <p class="studio-pos-meta">${esc(svc.duration)}</p>
          </article>`).join('')}
      </div>
      <section class="admin-panel studio-pos-panel">
        <div class="admin-panel-head"><h2>Edit prices</h2>
          <button type="button" class="btn-secondary btn-sm" id="saveAllPricesBtn">Save all</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table admin-table-sm studio-pos-table">
            <thead><tr><th>Service</th><th>Price</th><th>Duration</th><th>Visits</th><th>Plan</th><th></th></tr></thead>
            <tbody>${editRows}</tbody>
          </table>
        </div>
      </section>`;
  }

  function renderCalendar(ctx) {
    const date = ctx.studioCalendarDate || S().todayISO();
    const settings = S().getCalendarSettings();
    const slots = S().getTimeSlots();
    const allAppts = S().getAppointments().filter((a) => a.status !== 'canceled');
    const selected = ctx.selectedStudioAppointmentId
      ? S().getAppointment(ctx.selectedStudioAppointmentId)
      : null;
    const week = ctx.studioCalendarView === 'week';
    const dates = week ? S().weekDates(date) : [date];
    const dayAppts = allAppts.filter((a) => a.date === date);
    const chairFilter = ctx.studioCalChairFilter || 0;

    const grid = week
      ? renderCalWeekGridV2(dates, allAppts, settings, slots, chairFilter || null)
      : renderCalDayGridV2(date, dayAppts, settings, slots, chairFilter || null);

    const bookGender = ctx.studioBookGender || ctx.studioGender || 'men';
    const bookCat = ctx.studioBookCategory || (bookGender === 'men' ? 'program' : 'womens_program');
    const defaultSvc = S().filterServices({ gender: bookGender, category: bookCat }).find((s) => s.isPackage)
      || S().filterServices({ gender: bookGender, category: bookCat })[0]
      || S().getServices()[0];
    const draftSvcId = ctx.studioApptServiceId || defaultSvc?.id;
    const draftSvc = S().getService(draftSvcId);
    const draftSchedulingDuration = draftSvc ? S().getSchedulingDurationMin(draftSvc) : 60;
    const draftDate = ctx.studioApptDraftDate || ctx.studioPrefill?.date || date;
    const draftCol = ctx.studioApptDraftCol || ctx.studioPrefill?.column || 1;
    const availSlots = S().getAvailableSlots(draftDate, draftCol, draftSchedulingDuration);
    const draftTime = ctx.studioApptDraftTime || ctx.studioPrefill?.time || availSlots[0] || '09:00';
    const hasDraft = !ctx.studioBookWizardOpen && (ctx.studioApptDraftDate || ctx.studioPrefill?.date);

    return `
      ${pageHead('Calendar', 'Schedule appointments across chairs — day or week view')}
      ${subnav('calendar', ctx.newInquiries, ctx.clinicSideNav)}
      ${flashBanner(ctx.studioFlash, ctx.studioFlashType)}
      ${renderBonusPoolPanel(date)}
      ${statusLegend()}
      ${hasDraft ? `
        <div class="studio-cal-draft-banner">
          <span>Draft booking · <strong>${fmtDate(draftDate)}</strong> · ${fmtTime12(draftTime)} · ${esc(settings.columnLabels?.[draftCol - 1] || `Chair ${draftCol}`)}</span>
          <div class="studio-cal-draft-banner-actions">
            <button type="button" class="btn-primary btn-sm" id="resumeBookWizardBtn">Continue</button>
            <button type="button" class="btn-secondary btn-sm" id="cancelBookDraftBtn">Discard</button>
          </div>
        </div>` : ''}
      ${ctx.studioCalMoveMode && selected ? `
        <div class="studio-cal-move-banner">
          <span>Moving <strong>${esc(selected.clientName)}</strong> — click an open slot on the calendar</span>
          <button type="button" class="btn-secondary btn-sm" id="cancelMoveModeBtn">Cancel</button>
        </div>` : `
        <p class="studio-cal-drag-hint">Drag the <strong>⋮⋮</strong> handle to move · click an open slot to book · click an appointment to manage</p>`}
      <div class="studio-cal-toolbar">
        <div class="studio-cal-nav">
          <button type="button" class="btn-secondary btn-sm" data-cal-shift="-1">←</button>
          <button type="button" class="btn-secondary btn-sm" data-cal-today>Today</button>
          <button type="button" class="btn-secondary btn-sm" data-cal-shift="1">→</button>
          <input type="date" id="calJumpDate" class="studio-cal-date-input" value="${date}">
          <strong>${week ? `Week of ${fmtDate(dates[0])}` : fmtDate(date)}</strong>
        </div>
        <div class="studio-cal-toolbar-right">
          <select id="calChairFilter" class="studio-cal-filter">
            <option value="0"${!chairFilter ? ' selected' : ''}>All chairs</option>
            ${Array.from({ length: settings.columns }, (_, i) => {
              const n = i + 1;
              return `<option value="${n}"${chairFilter === n ? ' selected' : ''}>${esc(settings.columnLabels[i] || `Chair ${n}`)}</option>`;
            }).join('')}
          </select>
          <div class="studio-cal-view-toggle">
            <button type="button" class="studio-pos-tab${!week ? ' active' : ''}" data-cal-view="day">Day</button>
            <button type="button" class="studio-pos-tab${week ? ' active' : ''}" data-cal-view="week">Week</button>
          </div>
        </div>
      </div>
      <div class="studio-cal-layout studio-cal-layout-full${ctx.studioCalMoveMode && selected ? ' studio-cal-layout-move' : ''}">
        <div class="studio-cal-grid-wrap studio-pos-panel studio-cal-grid-full${ctx.studioCalMoveMode ? ' is-move-mode' : ''}">${grid}</div>
      </div>
      ${renderBookWizardModal(ctx)}
      ${renderApptModal(ctx)}
      ${renderRebookModal(ctx)}
      ${renderProgramModal({ ...ctx, studioCategory: bookCat, studioGender: bookGender, studioProgramModalMode: 'book' })}`;
  }

  function formatPhotoTimestamp(iso) {
    if (!iso) return 'Not recorded';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  function photoKindLabel(kind) {
    const labels = { before: 'Before', after: 'After', progress: 'Progress', profile: 'Profile' };
    return labels[kind] || 'Photo';
  }

  function renderClientPhotoThumb(photo, options = {}) {
    if (!photo?.dataUrl) return '';
    const deletable = options.deletable !== false;
    return `
      <figure class="studio-client-photo-thumb">
        <a href="${esc(photo.dataUrl)}" target="_blank" rel="noopener" class="studio-client-photo-link">
          <img src="${esc(photo.dataUrl)}" alt="${esc(photo.label || photoKindLabel(photo.kind))}" loading="lazy">
        </a>
        <figcaption>
          <span class="studio-client-photo-kind">${esc(photoKindLabel(photo.kind))}</span>
          <time>${new Date(photo.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>
          ${deletable ? `<button type="button" class="studio-client-photo-delete" data-delete-client-photo="${esc(photo.id)}" data-client-photo-owner="${esc(photo.clientId)}" aria-label="Delete photo">×</button>` : ''}
        </figcaption>
      </figure>`;
  }

  function renderClientPhotoGallery(clientId, photos, options = {}) {
    const compact = !!options.compact;
    const showActions = options.showActions !== false;
    const uploadId = options.uploadInputId || 'clientPhotoUploadInput';
    const cameraId = options.cameraInputId || 'clientPhotoCameraInput';
    return `
      <section class="studio-client-photos-section${compact ? ' is-compact' : ''}">
        ${showActions ? `
          <div class="studio-client-photo-actions">
            <button type="button" class="btn-primary btn-sm" data-client-photo-camera="${esc(clientId)}">Take photo</button>
            <button type="button" class="btn-secondary btn-sm" data-client-photo-upload="${esc(clientId)}">Upload files</button>
            <input type="file" id="${uploadId}" accept="image/*" multiple hidden>
            <input type="file" id="${cameraId}" accept="image/*" capture="environment" hidden>
          </div>` : ''}
        ${photos.length ? `
          <div class="studio-client-photo-grid">
            ${photos.map((p) => renderClientPhotoThumb(p, { deletable: options.deletable })).join('')}
          </div>` : `<p class="admin-empty">${options.emptyText || 'No photos on file yet — use the camera or upload button to add progress shots.'}</p>`}
      </section>`;
  }

  function renderClientPhotosTab(selected) {
    const photos = S().getClientPhotos(selected.id);
    return `
      <div class="studio-client-photos-tab">
        <p class="studio-client-section-lead">Progress, before/after, and reference photos saved to this client profile. Use camera on iPad or phone for in-session captures.</p>
        ${renderClientPhotoGallery(selected.id, photos)}
      </div>`;
  }

  function renderClientDuplicateBanner(selected, dupGroups, mergeSecondaryId) {
    if (!selected || !dupGroups.length) return '';
    const others = dupGroups.flatMap((g) =>
      g.clients.filter((c) => c.id !== selected.id)
    );
    const unique = [...new Map(others.map((c) => [c.id, c])).values()];
    if (!unique.length) return '';
    const selectedSecondary = mergeSecondaryId || unique[0]?.id || '';

    return `
      <div class="studio-client-dup-banner">
        <div class="studio-client-dup-banner-copy">
          <strong>Possible duplicate profile${unique.length > 1 ? 's' : ''}</strong>
          <p>${dupGroups.map((g) => esc(g.reason)).join(' · ')} — merge into this record to combine visits, credits, and notes.</p>
        </div>
        <div class="studio-client-merge-controls">
          <select id="clientMergeSelect" class="studio-client-merge-select">
            ${unique.map((c) => `
              <option value="${c.id}"${c.id === selectedSecondary ? ' selected' : ''}>
                ${esc(c.name)}${c.phone ? ` · ${esc(c.phone)}` : ''}${c.email ? ` · ${esc(c.email)}` : ''}
              </option>`).join('')}
          </select>
          <button type="button" class="btn-secondary btn-sm" id="clientMergeBtn">Merge into ${esc(selected.name)}</button>
        </div>
      </div>`;
  }

  function renderClientVisitNotes(visitRecords, clientId) {
    const withNotes = visitRecords.filter((v) =>
      v.notes || v.providerSession?.notes || v.providerSession?.activityLabel || v.beforePhotosAt || v.afterPhotosAt
    );
    if (!withNotes.length) {
      return '<p class="admin-empty">No visit notes recorded yet.</p>';
    }
    const VF = window.StudioVisitFlow;
    return `
      <div class="studio-client-visit-list">
        ${withNotes.map((v) => {
          const sessionLabel = v.providerSession
            ? (VF?.formatProviderSession(v.providerSession) || v.providerSession.activityLabel)
            : '';
          const sessionNotes = v.providerSession?.notes || '';
          const visitPhotos = S().getClientPhotosForAppointment(clientId, v.appointmentId);
          const beforePhotos = visitPhotos.filter((p) => p.kind === 'before');
          const afterPhotos = visitPhotos.filter((p) => p.kind === 'after');
          return `
            <article class="studio-client-visit-card">
              <header class="studio-client-visit-head">
                <div>
                  <strong>${esc(v.serviceName)}</strong>
                  <span>${fmtDate(v.date)} · ${esc(fmtTime12(v.startTime))}</span>
                </div>
                <span class="admin-status-pill" style="--pill-color:${S().APPT_STATUS[v.status]?.color || '#6B7280'}">${S().APPT_STATUS[v.status]?.label || v.status}</span>
              </header>
              ${v.packageVisit ? `<p class="studio-client-visit-tag">Prepaid program visit${v.programName ? ` · ${esc(v.programName)}` : ''}</p>` : ''}
              <dl class="studio-client-visit-photos">
                <div><dt>Before photos</dt><dd>${formatPhotoTimestamp(v.beforePhotosAt)}${beforePhotos.length ? ` · ${beforePhotos.length} saved` : ''}</dd></div>
                <div><dt>After photos</dt><dd>${formatPhotoTimestamp(v.afterPhotosAt)}${afterPhotos.length ? ` · ${afterPhotos.length} saved` : ''}</dd></div>
              </dl>
              ${visitPhotos.length ? `
                <div class="studio-client-visit-photo-grid">
                  ${visitPhotos.map((p) => renderClientPhotoThumb(p, { deletable: false })).join('')}
                </div>` : ''}
              ${sessionLabel ? `<p class="studio-client-visit-provider"><strong>Provider session</strong> — ${esc(sessionLabel)}</p>` : ''}
              ${sessionNotes ? `<blockquote class="studio-client-visit-quote">${esc(sessionNotes)}</blockquote>` : ''}
              ${v.notes ? `<div class="studio-client-visit-notes"><strong>Appointment notes</strong><pre>${esc(v.notes)}</pre></div>` : ''}
              <button type="button" class="btn-secondary btn-sm studio-client-visit-open" data-studio-appt-dash="${v.appointmentId}">Open appointment</button>
            </article>`;
        }).join('')}
      </div>`;
  }

  function renderClientIntakeHistory(visitRecords) {
    const VF = window.StudioVisitFlow;
    const forms = VF?.INTAKE_FORMS || [];
    const withIntake = visitRecords.filter((v) => v.intakeCompleted || v.intakeSkipped || (v.intakeForms || []).length);
    if (!withIntake.length) {
      return '<p class="admin-empty">No intake forms on file yet — completed at first visit check-in.</p>';
    }
    return `
      <div class="studio-client-intake-list">
        ${withIntake.map((v) => `
          <article class="studio-client-intake-card">
            <header class="studio-client-visit-head">
              <div>
                <strong>${esc(v.serviceName)}</strong>
                <span>${fmtDate(v.date)} · ${esc(fmtTime12(v.startTime))}</span>
              </div>
              <span class="studio-client-intake-badge${v.intakeSkipped ? ' is-skipped' : ''}">${v.intakeSkipped ? 'Skipped' : v.intakeCompleted ? 'Complete' : 'Partial'}</span>
            </header>
            <ul class="studio-client-intake-forms">
              ${forms.map((f) => {
                const signed = (v.intakeForms || []).includes(f.id);
                const skipped = (v.intakeSkippedForms || []).includes(f.id);
                const data = (v.intakeData || {})[f.id] || {};
                const normFields = VF.normalizeFormFields(f);
                const filled = normFields.filter((field) => VF.getFieldValue(data, field));
                return `
                  <li class="studio-client-intake-form${signed ? ' is-signed' : ''}${skipped ? ' is-skipped' : ''}">
                    <div class="studio-client-intake-form-head">
                      <strong>${esc(f.label)}</strong>
                      <span>${skipped ? 'Skipped' : signed ? 'Signed' : 'Not signed'}${f.required ? ' · Required' : ''}</span>
                    </div>
                    ${filled.length ? `
                      <dl class="studio-client-intake-fields">
                        ${filled.map((field) => `
                          <div><dt>${esc(VF.getFieldLabel(field))}</dt><dd>${esc(VF.getFieldValue(data, field))}</dd></div>`).join('')}
                      </dl>` : (signed ? '<p class="studio-client-intake-empty">Signed — no field data captured.</p>' : '')}
                  </li>`;
              }).join('')}
            </ul>
            <div class="studio-client-intake-email-row">
              <button type="button" class="btn-secondary btn-sm" data-email-intake="${v.appointmentId}" data-email-mode="current">Email copy to client</button>
              <button type="button" class="btn-secondary btn-sm" data-download-intake="${v.appointmentId}" data-email-mode="current">Download HTML</button>
            </div>
          </article>`).join('')}
      </div>`;
  }

  function renderClientManagePanel(selected, summary, ctx) {
    const creditBalance = S().getClientCreditBalance(selected.id);
    const mergeCandidates = S().getMergeCandidatesForClient(selected.id, ctx.studioClientMergeSearch || '');
    const selectedNameKey = (selected.name || '').trim().toLowerCase();
    const defaultMerge = mergeCandidates.find((c) =>
      (c.name || '').trim().toLowerCase() === selectedNameKey
    )?.id || mergeCandidates[0]?.id || '';
    const selectedMerge = (ctx.studioClientMergeSecondaryId && mergeCandidates.some((c) => c.id === ctx.studioClientMergeSecondaryId))
      ? ctx.studioClientMergeSecondaryId
      : defaultMerge;
    const mergePreview = selectedMerge ? S().previewClientMerge(selected.id, selectedMerge) : null;
    const programs = summary?.programs || [];
    const refundableTxs = (S().getClientRefundableTransactions
      ? S().getClientRefundableTransactions(selected.id)
      : S().getClientTransactions(selected.id).filter((t) => S().getRefundableAmount(t) > 0)
    ).slice(0, 12);

    return `
      <section class="studio-client-manage">
        <p class="studio-client-pin-notice">All account adjustments require the admin PIN.</p>

        <article class="studio-client-manage-card">
          <h3>Merge profiles</h3>
          <p class="studio-client-section-lead">Combine another client record into <strong>${esc(selected.name)}</strong>. Appointments, register history, credits, and notes move to this profile.${mergeCandidates.length && selectedNameKey && mergeCandidates.some((c) => (c.name || '').trim().toLowerCase() === selectedNameKey) ? ' Matching names are listed first.' : ''}</p>
          <div class="studio-client-merge-manual">
            <input type="search" id="clientMergeSearch" class="studio-search" placeholder="Search clients to merge…" value="${esc(ctx.studioClientMergeSearch || '')}">
            <select id="clientManualMergeSelect" class="studio-client-merge-select">
              ${mergeCandidates.length
                ? mergeCandidates.map((c) => `
                  <option value="${c.id}"${c.id === selectedMerge ? ' selected' : ''}>
                    ${esc(c.name)}${c.phone ? ` · ${esc(c.phone)}` : ''}${c.email ? ` · ${esc(c.email)}` : ''}
                  </option>`).join('')
                : '<option value="">No other clients match</option>'}
            </select>
            <button type="button" class="btn-secondary btn-sm" id="clientManualMergeBtn" ${mergeCandidates.length ? '' : 'disabled'}>Merge selected profile</button>
          </div>
          ${mergePreview ? `
            <p class="studio-client-merge-preview">
              Ready to merge <strong>${esc(mergePreview.secondary.name)}</strong> into <strong>${esc(mergePreview.primary.name)}</strong>:
              ${[
                mergePreview.appointments ? `${mergePreview.appointments} appointment${mergePreview.appointments !== 1 ? 's' : ''}` : '',
                mergePreview.transactions ? `${mergePreview.transactions} sale${mergePreview.transactions !== 1 ? 's' : ''}` : '',
                mergePreview.credits ? `${mergePreview.credits} credit entr${mergePreview.credits !== 1 ? 'ies' : 'y'}` : '',
                mergePreview.creditBalance ? `${S().formatPrice(mergePreview.creditBalance)} credit balance` : '',
                mergePreview.programOverrides ? `${mergePreview.programOverrides} program adjustment${mergePreview.programOverrides !== 1 ? 's' : ''}` : '',
              ].filter(Boolean).join(' · ') || 'No linked records found — profile and notes will still combine.'}
            </p>` : ''}
        </article>

        <article class="studio-client-manage-card">
          <h3>Studio credit</h3>
          <p class="studio-client-section-lead">Current balance: <strong>${S().formatPrice(creditBalance)}</strong></p>
          <form id="clientCreditForm" class="admin-goals-form studio-client-manage-form">
            <input type="hidden" name="clientId" value="${selected.id}">
            <label class="form-field"><span>Amount ($)</span>
              <input type="number" id="clientCreditAmount" step="0.01" placeholder="e.g. 29 or -15" required>
              <small>Use a negative amount to remove credit.</small>
            </label>
            <label class="form-field"><span>Reason / notes</span>
              <input type="text" id="clientCreditNotes" placeholder="Goodwill credit, correction, etc.">
            </label>
            <button type="submit" class="btn-primary btn-sm">Apply credit (PIN required)</button>
          </form>
        </article>

        <article class="studio-client-manage-card">
          <h3>Issue refund</h3>
          <p class="studio-client-section-lead">Refund all or part of a completed register sale. Partial refunds can be issued until the sale is fully refunded.</p>
          ${refundableTxs.length ? `
            <form id="clientRefundForm" class="admin-goals-form studio-client-manage-form">
              <input type="hidden" name="clientId" value="${selected.id}">
              <label class="form-field"><span>Sale to refund</span>
                <select id="clientRefundTx" required>
                  ${refundableTxs.map((t) => `
                    <option value="${t.id}" data-refundable="${S().getRefundableAmount(t)}">
                      ${new Date(t.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      · ${S().formatPrice(t.total)} sale
                      · ${S().formatPrice(S().getRefundableAmount(t))} refundable
                      · ${esc((t.items || []).map((i) => i.name).join(', '))}
                    </option>`).join('')}
                </select>
              </label>
              <label class="form-field"><span>Refund amount ($)</span>
                <input type="number" id="clientRefundAmount" min="0.01" step="0.01" required>
                <small id="clientRefundMaxHint">Max refundable shown on selected sale.</small>
              </label>
              <label class="form-field"><span>Notes</span>
                <input type="text" id="clientRefundNotes" placeholder="Reason for refund">
              </label>
              <button type="submit" class="btn-primary btn-sm">Issue refund (PIN required)</button>
            </form>` : '<p class="admin-empty">No refundable sales on this account.</p>'}
        </article>

        <article class="studio-client-manage-card">
          <h3>Hair warranty</h3>
          <p class="studio-client-section-lead">Package hair warranty requires maintenance visits within the recommended window plus a ${S().getPackageWarranty().gracePeriodDays || 14}-day grace period. Lapsed coverage needs a ${S().formatPrice(S().getPackageWarranty().lateFee || 50)} reinstatement at POS.</p>
          ${programs.filter((p) => p.warranty?.applies).length ? `
            <div class="studio-client-warranty-manage-list">
              ${programs.filter((p) => p.warranty?.applies).map((p) => {
                const ov = S().getProgramOverride(selected.id, p.id);
                const statusVal = ov?.warrantyStatus || 'auto';
                return `
                  <form class="studio-client-warranty-adjust-form admin-goals-form" data-client-warranty-form="${p.id}">
                    <div class="studio-client-program-adjust-head">
                      <div>
                        <strong>${esc(p.programName)}</strong>
                        ${renderWarrantyStatusBadge(p.warranty)}
                      </div>
                    </div>
                    ${renderWarrantyDetailBlock(p.warranty, true)}
                    <div class="studio-client-program-adjust-grid">
                      <label class="form-field"><span>Warranty status</span>
                        <select name="warrantyStatus">
                          <option value="auto"${statusVal === 'auto' || !statusVal ? ' selected' : ''}>Auto (from visit dates)</option>
                          <option value="active"${statusVal === 'active' ? ' selected' : ''}>Force active</option>
                          <option value="lapsed"${statusVal === 'lapsed' ? ' selected' : ''}>Force lapsed</option>
                          <option value="waived"${statusVal === 'waived' ? ' selected' : ''}>Waived</option>
                        </select>
                      </label>
                      <label class="form-field studio-client-field-full"><span>Warranty notes</span>
                        <input type="text" name="warrantyNotes" value="${esc(ov?.warrantyNotes || '')}" placeholder="Staff notes on warranty">
                      </label>
                    </div>
                    <button type="submit" class="btn-primary btn-sm">Save warranty (PIN required)</button>
                    ${p.warranty?.needsReinstatement ? `<button type="button" class="btn-secondary btn-sm" data-client-warranty-pos="${p.id}">Send ${S().formatPrice(p.warranty.reinstatementFee)} reinstatement to POS</button>` : ''}
                    ${p.warranty?.history?.length ? renderWarrantyHistoryList(p.warranty.history, 5) : ''}
                  </form>`;
              }).join('')}
            </div>` : '<p class="admin-empty">No package programs with warranty tracking on this account.</p>'}
        </article>

        <article class="studio-client-manage-card">
          <h3>Program &amp; package adjustments</h3>
          <p class="studio-client-section-lead">Override visit counts, per-visit value, or void a package. Used visits offset adds to completed visits (use negative to restore a visit).</p>
          ${programs.length ? `
            <div class="studio-client-program-adjust-list">
              ${programs.map((p) => {
                const ov = S().getProgramOverride(selected.id, p.id);
                return `
                  <form class="studio-client-program-adjust-form admin-goals-form" data-client-program-form="${p.id}">
                    <input type="hidden" name="programId" value="${p.id}">
                    <div class="studio-client-program-adjust-head">
                      <div>
                        <strong>${esc(p.programName)}</strong>
                        <span>${esc(p.paymentLabel)} · enrolled ${new Date(p.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div class="studio-client-program-adjust-badges">
                        ${renderProgramEnrollmentBadge(p)}
                        ${p.hasOverride ? '<span class="studio-client-adjust-badge">Adjusted</span>' : ''}
                      </div>
                    </div>
                    <p class="studio-client-program-adjust-live">
                      Live: <strong>${p.visitsUsed}/${p.visitsIncluded}</strong> used
                      · <strong>${p.visitsScheduled}</strong> scheduled
                      · <strong>${p.visitsRemaining}</strong> remaining
                      ${p.refundedAmount ? ` · <strong>${S().formatPrice(p.refundedAmount)}</strong> refunded` : ''}
                    </p>
                    <div class="studio-client-program-adjust-grid">
                      <label class="form-field"><span>Visits included</span>
                        <input type="number" min="0" step="1" name="visitsIncluded" value="${ov?.visitsIncluded != null ? ov.visitsIncluded : p.visitsIncluded || ''}" placeholder="${p.visitsIncluded || 0}">
                      </label>
                      <label class="form-field"><span>Per-visit value ($)</span>
                        <input type="number" min="0" step="0.01" name="visitValue" value="${ov?.visitValue != null ? ov.visitValue : p.visitValue || ''}" placeholder="${p.visitValue || 0}">
                      </label>
                      <label class="form-field"><span>Used visits offset</span>
                        <input type="number" step="1" name="visitsUsedOffset" value="${ov?.visitsUsedOffset != null ? ov.visitsUsedOffset : ''}" placeholder="0">
                        <small>+1 counts an extra used visit; −1 restores one.</small>
                      </label>
                      <label class="form-field studio-check-field">
                        <input type="checkbox" name="active" ${ov?.active === false || p.voided || p.refunded || p.fullyRefunded ? '' : 'checked'}>
                        <span>Program active (uncheck to void)</span>
                      </label>
                    </div>
                    <label class="form-field studio-client-field-full"><span>Adjustment notes</span>
                      <input type="text" name="notes" value="${esc(ov?.notes || '')}" placeholder="Why this was changed">
                    </label>
                    <button type="submit" class="btn-primary btn-sm">Save program changes (PIN required)</button>
                  </form>`;
              }).join('')}
            </div>` : '<p class="admin-empty">No programs on file — enroll via POS first.</p>'}
        </article>
      </section>`;
  }

  function renderClients(ctx) {
    const searchQuery = String(ctx.studioClientSearch || '').trim();
    const clients = S().searchClients(searchQuery);
    const selected = clients.find((c) => c.id === ctx.selectedStudioClientId) || clients[0] || null;
    const listClients = clients;
    const adding = ctx.studioClientAdding;
    const tab = ctx.studioClientTab || 'overview';
    const visitRecords = selected ? S().getClientVisitRecords(selected.id) : [];
    const dupGroups = selected ? S().getDuplicateGroupsForClient(selected.id) : [];
    const allDupGroups = S().findDuplicateClientGroups();
    const dupClientIds = new Set();
    allDupGroups.forEach((g) => g.clients.forEach((c) => dupClientIds.add(c.id)));
    const summary = selected ? S().getClientProgramSummary(selected.id) : null;
    const clientTxs = selected ? S().getClientTransactions(selected.id).slice(0, 8) : [];
    const notesCount = visitRecords.filter((v) => v.notes || v.providerSession?.notes).length;
    const intakeCount = visitRecords.filter((v) => v.intakeCompleted).length;
    const photoCount = selected ? S().getClientPhotos(selected.id).length : 0;

    const isMobile = !!ctx.isMobileAdmin;
    const mobilePane = isMobile ? (adding ? 'add' : (ctx.studioClientMobilePane || 'list')) : 'split';

    return `
      ${isMobile ? '' : pageHead('Clients', 'Profiles, visit notes, intake history, and duplicate management')}
      ${subnav('clients', ctx.newInquiries, ctx.clinicSideNav)}
      ${flashBanner(ctx.studioFlash, ctx.studioFlashType)}
      ${allDupGroups.length && (!isMobile || mobilePane === 'list') ? `
        <div class="studio-client-dup-alert">
          <strong>${allDupGroups.length} duplicate group${allDupGroups.length !== 1 ? 's' : ''} detected</strong>
          <span>Select a client with the duplicate badge to review and merge profiles.</span>
        </div>` : ''}
      <div class="admin-orders-layout studio-client-layout${isMobile ? ' is-mobile' : ''}"${isMobile ? ` data-mobile-pane="${mobilePane}"` : ''}>
        <section class="admin-panel admin-panel-list studio-client-list-panel">
          <div class="admin-panel-head studio-client-list-head">
            <h2>${isMobile ? 'Clients' : `Clients (${listClients.length})`}${isMobile ? ` <span class="studio-client-count-badge">${listClients.length}</span>` : ''}</h2>
            <button type="button" class="btn-secondary btn-sm" id="addClientBtn">+ Add</button>
          </div>
          <div class="studio-client-search-wrap">
            <input type="search" id="clientSearch" class="studio-search studio-client-search" placeholder="Search name, email, phone…" value="${esc(ctx.studioClientSearch || '')}" enterkeyhint="search" autocomplete="off">
          </div>
          <div class="admin-order-list studio-client-order-list">
            ${listClients.map((c) => `
              <button type="button" class="admin-order-card studio-client-card${selected?.id === c.id ? ' active' : ''}${dupClientIds.has(c.id) ? ' has-duplicate' : ''}" data-studio-client="${esc(c.id)}">
                <div class="admin-order-card-top">
                  <strong>${esc(c.name || 'Unnamed')}</strong>
                  ${dupClientIds.has(c.id) ? '<span class="studio-client-dup-badge">Duplicate?</span>' : ''}
                  ${firstVisitBadge(c.id, c.phone)}
                </div>
                <p class="studio-client-card-program">${clientProgramLine(c.id)}</p>
                ${S().getClientCreditBalance(c.id) > 0 ? `<p class="studio-client-card-credit">${S().formatPrice(S().getClientCreditBalance(c.id))} credit</p>` : ''}
                <p>${esc(c.phone || c.email || '—')}</p>
                <div class="admin-order-card-bottom"><span>${esc(c.gender || '')}</span><span>${fmtDate((c.updatedAt || c.createdAt || '').slice(0, 10))}</span></div>
              </button>`).join('') || (searchQuery
                ? '<p class="admin-empty">No clients match your search.</p>'
                : '<p class="admin-empty">No clients yet — book an appointment or complete a POS sale.</p>')}
          </div>
        </section>
        <section class="admin-panel admin-panel-detail studio-client-detail"${selected && !adding ? ` data-client-id="${selected.id}"` : ''}>
          ${isMobile && (mobilePane === 'detail' || mobilePane === 'add') ? `
            <button type="button" class="studio-client-mobile-back" id="studioClientMobileBack" aria-label="Back to client list">
              <span aria-hidden="true">←</span> All clients
            </button>` : ''}
          ${adding ? `
            <h2>New client</h2>
            <p class="studio-client-pin-notice">Creating a client requires the admin PIN.</p>
            <form id="studioClientNewForm" class="admin-goals-form">
              <label class="form-field"><span>Name *</span><input type="text" id="studioClientNewName" required></label>
              <label class="form-field"><span>Email</span><input type="email" id="studioClientNewEmail"></label>
              <label class="form-field"><span>Phone</span><input type="tel" id="studioClientNewPhone"></label>
              <label class="form-field"><span>Birthday</span><input type="date" id="studioClientNewBirthday"></label>
              <label class="form-field"><span>Notes</span><textarea id="studioClientNewNotes" rows="2"></textarea></label>
              <div class="pos-quote-actions">
                <button type="submit" class="btn-primary btn-sm">Create (PIN required)</button>
                <button type="button" class="btn-secondary btn-sm" id="cancelAddClientBtn">Cancel</button>
              </div>
            </form>
          ` : selected ? `
            <input type="hidden" id="studioClientId" value="${selected.id}">
            <div class="studio-client-detail-head">
              <div class="studio-client-detail-identity">
                <h2>${esc(selected.name)}${firstVisitBadge(selected.id, selected.phone)}</h2>
                <p class="studio-client-detail-meta">${[
                  selected.phone ? esc(selected.phone) : '',
                  selected.email ? esc(selected.email) : '',
                  selected.gender ? esc(selected.gender) : '',
                  selected.birthday ? `Birthday ${esc(S().formatBirthdayLabel(selected.birthday))}` : '',
                  selected.portalCode ? `Portal <strong>${esc(selected.portalCode)}</strong>` : '',
                ].filter(Boolean).join(' · ')}</p>
                ${(selected.tags || []).length ? `<div class="studio-client-tags">${(selected.tags || []).map((t) => `<span class="studio-client-tag${t === S().FIRST_VISIT_TAG ? ' studio-client-tag-first' : ''}">${esc(t)}</span>`).join('')}</div>` : ''}
              </div>
              <div class="pos-quote-actions studio-client-detail-actions">
                <button type="button" class="btn-secondary btn-sm" data-studio-tab="calendar" data-prefill-client="${selected.id}">Book</button>
                <button type="button" class="btn-primary btn-sm" data-studio-tab="pos" data-prefill-pos-client="${selected.id}">POS</button>
              </div>
            </div>
            ${renderClientDuplicateBanner(selected, dupGroups, ctx.studioClientMergeSecondaryId)}
            <div class="studio-client-tabs studio-client-tabs-scroll">
              <button type="button" class="studio-pos-tab${tab === 'overview' ? ' active' : ''}" data-client-tab="overview">Overview</button>
              <button type="button" class="studio-pos-tab${tab === 'visits' ? ' active' : ''}" data-client-tab="visits">Visit notes <span class="studio-client-tab-count">${notesCount}</span></button>
              <button type="button" class="studio-pos-tab${tab === 'intake' ? ' active' : ''}" data-client-tab="intake">Intake history <span class="studio-client-tab-count">${intakeCount}</span></button>
              <button type="button" class="studio-pos-tab${tab === 'photos' ? ' active' : ''}" data-client-tab="photos">Photos <span class="studio-client-tab-count">${photoCount}</span></button>
              <button type="button" class="studio-pos-tab${tab === 'manage' ? ' active' : ''}" data-client-tab="manage">Manage</button>
            </div>
            ${tab === 'overview' ? `
              ${renderClientStats(summary?.stats)}
              ${renderClientCreditLedger(summary?.creditEntries)}
              ${renderClientNextAppt(summary?.nextAppointment)}
              ${renderClientProgramSection(summary)}
              <details class="studio-client-collapsible" open>
                <summary>Contact &amp; notes <small>(PIN required to save)</small></summary>
                <p class="studio-client-pin-notice">Profile edits require the admin PIN.</p>
                <form id="studioClientForm" class="admin-goals-form">
                  <label class="form-field"><span>Name</span><input type="text" id="studioClientNameEdit" value="${esc(selected.name)}"></label>
                  <label class="form-field"><span>Email</span><input type="email" id="studioClientEmailEdit" value="${esc(selected.email)}"></label>
                  <label class="form-field"><span>Phone</span><input type="tel" id="studioClientPhoneEdit" value="${esc(selected.phone)}"></label>
                  <label class="form-field"><span>Birthday</span>
                    <input type="date" id="studioClientBirthdayEdit" value="${esc(selected.birthday && selected.birthday.length === 10 ? selected.birthday : '')}">
                    <small>Used for daily birthday reminders and 7-day card countdown on the dashboard.</small>
                  </label>
                  <label class="form-field"><span>Notes</span><textarea id="studioClientNotesEdit" rows="4">${esc(selected.notes)}</textarea></label>
                  <button type="submit" class="btn-primary btn-sm">Save changes (PIN required)</button>
                </form>
              </details>
              <section class="studio-client-history">
                <h3>Recent appointments</h3>
                <ul class="studio-client-appt-list">${visitRecords.slice(0, 8).map((v) => `
                  <li class="studio-timeline-click" data-studio-appt-dash="${v.appointmentId}">
                    <div class="studio-client-appt-main">
                      <strong>${esc(v.serviceName)}</strong>
                      <span>${fmtDate(v.date)} · ${esc(fmtTime12(v.startTime))}</span>
                    </div>
                    <span class="admin-status-pill" style="--pill-color:${S().APPT_STATUS[v.status]?.color || '#6B7280'}">${S().APPT_STATUS[v.status]?.label || v.status}</span>
                  </li>`).join('') || '<li class="admin-empty">No appointments.</li>'}</ul>
              </section>
              ${clientTxs.length ? `
                <section class="studio-client-history">
                  <h3>Register history</h3>
                  <ul class="studio-client-tx-list">${clientTxs.map((t) => `
                    <li class="${t.type === 'refund' ? 'is-refund' : ''}">
                      <div>
                        <strong>${S().formatPrice(t.total)}</strong>
                        <span>${new Date(t.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${esc(t.paymentMethod)}${t.type === 'refund' ? ' · Refund' : ''}${t.refundedAmount ? ` · ${S().formatPrice(t.refundedAmount)} refunded` : ''}</span>
                      </div>
                      <small>${(t.items || []).map((i) => esc(i.name)).join(', ')}</small>
                    </li>`).join('')}</ul>
                </section>` : ''}
            ` : ''}
            ${tab === 'visits' ? `
              <section class="studio-client-history studio-client-history-full">
                <h3>All visit &amp; appointment notes</h3>
                <p class="studio-client-section-lead">${visitRecords.length} visit${visitRecords.length !== 1 ? 's' : ''} on file — provider sessions, appointment notes, and photo timestamps.</p>
                ${renderClientVisitNotes(visitRecords, selected.id)}
              </section>
            ` : ''}
            ${tab === 'intake' ? `
              <section class="studio-client-history studio-client-history-full">
                <h3>Intake forms by visit</h3>
                <p class="studio-client-section-lead">Health history, consent, and goals captured at check-in for each visit.</p>
                ${renderClientIntakeHistory(visitRecords)}
              </section>
            ` : ''}
            ${tab === 'photos' ? renderClientPhotosTab(selected) : ''}
            ${tab === 'manage' ? renderClientManagePanel(selected, summary, ctx) : ''}
          ` : '<p class="admin-empty">Select a client or add a new one.</p>'}
        </section>
      </div>`;
  }

  function renderInquiries(ctx) {
    const inquiries = S().getInquiries();
    const selected = inquiries.find((i) => i.id === ctx.selectedStudioInquiryId) || inquiries[0];
    const interestLabels = {
      general: 'General consultation', men: "Men's hair systems",
      women: "Women's Butterfly Bar", clinical: 'Clinical treatments',
    };
    return `
      ${pageHead('Inquiries', 'Public consultation requests from studios.html')}
      ${subnav('inquiries', ctx.newInquiries, ctx.clinicSideNav)}
      <div class="admin-orders-layout">
        <section class="admin-panel admin-panel-list">
          <h2>Requests (${inquiries.length})</h2>
          <div class="admin-order-list">
            ${inquiries.map((inq) => `
              <button type="button" class="admin-order-card${inq.id === selected?.id ? ' active' : ''}" data-studio-inquiry="${inq.id}">
                <div class="admin-order-card-top"><strong>${esc(inq.name)}</strong>
                  <span class="admin-status-pill" style="--pill-color:${inq.status === 'new' ? '#0071e3' : '#30d158'}">${esc(inq.status || 'new')}</span>
                </div>
                <p>${esc(interestLabels[inq.interest] || inq.interest)}</p>
                <div class="admin-order-card-bottom"><span>${esc(inq.email)}</span></div>
              </button>`).join('') || '<p class="admin-empty">No inquiries yet.</p>'}
          </div>
        </section>
        <section class="admin-panel admin-panel-detail">
          ${selected ? `
            <h2>${esc(selected.name)}</h2>
            <p>${esc(selected.email)} · ${esc(selected.phone)}</p>
            <p><strong>Interest:</strong> ${esc(interestLabels[selected.interest] || selected.interest)}</p>
            ${selected.message ? `<p>${esc(selected.message)}</p>` : ''}
            <div class="pos-quote-actions">
              <a href="mailto:${esc(selected.email)}" class="btn-primary btn-sm">Email</a>
              <button type="button" class="btn-secondary btn-sm" id="markInquiryContactedBtn" data-inquiry="${selected.id}">Mark contacted</button>
              <button type="button" class="btn-secondary btn-sm" data-studio-tab="calendar" data-prefill-name="${esc(selected.name)}" data-prefill-phone="${esc(selected.phone)}" data-prefill-gender="${selected.interest === 'women' ? 'women' : selected.interest === 'men' ? 'men' : ''}">Book</button>
              <button type="button" class="btn-secondary btn-sm" data-studio-tab="pos">Open POS</button>
            </div>` : '<p class="admin-empty">Select an inquiry.</p>'}
        </section>
      </div>`;
  }

  function renderStaff(ctx) {
    const staff = S().getStaff();
    const selected = ctx.selectedStudioStaffId
      ? staff.find((s) => s.id === ctx.selectedStudioStaffId) || staff[0]
      : staff[0];
    const roles = S().STAFF_ROLES || [];

    return `
      ${pageHead('Team', 'Staff and chair assignments')}
      ${subnav('staff', ctx.newInquiries, ctx.clinicSideNav)}
      ${settingsSubnav('staff')}
      <div class="admin-orders-layout">
        <section class="admin-panel admin-panel-list">
          <div class="admin-panel-head"><h2>Staff (${staff.length})</h2>
            <button type="button" class="btn-secondary btn-sm" id="addStaffBtn">+ Add</button>
          </div>
          <div class="admin-order-list">
            ${staff.map((m) => `
              <button type="button" class="admin-order-card${selected?.id === m.id ? ' active' : ''}" data-studio-staff="${m.id}">
                <div class="admin-order-card-top">
                  <strong>${esc(m.name)}</strong>
                  <span class="admin-status-pill" style="--pill-color:${m.active ? '#059669' : '#6B7280'}">${m.active ? 'Active' : 'Inactive'}</span>
                </div>
                <p>${esc(m.role)}</p>
                <div class="admin-order-card-bottom"><span>${esc(m.email)}</span></div>
              </button>`).join('') || '<p class="admin-empty">No staff yet — add your team.</p>'}
          </div>
        </section>
        <section class="admin-panel admin-panel-detail">
          ${selected ? `
            <h2>${esc(selected.name)}</h2>
            <form id="studioStaffForm" class="admin-goals-form">
              <input type="hidden" id="studioStaffId" value="${selected.id}">
              <label class="form-field"><span>Name</span><input type="text" id="studioStaffName" value="${esc(selected.name)}" required></label>
              <label class="form-field"><span>Role</span>
                <select id="studioStaffRole">${roles.map((r) => `<option value="${r}"${r === selected.role ? ' selected' : ''}>${r}</option>`).join('')}</select>
              </label>
              <label class="form-field"><span>Email</span><input type="email" id="studioStaffEmail" value="${esc(selected.email)}"></label>
              <label class="form-field"><span>Phone</span><input type="tel" id="studioStaffPhone" value="${esc(selected.phone)}"></label>
              <label class="form-field studio-check-field">
                <input type="checkbox" id="studioStaffActive" ${selected.active ? 'checked' : ''}>
                <span>Active on schedule</span>
              </label>
              <div class="pos-quote-actions">
                <button type="submit" class="btn-primary btn-sm">Save</button>
                <button type="button" class="btn-secondary btn-sm" id="removeStaffBtn" data-staff="${selected.id}">Remove</button>
              </div>
            </form>
          ` : `
            <h2>Add team member</h2>
            <form id="studioStaffNewForm" class="admin-goals-form">
              <label class="form-field"><span>Name</span><input type="text" id="studioStaffNewName" required></label>
              <label class="form-field"><span>Role</span>
                <select id="studioStaffNewRole">${roles.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
              </label>
              <label class="form-field"><span>Email</span><input type="email" id="studioStaffNewEmail"></label>
              <button type="submit" class="btn-primary btn-sm">Add staff</button>
            </form>`}
        </section>
      </div>`;
  }

  function renderSettings(ctx) {
    const settings = S().getSettings();
    const cal = S().getCalendarSettings();
    const chairLabels = (cal.columnLabels || []).join(', ');

    return `
      ${pageHead('Settings', 'Studio configuration')}
      ${subnav('settings', ctx.newInquiries, ctx.clinicSideNav)}
      ${settingsSubnav('settings')}
      <div class="admin-split">
        <section class="admin-panel studio-pos-panel">
          <h2>Financing &amp; contact</h2>
          <form id="studioSettingsForm" class="admin-goals-form">
            <label class="form-field"><span>CareCredit custom application URL (optional)</span>
              <input type="url" id="studioFinanceUrl" value="${esc(S().getFinanceCustomUrl?.() || '')}" placeholder="Leave blank for carecredit.com/apply">
              <small class="admin-fine">Default embed is <a href="https://www.carecredit.com/apply/" target="_blank" rel="noopener">carecredit.com/apply</a>. Override with your Provider Center custom link from <a href="https://www.carecredit.com/customlink/" target="_blank" rel="noopener">carecredit.com/customlink</a> when enrolled.</small>
            </label>
            <label class="form-field"><span>CareCredit merchant ID (recommended)</span>
              <input type="text" id="studioFinanceMerchantId" value="${esc(settings.financeMerchantId)}" placeholder="Your enrolled practice merchant ID">
              <small class="admin-fine">Provider Center → Marketing Toolkit → Add to website. When set, the official embedded CareCredit widget loads instead of the URL iframe.</small>
            </label>
            <label class="form-field"><span>Studio phone</span><input type="tel" id="studioSettingsPhone" value="${esc(settings.phone)}"></label>
            <label class="form-field"><span>Studio email</span><input type="email" id="studioSettingsEmail" value="${esc(settings.email)}"></label>
            <label class="form-field"><span>Location</span><input type="text" id="studioSettingsLocation" value="${esc(settings.location)}"></label>
            <button type="submit" class="btn-primary btn-sm">Save contact</button>
          </form>
        </section>
        <section class="admin-panel studio-pos-panel">
          <h2>Calendar</h2>
          <form id="studioCalendarForm" class="admin-goals-form">
            <label class="form-field"><span>Start hour</span><input type="number" id="calStartHour" min="6" max="12" value="${cal.startHour}"></label>
            <label class="form-field"><span>End hour</span><input type="number" id="calEndHour" min="12" max="22" value="${cal.endHour}"></label>
            <label class="form-field"><span>Slot length (min)</span>
              <select id="calSlotMinutes">
                <option value="15"${cal.slotMinutes === 15 ? ' selected' : ''}>15</option>
                <option value="30"${cal.slotMinutes === 30 ? ' selected' : ''}>30</option>
                <option value="60"${cal.slotMinutes === 60 ? ' selected' : ''}>60</option>
              </select>
            </label>
            <label class="form-field"><span>Chairs</span><input type="number" id="calColumns" min="1" max="8" value="${cal.columns}"></label>
            <label class="form-field"><span>Chair labels (comma-separated)</span>
              <input type="text" id="calChairLabels" value="${esc(chairLabels)}" placeholder="Chair 1, Chair 2, Chair 3">
            </label>
            <button type="submit" class="btn-primary btn-sm">Save calendar</button>
          </form>
        </section>
      </div>
      <section class="admin-panel studio-pos-panel studio-cloud-panel">
        <h2>Cloud sync</h2>
        <p class="studio-client-section-lead">Production mode stores clients, appointments, POS sales, and portal data in Supabase so every Mac, iPad, and phone sees the same records.</p>
        <dl class="studio-cloud-status">
          <div><dt>Mode</dt><dd id="studioCloudModeLabel">${esc(window.StudioStorage?.getMode?.() || 'local')}${window.StudioStorage?.getInitError?.() ? ` — ${esc(window.StudioStorage.getInitError())}` : ''}</dd></div>
          <div><dt>Workspace</dt><dd>${esc(window.RENVOA_CONFIG?.cloud?.workspaceId || 'onyx')}</dd></div>
          <div><dt>Clients on this device</dt><dd id="studioCloudClientCount">${S().getClients().length}</dd></div>
          <div><dt>Clients in cloud</dt><dd id="studioCloudRemoteClientCount">${(() => {
            const n = window.StudioStorage?.getCollectionCounts?.()?.cloudClients;
            return n == null ? '—' : n;
          })()}</dd></div>
          <div><dt>Appointments on this device</dt><dd id="studioCloudApptCount">${S().getAppointments().length}</dd></div>
        </dl>
        ${window.StudioStorage?.getMode?.() === 'local-fallback'
          ? `<p class="admin-fine studio-cloud-offline-banner"><strong>Cloud offline on this device.</strong> You are viewing local data only. Other devices will not see changes until cloud reconnects.</p>`
          : ''}
        ${window.StudioStorage?.isCloudEnabled?.()
          ? `<p class="admin-fine">If counts differ between devices, open this page on the device with the most clients and tap <strong>Merge &amp; upload</strong>, then hard-refresh other devices and tap <strong>Sync now</strong>. Data is union-merged — nothing is deleted unless you remove it in the portal.</p>
             <div class="studio-cloud-actions">
               <button type="button" class="btn-primary btn-sm" id="studioCloudSyncBtn">Sync now</button>
               <button type="button" class="btn-secondary btn-sm" id="studioCloudMigrateBtn">Merge &amp; upload this device</button>
               ${window.StudioStorage?.getMode?.() === 'local-fallback'
                 ? '<button type="button" class="btn-secondary btn-sm" id="studioCloudRetryBtn">Retry cloud connection</button>'
                 : ''}
             </div>`
          : `<p class="admin-fine">Cloud is off. Set <code>RENVOA_CONFIG.cloud.enabled</code>, Supabase URL, and anon key in <code>js/config.js</code>, then run <code>supabase/schema.sql</code> in your Supabase project.</p>`}
      </section>`;
  }

  function renderTransactions(ctx) {
    const txs = S().getTransactions();
    const expanded = ctx.selectedStudioTransactionId;
    const totalRevenue = txs.reduce((s, t) => s + (t.total || 0), 0);
    return `
      ${pageHead('Register', 'Completed POS transactions')}
      ${subnav('transactions', ctx.newInquiries, ctx.clinicSideNav)}
      <div class="studio-register-summary">
        <span>${txs.length} transactions</span>
        <strong>${S().formatPrice(totalRevenue)} total</strong>
      </div>
      <section class="admin-panel studio-pos-panel">
        <div class="admin-table-wrap">
          <table class="admin-table admin-table-sm studio-register-table">
            <thead><tr><th></th><th>Client</th><th>Total</th><th>Payment</th><th>Date</th></tr></thead>
            <tbody>
              ${txs.map((t) => `
                <tr class="studio-tx-row${expanded === t.id ? ' expanded' : ''}" data-studio-tx="${t.id}">
                  <td><button type="button" class="studio-tx-toggle" data-studio-tx="${t.id}">${expanded === t.id ? '▼' : '▶'}</button></td>
                  <td><strong>${esc(t.clientName)}</strong>${t.walkIn ? ' <span class="studio-tx-walkin-badge">Walk-in</span>' : ''}<small>${t.id}</small></td>
                  <td><strong>${S().formatPrice(t.total)}</strong></td>
                  <td>${esc(t.paymentMethod)}${t.paymentMethod === 'cash' && t.cashChange ? ` · ${S().formatPrice(t.cashChange)} change` : ''}</td>
                  <td>${new Date(t.at).toLocaleString()}</td>
                </tr>
                ${expanded === t.id ? `<tr class="studio-tx-detail"><td colspan="5">
                  <ul class="studio-tx-items">${(t.items || []).map((i) =>
                    `<li><span>${esc(i.name)}${i.qty > 1 ? ` ×${i.qty}` : ''}${i.priceOverride && i.originalPrice != null ? ` <small>(was ${S().formatPrice(i.originalPrice)})</small>` : ''}</span><strong>${S().formatPrice(i.price * (i.qty || 1))}</strong></li>`
                  ).join('')}</ul>
                  ${t.discount ? `<p class="studio-tx-discount">Discount: −${S().formatPrice(t.discount)}</p>` : ''}
                  ${t.creditApplied ? `<p class="studio-tx-discount">Studio credit: −${S().formatPrice(t.creditApplied)}</p>` : ''}
                  ${t.paymentMethod === 'cash' && t.cashTendered ? `<p class="studio-tx-cash">Cash tendered: ${S().formatPrice(t.cashTendered)} · Change: ${S().formatPrice(t.cashChange || 0)}</p>` : ''}
                  ${t.notes ? `<p class="admin-fine">${esc(t.notes)}</p>` : ''}
                </td></tr>` : ''}`).join('') || '<tr><td colspan="5" class="admin-empty-cell">No transactions yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function render(subView, ctx) {
    if (!S() || !(window.STUDIO_SERVICES || []).length) {
      return '<div class="admin-panel"><h2>Studios unavailable</h2><p>Load studio-admin.js and studios-pricing.js</p></div>';
    }
    const fullCtx = {
      newInquiries: S().getInquiries().filter((i) => i.status === 'new').length,
      studioGender: 'men',
      studioCategory: 'program',
      studioCalendarDate: S().todayISO(),
      studioCalendarView: 'day',
      studioPosCart: { clientName: '', items: [], discount: 0 },
      studioPosMode: 'client',
      studioShelfCategory: 'products',
      studioPosApplyCredit: true,
      studioPresentOpen: false,
      studioFinanceOpen: false,
      studioFinanceContext: null,
      studioOpenProgramBase: null,
      studioProgramModalMode: 'pos',
      studioBookGender: 'men',
      studioBookCategory: 'program',
      studioCalChairFilter: 0,
      studioApptReschedule: false,
      studioCalMoveMode: false,
      studioRescheduleDraft: null,
      studioProgramStep: 'length',
      studioExtOptions: null,
      studioBookWizardOpen: false,
      studioBookWizardStep: 'when',
      studioBookClientName: '',
      studioBookClientPhone: '',
      studioBookNotes: '',
      studioApptModalOpen: false,
      studioIntakeWizardOpen: false,
      studioIntakeApptId: null,
      studioIntakeStep: 0,
      studioIntakeSigned: [],
      studioIntakeData: {},
      studioIntakeSkippedForms: [],
      studioAllergyModalOpen: false,
      studioAllergyApptId: null,
      studioProviderWizardOpen: false,
      studioProviderApptId: null,
      studioProviderStep: 'activity',
      studioProviderDraft: null,
      studioClientTab: 'overview',
      studioClientMergeSecondaryId: null,
      studioClientMergeSearch: '',
      clinicSideNav: false,
      businessMode: 'peptide',
      studioPhotoPromptOpen: false,
      studioPhotoPromptKind: null,
      studioPhotoPromptApptId: null,
      studioPhotoPromptPending: null,
      studioInactiveProgramModalOpen: false,
      studioInactiveProgramModalClientId: null,
      studioInactiveProgramModalData: null,
      ...ctx,
    };
    const views = {
      dashboard: renderDashboard,
      pos: renderPOS,
      pricing: renderPricing,
      calendar: renderCalendar,
      clients: renderClients,
      inquiries: renderInquiries,
      transactions: renderTransactions,
      staff: renderStaff,
      settings: renderSettings,
    };
    const body = (views[subView] || renderDashboard)(fullCtx);
    return `<div class="studio-pos-root">${body}${renderCashRegisterModal(fullCtx)}${renderPosAuthModal(fullCtx)}${renderInactiveProgramModal(fullCtx)}${renderPhotoPromptModal(fullCtx)}${renderFinanceOverlay(fullCtx)}${renderIntakeWizardModal(fullCtx)}${renderAllergyModal(fullCtx)}${renderProviderWizardModal(fullCtx)}</div>`;
  }

  return { render, esc, getPostVisitFlowMeta, calcPosTotals };
})();