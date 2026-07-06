/**
 * Live elapsed-time clocks for appointment status (calendar blocks + modals).
 */
window.StudioApptTimers = (function () {
  'use strict';

  let intervalId = null;

  function formatElapsed(ms) {
    if (!ms || ms < 0) return '0m';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (totalMin > 0) return `${totalMin}m`;
    const s = Math.floor(ms / 1000);
    return `${s}s`;
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function scheduledStartMs(date, startTime) {
    if (!date || !startTime) return null;
    const t = new Date(`${date}T${startTime}`).getTime();
    return Number.isNaN(t) ? null : t;
  }

  function resolveCheckedInMs(el) {
    const raw = el.dataset.checkedInAt;
    if (raw) return new Date(raw).getTime();
    const status = el.dataset.apptStatus;
    if (status === 'checked_in' || status === 'in_progress') {
      const start = scheduledStartMs(el.dataset.apptDate, el.dataset.apptStart);
      if (start && start <= Date.now()) return start;
    }
    return null;
  }

  function resolveInProgressMs(el) {
    const raw = el.dataset.inProgressAt;
    if (raw) return new Date(raw).getTime();
    return null;
  }

  function buildTimerLines(el) {
    const status = el.dataset.apptStatus;
    const now = Date.now();
    const lines = [];

    if (status === 'scheduled') {
      const start = scheduledStartMs(el.dataset.apptDate, el.dataset.apptStart);
      if (start && el.dataset.apptDate === todayISO() && now > start) {
        lines.push({ label: 'Awaiting arrival', ms: now - start, tone: 'warn' });
      }
      return lines;
    }

    if (status === 'checked_in') {
      const checked = resolveCheckedInMs(el);
      if (checked) lines.push({ label: 'Waiting', ms: now - checked, tone: 'wait' });
      return lines;
    }

    if (status === 'in_progress') {
      const checked = resolveCheckedInMs(el);
      const progress = resolveInProgressMs(el);
      if (checked) lines.push({ label: 'Here', ms: now - checked, tone: 'here' });
      if (progress) lines.push({ label: 'In progress', ms: now - progress, tone: 'progress' });
      else if (checked) lines.push({ label: 'In progress', ms: now - checked, tone: 'progress' });
      return lines;
    }

    if (status === 'with_provider') {
      const checked = resolveCheckedInMs(el);
      const providerAt = el.dataset.withProviderAt ? new Date(el.dataset.withProviderAt).getTime() : null;
      if (checked) lines.push({ label: 'Here', ms: now - checked, tone: 'here' });
      if (providerAt) lines.push({ label: 'With provider', ms: now - providerAt, tone: 'provider' });
      return lines;
    }

    return lines;
  }

  function renderLines(lines, compact) {
    if (!lines.length) return '';
    if (compact && lines.length > 1) {
      const primary = lines.find((l) => l.tone === 'progress') || lines[lines.length - 1];
      return `<span class="studio-cal-timer-line tone-${primary.tone}">${esc(primary.label)} ${formatElapsed(primary.ms)}</span>`;
    }
    return lines.map((line) =>
      `<span class="studio-cal-timer-line tone-${line.tone}">${esc(line.label)} <strong>${formatElapsed(line.ms)}</strong></span>`
    ).join(compact ? ' · ' : '');
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function updateNowLine() {
    const RS = window.RenvoaStudios;
    if (!RS?.getNowSlotLine || !RS?.todayISO) return;
    if (document.querySelector('.studio-cal-v2-week')) return;

    const viewDate = document.getElementById('calJumpDate')?.value || RS.todayISO();
    const grid = document.querySelector('.studio-cal-grid-wrap .studio-cal-v2:not(.studio-cal-v2-week)');
    if (!grid) return;

    const line = grid.querySelector('.studio-cal-now-line');
    if (viewDate !== RS.todayISO()) {
      if (line) line.hidden = true;
      return;
    }

    const nowLine = RS.getNowSlotLine(RS.getCalendarSettings?.());
    if (!nowLine) {
      if (line) line.hidden = true;
      return;
    }

    const slotH = parseFloat(getComputedStyle(grid).getPropertyValue('--slot-h')) || 48;
    const row = nowLine.index + 2;
    const topPx = (row - 1) * slotH + nowLine.pct * slotH;
    const el = line || (() => {
      const created = document.createElement('div');
      created.className = 'studio-cal-now-line';
      created.dataset.calNowLine = '';
      grid.appendChild(created);
      return created;
    })();

    el.hidden = false;
    el.style.top = `${topPx}px`;
    grid.style.setProperty('--now-row', String(row));
    grid.style.setProperty('--now-pct', String(nowLine.pct));
  }

  function tick() {
    updateNowLine();

    document.querySelectorAll('[data-appt-live-clock]').forEach((clock) => {
      const text = clock.querySelector('[data-appt-timer]');
      if (!text) return;
      const lines = buildTimerLines(clock);
      text.innerHTML = renderLines(lines, false) || '—';
    });

    document.querySelectorAll('.studio-cal-v2-block[data-appt-status]').forEach((block) => {
      const timer = block.querySelector('[data-appt-timer]');
      if (!timer) return;
      const lines = buildTimerLines(block);
      const compact = block.classList.contains('studio-cal-v2-block-sm');
      timer.innerHTML = renderLines(lines, compact);
      timer.hidden = !lines.length;
    });
  }

  function start() {
    tick();
    if (intervalId) return;
    intervalId = window.setInterval(tick, 1000);
  }

  function stop() {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function syncForCalendarView(active) {
    if (active) start();
    else stop();
  }

  return {
    formatElapsed,
    buildTimerLines,
    renderLines,
    updateNowLine,
    tick,
    start,
    stop,
    syncForCalendarView,
  };
})();