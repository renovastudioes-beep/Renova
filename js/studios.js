(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const INQUIRIES_KEY = 'renova-studio-inquiries';
  const VALID_LINES = ['clinic', 'barber', 'salon', 'portal'];
  const BOOKING_LINES = ['clinic', 'barber', 'salon'];
  const LINE_INDEX = { clinic: 0, barber: 1, salon: 2, portal: 3 };

  const NAV_LINE_CONFIG = {
    clinic: {
      cta: { href: '#book', text: 'Book consultation' },
      services: 'Services',
      process: 'Experience',
      book: 'Book',
    },
    barber: {
      cta: { href: '?line=barber#book', text: 'Book barber visit' },
      services: 'Barber menu',
      process: 'How it works',
      book: 'Book barber',
    },
    salon: {
      cta: { href: '?line=salon#book', text: 'Book salon visit' },
      services: 'Salon menu',
      process: 'How it works',
      book: 'Book salon',
    },
    portal: {
      cta: { href: '#portal', text: 'Sign in' },
      services: 'Services',
      process: 'Experience',
      book: 'Book',
    },
  };

  let activeLine = 'clinic';

  function parseLineFromUrl() {
    const params = new URLSearchParams(window.location.search);
    let line = params.get('line');
    let explicit = VALID_LINES.includes(line);
    if (!line && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1] || '';
      const hashParams = new URLSearchParams(hashQuery);
      line = hashParams.get('line');
      explicit = VALID_LINES.includes(line);
    }
    const hashBase = window.location.hash.split('?')[0];
    if (!line && hashBase === '#portal') {
      line = 'portal';
      explicit = true;
    }
    const gender = params.get('gender') || params.get('book');
    if (!line && (gender === 'men' || gender === 'women')) {
      line = 'clinic';
      explicit = true;
    }
    return {
      line: VALID_LINES.includes(line) ? line : 'clinic',
      explicit,
    };
  }

  function updateUrlLine(line) {
    const url = new URL(window.location.href);
    if (line === 'clinic') url.searchParams.delete('line');
    else url.searchParams.set('line', line);
    const hashBase = url.hash.split('?')[0];
    if (line === 'portal') url.hash = '#portal';
    else url.hash = hashBase === '#portal' ? '' : hashBase;
    window.history.replaceState({ studioLine: line }, '', url);
  }

  function updateLineSwitcherUI(line) {
    const switchEl = $('#studioLineSwitch');
    if (!switchEl) return;
    switchEl.dataset.line = line;
    switchEl.style.setProperty('--studio-line-count', '4');
    const bubble = switchEl.querySelector('.studio-line-switch-bubble');
    if (bubble) bubble.style.setProperty('--line-index', String(LINE_INDEX[line] ?? 0));
    $$('.studio-line-switch-btn', switchEl).forEach((btn) => {
      const isActive = btn.dataset.studioLine === line;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function refreshReveals(root = document) {
    const vh = window.innerHeight;
    const margin = 40;
    $$('.reveal', root).forEach((el) => {
      if (el.hidden || el.closest('[hidden]')) {
        el.classList.remove('visible');
        return;
      }
      const rect = el.getBoundingClientRect();
      const inView = rect.top < vh - margin && rect.bottom > margin;
      el.classList.toggle('visible', inView);
    });
  }

  function updateLineCopy(line) {
    const bookLine = BOOKING_LINES.includes(line) ? line : 'clinic';
    const copyLine = BOOKING_LINES.includes(line) ? line : 'clinic';
    $$('.studio-book-headline, .studio-book-lead, .studio-inquire-lead').forEach((el) => {
      const match = el.classList.contains(`studio-book-headline--${bookLine}`)
        || el.classList.contains(`studio-book-lead--${bookLine}`)
        || el.classList.contains(`studio-inquire-lead--${copyLine}`);
      el.hidden = !match;
    });
  }

  function lineScopeAllowed(el, line) {
    const scope = el.dataset.navLine || el.dataset.footerLine || '';
    return scope.split(/\s+/).filter(Boolean).includes(line);
  }

  function updateNavForLine(line) {
    const cfg = NAV_LINE_CONFIG[line] || NAV_LINE_CONFIG.clinic;
    $$('#navLinks > li[data-nav-line]').forEach((li) => {
      li.hidden = !lineScopeAllowed(li, line);
    });
    const servicesLink = $('#navServicesLink');
    if (servicesLink) servicesLink.textContent = cfg.services;
    const processLink = $('#navProcessLink');
    if (processLink) processLink.textContent = cfg.process;
    const bookLink = $('#navBookLink');
    if (bookLink) bookLink.textContent = cfg.book;
    const cta = $('#navCtaBtn');
    if (cta) {
      cta.href = cfg.cta.href;
      cta.textContent = cfg.cta.text;
    }
    document.body.dataset.studioNavLine = line;

    $$('.footer-col ul > li[data-footer-line]').forEach((li) => {
      li.hidden = !lineScopeAllowed(li, line);
    });
  }

  function updateLineTheme(line) {
    document.body.dataset.studioLine = line;
    const wrap = $('#studioLineSwitchWrap');
    if (wrap) wrap.dataset.studioLine = line;
  }

  function updateLineContent(line) {
    $$('[data-line-content]').forEach((el) => {
      const scope = el.dataset.lineContent;
      if (line === 'portal') {
        el.hidden = scope !== 'portal';
        return;
      }
      el.hidden = scope !== line && scope !== 'book';
    });

    updateLineCopy(line);
    updateLineTheme(line);
    updateNavForLine(line);

    const servicesSection = $('#services');
    if (servicesSection) servicesSection.hidden = line === 'portal';

    const journey = $('.studio-journey');
    if (journey) journey.hidden = line === 'portal';

    const interest = $('#studioInquireInterest');
    if (interest && !interest.dataset.userTouched && line !== 'portal') {
      const map = { clinic: 'general', barber: 'barber', salon: 'salon' };
      const val = map[line];
      const input = val ? document.querySelector(`input[name="studioInterest"][value="${val}"]`) : null;
      if (input) input.checked = true;
    }

    const inquireSection = $('#inquire');
    if (inquireSection) inquireSection.hidden = line === 'portal';

    requestAnimationFrame(() => refreshReveals());
  }

  function scrollToLineSection(line) {
    const heroIds = {
      clinic: 'studioHeroClinic',
      barber: 'studioHeroBarber',
      salon: 'studioHeroSalon',
      portal: 'studioHeroPortal',
    };
    const hero = $(`#${heroIds[line]}`);
    if (hero && !hero.hidden) {
      hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (line === 'portal') {
      $('#portal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }

  function setStudioLine(line, opts = {}) {
    if (!VALID_LINES.includes(line)) line = 'clinic';
    const changed = activeLine !== line;
    activeLine = line;
    window.studioActiveLine = BOOKING_LINES.includes(line) ? line : null;
    updateLineSwitcherUI(line);
    updateLineContent(line);
    if (opts.updateUrl !== false) updateUrlLine(line);
    if (BOOKING_LINES.includes(line) && !opts.skipBooking && window.studioBookingApplyLine) {
      window.studioBookingApplyLine(line);
    }
    if (!opts.skipScroll && (opts.scroll || changed) && VALID_LINES.includes(line)) {
      scrollToLineSection(line);
    }
    if (!opts.silent && changed) {
      window.dispatchEvent(new CustomEvent('studio-line-change', { detail: { line } }));
    }
  }

  window.setStudioLine = setStudioLine;

  function bind() {
    $('#studioInquireForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        id: 'SI-' + Date.now().toString(36).toUpperCase(),
        name: $('#studioName').value.trim(),
        email: $('#studioEmail').value.trim(),
        phone: $('#studioPhone').value.trim(),
        interest: document.querySelector('input[name="studioInterest"]:checked')?.value || 'general',
        line: activeLine,
        message: $('#studioMessage').value.trim(),
        status: 'new',
        at: new Date().toISOString(),
      };
      const list = JSON.parse(localStorage.getItem(INQUIRIES_KEY) || '[]');
      list.unshift(data);
      localStorage.setItem(INQUIRIES_KEY, JSON.stringify(list));
      $('#studioInquireForm').hidden = true;
      $('#studioInquireSuccess').hidden = false;
    });

    $$('input[name="studioInterest"]').forEach((input) => {
      input.addEventListener('change', () => {
        const wrap = $('#studioInquireInterest');
        if (wrap) wrap.dataset.userTouched = '1';
      });
    });

    $('#studioLineSwitch')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-studio-line]');
      if (!btn) return;
      setStudioLine(btn.dataset.studioLine, { scroll: true });
    });

    window.addEventListener('popstate', () => {
      const { line } = parseLineFromUrl();
      setStudioLine(line, { updateUrl: false, silent: true });
    });

    window.addEventListener('hashchange', () => {
      const { line } = parseLineFromUrl();
      if (line !== activeLine) setStudioLine(line, { updateUrl: false, scroll: line === 'portal' });
    });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="line="], a[href="#portal"]');
      if (!a) return;
      try {
        const target = new URL(a.href, window.location.href);
        if (target.hash === '#portal' || target.pathname.endsWith('#portal')) {
          setStudioLine('portal', { updateUrl: false, scroll: true });
          return;
        }
        const line = target.searchParams.get('line');
        if (BOOKING_LINES.includes(line)) setStudioLine(line, { updateUrl: false });
      } catch (_) { /* ignore malformed href */ }
    });

    const nav = $('#globalNav');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    $('#navHamburger')?.addEventListener('click', () => $('#navLinks')?.classList.toggle('mobile-open'));
  }

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.target.hidden || e.target.closest('[hidden]')) return;
      e.target.classList.toggle('visible', e.isIntersecting);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealObs.observe(el));

  bind();
  const initial = parseLineFromUrl();
  setStudioLine(initial.line, { updateUrl: false, skipBooking: true, silent: true, scroll: initial.line === 'portal' });
  requestAnimationFrame(() => refreshReveals());
  if (initial.explicit && BOOKING_LINES.includes(initial.line) && window.studioBookingApplyLine) {
    window.studioBookingApplyLine(initial.line);
  }
})();