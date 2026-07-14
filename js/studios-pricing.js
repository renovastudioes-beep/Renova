/** Default in-site embed — general CareCredit prequalify & apply. */
const STUDIO_FINANCE_CONSUMER_APPLY_URL = 'https://www.carecredit.com/apply/';
/** Optional override: your Provider Center custom link (carecredit.com/customlink). */
const STUDIO_FINANCE_URL = STUDIO_FINANCE_CONSUMER_APPLY_URL;
const STUDIO_FINANCE_PROVIDER_SETUP_URL = 'https://www.carecredit.com/customlink/';

const STUDIO_META = {
  brand: 'Onyx Studios',
  tagline: 'Premium hair restoration tailored to your lifestyle.',
  location: 'Jacksonville & beyond',
  phone: '(904) 555-0142',
  email: 'hello@onyxstudios.com',
  financeUrl: STUDIO_FINANCE_URL,
};

const STUDIO_CATEGORIES = {
  program: {
    id: 'program',
    label: "Men's Hair Systems",
    shortLabel: 'Hair systems',
    gender: 'men',
    order: 1,
    description: 'Custom skin and lace hybrid systems with scheduled maintenance visits.',
  },
  mens_grooming: {
    id: 'mens_grooming',
    label: 'Barbering & Grooming',
    shortLabel: 'Barbering',
    gender: 'men',
    order: 2,
    description: 'Cuts, beard work, color, and scalp treatments for system wearers.',
  },
  womens_program: {
    id: 'womens_program',
    label: 'Hair Systems & Toppers',
    shortLabel: 'Systems & toppers',
    gender: 'women',
    order: 1,
    description: 'Full systems, frontals, lace programs, and annual topper packages — first visit is a private fitting consultation.',
  },
  womens_extensions: {
    id: 'womens_extensions',
    label: 'Butterfly Bar Extensions',
    shortLabel: 'Extensions',
    gender: 'women',
    order: 1,
    description: 'Choose the method you\'re interested in — first visit is always a private consultation. Butterfly Weft is our go-to; tape-in, hand-tied, and beaded options when your plan calls for them.',
  },
  womens_styling: {
    id: 'womens_styling',
    label: 'Salon & Styling',
    shortLabel: 'Salon',
    gender: 'women',
    order: 3,
    description: 'Cuts, blowouts, full color, highlights, root work, keratin, and scalp care between extension visits.',
  },
  clinical: {
    id: 'clinical',
    label: 'Clinical Care',
    shortLabel: 'Clinical',
    gender: 'all',
    order: 4,
    description: 'One-time trichology consultation — $225.',
  },
  addon: {
    id: 'addon',
    label: 'Add-ons',
    shortLabel: 'Add-ons',
    gender: 'all',
    order: 5,
    description: 'Enhance any visit with scalp massage, brows, gloss, or smoothing.',
  },
};

/** Public site & booking — Clinic / Barber / Salon (replaces men/women as the top-level path) */
const STUDIO_PUBLIC_LINES = {
  clinic: {
    id: 'clinic',
    label: 'Clinic',
    headline: 'Hair restoration & clinical care',
    summary: 'Custom men\'s systems, Butterfly Weft extensions, and trichologist-led treatments.',
    categories: ['program', 'womens_extensions', 'clinical'],
    usesGender: true,
    defaultCategory: { men: 'program', women: 'womens_extensions' },
    order: 1,
  },
  barber: {
    id: 'barber',
    label: 'Barber',
    headline: 'Barbering & grooming',
    summary: 'Private-chair cuts, beard work, and scalp care book directly — color reserves a consultation from $225.',
    categories: ['mens_grooming'],
    usesGender: false,
    implicitGender: 'men',
    defaultCategory: 'mens_grooming',
    order: 2,
  },
  salon: {
    id: 'salon',
    label: 'Salon',
    headline: 'Salon & styling',
    summary: 'Cuts, blowouts, color, highlights, keratin, and finishing services in a one-on-one studio.',
    categories: ['womens_styling'],
    usesGender: false,
    implicitGender: 'women',
    defaultCategory: 'womens_styling',
    order: 3,
  },
};

const STUDIO_GENDER_OFFERINGS = {
  men: {
    title: 'Men',
    headline: 'Hair systems & grooming',
    summary: 'Custom cranial systems plus in-studio barbering and clinical restoration.',
    defaultCategory: 'program',
  },
  women: {
    title: 'Women',
    headline: 'Butterfly Bar',
    summary: 'Butterfly Weft extensions and private salon styling — all one-on-one.',
    defaultCategory: 'womens_extensions',
  },
};

const STUDIO_SERVICES = [
  { id: 'p1', name: "Men's Elite Skin System — Pay in Full", price: 4800, category: 'program', duration: '60 min', providerTime: 40, appointmentTime: 60, isPackage: true, appointmentsIncluded: 12, appointmentValue: 400, featured: true },
  { id: 'p1-q', name: "Men's Elite Skin System — Quarterly", price: 1500, category: 'program', duration: '60 min', providerTime: 40, appointmentTime: 60, isPackage: true, appointmentsIncluded: 3, appointmentValue: 500 },
  { id: 'p2', name: "Men's Premium Lace Hybrid — Pay in Full", price: 3600, category: 'program', duration: '60 min', providerTime: 40, appointmentTime: 60, isPackage: true, appointmentsIncluded: 12, appointmentValue: 300, featured: true },
  { id: 'p2-q', name: "Men's Premium Lace Hybrid — Quarterly", price: 1050, category: 'program', duration: '60 min', providerTime: 40, appointmentTime: 60, isPackage: true, appointmentsIncluded: 3, appointmentValue: 350 },
  { id: 'b1', name: 'Haircut & Style', price: 70, category: 'mens_grooming', duration: '20 min', providerTime: 15, appointmentTime: 20, publicBooking: 'direct', luxAddonsEligible: true, featured: true },
  { id: 'b-lux', name: 'Lux Cut', price: 150, category: 'mens_grooming', duration: '45 min', providerTime: 25, appointmentTime: 45, publicBooking: 'direct', description: 'Haircut plus eyebrow, nose & ear trim/wax included.' },
  { id: 'b2', name: 'Beard Trim & Shape', price: 100, category: 'mens_grooming', duration: '30 min', providerTime: 10, appointmentTime: 30, publicBooking: 'direct' },
  { id: 'b3', name: 'Haircut + Beard Combo', price: 225, category: 'mens_grooming', duration: '30 min', providerTime: 20, appointmentTime: 30, publicBooking: 'direct' },
  { id: 'b4', name: 'Grey Blending / Color', price: 225, category: 'mens_grooming', duration: '45 min', providerTime: 15, appointmentTime: 45, publicBooking: 'consult', consultFromPrice: 225 },
  { id: 'b5', name: 'Scalp Treatment', price: 150, category: 'mens_grooming', duration: '30 min', providerTime: 10, appointmentTime: 30, publicBooking: 'direct' },
  { id: 'b6', name: 'Full Color', price: 225, category: 'mens_grooming', duration: '60 min', providerTime: 30, appointmentTime: 60, publicBooking: 'consult', consultFromPrice: 225 },
  { id: 'c1', name: 'PRP Therapy', price: 600, category: 'clinical', duration: '40 min', providerTime: 20, appointmentTime: 40, publicHidden: true },
  { id: 'c2', name: 'LLLT Membership — Pay in Full', price: 7200, category: 'clinical', duration: '45 min', providerTime: 30, appointmentTime: 45, isPackage: true, appointmentsIncluded: 48, appointmentValue: 150, publicHidden: true },
  { id: 'c2-q', name: 'LLLT Membership — Quarterly', price: 1800, category: 'clinical', duration: '45 min', providerTime: 30, appointmentTime: 45, isPackage: true, appointmentsIncluded: 12, appointmentValue: 150, publicHidden: true },
  { id: 'c3', name: 'SMP Session', price: 1350, category: 'clinical', duration: '90 min', providerTime: 90, appointmentTime: 90, publicHidden: true },
  { id: 'c4', name: 'Trichology Consultation', price: 225, category: 'clinical', duration: '45 min', providerTime: 22, appointmentTime: 45, publicBooking: 'direct', featured: true },
  { id: 'c5', name: 'New Client Fitting', price: 0, category: 'clinical', duration: '60 min', providerTime: 60, appointmentTime: 60, internalBooking: true },
  { id: 'wp1', name: "Women's Elite Skin System — Pay in Full", price: 7200, category: 'womens_program', duration: '90 min', isPackage: true, appointmentsIncluded: 4, appointmentValue: 1800, featured: true, publicHidden: true },
  { id: 'wp1-q', name: "Women's Elite Skin System — Quarterly", price: 1950, category: 'womens_program', duration: '90 min', isPackage: true, appointmentsIncluded: 1, appointmentValue: 1950, publicHidden: true },
  { id: 'wp2', name: 'Frontal Elite System — Pay in Full', price: 3000, category: 'womens_program', duration: '60 min', providerTime: 40, appointmentTime: 60, isPackage: true, appointmentsIncluded: 12, appointmentValue: 250, publicHidden: true },
  { id: 'wp3', name: 'Premium Lace Full — Pay in Full', price: 3396, category: 'womens_program', duration: '60 min', providerTime: 40, appointmentTime: 60, isPackage: true, appointmentsIncluded: 12, appointmentValue: 283, publicHidden: true },
  { id: 'wp4', name: 'Hair Topper — Pay in Full', price: 6600, category: 'womens_program', duration: '60 min', isPackage: true, appointmentsIncluded: 12, appointmentValue: 550, featured: true, publicHidden: true },
  { id: 'ws6', name: 'Haircut & Style', price: 150, category: 'womens_styling', duration: '45 min', providerTime: 45, appointmentTime: 45, publicBooking: 'direct', featured: true },
  { id: 'ws1', name: 'Blow Out', price: 75, category: 'womens_styling', duration: '45 min', providerTime: 45, appointmentTime: 45, publicBooking: 'direct' },
  { id: 'ws3', name: 'Color + Cut', price: 225, category: 'womens_styling', duration: '75 min', providerTime: 75, appointmentTime: 75, publicBooking: 'consult', consultFromPrice: 225, featured: true },
  { id: 'ws7', name: 'Full Color', price: 225, category: 'womens_styling', duration: '90 min', providerTime: 60, appointmentTime: 90, publicBooking: 'consult', consultFromPrice: 225 },
  { id: 'ws8', name: 'Highlights & Balayage', price: 275, category: 'womens_styling', duration: '90 min', providerTime: 60, appointmentTime: 90, publicBooking: 'consult', consultFromPrice: 275 },
  { id: 'ws9', name: 'Root Touch-Up', price: 175, category: 'womens_styling', duration: '60 min', providerTime: 30, appointmentTime: 60, publicBooking: 'consult', consultFromPrice: 175 },
  { id: 'ws10', name: 'Grey Blending', price: 225, category: 'womens_styling', duration: '45 min', providerTime: 20, appointmentTime: 45, publicBooking: 'consult', consultFromPrice: 225 },
  { id: 'ws11', name: 'Gloss / Toner Refresh', price: 75, category: 'womens_styling', duration: '45 min', providerTime: 30, appointmentTime: 45, publicBooking: 'direct' },
  { id: 'ws4', name: 'Keratin Treatment', price: 200, category: 'womens_styling', duration: '60 min', providerTime: 60, appointmentTime: 60, publicBooking: 'direct' },
  { id: 'ws5', name: 'Scalp Treatment & Conditioning', price: 120, category: 'womens_styling', duration: '45 min', providerTime: 45, appointmentTime: 45, publicBooking: 'direct' },
  { id: 'we4', name: 'Butterfly Weft — Pay in Full', price: 1199, category: 'womens_extensions', duration: '60 min', isPackage: true, appointmentsIncluded: 6, appointmentValue: 200, featured: true },
  { id: 'we4-q', name: 'Butterfly Weft — Quarterly', price: 325, category: 'womens_extensions', duration: '60 min', isPackage: true, appointmentsIncluded: 2, appointmentValue: 163 },
  { id: 'we1', name: 'Injected Tape-In — Pay in Full', price: 1899, category: 'womens_extensions', duration: '60 min', isPackage: true, appointmentsIncluded: 7, appointmentValue: 271 },
  { id: 'we1-q', name: 'Injected Tape-In — Quarterly', price: 500, category: 'womens_extensions', duration: '60 min', isPackage: true, appointmentsIncluded: 2, appointmentValue: 250 },
  { id: 'we2', name: 'Hand-Tied Wefts — Pay in Full', price: 1699, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 3, appointmentValue: 566 },
  { id: 'we2-q', name: 'Hand-Tied Wefts — Quarterly', price: 450, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 1, appointmentValue: 450 },
  { id: 'we3', name: 'Genius Weft — Pay in Full', price: 2899, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 6, appointmentValue: 483 },
  { id: 'we3-q', name: 'Genius Weft — Quarterly', price: 750, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 2, appointmentValue: 375 },
  { id: 'we5', name: 'Keratin Bond Extensions — Pay in Full', price: 2999, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 3, appointmentValue: 1000 },
  { id: 'we5-q', name: 'Keratin Bond Extensions — Quarterly', price: 775, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 1, appointmentValue: 775 },
  { id: 'we6', name: 'Beaded I-Tip Extensions — Pay in Full', price: 2899, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 6, appointmentValue: 483 },
  { id: 'we6-q', name: 'Beaded I-Tip Extensions — Quarterly', price: 750, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 2, appointmentValue: 375 },
  { id: 'we7', name: 'Beaded Y-Tip Extensions — Pay in Full', price: 5599, category: 'womens_extensions', duration: '120 min', isPackage: true, appointmentsIncluded: 6, appointmentValue: 933 },
  { id: 'we7-q', name: 'Beaded Y-Tip Extensions — Quarterly', price: 1425, category: 'womens_extensions', duration: '120 min', isPackage: true, appointmentsIncluded: 2, appointmentValue: 713 },
  { id: 'we8', name: 'Beaded Nano Ring Extensions — Pay in Full', price: 2899, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 6, appointmentValue: 483 },
  { id: 'we8-q', name: 'Beaded Nano Ring Extensions — Quarterly', price: 750, category: 'womens_extensions', duration: '90 min', isPackage: true, appointmentsIncluded: 2, appointmentValue: 375 },
  { id: 'ao-scalp-massage', name: 'Scalp Massage', price: 50, category: 'addon', duration: 'Add-on', isAddon: true },
  { id: 'ao-eyebrow', name: 'Eyebrow Grooming', price: 40, category: 'addon', duration: 'Add-on', isAddon: true },
  { id: 'ao-gloss-toner', name: 'Gloss / Toner', price: 60, category: 'addon', duration: 'Add-on', isAddon: true },
  { id: 'ao-keratin-smooth', name: 'Keratin Smoothing', price: 80, category: 'addon', duration: 'Add-on', isAddon: true },
];

/** Walk-in POS shelf — retail & quick ring-ups only (no profiles, no packages) */
const STUDIO_SHELF_CATEGORIES = {
  products: {
    id: 'products',
    label: 'Retail products',
    order: 1,
    description: 'Take-home care products from the studio shelf.',
  },
  quick: {
    id: 'quick',
    label: 'Quick add-ons',
    order: 2,
    description: 'À la carte add-ons at the chair — no program enrollment.',
  },
};

const STUDIO_SHELF_ITEMS = [
  { id: 'sh-serum', name: 'Onyx Scalp Serum', price: 38, category: 'products', sku: 'ONX-SS-38', featured: true },
  { id: 'sh-mask', name: 'Bond Repair Mask', price: 42, category: 'products', sku: 'ONX-BRM-42' },
  { id: 'sh-shampoo', name: 'Hydrating System Shampoo', price: 28, category: 'products', sku: 'ONX-HS-28' },
  { id: 'sh-conditioner', name: 'Hydrating System Conditioner', price: 28, category: 'products', sku: 'ONX-HC-28' },
  { id: 'sh-spray', name: 'Edge Control & Finish Spray', price: 24, category: 'products', sku: 'ONX-EF-24' },
  { id: 'sh-toolkit', name: 'At-Home Care Toolkit', price: 65, category: 'products', sku: 'ONX-AH-65', featured: true },
  { id: 'sh-tape', name: 'Extension Tape Refill Pack', price: 18, category: 'products', sku: 'ONX-ET-18' },
  { id: 'sh-brush', name: 'Loop Brush — Extensions Safe', price: 22, category: 'products', sku: 'ONX-LB-22' },
  { id: 'sh-scalp-massage', name: 'Scalp Massage', price: 50, category: 'quick', duration: 'Add-on' },
  { id: 'sh-eyebrow', name: 'Eyebrow Grooming', price: 40, category: 'quick', duration: 'Add-on' },
  { id: 'sh-gloss', name: 'Gloss / Toner', price: 60, category: 'quick', duration: 'Add-on', featured: true },
  { id: 'sh-keratin', name: 'Keratin Smoothing', price: 80, category: 'quick', duration: 'Add-on' },
];

const STUDIO_PROCESS = [
  { step: '01', title: 'Consultation', desc: 'We assess your hair, lifestyle, and goals with a certified trichologist clinician.' },
  { step: '02', title: 'Custom design', desc: 'Color, density, and base type matched precisely to you.' },
  { step: '03', title: 'Private fitting', desc: 'One-on-one sessions in a luxury studio environment.' },
  { step: '04', title: 'Ongoing care', desc: 'Maintenance plans designed around your comfort and schedule.' },
];

const STUDIO_HIGHLIGHTS = [
  'Non-invasive hair restoration',
  'Led by a certified trichologist clinician',
  'Private one-on-one sessions',
  'Custom color, density, and texture matching',
];

/** Program families — drives POS/booking submenus & payment popups */
const STUDIO_PROGRAM_FAMILIES = {
  "Men's Elite Skin System": {
    category: 'program',
    gender: 'men',
    tagline: 'Ultra-realistic skin base · maximum durability',
    description: 'Full cranial coverage with a thin skin base for the most natural hairline. Includes custom color, density, and scheduled maintenance visits.',
    highlights: ['12 maintenance visits', '60 min appointments', 'Custom density & color'],
    featured: true,
  },
  "Men's Premium Lace Hybrid": {
    category: 'program',
    gender: 'men',
    tagline: 'Breathable lace front · hybrid comfort',
    description: 'Lace-front hybrid system balancing breathability and security. Ideal for active lifestyles with quarterly refresh options.',
    highlights: ['12 maintenance visits', '60 min appointments', 'Lace-front natural line'],
    featured: true,
  },
  "Women's Elite Skin System": {
    category: 'womens_program',
    gender: 'women',
    tagline: 'Full cranial system · premium skin base',
    description: 'Comprehensive women\'s restoration with extended fitting sessions and custom density, color, and hairline design.',
    highlights: ['4 fitting visits', '90 min sessions', 'Full coverage program'],
    featured: true,
  },
  'Frontal Elite System': {
    category: 'womens_program',
    gender: 'women',
    tagline: 'Targeted frontal coverage',
    description: 'Elite frontal system for hairline and part-line restoration with scheduled maintenance throughout the year.',
    highlights: ['12 maintenance visits', '60 min appointments', 'Frontal-focused design'],
  },
  'Premium Lace Full': {
    category: 'womens_program',
    gender: 'women',
    tagline: 'Full lace · natural movement',
    description: 'Premium full lace program for clients who want breathable, natural movement across the entire system.',
    highlights: ['12 maintenance visits', '60 min appointments', 'Full lace base'],
  },
  'Hair Topper': {
    category: 'womens_program',
    gender: 'women',
    tagline: 'Annual topper program',
    description: 'Year-long topper package for targeted crown and part coverage with private fittings and refresh visits.',
    highlights: ['12 visits included', '60 min sessions', 'Topper-focused coverage'],
    featured: true,
  },
  'LLLT Membership': {
    category: 'clinical',
    gender: 'all',
    tagline: 'Low-level laser therapy membership',
    description: 'Ongoing LLLT sessions for scalp health and thinning — plan length and visit cadence confirmed at your clinical consultation.',
    highlights: ['48 sessions in annual plan', '45 min appointments', 'Trichologist-led protocol'],
    featured: true,
  },
  'Injected Tape-In': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'Alternate method · seamless tape-in blend',
    description: 'Injected tape-in wefts when your consult calls for tape — volume and length with minimal visibility at the part line.',
    highlights: ['7 install visits', '60 min sessions', 'Custom consult option'],
  },
  'Hand-Tied Wefts': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'Lightweight · hand-tied comfort',
    description: 'Hand-tied weft extensions for natural movement and reduced tension on the scalp.',
    highlights: ['3 install visits', '90 min sessions', 'Low-profile weft'],
  },
  'Genius Weft': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'Genius weft technology',
    description: 'Premium genius weft method for secure, flexible extension wear.',
    highlights: ['6 maintenance visits', '90 min sessions'],
  },
  'Butterfly Weft': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'Butterfly Bar flagship · seamless blend',
    description: 'Our signature extension method — Butterfly Weft delivers seamless part-line blending, natural movement, and comfortable wear.',
    highlights: ['Seamless blend', '60 min sessions', '6 maintenance visits'],
    featured: true,
  },
  'Keratin Bond Extensions': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'Keratin bond · long-lasting hold',
    description: 'Individual keratin-bonded extensions for precision placement and durability.',
    highlights: ['3 install visits', '90 min sessions'],
  },
  'Beaded I-Tip Extensions': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'I-tip micro bead method',
    description: 'Beaded I-tip extensions for flexible styling and secure attachment.',
    highlights: ['6 maintenance visits', '90 min sessions'],
  },
  'Beaded Y-Tip Extensions': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'Y-tip · maximum coverage',
    description: 'Beaded Y-tip extensions for clients needing fuller density and longer wear cycles.',
    highlights: ['6 maintenance visits', '120 min sessions', 'Premium density'],
  },
  'Beaded Nano Ring Extensions': {
    category: 'womens_extensions',
    gender: 'women',
    tagline: 'Nano ring · ultra-discreet',
    description: 'Nano ring beaded method for the smallest attachment point and natural fall.',
    highlights: ['6 maintenance visits', '90 min sessions'],
  },
};

/** Extension length/sub-type/configure tables live in studio-extension-data.js (Sintra-aligned). */

/** Lead extension family — surfaced first in booking, POS, and marketing */
const STUDIO_EXTENSION_LEAD_FAMILY = 'Butterfly Weft';

const STUDIO_EXTENSION_FAMILY_ORDER = [
  'Butterfly Weft',
  'Injected Tape-In',
  'Hand-Tied Wefts',
  'Genius Weft',
  'Keratin Bond Extensions',
  'Beaded I-Tip Extensions',
  'Beaded Y-Tip Extensions',
  'Beaded Nano Ring Extensions',
];

/** Color consults in barber/salon lines — all others book as the service directly */
const STUDIO_COLOR_CONSULT_FROM = 225;

/** Quarterly billing only offered when the per-quarter payment is at least this amount */
const STUDIO_QUARTERLY_MIN_PAYMENT = 1000;

/** Assumed CareCredit promo term for "from" monthly payment displays */
const STUDIO_FINANCE_TERM_MONTHS = 12;

/** Finance package totals end in $99 (e.g. $5,400 → $5,399). */
function roundFinanceTotalTo99(amount) {
  const n = Math.round(amount);
  if (n <= 0) return 0;
  if (n % 100 === 99) return n;
  const candidate = Math.floor(n / 100) * 100 + 99;
  if (candidate > n) return candidate - 100;
  return candidate;
}

/** Finance total = 20% above pay-in-full package price, rounded to end in $99. */
function computeFinancePackagePrice({ pifAmount, pifPrice, pifPerVisit, visits } = {}) {
  let base = Number(pifAmount ?? pifPrice) || 0;
  if (!base) {
    const count = Number(visits) || 0;
    const perVisit = Number(pifPerVisit) || 0;
    if (count && perVisit) base = perVisit * count;
  }
  if (!base) return 0;
  return roundFinanceTotalTo99(base * 1.2);
}

function computeFinancePrice(pifAmount) {
  return computeFinancePackagePrice({ pifAmount });
}

/** Monthly payment for storefront "from" pricing — 12-month 0% assumption */
function getFinanceMonthlyPayment(financeTotal) {
  const total = Number(financeTotal) || 0;
  if (!total) return 0;
  return Math.round(total / STUDIO_FINANCE_TERM_MONTHS);
}

/** Package hair warranty — proper care required; grace period before $50 extension fee */
const STUDIO_PACKAGE_WARRANTY = {
  summary: 'Full hair warranty with proper care',
  gracePeriodDays: 14,
  lateFee: 50,
  details: [
    'All packages include a full warranty on the hair when proper care guidelines are followed.',
    'Warranty does not cover damage caused by neglect or misuse.',
    'Appointments must be kept within 2 weeks of the recommended visit window to maintain warranty coverage.',
    'Visits outside that window require a $50 fee to keep warranty valid.',
  ],
};

/** Optional lux add-ons for men's regular haircut (not Lux Cut) */
const STUDIO_MENS_LUX_ADDONS = [
  { id: 'lux-brow', name: 'Eyebrow trim/wax', price: 30 },
  { id: 'lux-nose', name: 'Nose trim/wax', price: 30 },
  { id: 'lux-ear', name: 'Ear trim/wax', price: 30 },
];

const STUDIO_LUX_ADDON_EXTRA_MIN = 15;

window.STUDIO_FINANCE_CONSUMER_APPLY_URL = STUDIO_FINANCE_CONSUMER_APPLY_URL;
window.STUDIO_FINANCE_URL = STUDIO_FINANCE_URL;
window.STUDIO_FINANCE_PROVIDER_SETUP_URL = STUDIO_FINANCE_PROVIDER_SETUP_URL;
window.STUDIO_META = STUDIO_META;
window.STUDIO_PROGRAM_FAMILIES = STUDIO_PROGRAM_FAMILIES;
window.STUDIO_CATEGORIES = STUDIO_CATEGORIES;
window.STUDIO_PUBLIC_LINES = STUDIO_PUBLIC_LINES;
window.STUDIO_GENDER_OFFERINGS = STUDIO_GENDER_OFFERINGS;
window.STUDIO_SERVICES = STUDIO_SERVICES;
window.STUDIO_PROCESS = STUDIO_PROCESS;
window.STUDIO_HIGHLIGHTS = STUDIO_HIGHLIGHTS;
window.STUDIO_PACKAGE_CATEGORIES = ['program', 'womens_extensions', 'womens_program'];
window.STUDIO_EXTENSION_CATEGORY = 'womens_extensions';
window.STUDIO_EXTENSION_LEAD_FAMILY = STUDIO_EXTENSION_LEAD_FAMILY;
window.STUDIO_EXTENSION_FAMILY_ORDER = STUDIO_EXTENSION_FAMILY_ORDER;
window.STUDIO_SHELF_CATEGORIES = STUDIO_SHELF_CATEGORIES;
window.STUDIO_SHELF_ITEMS = STUDIO_SHELF_ITEMS;
window.STUDIO_COLOR_CONSULT_FROM = STUDIO_COLOR_CONSULT_FROM;
window.STUDIO_QUARTERLY_MIN_PAYMENT = STUDIO_QUARTERLY_MIN_PAYMENT;
window.STUDIO_FINANCE_TERM_MONTHS = STUDIO_FINANCE_TERM_MONTHS;
window.roundFinanceTotalTo99 = roundFinanceTotalTo99;
window.computeFinancePackagePrice = computeFinancePackagePrice;
window.computeFinancePrice = computeFinancePrice;
window.getFinanceMonthlyPayment = getFinanceMonthlyPayment;
window.STUDIO_PACKAGE_WARRANTY = STUDIO_PACKAGE_WARRANTY;
window.STUDIO_MENS_LUX_ADDONS = STUDIO_MENS_LUX_ADDONS;
window.STUDIO_LUX_ADDON_EXTRA_MIN = STUDIO_LUX_ADDON_EXTRA_MIN;