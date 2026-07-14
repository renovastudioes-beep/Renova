/* Extended content keyed by product id — merged in main.js modal */
const PRODUCT_DETAILS = {
  'bpc-157': {
    heroImage: 'images/products/lab-research.jpg',
    heroCaption: 'Pentadecapeptide research reagent',
    gallery: [
      { src: 'images/products/lab-research.jpg', caption: 'Analytical peptide characterization', alt: 'Laboratory researcher handling samples' },
      { src: 'images/products/microscope.jpg', caption: 'In-vitro assay preparation', alt: 'Microscope in research laboratory' },
      { src: 'images/products/scientist-lab.jpg', caption: 'Qualified research laboratory setting', alt: 'Scientist in research laboratory' },
    ],
    useCases: [
      { title: 'Analytical Characterization', description: 'Reference standard for HPLC, mass spectrometry identity confirmation, and purity verification in qualified analytical laboratories.', image: 'images/products/microscope.jpg', alt: 'Analytical laboratory equipment' },
      { title: 'Cell Culture Models', description: 'Employed in controlled in-vitro systems to study peptide stability, binding interactions, and assay reproducibility under documented protocols.', image: 'images/products/lab-research.jpg', alt: 'Cell culture research laboratory' },
      { title: 'Binding & Signaling Assays', description: 'Used as a defined reagent in receptor and pathway studies where a characterized pentadecapeptide reference is required.', image: 'images/products/scientist-lab.jpg', alt: 'Research scientist at bench' },
    ],
    deepDive: [
      { heading: 'Chemical Identity', body: 'BPC-157 is a synthetic 15-amino acid pentadecapeptide with sequence GEPPPGKPADDAGLV and molecular weight ~1,419 Da. Supplied lyophilized for laboratory research use.' },
      { heading: 'Quality Documentation', body: 'Each batch is verified by third-party HPLC and mass spectrometry. A batch-specific Certificate of Analysis ships with every order.' },
      { heading: 'Laboratory Use', body: 'Intended exclusively for in-vitro research by qualified personnel. Not for human or animal consumption, diagnosis, or treatment.' },
    ],
    studyModels: ['HPLC reference standard', 'MS identity confirmation', 'Cell culture assay', 'Binding assay'],
    citations: [
      { text: 'Sikiric P. et al. — Pentadecapeptide characterization', source: 'Peptides, 1993' },
      { text: 'Chang C.H. et al. — In-vitro peptide models', source: 'J Appl Physiol, 2011' },
    ],
    faq: [
      { q: 'What format is supplied?', a: 'Lyophilized powder in 5mg or 10mg vials. Batch-specific COA included.' },
      { q: 'Can this be paired with TB-500 in a protocol?', a: 'Both compounds are available separately or as a commonly studied pairing. Prepare and handle each reagent per your institutional SOPs.' },
      { q: 'What purity should I expect?', a: '≥99% by HPLC with mass spectrometry identity confirmation on every batch.' },
    ],
    related: ['tb-500', 'ghk-cu'],
    reconstitutionSteps: [
      'Follow your institution\'s standard operating procedures for lyophilized peptide reagents.',
      'Document batch number, preparation date, and responsible analyst per laboratory protocol.',
      'Store prepared material per validated cold-chain specifications for your facility.',
    ],
  },
  'tb-500': {
    heroImage: 'images/products/lab-research.jpg',
    heroCaption: 'Synthetic heptapeptide research reagent',
    gallery: [
      { src: 'images/products/scientist-lab.jpg', caption: 'Cell migration assay preparation', alt: 'Scientist in research laboratory' },
      { src: 'images/products/microscope.jpg', caption: 'In-vitro assay readouts', alt: 'Microscope for laboratory analysis' },
      { src: 'images/products/lab-research.jpg', caption: 'Peptide reagent handling', alt: 'Laboratory research' },
    ],
    useCases: [
      { title: 'Cell Migration Assays', description: 'Defined heptapeptide reagent for transwell and scratch assays measuring cell motility under controlled in-vitro conditions.', image: 'images/products/microscope.jpg', alt: 'Cell motility research' },
      { title: 'Actin-Binding Studies', description: 'Used in cytoskeletal research models requiring a characterized LKKTETQ peptide reference.', image: 'images/products/scientist-lab.jpg', alt: 'Cytoskeletal research' },
      { title: 'Analytical Reference', description: 'HPLC and MS-verified material suitable as a reference standard in peptide analytical workflows.', image: 'images/products/lab-research.jpg', alt: 'Analytical laboratory' },
    ],
    deepDive: [
      { heading: 'Chemical Identity', body: 'TB-500 denotes a synthetic heptapeptide with sequence LKKTETQ, supplied lyophilized at 5mg per vial for laboratory research.' },
      { heading: 'Quality Documentation', body: 'Third-party HPLC and mass spectrometry verification on every batch. COA included with shipment.' },
      { heading: 'Laboratory Use', body: 'For in-vitro research by qualified personnel only. Not for human or animal consumption.' },
    ],
    studyModels: ['Transwell migration', 'Scratch assay', 'HPLC reference', 'Actin-binding assay'],
    citations: [
      { text: 'Goldstein A.L. et al. — Thymosin peptide research', source: 'Ann NY Acad Sci, 2005' },
    ],
    faq: [
      { q: 'What is the peptide sequence?', a: 'LKKTETQ — a synthetic heptapeptide supplied lyophilized at 5mg per vial.' },
      { q: 'Is cold-chain shipping used?', a: 'Yes. Peptides ship in temperature-controlled packaging to preserve lyophilized stability.' },
    ],
    related: ['bpc-157', 'ghk-cu'],
    reconstitutionSteps: [
      'Follow your institution\'s standard operating procedures for lyophilized peptide reagents.',
      'Document batch and preparation per laboratory protocol.',
      'Store per validated cold-chain specifications.',
    ],
  },
  'semaglutide': {
    heroImage: 'images/products/metabolic-research.jpg',
    heroCaption: 'GLP-1 analog research reagent',
    gallery: [
      { src: 'images/products/metabolic-research.jpg', caption: 'Endocrine signaling research', alt: 'Metabolic research laboratory' },
      { src: 'images/products/scientist-lab.jpg', caption: 'Receptor assay preparation', alt: 'Scientist conducting research' },
      { src: 'images/products/lab-research.jpg', caption: 'Analytical peptide work', alt: 'Laboratory research' },
    ],
    useCases: [
      { title: 'GLP-1 Receptor Assays', description: 'Reference GLP-1 analog for receptor binding, cAMP accumulation, and signaling studies in qualified in-vitro systems.', image: 'images/products/metabolic-research.jpg', alt: 'Endocrine research' },
      { title: 'Metabolic Pathway Models', description: 'Characterized reagent for laboratory models studying glucose regulation and endocrine signaling pathways.', image: 'images/products/lab-research.jpg', alt: 'Metabolic pathway research' },
      { title: 'Analytical Characterization', description: 'HPLC and MS-verified material for assay standard curves and identity confirmation.', image: 'images/products/scientist-lab.jpg', alt: 'Analytical research' },
    ],
    deepDive: [
      { heading: 'Chemical Identity', body: 'Modified GLP-1 analog with structural modifications for extended stability in research models. Supplied as 2mg lyophilized powder.' },
      { heading: 'Research Reference', body: 'Widely cited in published GLP-1 pathway literature as an analytical and signaling reference compound.' },
      { heading: 'Laboratory Use', body: 'For in-vitro research only. Not for human or animal consumption, diagnosis, or treatment.' },
    ],
    studyModels: ['Receptor binding assay', 'cAMP accumulation', 'Islet cell culture', 'HPLC reference'],
    citations: [
      { text: 'Lau J. et al. — GLP-1 analog characterization', source: 'J Med Chem, 2015' },
      { text: 'Knudsen L.B. et al. — GLP-1 receptor pharmacology', source: 'Diabetes, 2000' },
    ],
    faq: [
      { q: 'Why is the vial 2mg?', a: 'The 2mg format supports flexible dilution for cell-based and receptor assays without excess material.' },
      { q: 'What purity is supplied?', a: '≥98% HPLC purity with mass spectrometry identity confirmation.' },
    ],
    related: ['ipamorelin'],
    reconstitutionSteps: [
      'Follow your institution\'s standard operating procedures for lyophilized peptide reagents.',
      'Protect prepared material from light per laboratory protocol.',
      'Store per validated cold-chain specifications.',
    ],
  },
  'ipamorelin': {
    heroImage: 'images/products/scientist-lab.jpg',
    heroCaption: 'Synthetic pentapeptide research reagent',
    gallery: [
      { src: 'images/products/scientist-lab.jpg', caption: 'Endocrine signaling research', alt: 'Endocrine research laboratory' },
      { src: 'images/products/lab-research.jpg', caption: 'Peptide assay development', alt: 'Laboratory research' },
    ],
    useCases: [
      { title: 'Receptor Binding Studies', description: 'Characterized pentapeptide reagent for GHS-R binding and signaling assays in qualified in-vitro systems.', image: 'images/products/scientist-lab.jpg', alt: 'Receptor research' },
      { title: 'Pituitary Cell Models', description: 'Reference compound for somatotroph axis studies in controlled cell culture environments.', image: 'images/products/lab-research.jpg', alt: 'Cell culture research' },
      { title: 'Analytical Characterization', description: 'HPLC and MS-verified identity for assay development and reference standard use.', image: 'images/products/microscope.jpg', alt: 'Analytical research' },
    ],
    deepDive: [
      { heading: 'Chemical Identity', body: 'Synthetic pentapeptide with sequence Aib-His-D-2-Nal-D-Phe-Lys. Available in 2mg and 5mg lyophilized vials.' },
      { heading: 'Laboratory Pairing', body: 'Frequently ordered alongside CJC-1295 as a commonly studied two-compound pairing for multi-pathway protocols.' },
      { heading: 'Laboratory Use', body: 'For in-vitro research by qualified personnel only.' },
    ],
    studyModels: ['GHS-R binding assay', 'Pituitary cell culture', 'HPLC reference', 'Signaling assay'],
    citations: [
      { text: 'Svensson J. et al. — Pentapeptide secretagogue characterization', source: 'J Clin Endocrinol Metab, 1998' },
    ],
    faq: [
      { q: 'What sizes are available?', a: '2mg and 5mg lyophilized vials with batch-specific COA.' },
      { q: 'Is there a pairing option with CJC-1295?', a: 'Yes — both are available separately or as a commonly studied pairing with individual COAs.' },
    ],
    related: ['cjc-1295', 'semaglutide'],
    reconstitutionSteps: [
      'Follow your institution\'s standard operating procedures for lyophilized peptide reagents.',
      'Document batch and preparation per laboratory protocol.',
      'Store per validated cold-chain specifications.',
    ],
  },
  'cjc-1295': {
    heroImage: 'images/products/scientist-lab.jpg',
    heroCaption: 'Modified GHRH(1-29) research reagent',
    gallery: [
      { src: 'images/products/lab-research.jpg', caption: 'GHRH receptor studies', alt: 'Receptor research laboratory' },
      { src: 'images/products/scientist-lab.jpg', caption: 'Endocrine assay development', alt: 'Endocrine research' },
    ],
    useCases: [
      { title: 'GHRH Receptor Binding', description: 'Modified GHRH(1-29) peptide for receptor pharmacology and dose-response characterization in in-vitro models.', image: 'images/products/scientist-lab.jpg', alt: 'Receptor binding research' },
      { title: 'Endocrine Signaling Assays', description: 'Reference reagent for pituitary and endocrine pathway studies under documented laboratory protocols.', image: 'images/products/lab-research.jpg', alt: 'Endocrine signaling research' },
      { title: 'Analytical Characterization', description: 'HPLC and MS-verified material for identity confirmation and assay reference use.', image: 'images/products/microscope.jpg', alt: 'Analytical laboratory' },
    ],
    deepDive: [
      { heading: 'Chemical Identity', body: 'Tetrasubstituted GHRH(1-29) peptide without DAC modification. Supplied as 2mg lyophilized powder.' },
      { heading: 'No DAC Variant', body: 'The no-DAC form supports discrete laboratory dosing studies where short-acting peptide kinetics are required.' },
      { heading: 'Laboratory Use', body: 'For in-vitro research only. Not for human or animal consumption.' },
    ],
    studyModels: ['GHRH receptor binding', 'Endocrine signaling assay', 'HPLC reference', 'Pituitary culture'],
    citations: [
      { text: 'Teichman S.L. et al. — GHRH analog characterization', source: 'J Clin Endocrinol Metab, 2006' },
    ],
    faq: [
      { q: 'Why no DAC?', a: 'The no-DAC variant provides short-acting kinetics suited to controlled in-vitro dosing studies.' },
      { q: 'How does it pair with ipamorelin?', a: 'Both are available as a commonly studied pairing with separate vials and individual COAs.' },
    ],
    related: ['ipamorelin', 'ghk-cu'],
    reconstitutionSteps: [
      'Follow your institution\'s standard operating procedures for lyophilized peptide reagents.',
      'Protect from light per laboratory protocol.',
      'Store per validated cold-chain specifications.',
    ],
  },
  'recovery-stack': {
    heroImage: 'images/products/lab-research.jpg',
    heroCaption: 'Commonly studied two-compound pairing',
    gallery: [
      { src: 'images/products/lab-research.jpg', caption: 'Multi-compound laboratory protocols', alt: 'Laboratory research' },
    ],
    useCases: [
      { title: 'Multi-Compound Protocols', description: 'Two separate lyophilized vials — BPC-157 5mg and TB-500 5mg — for laboratories running paired in-vitro assays with consistent batch documentation.', image: 'images/products/lab-research.jpg', alt: 'Multi-compound research' },
    ],
    deepDive: [{ heading: 'Pairing Contents', body: 'One BPC-157 5mg vial and one TB-500 5mg vial, each with its own batch-specific COA. Prepare and handle separately per institutional SOPs.' }],
    studyModels: ['Multi-compound assay', 'Analytical pairing'],
    citations: [],
    faq: [{ q: 'Are vials separate?', a: 'Yes — one BPC-157 5mg and one TB-500 5mg vial, each with its own COA.' }],
    related: ['bpc-157', 'tb-500'],
    reconstitutionSteps: [
      'Prepare each vial separately per your laboratory standard operating procedures.',
      'Do not combine lyophilized powders in the same vessel.',
      'Document batch numbers for each reagent.',
    ],
  },
  'gh-stack': {
    heroImage: 'images/products/scientist-lab.jpg',
    heroCaption: 'Commonly studied two-compound pairing',
    gallery: [
      { src: 'images/products/scientist-lab.jpg', caption: 'Endocrine research laboratories', alt: 'Endocrine lab' },
    ],
    useCases: [
      { title: 'Dual-Receptor Protocols', description: 'Two separate lyophilized vials — Ipamorelin 2mg and CJC-1295 2mg — for multi-pathway endocrine signaling research.', image: 'images/products/scientist-lab.jpg', alt: 'Endocrine research' },
    ],
    deepDive: [{ heading: 'Pairing Contents', body: 'One Ipamorelin 2mg vial and one CJC-1295 2mg vial, each with its own COA. Bundle pricing confirmed at checkout.' }],
    studyModels: ['Dual-receptor assay', 'Endocrine signaling'],
    citations: [],
    faq: [{ q: 'How is bundle pricing handled?', a: 'Starting-at pricing is shown on site. Final total is confirmed before fulfillment.' }],
    related: ['ipamorelin', 'cjc-1295'],
    reconstitutionSteps: [
      'Prepare each vial separately per your laboratory standard operating procedures.',
      'Store per validated cold-chain specifications.',
    ],
  },
  'ghk-cu': {
    heroImage: 'images/products/lab-research.jpg',
    heroCaption: 'Copper(II)-GHK tripeptide research reagent',
    gallery: [
      { src: 'images/products/microscope.jpg', caption: 'Collagen synthesis assays', alt: 'Collagen research' },
      { src: 'images/products/lab-research.jpg', caption: 'Matrix remodeling studies', alt: 'Matrix research laboratory' },
    ],
    useCases: [
      { title: 'Collagen & Matrix Assays', description: 'Copper(II)-GHK tripeptide complex for dermal fibroblast and extracellular matrix research in qualified in-vitro systems.', image: 'images/products/microscope.jpg', alt: 'Matrix research' },
      { title: 'Gene Expression Studies', description: 'Reference reagent for laboratories studying peptide-mediated gene expression in matrix remodeling models.', image: 'images/products/lab-research.jpg', alt: 'Gene expression research' },
      { title: 'Analytical Characterization', description: 'HPLC and MS-verified identity for assay development at 50mg and 100mg vial sizes.', image: 'images/products/scientist-lab.jpg', alt: 'Analytical research' },
    ],
    deepDive: [
      { heading: 'Chemical Identity', body: 'GHK-Cu is the copper(II) complex of the GHK tripeptide. Supplied lyophilized in 50mg and 100mg vials for laboratory research.' },
      { heading: 'Higher-Mass Format', body: 'Larger vial sizes support matrix assay volumes and repeated in-vitro protocol requirements.' },
      { heading: 'Laboratory Use', body: 'For in-vitro research only. Not for human or animal consumption or cosmetic application.' },
    ],
    studyModels: ['Fibroblast culture', 'Collagen gel assay', 'Gene expression array', 'HPLC reference'],
    citations: [
      { text: 'Pickart L. et al. — GHK-Cu matrix research', source: 'BioMed Res Int, 2015' },
    ],
    faq: [
      { q: 'Why 50mg and 100mg vials?', a: 'Higher masses support matrix assay volumes and multi-step in-vitro protocols.' },
      { q: 'Is the material light-sensitive?', a: 'Follow your institution\'s storage protocol for copper-peptide complexes.' },
    ],
    related: ['bpc-157', 'ipamorelin'],
    reconstitutionSteps: [
      'Follow your institution\'s standard operating procedures for lyophilized peptide reagents.',
      'Document batch and preparation per laboratory protocol.',
      'Store per validated cold-chain specifications.',
    ],
  },
};