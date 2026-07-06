/**
 * Next-visit recommendations — optimal service, date, and time for retention & revenue.
 */
window.StudioRebook = (function () {
  'use strict';

  const ACTIVITY_INTERVALS = {
    reattach: 21,
    maint: 21,
    moveup: 42,
    install: 56,
    prp: 28,
    smp: 14,
    llt: 7,
    tricho: 21,
    fitting: 14,
    consult: 14,
    cut: 21,
    color: 35,
    new_fit: 21,
  };

  const CATEGORY_INTERVALS = {
    program: 21,
    womens_program: 28,
    clinical: 28,
    mens_grooming: 21,
    womens_styling: 21,
    barbering: 21,
    womens_extensions: 42,
    addon: 14,
    default: 28,
  };

  const UPSELL_BY_CATEGORY = {
    mens_grooming: ['b3', 'b5', 'b4', 'b1'],
    womens_styling: ['ws6', 'ws8', 'ws3', 'ws7', 'ws4', 'ws1'],
    barbering: {
      men: ['b3', 'b5', 'b4', 'b1'],
      women: ['ws6', 'ws3', 'ws4', 'ws1'],
      default: ['b3', 'b1'],
    },
    clinical: ['c1', 'c4', 'c3', 'c2-q'],
    womens_extensions: ['we4', 'we4-q', 'we1-q', 'we3-q'],
    program: null,
    womens_program: null,
  };

  function S() {
    return window.RenvoaStudios;
  }

  function getServiceCategory(appt) {
    return window.StudioVisitFlow?.getServiceCategory(appt) || 'default';
  }

  function calendarUtilization(date) {
    const studio = S();
    if (!studio) return 0.5;
    const appts = studio.getAppointmentsForDate(date);
    const cal = studio.getCalendarSettings();
    const slots = studio.getTimeSlots().length;
    const capacity = Math.max(1, cal.columns * slots);
    return appts.length / capacity;
  }

  function isSunday(iso) {
    return new Date(`${iso}T12:00:00`).getDay() === 0;
  }

  function pickOptimalDate(baseDate, intervalDays) {
    const studio = S();
    const anchor = studio.shiftDate(baseDate, intervalDays);
    const candidates = [];
    for (let offset = -2; offset <= 10; offset += 1) {
      const date = studio.shiftDate(anchor, offset);
      if (isSunday(date)) continue;
      const dow = new Date(`${date}T12:00:00`).getDay();
      let score = calendarUtilization(date);
      if ([2, 3, 4].includes(dow)) score -= 0.08;
      if (dow === 6) score += 0.05;
      candidates.push({ date, score, offset: Math.abs(offset) });
    }
    candidates.sort((a, b) => a.score - b.score || a.offset - b.offset);
    return candidates[0]?.date || anchor;
  }

  function pickOptimalSlot(date, duration, appt) {
    const studio = S();
    const settings = studio.getCalendarSettings();
    const preferredTime = appt?.startTime || '10:00';
    const preferredColumn = appt?.column || 1;
    let best = null;
    let bestScore = -Infinity;

    for (let col = 1; col <= settings.columns; col += 1) {
      const slots = studio.getAvailableSlots(date, col, duration);
      slots.forEach((slot) => {
        let score = 0;
        if (slot === preferredTime) score += 12;
        if (col === preferredColumn) score += 6;
        const mins = studio.timeToMinutes(slot);
        if (mins >= 570 && mins <= 870) score += 4;
        const dow = new Date(`${date}T12:00:00`).getDay();
        if ([2, 3].includes(dow) && mins >= 600 && mins <= 780) score += 3;
        if (score > bestScore) {
          bestScore = score;
          best = { date, time: slot, column: col };
        }
      });
    }

    if (best) return best;

    for (let offset = 1; offset <= 7; offset += 1) {
      const nextDate = studio.shiftDate(date, offset);
      if (isSunday(nextDate)) continue;
      for (let col = 1; col <= settings.columns; col += 1) {
        const slots = studio.getAvailableSlots(nextDate, col, duration);
        if (slots.length) {
          return { date: nextDate, time: slots[0], column: col };
        }
      }
    }

    return {
      date,
      time: preferredTime,
      column: preferredColumn,
    };
  }

  function getIntervalDays(appt, svc, category) {
    const activity = appt?.providerSession?.activityId;
    if (activity && ACTIVITY_INTERVALS[activity]) return ACTIVITY_INTERVALS[activity];
    if (svc?.isPackage && svc.appointmentsIncluded >= 12) return 21;
    if (svc?.isPackage && svc.appointmentsIncluded <= 4) return 28;
    if (svc?.id === 'c3') return 14;
    if (svc?.id === 'c1') return 28;
    if (svc?.id?.startsWith('c2')) return 7;
    return CATEGORY_INTERVALS[category] || CATEGORY_INTERVALS.default;
  }

  function programServiceForClient(clientId, appt, currentSvc) {
    const followUp = S().getProgramFollowUpBooking?.(clientId, {
      serviceId: appt?.serviceId,
      extOptions: appt?.extOptions,
      programName: appt?.programName,
      category: currentSvc?.category,
    });
    if (followUp) {
      return {
        service: followUp.service,
        program: followUp.program,
        packageFields: followUp.packageFields,
        displayName: followUp.displayName,
        reason: followUp.reason,
        isFollowUp: true,
      };
    }
    if (currentSvc?.isPackage) {
      const maint = S().getMaintenanceServiceForProgram?.({
        programName: S().programBaseName(currentSvc.name),
        serviceId: currentSvc.id,
        category: currentSvc.category,
      });
      return {
        service: maint || currentSvc,
        displayName: `${S().programBaseName(currentSvc.name)} · Follow-up`,
        reason: 'Continue your maintenance schedule to protect your investment',
        isFollowUp: true,
      };
    }
    return null;
  }

  function resolveRecommendedService(appt) {
    const studio = S();
    const current = appt?.serviceId ? studio.getService(appt.serviceId) : null;
    const category = getServiceCategory(appt);
    const activity = appt?.providerSession?.activityId;
    const gender = current?.gender || studio.getClient(appt.clientId)?.gender || 'all';
    const firstVisit = studio.isFirstTimeClient(appt.clientId, appt.clientPhone);

    const programPick = appt.clientId ? programServiceForClient(appt.clientId, appt, current) : null;
    if (programPick) return programPick;

    if (firstVisit && appt.intendedService) {
      const consultSvc = studio.filterServices({ gender: gender === 'all' ? 'men' : gender })
        .find((s) => !s.isPackage && s.category === category)
        || current;
      if (consultSvc) {
        return {
          service: consultSvc,
          displayName: `${studio.shortName(consultSvc.name)} · Follow-up`,
          reason: `Follow-up after first visit — ${appt.intendedService}`,
          isFollowUp: true,
        };
      }
    }

    if (activity === 'prp' || current?.id === 'c1') {
      const svc = studio.getService('c1');
      return { service: svc, reason: 'Monthly PRP series — best results with consistent sessions' };
    }
    if (activity === 'smp' || current?.id === 'c3') {
      const svc = studio.getService('c3');
      return { service: svc, reason: 'Next SMP layer — multi-session plan for natural density' };
    }
    if (activity === 'lllt' || current?.id?.startsWith('c2')) {
      const svc = studio.getService('c2-q') || studio.getService('c2');
      return { service: svc, reason: 'Weekly LLLT cadence — membership visits drive the best outcomes' };
    }
    if (['moveup', 'install'].includes(activity) || category === 'womens_extensions') {
      const ids = UPSELL_BY_CATEGORY.womens_extensions;
      const svc = ids.map((id) => studio.getService(id)).find(Boolean) || current;
      return {
        service: svc,
        reason: activity === 'install'
          ? 'First move-up — keeps extensions fresh and protects the install'
          : 'Extension move-up — maintains blend and prevents tension on natural hair',
      };
    }
    if (category === 'clinical') {
      const ids = UPSELL_BY_CATEGORY.clinical;
      const svc = ids.map((id) => studio.getService(id)).find((s) => s && s.id !== current?.id) || current;
      return {
        service: svc || current,
        reason: svc?.id === 'c1'
          ? 'PRP follow-up — high-impact clinical retention visit'
          : 'Clinical follow-up — stay on your treatment roadmap',
      };
    }
    if (category === 'mens_grooming' || category === 'womens_styling') {
      const pool = UPSELL_BY_CATEGORY[category] || [];
      if (pool.length) {
        const svc = pool.map((id) => studio.getService(id)).filter(Boolean)[0];
        if (svc) {
          return {
            service: svc,
            displayName: `${studio.shortName(svc.name)} · Follow-up`,
            reason: 'Regular maintenance — keeps your look fresh between major services',
            isFollowUp: true,
          };
        }
      }
    }
    if (category === 'barbering') {
      const pool = UPSELL_BY_CATEGORY.barbering[gender] || UPSELL_BY_CATEGORY.barbering.default;
      const upsell = pool.map((id) => studio.getService(id)).find((s) => s && s.id !== current?.id && (s.price || 0) > (current?.price || 0));
      const svc = upsell || current || studio.getService(pool[0]);
      return {
        service: svc,
        reason: upsell
          ? `${studio.shortName(upsell.name)} — elevated refresh with higher visit value`
          : 'Regular grooming cadence — keeps the look sharp between major services',
      };
    }
    if (['program', 'womens_program'].includes(category) && current) {
      const family = studio.programBaseName(current.name);
      return {
        service: studio.getMaintenanceServiceForProgram?.({ programName: family, serviceId: current.id }) || current,
        displayName: `${family} · Follow-up`,
        reason: 'Scheduled maintenance — protects your system and maximizes longevity',
        isFollowUp: true,
      };
    }

    return {
      service: current || studio.getServices()[0],
      displayName: current ? `${studio.shortName(current.name)} · Follow-up` : 'Follow-up visit',
      reason: 'Follow-up visit — stay on track with your hair goals',
      isFollowUp: true,
    };
  }

  function getReasonMeta(appt, svc, intervalDays) {
    const weeks = Math.round(intervalDays / 7);
    const value = svc?.appointmentValue || svc?.price || 0;
    const businessNote = value >= 500
      ? 'High-value retention slot — prioritizes mid-week availability'
      : 'Fills a lighter calendar window to keep chairs productive';
    return {
      intervalLabel: weeks <= 1 ? 'in about 1 week' : `in about ${weeks} weeks`,
      businessNote,
    };
  }

  function buildRecommendation(appt) {
    const studio = S();
    if (!studio || !appt) return null;

    const pick = resolveRecommendedService(appt);
    const service = pick?.service;
    if (!service) return null;

    const category = service.category || getServiceCategory(appt);
    const duration = studio.parseDurationMin(service.duration);
    const intervalDays = getIntervalDays(appt, service, category);
    const baseDate = appt.date || studio.todayISO();
    const date = pickOptimalDate(baseDate, intervalDays);
    const slot = pickOptimalSlot(date, duration, appt);
    const meta = getReasonMeta(appt, service, intervalDays);
    const settings = studio.getCalendarSettings();
    const displayName = pick.displayName || studio.shortName(service.name);

    return {
      serviceId: service.id,
      serviceName: displayName,
      servicePrice: pick.packageFields ? 0 : (service.price || 0),
      duration,
      date: slot.date,
      time: slot.time,
      column: slot.column,
      chairLabel: settings.columnLabels?.[slot.column - 1] || `Chair ${slot.column}`,
      intervalDays,
      reason: pick.reason,
      intervalLabel: meta.intervalLabel,
      businessNote: meta.businessNote,
      utilization: calendarUtilization(slot.date),
      isFollowUp: !!pick.isFollowUp,
      packageVisit: !!pick.packageFields,
      programId: pick.packageFields?.programId || pick.program?.id || '',
      programName: pick.packageFields?.programName || pick.program?.programName || '',
      programPaymentPlan: pick.packageFields?.programPaymentPlan || pick.program?.paymentLabel || '',
      visitNumber: pick.packageFields?.visitNumber || pick.visitNumber || 0,
      visitsIncluded: pick.packageFields?.visitsIncluded || pick.visitsIncluded || 0,
      visitValue: pick.packageFields?.visitValue || pick.program?.visitValue || 0,
    };
  }

  function buildSameDayDraft(appt, draft) {
    const studio = S();
    if (!appt || !draft) return null;
    const duration = draft.schedulingDuration || draft.duration || 60;
    const slot = pickOptimalSlot(studio.todayISO(), duration, appt);
    const settings = studio.getCalendarSettings();
    return {
      ...draft,
      date: studio.todayISO(),
      time: slot?.time || draft.time,
      column: slot?.column || draft.column,
      chairLabel: settings.columnLabels?.[(slot?.column || draft.column) - 1] || draft.chairLabel,
      sameDay: true,
    };
  }

  function getAlternateServices(appt, selectedId) {
    const studio = S();
    const current = appt?.serviceId ? studio.getService(appt.serviceId) : null;
    const category = getServiceCategory(appt);
    const gender = current?.gender || studio.getClient(appt.clientId)?.gender;

    const followUp = appt?.clientId
      ? studio.getProgramFollowUpBooking?.(appt.clientId, {
        serviceId: appt.serviceId,
        extOptions: appt.extOptions,
        programName: appt.programName,
      })
      : null;
    if (followUp?.service) {
      return [followUp.service];
    }

    let ids = [];
    if (category === 'mens_grooming' || category === 'womens_styling') {
      ids = UPSELL_BY_CATEGORY[category] || [];
    } else if (category === 'barbering') {
      ids = UPSELL_BY_CATEGORY.barbering[gender] || UPSELL_BY_CATEGORY.barbering.default;
    } else if (UPSELL_BY_CATEGORY[category]) {
      ids = UPSELL_BY_CATEGORY[category];
    } else if (current?.isPackage) {
      ids = studio.filterServices({ category }).filter((s) => s.isPackage).map((s) => s.id);
    } else {
      ids = studio.filterServices({ category, gender }).slice(0, 4).map((s) => s.id);
    }

    return [...new Set([selectedId, ...ids].filter(Boolean))]
      .map((id) => studio.getService(id))
      .filter(Boolean)
      .slice(0, 4);
  }

  return {
    buildRecommendation,
    buildSameDayDraft,
    getAlternateServices,
    pickOptimalSlot,
    pickOptimalDate,
  };
})();