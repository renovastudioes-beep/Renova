/* Extended content keyed by product id — merged in products.js */
const PRODUCT_DETAILS = {
  'bpc-157': {
    heroImage: 'images/products/recovery-research.jpg',
    heroCaption: 'Musculoskeletal recovery research models',
    gallery: [
      { src: 'images/products/fitness-research.jpg', caption: 'Sports medicine & tendon research protocols', alt: 'Researcher reviewing athletic recovery data' },
      { src: 'images/products/lab-research.jpg', caption: 'In-vitro tissue repair assays', alt: 'Scientist preparing laboratory samples' },
      { src: 'images/products/medical-team.jpg', caption: 'Collaborative clinical research teams', alt: 'Medical research team in discussion' },
    ],
    useCases: [
      { title: 'Tendon & Ligament Research', description: 'BPC-157 is among the most cited peptides in rodent models of Achilles tendon transection and MCL injury, where researchers measure collagen organization, tensile strength, and fibroblast outgrowth rates.', image: 'images/products/fitness-research.jpg', alt: 'Athlete working with physical therapy researcher' },
      { title: 'Angiogenesis Studies', description: 'Laboratories use BPC-157 to investigate VEGFR2-mediated capillary formation, endothelial cell migration, and vascular density in granulation tissue — key readouts in wound healing assays.', image: 'images/products/microscope.jpg', alt: 'Microscope used in angiogenesis research' },
      { title: 'GI Cytoprotection Models', description: 'Originally derived from gastric juice, BPC-157 remains a reference compound in gastrointestinal integrity research, including models of mucosal barrier disruption and NSAID-induced injury.', image: 'images/products/lab-research.jpg', alt: 'Laboratory researcher handling samples' },
    ],
    deepDive: [
      { heading: 'Origin & Discovery', body: 'BPC-157 (Body Protection Compound-157) was first synthesized in the early 1990s by Sikiric and colleagues investigating cytoprotective proteins in human gastric juice. The 15-amino acid pentadecapeptide corresponds to an active fragment of the larger BPC protein and has since become one of the most widely ordered research peptides globally.' },
      { heading: 'Structural Biology', body: 'With a molecular weight of ~1,419 Da and sequence GEPPPGKPADDAGLV, BPC-157 is a linear peptide amenable to solid-phase synthesis. Its stability in gastric environments has made it a useful tool for studying oral bioavailability of peptide compounds in preclinical models.' },
      { heading: 'Current Research Focus', body: 'Modern laboratories employ BPC-157 in fibroblast migration assays, scratch wound closure models, and tendon explant cultures. Pairing with TB-500 is common when researchers want to study complementary actin-regulation and angiogenic pathways simultaneously.' },
    ],
    studyModels: ['Rodent tendon transection', 'Scratch wound assay', 'HUVEC migration', 'Gastric ulcer models', 'Ligament healing models'],
    citations: [
      { text: 'Sikiric P. et al. — BPC 157 cytoprotective effects in gastric models', source: 'Peptides, 1993' },
      { text: 'Chang C.H. et al. — BPC 157 tendon outgrowth & cell migration', source: 'J Appl Physiol, 2011' },
      { text: 'Hsieh M.J. et al. — VEGFR2 activation and angiogenesis', source: 'J Mol Med, 2017' },
    ],
    faq: [
      { q: 'What concentrations are used in research?', a: 'Concentrations vary by model system. In-vitro assays typically use µM ranges; animal studies are model-dependent. Consult published protocols for your specific application.' },
      { q: 'Can BPC-157 be combined with TB-500 in studies?', a: 'Yes — many published protocols examine co-administration for complementary repair pathways. Both are sold separately for flexible dosing in your lab.' },
      { q: 'What purity should I expect?', a: 'ONYX Peptides supplies ≥99% purity by HPLC with MS identity confirmation. A batch-specific COA ships with every order.' },
    ],
    related: ['tb-500', 'ghk-cu'],
    reconstitutionSteps: ['Wipe vial stopper with alcohol swab.', 'Draw 1–2 mL bacteriostatic water into sterile syringe.', 'Inject slowly against vial wall — do not spray directly onto powder.', 'Gently swirl until fully dissolved (do not shake).', 'Label with date; store at 2–8°C, use within 30 days.'],
  },
  'tb-500': {
    heroImage: 'images/products/fitness-research.jpg',
    heroCaption: 'Soft tissue & mobility research',
    gallery: [
      { src: 'images/products/recovery-research.jpg', caption: 'Recovery pathway investigation', alt: 'Recovery and mobility research' },
      { src: 'images/products/scientist-lab.jpg', caption: 'Cell migration assay preparation', alt: 'Scientist in research laboratory' },
      { src: 'images/products/microscope.jpg', caption: 'Histological analysis of repair tissue', alt: 'Microscope for tissue analysis' },
    ],
    useCases: [
      { title: 'Wound Closure Models', description: 'TB-500 accelerates granulation tissue formation in full-thickness wound models. Researchers track re-epithelialization rates, wound contraction, and dermal remodeling as primary endpoints.', image: 'images/products/medical-team.jpg', alt: 'Clinical research team' },
      { title: 'Actin & Cell Motility', description: 'As an actin-binding peptide fragment, TB-500 is essential for studying cytoskeletal dynamics, cell migration speed, and focal adhesion kinase (FAK) phosphorylation in injury-site cell populations.', image: 'images/products/microscope.jpg', alt: 'Cell motility research under microscope' },
      { title: 'Cardiovascular Repair Research', description: 'Investigated for angiogenesis in ischemic tissue models and cardiac repair following injury. TB-500\'s pro-migratory effects on endothelial cells are a key research focus.', image: 'images/products/lab-research.jpg', alt: 'Cardiovascular research laboratory' },
    ],
    deepDive: [
      { heading: 'Thymosin Beta-4 Heritage', body: 'TB-500 is a synthetic version of the active region of thymosin beta-4 (Tβ4), a 43-amino acid protein first isolated by Allan Goldstein in the 1960s. The LKKTETQ fragment retains the core actin-binding motif responsible for its biological activity.' },
      { heading: 'Why Researchers Choose TB-500', body: 'The shorter fragment offers improved synthetic accessibility and stability compared to full-length Tβ4, while preserving the pro-migratory and pro-angiogenic properties that make thymosin beta-4 a cornerstone of tissue repair research.' },
      { heading: 'Experimental Endpoints', body: 'Common readouts include wound closure percentage, collagen deposition (Masson\'s trichrome), capillary density (CD31 staining), and fibroblast migration distance in transwell assays. TB-500 is typically compared against vehicle controls and, in some protocols, combined with BPC-157.' },
    ],
    studyModels: ['Full-thickness wound model', 'Transwell migration', 'Cardiac ischemia models', 'Corneal wound assay', 'Tendon fibroblast culture'],
    citations: [
      { text: 'Goldstein A.L. et al. — Discovery of thymosins', source: 'Ann NY Acad Sci, 2005' },
      { text: 'Smart N. et al. — Thymosin β4 progenitor mobilization', source: 'Nature, 2007' },
      { text: 'Malinda K.M. et al. — Thymosin β4 accelerates wound repair', source: 'Ann NY Acad Sci, 1999' },
    ],
    faq: [
      { q: 'How does TB-500 differ from full thymosin beta-4?', a: 'TB-500 is the active LKKTETQ fragment — more stable, easier to synthesize, and the most commonly used form in modern research literature.' },
      { q: 'What is the typical vial size for protocols?', a: 'Our 5mg lyophilized vial is the standard research unit. Higher-volume labs often order multiple vials per batch for consistent lot use across a study.' },
      { q: 'Is cold-chain shipping required?', a: 'Yes. All ONYX Peptides peptides ship in temperature-controlled packaging to preserve lyophilized stability.' },
    ],
    related: ['bpc-157', 'ghk-cu'],
    reconstitutionSteps: ['Allow vial to reach room temperature (5 min).', 'Add 1–2 mL bacteriostatic water along the vial wall.', 'Wait 2 minutes for passive dissolution.', 'Gently swirl — never shake lyophilized peptides.', 'Store reconstituted solution at 2–8°C; use within 14–30 days.'],
  },
  'semaglutide': {
    heroImage: 'images/products/metabolic-research.jpg',
    heroCaption: 'GLP-1 pathway & metabolic research',
    gallery: [
      { src: 'images/products/wellness-research.jpg', caption: 'Metabolic health research programs', alt: 'Wellness and metabolic research' },
      { src: 'images/products/scientist-lab.jpg', caption: 'Endocrine signaling assays', alt: 'Scientist conducting endocrine research' },
      { src: 'images/products/lab-research.jpg', caption: 'Glucose homeostasis models', alt: 'Laboratory metabolic research' },
    ],
    useCases: [
      { title: 'GLP-1 Receptor Signaling', description: 'Semaglutide is the benchmark GLP-1 RA in receptor binding assays, cAMP accumulation studies, and insulin secretion experiments using isolated pancreatic islet cultures.', image: 'images/products/metabolic-research.jpg', alt: 'Metabolic and endocrine research' },
      { title: 'Body Composition Models', description: 'Preclinical models use semaglutide to study energy intake, body weight trajectory, and adipose tissue distribution — key endpoints in metabolic disease research programs.', image: 'images/products/wellness-research.jpg', alt: 'Body composition research context' },
      { title: 'Appetite & Satiety Research', description: 'Researchers investigate central and peripheral mechanisms of appetite suppression, gastric emptying rate, and gut-brain axis signaling using semaglutide as a reference agonist.', image: 'images/products/medical-team.jpg', alt: 'Clinical metabolic research team' },
    ],
    deepDive: [
      { heading: 'Structural Engineering', body: 'Semaglutide incorporates three key modifications vs. native GLP-1: amino acid substitutions at positions 8 and 34 for DPP-4 resistance, and a C18 fatty diacid chain at position 26 enabling albumin binding. These modifications extend half-life from minutes to days in research models.' },
      { heading: 'Research Significance', body: 'With over 3,000 published references, semaglutide is the most characterized GLP-1 analog available for laboratory research. It serves as the positive control in virtually all GLP-1 receptor pharmacology studies.' },
      { heading: 'Assay Applications', body: 'Used in ELISA standard curves, receptor autoradiography, glucose tolerance test protocols, and hepatic glucose output measurements. The 2mg lyophilized format is suited for serial dilution in cell-based assays.' },
    ],
    studyModels: ['Islet cell culture', 'Ob/ob mouse model', 'GLP-1R binding assay', 'GTT / ITT protocols', 'Food intake monitoring'],
    citations: [
      { text: 'Lau J. et al. — Discovery of semaglutide', source: 'J Med Chem, 2015' },
      { text: 'Knudsen L.B. et al. — GLP-1 receptor pharmacology', source: 'Diabetes, 2000' },
      { text: 'Marso S.P. et al. — Cardiovascular outcomes trial design', source: 'NEJM, 2016' },
    ],
    faq: [
      { q: 'Why is semaglutide supplied as 2mg?', a: 'The 2mg vial format is optimized for research assay preparation — allowing flexible dilution series without excess waste in cell culture applications.' },
      { q: 'What purity is required for receptor studies?', a: 'We supply ≥98% HPLC purity with MS confirmation. This meets the standard for pharmacological receptor binding and cell signaling research.' },
      { q: 'How should reconstituted semaglutide be stored?', a: 'Protect from light. Store at 2–8°C and use within 30 days. Aliquot if repeated access is needed to minimize degradation.' },
    ],
    related: ['ipamorelin'],
    reconstitutionSteps: ['Use sterile bacteriostatic water only.', 'Add 1 mL BAC to 2mg vial (yields 2 mg/mL).', 'Direct stream against glass wall, not onto lyophilized cake.', 'Allow 3–5 minutes for complete dissolution.', 'Aliquot into sterile microtubes if needed; store at 2–8°C protected from light.'],
  },
  'ipamorelin': {
    heroImage: 'images/products/wellness-research.jpg',
    heroCaption: 'GH secretagogue & endocrine research',
    gallery: [
      { src: 'images/products/fitness-research.jpg', caption: 'Body composition research models', alt: 'Fitness and body composition research' },
      { src: 'images/products/scientist-lab.jpg', caption: 'Pituitary cell culture studies', alt: 'Scientist in endocrine research lab' },
      { src: 'images/products/lab-research.jpg', caption: 'GH axis signaling assays', alt: 'GH axis laboratory research' },
    ],
    useCases: [
      { title: 'Selective GH Release', description: 'Ipamorelin\'s selectivity for GH release — without elevating cortisol, prolactin, or ACTH — makes it the preferred secretagogue for clean somatotroph axis studies in pituitary cell cultures.', image: 'images/products/scientist-lab.jpg', alt: 'Endocrine research scientist' },
      { title: 'Bone Metabolism Research', description: 'Studied for effects on osteoblast activity, bone mineral density, and fracture healing timelines in rodent models. Often measured alongside IGF-1 as a downstream marker.', image: 'images/products/medical-team.jpg', alt: 'Bone metabolism research team' },
      { title: 'Body Composition Studies', description: 'Researchers track lean mass, fat mass, and nitrogen retention in animal models to understand GH-mediated anabolic pathways without confounding hormonal elevations.', image: 'images/products/fitness-research.jpg', alt: 'Body composition research' },
    ],
    deepDive: [
      { heading: 'Selectivity Advantage', body: 'Developed in the 1990s by Novo Nordisk researchers, ipamorelin was designed to address off-target hormonal elevations seen with GHRP-6 and GHRP-2. Its Aib-His-D-2-Nal-D-Phe-Lys sequence confers high GHS-R1a selectivity.' },
      { heading: 'Pulsatile GH Research', body: 'The no-DAC, short-acting profile of ipamorelin mirrors natural GH pulsatility when dosed in research models — unlike long-acting analogs that produce supraphysiological baseline elevations.' },
      { heading: 'Combination Protocols', body: 'Ipamorelin + CJC-1295 (no DAC) is the standard dual-pathway GH research combination: GHRH receptor activation plus ghrelin receptor stimulation, studied for synergistic GH pulse amplitude.' },
    ],
    studyModels: ['Pituitary somatotroph culture', 'GH pulsatility profiling', 'Osteoblast differentiation', 'Lean mass tracking', 'GHS-R binding assay'],
    citations: [
      { text: 'Svensson J. et al. — Ipamorelin GH selectivity', source: 'J Clin Endocrinol Metab, 1998' },
      { text: 'Bowers C.Y. et al. — GH secretagogue development', source: 'Front Neuroendocrinol, 1997' },
      { text: 'Gobburu J.V. et al. — Pharmacokinetics of ipamorelin', source: 'J Pharm Sci, 1999' },
    ],
    faq: [
      { q: 'Ipamorelin vs. GHRP-6 — which for my lab?', a: 'Ipamorelin if you need selective GH release without cortisol/prolactin elevation. GHRP-6 if you specifically need to study those secondary pathways.' },
      { q: 'What sizes are available?', a: '2mg and 5mg lyophilized vials. The 2mg format suits cell culture; 5mg is preferred for in-vivo protocol work.' },
      { q: 'Can I pair it with CJC-1295?', a: 'Yes — this is one of the most common GH axis research combinations. Both are available from ONYX Peptides.' },
    ],
    related: ['cjc-1295', 'semaglutide'],
    reconstitutionSteps: ['Bring vial to room temperature.', 'Reconstitute with 1–2 mL bacteriostatic water.', 'Roll gently between palms — avoid shaking.', 'Solution should be clear; discard if cloudy.', 'Refrigerate at 2–8°C; stable 30 days reconstituted.'],
  },
  'cjc-1295': {
    heroImage: 'images/products/scientist-lab.jpg',
    heroCaption: 'GHRH analog & pituitary research',
    gallery: [
      { src: 'images/products/wellness-research.jpg', caption: 'Longevity & endocrine research', alt: 'Longevity research context' },
      { src: 'images/products/lab-research.jpg', caption: 'GHRH receptor binding studies', alt: 'GHRH receptor laboratory research' },
      { src: 'images/products/fitness-research.jpg', caption: 'IGF-1 pathway investigation', alt: 'IGF-1 and fitness research' },
    ],
    useCases: [
      { title: 'GHRH Receptor Studies', description: 'CJC-1295 (no DAC) binds pituitary GHRH receptors to stimulate GH release in a controlled, pulsatile manner — ideal for receptor pharmacology and dose-response characterization.', image: 'images/products/scientist-lab.jpg', alt: 'Pituitary research scientist' },
      { title: 'IGF-1 Downstream Signaling', description: 'Researchers measure circulating IGF-1, hepatic IGF-1 mRNA, and tissue IGF-1R activation as downstream markers of GHRH pathway stimulation in animal models.', image: 'images/products/microscope.jpg', alt: 'IGF-1 signaling research' },
      { title: 'Anti-Aging Research Models', description: 'Declining GH/IGF-1 axis activity is a hallmark of aging research. CJC-1295 enables controlled restoration of GH pulsatility to study somatotropic axis effects on cellular senescence markers.', image: 'images/products/wellness-research.jpg', alt: 'Anti-aging research context' },
    ],
    deepDive: [
      { heading: 'No DAC vs. With DAC', body: 'The no-DAC variant has a shorter half-life (~30 minutes in research models) allowing discrete GH pulses. The DAC version binds serum albumin for multi-day activity — useful for different experimental designs. ONYX Peptides supplies the no-DAC form preferred for pulsatility research.' },
      { heading: 'Tetrasubstitution Chemistry', body: 'Four amino acid substitutions (Ala, Gln, Ala, Arg) at positions 2, 8, 15, and 27 increase GHRH receptor binding affinity ~10× vs. native GHRH(1-29) while resisting enzymatic degradation.' },
      { heading: 'Laboratory Pairing', body: 'Nearly all modern GH axis research protocols that use CJC-1295 pair it with a ghrelin mimetic (typically ipamorelin) to simultaneously activate both GHRH and GHS pathways — mimicking the dual-input model of natural GH regulation.' },
    ],
    studyModels: ['GHRH receptor binding', 'GH pulse amplitude', 'IGF-1 serum tracking', 'Pituitary perfusion', 'Aging rodent models'],
    citations: [
      { text: 'Teichman S.L. et al. — CJC-1295 pharmacodynamics', source: 'J Clin Endocrinol Metab, 2006' },
      { text: 'Ionescu M. et al. — GHRH analog development', source: 'J Clin Endocrinol Metab, 2006' },
      { text: 'Alba M. et al. — GH pulsatility with GHRH analogs', source: 'J Clin Endocrinol Metab, 2006' },
    ],
    faq: [
      { q: 'Why no DAC?', a: 'The no-DAC form gives researchers precise control over GH pulse timing. DAC extends half-life to days, which confounds pulsatility studies.' },
      { q: 'How does it pair with ipamorelin?', a: 'Standard GH research protocol: CJC-1295 activates GHRH receptors; ipamorelin activates ghrelin receptors. Together they model the dual-pathway regulation of natural GH release.' },
      { q: 'What is the reconstitution volume?', a: '1–2 mL bacteriostatic water per 2mg vial. Higher volumes lower concentration for fine-tuned dosing in small animal models.' },
    ],
    related: ['ipamorelin', 'ghk-cu'],
    reconstitutionSteps: ['Allow vial to sit at room temperature 5 minutes.', 'Inject 1–2 mL BAC slowly along vial wall.', 'Wait 5 minutes — do not agitate.', 'Swirl gently until solution is uniform.', 'Store at 2–8°C; protect from light; use within 30 days.'],
  },
  'recovery-stack': {
    heroImage: 'images/products/recovery-research.jpg',
    heroCaption: 'Dual-pathway recovery research',
    gallery: [
      { src: 'images/products/fitness-research.jpg', caption: 'Musculoskeletal recovery research', alt: 'Recovery research' },
      { src: 'images/products/lab-research.jpg', caption: 'Combined protocol laboratories', alt: 'Lab research' },
    ],
    useCases: [
      { title: 'Complementary Pathways', description: 'BPC-157 (VEGFR2/NO) + TB-500 (actin migration) target different repair mechanisms — ideal for multi-endpoint recovery studies.', image: 'images/products/fitness-research.jpg', alt: 'Recovery research' },
    ],
    deepDive: [{ heading: 'Why Stack?', body: 'The Recovery Stack pairs both compounds in one request with same-batch COAs for protocol consistency. Final bundle pricing is confirmed by our team.' }],
    studyModels: ['Tendon repair', 'Wound healing', 'Combined injury models'],
    citations: [], faq: [{ q: 'Are vials separate?', a: 'Yes — one BPC-157 5mg and one TB-500 5mg vial, each with its own COA.' }],
    related: ['bpc-157', 'tb-500'],
    reconstitutionSteps: ['Reconstitute each vial separately per compound protocol.', 'Do not mix lyophilized powders in the same vial.', 'Label and date each reconstituted solution.'],
  },
  'gh-stack': {
    heroImage: 'images/products/wellness-research.jpg',
    heroCaption: 'GH axis dual-pathway research',
    gallery: [
      { src: 'images/products/scientist-lab.jpg', caption: 'Endocrine research laboratories', alt: 'Endocrine lab' },
    ],
    useCases: [
      { title: 'Dual GH Pathway', description: 'CJC-1295 (GHRH) + Ipamorelin (ghrelin) models the natural dual-input regulation of growth hormone release.', image: 'images/products/scientist-lab.jpg', alt: 'GH research' },
    ],
    deepDive: [{ heading: 'Standard Pairing', body: 'This combination is the most cited GH axis research protocol in endocrine literature.' }],
    studyModels: ['GH pulsatility', 'IGF-1 tracking', 'Pituitary culture'],
    citations: [], faq: [{ q: 'How is bundle pricing handled?', a: 'The public site shows starting-at pricing only. Submit your request and our team will confirm your bundle total before fulfillment.' }],
    related: ['ipamorelin', 'cjc-1295'],
    reconstitutionSteps: ['Reconstitute each vial separately.', 'Store at 2–8°C after reconstitution.'],
  },
  'ghk-cu': {
    heroImage: 'images/products/skin-research.jpg',
    heroCaption: 'Dermal & matrix remodeling research',
    gallery: [
      { src: 'images/products/skin-research.jpg', caption: 'Cosmetic science & dermatology labs', alt: 'Skin and cosmetic research' },
      { src: 'images/products/wellness-research.jpg', caption: 'Anti-aging biomarker studies', alt: 'Anti-aging wellness research' },
      { src: 'images/products/microscope.jpg', caption: 'Collagen synthesis assays', alt: 'Collagen research under microscope' },
    ],
    useCases: [
      { title: 'Collagen & Matrix Research', description: 'GHK-Cu upregulates collagen I, III, and elastin in dermal fibroblast cultures. Researchers quantify synthesis rates, cross-linking density, and matrix metalloproteinase activity as primary endpoints.', image: 'images/products/skin-research.jpg', alt: 'Dermatology and skin research' },
      { title: 'Hair Follicle Studies', description: 'Investigated for effects on follicle size, anagen phase duration, and dermal papilla cell proliferation in alopecia research models. Copper-dependent gene activation is the proposed mechanism.', image: 'images/products/scientist-lab.jpg', alt: 'Hair follicle research scientist' },
      { title: 'Wound Remodeling', description: 'GHK-Cu accelerates re-epithelialization and reduces scar tissue formation in excisional wound models. Gene expression profiling reveals modulation of 4,000+ human genes related to tissue remodeling.', image: 'images/products/lab-research.jpg', alt: 'Wound remodeling laboratory research' },
    ],
    deepDive: [
      { heading: 'Discovery by Pickart', body: 'Loren Pickart isolated GHK from human plasma in 1973 and subsequently discovered that copper complexation (GHK-Cu) dramatically enhanced its biological activity. Plasma GHK levels decline with age — a finding that catalyzed decades of anti-aging research.' },
      { heading: 'Gene Expression Modulation', body: 'Microarray studies show GHK-Cu resets expression of genes involved in inflammation, oxidative stress, and matrix remodeling. It upregulates antioxidant genes while suppressing pro-inflammatory cytokine expression in dermal models.' },
      { heading: 'High-Dose Research Format', body: 'ONYX Peptides supplies 50mg and 100mg vials — significantly higher than standard peptide doses — because GHK-Cu research often requires topical formulation preparation, larger assay volumes, or repeated dosing in animal models.' },
    ],
    studyModels: ['Dermal fibroblast culture', 'Excisional wound model', 'Hair follicle organ culture', 'Collagen gel contraction', 'Gene expression microarray'],
    citations: [
      { text: 'Pickart L. et al. — GHK-Cu and tissue remodeling', source: 'BioMed Res Int, 2015' },
      { text: 'Pickart L., Margolina A. — GHK peptide actions on skin', source: 'Int J Mol Sci, 2018' },
      { text: 'Canapp S.O. et al. — Copper peptide wound healing', source: 'Vet Surg, 2003' },
    ],
    faq: [
      { q: 'Why are the vials 50mg and 100mg?', a: 'GHK-Cu research typically requires higher quantities than standard peptides — for topical formulation studies, larger cell culture volumes, or multi-dose animal protocols.' },
      { q: 'Is GHK-Cu light-sensitive?', a: 'The copper complex is relatively stable, but reconstituted solutions should be protected from light and stored at 2–8°C.' },
      { q: 'Can it be used in topical research formulations?', a: 'Yes — many in-vitro and ex-vivo dermal studies incorporate GHK-Cu into topical vehicles. Our high-dose vials are sized for this application.' },
    ],
    related: ['bpc-157', 'ipamorelin'],
    reconstitutionSteps: ['GHK-Cu dissolves more readily at room temperature.', 'Use 2–3 mL BAC for 50mg vials; 3–5 mL for 100mg.', 'Add water in 2–3 aliquots, swirling between each.', 'Solution may have a faint blue-green tint (copper complex).', 'Store at 2–8°C; use within 21 days; avoid reducing agents.'],
  },
};