/**
 * Visit flow data — intake forms & provider activity menus by service type.
 */
window.StudioVisitFlow = (function () {
  'use strict';

  const STUDIO_INTAKE_FROM_EMAIL = 'hello@onyxstudios.com';
  const STUDIO_INTAKE_STUDIO_NAME = 'Onyx Studios';
  const STUDIO_POLICIES_PATH = 'legal/studio-policies.html';

  const INTAKE_POLICIES = {
    cancellation: { label: 'Cancellation & reschedule policy', url: `${STUDIO_POLICIES_PATH}#cancellation` },
    treatment_consent: { label: 'Treatment consent & service agreement', url: `${STUDIO_POLICIES_PATH}#treatment-consent` },
    studio_privacy: { label: 'Studio privacy & data use', url: `${STUDIO_POLICIES_PATH}#privacy` },
    photo_release: { label: 'Photography & image release', url: `${STUDIO_POLICIES_PATH}#photo-release` },
    privacy: { label: 'Privacy policy', url: 'legal/privacy.html' },
    terms: { label: 'Terms of service', url: 'legal/terms.html' },
  };

  const INTAKE_FORMS = [
    {
      id: 'health_history',
      label: 'Health history & medical disclosure',
      desc: 'Complete medical background required before any scalp, chemical, or clinical service.',
      required: true,
      policyLinks: ['treatment_consent'],
      intro: 'Please list all known allergies, medications, and scalp or skin conditions. Accurate disclosure protects your safety and helps us customize your service.',
      fields: [
        { id: 'allergies', label: 'Known allergies', type: 'textarea', required: true, placeholder: 'List all allergies (latex, adhesives, dyes, fragrances, etc.) or enter None' },
        { id: 'medications', label: 'Current medications & supplements', type: 'textarea', placeholder: 'Include prescriptions, OTC, and vitamins' },
        { id: 'medical_conditions', label: 'Medical conditions', type: 'textarea', placeholder: 'Diabetes, autoimmune, heart conditions, pregnancy, etc.' },
        { id: 'scalp_conditions', label: 'Scalp or skin conditions', type: 'textarea', placeholder: 'Psoriasis, eczema, dermatitis, thinning, sensitivity…' },
        { id: 'scalp_sensitivity', label: 'Scalp sensitivity or irritation today?', type: 'select', options: ['No', 'Mild', 'Moderate', 'Severe — discuss with provider'] },
        { id: 'prior_treatments', label: 'Prior hair, scalp, or extension treatments (last 12 months)', type: 'textarea', placeholder: 'Color, keratin, PRP, SMP, systems, extensions…' },
        { id: 'recent_chemical', label: 'Chemical service in the last 14 days?', type: 'select', options: ['No', 'Yes — color', 'Yes — bleach/lightener', 'Yes — relaxer/keratin', 'Yes — other'] },
        { id: 'pregnancy_nursing', label: 'Pregnant or nursing?', type: 'select', options: ['No', 'Yes', 'Prefer not to say'] },
        { id: 'emergency_contact_name', label: 'Emergency contact name', type: 'text', placeholder: 'Full name' },
        { id: 'emergency_contact_phone', label: 'Emergency contact phone', type: 'tel', placeholder: '(555) 555-5555' },
      ],
    },
    {
      id: 'consent_treatment',
      label: 'Treatment consent & service agreement',
      desc: 'Signed in-studio after risks, services, and aftercare are explained by your provider.',
      required: true,
      signAtVisit: true,
      policyLinks: ['treatment_consent', 'cancellation', 'terms'],
      intro: 'This form is completed with your provider at your visit — not online. They will review services, risks, and aftercare before you sign.',
      clauses: [
        'I understand results vary by hair type, density, lifestyle, and adherence to home care.',
        'I agree to follow pre- and post-visit instructions provided by my provider.',
        'I understand that additional visits or adjustments may be recommended.',
      ],
      fields: [
        { id: 'services_discussed', label: 'Services discussed today', type: 'textarea', required: true, placeholder: 'Consultation, program, color, extensions, clinical treatment…' },
        { id: 'provider_name', label: 'Provider / clinician name', type: 'text', placeholder: 'Who explained the service' },
        { id: 'risks_explained', label: 'Risks & contraindications explained?', type: 'select', required: true, options: ['Yes', 'No — need more information'] },
        { id: 'questions_answered', label: 'All questions answered to your satisfaction?', type: 'select', required: true, options: ['Yes', 'No — questions remain'] },
        { id: 'outcome_expectations', label: 'Expected outcome & timeline discussed', type: 'textarea', placeholder: 'What success looks like and when' },
        { id: 'cancellation_policy', label: 'Cancellation & reschedule policy reviewed?', type: 'select', options: ['Yes', 'No'] },
        { id: 'client_initials', label: 'Client initials', type: 'text', required: true, placeholder: 'e.g. J.D.' },
        { id: 'consent_date', label: 'Date of consent', type: 'date', required: true },
      ],
    },
    {
      id: 'privacy_policy',
      label: 'Privacy, contact & data use',
      desc: 'How Onyx Studios stores contact details, visit notes, and optional photography.',
      required: true,
      policyLinks: ['studio_privacy', 'privacy'],
      intro: 'We use your information only to deliver services, schedule visits, and — with your permission — share relevant updates.',
      clauses: [
        'Contact data is stored securely and is not sold to third parties.',
        'You may request access to or correction of your records at any time.',
      ],
      fields: [
        { id: 'privacy_reviewed', label: 'Privacy policy reviewed?', type: 'select', required: true, options: ['Yes', 'No — need copy emailed'] },
        { id: 'contact_sms', label: 'Appointment reminders via text', type: 'select', options: ['Yes', 'No'] },
        { id: 'contact_email', label: 'Service updates via email', type: 'select', options: ['Yes', 'No'] },
        { id: 'contact_phone', label: 'Phone calls for scheduling', type: 'select', options: ['Yes', 'No'] },
        { id: 'marketing_email', label: 'Promotions & studio news (optional)', type: 'select', options: ['Yes', 'No'] },
        { id: 'preferred_contact', label: 'Preferred contact method', type: 'select', options: ['Text', 'Email', 'Phone', 'No preference'] },
        { id: 'data_retention_ack', label: 'Understand records are kept per studio policy?', type: 'select', required: true, options: ['Yes'] },
      ],
    },
    {
      id: 'photo_release',
      label: 'Photography & image release',
      desc: 'Before/after and progress photography for records, education, or marketing.',
      required: false,
      policyLinks: ['photo_release'],
      intro: 'Photography helps us document progress. Marketing use is always optional and requires separate consent.',
      fields: [
        { id: 'internal_photos', label: 'Internal progress photos (chart only)', type: 'select', options: ['Yes', 'No'] },
        { id: 'marketing_photos', label: 'Marketing / website use (optional)', type: 'select', options: ['Yes', 'No'] },
        { id: 'social_media', label: 'Social media features (optional)', type: 'select', options: ['Yes', 'No'] },
        { id: 'photo_restrictions', label: 'Restrictions or anonymity requests', type: 'textarea', placeholder: 'e.g. No face, crop only, internal use only…' },
        { id: 'photo_initials', label: 'Initials (if declining marketing)', type: 'text', placeholder: 'Optional' },
      ],
    },
    {
      id: 'program_goals',
      label: 'Goals, lifestyle & maintenance plan',
      desc: 'Hair goals, visit frequency, and lifestyle factors that affect your plan.',
      required: false,
      intro: 'This helps your provider recommend the right program, maintenance cadence, and home care.',
      fields: [
        { id: 'primary_goal', label: 'Primary goal for this visit / program', type: 'textarea', placeholder: 'Coverage, density, color, regrowth, confidence…' },
        { id: 'hair_concerns', label: 'Main concerns today', type: 'textarea', placeholder: 'Thinning areas, breakage, grey blend, extension damage…' },
        { id: 'maintenance_frequency', label: 'Comfortable maintenance frequency', type: 'select', options: ['Weekly', 'Every 2 weeks', 'Monthly', 'Every 6–8 weeks', 'As needed'] },
        { id: 'budget_range', label: 'Budget range discussed', type: 'select', options: ['Not discussed', 'Under $200/visit', '$200–$500/visit', '$500–$1,000/visit', 'Program / package'] },
        { id: 'lifestyle_notes', label: 'Lifestyle & styling habits', type: 'textarea', placeholder: 'Gym, swimming, travel, heat styling, work environment…' },
        { id: 'referral_source', label: 'How did you hear about Onyx Studios?', type: 'text', placeholder: 'Friend, social, web, stylist referral…' },
        { id: 'next_visit_goal', label: 'Goal for next visit', type: 'textarea', placeholder: 'Optional' },
      ],
    },
  ];

  const ARRIVAL_BEVERAGES_21 = [
    { id: '', label: 'No beverage needed' },
    { id: 'water_still', label: 'Still water' },
    { id: 'water_sparkling', label: 'Sparkling water' },
    { id: 'coffee', label: 'Coffee' },
    { id: 'espresso', label: 'Espresso' },
    { id: 'tea', label: 'Tea' },
    { id: 'cold_brew', label: 'Cold brew' },
    { id: 'prosecco', label: 'Prosecco' },
    { id: 'wine_white', label: 'White wine' },
    { id: 'wine_red', label: 'Red wine' },
    { id: 'cocktail', label: 'Signature cocktail' },
    { id: 'zero_proof', label: 'Zero-proof cocktail' },
  ];

  function getPortalIntakeForms() {
    return INTAKE_FORMS.filter((f) => !f.signAtVisit);
  }

  function getVisitSignForms() {
    return INTAKE_FORMS.filter((f) => f.signAtVisit);
  }

  function getArrivalBeverages() {
    return ARRIVAL_BEVERAGES_21;
  }

  function getArrivalBeverageLabel(id) {
    if (!id) return '';
    return ARRIVAL_BEVERAGES_21.find((b) => b.id === id)?.label || id;
  }

  function buildClientPreferences(data = {}) {
    const beverage = String(data.beverage || '').trim();
    const inspoPhotos = Array.isArray(data.inspoPhotos) ? data.inspoPhotos.slice(0, 6) : [];
    return {
      hairLikes: String(data.hairLikes || '').trim(),
      hairDislikes: String(data.hairDislikes || '').trim(),
      priorServices: String(data.priorServices || '').trim(),
      beverage,
      beverageLabel: getArrivalBeverageLabel(beverage),
      inspoPhotos,
    };
  }

  function formatClientPreferencesNote(prefs) {
    if (!prefs) return '';
    const lines = [];
    if (prefs.hairLikes) lines.push(`Hair likes: ${prefs.hairLikes}`);
    if (prefs.hairDislikes) lines.push(`Hair dislikes: ${prefs.hairDislikes}`);
    if (prefs.priorServices) lines.push(`Prior services: ${prefs.priorServices}`);
    if (prefs.beverageLabel) lines.push(`21+ beverage: ${prefs.beverageLabel}`);
    if ((prefs.inspoPhotos || []).length) {
      lines.push(`Inspo photos: ${prefs.inspoPhotos.length} on file`);
    }
    return lines.join('\n');
  }

  function portalIntakeFormReady(form, signed, data) {
    if (!form || form.signAtVisit) return false;
    return intakeFormReady(form, signed, data);
  }

  const PROVIDER_FLOWS = {
    program: {
      label: "Men's hair system",
      activities: [
        { id: 'consult', label: 'Consultation', desc: 'Scalp analysis & system planning', subs: ['Density mapping', 'Base type selection', 'Color ring match', 'Hairline design'] },
        { id: 'new_fit', label: 'New system fitting', desc: 'First install or full replacement', subs: ['Template update', 'Base placement', 'Bond application', 'Initial blend'] },
        { id: 'reattach', label: 'Reattachment', desc: 'Remove, clean, and re-bond existing system', subs: ['Safe removal', 'Scalp prep', 'Adhesive refresh', 'Perimeter detail'] },
        { id: 'maint', label: 'Maintenance visit', desc: 'Scheduled upkeep between major services', subs: ['Deep cleanse', 'Touch-up bond', 'Hairline refresh', 'Style finish'] },
        { id: 'cut_blend', label: 'Cut & blend', desc: 'Barbering integration with the system', subs: ['Perimeter fade', 'Texture refinement', 'Density blend', 'Final style'] },
      ],
    },
    womens_program: {
      label: "Women's program",
      activities: [
        { id: 'consult', label: 'Consultation', desc: 'Coverage assessment & design', subs: ['Part line review', 'Density plan', 'Color match', 'Lifestyle fit'] },
        { id: 'new_fit', label: 'New fitting', desc: 'Initial topper or system placement', subs: ['Cap fit', 'Weft placement', 'Cut-in blend', 'Style set'] },
        { id: 'maint', label: 'Maintenance', desc: 'Routine program visit', subs: ['Reposition', 'Clean & condition', 'Trim & shape', 'Style refresh'] },
        { id: 'color', label: 'Color refresh', desc: 'Tone or dimension update', subs: ['Root blend', 'Gloss/toner', 'Custom mix', 'After-care'] },
      ],
    },
    clinical: {
      label: 'Clinical',
      activities: [
        { id: 'tricho', label: 'Trichology consult', desc: 'Scalp health evaluation', subs: ['Microscopy', 'Density count', 'Treatment roadmap', 'Home care plan'] },
        { id: 'prp', label: 'PRP therapy', desc: 'Platelet-rich plasma session', subs: ['Draw & spin', 'Scalp mapping', 'Injection pass', 'Post-care review'] },
        { id: 'smp', label: 'SMP session', desc: 'Scalp micropigmentation work', subs: ['Hairline design', 'Density layer', 'Blend pass', 'Healing instructions'] },
        { id: 'lllt', label: 'LLLT session', desc: 'Low-level laser therapy', subs: ['Cap fitting', 'Timed session', 'Progress photos', 'Next visit plan'] },
        { id: 'fitting', label: 'New client fitting', desc: 'First visit measurements & education', subs: ['Scalp photos', 'Expectations review', 'Sample systems', 'Care training'] },
      ],
    },
    mens_grooming: {
      label: 'Barbering & grooming',
      activities: [
        { id: 'cut', label: 'Cut & style', desc: 'Haircut and finish', subs: ['Consult style', 'Clipper/scissor work', 'Blow dry', 'Product finish'] },
        { id: 'combo', label: 'Haircut + beard', desc: 'Cut and beard in one visit', subs: ['Haircut', 'Beard shape', 'Line up', 'Final finish'] },
        { id: 'color', label: 'Color service', desc: 'Color or grey blending', subs: ['Mix formula', 'Application', 'Processing', 'Tone & finish'] },
        { id: 'beard', label: 'Beard grooming', desc: 'Beard trim and shape', subs: ['Line up', 'Shape & length', 'Hot towel', 'Oil finish'] },
        { id: 'scalp', label: 'Scalp treatment', desc: 'Therapeutic scalp service', subs: ['Exfoliation', 'Treatment mask', 'Massage', 'Rinse & dry'] },
      ],
    },
    womens_styling: {
      label: 'Salon & styling',
      activities: [
        { id: 'cut', label: 'Cut & style', desc: 'Haircut and finish', subs: ['Consult style', 'Scissor work', 'Blow dry', 'Style finish'] },
        { id: 'blowout', label: 'Blow out', desc: 'Wash, blow dry, and finish', subs: ['Cleanse', 'Blow dry', 'Smooth finish', 'Style set'] },
        { id: 'color', label: 'Color + cut', desc: 'Color service with cut', subs: ['Formula mix', 'Application', 'Cut & shape', 'Tone & finish'] },
        { id: 'fullcolor', label: 'Full color', desc: 'Single-process all-over color', subs: ['Tone consult', 'Formula mix', 'Application', 'Gloss & finish'] },
        { id: 'highlights', label: 'Highlights & balayage', desc: 'Dimension and lightening', subs: ['Placement map', 'Lightener mix', 'Paint/foil work', 'Tone & finish'] },
        { id: 'root', label: 'Root touch-up', desc: 'Regrowth and root coverage', subs: ['Root match', 'Application', 'Processing', 'Blend & finish'] },
        { id: 'grey', label: 'Grey blending', desc: 'Soft grey integration', subs: ['Coverage plan', 'Custom mix', 'Application', 'Tone refresh'] },
        { id: 'gloss', label: 'Gloss / toner', desc: 'Shine and tone refresh', subs: ['Tone check', 'Gloss mix', 'Application', 'Blowout finish'] },
        { id: 'keratin', label: 'Keratin / smoothing', desc: 'Smoothing or keratin treatment', subs: ['Clarify', 'Application', 'Processing', 'Blowout finish'] },
        { id: 'scalp', label: 'Scalp treatment', desc: 'Therapeutic scalp and conditioning', subs: ['Exfoliation', 'Mask treatment', 'Massage', 'Condition & dry'] },
      ],
    },
    barbering: {
      label: 'Barbering & styling',
      activities: [
        { id: 'cut', label: 'Cut & style', desc: 'Haircut and finish', subs: ['Consult style', 'Clipper/scissor work', 'Blow dry', 'Product finish'] },
        { id: 'combo', label: 'Haircut + beard', desc: 'Cut and beard in one visit', subs: ['Haircut', 'Beard shape', 'Line up', 'Final finish'] },
        { id: 'color', label: 'Color service', desc: 'Color or grey blending', subs: ['Mix formula', 'Application', 'Processing', 'Tone & finish'] },
        { id: 'beard', label: 'Beard grooming', desc: 'Beard trim and shape', subs: ['Line up', 'Shape & length', 'Hot towel', 'Oil finish'] },
        { id: 'scalp', label: 'Scalp treatment', desc: 'Therapeutic scalp service', subs: ['Exfoliation', 'Treatment mask', 'Massage', 'Rinse & dry'] },
      ],
    },
    womens_extensions: {
      label: 'Extensions',
      activities: [
        { id: 'consult', label: 'Extension consult', desc: 'Method & length planning', subs: ['Method selection', 'Length & density', 'Color match', 'Maintenance plan'] },
        { id: 'install', label: 'Installation', desc: 'New extension application', subs: ['Sectioning', 'Row placement', 'Bond/tape check', 'Blend cut'] },
        { id: 'moveup', label: 'Move-up', desc: 'Maintenance reposition', subs: ['Removal', 'Clean wefts', 'Reapply rows', 'Style finish'] },
        { id: 'removal', label: 'Safe removal', desc: 'Take-down without damage', subs: ['Bond release', 'Detangle', 'Scalp treatment', 'After-care'] },
      ],
    },
    addon: {
      label: 'Add-on service',
      activities: [
        { id: 'addon', label: 'Add-on during visit', desc: 'Extra service added today', subs: ['Scalp massage', 'Brow grooming', 'Gloss/toner', 'Keratin smoothing'] },
      ],
    },
    default: {
      label: 'Studio visit',
      activities: [
        { id: 'consult', label: 'Consultation', desc: 'Discuss goals and plan', subs: ['Needs assessment', 'Service review', 'Pricing discussed', 'Next steps'] },
        { id: 'service', label: 'Primary service', desc: 'Main booked service today', subs: ['Prep', 'Service delivery', 'Client education', 'Style finish'] },
        { id: 'followup', label: 'Follow-up', desc: 'Review results & schedule', subs: ['Results check', 'Home care', 'Rebook', 'Product rec'] },
      ],
    },
  };

  const FLOW_STEPS = [
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'checked_in', label: 'Arrived' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'with_provider', label: 'With provider' },
    { id: 'completed', label: 'Complete' },
  ];

  function normalizeFormFields(form) {
    return (form?.fields || []).map((field) => {
      if (typeof field === 'string') {
        return { id: field.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: field, type: 'text', required: !!form?.required };
      }
      return {
        required: !!form?.required,
        type: 'text',
        ...field,
        id: field.id || field.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      };
    });
  }

  function getFieldKey(field) {
    if (typeof field === 'string') return field;
    return field.id || field.label;
  }

  function getFieldLabel(field) {
    if (typeof field === 'string') return field;
    return field.label || field.id;
  }

  function getFieldValue(formData, field) {
    const data = formData || {};
    const key = getFieldKey(field);
    const label = typeof field === 'string' ? field : field.label;
    if (data[key] != null && String(data[key]).trim()) return String(data[key]).trim();
    if (label && data[label] != null && String(data[label]).trim()) return String(data[label]).trim();
    return '';
  }

  function isFieldRequired(form, field) {
    if (typeof field === 'object' && field.required === false) return false;
    if (typeof field === 'object' && field.required === true) return true;
    return !!form?.required;
  }

  const VISIT_TYPE_CATEGORY = {
    barber: 'mens_grooming',
    salon: 'womens_styling',
  };

  const SERVICE_ACTIVITY_MAP = {
    b1: 'cut',
    'b-lux': 'cut',
    b2: 'beard',
    b3: 'combo',
    b4: 'color',
    b5: 'scalp',
    b6: 'fullcolor',
    ws1: 'blowout',
    ws3: 'color',
    ws4: 'keratin',
    ws5: 'scalp',
    ws6: 'cut',
    ws7: 'fullcolor',
    ws8: 'highlights',
    ws9: 'root',
    ws10: 'grey',
    ws11: 'gloss',
    c4: 'tricho',
    c1: 'prp',
  };

  const COLOR_FORMULA_FIELDS = [
    { id: 'color_line', label: 'Color line / brand', type: 'text', placeholder: 'Wella, Redken, Schwarzkopf…' },
    { id: 'shade_level', label: 'Shade / level', type: 'text', placeholder: 'e.g. 6N, 7.1, 8G / level 7' },
    { id: 'formula', label: 'Formula mixed', type: 'textarea', placeholder: 'Shades, ratios, bowl amounts' },
    { id: 'developer', label: 'Developer volume', type: 'select', options: ['10 vol', '20 vol', '30 vol', '40 vol', 'Clear / gloss'] },
    { id: 'product_amount', label: 'Product used', type: 'select', options: ['Partial / roots', 'Standard bowl', 'Double bowl', 'Toner only'] },
    { id: 'processing_time', label: 'Processing time', type: 'text', placeholder: 'e.g. 25 min roots, 35 min ends' },
  ];

  function isConsultPlaceholderService(svc) {
    return svc?.id === 'c5' || svc?.internalBooking === true;
  }

  function isBillableAppointmentService(svc) {
    if (!svc) return false;
    if (svc.isPackage) return false;
    if (isConsultPlaceholderService(svc)) return false;
    return true;
  }

  function resolveApptBillableServices(appt) {
    const S = window.RenvoaStudios;
    if (!S || !appt) return [];
    const results = [];
    const seen = new Set();
    const push = (svc) => {
      if (!isBillableAppointmentService(svc) || seen.has(svc.id)) return;
      seen.add(svc.id);
      results.push(svc);
    };

    (appt.providerSession?.lineItems || []).forEach((li) => {
      if (li.packageVisitLine) return;
      push(S.getService(li.serviceId));
    });

    resolveBookedServiceIds(appt).forEach((id) => {
      const svc = S.getService(id);
      if (svc) push(svc);
      else if (S.isLuxAddonId?.(id)) {
        const lux = S.luxAddonAsService?.(S.getMensLuxAddon(id));
        if (lux) push(lux);
      }
    });
    (appt.bookedServices || []).forEach((row) => {
      if (row?.mode !== 'lux_addon' || !row.serviceId) return;
      const lux = S.luxAddonAsService?.(S.getMensLuxAddon(row.serviceId));
      if (lux) push(lux);
    });
    (S.resolveApptLuxAddonIds?.(appt) || []).forEach((id) => {
      const lux = S.luxAddonAsService?.(S.getMensLuxAddon(id));
      if (lux) push(lux);
    });
    push(S.getService(appt.serviceId));

    return results;
  }

  function resolveApptPrimaryBillableService(appt) {
    const billable = resolveApptBillableServices(appt);
    return billable.find((s) => (s.price || 0) > 0) || billable[0] || null;
  }

  function resolveBookedServiceIds(appt) {
    if (!appt) return [];
    const ids = [];
    if (Array.isArray(appt.bookServiceIds)) ids.push(...appt.bookServiceIds);
    if (appt.bookServiceId) ids.push(appt.bookServiceId);
    if (Array.isArray(appt.bookedServices)) {
      appt.bookedServices.forEach((row) => {
        if (row?.serviceId) ids.push(row.serviceId);
      });
    }
    return [...new Set(ids.filter(Boolean))];
  }

  function getServiceCategory(appt) {
    const S = window.RenvoaStudios;
    if (!S || !appt) return 'default';

    if (appt.scheduledVisitTypeId && VISIT_TYPE_CATEGORY[appt.scheduledVisitTypeId]) {
      return VISIT_TYPE_CATEGORY[appt.scheduledVisitTypeId];
    }

    const bookedIds = resolveBookedServiceIds(appt);
    for (const id of bookedIds) {
      const booked = S.getService(id);
      if (booked?.category && !isConsultPlaceholderService(booked)) {
        return S.normalizeServiceCategory?.(booked.category, booked) || booked.category;
      }
    }

    const svc = appt.serviceId ? S.getService(appt.serviceId) : null;
    if (svc?.category && !isConsultPlaceholderService(svc)) {
      return S.normalizeServiceCategory?.(svc.category, svc) || svc.category;
    }

    if (appt.appointmentType && PROVIDER_FLOWS[appt.appointmentType]) {
      return appt.appointmentType;
    }

    if (appt.intendedService) {
      const needle = String(appt.intendedService).trim().toLowerCase();
      const match = S.getServices().find((s) => {
        if (s.isPackage || isConsultPlaceholderService(s)) return false;
        const short = S.shortName(s.name).toLowerCase();
        const full = String(s.name || '').toLowerCase();
        return short === needle || full === needle || short.includes(needle) || needle.includes(short);
      });
      if (match?.category) {
        return S.normalizeServiceCategory?.(match.category, match) || match.category;
      }
    }

    if (svc?.category) return S.normalizeServiceCategory?.(svc.category, svc) || svc.category;
    return 'default';
  }

  function resolveActivityForServices(svcs) {
    if (!svcs?.length) return '';
    if (svcs.length === 1) return SERVICE_ACTIVITY_MAP[svcs[0].id] || 'service';
    const ids = new Set(svcs.map((s) => s.id));
    if (ids.has('b3') || (ids.has('b1') && ids.has('b2'))) return 'combo';
    const colorSvc = svcs.find((s) => SERVICE_ACTIVITY_MAP[s.id] && ['color', 'fullcolor', 'highlights', 'root', 'grey', 'gloss'].includes(SERVICE_ACTIVITY_MAP[s.id]));
    if (colorSvc) return SERVICE_ACTIVITY_MAP[colorSvc.id];
    const cat = svcs[0]?.category;
    if (['mens_grooming', 'womens_styling', 'barbering'].includes(cat)) return 'service';
    return 'service';
  }

  function resolveDefaultActivityForAppt(appt) {
    const S = window.RenvoaStudios;
    if (!S || !appt) return '';
    const bookedIds = resolveBookedServiceIds(appt);
    for (const id of bookedIds) {
      if (SERVICE_ACTIVITY_MAP[id]) return SERVICE_ACTIVITY_MAP[id];
    }
    const svc = appt.serviceId ? S.getService(appt.serviceId) : null;
    if (svc && SERVICE_ACTIVITY_MAP[svc.id]) return SERVICE_ACTIVITY_MAP[svc.id];
    const cat = getServiceCategory(appt);
    if (['mens_grooming', 'womens_styling', 'barbering'].includes(cat)) return 'cut';
    if (cat === 'clinical') return 'tricho';
    return '';
  }

  /** True when a provider session was started or edited — not a booking-only activity placeholder. */
  function providerSessionInProgress(appt) {
    const ps = appt?.providerSession;
    if (!ps) return false;
    if (ps.startedAt) return true;
    if (appt.status === 'with_provider') return true;
    if (ps.notes?.trim()) return true;
    if ((ps.subs || []).length > 0) return true;
    if ((ps.lineItems || []).length > 0) return true;
    if ((ps.addonIds || []).length > 0) return true;
    const details = ps.details || {};
    if (Object.values(details).some((v) => v != null && String(v).trim() !== '')) return true;
    return false;
  }

  function resolveProviderWizardOpenStep(appt, opts = {}) {
    if (opts.step) return opts.step;
    return providerSessionInProgress(appt) ? 'checkout' : 'activity';
  }

  function resolveProviderDraftForAppt(appt) {
    const flow = getProviderFlow(appt);
    if (appt?.providerSession?.activityId) {
      const existing = getActivity(flow, appt.providerSession.activityId);
      if (existing) {
        return {
          activityId: appt.providerSession.activityId,
          subs: [...(appt.providerSession.subs || [])],
          details: { ...(appt.providerSession.details || {}) },
          addonIds: [...(appt.providerSession.addonIds || [])],
          lineItems: [...(appt.providerSession.lineItems || [])],
          notes: appt.providerSession.notes || '',
        };
      }
    }
    const activityId = resolveDefaultActivityForAppt(appt);
    const validActivity = activityId && getActivity(flow, activityId) ? activityId : '';
    const luxAddonIds = apptUsesLuxAddonPricing(appt)
      ? (window.RenvoaStudios?.resolveApptLuxAddonIds?.(appt) || [])
      : [];
    return {
      activityId: validActivity,
      subs: [],
      details: {},
      addonIds: [...luxAddonIds],
      lineItems: validActivity ? resolveDefaultLineItems(appt, validActivity) : [],
      notes: '',
    };
  }

  function getProviderFlow(appt) {
    const cat = getServiceCategory(appt);
    return PROVIDER_FLOWS[cat] || PROVIDER_FLOWS.default;
  }

  function getActivity(flow, activityId) {
    return (flow?.activities || []).find((a) => a.id === activityId) || null;
  }

  const PROVIDER_ACTIVITY_CONFIG = {
    cut: {
      detailFields: [
        { id: 'finish_style', label: 'Finish / style', type: 'text', placeholder: 'e.g. Textured crop, blunt bob, layers' },
        { id: 'length_change', label: 'Length change', type: 'select', options: ['Trim only', '1–2″ off', '3″+ / restyle', 'No cut — style only'] },
      ],
      serviceIds: ['b1', 'b-lux', 'b3', 'ws6'],
    },
    cut_blend: {
      detailFields: [
        { id: 'blend_notes', label: 'Blend notes', type: 'textarea', placeholder: 'Perimeter, density, system integration…' },
      ],
      serviceIds: ['b1', 'b-lux', 'b3'],
    },
    color: {
      detailFields: [...COLOR_FORMULA_FIELDS],
      serviceIds: ['b4', 'b6', 'ws3', 'ws7', 'ws10', 'ws11'],
    },
    fullcolor: {
      detailFields: [
        ...COLOR_FORMULA_FIELDS,
        { id: 'grey_coverage', label: 'Grey coverage %', type: 'select', options: ['None', '25%', '50%', '75%', '100%'] },
      ],
      serviceIds: ['ws7', 'b6', 'ws3'],
    },
    highlights: {
      detailFields: [
        { id: 'color_line', label: 'Color line / brand', type: 'text', placeholder: 'Lightener & toner brands' },
        { id: 'shade_level', label: 'Target level / tone', type: 'text', placeholder: 'e.g. lift to level 8, tone 9V' },
        { id: 'technique', label: 'Technique', type: 'select', options: ['Foils', 'Balayage', 'Babylights', 'Face frame', 'Mixed'] },
        { id: 'formula', label: 'Lightener / toner formula', type: 'textarea', placeholder: 'Lightener mix, toner, ratios…' },
        { id: 'developer', label: 'Developer volume', type: 'select', options: ['10 vol', '20 vol', '30 vol', '40 vol', 'Clear / gloss'] },
        { id: 'foil_count', label: 'Foil / section count', type: 'select', options: ['Partial', 'Half head', 'Full head', 'Custom'] },
        { id: 'processing_time', label: 'Processing time', type: 'text', placeholder: 'Lighten + tone timing' },
      ],
      serviceIds: ['ws8', 'ws3'],
    },
    root: {
      detailFields: [
        ...COLOR_FORMULA_FIELDS,
        { id: 'regrowth', label: 'Regrowth length', type: 'select', options: ['4 weeks', '6 weeks', '8+ weeks'] },
      ],
      serviceIds: ['ws9', 'b4'],
    },
    grey: {
      detailFields: [
        ...COLOR_FORMULA_FIELDS,
        { id: 'coverage', label: 'Coverage goal', type: 'select', options: ['Soft blend', 'Medium blend', 'Full coverage'] },
      ],
      serviceIds: ['ws10', 'b4'],
    },
    combo: {
      detailFields: [
        { id: 'finish_style', label: 'Haircut finish', type: 'text', placeholder: 'Cut shape and length' },
        { id: 'beard_style', label: 'Beard shape', type: 'text', placeholder: 'Beard length and line' },
        { id: 'service_notes', label: 'Visit notes', type: 'textarea', placeholder: 'Products used, client preferences…' },
      ],
      serviceIds: ['b3', 'b1', 'b2'],
    },
    tricho: {
      detailFields: [
        { id: 'consult_notes', label: 'Consultation findings', type: 'textarea', placeholder: 'Scalp condition, shedding pattern, density…' },
        { id: 'treatment_plan', label: 'Recommended plan', type: 'textarea', placeholder: 'Next steps, home care, follow-up timing…' },
      ],
      serviceIds: ['c4'],
    },
    gloss: {
      detailFields: [
        { id: 'toner_formula', label: 'Gloss / toner formula', type: 'textarea' },
        { id: 'tone_goal', label: 'Tone goal', type: 'select', options: ['Warm up', 'Cool down', 'Neutralize brass', 'Shine refresh'] },
      ],
      serviceIds: ['ws11', 'ao-gloss-toner'],
    },
    keratin: {
      detailFields: [
        { id: 'product', label: 'Product used', type: 'text', placeholder: 'Keratin / smoothing system' },
        { id: 'processing', label: 'Processing notes', type: 'textarea' },
      ],
      serviceIds: ['ws4', 'ao-keratin-smooth'],
    },
    blowout: {
      detailFields: [
        { id: 'finish_style', label: 'Finish style', type: 'text', placeholder: 'Smooth, voluminous, curls…' },
      ],
      serviceIds: ['ws1'],
    },
    beard: {
      detailFields: [
        { id: 'beard_style', label: 'Beard shape', type: 'text' },
        { id: 'services_done', label: 'Also completed', type: 'select', options: ['Beard only', 'Beard + haircut', 'Beard + line up'] },
      ],
      serviceIds: ['b2', 'b3'],
    },
    scalp: {
      detailFields: [
        { id: 'treatment', label: 'Treatment used', type: 'text' },
        { id: 'scalp_notes', label: 'Scalp condition notes', type: 'textarea' },
      ],
      serviceIds: ['b5', 'ws5', 'ao-scalp-massage'],
    },
    addon: {
      detailFields: [
        { id: 'addon_notes', label: 'Add-on notes', type: 'textarea' },
      ],
      serviceIds: [],
      addonsOnly: true,
    },
    service: {
      detailFields: [
        { id: 'service_notes', label: 'Service notes', type: 'textarea' },
      ],
      serviceIds: [],
    },
    maint: {
      detailFields: [
        { id: 'maint_notes', label: 'Maintenance notes', type: 'textarea', placeholder: 'Bond, hairline, cleanse, style…' },
      ],
      serviceIds: ['b3', 'b-lux', 'b1', 'ws6'],
    },
    reattach: {
      detailFields: [
        { id: 'bond_type', label: 'Adhesive / bond type', type: 'text' },
        { id: 'reattach_notes', label: 'Reattachment notes', type: 'textarea' },
      ],
      serviceIds: ['b3', 'b1', 'ws6'],
    },
    emergency: {
      detailFields: [
        { id: 'issue', label: 'Issue addressed', type: 'textarea', placeholder: 'Lift, tear, bond failure, reposition…' },
      ],
      serviceIds: ['b3', 'b1', 'ws6'],
    },
    fitting: {
      detailFields: [
        { id: 'fit_notes', label: 'Fitting notes', type: 'textarea' },
      ],
      serviceIds: ['c5', 'b1', 'ws6'],
    },
    new_fit: {
      detailFields: [
        { id: 'system_type', label: 'System / method', type: 'text' },
        { id: 'fit_notes', label: 'Fitting notes', type: 'textarea' },
      ],
      serviceIds: ['c5', 'b1', 'ws6'],
    },
    wash: {
      detailFields: [
        { id: 'finish_style', label: 'Finish style', type: 'text' },
      ],
      serviceIds: ['ws1', 'b-lux', 'b3', 'ws6'],
    },
    moveup: {
      detailFields: [
        { id: 'rows_moved', label: 'Rows / sections', type: 'text' },
        { id: 'moveup_notes', label: 'Move-up notes', type: 'textarea' },
      ],
      serviceIds: ['ws6', 'ws1'],
    },
    consult: {
      detailFields: [
        { id: 'consult_notes', label: 'Consultation notes', type: 'textarea' },
      ],
      serviceIds: ['c5', 'c4'],
    },
  };

  function getApptGender(appt) {
    const S = window.RenvoaStudios;
    if (!appt) return 'all';
    if (appt.gender) return appt.gender;
    const client = appt.clientId ? S?.getClient(appt.clientId) : null;
    if (client?.gender) return client.gender;
    const svc = appt.serviceId ? S?.getService(appt.serviceId) : null;
    return svc?.gender || 'all';
  }

  function getActivityConfig(activityId) {
    return PROVIDER_ACTIVITY_CONFIG[activityId] || { detailFields: [], serviceIds: [] };
  }

  function apptUsesLuxAddonPricing(appt) {
    const S = window.RenvoaStudios;
    if (!S || !appt) return false;
    const luxIds = S.resolveApptLuxAddonIds?.(appt) || [];
    if (luxIds.length) return true;
    const primary = S.getService(appt.bookServiceId || appt.serviceId);
    return !!primary?.luxAddonsEligible;
  }

  function resolveServiceOrLuxAddon(serviceId) {
    const S = window.RenvoaStudios;
    if (!S || !serviceId) return null;
    const svc = S.getService(serviceId);
    if (svc) return svc;
    if (S.isLuxAddonId?.(serviceId)) {
      return S.luxAddonAsService?.(S.getMensLuxAddon(serviceId));
    }
    return null;
  }

  function getProviderAddonOptions(appt) {
    const S = window.RenvoaStudios;
    if (!S) return [];
    if (apptUsesLuxAddonPricing(appt)) {
      return S.getMensLuxAddons().map((lux) => S.luxAddonAsService(lux)).filter(Boolean);
    }
    return S.filterServices({ category: 'addon' }).filter((s) => s.isAddon || s.category === 'addon');
  }

  function getSuggestedBillableServices(appt, activityId) {
    const S = window.RenvoaStudios;
    if (!S || !activityId) return [];

    const results = [];
    const seen = new Set();
    const push = (svc) => {
      if (!svc || seen.has(svc.id)) return;
      seen.add(svc.id);
      results.push(svc);
    };

    if (appt?.packageVisit) {
      push({
        id: appt.serviceId || `pkg-${appt.programId || 'visit'}`,
        name: `Included visit — ${appt.programName || appt.serviceName || 'Program'}`,
        price: 0,
        packageVisitLine: true,
      });
    }

    const config = getActivityConfig(activityId);
    const gender = getApptGender(appt);
    const ids = new Set(config.serviceIds || []);
    resolveBookedServiceIds(appt).forEach((id) => ids.add(id));
    if (appt?.serviceId) ids.add(appt.serviceId);
    const cat = getServiceCategory(appt);
    S.filterServices({ category: cat, gender: gender === 'all' ? undefined : gender })
      .slice(0, 6)
      .forEach((s) => ids.add(s.id));

    ids.forEach((id) => {
      const svc = S.getService(id);
      if (isBillableAppointmentService(svc)) push(svc);
    });

    if (!results.some((s) => !s.packageVisitLine)) {
      ['mens_grooming', 'womens_styling', 'clinical', 'barbering'].forEach((fc) => {
        S.filterServices({ category: fc, gender: gender === 'all' ? undefined : gender })
          .filter((s) => !s.isPackage)
          .slice(0, 4)
          .forEach(push);
      });
    }

    return results;
  }

  function resolveDefaultLineItems(appt, activityId) {
    const S = window.RenvoaStudios;
    const suggested = getSuggestedBillableServices(appt, activityId);
    if (appt?.packageVisit) {
      const prepaid = suggested.find((s) => s.packageVisitLine);
      if (prepaid) return [{ serviceId: prepaid.id, qty: 1, packageVisitLine: true }];
    }

    const bookedBillable = resolveApptBillableServices(appt);
    if (bookedBillable.length) {
      return bookedBillable.map((svc) => ({ serviceId: svc.id, qty: 1 }));
    }

    const firstPaid = suggested.find((s) => (s.price || 0) > 0 && !s.packageVisitLine);
    if (firstPaid) return [{ serviceId: firstPaid.id, qty: 1 }];
    if (suggested.length) {
      return [{
        serviceId: suggested[0].id,
        qty: 1,
        packageVisitLine: !!suggested[0].packageVisitLine,
      }];
    }
    return [];
  }

  function formatProviderDetailSummary(session) {
    const details = session?.details || {};
    const parts = [];
    Object.entries(details).forEach(([key, val]) => {
      if (!val || !String(val).trim()) return;
      const label = key.replace(/_/g, ' ');
      parts.push(`${label}: ${val}`);
    });
    return parts.join(' · ');
  }

  function formatProviderSession(session) {
    if (!session?.activityLabel) return '';
    const subs = (session.subs || []).filter(Boolean);
    const detail = formatProviderDetailSummary(session);
    let base = subs.length
      ? `${session.activityLabel} — ${subs.join(', ')}`
      : session.activityLabel;
    if (detail) base += ` (${detail})`;
    return base;
  }

  function buildProviderPosLineItems(appt, session) {
    const S = window.RenvoaStudios;
    if (!S || !session) return [];
    const detailNote = formatProviderDetailSummary(session);
    const items = [];
    const rawLineItems = session.lineItems || [];
    const lineItems = rawLineItems.filter((li) => {
      if (li.packageVisitLine) return true;
      const svc = resolveServiceOrLuxAddon(li.serviceId);
      return isBillableAppointmentService(svc) || !!svc?.isLuxAddon;
    });
    const effectiveLineItems = lineItems.length
      ? lineItems
      : resolveDefaultLineItems(appt, session.activityId);
    effectiveLineItems.forEach((li, idx) => {
      if (li.packageVisitLine || (appt?.packageVisit && !S.getService(li.serviceId))) {
        const label = `Included visit — ${appt.programName || appt.serviceName || 'Program'}`;
        items.push({
          id: appt.serviceId || li.serviceId,
          name: idx === 0 && detailNote ? `${label} — ${detailNote}` : label,
          price: 0,
          qty: li.qty || 1,
          packageVisit: true,
          programId: appt.programId,
          visitNumber: appt.visitNumber,
          visitsIncluded: appt.visitsIncluded,
          visitValue: appt.visitValue || 0,
        });
        return;
      }
      const svc = resolveServiceOrLuxAddon(li.serviceId);
      if (!svc) return;
      const name = S.shortName(svc.name);
      items.push({
        id: svc.id,
        name: idx === 0 && detailNote ? `${name} — ${detailNote}` : name,
        price: li.price ?? svc.price ?? 0,
        qty: li.qty || 1,
        luxAddon: !!svc.isLuxAddon,
        extOptions: appt?.extOptions || null,
      });
    });
    (session.addonIds || []).forEach((addonId) => {
      if (effectiveLineItems.some((li) => li.serviceId === addonId)) return;
      const svc = resolveServiceOrLuxAddon(addonId);
      if (!svc) return;
      items.push({
        id: svc.id,
        name: S.shortName(svc.name),
        price: svc.price || 0,
        qty: 1,
        luxAddon: !!svc.isLuxAddon,
      });
    });
    return items;
  }

  function computeProviderCheckoutTotal(appt, session) {
    return buildProviderPosLineItems(appt, session)
      .reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  }

  const ALLERGY_FORM_ID = 'health_history';
  const ALLERGY_FIELD = 'allergies';

  function getAllergiesText(appt) {
    const data = appt?.intakeData?.[ALLERGY_FORM_ID] || {};
    return getFieldValue(data, { id: ALLERGY_FIELD, label: 'Allergies' });
  }

  function hasAllergies(appt) {
    const text = getAllergiesText(appt);
    if (!text) return false;
    return !/^(none|n\/a|na|no allergies?|nil|no known allergies?|not applicable|-)$/i.test(text);
  }

  function intakeFormReady(form, signed, data) {
    if (!form || !(signed || []).includes(form.id)) return false;
    if (!form.required) return true;
    const formData = (data || {})[form.id] || {};
    return normalizeFormFields(form)
      .filter((field) => isFieldRequired(form, field))
      .every((field) => getFieldValue(formData, field));
  }

  function intakeSkippedBadge(appt) {
    return !!appt?.intakeSkipped;
  }

  function intakeSkippedTriangle() {
    return '<span class="studio-intake-skipped-badge" title="Intake forms skipped" aria-label="Intake forms skipped">▲</span>';
  }

  function formatVisitDate(appt) {
    if (!appt?.date) return '';
    const S = window.RenvoaStudios;
    try {
      return new Date(`${appt.date}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      });
    } catch {
      return appt.date;
    }
  }

  function getIntakeSiteBase() {
    if (typeof window === 'undefined' || !window.location?.origin) return '';
    const path = window.location.pathname || '';
    if (path.includes('/admin/')) {
      return `${window.location.origin}${path.replace(/\/admin\/.*$/, '/')}`;
    }
    const dir = path.replace(/[^/]*$/, '');
    return `${window.location.origin}${dir}`;
  }

  function resolvePolicyUrl(url, base) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const root = base || getIntakeSiteBase();
    if (!root) return url;
    try {
      return new URL(url, root.endsWith('/') ? root : `${root}/`).href;
    } catch {
      return url;
    }
  }

  function resolveFormPolicyLinks(form) {
    return (form?.policyLinks || [])
      .map((id) => INTAKE_POLICIES[id])
      .filter(Boolean);
  }

  function getAllIntakePolicyLinks() {
    const seen = new Set();
    const links = [];
    INTAKE_FORMS.forEach((form) => {
      resolveFormPolicyLinks(form).forEach((policy) => {
        if (!seen.has(policy.url)) {
          seen.add(policy.url);
          links.push(policy);
        }
      });
    });
    return links;
  }

  function buildIntakePortalUrl(apptId) {
    const base = getIntakeSiteBase();
    const studiosPath = (typeof window !== 'undefined' && window.location?.pathname || '').includes('/admin/')
      ? '../studios.html'
      : 'studios.html';
    const href = base
      ? new URL(studiosPath, base.endsWith('/') ? base : `${base}/`).href
      : studiosPath;
    const params = new URLSearchParams();
    if (apptId) params.set('intake', apptId);
    return `${href}#portal?${params.toString()}`;
  }

  function formatPolicyLinksPlain(form, base) {
    const links = resolveFormPolicyLinks(form);
    if (!links.length) return '';
    return links.map((p) => `${p.label}: ${resolvePolicyUrl(p.url, base)}`).join('\n');
  }

  function formatAllPoliciesPlain(base) {
    return getAllIntakePolicyLinks()
      .map((p) => `• ${p.label}: ${resolvePolicyUrl(p.url, base)}`)
      .join('\n');
  }

  function formatIntakePlainText(appt, client, options = {}) {
    const intakeData = options.intakeData || appt?.intakeData || {};
    const signed = options.signed || appt?.intakeForms || [];
    const skipped = options.skipped || appt?.intakeSkippedForms || [];
    const blank = !!options.blank;
    const lines = [];
    const clientName = client?.name || appt?.clientName || 'Client';
    const clientEmail = client?.email || appt?.clientEmail || '';
    const clientPhone = client?.phone || appt?.clientPhone || '';

    lines.push(`${STUDIO_INTAKE_STUDIO_NAME} — Client Intake Forms`);
    lines.push('');
    lines.push(`Client: ${clientName}`);
    if (clientEmail) lines.push(`Email: ${clientEmail}`);
    if (clientPhone) lines.push(`Phone: ${clientPhone}`);
    if (appt?.date) lines.push(`Visit date: ${formatVisitDate(appt)}`);
    if (appt?.intendedService || appt?.serviceName) {
      lines.push(`Service: ${appt.intendedService || appt.serviceName}`);
    }
    lines.push('');
    const base = getIntakeSiteBase();
    const portalUrl = appt?.id ? buildIntakePortalUrl(appt.id) : '';

    lines.push(blank
      ? 'Please review each section below. Complete online in your client portal, reply with answers, or print and bring to your visit.'
      : 'Recorded responses from your visit intake:');
    if (blank && portalUrl) {
      lines.push('');
      lines.push(`Complete online (recommended): ${portalUrl}`);
      lines.push('Sign in with your phone, email, and 6-digit portal access code.');
    }
    lines.push('');
    lines.push('Studio policies referenced in these forms:');
    lines.push(formatAllPoliciesPlain(base));
    lines.push('—'.repeat(48));

    INTAKE_FORMS.forEach((form, idx) => {
      const formData = intakeData[form.id] || {};
      const status = skipped.includes(form.id) ? 'SKIPPED' : signed.includes(form.id) ? 'SIGNED' : blank ? 'PENDING' : 'IN PROGRESS';
      lines.push('');
      lines.push(`${idx + 1}. ${form.label} [${status}]`);
      lines.push(form.desc);
      if (form.intro) lines.push(form.intro);
      const policyPlain = formatPolicyLinksPlain(form, base);
      if (policyPlain) {
        lines.push('Policies for this section:');
        lines.push(policyPlain);
      }
      if (form.clauses?.length) {
        form.clauses.forEach((clause) => lines.push(`• ${clause}`));
      }
      normalizeFormFields(form).forEach((field) => {
        const value = blank ? '' : getFieldValue(formData, field);
        const display = value || (blank ? '___________________________' : '—');
        lines.push(`${getFieldLabel(field)}: ${display}`);
      });
      if (!blank && signed.includes(form.id)) {
        lines.push('Client signature: Acknowledged in studio');
      } else if (blank) {
        lines.push('Client signature: _________________________  Date: __________');
      }
    });

    lines.push('');
    lines.push('—'.repeat(48));
    lines.push(`Questions? Contact ${STUDIO_INTAKE_FROM_EMAIL}`);
    lines.push(`© ${new Date().getFullYear()} ${STUDIO_INTAKE_STUDIO_NAME}`);
    return lines.join('\n');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatIntakeHtml(appt, client, options = {}) {
    const plain = formatIntakePlainText(appt, client, options);
    const intakeData = options.intakeData || appt?.intakeData || {};
    const signed = options.signed || appt?.intakeForms || [];
    const skipped = options.skipped || appt?.intakeSkippedForms || [];
    const blank = !!options.blank;
    const clientName = escapeHtml(client?.name || appt?.clientName || 'Client');
    const base = getIntakeSiteBase();
    const portalUrl = appt?.id ? buildIntakePortalUrl(appt.id) : '';
    const policiesHtml = getAllIntakePolicyLinks().map((p) =>
      `<li><a href="${escapeHtml(resolvePolicyUrl(p.url, base))}">${escapeHtml(p.label)}</a></li>`
    ).join('');

    let formsHtml = INTAKE_FORMS.map((form, idx) => {
      const formData = intakeData[form.id] || {};
      const status = skipped.includes(form.id) ? 'Skipped' : signed.includes(form.id) ? 'Signed' : blank ? 'Pending' : 'In progress';
      const statusClass = skipped.includes(form.id) ? 'skipped' : signed.includes(form.id) ? 'signed' : 'pending';
      const fieldsHtml = normalizeFormFields(form).map((field) => {
        const value = blank ? '' : getFieldValue(formData, field);
        const display = value ? escapeHtml(value).replace(/\n/g, '<br>') : (blank ? '<em class="blank">To be completed</em>' : '—');
        return `<tr><th>${escapeHtml(getFieldLabel(field))}</th><td>${display}</td></tr>`;
      }).join('');
      const clausesHtml = (form.clauses || []).map((c) => `<li>${escapeHtml(c)}</li>`).join('');
      const formPolicies = resolveFormPolicyLinks(form);
      const formPoliciesHtml = formPolicies.length
        ? `<ul class="policy-links">${formPolicies.map((p) =>
          `<li><a href="${escapeHtml(resolvePolicyUrl(p.url, base))}">${escapeHtml(p.label)}</a></li>`
        ).join('')}</ul>`
        : '';
      return `
        <section class="form-block">
          <header>
            <h2>${idx + 1}. ${escapeHtml(form.label)}</h2>
            <span class="status ${statusClass}">${status}</span>
          </header>
          <p class="desc">${escapeHtml(form.desc)}</p>
          ${form.intro ? `<p class="intro">${escapeHtml(form.intro)}</p>` : ''}
          ${formPoliciesHtml ? `<div class="form-policies"><strong>Review policies:</strong>${formPoliciesHtml}</div>` : ''}
          ${clausesHtml ? `<ul class="clauses">${clausesHtml}</ul>` : ''}
          <table>${fieldsHtml}</table>
          ${blank ? '<p class="sig-line">Client signature: _________________________ &nbsp; Date: __________</p>' : signed.includes(form.id) ? '<p class="sig-line signed">✓ Acknowledged in studio</p>' : ''}
        </section>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(STUDIO_INTAKE_STUDIO_NAME)} Intake — ${clientName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1d1d1f; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.5; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    .meta { color: #6e6e73; font-size: 14px; margin-bottom: 28px; }
    .form-block { margin-bottom: 32px; padding: 20px; border: 1px solid #e8e8ed; border-radius: 12px; background: #fbfbfd; }
    .form-block header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
    .form-block h2 { font-size: 16px; margin: 0; }
    .status { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 999px; }
    .status.signed { background: #d1fae5; color: #065f46; }
    .status.skipped { background: #fee2e2; color: #991b1b; }
    .status.pending { background: #e0f2fe; color: #0369a1; }
    .desc, .intro { font-size: 14px; color: #424245; }
    .clauses { font-size: 13px; color: #6e6e73; padding-left: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    th { text-align: left; vertical-align: top; width: 38%; padding: 8px 10px 8px 0; color: #6e6e73; font-weight: 600; }
    td { padding: 8px 0; border-top: 1px solid #e8e8ed; }
    .blank { color: #aeaeb2; }
    .sig-line { margin-top: 14px; font-size: 13px; color: #424245; }
    .sig-line.signed { color: #065f46; font-weight: 600; }
    .portal-cta { margin: 0 0 24px; padding: 16px 18px; border-radius: 12px; background: #e8f4fd; border: 1px solid #b6d9f7; }
    .portal-cta a { color: #0071e3; font-weight: 600; }
    .policies-block { margin-bottom: 28px; padding: 16px 18px; border-radius: 12px; background: #f5f5f7; }
    .policies-block h2 { font-size: 14px; margin: 0 0 10px; }
    .policies-block ul, .form-policies ul, .policy-links { margin: 8px 0 0; padding-left: 18px; font-size: 13px; }
    .form-policies { margin: 10px 0; font-size: 13px; color: #424245; }
    .form-policies a, .policies-block a { color: #0071e3; }
    footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e8ed; font-size: 12px; color: #86868b; }
    pre.fallback { white-space: pre-wrap; font-family: inherit; font-size: 13px; display: none; }
    @media print { .portal-cta { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(STUDIO_INTAKE_STUDIO_NAME)} — Client Intake</h1>
  <p class="meta"><strong>${clientName}</strong>${client?.email || appt?.clientEmail ? ` · ${escapeHtml(client?.email || appt?.clientEmail)}` : ''}${appt?.date ? ` · ${escapeHtml(formatVisitDate(appt))}` : ''}</p>
  ${blank && portalUrl ? `<div class="portal-cta"><strong>Complete online</strong><p><a href="${escapeHtml(portalUrl)}">Open your client portal</a> — sign in with phone, email, and your 6-digit access code to fill out and sign these forms before your visit.</p></div>` : ''}
  ${policiesHtml ? `<section class="policies-block"><h2>Studio policies</h2><ul>${policiesHtml}</ul></section>` : ''}
  ${formsHtml}
  <footer>Questions? <a href="mailto:${STUDIO_INTAKE_FROM_EMAIL}">${escapeHtml(STUDIO_INTAKE_FROM_EMAIL)}</a></footer>
  <pre class="fallback">${escapeHtml(plain)}</pre>
</body>
</html>`;
  }

  function buildIntakeMailtoUrl(appt, client, options = {}) {
    const email = (client?.email || appt?.clientEmail || '').trim();
    if (!email) return null;
    const clientName = client?.name || appt?.clientName || 'there';
    const blank = !!options.blank;
    const subject = encodeURIComponent(
      `${STUDIO_INTAKE_STUDIO_NAME} intake forms${appt?.date ? ` — ${appt.date}` : ''}`
    );
    const bodyText = formatIntakePlainText(appt, client, {
      intakeData: options.intakeData,
      signed: options.signed,
      skipped: options.skipped,
      blank,
    });
    const base = getIntakeSiteBase();
    const portalUrl = appt?.id ? buildIntakePortalUrl(appt.id) : '';
    const portalBlock = blank && portalUrl
      ? `\nComplete online (recommended):\n${portalUrl}\nSign in with your phone, email, and 6-digit portal access code.\n\nReview studio policies:\n${formatAllPoliciesPlain(base)}\n\n`
      : '';
    const intro = blank
      ? `Hi ${clientName},\n\nPlease review and complete your intake forms before your visit.${portalBlock}You can also reply with your answers or print and bring the forms with you.\n\n`
      : `Hi ${clientName},\n\nHere is a copy of your intake forms from your visit.\n\n`;
    const body = encodeURIComponent(intro + bodyText);
    return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }

  function downloadIntakeHtml(appt, client, options = {}) {
    const html = formatIntakeHtml(appt, client, options);
    const name = (client?.name || appt?.clientName || 'client').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onyx-intake-${name}-${appt?.date || 'forms'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printIntakeForms(appt, client, options = {}) {
    const html = formatIntakeHtml(appt, client, options);
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return false;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 350);
    return true;
  }

  function renderFormPolicyLinksHtml(form, escFn) {
    const esc = escFn || escapeHtml;
    const base = getIntakeSiteBase();
    const links = resolveFormPolicyLinks(form);
    if (!links.length) return '';
    return `
      <div class="studio-intake-policies">
        <span>Review policies before signing:</span>
        <ul>${links.map((p) =>
          `<li><a href="${esc(resolvePolicyUrl(p.url, base))}" target="_blank" rel="noopener">${esc(p.label)}</a></li>`
        ).join('')}</ul>
      </div>`;
  }

  const PROVIDER_STEPS = [
    { id: 'activity', label: 'Activity' },
    { id: 'subs', label: 'Completed' },
    { id: 'details', label: 'Formula' },
    { id: 'checkout', label: 'Register' },
    { id: 'confirm', label: 'Confirm' },
  ];

  return {
    INTAKE_FORMS,
    INTAKE_POLICIES,
    STUDIO_INTAKE_FROM_EMAIL,
    STUDIO_INTAKE_STUDIO_NAME,
    STUDIO_POLICIES_PATH,
    PROVIDER_FLOWS,
    FLOW_STEPS,
    getServiceCategory,
    resolveBookedServiceIds,
    resolveActivityForServices,
    resolveDefaultActivityForAppt,
    providerSessionInProgress,
    resolveProviderWizardOpenStep,
    resolveProviderDraftForAppt,
    isBillableAppointmentService,
    resolveApptBillableServices,
    resolveApptPrimaryBillableService,
    SERVICE_ACTIVITY_MAP,
    getProviderFlow,
    getActivity,
    formatProviderSession,
    formatProviderDetailSummary,
    PROVIDER_ACTIVITY_CONFIG,
    getActivityConfig,
    getProviderAddonOptions,
    getSuggestedBillableServices,
    resolveDefaultLineItems,
    buildProviderPosLineItems,
    computeProviderCheckoutTotal,
    getApptGender,
    normalizeFormFields,
    getFieldKey,
    getFieldLabel,
    getFieldValue,
    isFieldRequired,
    intakeFormReady,
    portalIntakeFormReady,
    getPortalIntakeForms,
    getVisitSignForms,
    getArrivalBeverages,
    getArrivalBeverageLabel,
    buildClientPreferences,
    formatClientPreferencesNote,
    ARRIVAL_BEVERAGES_21,
    ALLERGY_FORM_ID,
    ALLERGY_FIELD,
    getAllergiesText,
    hasAllergies,
    intakeSkippedBadge,
    intakeSkippedTriangle,
    formatIntakePlainText,
    formatIntakeHtml,
    buildIntakeMailtoUrl,
    buildIntakePortalUrl,
    downloadIntakeHtml,
    printIntakeForms,
    renderFormPolicyLinksHtml,
    resolveFormPolicyLinks,
    resolvePolicyUrl,
    getAllIntakePolicyLinks,
    PROVIDER_STEPS,
  };
})();