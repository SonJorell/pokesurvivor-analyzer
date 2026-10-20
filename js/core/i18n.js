/* ============ i18n.js — Sistema de Internacionalización (ES / EN) ============
 * Soporte bilingüe completo (Español / Inglés) para PokéSurvivor Character Analyzer.
 * Traduce automáticamente el DOM mediante TreeWalker y MutationObserver,
 * así como los textos pintados en Canvas 2D (gráficos de Chart.js).
 */
window.Analyzer = window.Analyzer || {};
window.G = window.G || {};

Analyzer.I18n = (() => {
  const STORAGE_KEY = 'ps.lang';
  const ALT_KEY = 'analyzer.lang';
  
  // Idiomas soportados
  const SUPPORTED = ['es', 'en'];

  // Determinar idioma inicial
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(ALT_KEY);
  } catch (e) {}

  let currentLang = 'es';
  if (saved && SUPPORTED.includes(saved.toLowerCase())) {
    currentLang = saved.toLowerCase();
  } else {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (nav.toLowerCase().startsWith('en')) {
      currentLang = 'en';
    }
  }

  // Estructuras para el diccionario inglés
  const exact = new Map();
  const exactLow = new Map();
  const patterns = [];
  const fragMap = new Map();
  let fragRe = null;
  let fragDirty = false;
  const cache = new Map();

  const ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  const skipEl = el => !!(el && el.closest && el.closest('[translate="no"], script, style, code'));

  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function add(dict, language = 'en') {
    if (language !== 'en' || !dict) return;
    let sort = false;
    for (const [es, en] of Object.entries(dict)) {
      if (!en) continue;
      if (/\{x\}/.test(es)) {
        const parts = es.split(/\{x\}/).map(reEsc);
        const key = es;
        const i = patterns.findIndex(p => p.key === key);
        if (i >= 0) patterns.splice(i, 1);
        patterns.push({
          key,
          weight: parts.join('').length,
          re: new RegExp('^' + parts.join('(.+?)') + '$', 'u'),
          reI: new RegExp('^' + parts.join('(.+?)') + '$', 'iu'),
          en
        });
        sort = true;
      } else {
        exact.set(es, en);
        exactLow.set(es.toLowerCase(), en);
        if (es.length >= 4 || /\s/.test(es)) {
          fragMap.set(es.toLowerCase(), en);
          fragDirty = true;
        }
      }
    }
    if (sort) patterns.sort((a, b) => b.weight - a.weight);
    cache.clear();
  }

  function getFragRegex() {
    if (fragDirty) {
      fragDirty = false;
      const all = [...fragMap.keys()].sort((a, b) => b.length - a.length).map(reEsc).join('|');
      fragRe = all ? new RegExp(`(?<![\\p{L}\\p{N}])(${all})(?![\\p{L}\\p{N}])`, 'giu') : null;
    }
    return fragRe;
  }

  function keepCase(src, en) {
    if (src === src.toUpperCase() && /\p{L}/u.test(src)) return en.toUpperCase();
    return en;
  }

  function t(s) {
    if (currentLang === 'es' || !s || typeof s !== 'string') return s;
    if (!/\p{L}/u.test(s)) return s;
    const c = cache.get(s);
    if (c !== undefined) return c;
    let r = core(s);
    if (cache.size > 5000) cache.clear();
    cache.set(s, r);
    return r;
  }

  function core(s) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    if (!m) return s;
    const lead = m[1], tail = m[3], body = m[2].replace(/\s+/g, ' ');
    if (!body) return s;
    const upper = body === body.toUpperCase() && /\p{L}/u.test(body);

    // 1. Coincidencia exacta
    let r = exact.get(body);
    if (r === undefined && upper) {
      const e = exactLow.get(body.toLowerCase());
      if (e !== undefined) r = keepCase(body, e);
    }
    if (r !== undefined) return lead + r + tail;

    // 2. Patrones con huecos {x}
    for (const p of patterns) {
      const mm = (upper ? p.reI : p.re).exec(body);
      if (!mm) continue;
      let i = 1;
      r = p.en.replace(/\{x\}/g, () => {
        const g = mm[i++];
        return g === undefined ? '' : core(g);
      });
      return lead + keepCase(body, r) + tail;
    }

    // 3. Reemplazo de fragmentos
    const re = getFragRegex();
    if (re) {
      const replaced = body.replace(re, w => keepCase(w, fragMap.get(w.toLowerCase()) || w));
      if (replaced !== body) return lead + replaced + tail;
    }

    return s;
  }

  // Traducción recursiva de nodos DOM
  function doText(n) {
    const p = n.parentElement;
    if (!p || skipEl(p)) return;
    const v = n.nodeValue;
    if (n.__tr === v) return;
    const r = t(v);
    n.__tr = r;
    if (r !== v) n.nodeValue = r;
  }

  function doEl(el) {
    if (skipEl(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) {
        const r = t(v);
        if (r !== v) el.setAttribute(a, r);
      }
    }
  }

  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    doEl(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doEl(n);
    }
  }

  // Interceptar Canvas 2D para que Chart.js dibuje en el idioma activo
  function hookCanvas() {
    if (currentLang === 'es') return;
    const P = CanvasRenderingContext2D.prototype;
    for (const k of ['fillText', 'strokeText', 'measureText']) {
      const orig = P[k];
      P[k] = function (s, ...a) {
        return orig.call(this, typeof s === 'string' ? t(s) : s, ...a);
      };
    }
  }

  // Observador de mutaciones del DOM para traducir vistas dinámicas (modales, cartas, tablas)
  let observer = null;
  function startDom() {
    document.documentElement.lang = currentLang;
    updateUiButtons();

    if (currentLang === 'es') return;

    walk(document.body);

    if (typeof MutationObserver !== 'undefined' && !observer) {
      observer = new MutationObserver(ms => {
        for (const m of ms) {
          if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doEl(m.target);
          else m.addedNodes.forEach(walk);
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRS
      });
    }
  }

  function updateUiButtons() {
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) {
      const label = btn.querySelector('.lang-current-label');
      if (label) label.textContent = currentLang.toUpperCase();
      btn.title = currentLang === 'es' ? 'Cambiar a Inglés (Switch to English)' : 'Switch to Spanish (Cambiar a Español)';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem(ALT_KEY, lang);
    } catch (e) {}
    currentLang = lang;
    location.reload();
  }

  function toggleLang() {
    const next = currentLang === 'es' ? 'en' : 'es';
    setLang(next);
  }

  // Inicializar Canvas hook inmediatamente
  hookCanvas();

  // Escuchar carga del DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDom);
  } else {
    setTimeout(startDom, 0);
  }

  return {
    getLang: () => currentLang,
    isEn: () => currentLang === 'en',
    isEs: () => currentLang === 'es',
    setLang,
    toggleLang,
    add,
    t,
    walk,
    updateUiButtons,
    SUPPORTED
  };
})();

// Alias globales para retrocompatibilidad con lang-en.js y llamadas en motor
G.I18n = Analyzer.I18n;
G.T = Analyzer.I18n.t;
