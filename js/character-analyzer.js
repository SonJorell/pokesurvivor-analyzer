/* ============ character-analyzer.js — Controlador Principal de la Interfaz ============
 * PokéSurvivor Character Analyzer
 *
 * Coordina la interfaz de usuario, animaciones de sprites en canvas, catálogo reactivo,
 * modal de ficha completa, comparador de 2 a 4 columnas, gráficos y exportaciones.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.App = (() => {
  'use strict';

  // Elementos DOM cacheados
  let elGrid = null;
  let elCount = null;
  let elSearch = null;
  let elTypeFilters = null;
  let elCatFilters = null;
  let elSortBy = null;
  let elSortDir = null;
  let elResetBtn = null;
  let elViewModes = null;
  let elTray = null;
  let elTrayItems = null;
  let elTrayCompareBtn = null;
  let elComparisonSection = null;
  let elModal = null;
  let elModalContent = null;
  let elRadarCanvas = null;
  let elBarsCanvas = null;
  let elDonutCanvas = null;
  let elMatrixCanvas = null;
  let elPodiumStage = null;
  let elPodiumList = null;
  let elPodiumSelect = null;
  let elChartExpandModal = null;
  let elChartExpandCloseBtn = null;
  let elChartExpandDownloadBtn = null;
  let elExpandedCanvas = null;
  let elChartExpandTitle = null;
  let elChartExpandDesc = null;
  let elChartExpandLegend = null;
  let currentExpandedType = 'radar';
  let currentPodiumMetric = 'overall';
  let elScalingModal = null;
  let elScalingModalContent = null;

  // Nuevos elementos para Regiones, Paginación y Filtros de Stats
  let elPageSizeSelect = null;
  let elTopPagination = null;
  let elBottomPagination = null;
  let elRegionFilters = null;
  let elRegionActiveBadge = null;
  let elQuickSortButtons = null;
  let elSliderMinHp = null;
  let elValMinHp = null;
  let elSliderMinAtk = null;
  let elValMinAtk = null;
  let elSliderMinSpd = null;
  let elValMinSpd = null;
  let elResetStatsBtn = null;

  // Estado de la interfaz y paginación
  let viewMode = 'cards'; // 'cards' | 'table'
  let currentPage = 1;
  let pageSize = 35;
  let currentModalDex = null;
  let modalShiny = false;
  let modalAnim = 'Idle';
  let modalDir = 0;
  let modalUpgradesSimulated = false;
  let activeTab = 'home'; // 'home' | 'catalog' | 'comparison'

  // Bucle de animación para sprites activos en canvas
  const activeCanvasAnimators = new Map();
  let animLoopId = null;
  let lastTime = performance.now();

  /**
   * Conmuta entre las pestañas principales (Inicio/Dashboard, Catálogo, Comparador)
   */
  function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.app-view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${tabName}`);
    });
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    if (tabName === 'comparison') {
      const selectedList = Analyzer.Comparison.getSelected();
      renderComparison(selectedList);
      if (elTray) elTray.classList.add('hidden');
    } else {
      if (elTray && Analyzer.Comparison && Analyzer.Comparison.count() > 0) {
        elTray.classList.remove('hidden');
      }
      if (tabName === 'catalog') {
        renderCatalog();
      } else if (tabName === 'home') {
        if (window.Analyzer && Analyzer.Dashboard) {
          const dbContainer = document.getElementById('dashboard-container');
          if (dbContainer && !dbContainer.hasChildNodes()) {
            Analyzer.Dashboard.render(dbContainer);
          }
        }
      } else if (tabName === 'guide') {
        if (window.Analyzer && Analyzer.GameGuide) {
          const guideContainer = document.getElementById('guide-container');
          if (guideContainer) {
            Analyzer.GameGuide.render(guideContainer);
          }
        }
      }
    }

    try {
      history.replaceState(null, '', '#' + tabName);
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Inicialización general
   */
  function init() {
    // 1. Inicializar datos y dependencias
    Analyzer.DataAdapter.init();
    Analyzer.Comparison.init();

    // Objetos equipados: al cambiar uno se recalcula comparador y ficha abierta
    Analyzer.Loadout.init();
    Analyzer.Loadout.onChange(() => {
      renderComparison(Analyzer.Comparison.getSelected());
      if (currentModalDex != null && elModal && !elModal.classList.contains('hidden')) {
        const mp = Analyzer.DataAdapter.getByDex(currentModalDex);
        if (mp) renderModalContent(mp);
      }
      playSfx('select');
    });

    // 2. Cachear elementos del DOM
    cacheElements();

    // 3. Vincular eventos de filtros y controles
    bindEvents();

    // 4. Renderizar filtros iniciales
    renderFilterControls();

    // 5. Suscribirse a cambios en filtros y comparaciones
    Analyzer.Filters.subscribe(() => {
      renderFilterControls();
      renderCatalog();
    });

    Analyzer.Comparison.subscribe(selectedList => {
      renderTray(selectedList);
      renderComparison(selectedList);
      updateGridSelectionState();
    });

    // 6. Iniciar bucle de animación para sprites
    startAnimationLoop();

    // 7. Primer renderizado
    renderCatalog();
    renderTray(Analyzer.Comparison.getSelected());
    renderComparison(Analyzer.Comparison.getSelected());

    // 8. Inicializar Tema y Fondo Dinámico (Claro/Oscuro), Partículas, Sugeridor y Dashboard
    if (window.Analyzer && Analyzer.Theme) {
      Analyzer.Theme.init();
    }

    if (window.Analyzer && Analyzer.DungeonBg) {
      Analyzer.DungeonBg.init('dungeon-bg-canvas');
    }

    if (window.Analyzer && Analyzer.TeamSuggester) {
      const tsContainer = document.getElementById('team-suggester-container');
      if (tsContainer) {
        Analyzer.TeamSuggester.render(tsContainer);
      }
    }

    if (window.Analyzer && Analyzer.Dashboard) {
      const dbContainer = document.getElementById('dashboard-container');
      if (dbContainer) {
        Analyzer.Dashboard.render(dbContainer);
      }
    }

    const initHash = window.location.hash.replace('#', '');
    if (['home', 'catalog', 'comparison', 'guide'].includes(initHash)) {
      switchTab(initHash);
    } else {
      switchTab('home');
    }

    // 9. Atajos de teclado
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (elChartExpandModal && !elChartExpandModal.classList.contains('hidden')) {
          closeExpandedChart();
        } else if (elScalingModal && !elScalingModal.classList.contains('hidden')) {
          closeMoveScalingModal();
        } else {
          closeModal();
        }
      } else if (e.key === '/' && document.activeElement !== elSearch) {
        e.preventDefault();
        elSearch.focus();
      }
    });
  }

  function cacheElements() {
    elGrid = document.getElementById('catalog-grid');
    elCount = document.getElementById('results-count');
    elSearch = document.getElementById('search-input');
    elTypeFilters = document.getElementById('type-filters');
    elCatFilters = document.getElementById('category-filters');
    elSortBy = document.getElementById('sort-by');
    elSortDir = document.getElementById('sort-dir');
    elResetBtn = document.getElementById('reset-filters-btn');
    elViewModes = document.querySelectorAll('.view-mode-btn');
    elTray = document.getElementById('comparison-tray');
    elTrayItems = document.getElementById('tray-items');
    elTrayCompareBtn = document.getElementById('tray-compare-btn');
    elComparisonSection = document.getElementById('comparison-section');
    elModal = document.getElementById('dossier-modal');
    elModalContent = document.getElementById('modal-body-content');
    elRadarCanvas = document.getElementById('comparison-radar-canvas');
    elBarsCanvas = document.getElementById('comparison-bars-canvas');
    elDonutCanvas = document.getElementById('comparison-donut-canvas');
    elMatrixCanvas = document.getElementById('comparison-matrix-canvas');
    elPodiumStage = document.getElementById('comparison-podium-stage');
    elPodiumList = document.getElementById('comparison-podium-list');
    elPodiumSelect = document.getElementById('podium-metric-select');
    elChartExpandModal = document.getElementById('chart-expand-modal');
    elChartExpandCloseBtn = document.getElementById('chart-expand-close-btn');
    elExpandedCanvas = document.getElementById('comparison-expanded-canvas');
    elChartExpandTitle = document.getElementById('chart-expand-title');
    elChartExpandDesc = document.getElementById('chart-expand-desc');
    elChartExpandLegend = document.getElementById('chart-expand-legend');
    elScalingModal = document.getElementById('move-scaling-modal');
    elScalingModalContent = document.getElementById('scaling-modal-content');

    // Regiones, Paginación y Estadísticas Mínimas
    elPageSizeSelect = document.getElementById('page-size-select');
    elTopPagination = document.getElementById('top-pagination');
    elBottomPagination = document.getElementById('bottom-pagination');
    elRegionFilters = document.getElementById('region-filters');
    elRegionActiveBadge = document.getElementById('region-active-badge');
    elQuickSortButtons = document.getElementById('quick-sort-buttons');
    elSliderMinHp = document.getElementById('slider-min-hp');
    elValMinHp = document.getElementById('val-min-hp');
    elSliderMinAtk = document.getElementById('slider-min-atk');
    elValMinAtk = document.getElementById('val-min-atk');
    elSliderMinSpd = document.getElementById('slider-min-spd');
    elValMinSpd = document.getElementById('val-min-spd');
    elResetStatsBtn = document.getElementById('reset-stats-sliders-btn');
  }

  let lastGpNavTime = 0;
  let lastRightStickPageFlick = 0;

  function pollGamepadNavigation() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const now = performance.now();

    let gamepads = null;
    try { gamepads = navigator.getGamepads(); } catch (e) { return; }
    if (!gamepads) return;
    const gp = Array.from(gamepads).find(g => g && g.connected);
    if (!gp) return;

    const btns = gp.buttons || [];
    const axes = gp.axes || [];

    // Stick derecho (axes[2]: horizontal X, axes[3]: vertical Y)
    const rsx = axes[2] != null ? axes[2] : 0;
    const rsy = axes[3] != null ? axes[3] : 0;
    const rsmag = Math.hypot(rsx, rsy);

    // 1. Desplazamiento continuo vertical / horizontal con stick derecho
    if (rsmag > 0.18) {
      const normMag = (rsmag - 0.18) / (1 - 0.18);
      const scrollSpeed = 20 * (normMag * normMag * 1.5 + 0.6);
      const scrollDx = (rsx / rsmag) * scrollSpeed;
      const scrollDy = (rsy / rsmag) * scrollSpeed;

      // Scroll horizontal de tablas/comparación si están presentes, o ventana completa
      let scrolledChild = false;
      const compWrap = document.querySelector('.comparison-table-wrapper, .table-container, .stats-matrix-scroll');
      if (compWrap && Math.abs(rsx) > 0.25) {
        compWrap.scrollLeft += scrollDx;
        scrolledChild = true;
      }
      window.scrollBy({ left: scrolledChild ? 0 : scrollDx, top: scrollDy, behavior: 'instant' });
    }

    // 2. Cambio rápido de páginas con flick horizontal del stick derecho
    const flickThreshold = 0.68;
    if (Math.abs(rsx) > flickThreshold && Math.abs(rsy) < 0.45) {
      if (now - lastRightStickPageFlick > 300) {
        if (rsx < -flickThreshold && currentPage > 1) {
          currentPage--;
          renderCatalog();
          lastRightStickPageFlick = now;
          lastGpNavTime = now;
          playSfx('select');
          return;
        } else if (rsx > flickThreshold) {
          const all = Analyzer.DataAdapter.getAll();
          const filtered = Analyzer.Filters.apply(all);
          const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
          if (currentPage < totalPages) {
            currentPage++;
            renderCatalog();
            lastRightStickPageFlick = now;
            lastGpNavTime = now;
            playSfx('select');
            return;
          }
        }
      }
    }

    if (now - lastGpNavTime < 200) return; // Debounce de 200ms para botones

    // D-pad Left / Stick Left / L1 -> Página Anterior
    const leftPressed = (btns[14] && btns[14].pressed) || (btns[4] && btns[4].pressed) || (axes[0] != null && axes[0] < -0.6);
    // D-pad Right / Stick Right / R1 -> Página Siguiente
    const rightPressed = (btns[15] && btns[15].pressed) || (btns[5] && btns[5].pressed) || (axes[0] != null && axes[0] > 0.6);
    // B / Circle (Botón 1) -> Cerrar modal si está abierto
    const backPressed = btns[1] && btns[1].pressed;
    // Y / Triangle (Botón 3) -> Ir a comparación
    const comparePressed = btns[3] && btns[3].pressed;

    if (backPressed) {
      if (elScalingModal && !elScalingModal.classList.contains('hidden')) {
        closeMoveScalingModal();
        lastGpNavTime = now;
        playSfx('click');
        return;
      }
      if (elModal && !elModal.classList.contains('hidden')) {
        closeModal();
        lastGpNavTime = now;
        playSfx('click');
        return;
      }
    }

    if (leftPressed && currentPage > 1) {
      currentPage--;
      renderCatalog();
      lastGpNavTime = now;
      playSfx('select');
      return;
    }

    const all = Analyzer.DataAdapter.getAll();
    const filtered = Analyzer.Filters.apply(all);
    const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));

    if (rightPressed && currentPage < totalPages) {
      currentPage++;
      renderCatalog();
      lastGpNavTime = now;
      playSfx('select');
      return;
    }

    if (comparePressed) {
      scrollToComparison();
      lastGpNavTime = now;
      playSfx('confirm');
      return;
    }
  }

  /**
   * Bucle de animación fluido para todos los sprites canvas activos en pantalla
   */
  function startAnimationLoop() {
    function loop(now) {
      pollGamepadNavigation();

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Actualizar y dibujar animadores registrados
      for (const [canvas, entry] of activeCanvasAnimators) {
        if (!canvas.isConnected) {
          activeCanvasAnimators.delete(canvas);
          continue;
        }

        // Optimización de visibilidad: si el canvas está fuera de la ventana (+150px buffer), saltar render
        const rect = canvas.getBoundingClientRect();
        if (rect.bottom < -150 || rect.top > window.innerHeight + 150) {
          continue;
        }

        entry.animator.update(dt);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;

        // Metadatos de la animación activa para calcular dimensiones reales
        const m = (window.G && G.Sprites && (
          G.Sprites.animMeta(entry.dex, entry.animator.cur || 'Idle', entry.animator.shiny)
          || (G.SPRITE_META && G.SPRITE_META[entry.dex]?.a?.Idle)
        )) || null;

        const padX = Math.max(3, Math.min(6, Math.floor(canvas.width * 0.05)));
        const padY = Math.max(3, Math.min(6, Math.floor(canvas.height * 0.05)));
        const availW = canvas.width - padX * 2;
        const availH = canvas.height - padY * 2;

        let k = entry.scale || 2;
        let fx = canvas.width / 2;
        let fy = canvas.height * 0.86;

        if (m && m.w > 0 && m.h > 0) {
          // Ajuste dinámico de escala para que personajes gigantes (Gyarados, Rayquaza, Onix, Steelix, etc.) nunca se corten
          const maxScaleW = availW / m.w;
          const maxScaleH = availH / m.h;
          const maxFitScale = Math.min(maxScaleW, maxScaleH);

          if (k > maxFitScale) {
            k = maxFitScale;
          }

          const boxW = m.w * k;
          const boxH = m.h * k;

          // Centrado horizontal exacto del recuadro visual del sprite
          fx = Math.round((canvas.width - boxW) / 2 + m.ax * k);

          // Posicionamiento vertical: apoyar pies cerca del suelo pero asegurar que la cabeza nunca se corte arriba
          const idealBaseY = canvas.height - padY - Math.max(2, Math.round(3 * (k / 2)));
          fy = idealBaseY - (m.h - m.ay) * k;
          if (fy - m.ay * k < padY) {
            fy = padY + m.ay * k;
          }
          fy = Math.round(fy);

          // Sombra suave adaptada al tamaño del Pokémon
          if (entry.shadow !== false) {
            const shadowRx = Math.min(boxW * 0.32, 10 * k);
            const shadowRy = Math.max(2, shadowRx * 0.35);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(fx, Math.min(canvas.height - padY - 2, fy), shadowRx, shadowRy, 0, 0, 6.2832);
            ctx.fill();
          }
        } else {
          if (entry.shadow !== false) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(fx, fy, 9 * k, 3.4 * k, 0, 0, 6.2832);
            ctx.fill();
          }
        }

        entry.animator.scale = k / G.Sprites.PX;
        entry.animator.draw(ctx, fx, fy);
      }

      animLoopId = requestAnimationFrame(loop);
    }

    lastTime = performance.now();
    animLoopId = requestAnimationFrame(loop);
  }

  function registerCanvasSprite(canvas, dex, options = {}) {
    if (!canvas || !G.Sprites || !G.Sprites.Animator) return;
    const animator = new G.Sprites.Animator(dex, 1, !!options.shiny);
    animator.dir = options.dir || 0;
    animator.loop(options.anim || 'Idle');

    activeCanvasAnimators.set(canvas, {
      animator,
      dex,
      scale: options.scale || 2,
      shadow: options.shadow !== false
    });

    return animator;
  }

  /**
   * Enlaza eventos de la barra de búsqueda y filtros
   */
  function bindEvents() {
    // Búsqueda por texto con debounce
    let searchTimeout = null;
    elSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        Analyzer.Filters.set('search', elSearch.value);
      }, 180);
    });

    // Selector de orden principal
    elSortBy.addEventListener('change', () => {
      currentPage = 1;
      Analyzer.Filters.set('sortBy', elSortBy.value);
      updateQuickSortButtons();
      playSfx('select');
    });

    elSortDir.addEventListener('click', () => {
      const current = Analyzer.Filters.getState().sortDir;
      const next = current === 'asc' ? 'desc' : 'asc';
      currentPage = 1;
      Analyzer.Filters.set('sortDir', next);
      elSortDir.textContent = next === 'asc' ? '▲ Asc' : '▼ Desc';
      updateQuickSortButtons();
      playSfx('select');
    });

    // Selector de tamaño de página
    if (elPageSizeSelect) {
      elPageSizeSelect.addEventListener('change', () => {
        const val = elPageSizeSelect.value;
        pageSize = val === 'all' ? 'all' : parseInt(val, 10);
        currentPage = 1;
        renderCatalog();
        playSfx('select');
      });
    }

    // Botones de orden rápido (ATK, SPD, HP, BST, DEX, NOMBRE)
    if (elQuickSortButtons) {
      elQuickSortButtons.querySelectorAll('.quick-sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sortField = btn.dataset.sort;
          const currentSortBy = Analyzer.Filters.getState().sortBy;
          const currentSortDir = Analyzer.Filters.getState().sortDir;

          let nextDir = 'desc';
          if (sortField === currentSortBy) {
            nextDir = currentSortDir === 'desc' ? 'asc' : 'desc';
          } else {
            nextDir = (sortField === 'dex' || sortField === 'name') ? 'asc' : 'desc';
          }

          currentPage = 1;
          Analyzer.Filters.setMultiple({ sortBy: sortField, sortDir: nextDir });
          if (elSortBy) elSortBy.value = sortField;
          if (elSortDir) elSortDir.textContent = nextDir === 'asc' ? '▲ Asc' : '▼ Desc';
          updateQuickSortButtons();
          playSfx('select');
        });
      });
    }

    // Sliders de umbrales mínimos de estadísticas
    if (elSliderMinHp) {
      elSliderMinHp.addEventListener('input', () => {
        const val = parseInt(elSliderMinHp.value, 10);
        if (val <= 70) {
          elValMinHp.textContent = 'Cualquiera (70+)';
          Analyzer.Filters.set('minHp', 0);
        } else {
          elValMinHp.textContent = `≥ ${val} HP`;
          Analyzer.Filters.set('minHp', val);
        }
        currentPage = 1;
      });
    }

    if (elSliderMinAtk) {
      elSliderMinAtk.addEventListener('input', () => {
        const rawVal = parseInt(elSliderMinAtk.value, 10);
        const val = rawVal / 100;
        if (rawVal <= 76) {
          elValMinAtk.textContent = 'Cualquiera (×0.76+)';
          Analyzer.Filters.set('minAtk', 0);
        } else {
          elValMinAtk.textContent = `≥ ×${val.toFixed(2)} ATK`;
          Analyzer.Filters.set('minAtk', val);
        }
        currentPage = 1;
      });
    }

    if (elSliderMinSpd) {
      elSliderMinSpd.addEventListener('input', () => {
        const val = parseInt(elSliderMinSpd.value, 10);
        if (val <= 80) {
          elValMinSpd.textContent = 'Cualquiera (80+)';
          Analyzer.Filters.set('minSpd', 0);
        } else {
          elValMinSpd.textContent = `≥ ${val} SPD`;
          Analyzer.Filters.set('minSpd', val);
        }
        currentPage = 1;
      });
    }

    if (elResetStatsBtn) {
      elResetStatsBtn.addEventListener('click', () => {
        resetStatSliders();
        playSfx('click');
        toast('Umbrales de estadísticas restablecidos');
      });
    }

    // Botón reiniciar todos los filtros
    elResetBtn.addEventListener('click', () => {
      resetAllFilters();
    });

    // Modos de vista (Tarjetas, Compacto, Tabla)
    elViewModes.forEach(btn => {
      btn.addEventListener('click', () => {
        elViewModes.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        viewMode = btn.dataset.view;
        renderCatalog();
        playSfx('select');
      });
    });

    // Bandeja de comparación: ir a la pestaña del comparador
    elTrayCompareBtn.addEventListener('click', () => {
      switchTab('comparison');
      playSfx('confirm');
    });

    document.getElementById('tray-clear-btn').addEventListener('click', () => {
      Analyzer.Comparison.clear();
      playSfx('click');
      toast('Comparación vaciada');
    });

    // Pestañas de Navegación SPA
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab) switchTab(tab);
      });
    });

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (['home', 'catalog', 'comparison', 'guide'].includes(h)) {
        switchTab(h);
      }
    });

    // Compartir comparación
    document.getElementById('share-comparison-btn').addEventListener('click', () => {
      const url = Analyzer.Comparison.getShareUrl();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          toast('Enlace de comparación copiado al portapapeles');
          playSfx('confirm');
        }).catch(() => {
          prompt('Copia este enlace de comparación:', url);
        });
      } else {
        prompt('Copia este enlace de comparación:', url);
      }
    });

    // Limpiar comparación desde panel
    document.getElementById('clear-comparison-btn').addEventListener('click', () => {
      Analyzer.Comparison.clear();
      playSfx('click');
    });

    // Cerrar modales
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    elModal.addEventListener('click', e => {
      if (e.target === elModal) closeModal();
    });

    const scalingCloseBtn = document.getElementById('scaling-modal-close-btn');
    if (scalingCloseBtn) {
      scalingCloseBtn.addEventListener('click', closeMoveScalingModal);
    }
    if (elScalingModal) {
      elScalingModal.addEventListener('click', e => {
        if (e.target === elScalingModal) closeMoveScalingModal();
      });
    }

    // Selector de métrica del Podio Táctico
    if (elPodiumSelect) {
      elPodiumSelect.addEventListener('change', () => {
        currentPodiumMetric = elPodiumSelect.value;
        const selectedList = Analyzer.Comparison.getSelected();
        renderPodium(selectedList, currentPodiumMetric);
        playSfx('select');
      });
    }

    // Controles del Modal de Gráfico Expandido
    if (elChartExpandCloseBtn) {
      elChartExpandCloseBtn.addEventListener('click', closeExpandedChart);
    }
    if (elChartExpandModal) {
      elChartExpandModal.addEventListener('click', e => {
        if (e.target === elChartExpandModal) closeExpandedChart();
      });
    }
  }

  function resetStatSliders() {
    if (elSliderMinHp) elSliderMinHp.value = '70';
    if (elValMinHp) elValMinHp.textContent = 'Cualquiera (70+)';
    if (elSliderMinAtk) elSliderMinAtk.value = '76';
    if (elValMinAtk) elValMinAtk.textContent = 'Cualquiera (×0.76+)';
    if (elSliderMinSpd) elSliderMinSpd.value = '80';
    if (elValMinSpd) elValMinSpd.textContent = 'Cualquiera (80+)';
    currentPage = 1;
    Analyzer.Filters.setMultiple({ minHp: 0, minAtk: 0, minSpd: 0 });
  }

  function resetAllFilters() {
    currentPage = 1;
    Analyzer.Filters.reset();
    if (elSearch) elSearch.value = '';
    if (elSortBy) elSortBy.value = 'dex';
    if (elSortDir) elSortDir.textContent = '▲ Asc';
    resetStatSliders();
    renderFilterControls();
    playSfx('click');
    toast('Todos los filtros restablecidos');
  }

  function updateQuickSortButtons() {
    if (!elQuickSortButtons) return;
    const state = Analyzer.Filters.getState();
    elQuickSortButtons.querySelectorAll('.quick-sort-btn').forEach(btn => {
      const field = btn.dataset.sort;
      const indicator = btn.querySelector('.sort-indicator');
      if (field === state.sortBy) {
        btn.classList.add('active');
        if (indicator) {
          indicator.textContent = state.sortDir === 'desc' ? '▼' : '▲';
        }
      } else {
        btn.classList.remove('active');
        if (indicator) {
          indicator.textContent = '';
        }
      }
    });
  }

  /**
   * Renderiza el selector de regiones separadas
   */
  function renderRegionTabs() {
    if (!elRegionFilters) return;
    const state = Analyzer.Filters.getState();
    const regions = Analyzer.DataAdapter.getRegions();
    const currentGen = state.gen;

    let html = '';
    let activeRegionName = 'Todas las Regiones (966)';

    for (const r of regions) {
      const isAll = r.id === 'all';
      const isActive = (isAll && currentGen === 'all') || (!isAll && currentGen === String(r.gen));
      if (isActive) {
        activeRegionName = isAll ? `Todas las Regiones (966)` : `${r.name} · Gen ${r.gen} (${r.dexRange})`;
      }

      html += `
        <button class="region-tab ${isActive ? 'active' : ''}" data-region-gen="${r.gen}" title="${r.name} (${r.dexRange})">
          <span class="region-tab-icon">${r.icon}</span>
          <span class="region-tab-name">${r.name}</span>
          <span class="region-tab-dex">${r.dexRange}</span>
          <span class="region-tab-count">${r.count}</span>
        </button>
      `;
    }

    elRegionFilters.innerHTML = html;
    if (elRegionActiveBadge) {
      elRegionActiveBadge.textContent = activeRegionName;
    }

    elRegionFilters.querySelectorAll('[data-region-gen]').forEach(btn => {
      btn.onclick = () => {
        const gen = btn.dataset.regionGen;
        currentPage = 1;
        Analyzer.Filters.set('gen', gen);
        renderFilterControls();
        playSfx('select');
      };
    });
  }

  /**
   * Renderiza botones de chips para tipo, regiones y categorías
   */
  function renderFilterControls() {
    const state = Analyzer.Filters.getState();

    // 1. Selector de Regiones Separadas
    renderRegionTabs();

    // 2. Indicadores de Orden Rápido
    updateQuickSortButtons();

    // 3. Chips de Tipos Elementales
    const types = Object.keys(G.U.TYPE_COLOR || {});
    let typeHtml = `<button class="chip ${state.type === 'all' ? 'active' : ''}" data-type="all">Todos los Tipos</button>`;
    for (const t of types) {
      const col = G.U.TYPE_COLOR[t];
      const name = G.U.TYPE_NAME[t] || t;
      const isActive = state.type === t ? 'active' : '';
      typeHtml += `<button class="chip ${isActive}" data-type="${t}" style="--chip-col:${col}">
        <span class="type-dot" style="background:${col}"></span>${name}
      </button>`;
    }
    elTypeFilters.innerHTML = typeHtml;
    elTypeFilters.querySelectorAll('[data-type]').forEach(btn => {
      btn.onclick = () => {
        currentPage = 1;
        Analyzer.Filters.set('type', btn.dataset.type);
        renderFilterControls();
        playSfx('select');
      };
    });

    // 4. Chips de Categoría
    const cats = [
      { id: 'all', label: 'Todas las Categorías' },
      { id: 'starter', label: 'Iniciales (29)' },
      { id: 'shiny', label: 'Con Shiny (958)' },
      { id: 'legendary', label: 'Legendarios (87)' },
      { id: 'hover', label: 'Flotantes / Voladores' },
      { id: 'boss', label: 'Candidatos a Jefe' }
    ];
    let catHtml = '';
    for (const c of cats) {
      const isActive = state.category === c.id ? 'active' : '';
      catHtml += `<button class="chip ${isActive}" data-cat="${c.id}">${c.label}</button>`;
    }
    elCatFilters.innerHTML = catHtml;
    elCatFilters.querySelectorAll('[data-cat]').forEach(btn => {
      btn.onclick = () => {
        currentPage = 1;
        Analyzer.Filters.set('category', btn.dataset.cat);
        renderFilterControls();
        playSfx('select');
      };
    });
  }

  /**
   * Renderiza las barras de paginación superior e inferior
   */
  function renderPagination(totalItems, totalPages) {
    if (!elTopPagination || !elBottomPagination) return;

    if (totalItems <= pageSize || pageSize === 'all') {
      elTopPagination.style.display = 'none';
      elBottomPagination.style.display = 'none';
      return;
    }

    elTopPagination.style.display = 'flex';
    elBottomPagination.style.display = 'flex';

    // Generar botones de páginas inteligentes (ej: 1, 2, 3 ... 10)
    let pagesHtml = '';
    const maxVisibleButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    if (startPage > 1) {
      pagesHtml += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        pagesHtml += `<span class="page-btn ellipsis">...</span>`;
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const isActive = p === currentPage ? 'active' : '';
      pagesHtml += `<button class="page-btn ${isActive}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pagesHtml += `<span class="page-btn ellipsis">...</span>`;
      }
      pagesHtml += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    const navHtml = `
      <button class="pagination-btn" data-page="first" ${currentPage === 1 ? 'disabled' : ''} title="Primera Página">⏮ Primera</button>
      <button class="pagination-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''} title="Página Anterior">◀ Anterior</button>
      <div class="pagination-pages">
        ${pagesHtml}
      </div>
      <button class="pagination-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''} title="Página Siguiente">Siguiente ▶</button>
      <button class="pagination-btn" data-page="last" ${currentPage === totalPages ? 'disabled' : ''} title="Última Página">Última ⏭</button>
      <span class="pagination-info">Pág. ${currentPage} de ${totalPages}</span>
    `;

    elTopPagination.innerHTML = navHtml;
    elBottomPagination.innerHTML = navHtml;

    // Vincular clics de navegación
    [elTopPagination, elBottomPagination].forEach(bar => {
      bar.querySelectorAll('[data-page]').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          const target = btn.dataset.page;
          let newPage = currentPage;
          if (target === 'first') newPage = 1;
          else if (target === 'prev') newPage = Math.max(1, currentPage - 1);
          else if (target === 'next') newPage = Math.min(totalPages, currentPage + 1);
          else if (target === 'last') newPage = totalPages;
          else newPage = parseInt(target, 10);

          if (newPage !== currentPage) {
            currentPage = newPage;
            renderCatalog();
            playSfx('select');
            
            // Si el clic fue en la barra inferior, scroll suave al catálogo
            if (bar === elBottomPagination) {
              const catalogTop = document.getElementById('catalog-section');
              if (catalogTop) {
                catalogTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }
        };
      });
    });
  }

  /**
   * Renderiza la vista principal del catálogo según el modo seleccionado
   */
  function renderCatalog() {
    const all = Analyzer.DataAdapter.getAll();
    const filtered = Analyzer.Filters.apply(all);

    const totalItems = filtered.length;
    const effectivePageSize = pageSize === 'all' ? totalItems : pageSize;
    const totalPages = effectivePageSize > 0 ? Math.max(1, Math.ceil(totalItems / effectivePageSize)) : 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * effectivePageSize;
    const endIdx = Math.min(startIdx + effectivePageSize, totalItems);

    if (totalItems === 0) {
      elCount.textContent = `0 Pokémon encontrados`;
    } else if (pageSize === 'all') {
      elCount.textContent = `Mostrando todos los ${totalItems} Pokémon`;
    } else {
      elCount.textContent = `Mostrando ${startIdx + 1} - ${endIdx} de ${totalItems} Pokémon (Pág. ${currentPage}/${totalPages})`;
    }

    // Renderizar paginadores
    renderPagination(totalItems, totalPages);

    // CRÍTICO PARA FLUIDEZ: Limpiar animadores previos de la memoria
    activeCanvasAnimators.clear();

    if (totalItems === 0) {
      elGrid.innerHTML = `
        <div class="empty-results-box">
          <div class="empty-icon">${Analyzer.Icons.get('search', { size: 40 })}</div>
          <h3>Ningún Pokémon coincide con los filtros</h3>
          <p class="sub">Prueba modificando la búsqueda por texto, reduciendo los umbrales de estadísticas o limpiando los filtros seleccionados.</p>
          <button class="btn gold" onclick="Analyzer.App.resetAllFilters()">Restablecer Filtros y Estadísticas</button>
        </div>
      `;
      return;
    }

    const pageItems = pageSize === 'all' ? filtered : filtered.slice(startIdx, endIdx);

    if (viewMode === 'table') {
      renderTableView(pageItems);
    } else {
      renderCardsView(pageItems);
    }
  }

  /**
   * Vista de Tarjetas ricas con sprite animado y stats
   */
  function renderCardsView(list) {
    elGrid.className = 'catalog-grid cards-mode';
    elGrid.innerHTML = '';

    // Renderizar lote inicial para rendimiento
    const frag = document.createDocumentFragment();

    list.forEach(p => {
      const isSelected = Analyzer.Comparison.isSelected(p.dex);
      const card = document.createElement('article');
      card.className = `mon-card ${isSelected ? 'in-comparison' : ''}`;
      card.dataset.dex = p.dex;

      // Color temático primario
      const primaryCol = G.U.TYPE_COLOR[p.primaryType] || '#4b9bff';
      card.style.setProperty('--card-type-color', primaryCol);

      // Badges
      const badges = [];
      badges.push(`<span class="card-badge region" title="Región ${p.genName}">${p.genName}</span>`);
      if (p.isStarter) badges.push('<span class="card-badge starter" title="Compañero inicial">Inicial</span>');
      if (p.isLegendary) badges.push('<span class="card-badge leg" title="Legendario de grieta">Legendario</span>');
      if (p.sprite.hovers) badges.push('<span class="card-badge hover" title="Flota sobre el suelo">Flota</span>');
      if (p.sprite.hasShiny) badges.push(`<span class="card-badge shiny" title="Versión shiny disponible">${Analyzer.Icons.get('sparkles', { size: 10 })} Shiny</span>`);

      // Chips de tipo
      const typesHtml = p.types.map(t =>
        `<span class="type-pill" style="background:${G.U.TYPE_COLOR[t]}">${G.U.TYPE_NAME[t] || t}</span>`
      ).join('');

      card.innerHTML = `
        <div class="card-header">
          <span class="card-dex-no">#${String(p.dex).padStart(3, '0')}</span>
          <div class="card-badges">${badges.join('')}</div>
        </div>

        <div class="card-sprite-stage">
          <canvas class="card-sprite-canvas" width="124" height="104"></canvas>
        </div>

        <div class="card-info">
          <h3 class="card-name" title="${p.name}">${p.name}</h3>
          <div class="card-types">${typesHtml}</div>
          <div class="card-rarity" style="color:${p.availability.rarityColor}">
            ${G.UI.stars(p.rarity, 14)} <small>${p.availability.rarityName}</small>
          </div>
        </div>

        <div class="card-stats-preview game-stat-layout">
          <div class="card-stat-row" title="Vida en combate: ${p.hp} HP (Máx. en juego ~185)">
            <span class="stat-label">Vida</span>
            <div class="stat-bar-track"><i style="width:${Math.min(100, (p.hp / 185) * 100)}%"></i></div>
            <span class="stat-val">${p.hp}</span>
          </div>
          <div class="card-stat-row ${p.side === 'physical' ? 'primary-side' : ''}" title="Ataque Físico: ×${p.pa.toFixed(2)}${p.side === 'physical' ? ' (Lado ofensivo principal)' : ''}">
            <span class="stat-label">Ataque</span>
            <div class="stat-bar-track"><i style="width:${Math.min(100, (p.pa / 1.65) * 100)}%"></i></div>
            <span class="stat-val">×${p.pa.toFixed(2)}</span>
          </div>
          <div class="card-stat-row ${p.side === 'special' ? 'primary-side' : ''}" title="Ataque Especial: ×${p.sa.toFixed(2)}${p.side === 'special' ? ' (Lado ofensivo principal)' : ''}">
            <span class="stat-label">At. Esp.</span>
            <div class="stat-bar-track"><i style="width:${Math.min(100, (p.sa / 1.65) * 100)}%"></i></div>
            <span class="stat-val">×${p.sa.toFixed(2)}</span>
          </div>
          <div class="card-stat-row" title="Defensa Física: ${p.df} (${p.mitigationPhysical >= 0 ? '+' : ''}${p.mitigationPhysical}% mitigación de daño físico)">
            <span class="stat-label">Defensa</span>
            <div class="stat-bar-track"><i style="width:${Math.min(100, (p.df / 230) * 100)}%"></i></div>
            <span class="stat-val">${p.df}</span>
          </div>
          <div class="card-stat-row" title="Defensa Especial: ${p.sd} (${p.mitigationSpecial >= 0 ? '+' : ''}${p.mitigationSpecial}% mitigación de daño especial)">
            <span class="stat-label">Def. Esp.</span>
            <div class="stat-bar-track"><i style="width:${Math.min(100, (p.sd / 230) * 100)}%"></i></div>
            <span class="stat-val">${p.sd}</span>
          </div>
          <div class="card-stat-row" title="Velocidad de movimiento en combate: ${p.spd} SPD">
            <span class="stat-label">Velocidad</span>
            <div class="stat-bar-track"><i style="width:${Math.min(100, (p.spd / 162) * 100)}%"></i></div>
            <span class="stat-val">${p.spd}</span>
          </div>
          <div class="card-side-note">
            Pega mejor con ataques <b class="gold">${p.side === 'special' ? 'especiales' : 'físicos'}</b>
          </div>
        </div>

        <div class="card-score-banner metric-has-tooltip" title="Rendimiento Global (${p.performance.overall}/100): Media ponderada de las 6 dimensiones tácticas (Ofensiva, Supervivencia, Movilidad, Control, Flexibilidad y Jefes). Haz clic en 'Ficha' para ver el desglose completo.">
          <span class="score-label">Rendimiento <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 12 })}</span>:</span>
          <span class="score-val">${p.performance.overall}/100</span>
        </div>

        <div class="card-actions">
          <button class="btn small btn-dossier" data-action="dossier">Ficha</button>
          <button class="btn small btn-compare ${isSelected ? 'active' : 'gold'}" data-action="compare">
            ${isSelected ? Analyzer.Icons.get('check', { size: 12 }) + ' Comparando' : '+ Comparar'}
          </button>
        </div>
      `;

      // Inicializar sprite en canvas
      const cv = card.querySelector('.card-sprite-canvas');
      registerCanvasSprite(cv, p.dex, { scale: 2, shadow: true });

      // Eventos
      card.querySelector('[data-action=dossier]').onclick = e => {
        e.stopPropagation();
        openModal(p.dex);
      };

      card.querySelector('[data-action=compare]').onclick = e => {
        e.stopPropagation();
        Analyzer.Comparison.toggle(p.dex);
        playSfx('select');
      };

      card.onclick = () => openModal(p.dex);

      frag.appendChild(card);
    });

    elGrid.appendChild(frag);
  }

  /**
   * Vista compacta tipo lista de filas
   */
  function renderCompactView(list) {
    elGrid.className = 'catalog-grid compact-mode';
    elGrid.innerHTML = '';

    const frag = document.createDocumentFragment();

    list.forEach(p => {
      const isSelected = Analyzer.Comparison.isSelected(p.dex);
      const row = document.createElement('div');
      row.className = `compact-row ${isSelected ? 'in-comparison' : ''}`;
      row.dataset.dex = p.dex;

      const typesHtml = p.types.map(t =>
        `<span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[t]}">${G.U.TYPE_NAME[t] || t}</span>`
      ).join('');

      row.innerHTML = `
        <span class="col-dex">#${String(p.dex).padStart(3, '0')}</span>
        <canvas class="compact-sprite-cv" width="48" height="48"></canvas>
        <span class="col-name"><b>${p.name}</b> <small class="tag-region">${p.genName}</small></span>
        <div class="col-types">${typesHtml}</div>
        <span class="col-stat" title="Salud"><b>${p.hp}</b> <small>HP</small></span>
        <span class="col-stat" title="Velocidad"><b>${p.spd}</b> <small>SPD</small></span>
        <span class="col-stat" title="Ataque"><b>×${p.atk.toFixed(2)}</b> <small>ATK</small></span>
        <span class="col-score metric-has-tooltip" title="Rendimiento Global (${p.performance.overall}/100): Media ponderada de todas las dimensiones tácticas"><b>${p.performance.overall}</b> <span class="metric-info-icon" style="font-size:10px">${Analyzer.Icons.get('info', { size: 10 })}</span></span>
        <div class="col-actions">
          <button class="btn small btn-compare ${isSelected ? 'active' : 'gold'}" data-action="compare">
            ${isSelected ? Analyzer.Icons.get('check', { size: 11 }) : '+ Comparar'}
          </button>
        </div>
      `;

      registerCanvasSprite(row.querySelector('canvas'), p.dex, { scale: 1.5, shadow: false });

      row.querySelector('[data-action=compare]').onclick = e => {
        e.stopPropagation();
        Analyzer.Comparison.toggle(p.dex);
        playSfx('select');
      };

      row.onclick = () => openModal(p.dex);

      frag.appendChild(row);
    });

    elGrid.appendChild(frag);
  }

  /**
   * Vista de Tabla Completa con ordenamiento de columnas
   */
  function renderTableView(list) {
    elGrid.className = 'catalog-grid table-mode';

    let tableHtml = `
      <div class="table-container">
        <table class="analyzer-table">
          <thead>
            <tr>
              <th data-sort="dex" title="Ordenar por Pokédex">#</th>
              <th>Sprite</th>
              <th data-sort="name" title="Ordenar por Nombre">Nombre</th>
              <th data-sort="gen" title="Ordenar por Región">Región</th>
              <th>Tipos</th>
              <th data-sort="hp" title="Ordenar por Salud (HP)">Vida</th>
              <th data-sort="spd" title="Ordenar por Velocidad (SPD)">Velocidad</th>
              <th data-sort="atk" title="Ataque Dominante">ATK</th>
              <th data-sort="pa" title="Ataque Físico">PA</th>
              <th data-sort="sa" title="Ataque Especial">SA</th>
              <th data-sort="df" title="Defensa Física">DF</th>
              <th data-sort="sd" title="Defensa Especial">SD</th>
              <th data-sort="bst" title="Ordenar por BST Total">BST</th>
              <th>Mov. Inicial</th>
              <th>Movs</th>
              <th data-sort="performance" title="Ordenar por Rendimiento">Rendimiento</th>
              <th>Comparar</th>
            </tr>
          </thead>
          <tbody>
    `;

    list.forEach(p => {
      const isSelected = Analyzer.Comparison.isSelected(p.dex);
      const typesHtml = p.types.map(t =>
        `<span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[t]}">${G.U.TYPE_NAME[t] || t}</span>`
      ).join(' ');

      tableHtml += `
        <tr class="${isSelected ? 'in-comparison' : ''}" data-dex="${p.dex}">
          <td>#${String(p.dex).padStart(3, '0')}</td>
          <td style="width:50px"><canvas class="tbl-sprite" data-dex="${p.dex}" width="40" height="40"></canvas></td>
          <td><b>${p.name}</b> ${p.isStarter ? '<small class="tag-st">Inicial</small>' : ''}</td>
          <td><span class="tag-region">${p.genName}</span></td>
          <td>${typesHtml}</td>
          <td><b>${p.hp}</b></td>
          <td><b>${p.spd}</b></td>
          <td><b class="gold">×${p.atk.toFixed(2)}</b> <small title="Lado fuerte: ${p.sideName}">(${p.side === 'special' ? Analyzer.Icons.get('special', { size: 12 }) : Analyzer.Icons.get('physical', { size: 12 })})</small></td>
          <td>×${p.pa.toFixed(2)}</td>
          <td>×${p.sa.toFixed(2)}</td>
          <td title="Mitigación: ${p.mitigationPhysical >= 0 ? '+' : ''}${p.mitigationPhysical}%">${p.df}</td>
          <td title="Mitigación: ${p.mitigationSpecial >= 0 ? '+' : ''}${p.mitigationSpecial}%">${p.sd}</td>
          <td>${p.bst}</td>
          <td><span class="gold">${p.moves.startMove ? p.moves.startMove.name : 'N/A'}</span></td>
          <td>${p.moves.totalMoves}</td>
          <td class="metric-has-tooltip" title="Rendimiento Global (${p.performance.overall}/100): Media ponderada de todas las dimensiones tácticas"><b class="gold">${p.performance.overall}</b>/100 <span class="metric-info-icon" style="font-size:10px">${Analyzer.Icons.get('info', { size: 10 })}</span></td>
          <td>
            <button class="btn small btn-compare ${isSelected ? 'active' : 'gold'}" data-action="compare">
              ${isSelected ? Analyzer.Icons.get('check', { size: 11 }) + ' Quitar' : '+ Añadir'}
            </button>
          </td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table></div>`;
    elGrid.innerHTML = tableHtml;

    // Inicializar canvas de tabla
    elGrid.querySelectorAll('.tbl-sprite').forEach(cv => {
      registerCanvasSprite(cv, +cv.dataset.dex, { scale: 1.2, shadow: false });
    });

    // Eventos de tabla
    elGrid.querySelectorAll('tbody tr').forEach(row => {
      const dex = +row.dataset.dex;
      row.onclick = () => openModal(dex);
      const btn = row.querySelector('[data-action=compare]');
      if (btn) {
        btn.onclick = e => {
          e.stopPropagation();
          Analyzer.Comparison.toggle(dex);
          playSfx('select');
        };
      }
    });

    // Click en cabeceras para ordenar
    elGrid.querySelectorAll('th[data-sort]').forEach(th => {
      th.style.cursor = 'pointer';
      th.onclick = () => {
        const key = th.dataset.sort;
        const currentSort = Analyzer.Filters.getState().sortBy;
        const currentDir = Analyzer.Filters.getState().sortDir;
        let nextDir = 'desc';
        if (currentSort === key) {
          nextDir = currentDir === 'desc' ? 'asc' : 'desc';
        } else {
          nextDir = (key === 'dex' || key === 'name' || key === 'gen') ? 'asc' : 'desc';
        }
        currentPage = 1;
        Analyzer.Filters.setMultiple({ sortBy: key, sortDir: nextDir });
        if (elSortBy) elSortBy.value = key;
        if (elSortDir) elSortDir.textContent = nextDir === 'asc' ? '▲ Asc' : '▼ Desc';
        updateQuickSortButtons();
        playSfx('select');
      };
    });
  }

  function updateGridSelectionState() {
    const selectedDexes = Analyzer.Comparison.getSelectedDexes();
    document.querySelectorAll('[data-dex]').forEach(el => {
      const dex = +el.dataset.dex;
      const isSel = selectedDexes.includes(dex);
      el.classList.toggle('in-comparison', isSel);
      const btn = el.querySelector('[data-action=compare]');
      if (btn) {
        btn.classList.toggle('active', isSel);
        btn.classList.toggle('gold', !isSel);
        if (viewMode === 'table') {
          btn.innerHTML = isSel ? `${Analyzer.Icons.get('check', { size: 11 })} Quitar` : '+ Añadir';
        } else {
          btn.innerHTML = isSel ? `${Analyzer.Icons.get('check', { size: 12 })} Comparando` : '+ Comparar';
        }
      }
    });
  }

  /**
   * Renderiza la bandeja inferior flotante con la selección actual
   */
  function renderTray(selectedList) {
    const navCountBadge = document.getElementById('nav-compare-count');
    if (navCountBadge) {
      navCountBadge.textContent = selectedList.length;
      navCountBadge.style.display = selectedList.length > 0 ? 'inline-block' : 'none';
    }

    if (selectedList.length === 0 || activeTab === 'comparison') {
      elTray.classList.add('hidden');
      return;
    }

    elTray.classList.remove('hidden');
    elTrayCompareBtn.textContent = `Comparar (${selectedList.length}/${Analyzer.Comparison.MAX_SELECTION})`;

    let html = '';
    for (let i = 0; i < Analyzer.Comparison.MAX_SELECTION; i++) {
      const p = selectedList[i];
      if (p) {
        html += `
          <div class="tray-slot filled" title="${p.name} (haz clic para quitar)" onclick="Analyzer.Comparison.remove(${p.dex})">
            <span class="tray-remove-x">×</span>
            <canvas class="tray-slot-cv" data-dex="${p.dex}" width="42" height="42"></canvas>
            <span class="tray-slot-name">${p.name}</span>
          </div>
        `;
      } else {
        html += `
          <div class="tray-slot empty">
            <span class="slot-number">${i + 1}</span>
            <span class="slot-hint">Vacío</span>
          </div>
        `;
      }
    }

    elTrayItems.innerHTML = html;

    // Inicializar canvas de la bandeja
    elTrayItems.querySelectorAll('.tray-slot-cv').forEach(cv => {
      registerCanvasSprite(cv, +cv.dataset.dex, { scale: 1.4, shadow: false });
    });
  }

  /**
  /* =========================================================================
   * PODIO TÁCTICO Y LIGHTBOX DE GRÁFICOS EXPANDIDOS
   * ========================================================================= */
  const PODIUM_METRICS = {
    overall: {
      label: 'Rendimiento Global',
      short: 'Overall',
      max: 100,
      getValue: p => p.performance.overall,
      fmt: v => `${v}/100 pts`
    },
    hp: {
      label: 'Salud Base (HP)',
      short: 'HP',
      max: 185,
      getValue: p => p.hp,
      fmt: v => `${v} HP`
    },
    atk: {
      label: 'Ataque Dominante (ATK)',
      short: 'ATK',
      max: 1.70,
      getValue: p => p.atk,
      fmt: (v, p) => `×${v.toFixed(2)} (${p.sideName || 'Ofensivo'})`
    },
    pa: {
      label: 'Ataque Físico (PA)',
      short: 'PA',
      max: 1.70,
      getValue: p => p.pa,
      fmt: v => `×${v.toFixed(2)}`
    },
    sa: {
      label: 'Ataque Especial (SA)',
      short: 'SA',
      max: 1.70,
      getValue: p => p.sa,
      fmt: v => `×${v.toFixed(2)}`
    },
    def: {
      label: 'Defensas Totales (DF + SD)',
      short: 'Defensas',
      max: 460,
      getValue: p => p.df + p.sd,
      fmt: (v, p) => `${v} (DF: ${p.df} / SD: ${p.sd})`
    },
    spd: {
      label: 'Velocidad de Movimiento',
      short: 'SPD',
      max: 162,
      getValue: p => p.spd,
      fmt: v => `${v} SPD`
    },
    bst: {
      label: 'Total Base (BST)',
      short: 'BST',
      max: 720,
      getValue: p => p.bst,
      fmt: v => `${v} BST`
    },
    boss: {
      label: 'Eficacia Vs Jefes',
      short: 'Vs Jefes',
      max: 100,
      getValue: p => p.performance.boss,
      fmt: v => `${v}/100 pts`
    },
    control: {
      label: 'Control de Hordas',
      short: 'Control',
      max: 100,
      getValue: p => p.performance.control,
      fmt: v => `${v}/100 pts`
    }
  };

  /**
   * Renderiza el Podio Táctico y Ranking interactivo por métrica
   */
  function renderPodium(selectedList, metricKey = 'overall') {
    if (!elPodiumStage || !elPodiumList) return;

    if (!selectedList || selectedList.length === 0) {
      elPodiumStage.innerHTML = '<div class="podium-empty-note">Selecciona al menos 1 Pokémon para ver el análisis y podio táctico.</div>';
      elPodiumList.innerHTML = '';
      return;
    }

    const effectiveList = selectedList.map(p => (Analyzer.Loadout ? Analyzer.Loadout.effective(p) : p));
    const metric = PODIUM_METRICS[metricKey] || PODIUM_METRICS.overall;

    // Calcular valores y ordenar de mayor a menor
    const ranked = effectiveList.map((p, originalIdx) => {
      const val = metric.getValue(p);
      const color = Analyzer.Charts.COMPARISON_COLORS[originalIdx % Analyzer.Charts.COMPARISON_COLORS.length];
      return {
        pokemon: p,
        val: val,
        formatted: metric.fmt(val, p),
        color: color,
        originalIdx: originalIdx
      };
    }).sort((a, b) => b.val - a.val);

    const maxVal = Math.max(...ranked.map(r => r.val), 0.001);

    // Configurar pedestales según cantidad (1, 2, 3 o 4)
    // 1: [1º (Oro, centro amplio)]
    // 2: [1º (Oro, izq), 2º (Plata, der)]
    // 3 o 4: [2º (Plata, izq), 1º (Oro, centro), 3º (Bronce, der)]
    let podiumItems = [];
    if (ranked.length === 1) {
      podiumItems = [
        { rank: 1, item: ranked[0], orderClass: 'podium-first podium-single' }
      ];
    } else if (ranked.length === 2) {
      podiumItems = [
        { rank: 1, item: ranked[0], orderClass: 'podium-first' },
        { rank: 2, item: ranked[1], orderClass: 'podium-second' }
      ];
    } else {
      podiumItems = [
        { rank: 2, item: ranked[1], orderClass: 'podium-second' },
        { rank: 1, item: ranked[0], orderClass: 'podium-first' },
        { rank: 3, item: ranked[2], orderClass: 'podium-third' }
      ];
    }

    const fourthItem = ranked.length >= 4 ? ranked[3] : null;

    // Renderizar escenario de pedestales
    const stageHtml = `
      <div class="podium-pedestals-row count-${podiumItems.length}">
        ${podiumItems.map(p => {
          const r = p.item;
          const pk = r.pokemon;
          const medalIcon = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉';
          const medalClass = p.rank === 1 ? 'gold-rank' : p.rank === 2 ? 'silver-rank' : 'bronze-rank';
          const crownHtml = p.rank === 1 ? '<div class="podium-crown-badge" title="Campeón">👑 1º Puesto</div>' : `<div class="podium-rank-badge ${medalClass}">${medalIcon} ${p.rank}º Puesto</div>`;

          return `
            <div class="podium-pedestal-col ${p.orderClass}" style="--poke-accent:${r.color.stroke}">
              <div class="podium-character-wrap">
                ${crownHtml}
                <div class="podium-sprite-container" onclick="Analyzer.App.openModal(${pk.dex})" title="Ver Ficha de ${pk.name}">
                  <canvas class="podium-sprite-cv" data-dex="${pk.dex}" width="80" height="80"></canvas>
                </div>
                <div class="podium-char-name" onclick="Analyzer.App.openModal(${pk.dex})" title="${pk.name}">${pk.name}</div>
                <div class="podium-stat-pill" style="border-color:${r.color.stroke}">
                  <span class="stat-pill-metric">${r.formatted}</span>
                </div>
              </div>
              <div class="podium-step-block ${medalClass}">
                <div class="step-face-top"></div>
                <div class="step-face-front">
                  <span class="step-rank-number">${p.rank}</span>
                  <span class="step-label">${p.rank === 1 ? 'ORO' : p.rank === 2 ? 'PLATA' : 'BRONCE'}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${fourthItem ? `
        <div class="podium-fourth-card" style="--poke-accent:${fourthItem.color.stroke}">
          <div class="fourth-left">
            <span class="podium-rank-badge mention-rank">🏅 4º Puesto</span>
            <canvas class="podium-sprite-cv" data-dex="${fourthItem.pokemon.dex}" width="42" height="42"></canvas>
            <div>
              <b class="fourth-name" onclick="Analyzer.App.openModal(${fourthItem.pokemon.dex})">${fourthItem.pokemon.name}</b>
              <div style="font-size:11px; color:var(--muted)">Mención Honorífica</div>
            </div>
          </div>
          <div class="fourth-right">
            <b style="color:var(--poke-accent)">${fourthItem.formatted}</b>
          </div>
        </div>
      ` : ''}
    `;

    elPodiumStage.innerHTML = stageHtml;

    // Renderizar desglose de lista comparativa
    const listHtml = `
      <div class="podium-list-header">
        <span>Clasificación · ${metric.label}</span>
        <small style="color:var(--muted)">Máx: ${metric.fmt(maxVal, ranked[0].pokemon)}</small>
      </div>
      <div class="podium-list-items">
        ${ranked.map((r, idx) => {
          const rankNum = idx + 1;
          const pk = r.pokemon;
          const pct = Math.max(8, Math.min(100, (r.val / maxVal) * 100));
          const medalEmoji = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : '🏅';
          const typePill = pk.types.map(t => `<span class="type-pill-micro" style="background:${G.U.TYPE_COLOR[t]}">${G.U.TYPE_NAME[t] || t}</span>`).join(' ');

          return `
            <div class="podium-list-row" onclick="Analyzer.App.openModal(${pk.dex})">
              <span class="podium-row-rank">${medalEmoji} #${rankNum}</span>
              <div class="podium-row-info">
                <div class="podium-row-title-row">
                  <b class="podium-row-name">${pk.name}</b>
                  <span class="podium-row-types">${typePill}</span>
                  <span class="podium-row-val" style="color:${r.color.stroke}">${r.formatted}</span>
                </div>
                <div class="podium-progress-track">
                  <div class="podium-progress-fill" style="width:${pct.toFixed(1)}%; background: linear-gradient(90deg, ${r.color.fill}, ${r.color.stroke});"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    elPodiumList.innerHTML = listHtml;

    // Registrar sprites en canvas del podio
    elPodiumStage.querySelectorAll('.podium-sprite-cv').forEach(cv => {
      registerCanvasSprite(cv, +cv.dataset.dex, { scale: 1.8, shadow: true });
    });
  }

  const CHART_EXPAND_INFO = {
    radar: {
      title: 'Radar Hexagonal Táctico (6 Dimensiones)',
      desc: 'Evalúa el balance holístico de cada personaje en las 6 dimensiones fundamentales del juego: Ofensiva, Supervivencia, Movilidad, Control de masas, Flexibilidad estratégica y Eficacia contra jefes. Pasa el cursor por los nodos para inspeccionar las notas tácticas.'
    },
    bars: {
      title: 'Comparativa de Estadísticas Reales de Combate',
      desc: 'Contraste métrico directo de Salud Base (HP), Velocidad (SPD), Ataques Físico y Especial (ATK, PA, SA) y Defensas (DF, SD) normalizados según los techos del motor de combate.'
    },
    donut: {
      title: 'Cuota de Poder Acumulado y Balance de Escuadra (Donut / BST)',
      desc: 'Distribución porcentual de cada Pokémon en la suma total de BST de la escuadra actual. En el centro se indica el BST promedio del grupo para evaluar la paridad de poder.'
    },
    matrix: {
      title: 'Matriz Cartesiana de Posicionamiento Táctico',
      desc: 'Mapeo bidimensional: Eje X (Supervivencia y Aguante) vs Eje Y (Potencia Ofensiva y Daño). Los 4 cuadrantes definen los arquetipos: Glass Cannon, Titán All-Rounder, Muralla Tanque y Scout Hostigador.'
    }
  };

  /**
   * Abre el modal lightbox para ver un gráfico en alta resolución
   */
  function openExpandedChart(chartType = 'radar') {
    currentExpandedType = chartType;
    if (!elChartExpandModal || !elExpandedCanvas) return;

    const info = CHART_EXPAND_INFO[chartType] || CHART_EXPAND_INFO.radar;
    if (elChartExpandTitle) elChartExpandTitle.textContent = info.title;
    if (elChartExpandDesc) elChartExpandDesc.textContent = info.desc;

    const selectedList = Analyzer.Comparison.getSelected().map(p => (Analyzer.Loadout ? Analyzer.Loadout.effective(p) : p));
    if (selectedList.length === 0) return;

    if (elChartExpandLegend) {
      elChartExpandLegend.innerHTML = selectedList.map((p, idx) => {
        const col = Analyzer.Charts.COMPARISON_COLORS[idx % Analyzer.Charts.COMPARISON_COLORS.length];
        return `
          <div class="legend-item" style="--leg-col:${col.stroke}">
            <span class="leg-color-bar" style="background:${col.stroke}"></span>
            <b>${p.name}</b>
            <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[p.types[0]]}">${G.U.TYPE_NAME[p.types[0]] || p.types[0]}</span>
            <small>(${p.performance.overall}/100)</small>
          </div>
        `;
      }).join('');
    }

    elChartExpandModal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    setTimeout(() => {
      Analyzer.Charts.drawExpanded(elExpandedCanvas, chartType, selectedList);
    }, 20);

    playSfx('select');
  }

  /**
   * Cierra el modal lightbox del gráfico expandido
   */
  function closeExpandedChart() {
    const tip = document.querySelector('.chart-hover-tooltip');
    if (tip) tip.classList.remove('visible');
    if (elChartExpandModal) {
      elChartExpandModal.classList.add('hidden');
    }
    if (!elModal || elModal.classList.contains('hidden')) {
      document.body.classList.remove('modal-open');
    }
    playSfx('click');
  }

  /**
   * Renderiza la sección completa de comparación en columnas
   */
  function renderComparison(selectedList) {
    if (!elComparisonSection) return;

    if (!selectedList || selectedList.length === 0) {
      elComparisonSection.classList.add('empty-state');
      document.getElementById('comparison-content').innerHTML = `
        <div class="empty-comparison-prompt">
          <h3>Selecciona entre 1 y 4 Pokémon para analizar o comparar</h3>
          <p class="sub">Pulsa el botón <b>+ Comparar</b> en cualquier tarjeta del catálogo para contrastar atributos, movimientos y fortalezas.</p>
          <div class="comparison-quick-picks">
            <span>Sugerencias rápidas:</span>
            <button class="btn small" onclick="Analyzer.Comparison.setSelection([1])">Bulbasaur (Individual)</button>
            <button class="btn small" onclick="Analyzer.Comparison.setSelection([1, 4, 7])">Trío Inicial Kanto</button>
            <button class="btn small" onclick="Analyzer.Comparison.setSelection([25, 133, 94])">Pikachu vs Eevee vs Gengar</button>
            <button class="btn small" onclick="Analyzer.Comparison.setSelection([150, 493])">Mewtwo vs Arceus</button>
          </div>
        </div>
      `;
      [elRadarCanvas, elBarsCanvas, elDonutCanvas, elMatrixCanvas].forEach(cv => {
        if (cv) {
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, cv.width, cv.height);
          cv._hits = [];
        }
      });
      if (elPodiumStage) elPodiumStage.innerHTML = '<div class="podium-empty-note">Selecciona al menos 1 Pokémon para ver el análisis y podio táctico.</div>';
      if (elPodiumList) elPodiumList.innerHTML = '';
      return;
    }

    elComparisonSection.classList.remove('empty-state');

    // 1. Dibujar los 4 Gráficos (con el objeto equipado de cada Pokémon aplicado)
    const chartList = selectedList.map(p => Analyzer.Loadout.effective(p));
    if (elRadarCanvas) Analyzer.Charts.drawRadar(elRadarCanvas, chartList);
    if (elBarsCanvas) Analyzer.Charts.drawBars(elBarsCanvas, chartList);
    if (elDonutCanvas) Analyzer.Charts.drawDonut(elDonutCanvas, chartList);
    if (elMatrixCanvas) Analyzer.Charts.drawMatrix(elMatrixCanvas, chartList);

    // 2. Renderizar Leyenda de Jugadores / Pokémon
    const legendEl = document.getElementById('radar-legend');
    if (legendEl) {
      legendEl.innerHTML = chartList.map((p, idx) => {
        const col = Analyzer.Charts.COMPARISON_COLORS[idx % Analyzer.Charts.COMPARISON_COLORS.length];
        return `
          <div class="legend-item" style="--leg-col:${col.stroke}">
            <span class="leg-color-bar" style="background:${col.stroke}"></span>
            <b>${p.name}</b>
            <small>(${p.performance.overall}/100)</small>
          </div>
        `;
      }).join('');
    }

    // 3. Renderizar Podio Táctico Dinámico por Métrica Seleccionada
    renderPodium(selectedList, currentPodiumMetric);

    // 4. Si el modal lightbox de expansión está abierto, actualizarlo en vivo
    if (elChartExpandModal && !elChartExpandModal.classList.contains('hidden') && elExpandedCanvas) {
      Analyzer.Charts.drawExpanded(elExpandedCanvas, currentExpandedType, chartList);
    }

    // 5. Renderizar Columnas de Comparación Alineadas
    const container = document.getElementById('comparison-content');
    const basePokemon = selectedList[0];
    const metricDefs = Analyzer.DataAdapter.getMetricDefinitions();

    let colsHtml = `<div class="comparison-columns count-${selectedList.length}">`;

    selectedList.forEach((p, idx) => {
      const isBase = idx === 0;
      const col = Analyzer.Charts.COMPARISON_COLORS[idx % Analyzer.Charts.COMPARISON_COLORS.length];
      const deltas = isBase ? null : Analyzer.Comparison.getPokemonDeltas(p, basePokemon);
      const { strengths, limitations } = Analyzer.Comparison.evaluateStrengthsAndLimitations(p);

      const typesHtml = p.types.map(t =>
        `<span class="type-pill" style="background:${G.U.TYPE_COLOR[t]}">${G.U.TYPE_NAME[t] || t}</span>`
      ).join(' ');

      colsHtml += `
        <div class="comparison-column" style="--col-accent:${col.stroke}">
          <div class="comp-col-header">
            <button class="comp-remove-btn" onclick="Analyzer.Comparison.remove(${p.dex})" title="Quitar de la comparación">×</button>
            <canvas class="comp-sprite-cv" data-dex="${p.dex}" width="96" height="90"></canvas>
            <h3 class="comp-name">${p.name}</h3>
            <div class="comp-dex-meta">#${String(p.dex).padStart(3, '0')} · Gen ${p.gen} (${p.genName})</div>
            <div class="comp-types" style="margin:6px 0">${typesHtml}</div>
            <div class="comp-rarity">${G.UI.stars(p.rarity, 14)} <small>${p.availability.rarityName}</small></div>
            <button class="btn small" style="margin-top:6px" onclick="Analyzer.App.openModal(${p.dex})">Ver Ficha Completa</button>
          </div>

          <!-- Estadísticas Base con Deltas -->
          <div class="comp-section">
            <h4>Estadísticas de Juego</h4>
            ${Analyzer.Charts.renderStatBar('Vida (HP)', p.hp, 185, p.hp, deltas ? deltas.hp : null, col.stroke)}
            ${Analyzer.Charts.renderStatBar('Velocidad (Spd)', p.spd, 162, p.spd, deltas ? deltas.spd : null, col.stroke)}
            ${Analyzer.Charts.renderStatBar('Ataque Dominante (ATK)', p.atk, 1.70, '×' + p.atk.toFixed(2) + ' (' + p.sideName + ')', deltas ? deltas.atk : null, col.stroke)}
            ${Analyzer.Charts.renderStatBar('Ataque Físico (PA)', p.pa, 1.70, '×' + p.pa.toFixed(2), deltas ? deltas.pa : null, '#ff7043')}
            ${Analyzer.Charts.renderStatBar('Ataque Especial (SA)', p.sa, 1.70, '×' + p.sa.toFixed(2), deltas ? deltas.sa : null, '#ab47bc')}
            ${Analyzer.Charts.renderStatBar('Defensa Física (DF)', p.df, 230, p.df + ' (' + (p.mitigationPhysical >= 0 ? '+' : '') + p.mitigationPhysical + '%)', deltas ? deltas.df : null, '#ffb74d')}
            ${Analyzer.Charts.renderStatBar('Defensa Especial (SD)', p.sd, 230, p.sd + ' (' + (p.mitigationSpecial >= 0 ? '+' : '') + p.mitigationSpecial + '%)', deltas ? deltas.sd : null, '#4dd0e1')}
            ${Analyzer.Charts.renderStatBar('Total Base (BST)', p.bst, 720, p.bst, deltas ? deltas.bst : null, col.stroke)}
          </div>

          <!-- Objeto equipado y comparativa de mejoras -->
          <div class="comp-section item-section">
            <h4>Objeto y Mejora de Estadísticas</h4>
            ${Analyzer.Loadout.renderPanel(p)}
          </div>

          <!-- Ataques del Pokémon -->
          <div class="comp-section moves-section">
            <h4>Ataques (${p.moves.totalMoves})</h4>
            ${renderMovesBlock(p)}
          </div>

          <!-- Métricas de Combate -->
          <div class="comp-section">
            <h4>Mecánicas de Combate</h4>
            <div class="comp-prop-row">
              <span>Movimiento Inicial:</span>
              <b class="gold">${p.moves.startMove ? p.moves.startMove.name : 'N/A'}</b>
            </div>
            <div class="comp-prop-row">
              <span>Tipo / Familia Inicial:</span>
              <span>${p.moves.startMove ? p.moves.startMove.kind : 'N/A'}</span>
            </div>
            <div class="comp-prop-row">
              <span>DPS Estimado Inicial:</span>
              <b>${p.moves.startMove ? p.moves.startMove.dpsEstimate : 0}</b>
            </div>
            <div class="comp-prop-row">
              <span>Total Movimientos:</span>
              <b>${p.moves.totalMoves} aprendibles</b>
            </div>
            <div class="comp-prop-row">
              <span>Flota sobre suelo:</span>
              <b>${p.sprite.hovers ? 'Sí (Ignora obstáculos/lava)' : 'No (Terrestre)'}</b>
            </div>
            <div class="comp-prop-row">
              <span>Hitbox (Radio):</span>
              <b>${p.sprite.bodyRadius} px</b>
            </div>
            <div class="comp-prop-row">
              <span>Variante Shiny:</span>
              <b>${p.sprite.hasShiny ? 'Disponible' : 'No disponible'}</b>
            </div>
          </div>

          <!-- Puntuaciones Analíticas Evaluadas con Explicación en Hover -->
          <div class="comp-section">
            <div class="comp-section-header-flex">
              <h4>Rendimiento Evaluado</h4>
              <span class="metric-help-pill" title="Coloca el cursor sobre cualquier métrica para ver qué significa y cómo se evalúa">${Analyzer.Icons.get('bulb', { size: 12 })} Hover info</span>
            </div>
            <div class="comp-score-grid">
              <div class="comp-score-item metric-has-tooltip" title="${metricDefs.offensive.name}: ${metricDefs.offensive.fullDesc}">
                <span class="lbl"><span class="perf-ico">${metricDefs.offensive.icon}</span> Ofensiva <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
                <span class="val">${p.performance.offensive}</span>
              </div>
              <div class="comp-score-item metric-has-tooltip" title="${metricDefs.survival.name}: ${metricDefs.survival.fullDesc}">
                <span class="lbl"><span class="perf-ico">${metricDefs.survival.icon}</span> Supervivencia <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
                <span class="val">${p.performance.survival}</span>
              </div>
              <div class="comp-score-item metric-has-tooltip" title="${metricDefs.mobility.name}: ${metricDefs.mobility.fullDesc}">
                <span class="lbl"><span class="perf-ico">${metricDefs.mobility.icon}</span> Movilidad <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
                <span class="val">${p.performance.mobility}</span>
              </div>
              <div class="comp-score-item metric-has-tooltip" title="${metricDefs.control.name}: ${metricDefs.control.fullDesc}">
                <span class="lbl"><span class="perf-ico">${metricDefs.control.icon}</span> Control <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
                <span class="val">${p.performance.control}</span>
              </div>
              <div class="comp-score-item metric-has-tooltip" title="${metricDefs.flexibility.name}: ${metricDefs.flexibility.fullDesc}">
                <span class="lbl"><span class="perf-ico">${metricDefs.flexibility.icon}</span> Flexibilidad <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
                <span class="val">${p.performance.flexibility}</span>
              </div>
              <div class="comp-score-item metric-has-tooltip" title="${metricDefs.boss.name}: ${metricDefs.boss.fullDesc}">
                <span class="lbl"><span class="perf-ico">${metricDefs.boss.icon}</span> Vs Jefes <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
                <span class="val">${p.performance.boss}</span>
              </div>
              <div class="comp-score-item metric-has-tooltip" title="${metricDefs.lateGame.name}: ${metricDefs.lateGame.fullDesc}">
                <span class="lbl"><span class="perf-ico">${metricDefs.lateGame.icon}</span> Late Game <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
                <span class="val">${p.performance.lateGame}</span>
              </div>
            </div>
            <div class="comp-overall-badge metric-has-tooltip" title="${metricDefs.overall.name}: ${metricDefs.overall.fullDesc}">
              <span><span class="perf-ico">${metricDefs.overall.icon}</span> Índice Global <span class="metric-info-icon">${Analyzer.Icons.get('info', { size: 11 })}</span>:</span>
              <b>${p.performance.overall} / 100</b>
            </div>
          </div>

          <!-- Ventajas y Resistencias de Tipo -->
          <div class="comp-section">
            <h4>Efectividad Elemental de Tipos</h4>

            <div class="comp-matchup-group">
              <div class="comp-matchup-title">${Analyzer.Icons.get('burst', { size: 14 })} Más daño hace a (Ventaja STAB):</div>
              <div class="comp-matchup-chips">
                ${p.typeMatchups && p.typeMatchups.dealsSuperTo.length > 0
                  ? p.typeMatchups.dealsSuperTo.map(d => `
                    <span class="type-advantage-chip off" title="${p.name} causa daño súper eficaz (${d.multiplierText}) a tipo ${G.U.TYPE_NAME[d.type] || d.type} usando movimientos de tipo ${G.U.TYPE_NAME[d.effectiveWith] || d.effectiveWith}">
                      <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[d.type]}">${G.U.TYPE_NAME[d.type] || d.type}</span>
                      <b class="chip-mult">${d.multiplierText}</b>
                    </span>
                  `).join(' ')
                  : '<span class="chip-empty">Sin ventajas súper eficaces por STAB</span>'}
              </div>
            </div>

            <div class="comp-matchup-group" style="margin-top:10px">
              <div class="comp-matchup-title">${Analyzer.Icons.get('shield', { size: 14 })} Mayor resistencia de ataque ante:</div>
              <div class="comp-matchup-chips">
                ${p.typeMatchups && p.typeMatchups.resistsList.length > 0
                  ? p.typeMatchups.resistsList.map(r => `
                    <span class="type-advantage-chip def ${r.isImmunity ? 'immune' : ''}" title="${p.name} solo recibe ${r.multiplierText} de daño (${r.label}) frente a ataques de tipo ${G.U.TYPE_NAME[r.type] || r.type}">
                      <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[r.type]}">${G.U.TYPE_NAME[r.type] || r.type}</span>
                      <b class="chip-mult">${r.multiplierText}</b>
                    </span>
                  `).join(' ')
                  : '<span class="chip-empty">Sin resistencias elementales</span>'}
              </div>
            </div>

            <div class="comp-matchup-group" style="margin-top:10px">
              <div class="comp-matchup-title">${Analyzer.Icons.get('alert', { size: 14 })} Mayor daño recibido de (Debilidades):</div>
              <div class="comp-matchup-chips">
                ${p.typeMatchups && p.typeMatchups.weaknessesList.length > 0
                  ? p.typeMatchups.weaknessesList.map(w => `
                    <span class="type-advantage-chip weak ${w.isDoubleWeakness ? 'double' : ''}" title="${p.name} sufre ${w.multiplierText} de daño (${w.label}) de ataques tipo ${G.U.TYPE_NAME[w.type] || w.type}">
                      <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[w.type]}">${G.U.TYPE_NAME[w.type] || w.type}</span>
                      <b class="chip-mult">${w.multiplierText}</b>
                    </span>
                  `).join(' ')
                  : '<span class="chip-empty">Sin debilidades elementales</span>'}
              </div>
            </div>
          </div>

          <!-- Ventajas y Limitaciones Mecánicas -->
          <div class="comp-section">
            <h4>Ventajas Verificadas</h4>
            <ul class="comp-bullets pros">
              ${strengths.length > 0
                ? strengths.map(s => `<li>${s}</li>`).join('')
                : '<li>Perfil balanceado estándar sin ventajas extremas.</li>'}
            </ul>

            <h4 style="margin-top:10px">Limitaciones Verificadas</h4>
            <ul class="comp-bullets cons">
              ${limitations.length > 0
                ? limitations.map(l => `<li>${l}</li>`).join('')
                : '<li>No presenta debilidades críticas pronunciadas.</li>'}
            </ul>
          </div>
        </div>
      `;
    });

    colsHtml += `</div>`;
    container.innerHTML = colsHtml;

    // Registrar canvas en columnas de comparación
    container.querySelectorAll('.comp-sprite-cv').forEach(cv => {
      registerCanvasSprite(cv, +cv.dataset.dex, { scale: 2, shadow: true });
    });
  }

  /**
   * Bloque de ataques: movimiento inicial destacado + todos los aprendibles como chips con detalle al pasar el cursor
   */
  function renderMovesBlock(p) {
    const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;');
    const sm = p.moves.startMove;
    const r = Analyzer.Loadout.result(p);
    const dpsTxt = r.item && r.statDelta.dps
      ? `DPS ${r.base.dps} → <b class="item-delta pos">${r.stats.dps}</b>`
      : `DPS ${sm ? sm.dpsEstimate : 0}`;

    const catBadge = sm ? (sm.cat === 'physical'
      ? `<span class="tag-chip cat-phys">${Analyzer.Icons.get('physical', { size: 12 })} Físico</span>`
      : sm.cat === 'special'
        ? `<span class="tag-chip cat-spec">${Analyzer.Icons.get('special', { size: 12 })} Especial</span>`
        : `<span class="tag-chip cat-buff">${Analyzer.Icons.get('buff', { size: 12 })} Mejora</span>`) : '';

    const startHtml = sm ? `
      <div class="move-start">
        <div class="move-start-head">
          <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[sm.type]}">${G.U.TYPE_NAME[sm.type] || sm.type}</span>
          <b class="gold">${sm.name}</b>
          ${catBadge}
          <span class="kind-tag">${sm.kind}</span>
          <button class="btn small btn-inspect-scale" data-move-id="${sm.id}" data-dex="${p.dex}" style="margin-left:auto" title="Ver escalado completo nivel 1 a 5 y evolución dorada">${Analyzer.Icons.get('trendUp', { size: 12 })} Escalado Nv. 1-5</button>
        </div>
        <div class="move-start-meta">Ataque inicial · ${sm.dmg} daño · recarga ${sm.cd}s · ${dpsTxt} · Eficacia con ${p.name}: <b>${sm.fitPct}%</b></div>
        <div class="sub">${sm.desc}</div>
      </div>` : '';

    const chips = p.moves.poolMoves.map(m => {
      const evo = m.evolution ? ` (Evoluciona a ${m.evolution.newName}, requiere ${m.evolution.statName})` : '';
      const catIcoSvg = m.cat === 'physical' ? Analyzer.Icons.get('physical', { size: 11 }) : m.cat === 'special' ? Analyzer.Icons.get('special', { size: 11 }) : Analyzer.Icons.get('buff', { size: 11 });
      const tip = `${m.name} (${m.catName}, ${G.U.TYPE_NAME[m.type] || m.type}, ${m.kind}) — ${m.desc} | Daño: ${m.dmg > 0 ? m.dmg : '-'} | Recarga: ${m.cd ? m.cd + 's' : '-'} | Eficacia con ${p.name}: ${m.fitPct}%${evo}`;
      return `<span class="move-chip${m.evolution ? ' has-evo' : ''}" title="${esc(tip)}">` +
        `<span class="type-dot" style="background:${G.U.TYPE_COLOR[m.type]}"></span>` +
        `<small class="chip-cat-ico">${catIcoSvg}</small>${m.name}` +
        `${m.dmg > 0 ? ` <em>${m.dmg}</em>` : ''}${m.evolution ? ` <span class="chip-evo-crown">${Analyzer.Icons.get('crown', { size: 10 })}</span>` : ''}</span>`;
    }).join('');

    return `${startHtml}
      <details class="moves-details">
        <summary>Ver todos los ataques aprendibles (${p.moves.totalMoves})</summary>
        <div class="move-chip-wrap">${chips}</div>
        <p class="item-hint">${Analyzer.Icons.get('physical', { size: 12 })} Físico · ${Analyzer.Icons.get('special', { size: 12 })} Especial · ${Analyzer.Icons.get('buff', { size: 12 })} Mejora · Número = daño base · ${Analyzer.Icons.get('crown', { size: 12 })} = evolución dorada · pasa el cursor para ver el detalle.</p>
      </details>`;
  }

  function scrollToComparison() {
    if (elComparisonSection) {
      elComparisonSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Abre el modal con la ficha completa y detallada del personaje
   */
  function openModal(dex) {
    const p = Analyzer.DataAdapter.getByDex(dex);
    if (!p) return;

    currentModalDex = dex;
    modalShiny = false;
    modalAnim = 'Idle';
    modalDir = 0;
    modalUpgradesSimulated = false;

    renderModalContent(p);
    elModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    playSfx('confirm');
  }

  function closeModal() {
    elModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentModalDex = null;
    playSfx('back');
  }

  /**
   * Abre el modal interactivo de escalado de movimientos (L1-L5 + Dorado + Buffs)
   */
  function openMoveScalingModal(moveId, dex) {
    if (!elScalingModal || !elScalingModalContent || !Analyzer.Builds) return;
    const targetDex = dex || currentModalDex;
    const p = targetDex ? Analyzer.DataAdapter.getByDex(targetDex) : null;
    const scaling = Analyzer.Builds.getMoveScaling(moveId, p);
    if (!scaling) return;
    elScalingModalContent.innerHTML = Analyzer.Builds.renderMoveScalingModalHtml(scaling, p);
    elScalingModal.classList.remove('hidden');
    playSfx('select');
  }

  function closeMoveScalingModal() {
    if (elScalingModal) {
      elScalingModal.classList.add('hidden');
      playSfx('back');
    }
  }

  /**
   * Renderiza el contenido interno del modal dossier
   */
  function renderModalContent(p) {
    const isSelected = Analyzer.Comparison.isSelected(p.dex);
    const { strengths, limitations } = Analyzer.Comparison.evaluateStrengthsAndLimitations(p);
    const metricDefs = Analyzer.DataAdapter.getMetricDefinitions();

    const perfKeys = ['overall', 'offensive', 'survival', 'mobility', 'control', 'flexibility', 'boss', 'lateGame'];
    const perfColors = {
      overall: '#ffd23f',
      offensive: '#ff5f6d',
      survival: '#5fe08a',
      mobility: '#4fb4ff',
      control: '#c47bff',
      flexibility: '#ff9d42',
      boss: '#ff4071',
      lateGame: '#a384ff'
    };

    const perfBarsHtml = perfKeys.map(k => {
      const def = metricDefs[k] || { name: k, icon: '⭐', shortDesc: '', fullDesc: '' };
      const val = p.performance[k] || 0;
      const col = perfColors[k] || '#ffd23f';
      return `
        <div class="dossier-perf-row metric-has-tooltip" data-metric="${k}" title="${def.name}: ${def.fullDesc}">
          <div class="dossier-perf-head">
            <span class="dossier-perf-title">
              <span class="perf-ico">${def.icon}</span>
              <b>${def.name}</b>
              <span class="metric-info-icon" title="${def.fullDesc}">${Analyzer.Icons.get('info', { size: 11 })}</span>
            </span>
            <span class="dossier-perf-num" style="color:${col}"><b>${val}</b> / 100</span>
          </div>
          <div class="dossier-perf-track">
            <div class="dossier-perf-bar" style="width:${val}%; background:${col}"></div>
          </div>
          <div class="dossier-perf-short">${def.shortDesc}</div>
        </div>
      `;
    }).join('');

    // Stats ajustados si el simulador de mejoras está activo
    const effectiveHp = modalUpgradesSimulated ? p.hp + 80 : p.hp; // +8 vida * 10 niveles = +80
    const effectiveAtk = modalUpgradesSimulated ? p.atk * 1.40 : p.atk; // +4% daño * 10 = +40%
    const effectiveSpd = modalUpgradesSimulated ? p.spd * 1.24 : p.spd; // +3% spd * 8 = +24%

    // Chips de tipo
    const typesHtml = p.types.map(t =>
      `<span class="type-pill" style="background:${G.U.TYPE_COLOR[t]}">${G.U.TYPE_NAME[t] || t}</span>`
    ).join(' ');

    // Tabla de movimientos aprendibles
    const movesRows = p.moves.poolMoves.map(m => {
      const evoInfo = m.evolution
        ? `<span class="gold" title="Requiere stat: ${m.evolution.statName}">${Analyzer.Icons.get('crown', { size: 11 })} Evoluciona a <b>${m.evolution.newName}</b></span>`
        : '<span style="color:var(--muted)">-</span>';
      const catBadge = m.cat === 'physical'
        ? `<span class="tag-chip cat-phys">${Analyzer.Icons.get('physical', { size: 12 })} Físico</span>`
        : m.cat === 'special'
          ? `<span class="tag-chip cat-spec">${Analyzer.Icons.get('special', { size: 12 })} Especial</span>`
          : `<span class="tag-chip cat-buff">${Analyzer.Icons.get('buff', { size: 12 })} Mejora</span>`;
      const fitBadge = m.fitPct >= 99
        ? `<span class="fit-chip fit-100" title="100% de eficacia con ${p.name}">100%</span>`
        : `<span class="fit-chip fit-sub" title="Eficacia relativa: ${m.fitPct}% con ${p.name}">${m.fitPct}%</span>`;
      return `
        <tr>
          <td><b class="gold">${m.name}</b></td>
          <td>${catBadge}</td>
          <td><span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[m.type]}">${G.U.TYPE_NAME[m.type] || m.type}</span></td>
          <td><span class="kind-tag">${m.kind}</span></td>
          <td>${m.dmg > 0 ? m.dmg : '-'}</td>
          <td>${m.cd ? m.cd + 's' : '-'}</td>
          <td>${fitBadge}</td>
          <td class="desc-cell">${m.desc}</td>
          <td>${evoInfo}</td>
          <td style="text-align:center"><button class="btn small btn-inspect-scale" data-move-id="${m.id}" data-dex="${p.dex}" title="Ver progresión nivel 1 a 5 y evolución dorada">${Analyzer.Icons.get('trendUp', { size: 12 })} Escalado</button></td>
        </tr>
      `;
    }).join('');

    // Tabla de efectividad defensiva frente a los 18 tipos
    let typeDefGrid = '<div class="type-def-grid">';
    if (p.typeMatchups) {
      for (const t in p.typeMatchups.matchups) {
        const m = p.typeMatchups.matchups[t];
        const multVal = m.multiplier;
        const col = G.U.TYPE_COLOR[t];
        let badgeClass = 'neutral';
        if (multVal > 1.05) badgeClass = 'weak';
        if (multVal < 0.95) badgeClass = 'resist';
        if (multVal <= 0.35) badgeClass = 'immune';

        typeDefGrid += `
          <div class="type-def-cell ${badgeClass}">
            <span class="type-def-name" style="color:${col}">${G.U.TYPE_NAME[t] || t}</span>
            <span class="type-def-val">×${multVal}</span>
          </div>
        `;
      }
    }
    typeDefGrid += '</div>';

    // Sección de Inicial (si corresponde)
    let starterTraitsHtml = '';
    if (p.starterTraits) {
      starterTraitsHtml = `
        <div class="dossier-box">
          <h4>Rasgos del Test de Personalidad (Inicial)</h4>
          <p class="sub">Este Pokémon puede ser obtenido al responder el cuestionario de personalidad de Mundo Misterioso al comenzar partida:</p>
          <div class="traits-list">
            ${p.starterTraits.traitDescriptions.map(td => `
              <div class="trait-card">
                <b>${td.trait.toUpperCase()}</b>: <span>${td.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    elModalContent.innerHTML = `
      <div class="dossier-header">
        <div class="dossier-titles">
          <div class="dossier-no">Nº ${String(p.dex).padStart(3, '0')} · Generación ${p.gen} (${p.genName})</div>
          <h2>${p.name}</h2>
          <div class="dossier-types">${typesHtml}</div>
          <div class="dossier-rarity" style="color:${p.availability.rarityColor}">
            ${G.UI.stars(p.rarity, 20)} ${p.availability.rarityName} · ${p.availability.summary}
          </div>
        </div>

        <div class="dossier-header-actions">
          <button class="btn ${isSelected ? 'active' : 'gold'}" id="modal-compare-toggle-btn">
            ${isSelected ? Analyzer.Icons.get('check', { size: 12 }) + ' Quitar de Comparación' : '+ Añadir a Comparación'}
          </button>
        </div>
      </div>

      <div class="dossier-main-layout">
        <!-- Columna Izquierda: Visor Interactivo de Sprite -->
        <div class="dossier-sprite-column">
          <div class="sprite-viewer-panel">
            <canvas id="modal-sprite-canvas" width="220" height="200"></canvas>
            
            <div class="sprite-viewer-controls">
              <!-- Selector Normal / Shiny -->
              <div class="seg-btn-group">
                <button class="seg-btn ${!modalShiny ? 'active' : ''}" id="btn-view-normal">Normal</button>
                <button class="seg-btn ${modalShiny ? 'active' : ''} ${!p.sprite.hasShiny ? 'disabled' : ''}" id="btn-view-shiny" ${!p.sprite.hasShiny ? 'disabled' : ''}>
                  ${Analyzer.Icons.get('sparkles', { size: 12 })} Shiny ${!p.sprite.hasShiny ? '(No disponible)' : ''}
                </button>
              </div>

              <!-- Selector de Animación -->
              <div class="anim-selector-row">
                <label>Animación:</label>
                <select id="modal-anim-select" class="field">
                  ${p.sprite.availableAnims.map(a => `<option value="${a}" ${modalAnim === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </div>

              <!-- Selector de Dirección -->
              <div class="dir-controls-row">
                <button class="btn small" id="btn-rot-left">↶ Girar Izq</button>
                <button class="btn small" id="btn-rot-right">Girar Der ↷</button>
              </div>
            </div>
          </div>

          <!-- Dimensiones y Hitbox verificados en código -->
          <div class="dossier-box">
            <h4>Geometría y Colisión (Código)</h4>
            <div class="comp-prop-row">
              <span>Radio de Colisión (Hitbox):</span>
              <b>${p.sprite.bodyRadius} px</b>
            </div>
            <div class="comp-prop-row">
              <span>Altura Visual:</span>
              <b>${p.sprite.bodyHeight} px</b>
            </div>
            <div class="comp-prop-row">
              <span>Tamaño Sombra PMD:</span>
              <b>Tamaño ${p.sprite.shadowSize}</b>
            </div>
            <div class="comp-prop-row">
              <span>Flota sobre obstáculos:</span>
              <b>${p.sprite.hovers ? 'Sí (G.Sprites.hovers)' : 'No'}</b>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Estadísticas y Desglose -->
        <div class="dossier-stats-column">
          <!-- Herramientas Superiores: Simulador de Mejoras + Objeto Equipado en 2 columnas -->
          <div class="dossier-top-tools-grid">
            <!-- Simulador de Mejoras -->
            <div class="upgrade-simulator-banner">
              <div>
                <b>Simulador de Mejoras de Tienda</b>
                <p class="sub" style="margin:2px 0 0">Aplica las 10 mejoras máximas de Fuerza (+40%), Vitalidad (+80) y Zancada (+24%).</p>
              </div>
              <button class="btn small ${modalUpgradesSimulated ? 'gold' : ''}" id="toggle-upgrade-sim-btn">
                ${modalUpgradesSimulated ? Analyzer.Icons.get('check', { size: 12 }) + ' Mejoras Activas' : 'Simular Mejoras'}
              </button>
            </div>

            <!-- Objeto equipado: comparativa de mejoras -->
            <div class="dossier-box item-section">
              <h4>Objeto Equipado y Mejora de Estadísticas</h4>
              ${Analyzer.Loadout.renderPanel(p)}
            </div>
          </div>

          <!-- Grilla Paralela de Estadísticas: Atributos Reales (Izq) vs Rendimiento y Roles (Der) -->
          <div class="dossier-stats-grid">
            <!-- Columna A: Estadísticas Reales de Combate -->
            <div class="dossier-box">
              <h4>Atributos y Estadísticas Verificadas</h4>
              <div class="side-specialty-banner">
                <span class="side-badge ${p.side === 'special' ? 'spec' : 'phys'}">${p.side === 'special' ? Analyzer.Icons.get('special', { size: 12 }) + ' Especialista Especial' : Analyzer.Icons.get('physical', { size: 12 }) + ' Especialista Físico'}</span>
                <span>Lado fuerte: <b>${p.sideName}</b> (Daño máximo ×${p.atk.toFixed(2)})</span>
              </div>
              ${Analyzer.Charts.renderStatBar('Vida (HP)', effectiveHp, 185 + 80, effectiveHp, null, '#5fe08a')}
              ${Analyzer.Charts.renderStatBar('Velocidad (Spd)', Math.round(effectiveSpd), 162 * 1.24, Math.round(effectiveSpd), null, '#4fb4ff')}
              ${Analyzer.Charts.renderStatBar('Ataque Dominante (ATK)', effectiveAtk, 1.70 * 1.40, '×' + effectiveAtk.toFixed(2), null, '#ffd23f')}
              ${Analyzer.Charts.renderStatBar('Ataque Físico (PA)', p.pa, 1.70, '×' + p.pa.toFixed(2), null, '#ff7043')}
              ${Analyzer.Charts.renderStatBar('Ataque Especial (SA)', p.sa, 1.70, '×' + p.sa.toFixed(2), null, '#ab47bc')}
              ${Analyzer.Charts.renderStatBar('Defensa Física (DF)', p.df, 230, p.df + ' (Mitiga ' + (p.mitigationPhysical >= 0 ? '+' : '') + p.mitigationPhysical + '% de daño físico)', null, '#ffb74d')}
              ${Analyzer.Charts.renderStatBar('Defensa Especial (SD)', p.sd, 230, p.sd + ' (Mitiga ' + (p.mitigationSpecial >= 0 ? '+' : '') + p.mitigationSpecial + '% de daño especial)', null, '#4dd0e1')}
              ${Analyzer.Charts.renderStatBar('Total Base Oficial (BST)', p.bst, 720, p.bst, null, '#ffd23f')}
            </div>

            <!-- Columna B: Rendimiento Evaluado + Comportamiento Salvaje + Terreno -->
            <div class="dossier-stats-col-b">
              <!-- Rendimiento Evaluado (8 Dimensiones con Hover Tooltips) -->
              <div class="dossier-box">
                <div class="dossier-box-title-flex">
                  <h4 style="margin:0">Rendimiento Evaluado (8 Dimensiones)</h4>
                  <span class="metric-help-pill" title="Coloca el cursor sobre cualquier dimensión para ver su fórmula y significado técnico">${Analyzer.Icons.get('bulb', { size: 12 })} Hover info</span>
                </div>
                <p class="sub" style="margin:2px 0 10px; font-size:12px">Puntajes analíticos de 0 a 100 calculados con las variables verificadas del juego:</p>
                <div class="dossier-perf-list">
                  ${perfBarsHtml}
                </div>
              </div>

              <!-- Rol como Enemigo en el Juego -->
              <div class="dossier-box">
                <h4>Comportamiento como Enemigo Salvaje (G.Enemies)</h4>
                <div class="comp-prop-row">
                  <span>Rol asignado en el código:</span>
                  <b class="gold">${p.enemyRole.name}</b>
                </div>
                <p class="sub" style="margin:6px 0 0">${p.enemyRole.description}</p>
              </div>

              <!-- Interacciones con Terreno y Clima -->
              <div class="dossier-box">
                <h4>Inmunidades de Terreno y Clima</h4>
                <p style="margin:0 0 6px"><b>Terreno:</b> ${p.liquidInteractions.summary}</p>
                <p style="margin:0"><b>Clima Favorable:</b> ${p.weatherInteractions.benefits.length > 0 ? p.weatherInteractions.benefits.join(' · ') : 'Sin bonificaciones climáticas de tipo.'}</p>
              </div>

              ${starterTraitsHtml}
            </div>
          </div>
        </div>
      </div>

      <!-- Efectividades Ofensivas y Defensivas de Tipo -->
      <div class="dossier-box" style="margin-top:20px">
        <h4>Efectividad Elemental y Cobertura de Tipos</h4>
        <p class="sub">PokéSurvivor suaviza la tabla elemental (×1.6 súper eficaz, ×0.6 poco eficaz, ×0.3 inmunidad suavizada):</p>

        <div class="matchup-summary-grid">
          <!-- 1. Tipos a los que más daño hace -->
          <div class="matchup-card off-card">
            <div class="matchup-card-title">
              <span class="matchup-title-icon">${Analyzer.Icons.get('burst', { size: 18 })}</span>
              <div>
                <b>Tipos a los que más daño hace (Ventaja Ofensiva STAB)</b>
                <div class="sub">Multiplicador ×1.6 al atacar con sus tipos elementales nativos:</div>
              </div>
            </div>
            <div class="matchup-chips-wrap">
              ${p.typeMatchups && p.typeMatchups.dealsSuperTo.length > 0
                ? p.typeMatchups.dealsSuperTo.map(d => `
                  <div class="matchup-chip off" title="${p.name} causa daño súper eficaz (${d.multiplierText}) contra tipo ${G.U.TYPE_NAME[d.type] || d.type} usando sus ataques de tipo ${G.U.TYPE_NAME[d.effectiveWith] || d.effectiveWith}">
                    <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[d.type]}">${G.U.TYPE_NAME[d.type] || d.type}</span>
                    <span class="chip-factor">${d.multiplierText}</span>
                    <span class="chip-note">con ${G.U.TYPE_NAME[d.effectiveWith] || d.effectiveWith}</span>
                  </div>
                `).join('')
                : '<div class="matchup-chip empty">No posee ventajas súper eficaces por STAB frente a ningún tipo puro.</div>'}
            </div>
          </div>

          <!-- 2. Tipos que más resiste -->
          <div class="matchup-card def-card">
            <div class="matchup-card-title">
              <span class="matchup-title-icon">${Analyzer.Icons.get('shield', { size: 18 })}</span>
              <div>
                <b>Tipos que más resiste al ser atacado (Resistencias Defensivas)</b>
                <div class="sub">Recibe daño reducido (×0.6 o ×0.3) frente a ataques de estos tipos:</div>
              </div>
            </div>
            <div class="matchup-chips-wrap">
              ${p.typeMatchups && p.typeMatchups.resistsList.length > 0
                ? p.typeMatchups.resistsList.map(r => `
                  <div class="matchup-chip def ${r.isImmunity ? 'immune' : ''}" title="${p.name} solo recibe ${r.multiplierText} de daño (${r.label}) frente a ataques de tipo ${G.U.TYPE_NAME[r.type] || r.type}">
                    <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[r.type]}">${G.U.TYPE_NAME[r.type] || r.type}</span>
                    <span class="chip-factor">${r.multiplierText}</span>
                    <span class="chip-note">${r.isImmunity ? 'Inmunidad Suavizada' : 'Resiste'}</span>
                  </div>
                `).join('')
                : '<div class="matchup-chip empty">No posee resistencias elementales reductoras de daño.</div>'}
            </div>
          </div>

          <!-- 3. Debilidades (más daño recibido) -->
          <div class="matchup-card weak-card">
            <div class="matchup-card-title">
              <span class="matchup-title-icon">${Analyzer.Icons.get('alert', { size: 18 })}</span>
              <div>
                <b>Tipos que más daño le causan (Debilidades Defensivas)</b>
                <div class="sub">Recibe daño incrementado (×1.6 o ×2.4 doble debilidad) de estos tipos:</div>
              </div>
            </div>
            <div class="matchup-chips-wrap">
              ${p.typeMatchups && p.typeMatchups.weaknessesList.length > 0
                ? p.typeMatchups.weaknessesList.map(w => `
                  <div class="matchup-chip weak ${w.isDoubleWeakness ? 'double' : ''}" title="${p.name} recibe daño aumentado (${w.multiplierText}, ${w.label}) de ataques de tipo ${G.U.TYPE_NAME[w.type] || w.type}">
                    <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[w.type]}">${G.U.TYPE_NAME[w.type] || w.type}</span>
                    <span class="chip-factor">${w.multiplierText}</span>
                    <span class="chip-note">${w.isDoubleWeakness ? 'Doble Debil.' : 'Debilidad'}</span>
                  </div>
                `).join('')
                : '<div class="matchup-chip empty">No posee debilidades elementales frente a ningún tipo.</div>'}
            </div>
          </div>
        </div>

        <h5 style="margin:16px 0 8px; color:var(--muted)">Desglose Completo de los 18 Tipos Elementales Recibidos:</h5>
        ${typeDefGrid}
      </div>

      <!-- Ataque inicial y catálogo de movimientos -->
      <div class="dossier-box" style="margin-top:20px">
        <h4>Ataque Inicial</h4>
        ${renderMovesBlock(p)}
      </div>

      <!-- Catálogo Completo de Movimientos Aprendibles -->
      <div class="dossier-box" style="margin-top:20px">
        <h4>Catálogo de Movimientos Aprendibles (${p.moves.totalMoves})</h4>
        <p class="sub">Incluye los movimientos de sus tipos elementales más los movimientos de tipo Normal comunes a todos los Pokémon:</p>
        <div class="table-container">
          <table class="analyzer-table">
            <thead>
              <tr>
                <th>Movimiento</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Familia</th>
                <th>Daño Base</th>
                <th>Recarga</th>
                <th>Eficacia</th>
                <th>Efecto y Descripción</th>
                <th>Evolución Máxima Dorada</th>
                <th style="text-align:center">Escalado</th>
              </tr>
            </thead>
            <tbody>
              ${movesRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sección de Transparencia de Datos -->
      <div class="dossier-box verification-box" style="margin-top:20px">
        <h4>Verificación de Datos y Ausencias en el Motor</h4>
        <div class="verification-meta">
          <p>${Analyzer.Icons.get('check', { size: 13 })} <b>Fuente de datos:</b> Archivos oficiales del repositorio local (pokedex.js, moves.js, sprites-meta.js, starters.js, enemies.js, types.js).</p>
          <p>${Analyzer.Icons.get('check', { size: 13 })} <b>No invención de atributos:</b> Los valores mostrados son extraídos directamente del código o calculados con sus fórmulas exactas.</p>
        </div>
        <div class="unavailable-features-list">
          <b>Características no disponibles en PokéSurvivor:</b>
          <ul>
            ${p.verification.unavailableFeatures.map(f => `
              <li><b>${f.feature}:</b> <span class="tag-unavail">${f.status}</span> — ${f.reason}</li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    // Inicializar canvas del visor en modal
    const modalCv = document.getElementById('modal-sprite-canvas');
    let modalAnimator = registerCanvasSprite(modalCv, p.dex, {
      scale: 3,
      shiny: modalShiny,
      anim: modalAnim,
      dir: modalDir,
      shadow: true
    });

    // Enlazar controles interactivos del modal
    document.getElementById('modal-compare-toggle-btn').onclick = () => {
      Analyzer.Comparison.toggle(p.dex);
      renderModalContent(p);
      playSfx('select');
    };

    document.getElementById('btn-view-normal').onclick = () => {
      modalShiny = false;
      document.getElementById('btn-view-normal').classList.add('active');
      document.getElementById('btn-view-shiny').classList.remove('active');
      modalAnimator = registerCanvasSprite(modalCv, p.dex, { scale: 3, shiny: false, anim: modalAnim, dir: modalDir });
      playSfx('select');
    };

    const shinyBtn = document.getElementById('btn-view-shiny');
    if (shinyBtn && p.sprite.hasShiny) {
      shinyBtn.onclick = () => {
        modalShiny = true;
        document.getElementById('btn-view-shiny').classList.add('active');
        document.getElementById('btn-view-normal').classList.remove('active');
        modalAnimator = registerCanvasSprite(modalCv, p.dex, { scale: 3, shiny: true, anim: modalAnim, dir: modalDir });
        playSfx('select');
      };
    }

    const animSelect = document.getElementById('modal-anim-select');
    animSelect.onchange = () => {
      modalAnim = animSelect.value;
      modalAnimator = registerCanvasSprite(modalCv, p.dex, { scale: 3, shiny: modalShiny, anim: modalAnim, dir: modalDir });
      playSfx('select');
    };

    document.getElementById('btn-rot-left').onclick = () => {
      modalDir = (modalDir + 7) % 8;
      modalAnimator.dir = modalDir;
      playSfx('select');
    };

    document.getElementById('btn-rot-right').onclick = () => {
      modalDir = (modalDir + 1) % 8;
      modalAnimator.dir = modalDir;
      playSfx('select');
    };

    document.getElementById('toggle-upgrade-sim-btn').onclick = () => {
      modalUpgradesSimulated = !modalUpgradesSimulated;
      renderModalContent(p);
      playSfx('confirm');
    };

    // Botones de inspección de escalado en tabla y en builds
    elModalContent.querySelectorAll('.btn-inspect-scale, .btn-inspect-build-move').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openMoveScalingModal(btn.dataset.moveId, +btn.dataset.dex);
      };
    });

    // Botón de 1-clic para equipar objeto de build
    elModalContent.querySelectorAll('.btn-equip-build-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const dex = +btn.dataset.dex;
        const itemId = btn.dataset.itemId;
        if (Analyzer.Loadout) {
          Analyzer.Loadout.set(dex, itemId);
          const itm = Analyzer.Loadout.ITEMS[itemId];
          toast(`Objeto equipado para ${p.name}: ${itm ? itm.name : itemId}`);
          const updated = Analyzer.DataAdapter.getByDex(dex);
          if (updated) renderModalContent(updated);
        }
      };
    });
  }

  /**
   * Notificación flotante (toast)
   */
  let toastTimer = null;
  function toast(message, duration = 2400) {
    let el = document.getElementById('analyzer-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'analyzer-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.display = 'none';
    }, duration);
  }

  /**
   * Reproductor de efectos de sonido
   */
  function playSfx(type = 'click') {
    if (window.G && window.G.Audio && window.G.Audio.sfx) {
      try {
        window.G.Audio.sfx(type);
      } catch (e) {}
    }
  }

  return {
    init,
    openModal,
    closeModal,
    openMoveScalingModal,
    closeMoveScalingModal,
    openExpandedChart,
    closeExpandedChart,
    renderPodium,
    getCurrentExpandedType: () => currentExpandedType,
    resetAllFilters,
    switchTab,
    registerCanvasSprite,
    toast,
    playSfx
  };
})();

// Inicialización automática cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Analyzer.App.init);
} else {
  Analyzer.App.init();
}
