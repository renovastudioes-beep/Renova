/**
 * Assistant bonus pool — daily net-collections goal with compounding streak %
 * Mirrors Renova Sintra schedule-tab logic.
 */
window.StudioBonusPool = (function () {
  'use strict';

  const DAILY_NET_GOAL = 6000;
  const APPT_VALUE_TRIGGER = 3000;
  const APPT_VALUE_BONUS = 50;
  const STREAK_PERCENTS = { 1: 0.05, 2: 0.06, 3: 0.07, 4: 0.08, 5: 0.09 };
  const STREAK_PERCENT_MAX = 0.10;
  const STREAK_PERCENT_DEFAULT = 0.10;

  function RS() {
    return window.RenvoaStudios;
  }

  function monthKeyFromDate(iso) {
    return (iso || '').slice(0, 7);
  }

  function daysInMonth(monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  function monthDatesThroughToday(monthKey) {
    const today = RS()?.todayISO?.() || new Date().toISOString().slice(0, 10);
    const count = daysInMonth(monthKey);
    const dates = [];
    for (let d = 1; d <= count; d++) {
      const iso = `${monthKey}-${String(d).padStart(2, '0')}`;
      if (iso <= today) dates.push(iso);
    }
    return dates;
  }

  function txDate(tx) {
    return (tx?.at || '').slice(0, 10);
  }

  function appointmentValueFor(appt, servicesById) {
    const svc = servicesById[appt.serviceId] || RS()?.getService?.(appt.serviceId);
    if (svc?.appointmentValue != null) return Number(svc.appointmentValue) || 0;
    if (svc?.price != null) return Number(svc.price) || 0;
    return Number(appt.price) || 0;
  }

  function streakPercent(streakDay) {
    if (!streakDay || streakDay <= 0) return 0;
    if (streakDay >= 6) return STREAK_PERCENT_MAX;
    return STREAK_PERCENTS[streakDay] ?? STREAK_PERCENT_DEFAULT;
  }

  function computeDay(date, ctx) {
    const { appointments, transactions, servicesById } = ctx;
    const scheduledAppointmentValue = appointments
      .filter((a) => a.date === date && a.status !== 'canceled')
      .reduce((sum, a) => sum + appointmentValueFor(a, servicesById), 0);

    const appointmentValueTriggered = scheduledAppointmentValue >= APPT_VALUE_TRIGGER;
    const appointmentValueBonus = appointmentValueTriggered ? APPT_VALUE_BONUS : 0;

    const grossCollections = transactions
      .filter((t) => t.type !== 'refund' && t.status !== 'voided' && txDate(t) === date)
      .reduce((sum, t) => sum + Math.max(0, Number(t.total) || 0), 0);

    const voidsAndRefunds = transactions
      .filter((t) => (t.type === 'refund' || t.status === 'voided') && txDate(t) === date)
      .reduce((sum, t) => sum + Math.abs(Number(t.total) || 0), 0);

    const netCollections = Math.max(0, grossCollections - voidsAndRefunds);
    const netCollectionsTriggered = netCollections >= DAILY_NET_GOAL;

    return {
      date,
      scheduledAppointmentValue,
      appointmentValueTriggered,
      appointmentValueBonus,
      grossCollections,
      voidsAndRefunds,
      netCollections,
      netCollectionsTriggered,
      netCollectionsBonus: 0,
      streakDay: 0,
      streakPercent: 0,
      dayTotal: appointmentValueBonus,
    };
  }

  function computeMonth(monthKey, data = {}) {
    const studio = RS();
    const appointments = data.appointments || studio?.getAppointments?.() || [];
    const transactions = data.transactions || studio?.getTransactions?.() || [];
    const services = studio?.getServices?.() || window.STUDIO_SERVICES || [];
    const servicesById = Object.fromEntries(services.map((s) => [s.id, s]));
    const ctx = { appointments, transactions, servicesById };

    let streakCounter = 0;
    let poolTotal = 0;
    const days = monthDatesThroughToday(monthKey).map((date) => {
      const day = computeDay(date, ctx);
      if (day.netCollectionsTriggered) streakCounter += 1;
      else streakCounter = 0;

      const streakDay = day.netCollectionsTriggered ? streakCounter : 0;
      const pct = streakPercent(streakDay);
      const netCollectionsBonus = day.netCollectionsTriggered
        ? Math.round(pct * day.netCollections * 100) / 100
        : 0;

      day.streakDay = streakDay;
      day.streakPercent = pct;
      day.netCollectionsBonus = netCollectionsBonus;
      day.dayTotal = day.appointmentValueBonus + netCollectionsBonus;
      poolTotal += day.dayTotal;
      return day;
    });

    return { month: monthKey, poolTotal, days };
  }

  function daySummary(monthKey, dateIso, data) {
    const month = computeMonth(monthKey, data);
    const day = month.days.find((d) => d.date === dateIso);
    if (!day) {
      return {
        mtdPool: month.poolTotal,
        appointmentValueTriggered: false,
        scheduledAppointmentValue: 0,
        netCollectionsTriggered: false,
        netCollections: 0,
        streakDay: 0,
        streakPercent: 0,
        netCollectionsBonus: 0,
        todayBonus: 0,
      };
    }
    return {
      mtdPool: month.poolTotal,
      appointmentValueTriggered: day.appointmentValueTriggered,
      scheduledAppointmentValue: day.scheduledAppointmentValue,
      netCollectionsTriggered: day.netCollectionsTriggered,
      netCollections: day.netCollections,
      streakDay: day.streakDay,
      streakPercent: day.streakPercent,
      netCollectionsBonus: day.netCollectionsBonus,
      todayBonus: day.dayTotal,
    };
  }

  function formatMoney(amount) {
    return RS()?.formatPrice?.(amount) || `$${Number(amount || 0).toFixed(2)}`;
  }

  function formatPercent(rate) {
    return `${Math.round((rate || 0) * 100)}%`;
  }

  function monthLabel(monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function formatShortDate(iso) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  return {
    DAILY_NET_GOAL,
    APPT_VALUE_TRIGGER,
    APPT_VALUE_BONUS,
    STREAK_PERCENTS,
    computeMonth,
    daySummary,
    formatMoney,
    formatPercent,
    monthLabel,
    formatShortDate,
    monthKeyFromDate,
  };
})();