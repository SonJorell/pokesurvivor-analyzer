/* ============ dashboard.js — Métricas Globales y Metajuego ============
 * PokéSurvivor Character Analyzer
 *
 * Calcula y renderiza el Dashboard Analítico del Metajuego:
 * - KPIs globales verificados
 * - Cuatro rankings de élite (Daño, Tanque, Movilidad, Rendimiento Global)
 * - Comparativa macro de las 9 Regiones
 * - Distribución de roles salvajes y candidatos a jefes
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Dashboard = (() => {
  'use strict';

  function getStats() {
    const all = Analyzer.DataAdapter.getAll();
    const regions = Analyzer.DataAdapter.getRegions().filter(r => r.id > 0);
    const total = all.length;

    let sumHp = 0, sumAtk = 0, sumSpd = 0, sumBst = 0;
    const roleCounts = {};

    for (const p of all) {
      sumHp += p.hp;
      sumAtk += p.atk;
      sumSpd += p.spd;
      sumBst += p.bst;

      const r = p.enemyRole.role || 'chase';
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    }

    const avgHp = (sumHp / total).toFixed(1);
    const avgAtk = (sumAtk / total).toFixed(2);
    const avgSpd = (sumSpd / total).toFixed(1);
    const avgBst = (sumBst / total).toFixed(1);

    // Rankings de líderes
    const topAtk = [...all].sort((a, b) => b.atk - a.atk).slice(0, 5);
    const topHp = [...all].sort((a, b) => b.hp - a.hp).slice(0, 5);
    const topSpd = [...all].sort((a, b) => b.spd - a.spd).slice(0, 5);
    const topOverall = [...all].sort((a, b) => b.performance.overall - a.performance.overall).slice(0, 5);

    // Estadísticas por región
    const regionStats = regions.map(reg => {
      const pokes = all.filter(p => p.gen === reg.gen);
      const count = pokes.length;
      const bstSum = pokes.reduce((acc, p) => acc + p.bst, 0);
      const atkSum = pokes.reduce((acc, p) => acc + p.atk, 0);
      const hpSum = pokes.reduce((acc, p) => acc + p.hp, 0);
      const topPoke = [...pokes].sort((a, b) => b.bst - a.bst)[0] || null;

      return {
        ...reg,
        count,
        avgBst: count ? (bstSum / count).toFixed(1) : 0,
        avgAtk: count ? (atkSum / count).toFixed(2) : 0,
        avgHp: count ? (hpSum / count).toFixed(1) : 0,
        topPoke
      };
    });

    return {
      total,
      avgHp,
      avgAtk,
      avgSpd,
      avgBst,
      topAtk,
      topHp,
      topSpd,
      topOverall,
      regionStats,
      roleCounts
    };
  }

  /**
   * Renderiza todo el Dashboard en el contenedor #dashboard-container
   */
  function render(container) {
    if (!container) return;
    const data = getStats();

    container.innerHTML = `
      <!-- ==================== KPIs Globales ==================== -->
      <section class="dashboard-kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Población Total</div>
          <div class="kpi-value gold">${data.total}</div>
          <div class="kpi-sub">Especies 100% verificadas</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Ataque Promedio</div>
          <div class="kpi-value">×${data.avgAtk}</div>
          <div class="kpi-sub">Rango: ×0.76 - ×1.70</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Salud Promedio</div>
          <div class="kpi-value">${data.avgHp} <span style="font-size:16px">HP</span></div>
          <div class="kpi-sub">Rango: 70 - 185 HP</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Velocidad Promedio</div>
          <div class="kpi-value">${data.avgSpd}</div>
          <div class="kpi-sub">Rango: 80 - 162 SPD</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">BST Promedio</div>
          <div class="kpi-value gold">${data.avgBst}</div>
          <div class="kpi-sub">Total Estadísticas Base</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Repertorio Bélico</div>
          <div class="kpi-value">64</div>
          <div class="kpi-sub">Movimientos + 32 Evos</div>
        </div>
      </section>

      <!-- ==================== Rankings de Líderes (4 Columnas) ==================== -->
      <section class="dashboard-section">
      <!-- ==================== Rankings de Líderes (4 Columnas) ==================== -->
      <section class="dashboard-section">
        <div class="section-header-compact">
          <span class="section-tag">Metajuego de PokéSurvivor</span>
          <h2 class="section-title-compact">${Analyzer.Icons.get('trophy', { size: 20 })} Rankings de Élite por Dimensión de Combate</h2>
          <p class="section-desc-compact">
            Los líderes indiscutibles según las variables matemáticas del motor. Pulsa <b>+ Comparar</b> para cargarlos directamente en el comparador táctico.
          </p>
        </div>

        <div class="rankings-grid">
          <!-- Columna 1: Daño Ofensivo -->
          <div class="ranking-column pmd-box">
            <div class="ranking-header">
              <span class="ranking-icon">${Analyzer.Icons.get('sword', { size: 18 })}</span>
              <div>
                <h3 class="ranking-title">Reyes del Daño</h3>
                <div class="ranking-subtitle">Mayor Multiplicador ATK</div>
              </div>
            </div>
            <div class="ranking-list">
              ${data.topAtk.map((p, i) => renderRankItem(p, i, `×${p.atk}`, 'ATK')).join('')}
            </div>
          </div>

          <!-- Columna 2: Supervivencia / Tanques -->
          <div class="ranking-column pmd-box">
            <div class="ranking-header">
              <span class="ranking-icon">${Analyzer.Icons.get('heart', { size: 18 })}</span>
              <div>
                <h3 class="ranking-title">Colosos de Salud</h3>
                <div class="ranking-subtitle">Mayor HP Máximo</div>
              </div>
            </div>
            <div class="ranking-list">
              ${data.topHp.map((p, i) => renderRankItem(p, i, `${p.hp} HP`, 'HP')).join('')}
            </div>
          </div>

          <!-- Columna 3: Velocidad / Movilidad -->
          <div class="ranking-column pmd-box">
            <div class="ranking-header">
              <span class="ranking-icon">${Analyzer.Icons.get('zap', { size: 18 })}</span>
              <div>
                <h3 class="ranking-title">Velocistas Extremos</h3>
                <div class="ranking-subtitle">Mayor Agilidad SPD</div>
              </div>
            </div>
            <div class="ranking-list">
              ${data.topSpd.map((p, i) => renderRankItem(p, i, `${p.spd} SPD`, 'SPD')).join('')}
            </div>
          </div>

          <!-- Columna 4: Rendimiento Global -->
          <div class="ranking-column pmd-box">
            <div class="ranking-header">
              <span class="ranking-icon">${Analyzer.Icons.get('crown', { size: 18 })}</span>
              <div>
                <h3 class="ranking-title">Élite Global</h3>
                <div class="ranking-subtitle metric-has-tooltip" title="Puntuación ponderada global calculada a partir de las 6 dimensiones tácticas clave: Ofensiva, Supervivencia, Movilidad, Control, Flexibilidad y Jefes. Pasa el cursor para ver el desglose en cada Pokémon.">Mayor Score Balanceado <span class="metric-info-icon" style="font-size:11px">${Analyzer.Icons.get('info', { size: 11 })}</span></div>
              </div>
            </div>
            <div class="ranking-list">
              ${data.topOverall.map((p, i) => renderRankItem(p, i, `${p.performance.overall}/100`, 'Score')).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== Comparativa por Regiones ==================== -->
      <section class="dashboard-section">
        <div class="section-header-compact">
          <span class="section-tag">Análisis Geográfico</span>
          <h2 class="section-title-compact">${Analyzer.Icons.get('globe', { size: 20 })} Comparativa Estadística por Generación</h2>
          <p class="section-desc-compact">
            Densidad de personajes, promedio de estadísticas y los líderes legendarios de cada región.
          </p>
        </div>

        <div class="regions-comparison-grid">
          ${data.regionStats.map(reg => {
            const bstPercent = Math.min(100, Math.round((reg.avgBst / 500) * 100));
            return `
              <div class="region-comp-card pmd-box">
                <div class="region-card-top">
                  <div class="region-name-group">
                    <span class="region-icon-emoji">${reg.icon}</span>
                    <div>
                      <h4 class="region-title">${reg.name}</h4>
                      <div class="region-gen-tag">Gen ${reg.gen} · ${reg.count} Pokémon</div>
                    </div>
                  </div>
                  <button class="btn tiny gold" onclick="Analyzer.Filters.setRegion(${reg.id}); Analyzer.App.switchTab('catalog');">
                    Ver en Catálogo
                  </button>
                </div>

                <div class="region-stat-bars">
                  <div class="region-bar-row">
                    <span>BST Promedio: <b>${reg.avgBst}</b></span>
                    <div class="progress-bar-wrap">
                      <div class="progress-bar-fill gold-bar" style="width:${bstPercent}%"></div>
                    </div>
                  </div>
                  <div class="region-metrics-mini">
                    <span>${Analyzer.Icons.get('heart', { size: 12 })} HP: <b>${reg.avgHp}</b></span>
                    <span>${Analyzer.Icons.get('sword', { size: 12 })} ATK: <b>×${reg.avgAtk}</b></span>
                  </div>
                </div>

                ${reg.topPoke ? `
                  <div class="region-boss-row">
                    <span style="color:var(--muted); font-size:12px">Mayor BST:</span>
                    <span class="gold" style="font-weight:700; cursor:pointer" onclick="Analyzer.App.openModal(${reg.topPoke.dex})">
                      ${reg.topPoke.name} (${reg.topPoke.bst} BST) ${Analyzer.Icons.get('search', { size: 12 })}
                    </span>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- ==================== Banner CTA hacia Catálogo y Comparador ==================== -->
      <section class="dashboard-cta-banner pmd-box">
        <div class="cta-banner-content">
          <h2 style="margin:0 0 8px; font-size:24px; color:#fff">¿Listo para armar tu equipo definitivo?</h2>
          <p style="margin:0 0 16px; color:var(--muted); font-size:16px">
            Explora las fichas técnicas detalladas de los 966 personajes o contrasta hasta 4 Pokémon con el radar analítico.
          </p>
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap">
            <button class="btn gold" style="font-size:16px; padding:10px 20px" onclick="Analyzer.App.switchTab('catalog')">
              ${Analyzer.Icons.get('catalog', { size: 16 })} Ir al Catálogo de Personajes (966)
            </button>
            <button class="btn" style="font-size:16px; padding:10px 20px" onclick="Analyzer.App.switchTab('comparison')">
              ${Analyzer.Icons.get('swords', { size: 16 })} Abrir Comparador Táctico
            </button>
          </div>
        </div>
      </section>
    `;

    // Vincular canvas sprites en los rankings
    initRankSprites(container);
  }

  function renderRankItem(p, index, statValue, statLabel) {
    const medals = ['#1', '#2', '#3', '#4', '#5'];
    const dex3 = String(p.dex).padStart(3, '0');
    const typeBadges = p.types.map(t => {
      const col = (window.G && G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[t]) || '#666';
      return `<span class="chip-mini" style="background:${col}; color:#fff">${t}</span>`;
    }).join(' ');

    return `
      <div class="rank-item-row" data-dex="${p.dex}">
        <span class="rank-medal">${medals[index] || (index + 1)}</span>
        
        <div class="rank-sprite-wrap" onclick="Analyzer.App.openModal(${p.dex})" title="Ver ficha de ${p.name}">
          <canvas class="rank-canvas" width="48" height="48" data-dex="${p.dex}"></canvas>
        </div>

        <div class="rank-info" onclick="Analyzer.App.openModal(${p.dex})">
          <div class="rank-name-row">
            <span class="rank-poke-name">${p.name}</span>
            <span class="rank-poke-dex">#${dex3}</span>
          </div>
          <div class="rank-types">${typeBadges}</div>
        </div>

        <div class="rank-stat-box">
          <span class="rank-stat-val gold">${statValue}</span>
          <button class="btn tiny gold-outline" title="Añadir a comparación" onclick="event.stopPropagation(); Analyzer.Comparison.add(${p.dex}); Analyzer.App.toast('${p.name} añadido al comparador');">
            + Comparar
          </button>
        </div>
      </div>
    `;
  }

  function initRankSprites(container) {
    const canvases = container.querySelectorAll('.rank-canvas');
    canvases.forEach(cv => {
      const dex = +cv.dataset.dex;
      if (!dex) return;
      Analyzer.App.registerCanvasSprite(cv, dex, { scale: 1.5, anim: 'Idle', dir: 0 });
    });
  }

  return {
    getStats,
    render
  };
})();
