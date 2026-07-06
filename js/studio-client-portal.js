(function () {
  'use strict';

  const RS = () => window.RenvoaStudios;
  const $ = (s, r = document) => r.querySelector(s);

  const state = {
    view: 'login',
    loginMode: 'code',
    error: '',
    loginPhone: '',
    loginEmail: '',
    setupCode: '',
    rescheduleId: '',
    rescheduleDate: '',
    rescheduleTime: '',
    rescheduleColumn: 1,
    rescheduleStep: 'slots',
    cancelId: '',
    cancelStep: 'confirm',
    bookGender: null,
    bookCategory: null,
    bookServiceId: '',
    bookServiceLabel: '',
    bookDuration: 60,
    bookDate: '',
    bookTime: '',
    bookColumn: 1,
    bookStep: 0,
    bookHairLikes: '',
    bookHairDislikes: '',
    bookPriorServices: '',
    bookBeverage: '',
    bookInspoPhotos: [],
    confirmed: null,
    intakeApptId: '',
    intakeStep: 0,
    intakeSigned: [],
    intakeSkipped: [],
    intakeData: {},
    pendingIntakeRedirect: '',
  };

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

  function client() {
    return RS()?.getAuthedClient?.() || null;
  }

  function clientNeedsPassword() {
    const c = client();
    return RS()?.clientNeedsPortalPassword?.(c) || false;
  }

  function summary() {
    const c = client();
    return c ? RS().getClientProgramSummary(c.id) : null;
  }

  function upcomingAppts() {
    const c = client();
    if (!c) return [];
    return RS().getClientAppointments(c.id, c.phone)
      .filter((a) => !['canceled', 'completed', 'no_show'].includes(a.status))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  }

  function pendingIntakeAppts() {
    const c = client();
    if (!c || !RS()?.getClientPendingIntakeAppointments) return [];
    return RS().getClientPendingIntakeAppointments(c.id, c.phone);
  }

  function portalFormsAppts() {
    const c = client();
    if (!c || !RS()?.getClientPortalFormsAppointments) return [];
    return RS().getClientPortalFormsAppointments(c.id, c.phone);
  }

  function intakeStatusForAppt(appt) {
    return RS()?.getIntakeFormStatus?.(appt) || { forms: [], requiredRemaining: 0, completedForms: 0, totalForms: 0 };
  }

  function formStatusLabel(status) {
    const map = {
      complete: 'Complete',
      in_progress: 'In progress',
      pending: 'Not started',
      skipped: 'Skipped in studio',
      at_visit: 'At your visit',
    };
    return map[status] || 'Pending';
  }

  function portalIntakeForms() {
    return window.StudioVisitFlow?.getPortalIntakeForms?.() || window.StudioVisitFlow?.INTAKE_FORMS || [];
  }

  function portalFormByStep(step) {
    return portalIntakeForms()[step] || null;
  }

  function parsePortalHash() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#portal')) return {};
    const qIndex = hash.indexOf('?');
    const query = qIndex >= 0 ? hash.slice(qIndex + 1) : '';
    const params = new URLSearchParams(query);
    return { intake: params.get('intake') || '' };
  }

  function loadIntakeDraft(apptId) {
    const appt = RS()?.getAppointment(apptId);
    if (!appt) return null;
    state.intakeApptId = apptId;
    state.intakeSigned = [...(appt.intakeForms || [])];
    state.intakeSkipped = [...(appt.intakeSkippedForms || [])];
    state.intakeData = { ...(appt.intakeData || {}) };
    state.intakeStep = 0;
    return appt;
  }

  function collectIntakeFormData(form) {
    const VF = window.StudioVisitFlow;
    const data = {};
    if (!VF || !form) return data;
    VF.normalizeFormFields(form).forEach((field) => {
      const key = VF.getFieldKey(field);
      const el = document.querySelector(`[data-portal-intake-field="${key}"]`);
      if (el) data[key] = el.value;
    });
    return data;
  }

  function persistIntakeStep(markComplete) {
    const VF = window.StudioVisitFlow;
    const form = portalFormByStep(state.intakeStep);
    if (!form || !state.intakeApptId) return null;
    const formData = collectIntakeFormData(form);
    state.intakeData = {
      ...state.intakeData,
      [form.id]: { ...(state.intakeData[form.id] || {}), ...formData },
    };
    const signedEl = document.getElementById('portalIntakeSigned');
    const signedNow = !!signedEl?.checked;
    if (signedNow && !state.intakeSigned.includes(form.id)) {
      state.intakeSigned.push(form.id);
      state.intakeSkipped = state.intakeSkipped.filter((id) => id !== form.id);
    } else if (!signedNow) {
      state.intakeSigned = state.intakeSigned.filter((id) => id !== form.id);
    }
    const patch = {
      intakeData: state.intakeData,
      intakeForms: state.intakeSigned,
      intakeSkippedForms: state.intakeSkipped,
    };
    if (markComplete) patch.intakeCompleted = true;
    return RS().saveClientPortalIntake(state.intakeApptId, patch);
  }

  function openIntakeView(apptId, opts = {}) {
    const c = client();
    const appt = RS()?.getAppointment(apptId);
    if (!appt) {
      state.error = 'Appointment not found.';
      return;
    }
    if (c) {
      const access = RS().ensureClientAppointmentAccess(appt, c);
      if (access.error) {
        state.error = access.error;
        return;
      }
    }
    loadIntakeDraft(apptId);
    if (opts.step != null) {
      state.intakeStep = Number(opts.step) || 0;
      state.view = 'intake';
      return;
    }
    state.view = 'forms';
  }

  function openIntakeForm(step) {
    state.intakeStep = Number(step) || 0;
    state.view = 'intake';
  }

  function renderPortalIntakeField(form, field, formData) {
    const VF = window.StudioVisitFlow;
    const key = VF.getFieldKey(field);
    const label = VF.getFieldLabel(field);
    const value = VF.getFieldValue(formData, field) || '';
    const required = VF.isFieldRequired(form, field);
    const type = field.type || 'text';
    const req = required ? ' required' : '';
    const common = `data-portal-intake-field="${esc(key)}" id="portalIntake_${esc(key)}"${req}`;

    if (type === 'textarea') {
      return `<label class="form-field"><span>${esc(label)}${required ? ' *' : ''}</span><textarea rows="3" ${common} placeholder="${esc(field.placeholder || '')}">${esc(value)}</textarea></label>`;
    }
    if (type === 'select') {
      const options = field.options || [];
      return `<label class="form-field"><span>${esc(label)}${required ? ' *' : ''}</span><select ${common}><option value="">Select…</option>${options.map((o) => `<option value="${esc(o)}"${value === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    }
    const inputType = type === 'date' ? 'date' : type === 'tel' ? 'tel' : 'text';
    return `<label class="form-field"><span>${esc(label)}${required ? ' *' : ''}</span><input type="${inputType}" ${common} value="${esc(value)}" placeholder="${esc(field.placeholder || '')}"></label>`;
  }

  function renderIntakeBanner() {
    const pending = pendingIntakeAppts();
    if (!pending.length) return '';
    const appt = pending[0];
    const status = intakeStatusForAppt(appt);
    return `
      <div class="studio-portal-intake-banner">
        <div>
          <strong>Intake forms due</strong>
          <p>${status.forms?.some((f) => f.status === 'skipped')
            ? `Forms skipped at the studio still need your signature before ${esc(fmtDate(appt.date))}`
            : status.requiredRemaining
              ? `${status.requiredRemaining} required form${status.requiredRemaining !== 1 ? 's' : ''} left before ${esc(fmtDate(appt.date))}`
              : `Optional forms remaining before ${esc(fmtDate(appt.date))}`}
            — ${esc(appt.intendedService || appt.serviceName || 'your visit')}.</p>
        </div>
        <button type="button" class="btn-primary btn-sm" data-portal-intake="${esc(appt.id)}">View all forms</button>
      </div>`;
  }

  function renderPortalPolicyLinks() {
    const VF = window.StudioVisitFlow;
    const links = VF?.getAllIntakePolicyLinks?.() || [];
    if (!links.length) return '';
    const base = window.location.pathname.includes('/admin/') ? '../' : '';
    return `
      <section class="studio-portal-policies-panel">
        <h4>Studio policies</h4>
        <p class="studio-portal-hint">Review these before signing your intake forms.</p>
        <ul class="studio-portal-policy-links">
          ${links.map((p) => `
            <li><a href="${esc(VF.resolvePolicyUrl(p.url, base))}" target="_blank" rel="noopener">${esc(p.label)}</a></li>
          `).join('')}
        </ul>
      </section>`;
  }

  function renderFormsHub() {
    const VF = window.StudioVisitFlow;
    const forms = VF?.INTAKE_FORMS || [];
    const appt = RS()?.getAppointment(state.intakeApptId);
    const apptOptions = portalFormsAppts();
    if (!appt && apptOptions.length) {
      loadIntakeDraft(apptOptions[0].id);
      return renderFormsHub();
    }
    if (!appt) {
      return `
        <div class="studio-portal-card">
          <button type="button" class="studio-book-back" data-portal-back-dash>← Dashboard</button>
          <h3>Intake forms</h3>
          <p class="studio-portal-empty">No forms are due on your account right now.</p>
          ${renderPortalPolicyLinks()}
        </div>`;
    }

    const status = intakeStatusForAppt(appt);
    const progressPct = status.totalForms
      ? Math.round((status.completedForms / status.totalForms) * 100)
      : 0;

    return `
      <div class="studio-portal-card studio-portal-forms-hub">
        <button type="button" class="studio-book-back" data-portal-back-dash>← Dashboard</button>
        <p class="studio-eyebrow">Client intake</p>
        <h3>Forms for your visit</h3>
        <p class="studio-portal-intake-meta">${esc(appt.intendedService || appt.serviceName || 'Appointment')} · ${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</p>
        ${apptOptions.length > 1 ? `
          <label class="form-field studio-portal-forms-appt-pick">
            <span>Appointment</span>
            <select id="portalFormsApptPick">
              ${apptOptions.map((a) => `
                <option value="${esc(a.id)}"${a.id === appt.id ? ' selected' : ''}>${esc(fmtDate(a.date))} · ${esc(a.intendedService || a.serviceName || 'Visit')}</option>
              `).join('')}
            </select>
          </label>` : ''}
        <div class="studio-portal-forms-summary">
          <div class="studio-portal-intake-progress" aria-hidden="true"><span style="width:${progressPct}%"></span></div>
          <p class="studio-portal-hint">
            <strong>${status.completedForms}</strong> of <strong>${status.totalForms}</strong> forms complete
            ${status.requiredRemaining ? ` · <strong>${status.requiredRemaining}</strong> required remaining` : ''}
          </p>
        </div>
        <ul class="studio-portal-forms-list">
          ${status.forms.map((f) => `
            <li class="studio-portal-form-item is-${f.status}">
              <div class="studio-portal-form-item-main">
                <div class="studio-portal-form-item-head">
                  <strong>${esc(f.label)}</strong>
                  <span class="studio-portal-form-badge${f.required ? ' is-required' : ''}">${f.required ? 'Required' : 'Optional'}</span>
                  <span class="studio-portal-form-status">${esc(formStatusLabel(f.status))}</span>
                </div>
                <p>${esc(f.desc)}</p>
              </div>
              ${f.portal === false
                ? '<span class="studio-portal-form-at-visit">Signed at visit</span>'
                : `<button type="button" class="btn-secondary btn-sm" data-portal-form-open="${f.index}">${f.status === 'skipped' ? 'Complete' : f.ready ? 'Review &amp; edit' : 'Complete'}</button>`}
            </li>`).join('')}
        </ul>
        ${renderPortalPolicyLinks()}
        <div class="studio-portal-forms-hub-actions">
          ${status.requiredRemaining === 0 && !appt.intakeCompleted ? `
            <button type="button" class="btn-primary" data-portal-intake-submit-all>Submit intake</button>
          ` : ''}
          ${status.requiredRemaining > 0 ? `
            <button type="button" class="btn-primary" data-portal-form-open="${status.portalForms?.find((f) => !f.ready)?.index ?? 0}">Continue forms</button>
          ` : ''}
          ${appt.intakeCompleted && status.allComplete ? `<p class="studio-portal-hint studio-glass-hint-credit">Intake on file — open any form above to review or update your answers.</p>` : ''}
          ${status.forms.some((f) => f.status === 'skipped') ? `<p class="studio-portal-hint studio-portal-intake-skipped-note">Some forms were skipped at the studio — complete them here before your visit.</p>` : ''}
        </div>
      </div>`;
  }

  function renderDashboardFormsPanel() {
    const pending = pendingIntakeAppts();
    const appt = pending[0] || portalFormsAppts()[0];
    if (!appt) {
      return `
        <section class="studio-portal-panel studio-portal-panel-wide">
          <h4>Intake forms</h4>
          <p class="studio-portal-empty">No forms due right now. Policy documents are always available below.</p>
          ${renderPortalPolicyLinks()}
        </section>`;
    }
    const status = intakeStatusForAppt(appt);
    return `
      <section class="studio-portal-panel studio-portal-panel-wide studio-portal-forms-panel">
        <div class="studio-portal-panel-head">
          <h4>Intake forms</h4>
          <button type="button" class="btn-secondary btn-sm" data-portal-intake="${esc(appt.id)}">Open forms</button>
        </div>
        <p class="studio-portal-hint">Complete all required forms before ${esc(fmtDate(appt.date))}.</p>
        <ul class="studio-portal-forms-checklist">
          ${status.forms.map((f) => `
            <li class="studio-portal-forms-check is-${f.status}">
              <span class="studio-portal-forms-check-mark" aria-hidden="true">${f.ready ? '✓' : '○'}</span>
              <span class="studio-portal-forms-check-label">${esc(f.label)}${f.required ? '' : ' (optional)'}</span>
              ${f.portal === false
                ? '<span class="studio-portal-form-at-visit">At visit</span>'
                : `<button type="button" class="link-cta" data-portal-intake-form="${esc(appt.id)}" data-portal-form-open="${f.index}">${f.status === 'skipped' ? 'Complete' : f.ready ? 'Edit' : 'Open'}</button>`}
            </li>`).join('')}
        </ul>
      </section>`;
  }

  function renderIntakeFormNav(forms, appt) {
    const status = intakeStatusForAppt(appt);
    return `
      <div class="studio-portal-form-nav" role="navigation" aria-label="Intake forms">
        ${status.portalForms.map((f) => `
          <button type="button" class="studio-portal-form-nav-btn${state.intakeStep === f.index ? ' active' : ''} is-${f.status}"
            data-portal-form-open="${f.index}">
            <span class="studio-portal-form-nav-num">${f.index + 1}</span>
            <span class="studio-portal-form-nav-label">${esc(f.label)}</span>
          </button>`).join('')}
      </div>`;
  }

  function defaultBookCategory(gender) {
    return RS()?.defaultCategoryForGender?.(gender) || (gender === 'men' ? 'program' : 'womens_extensions');
  }

  function renderLogin() {
    const codeActive = state.loginMode !== 'password';
    return `
      <div class="studio-portal-card studio-portal-setup-card">
        <div class="studio-portal-head">
          <h3>Client portal</h3>
          <p>Phone, email, and <strong>either</strong> your access code <strong>or</strong> your password — not both.</p>
        </div>
        <div class="studio-portal-login-tabs" role="tablist">
          <button type="button" class="studio-portal-login-tab${codeActive ? ' active' : ''}" data-portal-login-mode="code" role="tab" aria-selected="${codeActive}">Access code</button>
          <button type="button" class="studio-portal-login-tab${!codeActive ? ' active' : ''}" data-portal-login-mode="password" role="tab" aria-selected="${!codeActive}">Password</button>
        </div>
        <form class="studio-book-form" id="studioPortalLoginForm">
          <input type="hidden" name="loginMode" value="${codeActive ? 'code' : 'password'}">
          <label class="form-field"><span>Phone *</span><input type="tel" name="phone" required value="${esc(state.loginPhone)}" autocomplete="tel"></label>
          <label class="form-field"><span>Email *</span><input type="email" name="email" required value="${esc(state.loginEmail)}" autocomplete="email"></label>
          ${codeActive ? `
            <label class="form-field"><span>6-digit access code *</span><input type="text" name="secret" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="From your confirmation" autocomplete="one-time-code"></label>
            <p class="studio-portal-hint">Use the code from your booking confirmation. A password is optional — set one later from your dashboard if you want.</p>
          ` : `
            <label class="form-field"><span>Password *</span><input type="password" name="secret" required minlength="8" placeholder="Your portal password" autocomplete="current-password"></label>
            <p class="studio-portal-hint">Only if you&apos;ve already created a portal password. Otherwise use the Access code tab.</p>
          `}
          <button type="submit" class="btn-primary btn-full">Sign in</button>
        </form>
        ${state.pendingIntakeRedirect ? '<p class="studio-portal-hint studio-portal-intake-prompt">Sign in to complete your intake forms — fill out each section and sign before your visit.</p>' : ''}
        <p class="studio-portal-foot">Not enrolled yet? <a href="#book">Book a consultation</a> first — programs and maintenance visits unlock after your visit.</p>
      </div>`;
  }

  function renderSetupPassword() {
    const authed = RS()?.isClientPortalAuthed?.();
    return `
      <div class="studio-portal-card studio-portal-setup-card">
        <div class="studio-portal-head">
          <h3>Create a portal password <span class="studio-portal-optional">(optional)</span></h3>
          <p>Optional — sign in anytime with your <strong>access code alone</strong>. Add a password if you want a faster way in next time.</p>
        </div>
        <form class="studio-book-form" id="studioPortalSetupForm">
          ${authed ? '' : `
            <label class="form-field"><span>Phone *</span><input type="tel" name="phone" required value="${esc(state.loginPhone)}" autocomplete="tel"></label>
            <label class="form-field"><span>Email *</span><input type="email" name="email" required value="${esc(state.loginEmail)}" autocomplete="email"></label>
            <label class="form-field"><span>6-digit access code *</span><input type="text" name="code" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" value="${esc(state.setupCode)}" autocomplete="off"></label>
          `}
          <label class="form-field"><span>New password *</span><input type="password" name="password" required minlength="8" placeholder="At least 8 characters" autocomplete="new-password"></label>
          <label class="form-field"><span>Confirm password *</span><input type="password" name="confirm" required minlength="8" autocomplete="new-password"></label>
          <button type="submit" class="btn-primary btn-full">Save password</button>
        </form>
        <p class="studio-portal-foot">
          ${authed ? `<button type="button" class="link-cta" data-portal-back-dash>Back to dashboard</button>` : `<button type="button" class="link-cta" data-portal-setup-skip>Skip — use my access code</button>`}
        </p>
      </div>`;
  }

  function renderPasswordPromptBanner() {
    if (!clientNeedsPassword()) return '';
    return `
      <div class="studio-portal-password-banner" role="status">
        <p><strong>Want a faster sign-in?</strong> You can keep using your 6-digit access code, or optionally <button type="button" class="link-cta" data-portal-set-password>create a password</button>.</p>
      </div>`;
  }

  function fmtRedeemedAt(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function renderPortalVisitBar(used, scheduled, total) {
    if (!total) return '';
    const consumed = (used || 0) + (scheduled || 0);
    const pct = Math.min(100, Math.round((consumed / total) * 100));
    return `
      <div class="studio-portal-visit-bar-wrap">
        <div class="studio-portal-visit-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <p class="studio-portal-visit-bar-label">${consumed} of ${total} visits used or scheduled</p>
      </div>`;
  }

  function renderPortalVisitHistoryList(clientId, programId, programName) {
    const history = RS().getProgramVisitHistory(clientId, programId).slice(0, 6);
    if (!history.length) {
      return '<p class="studio-portal-muted">No prepaid visits used yet — your first included visit will appear here after your studio checkout.</p>';
    }
    return `
      <ul class="studio-portal-visit-history">
        ${history.map((h) => `
          <li>
            <strong>Visit ${h.visitNumber}/${h.visitsIncluded}</strong>
            ${(h.programName || programName) ? ` · ${esc(h.programName || programName)}` : ''}
            <small>${fmtRedeemedAt(h.redeemedAt)}${h.visitDate ? ` · appointment ${fmtShortDate(h.visitDate)}` : ''}</small>
          </li>`).join('')}
      </ul>`;
  }

  function renderPortalWarrantyBlock(w) {
    if (!w?.applies) return '';
    const policy = RS().getPackageWarranty();
    const statusClass = w.status || 'active';
    return `
      <div class="studio-portal-warranty studio-portal-warranty-${esc(statusClass)}">
        <div class="studio-portal-warranty-head">
          <span class="studio-portal-warranty-badge studio-portal-warranty-badge-${esc(statusClass)}">${esc(w.label)}</span>
          <strong>Hair warranty</strong>
        </div>
        <p class="studio-portal-warranty-detail">${esc(w.statusDetail || '')}</p>
        <dl class="studio-portal-warranty-dl">
          <div><dt>Based on</dt><dd>${esc(w.anchorLabel || 'Last visit')} · ${fmtShortDate(w.anchorDate)}</dd></div>
          <div><dt>Maintenance due by</dt><dd>${fmtShortDate(w.recommendedByDate)}</dd></div>
          <div><dt>Grace period ends</dt><dd>${fmtShortDate(w.graceDeadline)}</dd></div>
          ${w.intervalDays ? `<div><dt>Recommended cadence</dt><dd>About every ${w.intervalDays} days</dd></div>` : ''}
        </dl>
        ${w.needsReinstatement ? `
          <p class="studio-portal-warranty-fee">Warranty reinstatement required at your next visit: <strong>${RS().formatPrice(w.reinstatementFee)}</strong></p>
        ` : ''}
        ${w.lastReinstatement ? `<p class="studio-portal-muted">Last reinstated ${fmtRedeemedAt(w.lastReinstatement.redeemedAt)}</p>` : ''}
        <p class="studio-portal-warranty-policy">${esc(policy.summary || 'Full hair warranty with proper care')} — stay within your maintenance window plus ${policy.gracePeriodDays || 14} extra days.</p>
      </div>`;
  }

  function apptMatchesPortalProgram(appt, program) {
    if (!appt?.packageVisit || !program) return false;
    if (appt.programId && appt.programId === program.id) return true;
    return appt.programName === program.programName;
  }

  function renderProgramStatusBadge(p) {
    if (!p?.enrollmentLabel) return '';
    const cls = {
      active: 'is-active',
      voided: 'is-voided',
      refunded: 'is-refunded',
      partial_refund: 'is-partial-refund',
      completed: 'is-completed',
    }[p.enrollmentStatus] || '';
    return `<span class="studio-portal-program-status ${cls}">${esc(p.enrollmentLabel)}</span>`;
  }

  function renderProgramCard(p, clientId, upcomingApptsList) {
    const w = p.warranty;
    const enrolled = p.purchasedAt
      ? new Date(p.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const scheduledPkg = (upcomingApptsList || []).filter((a) => apptMatchesPortalProgram(a, p));
    const inactive = p.voided || p.refunded || p.fullyRefunded;
    return `
      <article class="studio-portal-program-card${inactive ? ' is-voided' : ''}">
        <header class="studio-portal-program-card-head">
          <div>
            <h5>${esc(p.programName || p.label)}</h5>
            ${p.tagline ? `<p class="studio-portal-program-tagline">${esc(p.tagline)}</p>` : ''}
          </div>
          <div class="studio-portal-program-head-badges">
            ${renderProgramStatusBadge(p)}
            ${p.paymentLabel ? `<span class="studio-portal-program-plan">${esc(p.paymentLabel)}</span>` : ''}
          </div>
        </header>
        ${p.visitsIncluded ? `
          <div class="studio-portal-visit-meter">
            <div class="studio-portal-visit-meter-top">
              <span class="studio-portal-visit-remaining"><em>${p.visitsRemaining ?? 0}</em> prepaid visits left</span>
              <span>${p.visitsUsed || 0} used · ${p.visitsScheduled || 0} scheduled · ${p.visitsIncluded} in package</span>
            </div>
            ${renderPortalVisitBar(p.visitsUsed, p.visitsScheduled, p.visitsIncluded)}
          </div>
        ` : '<p class="studio-portal-muted">Visit count will appear after your program is fully enrolled.</p>'}
        <dl class="studio-portal-program-meta">
          ${enrolled ? `<div><dt>Enrolled</dt><dd>${enrolled}</dd></div>` : ''}
          ${p.visitValue ? `<div><dt>Per-visit value</dt><dd>${RS().formatPrice(p.visitValue)}</dd></div>` : ''}
          ${p.duration ? `<div><dt>Typical session</dt><dd>${esc(p.duration)}</dd></div>` : ''}
          ${inactive ? `<div><dt>Status</dt><dd>${esc(p.enrollmentLabel || 'Inactive on file')}</dd></div>` : ''}
          ${p.refundedAmount ? `<div><dt>Refunded</dt><dd>${RS().formatPrice(p.refundedAmount)}</dd></div>` : ''}
        </dl>
        ${scheduledPkg.length ? `
          <div class="studio-portal-scheduled-pkg">
            <span>Upcoming prepaid visits on calendar</span>
            <ul>${scheduledPkg.map((a) => `
              <li>${fmtShortDate(a.date)} · ${fmtTime12(a.startTime)} — <strong>${esc(RS().getPackageVisitLabel(a))}</strong></li>
            `).join('')}</ul>
          </div>
        ` : ''}
        <div class="studio-portal-program-visits-used">
          <span>Visits used</span>
          ${renderPortalVisitHistoryList(clientId, p.id, p.programName)}
        </div>
        ${renderPortalWarrantyBlock(w)}
      </article>`;
  }

  function renderConsultForCard(consultFor) {
    return `
      <article class="studio-portal-consult-card">
        <p class="studio-portal-consult-eyebrow">Consultation on file</p>
        <strong>${esc(consultFor.programName)}</strong>
        ${consultFor.fromPriceDisplay ? `<p>${esc(consultFor.fromPriceDisplay)}</p>` : ''}
        <p class="studio-portal-muted">Your prepaid visits and hair warranty will show here once your program is enrolled at the studio.</p>
        <dl class="studio-portal-program-meta">
          <div><dt>Consultation</dt><dd>${fmtShortDate(consultFor.date)} · ${fmtTime12(consultFor.startTime)}</dd></div>
          <div><dt>Status</dt><dd>${esc(RS().APPT_STATUS?.[consultFor.status]?.label || consultFor.status)}</dd></div>
        </dl>
      </article>`;
  }

  function renderPortalProgramsSection(s, c, appts) {
    const programs = s?.programs || [];
    if (programs.length) {
      return `<div class="studio-portal-program-list">${programs.map((p) => renderProgramCard(p, c.id, appts)).join('')}</div>`;
    }
    if (s?.consultFor) return renderConsultForCard(s.consultFor);

    const history = RS().getProgramVisitHistory(c.id).slice(0, 6);
    const upcomingPkg = appts.filter((a) => a.packageVisit);
    if (history.length || upcomingPkg.length) {
      return `
        <div class="studio-portal-program-fallback">
          <p class="studio-portal-muted">We found prepaid visit activity on your account. Full program details will appear after studio enrollment is complete.</p>
          ${upcomingPkg.length ? `
            <div class="studio-portal-scheduled-pkg">
              <span>Scheduled prepaid visits</span>
              <ul>${upcomingPkg.map((a) => `
                <li>${fmtShortDate(a.date)} · ${fmtTime12(a.startTime)} — <strong>${esc(RS().getPackageVisitLabel(a))}</strong>${a.programName ? ` · ${esc(a.programName)}` : ''}</li>
              `).join('')}</ul>
            </div>` : ''}
          ${history.length ? `
            <div class="studio-portal-program-visits-used">
              <span>Visits used</span>
              ${renderPortalVisitHistoryList(c.id)}
            </div>` : ''}
        </div>`;
    }
    return '<p class="studio-portal-empty">No active programs on file yet. Your clinician will enroll you after your consultation.</p>';
  }

  function portalApptPolicyNote(appt) {
    if (appt?.attendancePenaltyBooking && (appt.prepaidAtBooking || 0) > 0) {
      return RS().getCancellationPolicy(appt).message;
    }
    const policy = RS().getAppointmentChangePolicy(appt);
    if (!policy.allowed) return RS().getReschedulePolicy(appt).message;
    if (policy.withinFreeWindow) {
      return 'Free to reschedule or cancel — more than 48 hours away.';
    }
    return `Within 48 hours — $${RS().RESCHEDULE_POLICY.lateFee} fee to reschedule or cancel.`;
  }

  function renderApptRow(appt, actions = true) {
    const label = appt.intendedService || appt.serviceName || 'Appointment';
    const visit = appt.packageVisit ? RS().getPackageVisitLabel(appt) : '';
    return `
      <article class="studio-portal-appt${appt.packageVisit ? ' is-pkg-visit' : ''}">
        <div class="studio-portal-appt-main">
          <strong>${esc(label)}</strong>
          ${visit ? `<span class="studio-portal-appt-tag studio-portal-appt-tag-pkg">${esc(visit)} · prepaid</span>` : ''}
          ${appt.packageVisit && appt.programName ? `<p class="studio-portal-appt-program">${esc(appt.programName)}</p>` : ''}
          <p>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</p>
          <small>${esc(portalApptPolicyNote(appt))}</small>
        </div>
        ${actions && appt.status === 'scheduled' ? `
          <div class="studio-portal-appt-actions">
            <button type="button" class="btn-secondary btn-sm" data-portal-reschedule="${esc(appt.id)}">Reschedule</button>
            <button type="button" class="btn-secondary btn-sm studio-portal-cancel-btn" data-portal-cancel="${esc(appt.id)}">Cancel</button>
          </div>
        ` : ''}
      </article>`;
  }

  function renderDashboard() {
    const c = client();
    const s = summary();
    const appts = upcomingAppts();
    const next = s?.nextAppointment;

    return `
      <div class="studio-portal-dashboard">
        <header class="studio-portal-dash-head">
          <div>
            <p class="studio-eyebrow">Welcome back</p>
            <h3>${esc(c?.name || 'Client')}</h3>
          </div>
          <button type="button" class="btn-secondary btn-sm" data-portal-logout>Sign out</button>
        </header>
        ${renderPasswordPromptBanner()}
        ${renderIntakeBanner()}

        <div class="studio-portal-grid">
          <section class="studio-portal-panel">
            <h4>Next appointment</h4>
            ${next ? renderApptRow(next) : '<p class="studio-portal-empty">No upcoming appointments.</p>'}
            <button type="button" class="btn-primary btn-sm" data-portal-book>Book appointment</button>
          </section>

          <section class="studio-portal-panel">
            <h4>Studio credit</h4>
            <p class="studio-portal-credit">${RS().formatPrice(s?.creditBalance || 0)}</p>
            <p class="studio-portal-hint">Scheduling fees and adjustments appear here and apply at checkout.</p>
          </section>

          <section class="studio-portal-panel studio-portal-panel-wide studio-portal-panel-programs">
            <h4>Prepaid visits &amp; programs</h4>
            <p class="studio-portal-section-lead">Included visits on your package, what&apos;s scheduled, visits you&apos;ve used, and hair warranty status.</p>
            ${c ? renderPortalProgramsSection(s, c, appts) : '<p class="studio-portal-empty">Sign in to view your program.</p>'}
          </section>

          ${renderDashboardFormsPanel()}

          <section class="studio-portal-panel studio-portal-panel-wide">
            <h4>All upcoming visits</h4>
            ${appts.length ? appts.map((a) => renderApptRow(a)).join('') : '<p class="studio-portal-empty">Nothing scheduled yet.</p>'}
          </section>
        </div>
      </div>`;
  }

  function renderReschedule() {
    const appt = RS().getAppointment(state.rescheduleId);
    if (!appt) return '<p class="studio-portal-empty">Appointment not found.</p>';

    const policy = RS().getReschedulePolicy(appt);
    const dates = RS().getPublicBookableDates(42);
    if (!state.rescheduleDate && dates.length) state.rescheduleDate = dates[0];

    const rescheduleBlock = appt.providerDuration
      || RS().getSchedulingDurationMin(RS().getService(appt.serviceId))
      || appt.duration
      || 60;
    const availability = state.rescheduleDate
      ? RS().getPublicSlotAvailability(state.rescheduleDate, rescheduleBlock)
      : { display: [] };
    const slots = availability.display || [];

    if (state.rescheduleStep === 'fee') {
      const fee = RS().RESCHEDULE_POLICY.lateFee;
      return `
        <div class="studio-portal-card">
          <button type="button" class="studio-book-back" data-portal-back-dash>← Back</button>
          <h3>Reschedule fee required</h3>
          <p>Your appointment is within ${RS().RESCHEDULE_POLICY.freeWindowHours} hours. A <strong>$${fee}</strong> non-refundable fee applies to move it.</p>
          <div class="studio-book-summary-card">
            <div class="studio-book-summary-row"><span>Appointment</span><strong>${esc(appt.serviceName)}</strong></div>
            <div class="studio-book-summary-row"><span>New time</span><strong>${esc(fmtDate(state.rescheduleDate))} · ${esc(fmtTime12(state.rescheduleTime))}</strong></div>
            <div class="studio-book-summary-row studio-book-summary-total"><span>Due today</span><strong>${RS().formatPrice(fee)}</strong></div>
          </div>
          <form class="studio-book-form" id="studioPortalRescheduleFeeForm">
            <label class="form-field"><span>Name on card *</span><input type="text" name="cardName" required autocomplete="cc-name"></label>
            <label class="form-field"><span>Card number *</span><input type="text" name="cardNumber" required inputmode="numeric" placeholder="4242 4242 4242 4242" autocomplete="cc-number"></label>
            <div class="studio-book-card-row">
              <label class="form-field"><span>Expiry *</span><input type="text" name="cardExpiry" required placeholder="MM/YY" autocomplete="cc-exp"></label>
              <label class="form-field"><span>CVC *</span><input type="text" name="cardCvc" required inputmode="numeric" autocomplete="cc-csc"></label>
            </div>
            <button type="submit" class="btn-primary btn-full" id="studioPortalReschedulePayBtn">Pay ${RS().formatPrice(fee)} &amp; confirm</button>
          </form>
        </div>`;
    }

    return `
      <div class="studio-portal-card">
        <button type="button" class="studio-book-back" data-portal-back-dash>← Back</button>
        <h3>Reschedule appointment</h3>
        <p><strong>${esc(appt.serviceName)}</strong><br>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</p>
        <p class="studio-portal-policy ${policy.feeRequired ? 'studio-portal-policy-warn' : ''}">${esc(policy.message)}</p>
        <div class="studio-book-date-scroll">
          ${dates.map((d) => `
            <button type="button" class="studio-book-date${d === state.rescheduleDate ? ' selected' : ''}" data-portal-rdate="${d}">
              <span>${fmtShortDate(d)}</span>
            </button>`).join('')}
        </div>
        <div class="studio-book-times">
          ${slots.length ? slots.map((slot) => `
            <button type="button" class="studio-book-time${slot.time === state.rescheduleTime ? ' selected' : ''}"
              data-portal-rtime="${slot.time}" data-portal-rcol="${slot.column}">${fmtTime12(slot.time)}</button>
          `).join('') : '<p class="studio-book-empty">No openings for this day — try another date.</p>'}
        </div>
        ${state.rescheduleTime ? `<button type="button" class="btn-primary btn-full" data-portal-reschedule-confirm>Continue</button>` : ''}
      </div>`;
  }

  function renderCancel() {
    const appt = RS().getAppointment(state.cancelId);
    if (!appt) return '<p class="studio-portal-empty">Appointment not found.</p>';

    const policy = RS().getCancellationPolicy(appt);
    const label = appt.intendedService || appt.serviceName || 'Appointment';

    if (state.cancelStep === 'fee') {
      const fee = RS().RESCHEDULE_POLICY.lateFee;
      return `
        <div class="studio-portal-card">
          <button type="button" class="studio-book-back" data-portal-back-dash>← Back</button>
          <h3>Cancellation fee required</h3>
          <p>Your appointment is within ${RS().RESCHEDULE_POLICY.freeWindowHours} hours. A <strong>$${fee}</strong> non-refundable fee applies to cancel it.</p>
          <div class="studio-book-summary-card">
            <div class="studio-book-summary-row"><span>Appointment</span><strong>${esc(label)}</strong></div>
            <div class="studio-book-summary-row"><span>Scheduled</span><strong>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</strong></div>
            <div class="studio-book-summary-row studio-book-summary-total"><span>Due today</span><strong>${RS().formatPrice(fee)}</strong></div>
          </div>
          <form class="studio-book-form" id="studioPortalCancelFeeForm">
            <label class="form-field"><span>Name on card *</span><input type="text" name="cardName" required autocomplete="cc-name"></label>
            <label class="form-field"><span>Card number *</span><input type="text" name="cardNumber" required inputmode="numeric" placeholder="4242 4242 4242 4242" autocomplete="cc-number"></label>
            <div class="studio-book-card-row">
              <label class="form-field"><span>Expiry *</span><input type="text" name="cardExpiry" required placeholder="MM/YY" autocomplete="cc-exp"></label>
              <label class="form-field"><span>CVC *</span><input type="text" name="cardCvc" required inputmode="numeric" autocomplete="cc-csc"></label>
            </div>
            <button type="submit" class="btn-primary btn-full" id="studioPortalCancelPayBtn">Pay ${RS().formatPrice(fee)} &amp; confirm cancellation</button>
          </form>
        </div>`;
    }

    const isPenalty = !!policy.attendancePenalty;
    return `
      <div class="studio-portal-card">
        <button type="button" class="studio-book-back" data-portal-back-dash>← Back</button>
        <h3>Cancel appointment</h3>
        <p><strong>${esc(label)}</strong><br>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</p>
        <p class="studio-portal-policy ${policy.feeRequired || isPenalty ? 'studio-portal-policy-warn' : ''}">${esc(policy.message)}</p>
        <p class="studio-portal-hint">This cannot be undone.${policy.feeRequired ? ' A cancellation fee will be charged.' : isPenalty ? ' Your refund follows the prepaid attendance policy above.' : ' No fee applies.'}</p>
        <button type="button" class="btn-primary btn-full${policy.feeRequired ? '' : ' studio-portal-cancel-btn'}" data-portal-cancel-confirm>${policy.feeRequired ? 'Continue' : 'Cancel appointment'}</button>
      </div>`;
  }

  function renderCancelConfirm() {
    const appt = state.confirmed?.appointment;
    if (!appt) return '';
    const label = appt.intendedService || appt.serviceName || 'Appointment';
    const refund = state.confirmed?.refund;
    return `
      <div class="studio-book-confirm">
        <div class="studio-book-confirm-icon" aria-hidden="true">✓</div>
        <h3>Appointment canceled.</h3>
        <div class="studio-book-summary-card">
          <div class="studio-book-summary-row"><span>Service</span><strong>${esc(label)}</strong></div>
          <div class="studio-book-summary-row"><span>Was scheduled</span><strong>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</strong></div>
          ${refund ? `
            <div class="studio-book-summary-row"><span>Refund issued</span><strong>${esc(RS().formatPrice(refund.refundable || 0))}</strong></div>
            <div class="studio-book-summary-row"><span>Retained</span><strong>${esc(RS().formatPrice(refund.retained || 0))}</strong></div>` : ''}
        </div>
        <button type="button" class="btn-primary" data-portal-back-dash>Back to dashboard</button>
      </div>`;
  }

  function renderBookService() {
    const c = client();
    const gender = state.bookGender || c?.gender || 'men';
    const cat = state.bookCategory || defaultBookCategory(gender);
    const cats = RS().visibleCategories(gender);
    const isPackage = RS().isPackageCategory(cat);
    const families = isPackage ? RS().getProgramFamilies({ gender, category: cat }) : [];
    const services = isPackage ? [] : RS().filterServices({ gender, category: cat });

    const familyCards = families.map((grp) => {
      const baseSvc = grp.services?.[0];
      const canBook = baseSvc && RS().previewPackageBooking(c.id, { serviceId: baseSvc.id });
      const blocked = canBook?.mode === 'purchase_needed' || canBook?.mode === 'exhausted';
      return `
        <button type="button" class="studio-book-option${state.bookServiceId === baseSvc?.id ? ' selected' : ''}${blocked ? ' disabled' : ''}"
          data-portal-book-svc="${esc(baseSvc?.id || '')}" data-portal-book-label="${esc(grp.base)}" ${blocked ? 'disabled' : ''}>
          <strong>${esc(grp.base)}</strong>
          ${blocked ? `<span class="studio-book-meta">${canBook?.mode === 'exhausted' ? 'No visits remaining' : 'Enroll at studio first'}</span>` : `<span class="studio-book-meta">${canBook?.mode === 'included' ? 'Prepaid visit available' : RS().formatPrice(baseSvc?.price || 0)}</span>`}
        </button>`;
    }).join('');

    const serviceCards = services.map((svc) => {
      const preview = RS().previewPackageBooking(c.id, { serviceId: svc.id });
      const selected = state.bookServiceId === svc.id;
      const price = preview?.mode === 'included' ? 'Included visit' : RS().formatPrice(svc.price);
      return `
        <button type="button" class="studio-book-option${selected ? ' selected' : ''}" data-portal-book-svc="${svc.id}" data-portal-book-label="${esc(RS().shortName(svc.name))}">
          <strong>${esc(RS().shortName(svc.name))}</strong>
          <span class="studio-book-meta">${esc(RS().formatClientDuration(svc))} · ${esc(price)}</span>
        </button>`;
    }).join('');

    const paymentPolicy = RS().getClientBookingPaymentPolicy?.(c.id, c.phone);
    const violationBanner = paymentPolicy?.requiresFullPrice ? `
      <div class="studio-returning-banner studio-attendance-policy-banner" role="status">
        <strong>Full prepayment required</strong>
        <p>${esc(paymentPolicy.message)} Book on our website from the Book tab, or call the studio.</p>
      </div>` : '';

    return `
      <div class="studio-portal-card">
        <button type="button" class="studio-book-back" data-portal-back-dash>← Back</button>
        <h3>Book an appointment</h3>
        <p>Schedule prepaid program visits or à la carte services on your account.</p>
        ${violationBanner}
        <div class="studio-book-cat-bar studio-book-cat-bar-public">
          ${cats.map((c) => `<button type="button" class="studio-book-cat${c.id === cat ? ' active' : ''}" data-portal-book-cat="${c.id}">${esc(c.label)}</button>`).join('')}
        </div>
        <div class="studio-book-options">${isPackage ? familyCards : serviceCards}</div>
        ${state.bookServiceId ? `<button type="button" class="btn-primary btn-full" data-portal-book-next>Choose date &amp; time</button>` : ''}
      </div>`;
  }

  function renderBookSchedule() {
    const svc = RS().getService(state.bookServiceId);
    const duration = state.bookDuration || RS().getAppointmentDurationMin(svc);
    const blockMins = state.bookSchedulingDuration || RS().getSchedulingDurationMin(svc) || duration;
    const dates = RS().getPublicBookableDates(42);
    if (!state.bookDate && dates.length) state.bookDate = dates[0];
    const availability = state.bookDate ? RS().getPublicSlotAvailability(state.bookDate, blockMins) : { display: [] };
    const slots = availability.display || [];

    return `
      <div class="studio-portal-card">
        <button type="button" class="studio-book-back" data-portal-book-back-svc>← Change service</button>
        <h3>Pick a date &amp; time</h3>
        <p>${esc(state.bookServiceLabel)} · ${duration} min</p>
        <div class="studio-book-date-scroll">
          ${dates.map((d) => `
            <button type="button" class="studio-book-date${d === state.bookDate ? ' selected' : ''}" data-portal-bdate="${d}">
              <span>${fmtShortDate(d)}</span>
            </button>`).join('')}
        </div>
        <div class="studio-book-times">
          ${slots.length ? slots.map((slot) => `
            <button type="button" class="studio-book-time${slot.time === state.bookTime ? ' selected' : ''}"
              data-portal-btime="${slot.time}" data-portal-bcol="${slot.column}">${fmtTime12(slot.time)}</button>
          `).join('') : '<p class="studio-book-empty">No openings for this day.</p>'}
        </div>
        ${state.bookTime ? `
          ${renderBookingPreferencesFields('portal')}
          <button type="button" class="btn-primary btn-full" data-portal-book-confirm>Confirm booking</button>` : ''}
      </div>`;
  }

  function renderBookConfirm() {
    const appt = state.confirmed?.appointment;
    if (!appt) return '';
    return `
      <div class="studio-book-confirm">
        <div class="studio-book-confirm-icon" aria-hidden="true">✓</div>
        <h3>Appointment booked.</h3>
        <div class="studio-book-summary-card">
          <div class="studio-book-summary-row"><span>Service</span><strong>${esc(appt.serviceName)}</strong></div>
          <div class="studio-book-summary-row"><span>When</span><strong>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</strong></div>
        </div>
        <button type="button" class="btn-primary" data-portal-back-dash>Back to dashboard</button>
      </div>`;
  }

  function renderBookingPreferencesFields(prefix = 'portal') {
    const VF = window.StudioVisitFlow;
    const beverages = VF?.getArrivalBeverages?.() || [];
    const photos = state.bookInspoPhotos || [];
    return `
      <section class="studio-book-prefs">
        <h4>Help us prepare for you</h4>
        <p class="studio-portal-hint">Optional — share inspiration and preferences so your chair is ready when you arrive.</p>
        <label class="form-field"><span>What you like about past hair services</span>
          <textarea id="${prefix}HairLikes" rows="2" placeholder="Cuts, color, stylists, products you loved…">${esc(state.bookHairLikes)}</textarea></label>
        <label class="form-field"><span>What you did not like</span>
          <textarea id="${prefix}HairDislikes" rows="2" placeholder="Anything to avoid — damage, tone, wait time, style…">${esc(state.bookHairDislikes)}</textarea></label>
        <label class="form-field"><span>Prior hair services (last 12 months)</span>
          <textarea id="${prefix}PriorServices" rows="2" placeholder="Salon, barber, color, extensions, systems…">${esc(state.bookPriorServices)}</textarea></label>
        <label class="form-field"><span>21+ arrival beverage</span>
          <select id="${prefix}Beverage">
            ${beverages.map((b) => `<option value="${esc(b.id)}"${state.bookBeverage === b.id ? ' selected' : ''}>${esc(b.label)}</option>`).join('')}
          </select></label>
        <label class="form-field studio-book-inspo-upload">
          <span>Inspiration photos</span>
          <input type="file" id="${prefix}InspoPhotos" accept="image/*" multiple>
          <small>Up to 6 photos — styles, colors, or references you love.</small>
        </label>
        ${photos.length ? `<div class="studio-book-inspo-preview">${photos.map((p) => `<img src="${p.dataUrl}" alt="${esc(p.name || 'Inspo')}" title="${esc(p.name || '')}">`).join('')}</div>` : ''}
      </section>`;
  }

  function syncBookingPreferencesFromDOM(prefix = 'portal') {
    state.bookHairLikes = ($(`#${prefix}HairLikes`)?.value || state.bookHairLikes || '').trim();
    state.bookHairDislikes = ($(`#${prefix}HairDislikes`)?.value || state.bookHairDislikes || '').trim();
    state.bookPriorServices = ($(`#${prefix}PriorServices`)?.value || state.bookPriorServices || '').trim();
    state.bookBeverage = $(`#${prefix}Beverage`)?.value || state.bookBeverage || '';
  }

  function bookingPreferencesPayload() {
    const VF = window.StudioVisitFlow;
    return VF?.buildClientPreferences?.({
      hairLikes: state.bookHairLikes,
      hairDislikes: state.bookHairDislikes,
      priorServices: state.bookPriorServices,
      beverage: state.bookBeverage,
      inspoPhotos: state.bookInspoPhotos,
    }) || null;
  }

  async function ingestInspoPhotoFiles(files, prefix = 'portal') {
    const RSapi = RS();
    if (!RSapi?.compressImageFile || !files?.length) return;
    const room = Math.max(0, 6 - (state.bookInspoPhotos || []).length);
    const batch = [...files].slice(0, room);
    for (const file of batch) {
      try {
        const compressed = await RSapi.compressImageFile(file);
        state.bookInspoPhotos.push({
          id: `inspo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          dataUrl: compressed.dataUrl,
          addedAt: new Date().toISOString(),
        });
      } catch (_) { /* skip bad file */ }
    }
    const input = $(`#${prefix}InspoPhotos`);
    if (input) input.value = '';
    render();
  }

  function renderIntake() {
    const VF = window.StudioVisitFlow;
    const forms = portalIntakeForms();
    const appt = RS()?.getAppointment(state.intakeApptId);
    if (!appt) return '<p class="studio-portal-empty">Appointment not found.</p>';
    const form = forms[state.intakeStep];
    if (!form) return '<p class="studio-portal-empty">No intake forms configured.</p>';
    const formData = state.intakeData[form.id] || {};
    const isSigned = state.intakeSigned.includes(form.id);
    const isSkipped = state.intakeSkipped.includes(form.id) && !isSigned;
    const formReady = VF?.portalIntakeFormReady(form, state.intakeSigned, state.intakeData);
    const progressPct = ((state.intakeStep + 1) / forms.length) * 100;
    const policyHtml = VF?.renderFormPolicyLinksHtml?.(form, esc) || '';
    const canEdit = form.portal !== false && !form.signAtVisit;

    return `
      <div class="studio-portal-card studio-portal-intake-card">
        <button type="button" class="studio-book-back" data-portal-intake-hub>← All forms</button>
        ${renderIntakeFormNav(forms, appt)}
        <p class="studio-eyebrow">Client intake</p>
        <h3>${esc(form.label)}</h3>
        <p class="studio-portal-intake-meta">${esc(appt.intendedService || appt.serviceName || 'Visit')} · ${esc(fmtDate(appt.date))}</p>
        <div class="studio-portal-intake-progress" aria-hidden="true"><span style="width:${progressPct}%"></span></div>
        <p class="studio-portal-hint">Step ${state.intakeStep + 1} of ${forms.length}${form.required ? ' · Required' : ' · Optional'}</p>
        <p>${esc(form.desc)}</p>
        ${form.intro ? `<p class="studio-portal-intake-intro">${esc(form.intro)}</p>` : ''}
        ${policyHtml}
        ${(form.clauses || []).length ? `<ul class="studio-portal-intake-clauses">${form.clauses.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
        <div class="studio-book-form studio-portal-intake-form" id="studioPortalIntakeForm">
          <fieldset class="studio-portal-intake-fieldset"${canEdit ? '' : ' disabled'}>
            ${VF.normalizeFormFields(form).map((f) => renderPortalIntakeField(form, f, formData)).join('')}
            <label class="studio-portal-intake-sign">
              <input type="checkbox" id="portalIntakeSigned" ${isSigned ? 'checked' : ''}${form.required && canEdit ? ' required' : ''}${canEdit ? '' : ' disabled'}>
              <span>I have reviewed this section${policyHtml ? ' and the linked policies' : ''}${form.required ? ' and agree (required)' : ''}</span>
            </label>
          </fieldset>
          ${isSkipped ? '<p class="studio-portal-intake-skipped-note">This form was skipped at the studio — fill it out and sign below to complete your intake.</p>' : ''}
          ${formReady && !isSkipped ? '<p class="studio-portal-hint">On file — update any fields and save to keep your answers current.</p>' : ''}
          <div class="studio-portal-intake-actions">
            ${state.intakeStep > 0 ? '<button type="button" class="btn-secondary btn-sm" data-portal-intake-back>Back</button>' : '<span></span>'}
            <div class="studio-portal-intake-actions-main">
              <button type="button" class="btn-secondary btn-sm" data-portal-intake-print>Print forms</button>
              ${!canEdit
                ? (state.intakeStep < forms.length - 1
                  ? '<button type="button" class="btn-primary btn-sm" data-portal-intake-next>Next form</button>'
                  : '<button type="button" class="btn-primary btn-sm" data-portal-intake-hub>Back to forms</button>')
                : (state.intakeStep < forms.length - 1
                  ? '<button type="button" class="btn-primary btn-sm" data-portal-intake-next>Save &amp; continue</button>'
                  : '<button type="button" class="btn-primary btn-sm" data-portal-intake-finish>Save intake</button>')}
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderIntakeDone() {
    const appt = RS()?.getAppointment(state.intakeApptId);
    return `
      <div class="studio-book-confirm studio-portal-intake-done">
        <div class="studio-book-confirm-icon" aria-hidden="true">✓</div>
        <h3>Intake complete</h3>
        <p>${appt ? `You're all set for ${esc(fmtDate(appt.date))}. We'll see you at the studio.` : 'Your intake forms are on file.'}</p>
        <button type="button" class="btn-primary" data-portal-intake-hub>View all forms</button>
        <button type="button" class="btn-secondary" data-portal-back-dash>Back to dashboard</button>
      </div>`;
  }

  function renderRescheduleConfirm() {
    const appt = state.confirmed?.appointment;
    if (!appt) return '';
    return `
      <div class="studio-book-confirm">
        <div class="studio-book-confirm-icon" aria-hidden="true">✓</div>
        <h3>Appointment updated.</h3>
        <div class="studio-book-summary-card">
          <div class="studio-book-summary-row"><span>Service</span><strong>${esc(appt.serviceName)}</strong></div>
          <div class="studio-book-summary-row"><span>New time</span><strong>${esc(fmtDate(appt.date))} · ${esc(fmtTime12(appt.startTime))}</strong></div>
        </div>
        <button type="button" class="btn-primary" data-portal-back-dash>Back to dashboard</button>
      </div>`;
  }

  function render() {
    const root = $('#studioPortalRoot');
    if (!root) return;

    if (state.view === 'setup-password') {
      root.innerHTML = renderSetupPassword();
    } else if (RS()?.isClientPortalAuthed?.()) {
      if (state.view === 'forms') {
        root.innerHTML = renderFormsHub();
      } else if (state.view === 'intake') {
        root.innerHTML = renderIntake();
      } else if (state.view === 'intake-done') {
        root.innerHTML = renderIntakeDone();
      } else if (state.view === 'dashboard') {
        root.innerHTML = renderDashboard();
      } else if (state.view === 'reschedule') {
        root.innerHTML = state.confirmed ? renderRescheduleConfirm() : renderReschedule();
      } else if (state.view === 'cancel') {
        root.innerHTML = state.confirmed ? renderCancelConfirm() : renderCancel();
      } else if (state.view === 'book') {
        root.innerHTML = state.confirmed ? renderBookConfirm() : (state.bookStep === 1 ? renderBookSchedule() : renderBookService());
      } else {
        state.view = 'dashboard';
        root.innerHTML = renderDashboard();
      }
    } else {
      state.view = 'login';
      root.innerHTML = renderLogin();
    }

    if (state.error) {
      root.insertAdjacentHTML('afterbegin', `<div class="studio-book-error" role="alert">${esc(state.error)}</div>`);
      state.error = '';
    }
  }

  function resetBookState() {
    state.bookHairLikes = '';
    state.bookHairDislikes = '';
    state.bookPriorServices = '';
    state.bookBeverage = '';
    state.bookInspoPhotos = [];
    const c = client();
    state.bookGender = c?.gender || 'men';
    state.bookCategory = defaultBookCategory(state.bookGender);
    state.bookServiceId = '';
    state.bookServiceLabel = '';
    state.bookDuration = 60;
    state.bookDate = '';
    state.bookTime = '';
    state.bookColumn = 1;
    state.bookStep = 0;
    state.confirmed = null;
  }

  function resetRescheduleState() {
    state.rescheduleDate = '';
    state.rescheduleTime = '';
    state.rescheduleColumn = 1;
    state.rescheduleStep = 'slots';
    state.confirmed = null;
  }

  function resetCancelState() {
    state.cancelId = '';
    state.cancelStep = 'confirm';
    state.confirmed = null;
  }

  function submitReschedule(feePaid) {
    const result = RS().rescheduleClientAppointment(state.rescheduleId, {
      date: state.rescheduleDate,
      startTime: state.rescheduleTime,
      column: state.rescheduleColumn,
    }, { feePaid });

    if (result?.feeRequired) {
      state.rescheduleStep = 'fee';
      render();
      return;
    }
    if (result?.error) {
      state.error = result.error;
      render();
      return;
    }
    state.confirmed = result;
    render();
  }

  function submitCancel(feePaid) {
    const result = RS().cancelClientAppointment(state.cancelId, { feePaid });

    if (result?.feeRequired) {
      state.cancelStep = 'fee';
      render();
      return;
    }
    if (result?.error) {
      state.error = result.error;
      render();
      return;
    }
    state.confirmed = result;
    render();
  }

  function bind() {
    const root = $('#studioPortalRoot');
    if (!root) return;

    root.addEventListener('click', (e) => {
      const modeBtn = e.target.closest('[data-portal-login-mode]');
      if (modeBtn) {
        state.loginMode = modeBtn.dataset.portalLoginMode;
        render();
        return;
      }

      if (e.target.closest('[data-portal-set-password]')) {
        state.view = 'setup-password';
        render();
        return;
      }

      if (e.target.closest('[data-portal-setup-skip]')) {
        state.view = RS()?.isClientPortalAuthed?.() ? 'dashboard' : 'login';
        render();
        return;
      }

      if (e.target.closest('[data-portal-logout]')) {
        RS().logoutClientPortal();
        state.view = 'login';
        render();
        return;
      }

      if (e.target.closest('[data-portal-back-dash]')) {
        state.view = 'dashboard';
        state.confirmed = null;
        resetBookState();
        resetRescheduleState();
        resetCancelState();
        render();
        return;
      }

      if (e.target.closest('[data-portal-book]')) {
        resetBookState();
        state.view = 'book';
        render();
        return;
      }

      const intakeBtn = e.target.closest('[data-portal-intake]');
      if (intakeBtn) {
        openIntakeView(intakeBtn.dataset.portalIntake);
        render();
        return;
      }

      const intakeFormBtn = e.target.closest('[data-portal-intake-form]');
      if (intakeFormBtn) {
        openIntakeView(intakeFormBtn.dataset.portalIntakeForm);
        if (intakeFormBtn.dataset.portalFormOpen != null) {
          openIntakeForm(intakeFormBtn.dataset.portalFormOpen);
        }
        render();
        return;
      }

      if (e.target.closest('[data-portal-intake-hub]')) {
        state.view = 'forms';
        render();
        return;
      }

      const formOpenBtn = e.target.closest('[data-portal-form-open]');
      if (formOpenBtn && !formOpenBtn.disabled) {
        if (!state.intakeApptId && portalFormsAppts()[0]) {
          loadIntakeDraft(portalFormsAppts()[0].id);
        }
        openIntakeForm(formOpenBtn.dataset.portalFormOpen);
        render();
        return;
      }

      if (e.target.closest('[data-portal-intake-submit-all]')) {
        const appt = RS()?.getAppointment(state.intakeApptId);
        const status = appt ? intakeStatusForAppt(appt) : null;
        if (status?.requiredRemaining > 0) {
          state.error = 'Complete all required forms before submitting.';
          render();
          return;
        }
        const result = RS().saveClientPortalIntake(state.intakeApptId, {
          intakeData: state.intakeData,
          intakeForms: state.intakeSigned,
          intakeSkippedForms: state.intakeSkipped,
          intakeCompleted: true,
        });
        if (result?.error) {
          state.error = result.error;
          render();
          return;
        }
        state.view = 'intake-done';
        state.pendingIntakeRedirect = '';
        render();
        return;
      }

      if (e.target.closest('[data-portal-intake-back]')) {
        persistIntakeStep(false);
        if (state.intakeStep > 0) state.intakeStep -= 1;
        render();
        return;
      }

      const nextBtn = e.target.closest('[data-portal-intake-next]');
      if (nextBtn) {
        const VF = window.StudioVisitFlow;
        const forms = portalIntakeForms();
        const form = forms[state.intakeStep];
        const signedEl = document.getElementById('portalIntakeSigned');
        const mergedData = form ? {
          ...state.intakeData,
          [form.id]: { ...(state.intakeData[form.id] || {}), ...collectIntakeFormData(form) },
        } : state.intakeData;
        const trialSigned = signedEl?.checked && form && !state.intakeSigned.includes(form.id)
          ? [...state.intakeSigned, form.id]
          : [...state.intakeSigned];
        if (!form || !VF?.portalIntakeFormReady(form, trialSigned, mergedData)) {
          state.error = 'Complete required fields and check the agreement box to continue.';
          render();
          return;
        }
        if (signedEl && !signedEl.checked) {
          state.error = 'Please check the agreement box to continue.';
          render();
          return;
        }
        persistIntakeStep(false);
        if (state.intakeStep < forms.length - 1) state.intakeStep += 1;
        else state.view = 'forms';
        render();
        return;
      }

      if (e.target.closest('[data-portal-intake-finish]')) {
        const VF = window.StudioVisitFlow;
        const forms = portalIntakeForms();
        const form = forms[state.intakeStep];
        const signedEl = document.getElementById('portalIntakeSigned');
        if (signedEl && !signedEl.checked) {
          state.error = 'Please check the agreement box to submit.';
          render();
          return;
        }
        if (form) {
          const mergedData = {
            ...state.intakeData,
            [form.id]: { ...(state.intakeData[form.id] || {}), ...collectIntakeFormData(form) },
          };
          if (signedEl?.checked && !state.intakeSigned.includes(form.id)) {
            state.intakeSigned.push(form.id);
          }
          const requiredOk = forms
            .filter((f) => f.required)
            .every((f) => VF.portalIntakeFormReady(f, state.intakeSigned, mergedData));
          if (!requiredOk) {
            state.error = 'Complete all required forms before submitting.';
            render();
            return;
          }
        }
        const result = persistIntakeStep(true);
        if (result?.error) {
          state.error = result.error;
          render();
          return;
        }
        state.view = 'intake-done';
        state.pendingIntakeRedirect = '';
        render();
        return;
      }

      if (e.target.closest('[data-portal-intake-print]')) {
        const VF = window.StudioVisitFlow;
        const appt = RS()?.getAppointment(state.intakeApptId);
        const c = client();
        if (VF && appt) {
          VF.printIntakeForms(appt, c, {
            blank: true,
            intakeData: state.intakeData,
            signed: state.intakeSigned,
            skipped: state.intakeSkipped,
          });
        }
        return;
      }

      const rBtn = e.target.closest('[data-portal-reschedule]');
      if (rBtn) {
        state.rescheduleId = rBtn.dataset.portalReschedule;
        resetRescheduleState();
        state.view = 'reschedule';
        render();
        return;
      }

      const rDate = e.target.closest('[data-portal-rdate]');
      if (rDate) {
        state.rescheduleDate = rDate.dataset.portalRdate;
        state.rescheduleTime = '';
        render();
        return;
      }

      const rTime = e.target.closest('[data-portal-rtime]');
      if (rTime) {
        state.rescheduleTime = rTime.dataset.portalRtime;
        state.rescheduleColumn = Number(rTime.dataset.portalRcol) || 1;
        render();
        return;
      }

      if (e.target.closest('[data-portal-reschedule-confirm]')) {
        submitReschedule(false);
        return;
      }

      const cBtn = e.target.closest('[data-portal-cancel]');
      if (cBtn) {
        resetCancelState();
        state.cancelId = cBtn.dataset.portalCancel;
        state.view = 'cancel';
        render();
        return;
      }

      if (e.target.closest('[data-portal-cancel-confirm]')) {
        submitCancel(false);
        return;
      }

      const catBtn = e.target.closest('[data-portal-book-cat]');
      if (catBtn) {
        state.bookCategory = catBtn.dataset.portalBookCat;
        state.bookServiceId = '';
        state.bookServiceLabel = '';
        render();
        return;
      }

      const svcBtn = e.target.closest('[data-portal-book-svc]');
      if (svcBtn && !svcBtn.disabled) {
        const svc = RS().getService(svcBtn.dataset.portalBookSvc);
        state.bookServiceId = svcBtn.dataset.portalBookSvc;
        state.bookServiceLabel = svcBtn.dataset.portalBookLabel || RS().shortName(svc?.name);
        state.bookDuration = RS().getAppointmentDurationMin(svc);
        state.bookSchedulingDuration = RS().getSchedulingDurationMin(svc);
        render();
        return;
      }

      if (e.target.closest('[data-portal-book-next]')) {
        state.bookStep = 1;
        render();
        return;
      }

      if (e.target.closest('[data-portal-book-back-svc]')) {
        state.bookStep = 0;
        state.bookDate = '';
        state.bookTime = '';
        render();
        return;
      }

      const bDate = e.target.closest('[data-portal-bdate]');
      if (bDate) {
        state.bookDate = bDate.dataset.portalBdate;
        state.bookTime = '';
        render();
        return;
      }

      const bTime = e.target.closest('[data-portal-btime]');
      if (bTime) {
        state.bookTime = bTime.dataset.portalBtime;
        state.bookColumn = Number(bTime.dataset.portalBcol) || 1;
        render();
        return;
      }

      if (e.target.closest('[data-portal-book-confirm]')) {
        syncBookingPreferencesFromDOM('portal');
        const prefs = bookingPreferencesPayload();
        const result = RS().createClientPortalBooking({
          serviceId: state.bookServiceId,
          serviceLabel: state.bookServiceLabel,
          date: state.bookDate,
          startTime: state.bookTime,
          column: state.bookColumn,
          duration: state.bookDuration,
          schedulingDuration: state.bookSchedulingDuration || state.bookDuration,
          clientPreferences: prefs,
          bookingInspoPhotos: prefs?.inspoPhotos || [],
        });
        if (result?.error) {
          state.error = result.error;
          render();
          return;
        }
        state.confirmed = result;
        render();
      }
    });

    root.addEventListener('submit', async (e) => {
      if (e.target.id === 'studioPortalLoginForm') {
        e.preventDefault();
        const fd = new FormData(e.target);
        state.loginPhone = String(fd.get('phone') || '').trim();
        state.loginEmail = String(fd.get('email') || '').trim();
        const secret = String(fd.get('secret') || '').trim();
        const loginMode = String(fd.get('loginMode') || state.loginMode || 'code');
        state.loginMode = loginMode;
        const result = await RS().loginClientPortal(state.loginPhone, state.loginEmail, secret, { mode: loginMode });
        if (result?.error) {
          state.error = result.error;
          render();
          return;
        }
        if (state.pendingIntakeRedirect) {
          openIntakeView(state.pendingIntakeRedirect);
          state.pendingIntakeRedirect = '';
        } else {
          state.view = 'dashboard';
        }
        render();
        return;
      }

      if (e.target.id === 'studioPortalSetupForm') {
        e.preventDefault();
        const fd = new FormData(e.target);
        const password = String(fd.get('password') || '');
        const confirm = String(fd.get('confirm') || '');
        let result;
        if (RS()?.isClientPortalAuthed?.()) {
          result = await RS().setupAuthedClientPortalPassword(password, confirm);
        } else {
          state.loginPhone = String(fd.get('phone') || '').trim();
          state.loginEmail = String(fd.get('email') || '').trim();
          state.setupCode = String(fd.get('code') || '').trim();
          result = await RS().setupClientPortalPassword(
            state.loginPhone,
            state.loginEmail,
            state.setupCode,
            password,
            confirm
          );
        }
        if (result?.error) {
          state.error = result.error;
          render();
          return;
        }
        state.view = 'dashboard';
        render();
        return;
      }

      if (e.target.id === 'studioPortalRescheduleFeeForm') {
        e.preventDefault();
        const btn = $('#studioPortalReschedulePayBtn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Processing…';
        }
        submitReschedule(true);
        if (btn && !state.confirmed) {
          btn.disabled = false;
          btn.textContent = `Pay ${RS().formatPrice(RS().RESCHEDULE_POLICY.lateFee)} & confirm`;
        }
        return;
      }

      if (e.target.id === 'studioPortalCancelFeeForm') {
        e.preventDefault();
        const btn = $('#studioPortalCancelPayBtn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Processing…';
        }
        submitCancel(true);
        if (btn && !state.confirmed) {
          btn.disabled = false;
          btn.textContent = `Pay ${RS().formatPrice(RS().RESCHEDULE_POLICY.lateFee)} & confirm cancellation`;
        }
      }
    });

    root.addEventListener('change', async (e) => {
      if (e.target.id === 'portalFormsApptPick') {
        openIntakeView(e.target.value);
        render();
        return;
      }
      if (e.target.id === 'portalInspoPhotos') {
        await ingestInspoPhotoFiles(e.target.files, 'portal');
      }
    });
  }

  function openPortal(opts = {}) {
    if (opts.phone) state.loginPhone = opts.phone;
    if (opts.email) state.loginEmail = opts.email;
    if (opts.code) state.setupCode = opts.code;
    if (opts.intake) state.pendingIntakeRedirect = opts.intake;
    if (opts.setup) {
      state.view = 'setup-password';
    } else if (opts.login) {
      state.view = 'login';
      state.loginMode = opts.password ? 'password' : 'code';
    } else if (opts.intake && RS()?.isClientPortalAuthed?.()) {
      openIntakeView(opts.intake);
    }
    if (window.setStudioLine) window.setStudioLine('portal', { scroll: true });
    else $('#portal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    render();
  }

  function applyPortalHashRoute() {
    const { intake } = parsePortalHash();
    if (!intake) return;
    state.pendingIntakeRedirect = intake;
    if (RS()?.isClientPortalAuthed?.()) {
      openIntakeView(intake);
    } else {
      state.view = 'login';
    }
  }

  window.studioPortalOpen = openPortal;

  function init() {
    if (!RS()) return;
    RS().logoutClientPortal();
    state.view = 'login';
    render();
    bind();
    const onPortalHash = () => {
      if (!window.location.hash.startsWith('#portal')) return;
      if (window.studioActiveLine !== 'portal') {
        window.setStudioLine?.('portal', { updateUrl: false, silent: true });
      }
      applyPortalHashRoute();
      render();
    };
    window.addEventListener('hashchange', onPortalHash);
    if (window.location.hash.startsWith('#portal')) {
      window.setStudioLine?.('portal', { updateUrl: false, silent: true });
      applyPortalHashRoute();
      render();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();