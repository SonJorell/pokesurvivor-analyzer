/* ============ theme.js — Controlador de Fondo Dinámico y Tema (Claro / Oscuro) ============
 * PokéSurvivor Character Analyzer
 *
 * Administra el video de fondo dinámico (Fondo_Oscuro.mp4 / Fondo_Claro.mp4),
 * la conmutación fluida entre modo oscuro y modo claro con persistencia en localStorage,
 * sincronización de controles en navbar y hero, y transición de video y sonido.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Theme = (() => {
  'use strict';

  const STORAGE_KEY = 'pokesurvivor_theme';
  const FAB_STORAGE_KEY = 'pokesurvivor_theme_fab_hidden';
  const VIDEO_DARK = 'assets/Fondo_Oscuro.mp4';
  const VIDEO_LIGHT = 'assets/Fondo_Claro.mp4';

  let currentTheme = 'dark'; // 'dark' | 'light'
  let bgVideo = null;
  let heroVideo = null;
  let themeToggleBtn = null;
  let heroSwitchBtn = null;
  let heroStatusEl = null;
  let floatingWidget = null;
  let fabDismissBtn = null;
  let fabLabelEl = null;

  function init() {
    // 1. Cargar preferencia guardada (modo oscuro predeterminado)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      currentTheme = saved;
    } else {
      currentTheme = 'dark'; // Oscuro como predeterminado oficial
    }

    // 2. Cachear elementos del DOM
    bgVideo = document.getElementById('bg-video');
    heroVideo = document.getElementById('hero-showcase-video');
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    heroSwitchBtn = document.getElementById('hero-theme-switch-btn');
    heroStatusEl = document.getElementById('hero-theme-status');
    floatingWidget = document.getElementById('floating-theme-widget');
    fabDismissBtn = document.getElementById('theme-fab-dismiss');
    fabLabelEl = document.getElementById('theme-fab-label');

    // Garantizar que la burbuja flotante de cambio de color siempre esté visible al cargar
    try {
      localStorage.removeItem(FAB_STORAGE_KEY);
    } catch (e) {}
    if (floatingWidget) {
      floatingWidget.style.display = 'flex';
      floatingWidget.style.visibility = 'visible';
      floatingWidget.style.opacity = '1';
    }

    // 3. Vincular listeners de conmutación
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
      });
    }
    if (heroSwitchBtn) {
      heroSwitchBtn.addEventListener('click', () => {
        toggleTheme();
      });
    }

    // 4. Listener para quitar el botón flotante de la pantalla
    if (fabDismissBtn && floatingWidget) {
      fabDismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        floatingWidget.style.opacity = '0';
        floatingWidget.style.transform = 'translateY(12px) scale(0.85)';
        setTimeout(() => {
          floatingWidget.style.display = 'none';
        }, 220);
        if (window.Analyzer && Analyzer.App && Analyzer.App.toast) {
          Analyzer.App.toast('Burbuja de tema quitada de la pantalla (puedes restaurarla desde el pie de página)');
        }
      });
    }

    // 5. Control de sonido en showcase del Hero
    const soundToggleBtn = document.getElementById('video-sound-toggle');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        toggleMute();
      });
    }

    // 6. Aplicar tema inicial
    applyTheme(currentTheme, true);
  }

  function getTheme() {
    return currentTheme;
  }

  function toggleTheme() {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  function setTheme(theme, isInitial = false) {
    if (theme !== 'dark' && theme !== 'light') theme = 'dark';
    currentTheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}

    applyTheme(theme, isInitial);

    if (!isInitial && window.Analyzer && Analyzer.App && Analyzer.App.toast) {
      Analyzer.App.toast(theme === 'light' ? 'Modo Claro activado' : 'Modo Oscuro activado');
    }
  }

  function applyTheme(theme, isInitial = false) {
    // 1. Atributo en elemento raíz HTML para selectores CSS
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.classList.toggle('theme-light', theme === 'light');
      document.body.classList.toggle('theme-dark', theme === 'dark');
    }

    // 2. Meta theme-color para navegadores móviles
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'light' ? '#f0f4fc' : '#0B101D');
    }

    // 3. Actualizar Videos de Fondo (Ambiental y Hero)
    updateVideoSource(bgVideo, theme, isInitial);
    if (heroVideo && heroVideo !== bgVideo) {
      updateVideoSource(heroVideo, theme, isInitial);
    }

    // 4. Actualizar botones y textos en interfaz
    updateUiControls(theme);

    // 5. Notificar a DungeonBg para adaptar partículas al modo claro/oscuro
    if (window.Analyzer && Analyzer.DungeonBg && Analyzer.DungeonBg.setTheme) {
      Analyzer.DungeonBg.setTheme(theme);
    }

    // 6. Redibujar gráficos comparativos si están visibles
    if (!isInitial && window.Analyzer && Analyzer.Comparison && Analyzer.Charts) {
      const selected = Analyzer.Comparison.getSelected().map(p => (Analyzer.Loadout ? Analyzer.Loadout.effective(p) : p));
      if (selected.length > 0) {
        const radarCv = document.getElementById('comparison-radar-canvas');
        const barsCv = document.getElementById('comparison-bars-canvas');
        const donutCv = document.getElementById('comparison-donut-canvas');
        const matrixCv = document.getElementById('comparison-matrix-canvas');
        const expCv = document.getElementById('comparison-expanded-canvas');

        if (radarCv) Analyzer.Charts.drawRadar(radarCv, selected);
        if (barsCv) Analyzer.Charts.drawBars(barsCv, selected);
        if (donutCv) Analyzer.Charts.drawDonut(donutCv, selected);
        if (matrixCv) Analyzer.Charts.drawMatrix(matrixCv, selected);

        const expModal = document.getElementById('chart-expand-modal');
        if (expModal && !expModal.classList.contains('hidden') && expCv && Analyzer.App && Analyzer.App.getCurrentExpandedType) {
          Analyzer.Charts.drawExpanded(expCv, Analyzer.App.getCurrentExpandedType(), selected);
        }
      }
    }
  }

  function updateVideoSource(videoEl, theme, isInitial = false) {
    if (!videoEl) return;
    const targetSrc = theme === 'light' ? VIDEO_LIGHT : VIDEO_DARK;

    if (isInitial) {
      videoEl.src = targetSrc;
      videoEl.load();
      videoEl.play().catch(() => {});
      return;
    }

    // Transición suave de opacidad
    videoEl.classList.add('video-fading');
    setTimeout(() => {
      videoEl.src = targetSrc;
      videoEl.load();
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          videoEl.classList.remove('video-fading');
        }).catch(() => {
          videoEl.classList.remove('video-fading');
        });
      } else {
        videoEl.classList.remove('video-fading');
      }
    }, 220);
  }

  const SVG_MOON = '<svg class="theme-svg theme-svg-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  const SVG_SUN = '<svg class="theme-svg theme-svg-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

  const SVG_SOUND_ON = '<svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
  const SVG_SOUND_MUTE = '<svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

  function updateUiControls(theme) {
    const isDark = theme === 'dark';

    // Botón / burbuja flotante para cambiar tema
    if (themeToggleBtn) {
      const iconWrap = themeToggleBtn.querySelector('.theme-toggle-icon');
      if (iconWrap) {
        iconWrap.innerHTML = isDark ? SVG_MOON : SVG_SUN;
      } else {
        themeToggleBtn.innerHTML = `<span class="theme-toggle-icon">${isDark ? SVG_MOON : SVG_SUN}</span><span class="theme-bubble-tooltip">Cambiar Color</span>`;
      }
      themeToggleBtn.setAttribute('title', isDark ? 'Modo Oscuro activo (clic para cambiar a Modo Claro)' : 'Modo Claro activo (clic para cambiar a Modo Oscuro)');
      themeToggleBtn.setAttribute('aria-label', isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro');
      themeToggleBtn.classList.toggle('light-active', !isDark);
    }
    if (fabLabelEl) {
      fabLabelEl.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';
    }

    // Botón e indicador en el Hero
    if (heroSwitchBtn) {
      heroSwitchBtn.innerHTML = isDark
        ? `${SVG_SUN} <span>Cambiar a Fondo Claro</span>`
        : `${SVG_MOON} <span>Cambiar a Fondo Oscuro</span>`;
      heroSwitchBtn.setAttribute('title', isDark ? 'Activar tema claro con video de día' : 'Activar tema oscuro con video de noche');
    }
    if (heroStatusEl) {
      heroStatusEl.textContent = isDark
        ? 'Fondo Animado: Mazmorra Oscura'
        : 'Fondo Animado: Ecosistema Claro';
    }
  }

  function restoreFab() {
    try {
      localStorage.removeItem(FAB_STORAGE_KEY);
    } catch (e) {}
    if (floatingWidget) {
      floatingWidget.style.display = 'flex';
      floatingWidget.style.opacity = '0';
      floatingWidget.style.transform = 'translateY(12px) scale(0.9)';
      setTimeout(() => {
        floatingWidget.style.opacity = '1';
        floatingWidget.style.transform = 'translateY(0) scale(1)';
      }, 20);
    }
    if (window.Analyzer && Analyzer.App && Analyzer.App.toast) {
      Analyzer.App.toast('Botón flotante de tema restaurado en pantalla');
    }
  }

  function toggleMute() {
    const videos = [bgVideo, heroVideo].filter(Boolean);
    if (videos.length === 0) return;
    const newMuted = !videos[0].muted;
    videos.forEach(v => { v.muted = newMuted; });

    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');
    if (soundIcon) soundIcon.innerHTML = newMuted ? SVG_SOUND_MUTE : SVG_SOUND_ON;
    if (soundText) soundText.textContent = newMuted ? 'Sin Audio' : 'Audio ON';
    if (window.Analyzer && Analyzer.App && Analyzer.App.toast) {
      Analyzer.App.toast(newMuted ? 'Video silenciado' : 'Audio de video activado');
    }
  }

  return {
    init,
    getTheme,
    setTheme,
    toggleTheme,
    toggleMute,
    restoreFab
  };
})();
