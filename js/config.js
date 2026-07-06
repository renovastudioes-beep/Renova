window.RENVOA_CONFIG = {
  brand: 'ONYX Peptides',
  email: 'research@onyx.com',
  supportEmail: 'support@onyx.com',
  freeShippingThreshold: 150,
  coldChainShipping: 9.95,
  currency: 'USD',

  // Add your Stripe publishable key (pk_live_... or pk_test_...)
  // Requires a backend endpoint to create Checkout Sessions — see js/checkout.js
  stripePublishableKey: '',

  // Optional: Google Analytics 4 measurement ID (G-XXXXXXXX)
  ga4MeasurementId: '',

  // Optional: Plausible domain
  plausibleDomain: '',

  // Business portal password — change before production
  adminPassword: 'onyx2026',

  storefront: {
    checkoutMode: 'quote',
    hideLinePricing: true,
    addToBagLabel: 'Add to bag',
  },

  // Shared studio cloud — admin, POS, and client portal sync via Supabase
  cloud: {
    enabled: true,
    supabaseUrl: 'https://vsorpuebhngkntfvcjed.supabase.co',
    supabaseAnonKey: 'sb_publishable_PGEKD_RPh2oiRuWVVsEXKA_iZAjMNdL',
    workspaceId: 'onyx',
  },
};