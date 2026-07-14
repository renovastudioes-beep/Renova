var GOAL_CATEGORIES = {
  'metabolic-research': {
    id: 'metabolic-research',
    label: 'Metabolic Research Compounds',
    subtitle: 'GLP-1 / GIP pathway models',
    products: ['semaglutide', 'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', 'mots-c'],
  },
  'tissue-research': {
    id: 'tissue-research',
    label: 'Tissue Research Compounds',
    subtitle: 'Structural peptide & migration models',
    products: ['bpc-157', 'tb-500', 'recovery-stack'],
  },
  'gh-axis-research': {
    id: 'gh-axis-research',
    label: 'Growth Hormone Axis Research',
    subtitle: 'GH secretagogue & GHRH models',
    products: ['gh-stack', 'sermorelin', 'igf-1-lr3', 'tesamorelin'],
  },
  'matrix-research': {
    id: 'matrix-research',
    label: 'Skin Research Compounds',
    subtitle: 'Extracellular matrix & collagen assays',
    products: ['ghk-cu', 'glow-blend'],
  },
  'cognitive-research': {
    id: 'cognitive-research',
    label: 'Endocrine Research Pathways',
    subtitle: 'Peptide receptor & signaling models',
    products: ['semax-selank', 'pt-141'],
  },
  'longevity-research': {
    id: 'longevity-research',
    label: 'Longevity Research',
    subtitle: 'Cellular & immune pathway models',
    products: ['nad-plus', 'thymosin-alpha-1', 'epithalon'],
  },
};

var GOAL_ALIASES = {
  'weight-loss': 'metabolic-research',
  'tissue-repair': 'tissue-research',
  'growth-hormone': 'gh-axis-research',
  'anti-aging': 'longevity-research',
  'skin-research': 'matrix-research',
  metabolic: 'metabolic-research',
  'endocrine-research': 'gh-axis-research',
  'growth-hormone-axis': 'gh-axis-research',
};

const RUO_STORAGE = 'Store sealed lyophilized material per your institution\'s cold-storage protocols for peptide reagents.';
const RUO_PREP = 'Prepare per your laboratory standard operating procedures for lyophilized peptide reagents.';
const RUO_HANDLE = 'For in-vitro laboratory research by qualified personnel only.';
const RUO_HIGHLIGHTS = [
  'HPLC-verified purity with mass spectrometry identity confirmation',
  'Lyophilized format for laboratory stability',
  'Batch-specific COA included with every order',
  'Research use only — in-vitro laboratory use',
];

function vialProduct({
  id, name, tagline, description, price, cogs, categories, color, cas, sequence, mw,
  purity = '≥98%', featured, isBundle, bundleLabel, currentLot,
}) {
  const variantLabel = bundleLabel || 'Lyophilized vial';
  return {
    id,
    name,
    tagline,
    description,
    longDescription: description,
    price,
    cogs,
    defaultVariant: 'vial',
    variants: { vial: { label: variantLabel, price, cogs } },
    sizes: [variantLabel],
    purity,
    form: 'Lyophilized powder',
    storage: RUO_STORAGE,
    cas: cas || '—',
    sequence: sequence || '—',
    molecularWeight: mw || '—',
    color: color || '#3b82f6',
    categories: categories || [],
    featured: !!featured,
    isBundle: !!isBundle,
    currentLot: currentLot || '',
    lotPurity: purity,
    researchAreas: ['Analytical characterization', 'In-vitro assay development', 'Receptor binding studies'],
    mechanism: `${name} — research-grade lyophilized reagent for qualified laboratory use.`,
    researchHighlights: RUO_HIGHLIGHTS,
    reconstitution: RUO_PREP,
    handling: RUO_HANDLE,
  };
}

var PRODUCTS = {
  semaglutide: vialProduct({
    id: 'semaglutide', name: 'Semaglutide', price: 124.5, cogs: 5.6,
    tagline: 'Research-grade 2mg lyophilized for in-vitro research',
    description: 'Semaglutide — research-grade 2mg lyophilized for in-vitro research.',
    categories: ['metabolic-research'], color: '#10b981', cas: '910463-68-2', featured: true,
    currentLot: 'RC-SEM26-0401',
  }),
  tirzepatide: vialProduct({
    id: 'tirzepatide', name: 'Tirzepatide', price: 149.5, cogs: 5.9,
    tagline: 'Dual GIP/GLP-1 analog — lyophilized research vial',
    description: 'Tirzepatide — dual GIP/GLP-1 receptor analog supplied as a lyophilized vial for in-vitro endocrine signaling research.',
    categories: ['metabolic-research'], color: '#059669', featured: true,
    currentLot: 'RC-TIR26-0402',
  }),
  retatrutide: vialProduct({
    id: 'retatrutide', name: 'Retatrutide', price: 174.5, cogs: 9.8,
    tagline: 'Triple agonist analog — lyophilized research vial',
    description: 'Retatrutide — multi-receptor agonist analog for qualified in-vitro metabolic and endocrine pathway research.',
    categories: ['metabolic-research'], color: '#047857',
    currentLot: 'RC-RET26-0403',
  }),
  tesamorelin: vialProduct({
    id: 'tesamorelin', name: 'Tesamorelin', price: 139.5, cogs: 10.1,
    tagline: 'GHRH analog peptide — lyophilized research vial',
    description: 'Tesamorelin — synthetic GHRH analog supplied lyophilized for in-vitro endocrine receptor research.',
    categories: ['metabolic-research', 'gh-axis-research'], color: '#0d9488',
    currentLot: 'RC-TES26-0404',
  }),
  'aod-9604': vialProduct({
    id: 'aod-9604', name: 'AOD-9604', price: 114.5, cogs: 9.1,
    tagline: 'HGH fragment analog (176-191) — lyophilized research vial',
    description: 'AOD-9604 — synthetic peptide fragment analog supplied lyophilized for in-vitro laboratory characterization.',
    categories: ['metabolic-research'], color: '#14b8a6',
    currentLot: 'RC-AOD26-0405',
  }),
  'mots-c': vialProduct({
    id: 'mots-c', name: 'MOTS-c', price: 124.5, cogs: 7.5,
    tagline: 'Mitochondrial-derived peptide — lyophilized research vial',
    description: 'MOTS-c — mitochondrial open reading frame peptide supplied lyophilized for in-vitro metabolic research models.',
    categories: ['metabolic-research'], color: '#2dd4bf',
    currentLot: 'RC-MOT26-0406',
  }),
  'gh-stack': vialProduct({
    id: 'gh-stack', name: 'Research Pairing: Ipamorelin + CJC-1295', price: 93, cogs: 9,
    tagline: 'Research pairing — two lyophilized vials',
    description: 'Research Pairing: Ipamorelin + CJC-1295 — separate lyophilized vials with individual COAs for in-vitro research.',
    categories: ['gh-axis-research'], color: '#a855f7', isBundle: true, featured: true,
    bundleLabel: 'CJC-1295 + Ipamorelin vials',
    currentLot: 'RC-GH26-0390',
  }),
  sermorelin: vialProduct({
    id: 'sermorelin', name: 'Sermorelin', price: 114.5, cogs: 7.8,
    tagline: 'GHRH(1-29) peptide — lyophilized research vial',
    description: 'Sermorelin — GHRH(1-29) peptide analog supplied lyophilized for in-vitro endocrine signaling research.',
    categories: ['gh-axis-research'], color: '#ec4899',
    currentLot: 'RC-SER26-0407',
  }),
  'bpc-157': vialProduct({
    id: 'bpc-157', name: 'BPC-157', price: 99.5, cogs: 4.6,
    tagline: '5mg & 10mg lyophilized for in-vitro research',
    description: 'BPC-157 — 5mg & 10mg lyophilized for in-vitro research.',
    categories: ['tissue-research', 'matrix-research'], color: '#3b82f6', cas: '137525-51-0',
    sequence: 'GEPPPGKPADDAGLV', mw: '1,419.6 g/mol', purity: '≥99%', featured: true,
    currentLot: 'RC-BPC26-0412',
  }),
  'tb-500': vialProduct({
    id: 'tb-500', name: 'TB-500', price: 109.5, cogs: 8.4,
    tagline: 'Thymosin Beta-4 fragment — 5mg lyophilized',
    description: 'TB-500 (Thymosin Beta-4 fragment) — 5mg lyophilized for in-vitro research.',
    categories: ['tissue-research'], color: '#8b5cf6', cas: '77591-33-4', sequence: 'LKKTETQ',
    purity: '≥99%', featured: true, currentLot: 'RC-TB26-0388',
  }),
  'recovery-stack': vialProduct({
    id: 'recovery-stack', name: 'Research Pairing: BPC-157 5mg + TB-500 5mg', price: 124.5, cogs: 10.4,
    tagline: 'Research pairing — two lyophilized vials',
    description: 'Research Pairing: BPC-157 5mg + TB-500 5mg — separate lyophilized vials with individual COAs for in-vitro research.',
    categories: ['tissue-research'], color: '#6366f1', isBundle: true,
    bundleLabel: 'BPC-157 + TB-500 vials', currentLot: 'RC-RS26-0408',
  }),
  'igf-1-lr3': vialProduct({
    id: 'igf-1-lr3', name: 'IGF-1 LR3', price: 149.5, cogs: 19.5,
    tagline: 'Long-acting IGF-1 analog — lyophilized research vial',
    description: 'IGF-1 LR3 — insulin-like growth factor-1 long arginine analog supplied lyophilized for in-vitro signaling research.',
    categories: ['gh-axis-research'], color: '#7c3aed',
    currentLot: 'RC-IGF26-0409',
  }),
  'ghk-cu': vialProduct({
    id: 'ghk-cu', name: 'GHK-Cu', price: 99.5, cogs: 4,
    tagline: '50mg per vial for in-vitro research',
    description: 'GHK-Cu — 50mg per vial for in-vitro research.',
    categories: ['matrix-research'], color: '#06b6d4', cas: '49557-75-7', purity: '≥99%',
    featured: true, currentLot: 'RC-GHK26-0395',
  }),
  'glow-blend': vialProduct({
    id: 'glow-blend', name: 'BPC-157 + GHK-Cu + TB-500 Pairing', price: 164.5, cogs: 16,
    tagline: 'Three-compound research pairing — lyophilized vials',
    description: 'Research pairing: BPC-157, GHK-Cu, and TB-500 — three separate lyophilized vials with individual COAs for in-vitro protocols.',
    categories: ['matrix-research'], color: '#0891b2', isBundle: true,
    bundleLabel: 'BPC-157 + GHK-Cu + TB-500 vials', currentLot: 'RC-GLW26-0410',
  }),
  'semax-selank': vialProduct({
    id: 'semax-selank', name: 'Semax / Selank Pairing', price: 99.5, cogs: 4.55,
    tagline: 'Neuropeptide pairing — two lyophilized vials',
    description: 'Commonly studied neuropeptide pairing: Semax and Selank — separate lyophilized vials for in-vitro cognitive signaling research.',
    categories: ['cognitive-research'], color: '#6366f1', isBundle: true,
    bundleLabel: 'Semax + Selank vials', currentLot: 'RC-SS26-0411',
  }),
  'pt-141': vialProduct({
    id: 'pt-141', name: 'PT-141', price: 179, cogs: 6.9,
    tagline: 'Melanocortin peptide analog — lyophilized research vial',
    description: 'PT-141 (Bremelanotide analog) — synthetic melanocortin peptide supplied lyophilized for in-vitro receptor research.',
    categories: ['cognitive-research'], color: '#8b5cf6',
    currentLot: 'RC-PT26-0412',
  }),
  'nad-plus': vialProduct({
    id: 'nad-plus', name: 'NAD+', price: 149.5, cogs: 6.1,
    tagline: 'Nicotinamide adenine dinucleotide — lyophilized research vial',
    description: 'NAD+ — nicotinamide adenine dinucleotide supplied lyophilized for in-vitro cellular metabolism and enzyme research.',
    categories: ['longevity-research'], color: '#f59e0b', featured: true,
    currentLot: 'RC-NAD26-0413',
  }),
  'thymosin-alpha-1': vialProduct({
    id: 'thymosin-alpha-1', name: 'Thymosin Alpha-1', price: 124.5, cogs: 9.7,
    tagline: 'Thymic peptide — lyophilized research vial',
    description: 'Thymosin Alpha-1 — synthetic thymic peptide supplied lyophilized for in-vitro immune pathway research.',
    categories: ['longevity-research'], color: '#a78bfa',
    currentLot: 'RC-TA126-0414',
  }),
  epithalon: vialProduct({
    id: 'epithalon', name: 'Epithalon', price: 114.5, cogs: 5,
    tagline: 'Tetrapeptide (Ala-Glu-Asp-Gly) — lyophilized research vial',
    description: 'Epithalon — synthetic tetrapeptide supplied lyophilized for in-vitro telomere and cellular aging research models.',
    categories: ['longevity-research'], color: '#c084fc',
    currentLot: 'RC-EPI26-0415',
  }),
};

/** Storefront display order — matches profitability model groupings */
var PRODUCT_CATALOG_ORDER = [
  'semaglutide', 'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', 'mots-c',
  'gh-stack', 'sermorelin', 'bpc-157', 'tb-500', 'recovery-stack', 'igf-1-lr3',
  'ghk-cu', 'glow-blend',
  'semax-selank', 'pt-141',
  'nad-plus', 'thymosin-alpha-1', 'epithalon',
];

window.PRODUCTS = PRODUCTS;
window.GOAL_CATEGORIES = GOAL_CATEGORIES;
window.GOAL_ALIASES = GOAL_ALIASES;
window.PRODUCT_CATALOG_ORDER = PRODUCT_CATALOG_ORDER;