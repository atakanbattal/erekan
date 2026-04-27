// ============================================
// EREKAN — Shared Chrome (Nav + Footer)
// ============================================

function buildNav(activePage) {
  const links = [
    { id: 'index', label: 'Ana Sayfa', href: 'index.html' },
    { id: 'hakkimizda', label: 'Hakkımızda', href: 'hakkimizda.html' },
    { id: 'hizmetler', label: 'Hizmetler', href: 'hizmetler.html' },
    { id: 'kalite', label: 'Kalite', href: 'kalite.html' },
    { id: 'kaynak', label: 'Kaynak', href: 'kaynak-yontemleri.html' },
    { id: 'ndt', label: 'NDT', href: 'ndt.html' },
    { id: 'sektorler', label: 'Sektörler', href: 'sektorler.html' },
    { id: 'projeler', label: 'Projeler', href: 'projeler.html' },
    { id: 'sss', label: 'SSS', href: 'sss.html' },
  ];

  const linkHtml = links.map(l =>
    `<a class="nav-link ${l.id === activePage ? 'active' : ''}" href="${l.href}">${l.label}</a>`
  ).join('');

  return `
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="logo" aria-label="EREKAN ana sayfa">
        <span class="logo-mark">E</span>
        <span>EREKAN</span>
      </a>
      <div class="nav-links">
        ${linkHtml}
      </div>
      <div class="nav-right">
        <button class="theme-toggle" aria-label="Tema değiştir" onclick="toggleTheme()" title="Açık / Koyu mod">
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
        <a href="iletisim.html" class="nav-cta">Teklif Al →</a>
        <button class="nav-burger" aria-label="Menu" onclick="document.querySelector('.nav').classList.toggle('open')">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>
  `;
}

function buildFooter() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="index.html" class="logo" style="margin-bottom:24px;">
            <span class="logo-mark">E</span>
            <span>EREKAN</span>
          </a>
          <p class="footer-tag">Her dikişin arkasında bir mühendis imzası vardır.</p>
          <p class="footer-contact">
            Mühendis kadromuzla kaynaklı imalat, kesim, büküm ve<br/>
            tüm metal işleme operasyonlarını tek çatı altında,<br/>
            tam izlenebilirlikle sunuyoruz.
          </p>
        </div>
        <div>
          <h5>Hizmetler</h5>
          <ul>
            <li><a href="hizmetler.html">Kaynaklı İmalat</a></li>
            <li><a href="hizmetler.html">Sac Kesim</a></li>
            <li><a href="hizmetler.html">Büküm & Şekillendirme</a></li>
            <li><a href="hizmetler.html">Montaj & Mekanik</a></li>
            <li><a href="kaynak-yontemleri.html">Kaynak Yöntemleri</a></li>
            <li><a href="ndt.html">NDT / Tahribatsız Muayene</a></li>
          </ul>
        </div>
        <div>
          <h5>Kurumsal</h5>
          <ul>
            <li><a href="hakkimizda.html">Hakkımızda</a></li>
            <li><a href="kalite.html">Kalite & İzlenebilirlik</a></li>
            <li><a href="sektorler.html">Sektörler</a></li>
            <li><a href="projeler.html">Projeler</a></li>
            <li><a href="sss.html">SSS</a></li>
            <li><a href="iletisim.html">İletişim</a></li>
          </ul>
        </div>
        <div>
          <h5>İletişim</h5>
          <p class="footer-contact">
            Organize Sanayi Bölgesi<br/>
            10. Cadde No: 24<br/>
            Türkiye<br/><br/>
            <a href="mailto:info@erekan.com.tr">info@erekan.com.tr</a><br/>
            <a href="tel:+900000000000">+90 (000) 000 00 00</a>
          </p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 EREKAN Metal & Kaynak Mühendisliği</span>
        <span>EN 1090 · EN ISO 3834-2 · ISO 9001:2015</span>
        <span>Ver. 2026.01 — Türkiye</span>
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
  // Initialize theme from localStorage BEFORE mounting, so no flash
  const savedTheme = localStorage.getItem('erekan-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.body.insertAdjacentHTML('afterbegin', buildScrollBar() + buildNav(activePage));
  document.body.insertAdjacentHTML('beforeend', buildFooter());
  document.addEventListener('DOMContentLoaded', () => {
    initReveals();
    initCounters();
    initScrollBar();
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
  localStorage.setItem('erekan-theme', next);
}
