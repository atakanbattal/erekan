// ArmaWeld i18n Engine
(function () {
  'use strict';
  const STORAGE_KEY = 'armaweld-lang';
  const DEFAULT = 'tr';
  const SUPPORTED = ['tr', 'en', 'de', 'es', 'fr'];

  let lang = localStorage.getItem(STORAGE_KEY) || DEFAULT;
  if (!SUPPORTED.includes(lang)) lang = DEFAULT;

  function get(key) {
    const t = window.TRANSLATIONS;
    if (!t) return key;
    return (t[lang] && t[lang][key]) || (t[DEFAULT] && t[DEFAULT][key]) || key;
  }

  function apply() {
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = get(el.dataset.i18n);
      if (v && v !== el.dataset.i18n) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const v = get(el.dataset.i18nHtml);
      if (v && v !== el.dataset.i18nHtml) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = get(el.dataset.i18nPlaceholder);
      if (v && v !== el.dataset.i18nPlaceholder) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const v = get(el.dataset.i18nAria);
      if (v && v !== el.dataset.i18nAria) el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const v = get(el.dataset.i18nTitle);
      if (v && v !== el.dataset.i18nTitle) el.title = v;
    });

    const titleKey = document.documentElement.dataset.i18nTitle;
    if (titleKey) {
      const v = get(titleKey);
      if (v && v !== titleKey) document.title = v;
    }

    updateUI();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function updateUI() {
    const btn = document.getElementById('lang-current');
    if (btn) btn.textContent = lang.toUpperCase();
    document.querySelectorAll('.lang-option').forEach(el => {
      el.classList.toggle('active', el.dataset.lang === lang);
    });
  }

  function setLang(l) {
    if (!SUPPORTED.includes(l)) return;
    lang = l;
    localStorage.setItem(STORAGE_KEY, l);
    apply();
  }

  window.i18n = { apply, setLang, getLang: () => lang, get };
  window.selectLang = function (l) {
    setLang(l);
    const dd = document.getElementById('langDropdown');
    if (dd) dd.classList.remove('open');
  };
  window.toggleLangMenu = function () {
    const dd = document.getElementById('langDropdown');
    if (dd) dd.classList.toggle('open');
  };

  document.addEventListener('click', function (e) {
    const sw = document.getElementById('langSwitcher');
    if (sw && !sw.contains(e.target)) {
      const dd = document.getElementById('langDropdown');
      if (dd) dd.classList.remove('open');
    }
  });
})();
