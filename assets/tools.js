// ArmaWeld — Interactive engineering tools (i18n-aware)
(function () {
  'use strict';

  var units = 'metric';

  var PH_MATS = [
    { id: 's355', key: 'tool_ph_mat_s355' },
    { id: 's700mc', key: 'tool_ph_mat_s700mc' },
    { id: 's960', key: 'tool_ph_mat_s960' },
    { id: 'hardox', key: 'tool_ph_mat_hardox' },
    { id: 'ss', key: 'tool_ph_mat_ss' },
    { id: 'alu', key: 'tool_ph_mat_alu' }
  ];

  var SECTORS = [
    { id: 'bucket', key: 'tool_ms_sec_bucket', link: '/blog/hardox-kaynak.html' },
    { id: 'structural', key: 'tool_ms_sec_structural', link: '/blog/celik-konstruksiyon-imalat.html' },
    { id: 'pressure', key: 'tool_ms_sec_pressure', link: '/blog/basincli-kap-imalati.html' },
    { id: 'energy', key: 'tool_ms_sec_energy', link: '/blog/enerji-sektoru-kaynak.html' },
    { id: 'rail', key: 'tool_ms_sec_rail', link: '/blog/demiryolu-kaynak-en15085.html' },
    { id: 'stainless', key: 'tool_ms_sec_stainless', link: '/blog/tig-paslanmaz-celik.html' },
    { id: 'defense', key: 'tool_ms_sec_defense', link: '/blog/savunma-sanayi-kaynakli-imalat.html' },
    { id: 'mining', key: 'tool_ms_sec_mining', link: '/blog/madencilik-ekipman-kaynak.html' },
    { id: 'crane', key: 'tool_ms_sec_crane', link: '/blog/insaat-celik-imalat.html' },
    { id: 'automotive', key: 'tool_ms_sec_automotive', link: '/blog/otomotiv-yan-sanayi-kaynak.html' },
    { id: 'hydraulics', key: 'tool_ms_sec_hydraulics', link: '/blog/hidrolik-sistem-imalat.html' },
    { id: 'alu', key: 'tool_ms_sec_alu', link: '/blog/aluminyum-kaynak.html' }
  ];

  var DC_TYPES = [
    { id: 'structural', key: 'tool_dc_type_structural' },
    { id: 'pressure', key: 'tool_dc_type_pressure' },
    { id: 'machine', key: 'tool_dc_type_machine' },
    { id: 'export', key: 'tool_dc_type_export' }
  ];

  function t(key) {
    return window.i18n ? window.i18n.get(key) : key;
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function num(id) {
    var el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
  }

  function setResult(id, val, note, cls) {
    var box = document.getElementById(id);
    if (!box) return;
    var v = box.querySelector('.val');
    var n = box.querySelector('.note');
    if (v) v.textContent = val;
    if (n) n.textContent = note || '';
    box.className = 'tool-result' + (cls ? ' ' + cls : '');
  }

  function populateSelect(selectId, items, prev) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var current = prev || sel.value || (items[0] && items[0].id);
    sel.innerHTML = items.map(function (item) {
      return '<option value="' + item.id + '">' + t(item.key) + '</option>';
    }).join('');
    if (items.some(function (i) { return i.id === current; })) sel.value = current;
  }

  function populateAllSelects() {
    populateSelect('ph-material', PH_MATS);
    populateSelect('ms-sector', SECTORS);
    populateSelect('dc-type', DC_TYPES);
  }

  function calcHeatInput() {
    var U = num('hi-voltage');
    var I = num('hi-current');
    var v = num('hi-speed');
    if (!U || !I || !v) {
      setResult('hi-result', '—', t('tool_hi_need'));
      return;
    }
    var Q = (U * I * 60) / (v * 1000);
    var limit = parseFloat($('#hi-limit') && $('#hi-limit').value) || 1.5;
    var cls = Q <= limit ? 'ok' : 'bad';
    var note = t('tool_hi_note') + limit + ' kJ/mm — ' +
      (Q <= limit ? t('tool_hi_ok') : t('tool_hi_over'));
    setResult('hi-result', Q.toFixed(2) + ' kJ/mm', note, cls);
  }

  function calcPreheat() {
    var cev = num('ph-cev');
    var th = num('ph-thickness');
    var mat = $('#ph-material') ? $('#ph-material').value : 's355';
    if (!th) {
      setResult('ph-result', '—', t('tool_ph_need'));
      return;
    }
    var preheat = 0;
    var note = '';
    if (mat === 'alu') {
      preheat = 0;
      note = t('tool_ph_alu') || 'Alüminyum — genelde ön ısıtma gerekmez; interpass ≤100°C.';
    } else if (mat === 'ss') {
      preheat = th >= 12 ? 50 : 0;
      note = t('tool_ph_ss') || 'Paslanmaz — düşük ısı girdisi; kalın plakta hafif ön ısıtma.';
    } else if (mat === 's700mc') {
      preheat = 0;
      note = t('tool_ph_tmcp');
    } else if (mat === 's960' || mat === 'hardox') {
      preheat = Math.max(75, Math.min(150, 50 + th * 2 + (cev > 0.45 ? 25 : 0)));
      note = t('tool_ph_qt');
    } else if (cev >= 0.45 || th >= 30) {
      preheat = Math.max(75, Math.round(50 + (cev - 0.4) * 200 + th * 0.5));
      note = t('tool_ph_carbon');
    } else if (th >= 20) {
      preheat = 50;
      note = t('tool_ph_thick');
    } else {
      preheat = 0;
      note = t('tool_ph_none');
    }
    setResult('ph-result', preheat > 0 ? preheat + ' °C' : t('tool_ph_na'), note, preheat > 0 ? 'warn' : 'ok');
  }

  function calcMaterial() {
    var sector = $('#ms-sector') ? $('#ms-sector').value : 'structural';
    var meta = SECTORS.find(function (s) { return s.id === sector; }) || SECTORS[1];
    var box = $('#ms-result');
    if (!box) return;
    var mat = t('tool_ms_' + sector + '_mat');
    var alt = t('tool_ms_' + sector + '_alt');
    var proc = t('tool_ms_' + sector + '_proc');
    var ndt = t('tool_ms_' + sector + '_ndt');
    var note = t('tool_ms_' + sector + '_note');
    box.innerHTML =
      '<div class="tool-result">' +
      '<div class="val" style="font-size:16px;line-height:1.4">' + mat + '</div>' +
      '<div class="note">' +
      '<strong>' + t('tool_ms_alt') + '</strong> ' + alt + '<br>' +
      '<strong>' + t('tool_ms_proc') + '</strong> ' + proc + '<br>' +
      '<strong>' + t('tool_ms_ndt') + '</strong> ' + ndt + '<br>' +
      '<strong>' + t('tool_ms_note') + '</strong> ' + note + '<br>' +
      '<a href="' + meta.link + '" style="color:var(--arc-2);margin-top:8px;display:inline-block">' +
      t('tool_ms_read') + '</a></div></div>';
  }

  function updateChecklist() {
    var type = $('#dc-type') ? $('#dc-type').value : 'structural';
    var list = $('#dc-list');
    if (!list) return;
    var html = t('tool_dc_' + type + '_html');
    list.innerHTML = html;
    $$('.tool-checklist-detail li', list).forEach(function (li, i) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', function () {
        li.classList.toggle('checked');
      });
    });
  }

  function initTools() {
    populateAllSelects();

    $$('[data-tool="heat"]').forEach(function (btn) {
      btn.addEventListener('click', calcHeatInput);
    });
    $$('[data-tool="preheat"]').forEach(function (btn) {
      btn.addEventListener('click', calcPreheat);
    });
    $$('[data-tool="material"]').forEach(function (btn) {
      btn.addEventListener('click', calcMaterial);
    });

    var msSector = $('#ms-sector');
    if (msSector) {
      msSector.addEventListener('change', calcMaterial);
      calcMaterial();
    }

    var dcType = $('#dc-type');
    if (dcType) {
      dcType.addEventListener('change', updateChecklist);
      updateChecklist();
    }

    $$('.tool-unit-toggle button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        units = btn.dataset.unit || 'metric';
        $$('.tool-unit-toggle button').forEach(function (b) { b.classList.toggle('active', b === btn); });
      });
    });

    document.addEventListener('langchange', function () {
      var phVal = $('#ph-material') && $('#ph-material').value;
      var msVal = $('#ms-sector') && $('#ms-sector').value;
      var dcVal = $('#dc-type') && $('#dc-type').value;
      populateSelect('ph-material', PH_MATS, phVal);
      populateSelect('ms-sector', SECTORS, msVal);
      populateSelect('dc-type', DC_TYPES, dcVal);
      calcHeatInput();
      calcPreheat();
      calcMaterial();
      updateChecklist();
    });
  }

  function boot() {
    if (window.i18n && window.i18n.ready) {
      window.i18n.ready().then(initTools);
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTools);
    } else {
      initTools();
    }
  }

  boot();

  window.ArmaTools = {
    calcHeatInput: calcHeatInput,
    calcPreheat: calcPreheat,
    calcMaterial: calcMaterial,
    updateChecklist: updateChecklist,
    populateAllSelects: populateAllSelects
  };
})();
