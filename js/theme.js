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
  const VIDEO_DARK = 'assets/Fondo_Oscuro.mp4';
  const VIDEO_LIGHT = 'assets/Fondo_Claro.mp4';

  let currentTheme = 'dark'; // 'dark' | 'light'
  let bgVideo = null;
  let heroVideo = null;
  let themeToggleBtn = null;
  let heroSwitchBtn = null;
  let heroStatusEl = null;

  function init() {
    // 1. Cargar preferencia guardada o detectar preferencia del sistema
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      currentTheme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      currentTheme = 'light';
    } else {
      currentTheme = 'dark';
    }

    // 2. Cachear elementos del DOM
    bgVideo = document.getElementById('bg-video');
    heroVideo = document.getElementById('hero-showcase-video');
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    heroSwitchBtn = document.getElementById('hero-theme-switch-btn');
    heroStatusEl = document.getElementById('hero-theme-status');

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

    // 4. Control de sonido en showcase del Hero
    const soundToggleBtn = document.getElementById('video-sound-toggle');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        toggleMute();
      });
    }

    // 5. Aplicar tema inicial
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
      Analyzer.App.toast(theme === 'light' ? '☀️ Modo Claro con Fondo Claro activado' : '🌙 Modo Oscuro con Fondo Oscuro activado');
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
      metaTheme.setAttribute('content', theme === 'light' ? '#ebf2ff' : '#0a1430');
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

    // 6. Redibujar radar comparativo si está visible
    if (!isInitial && window.Analyzer && Analyzer.Comparison && Analyzer.Charts) {
      const selected = Analyzer.Comparison.getSelected().map(p => (Analyzer.Loadout ? Analyzer.Loadout.effective(p) : p));
      const radarCv = document.getElementById('comparison-radar-canvas');
      const barsCv = document.getElementById('comparison-bars-canvas');
      if (radarCv && selected.length > 0) {
        Analyzer.Charts.drawRadar(radarCv, selected);
      }
      if (barsCv && selected.length > 0) {
        Analyzer.Charts.drawBars(barsCv, selected);
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

  function updateUiControls(theme) {
    const isDark = theme === 'dark';

    // Botón en la barra de navegación superior
    if (themeToggleBtn) {
      const icon = themeToggleBtn.querySelector('.theme-toggle-icon');
      const text = themeToggleBtn.querySelector('.theme-toggle-text');
      if (icon) icon.textContent = isDark ? '🌙' : '☀️';
      if (text) text.textContent = isDark ? 'Modo Oscuro' : 'Modo Claro';
      themeToggleBtn.setAttribute('title', isDark ? 'Cambiar a Fondo Claro' : 'Cambiar a Fondo Oscuro');
      themeToggleBtn.classList.toggle('light-active', !isDark);
    }

    // Botón e indicador en el Hero
    if (heroSwitchBtn) {
      heroSwitchBtn.innerHTML = isDark
        ? '<span>☀️ Cambiar a Fondo Claro</span>'
        : '<span>🌙 Cambiar a Fondo Oscuro</span>';
      heroSwitchBtn.setAttribute('title', isDark ? 'Activar tema claro con video de día' : 'Activar tema oscuro con video de noche');
    }
    if (heroStatusEl) {
      heroStatusEl.textContent = isDark
        ? 'Fondo Animado: Mazmorra Oscura'
        : 'Fondo Animado: Ecosistema Claro';
    }
  }

  function toggleMute() {
    const videos = [bgVideo, heroVideo].filter(Boolean);
    if (videos.length === 0) return;
    const newMuted = !videos[0].muted;
    videos.forEach(v => { v.muted = newMuted; });

    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');
    if (soundIcon) soundIcon.textContent = newMuted ? '🔇' : '🔊';
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
    toggleMute
  };
})();
