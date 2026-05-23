// ArmaWeld i18n Engine — lazy language bundles
(function () {
  'use strict';
  const STORAGE_KEY = 'armaweld-lang';
  const DEFAULT = 'tr';
  const SUPPORTED = ['tr', 'en', 'de', 'es', 'fr'];
  const BUNDLE_V = '20260526';

  let lang = localStorage.getItem(STORAGE_KEY) || DEFAULT;
  if (!SUPPORTED.includes(lang)) lang = DEFAULT;

  window.TRANSLATIONS = window.TRANSLATIONS || {};
  let readyPromise = null;

  function basePath() {
    const p = location.pathname;
    if (p.includes('/blog/')) return '../assets/lang/';
    return 'assets/lang/';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.getAttribute('data-i18n-loaded') === '1') {
          resolve();
          return;
        }
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('Failed: ' + src)); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () {
        s.setAttribute('data-i18n-loaded', '1');
        resolve();
      };
      s.onerror = function () { reject(new Error('Failed: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function needsBlogBundle() {
    return /\/blog\//.test(location.pathname) && !location.pathname.endsWith('/blog/') && !location.pathname.endsWith('/blog/index.html');
  }

  function bundleReady(code) {
    return !!(window.TRANSLATIONS && window.TRANSLATIONS[code]);
  }

  function loadBundles(l) {
    var b = basePath();
    var jobs = [];
    if (!bundleReady(DEFAULT)) jobs.push(loadScript(b + DEFAULT + '.js?v=' + BUNDLE_V));
    if (l !== DEFAULT && !bundleReady(l)) jobs.push(loadScript(b + l + '.js?v=' + BUNDLE_V));
    return Promise.all(jobs).then(function () {
      if (!bundleReady(DEFAULT)) {
        throw new Error('Default translation bundle missing');
      }
      if (needsBlogBundle()) {
        var blogPath = location.pathname.includes('/blog/')
          ? '../assets/blog-translations-2026.js?v=' + BUNDLE_V
          : 'assets/blog-translations-2026.js?v=' + BUNDLE_V;
        return loadScript(blogPath).catch(function () {});
      }
    });
  }

  function get(key) {
    var t = window.TRANSLATIONS;
    if (!t) return key;
    return (t[lang] && t[lang][key]) || (t[DEFAULT] && t[DEFAULT][key]) || key;
  }

  function apply() {
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = get(el.dataset.i18n);
      if (v) {
        if (el.tagName === 'META') el.setAttribute('content', v);
        else if (el.tagName === 'TITLE') el.textContent = v;
        else el.textContent = v;
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = get(el.dataset.i18nHtml);
      if (v) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var v = get(el.dataset.i18nPlaceholder);
      if (v) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-value]').forEach(function (el) {
      var v = get(el.dataset.i18nValue);
      if (v) el.value = v;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = get(el.dataset.i18nAria);
      if (v) el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var v = get(el.dataset.i18nTitle);
      if (v) el.title = v;
    });

    var titleKey = document.documentElement.dataset.i18nTitle;
    if (titleKey) {
      var tv = get(titleKey);
      if (tv) document.title = tv;
    }

    updateUI();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function updateUI() {
    var btn = document.getElementById('lang-current');
    if (btn) btn.textContent = lang.toUpperCase();
    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('active', el.dataset.lang === lang);
    });
  }

  function setLang(l) {
    if (!SUPPORTED.includes(l) || l === lang) return;
    lang = l;
    localStorage.setItem(STORAGE_KEY, l);
    loadBundles(l).then(apply);
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = loadBundles(lang).then(apply);
    }
    return readyPromise;
  }

  window.i18n = { apply: apply, setLang: setLang, getLang: function () { return lang; }, get: get, ready: ready };
  window.selectLang = function (l) {
    setLang(l);
    ['langDropdown', 'langDropdownMobile'].forEach(function (id) {
      var dd = document.getElementById(id);
      if (dd) dd.classList.remove('open');
    });
  };
  window.toggleLangMenu = function (suffix) {
    var id = 'langDropdown' + (suffix || '');
    var dd = document.getElementById(id);
    if (dd) dd.classList.toggle('open');
  };

  document.addEventListener('click', function (e) {
    ['langSwitcher', 'langSwitcherMobile'].forEach(function (swId) {
      var sw = document.getElementById(swId);
      if (sw && !sw.contains(e.target)) {
        var dd = sw.querySelector('.lang-dropdown');
        if (dd) dd.classList.remove('open');
      }
    });
  });
})();
