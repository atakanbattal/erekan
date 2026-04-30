// ============================================
// ArmaWeld — Shared Chrome (Nav + Footer)
// ============================================

function buildNav(activePage) {
  const links = [
    { id: 'index',     i18n: 'nav_home',     href: 'index.html' },
    { id: 'hakkimizda',i18n: 'nav_about',    href: 'hakkimizda.html' },
    { id: 'hizmetler', i18n: 'nav_services', href: 'hizmetler.html' },
    { id: 'kalite',    i18n: 'nav_quality',  href: 'kalite.html' },
    { id: 'kaynak',    i18n: 'nav_welding',  href: 'kaynak-yontemleri.html' },
    { id: 'ndt',       i18n: 'nav_ndt',      href: 'ndt.html' },
    { id: 'sektorler', i18n: 'nav_sectors',  href: 'sektorler.html' },
    { id: 'projeler',  i18n: 'nav_projects', href: 'projeler.html' },
    { id: 'sss',       i18n: 'nav_faq',      href: 'sss.html' },
  ];

  const t = (key) => (window.i18n ? window.i18n.get(key) : key);

  const linkHtml = links.map(l =>
    `<a class="nav-link ${l.id === activePage ? 'active' : ''}" href="${l.href}" data-i18n="${l.i18n}">${t(l.i18n)}</a>`
  ).join('');

  const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('armaweld-theme') || 'light';
  const logoSrc = currentTheme === 'dark' ? 'assets/logo-dark.png' : 'assets/logo-light.png';

  return `
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="logo" data-i18n-aria="nav_aria_home" aria-label="${t('nav_aria_home')}">
        <img id="nav-logo" src="${logoSrc}" alt="ArmaWeld" class="logo-img" />
      </a>
      <div class="nav-links">
        ${linkHtml}
      </div>
      <div class="nav-right">
        <button class="theme-toggle" data-i18n-aria="nav_aria_theme" aria-label="${t('nav_aria_theme')}" onclick="toggleTheme()" title="Açık / Koyu mod">
          <svg class="tt-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2" x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/>
            <line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/>
            <line x1="2" y1="12" x2="5" y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
            <line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/>
            <line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/>
          </svg>
          <svg class="tt-moon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 14.5A8 8 0 0 1 9.5 6.5 0.5 0.5 0 0 1 10 6a8 8 0 1 0 8 8 0.5 0.5 0 0 1-0.5 0.5z"/>
          </svg>
        </button>

        <div class="lang-switcher" id="langSwitcher">
          <button class="lang-btn" id="lang-current" onclick="toggleLangMenu()" data-i18n-aria="nav_aria_lang" aria-label="${t('nav_aria_lang')}">${(window.i18n ? window.i18n.getLang() : (localStorage.getItem('armaweld-lang') || 'tr')).toUpperCase()}</button>
          <div class="lang-dropdown" id="langDropdown">
            <button class="lang-option" data-lang="tr" onclick="selectLang('tr')">🇹🇷 Türkçe</button>
            <button class="lang-option" data-lang="en" onclick="selectLang('en')">🇬🇧 English</button>
            <button class="lang-option" data-lang="de" onclick="selectLang('de')">🇩🇪 Deutsch</button>
            <button class="lang-option" data-lang="es" onclick="selectLang('es')">🇪🇸 Español</button>
            <button class="lang-option" data-lang="fr" onclick="selectLang('fr')">🇫🇷 Français</button>
          </div>
        </div>

        <a href="iletisim.html" class="nav-cta" data-i18n="nav_cta">${t('nav_cta')}</a>
        <button class="nav-burger" data-i18n-aria="nav_aria_menu" aria-label="${t('nav_aria_menu')}" onclick="document.querySelector('.nav').classList.toggle('open')">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>
  `;
}

function buildFooter() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('armaweld-theme') || 'light';
  const logoSrc = currentTheme === 'dark' ? 'assets/logo-dark.png' : 'assets/logo-light.png';
  const t = (key) => (window.i18n ? window.i18n.get(key) : key);

  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="index.html" class="logo" style="margin-bottom:24px;">
            <img id="footer-logo" src="${logoSrc}" alt="ArmaWeld" class="logo-img" />
          </a>
          <p class="footer-tag" data-i18n="footer_tag">${t('footer_tag')}</p>
          <p class="footer-contact" data-i18n="footer_desc">${t('footer_desc')}</p>
        </div>
        <div>
          <h5 data-i18n="footer_services_h">${t('footer_services_h')}</h5>
          <ul>
            <li><a href="hizmetler.html" data-i18n="footer_s1">${t('footer_s1')}</a></li>
            <li><a href="hizmetler.html" data-i18n="footer_s2">${t('footer_s2')}</a></li>
            <li><a href="hizmetler.html" data-i18n="footer_s3">${t('footer_s3')}</a></li>
            <li><a href="hizmetler.html" data-i18n="footer_s4">${t('footer_s4')}</a></li>
            <li><a href="kaynak-yontemleri.html" data-i18n="footer_s5">${t('footer_s5')}</a></li>
            <li><a href="ndt.html" data-i18n="footer_s6">${t('footer_s6')}</a></li>
          </ul>
        </div>
        <div>
          <h5 data-i18n="footer_corporate_h">${t('footer_corporate_h')}</h5>
          <ul>
            <li><a href="hakkimizda.html" data-i18n="footer_c1">${t('footer_c1')}</a></li>
            <li><a href="kalite.html" data-i18n="footer_c2">${t('footer_c2')}</a></li>
            <li><a href="sektorler.html" data-i18n="footer_c3">${t('footer_c3')}</a></li>
            <li><a href="projeler.html" data-i18n="footer_c4">${t('footer_c4')}</a></li>
            <li><a href="sss.html" data-i18n="footer_c5">${t('footer_c5')}</a></li>
            <li><a href="iletisim.html" data-i18n="footer_c6">${t('footer_c6')}</a></li>
          </ul>
        </div>
        <div>
          <h5 data-i18n="footer_contact_h">${t('footer_contact_h')}</h5>
          <p class="footer-contact">
            <span data-i18n="footer_addr1">Organize Sanayi Bölgesi</span><br/>
            <span data-i18n="footer_addr2">10. Cadde No: 24</span><br/>
            <span data-i18n="footer_addr3">Türkiye</span><br/><br/>
            <a href="mailto:info@armaweld.com">info@armaweld.com</a>
          </p>
        </div>
      </div>
      <div class="footer-bottom">
        <span data-i18n="footer_copy">${t('footer_copy')}</span>
        <span data-i18n="footer_certs">${t('footer_certs')}</span>
        <span data-i18n="footer_ver">${t('footer_ver')}</span>
      </div>
    </div>
  </footer>
  `;
}

// Scroll reveal
function initReveals() {
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

// Animated counter
function initCounters() {
  const els = document.querySelectorAll('[data-counter]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.counter);
      const decimals = parseInt(el.dataset.decimals || '0');
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = target * eased;
        el.textContent = v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}

function buildScrollBar() {
  return `<div class="scroll-bar" id="scrollBar" aria-hidden="true"></div>`;
}

function initScrollBar() {
  const bar = document.getElementById('scrollBar');
  if (!bar) return;
  const update = () => {
    const scrolled = document.documentElement.scrollTop || document.body.scrollTop;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function mountChrome(activePage) {
  const savedTheme = localStorage.getItem('armaweld-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.body.insertAdjacentHTML('afterbegin', buildScrollBar() + buildNav(activePage));
  document.body.insertAdjacentHTML('beforeend', buildFooter());

  // Apply language translations after DOM is ready
  if (window.i18n) {
    window.i18n.apply();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReveals();
    initCounters();
    initScrollBar();
    if (window.i18n) window.i18n.apply();
  });
  if (document.readyState !== 'loading') {
    initReveals();
    initCounters();
    initScrollBar();
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('armaweld-theme', next);

  const navLogo = document.getElementById('nav-logo');
  const footerLogo = document.getElementById('footer-logo');
  const logoSrc = next === 'dark' ? 'assets/logo-dark.png' : 'assets/logo-light.png';
  if (navLogo) navLogo.src = logoSrc;
  if (footerLogo) footerLogo.src = logoSrc;
}
