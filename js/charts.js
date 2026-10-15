/* ============ charts.js — Gráficos de Radar y Barras Estadísticas ============
 * PokéSurvivor Character Analyzer
 *
 * Implementación 100% Vanilla HTML5 Canvas sin librerías externas.
 * - Gráfico de radar multipersonaje (hasta 4 Pokémon simultáneos)
 * - Renderizado nítido con soporte para pantallas de alta densidad (HiDPI / Retina)
 * - Estética inspirada en Pokémon Mundo Misterioso y el HUD de PokéSurvivor
 * - Barras de estadísticas y cálculo de percentiles relativos a los 966 personajes
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Charts = (() => {
  'use strict';

  // Paleta de colores distintivos de comparación (hasta 4 Pokémon)
  const COMPARISON_COLORS = [
    { stroke: '#4b9bff', fill: 'rgba(75, 155, 255, 0.28)', dot: '#9fd4ff', name: 'Jugador 1' },
    { stroke: '#ff5f6d', fill: 'rgba(255, 95, 109, 0.28)', dot: '#ffa4ad', name: 'Jugador 2' },
    { stroke: '#5fe08a', fill: 'rgba(95, 224, 138, 0.28)', dot: '#b3ffd0', name: 'Jugador 3' },
    { stroke: '#ffd23f', fill: 'rgba(255, 210, 63, 0.28)', dot: '#fff0a6', name: 'Jugador 4' }
  ];

  // Ejes analíticos evaluados (mismos nombres que 'Rendimiento Evaluado' en las fichas)
  const RADAR_AXES = [
    { key: 'offensive',   label: 'Ofensiva',     short: 'Ofensiva',     desc: 'Daño directo: ATK base, DPS del ataque inicial y movimientos ofensivos' },
    { key: 'survival',    label: 'Supervivencia', short: 'Supervivencia', desc: 'Aguante: HP, resistencias/debilidades de tipo y tamaño de hitbox' },
    { key: 'mobility',    label: 'Movilidad',    short: 'Movilidad',    desc: 'Agilidad: velocidad base, levitación y movimientos Dash' },
    { key: 'control',     label: 'Control',      short: 'Control',      desc: 'Control de hordas: área, ralentización, teledirigidos, retroceso' },
    { key: 'flexibility', label: 'Flexibilidad', short: 'Flexibilidad', desc: 'Variedad de movimientos aprendibles y arquetipos de build' },
    { key: 'boss',        label: 'Vs Jefes',     short: 'Vs Jefes',     desc: 'Eficacia contra jefes: daño concentrado y ataque seguro a distancia' }
  ];

  /**
   * Dibuja un gráfico de radar comparativo en un elemento <canvas>
   * @param {HTMLCanvasElement} canvas
   * @param {Array<Object>} pokemonList - Lista de 1 a 4 Pokémon enriquecidos
   * @param {Object} options - Opciones de visualización
   */
  function drawRadar(canvas, pokemonList, options = {}) {
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 360;
    const height = rect.height || canvas.height || 340;

    // Ajuste HiDPI
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);
    canvas._hits = [];
    attachTooltip(canvas);

    const centerX = width / 2;
    const centerY = (height / 2) + 2;
    const radius = Math.min(centerX, centerY) - 48;
    const totalAxes = RADAR_AXES.length;
    const angleStep = (Math.PI * 2) / totalAxes;

    // 1. Fondo de telaraña poligonal concéntrica
    const levels = 5; // 20, 40, 60, 80, 100
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = (radius / levels) * lvl;
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = (i * angleStep) - (Math.PI / 2);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = lvl === levels ? 'rgba(185, 203, 240, 0.45)' : 'rgba(185, 203, 240, 0.16)';
      ctx.lineWidth = lvl === levels ? 1.5 : 1;
      ctx.stroke();

      if (lvl === levels) {
        ctx.fillStyle = 'rgba(10, 20, 50, 0.45)';
        ctx.fill();
      }
    }

    // 2. Rayos radiales
    for (let i = 0; i < totalAxes; i++) {
      const angle = (i * angleStep) - (Math.PI / 2);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(185, 203, 240, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Etiquetas de los ejes
      const labelDist = radius + 22;
      const lx = centerX + Math.cos(angle) * labelDist;
      const ly = centerY + Math.sin(angle) * labelDist;

      ctx.font = '700 12px Pixelify, system-ui, sans-serif';
      ctx.fillStyle = '#b9cbf0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(RADAR_AXES[i].short, lx, ly);
    }

    // Si no hay datos, terminamos aquí
    if (!Array.isArray(pokemonList) || pokemonList.length === 0) {
      ctx.font = '13px Pixelify, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(185, 203, 240, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText('Selecciona personajes para comparar', centerX, centerY);
      return;
    }

    // 3. Dibujar polígonos de cada Pokémon (hasta 4)
    pokemonList.slice(0, 4).forEach((p, idx) => {
      const col = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
      const perf = p.performance || {};

      ctx.beginPath();
      RADAR_AXES.forEach((axis, i) => {
        const val = Math.max(0, Math.min(100, perf[axis.key] || 10));
        const r = (val / 100) * radius;
        const angle = (i * angleStep) - (Math.PI / 2);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      // Relleno semi-transparente
      ctx.fillStyle = col.fill;
      ctx.fill();

      // Borde brillante
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Puntos en cada vértice
      RADAR_AXES.forEach((axis, i) => {
        const val = Math.max(0, Math.min(100, perf[axis.key] || 10));
        const r = (val / 100) * radius;
        const angle = (i * angleStep) - (Math.PI / 2);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col.dot;
        ctx.fill();
        ctx.strokeStyle = '#050914';
        ctx.lineWidth = 1;
        ctx.stroke();

        canvas._hits.push({
          type: 'point', x, y, r: 13,
          name: p.name, axis: axis.label, desc: axis.desc, value: Math.round(val), color: col.stroke
        });
      });
    });
  }

  // ===== Tooltip interactivo compartido por radar y barras =====
  let tooltipEl = null;

  function getTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'chart-tooltip';
      if (document.body) document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function attachTooltip(canvas) {
    if (!canvas || canvas._tipBound || !canvas.addEventListener) return;
    canvas._tipBound = true;

    canvas.addEventListener('mousemove', (e) => {
      const tip = getTooltip();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hits = (canvas._hits || []).filter(h => {
        if (h.type === 'rect') return mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h;
        return Math.hypot(mx - h.x, my - h.y) <= h.r;
      });

      if (!hits.length) { tip.classList.remove('visible'); return; }

      // Un solo eje: se listan los Pokémon coincidentes bajo el cursor
      tip.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--gold,#ffd23f)">${hits[0].axis}</div>` +
        `<div style="opacity:.75;font-size:11.5px;margin-bottom:4px;white-space:normal;max-width:230px">${hits[0].desc || ''}</div>` +
        hits.map(h => `<div><span style="color:${h.color}">●</span> ${h.name}: <b>${h.value}</b>/100</div>`).join('');
      tip.classList.add('visible');

      const tw = tip.offsetWidth || 150;
      let left = e.clientX + 14;
      if (left + tw > window.innerWidth - 8) left = e.clientX - tw - 14;
      tip.style.left = Math.max(8, left) + 'px';
      tip.style.top = (e.clientY + 14) + 'px';
    });

    canvas.addEventListener('mouseleave', () => {
      if (tooltipEl) tooltipEl.classList.remove('visible');
    });
  }

  /**
   * Dibuja barras agrupadas comparando los mismos ejes del radar
   * @param {HTMLCanvasElement} canvas
   * @param {Array<Object>} pokemonList - 1 a 4 Pokémon enriquecidos
   */
  function drawBars(canvas, pokemonList) {
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 360;
    const height = rect.height || canvas.height || 340;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    canvas._hits = [];
    attachTooltip(canvas);

    const padL = 30, padR = 10, padT = 14, padB = 40;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Rejilla horizontal
    ctx.font = '11px Pixelify, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= 100; v += 25) {
      const y = padT + plotH - (v / 100) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(width - padR, y);
      ctx.strokeStyle = v === 0 ? 'rgba(185, 203, 240, 0.5)' : 'rgba(185, 203, 240, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#b9cbf0';
      ctx.fillText(String(v), padL - 5, y);
    }

    const list = Array.isArray(pokemonList) ? pokemonList.slice(0, 4) : [];
    const groupW = plotW / RADAR_AXES.length;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    RADAR_AXES.forEach((axis, i) => {
      const gx = padL + i * groupW;
      ctx.fillStyle = '#b9cbf0';
      ctx.font = '700 11px Pixelify, system-ui, sans-serif';
      ctx.fillText(axis.short, gx + groupW / 2, padT + plotH + 8);

      if (!list.length) return;
      const inner = groupW * 0.78;
      const barW = inner / list.length;
      const startX = gx + (groupW - inner) / 2;

      list.forEach((p, idx) => {
        const col = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
        const val = Math.max(0, Math.min(100, (p.performance || {})[axis.key] || 10));
        const bh = (val / 100) * plotH;
        const bx = startX + idx * barW;
        const by = padT + plotH - bh;

        ctx.fillStyle = col.stroke;
        ctx.fillRect(bx + 1, by, Math.max(2, barW - 2), bh);

        // Valor numérico sobre la barra si hay espacio
        if (barW >= 16) {
          ctx.fillStyle = '#fff';
          ctx.font = '700 10px Pixelify, system-ui, sans-serif';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(Math.round(val)), bx + barW / 2, by - 1);
          ctx.textBaseline = 'top';
        }

        canvas._hits.push({
          type: 'rect', x: bx, y: padT, w: barW, h: plotH,
          name: p.name, axis: axis.label, desc: axis.desc, value: Math.round(val), color: col.stroke
        });
      });
    });

    if (!list.length) {
      ctx.font = '13px Pixelify, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(185, 203, 240, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Selecciona personajes para comparar', width / 2, height / 2);
    }
  }

  /**
   * Genera el HTML de una barra de estadística con indicador delta comparativo
   */
  function renderStatBar(label, value, maxValue, formattedValue, delta = null, color = null) {
    const pct = Math.max(0, Math.min(100, (value / maxValue) * 100));
    const barColor = color || 'var(--box1)';

    let deltaHtml = '';
    if (delta && delta.value !== 0) {
      const isPositive = delta.value > 0;
      const sign = isPositive ? '+' : '';
      const cls = isPositive ? 'delta-pos' : 'delta-neg';
      deltaHtml = `<span class="stat-delta ${cls}">${sign}${delta.formatted || delta.value}</span>`;
    }

    return `
      <div class="stat-bar-row">
        <div class="stat-bar-header">
          <span class="stat-bar-label">${label}</span>
          <div class="stat-bar-numbers">
            <span class="stat-bar-val">${formattedValue || value}</span>
            ${deltaHtml}
          </div>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${pct.toFixed(1)}%; background:${barColor}"></div>
        </div>
      </div>
    `;
  }

  /**
   * Calcula el percentil de un Pokémon respecto a la base de datos completa de 966 especies
   */
  function calculatePercentiles(pokemon, allPokemon) {
    if (!pokemon || !Array.isArray(allPokemon) || allPokemon.length === 0) return null;

    const total = allPokemon.length;
    const rankBelow = key => allPokemon.filter(p => p[key] < pokemon[key]).length;

    const hpPercentile = Math.round((rankBelow('hp') / total) * 100);
    const spdPercentile = Math.round((rankBelow('spd') / total) * 100);
    const atkPercentile = Math.round((rankBelow('atk') / total) * 100);
    const bstPercentile = Math.round((rankBelow('bst') / total) * 100);

    return {
      hp: hpPercentile,
      spd: spdPercentile,
      atk: atkPercentile,
      bst: bstPercentile
    };
  }

  return {
    COMPARISON_COLORS,
    RADAR_AXES,
    drawRadar,
    drawBars,
    renderStatBar,
    calculatePercentiles
  };
})();
