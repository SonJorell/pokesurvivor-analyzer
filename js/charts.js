/* ============ charts.js — Gráficos Estadísticos y Comparador Táctico ============
 * PokéSurvivor Character Analyzer
 *
 * Implementación 100% Vanilla HTML5 Canvas sin dependencias externas:
 * 1. Radar Hexagonal Táctico (6 Dimensiones)
 * 2. Barras Agrupadas de Estadísticas Reales de Combate (HP, SPD, ATK, PA, SA, DF, SD)
 * 3. Gráfico de Torta / Anillo Donut de Cuota de Poder y Balance de Escuadra
 * 4. Matriz Cartesiana de Posicionamiento Táctico (Ofensiva vs Supervivencia)
 * 5. Soporte de Pantalla Completa / Expansión interactiva con Tooltips HiDPI.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Charts = (() => {
  'use strict';

  // Tipografía pixel art oficial de PokéSurvivor
  const FONT_PIXEL = "'Pixelify', 'Segoe UI', system-ui, sans-serif";

  // Paleta de colores distintivos de comparación (hasta 4 Pokémon)
  const COMPARISON_COLORS = [
    { stroke: '#4b9bff', fill: 'rgba(75, 155, 255, 0.28)', dot: '#9fd4ff', name: 'Jugador 1' },
    { stroke: '#ff5f6d', fill: 'rgba(255, 95, 109, 0.28)', dot: '#ffa4ad', name: 'Jugador 2' },
    { stroke: '#5fe08a', fill: 'rgba(95, 224, 138, 0.28)', dot: '#b3ffd0', name: 'Jugador 3' },
    { stroke: '#ffd23f', fill: 'rgba(255, 210, 63, 0.28)', dot: '#fff0a6', name: 'Jugador 4' }
  ];

  // Ejes analíticos evaluados (mismos nombres que 'Rendimiento Evaluado' en las fichas)
  const RADAR_AXES = [
    { key: 'offensive',   label: 'Ofensiva',     short: 'Ofensiva',     desc: 'Daño directo: ATK base, DPS inicial y ataques agresivos' },
    { key: 'survival',    label: 'Supervivencia', short: 'Supervivencia', desc: 'Aguante: HP, resistencias/debilidades de tipo y hitbox' },
    { key: 'mobility',    label: 'Movilidad',    short: 'Movilidad',    desc: 'Agilidad: velocidad base, levitación y movimientos Dash' },
    { key: 'control',     label: 'Control',      short: 'Control',      desc: 'Control de hordas: área, ralentizaciones y retroceso' },
    { key: 'flexibility', label: 'Flexibilidad', short: 'Flexibilidad', desc: 'Variedad de movimientos aprendibles y sinergias' },
    { key: 'boss',        label: 'Vs Jefes',     short: 'Vs Jefes',     desc: 'Eficacia contra jefes: ráfaga concentrada y rango seguro' }
  ];

  // Métricas reales de combate para el gráfico de barras agrupadas
  const STAT_METRICS = [
    { key: 'hp',  label: 'Salud Base',       short: 'HP',  max: 185, unit: ' HP',  fmt: v => v + ' HP' },
    { key: 'spd', label: 'Velocidad',        short: 'SPD', max: 162, unit: ' SPD', fmt: v => v + ' SPD' },
    { key: 'atk', label: 'Ataque Dominante', short: 'ATK', max: 1.70, unit: '',    fmt: v => '×' + v.toFixed(2), scale: v => (v / 1.70) * 100 },
    { key: 'pa',  label: 'Ataque Físico',    short: 'PA',  max: 1.70, unit: '',    fmt: v => '×' + v.toFixed(2), scale: v => (v / 1.70) * 100 },
    { key: 'sa',  label: 'Ataque Especial',  short: 'SA',  max: 1.70, unit: '',    fmt: v => '×' + v.toFixed(2), scale: v => (v / 1.70) * 100 },
    { key: 'df',  label: 'Defensa Física',   short: 'DF',  max: 230, unit: ' DF',  fmt: v => v + ' DF' },
    { key: 'sd',  label: 'Defensa Especial', short: 'SD',  max: 230, unit: ' SD',  fmt: v => v + ' SD' }
  ];

  let tooltipEl = null;

  function ensureTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'chart-hover-tooltip';
      document.body.appendChild(tooltipEl);

      window.addEventListener('scroll', () => {
        if (tooltipEl) tooltipEl.classList.remove('visible');
      }, { passive: true });
    }
    return tooltipEl;
  }

  function attachTooltip(canvas) {
    if (canvas._hasTipListener) return;
    canvas._hasTipListener = true;

    canvas.addEventListener('mousemove', e => {
      const tip = ensureTooltip();
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const scaleX = (canvas._logicalWidth || (canvas.width / (window.devicePixelRatio || 1))) / rect.width;
      const scaleY = (canvas._logicalHeight || (canvas.height / (window.devicePixelRatio || 1))) / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const hits = canvas._hits || [];
      let bestHit = null;

      // 1. Probar hits específicos (puntos clave, barras individuales, nodos cartesianos, arcos)
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        if (!h.isSpecific) continue;
        let match = false;
        if (h.type === 'circle') {
          const dx = x - h.x, dy = y - h.y;
          match = (dx * dx + dy * dy) <= (h.r * h.r);
        } else if (h.type === 'rect') {
          match = x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
        } else if (h.type === 'arc') {
          const dx = x - h.cx, dy = y - h.cy;
          const d = Math.hypot(dx, dy);
          if (d >= h.rIn && d <= h.rOut) {
            if (h.startAngle === 0 && h.endAngle >= Math.PI * 2) {
              match = true;
            } else {
              let a = Math.atan2(dy, dx);
              if (a < 0) a += Math.PI * 2;
              let s = h.startAngle, end = h.endAngle;
              while (s < 0) s += Math.PI * 2;
              while (end < 0) end += Math.PI * 2;
              if (s <= end) match = a >= s && a <= end;
              else match = a >= s || a <= end;
            }
          }
        }
        if (match) {
          bestHit = h;
          break;
        }
      }

      // 2. Si no hay hit específico, buscar hits de sectores radar o columnas generales
      if (!bestHit) {
        for (let i = 0; i < hits.length; i++) {
          const h = hits[i];
          if (h.isSpecific) continue;
          let match = false;
          if (h.type === 'radar-sector') {
            const dx = x - h.cx, dy = y - h.cy;
            const d = Math.hypot(dx, dy);
            if (d >= 8 && d <= h.maxR) {
              let a = Math.atan2(dy, dx);
              let diff = Math.abs(a - h.axisAngle);
              while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
              match = diff <= h.halfStep;
            }
          } else if (h.type === 'column') {
            match = x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
          } else if (h.type === 'rect') {
            match = x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
          } else if (h.type === 'circle') {
            const dx = x - h.x, dy = y - h.y;
            match = (dx * dx + dy * dy) <= (h.r * h.r);
          } else if (h.type === 'arc') {
            const dx = x - h.cx, dy = y - h.cy;
            const d = Math.hypot(dx, dy);
            match = d >= h.rIn && d <= h.rOut;
          }
          if (match) {
            bestHit = h;
            break;
          }
        }
      }

      if (!bestHit) {
        tip.classList.remove('visible');
        return;
      }

      tip.innerHTML = bestHit.customHtml || `
        <div class="tip-header">
          <b class="tip-title">${bestHit.title || bestHit.name}</b>
        </div>
        ${bestHit.subtitle ? `<div class="tip-desc">${bestHit.subtitle}</div>` : ''}
        ${bestHit.lines ? bestHit.lines.map(l => `<div>${l}</div>`).join('') : ''}
      `;

      tip.classList.add('visible');
      const tw = tip.offsetWidth || 260;
      const th = tip.offsetHeight || 140;
      let left = e.clientX + 16;
      let top = e.clientY + 16;
      if (left + tw > window.innerWidth - 12) left = e.clientX - tw - 16;
      if (top + th > window.innerHeight - 12) top = e.clientY - th - 16;
      tip.style.left = Math.max(8, left) + 'px';
      tip.style.top = Math.max(8, top) + 'px';
    });

    canvas.addEventListener('mouseleave', () => {
      if (tooltipEl) tooltipEl.classList.remove('visible');
    });
  }

  function setupCanvas(canvas, options = {}) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(options.width || (rect.width > 50 ? rect.width : (canvas.width || 380)));
    const height = Math.round(options.height || (rect.height > 50 ? rect.height : (canvas.height || 320)));

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas._logicalWidth = width;
    canvas._logicalHeight = height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    canvas._hits = [];
    attachTooltip(canvas);

    return { ctx, width, height, dpr };
  }

  /* =========================================================================
   * 1. GRÁFICO DE RADAR HEXAGONAL TÁCTICO (6 DIMENSIONES)
   * ========================================================================= */
  function drawRadar(canvas, pokemonList, options = {}) {
    const s = setupCanvas(canvas, options);
    if (!s) return;
    const { ctx, width, height } = s;

    canvas._lastDrawFn = drawRadar;
    canvas._lastPokemonList = pokemonList;
    canvas._lastOptions = options;

    const centerX = width / 2;
    const centerY = (height / 2) + 4;
    const radius = Math.min(centerX, centerY) - (options.expanded ? 56 : 42);
    const totalAxes = RADAR_AXES.length;
    const angleStep = (Math.PI * 2) / totalAxes;

    // A. Rejilla poligonal concéntrica (20, 40, 60, 80, 100)
    const levels = 5;
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
      ctx.strokeStyle = lvl === levels ? 'rgba(255, 218, 102, 0.45)' : 'rgba(185, 203, 240, 0.14)';
      ctx.lineWidth = lvl === levels ? 1.5 : 1;
      ctx.stroke();

      if (lvl === levels) {
        ctx.fillStyle = 'rgba(11, 20, 45, 0.4)';
        ctx.fill();
      }
    }

    // B. Rayos y etiquetas de los ejes
    for (let i = 0; i < totalAxes; i++) {
      const angle = (i * angleStep) - (Math.PI / 2);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(185, 203, 240, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const labelDist = radius + (options.expanded ? 24 : 18);
      const lx = centerX + Math.cos(angle) * labelDist;
      const ly = centerY + Math.sin(angle) * labelDist;

      ctx.font = options.expanded ? `700 13px ${FONT_PIXEL}` : `700 11.5px ${FONT_PIXEL}`;
      ctx.fillStyle = '#b9cbf0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(RADAR_AXES[i].short, lx, ly);
    }

    if (!Array.isArray(pokemonList) || pokemonList.length === 0) {
      ctx.font = `13px ${FONT_PIXEL}`;
      ctx.fillStyle = 'rgba(185, 203, 240, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Añade Pokémon para comparar', centerX, centerY);
      return;
    }

    // C. Polígonos de los Pokémon
    const list = pokemonList.slice(0, 4);

    // Registrar zonas interactivas de sectores completos para cada eje táctico
    for (let i = 0; i < totalAxes; i++) {
      const angle = (i * angleStep) - (Math.PI / 2);
      const axis = RADAR_AXES[i];
      const axisRows = list.map((p, pIdx) => {
        const col = COMPARISON_COLORS[pIdx % COMPARISON_COLORS.length];
        const val = Math.round(Math.max(10, Math.min(100, (p.performance || {})[axis.key] || 20)));
        return { p, col, val };
      });
      const maxVal = Math.max(...axisRows.map(r => r.val));

      canvas._hits.push({
        type: 'radar-sector',
        cx: centerX,
        cy: centerY,
        maxR: radius + (options.expanded ? 36 : 26),
        axisAngle: angle,
        halfStep: angleStep / 2,
        isSpecific: false,
        customHtml: `
          <div class="tip-header">
            <span class="tip-icon">⚔️</span>
            <b class="tip-title">${axis.label}</b>
            <span class="tip-badge">Eje Táctico</span>
          </div>
          <div class="tip-desc">${axis.desc}</div>
          <div class="tip-rows">
            ${axisRows.map(r => `
              <div class="tip-row ${r.val === maxVal && axisRows.length > 1 ? 'is-leader' : ''}">
                <span class="tip-dot" style="background:${r.col.stroke}; color:${r.col.stroke}"></span>
                <b class="tip-pokename">${r.p.name}</b>
                <span class="tip-stat-val" style="color:${r.col.stroke}">${r.val} <small style="font-size:10px; opacity:0.8">/100</small></span>
                ${r.val === maxVal && axisRows.length > 1 ? '<span class="tip-crown">👑 Líder</span>' : ''}
              </div>
            `).join('')}
          </div>
        `
      });
    }

    list.forEach((p, idx) => {
      const col = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
      const points = [];

      for (let i = 0; i < totalAxes; i++) {
        const val = Math.max(10, Math.min(100, (p.performance || {})[RADAR_AXES[i].key] || 20));
        const r = (val / 100) * radius;
        const angle = (i * angleStep) - (Math.PI / 2);
        points.push({
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
          val: Math.round(val),
          axis: RADAR_AXES[i]
        });
      }

      // Relleno suave y borde
      ctx.beginPath();
      points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = col.fill;
      ctx.fill();
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = options.expanded ? 2.5 : 2;
      ctx.stroke();

      // Vértices y zonas interactivas específicas
      points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, options.expanded ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col.dot || col.stroke;
        ctx.fill();
        ctx.strokeStyle = '#0b101d';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const axisRows = list.map((other, oIdx) => {
          const oCol = COMPARISON_COLORS[oIdx % COMPARISON_COLORS.length];
          const oVal = Math.round(Math.max(10, Math.min(100, (other.performance || {})[pt.axis.key] || 20)));
          return { other, oCol, oVal };
        });
        const maxAxisVal = Math.max(...axisRows.map(r => r.oVal));

        canvas._hits.push({
          type: 'circle',
          x: pt.x,
          y: pt.y,
          r: options.expanded ? 16 : 13,
          isSpecific: true,
          name: p.name,
          customHtml: `
            <div class="tip-header">
              <span class="tip-dot" style="background:${col.stroke}; color:${col.stroke}"></span>
              <b class="tip-title">${p.name} · ${pt.axis.label}</b>
              <span class="tip-badge">Punto Clave</span>
            </div>
            <div class="tip-desc">${pt.axis.desc}</div>
            <div class="tip-highlight-box">
              Valor de ${p.name}: <b style="color:${col.stroke}; font-size:13.5px">${pt.val} / 100</b>
            </div>
            <div class="tip-rows">
              <div style="font-size:11px; color:#8ea4cc; margin-bottom:2px">Comparativa de este eje:</div>
              ${axisRows.map(r => `
                <div class="tip-row ${r.other.dex === p.dex ? 'is-focused' : (r.oVal === maxAxisVal && axisRows.length > 1 ? 'is-leader' : '')}">
                  <span class="tip-dot" style="background:${r.oCol.stroke}; color:${r.oCol.stroke}"></span>
                  <b class="tip-pokename">${r.other.name} ${r.other.dex === p.dex ? '(Enfocado)' : ''}</b>
                  <span class="tip-stat-val" style="color:${r.oCol.stroke}">${r.oVal} / 100</span>
                  ${r.oVal === maxAxisVal && axisRows.length > 1 ? '<span class="tip-crown">👑</span>' : ''}
                </div>
              `).join('')}
            </div>
          `
        });
      });

      // Si solo hay 1 Pokémon, dibujar el valor numérico destacado cerca de cada vértice
      if (list.length === 1) {
        ctx.font = options.expanded ? `700 12px ${FONT_PIXEL}` : `700 11px ${FONT_PIXEL}`;
        ctx.fillStyle = '#ffd23f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        points.forEach((pt, i) => {
          const angle = (i * angleStep) - (Math.PI / 2);
          const tx = pt.x + Math.cos(angle) * (options.expanded ? 16 : 13);
          const ty = pt.y + Math.sin(angle) * (options.expanded ? 16 : 13);
          ctx.fillText(pt.val, tx, ty);
        });
      }
    });
  }

  /* =========================================================================
   * 2. BARRAS AGRUPADAS DE ESTADÍSTICAS REALES DE COMBATE
   * ========================================================================= */
  function drawBars(canvas, pokemonList, options = {}) {
    const s = setupCanvas(canvas, options);
    if (!s) return;
    const { ctx, width, height } = s;

    canvas._lastDrawFn = drawBars;
    canvas._lastPokemonList = pokemonList;
    canvas._lastOptions = options;

    const padL = options.expanded ? 44 : 36;
    const padR = 14;
    const padT = options.expanded ? 24 : 18;
    const padB = options.expanded ? 44 : 34;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Rejilla de fondo
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `11px ${FONT_PIXEL}`;

    for (let pct = 0; pct <= 100; pct += 25) {
      const y = padT + plotH - (pct / 100) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(width - padR, y);
      ctx.strokeStyle = pct === 0 ? 'rgba(255, 218, 102, 0.4)' : 'rgba(185, 203, 240, 0.12)';
      ctx.lineWidth = pct === 0 ? 1.5 : 1;
      ctx.stroke();

      ctx.fillStyle = '#8ea4cc';
      ctx.fillText(pct + '%', padL - 6, y);
    }

    const list = Array.isArray(pokemonList) ? pokemonList.slice(0, 4) : [];
    if (!list.length) {
      ctx.font = `13px ${FONT_PIXEL}`;
      ctx.fillStyle = 'rgba(185, 203, 240, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Añade Pokémon para comparar', width / 2, height / 2);
      return;
    }

    const groupW = plotW / STAT_METRICS.length;

    STAT_METRICS.forEach((m, i) => {
      const gx = padL + i * groupW;

      // Etiqueta del eje
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#b9cbf0';
      ctx.font = options.expanded ? `700 12px ${FONT_PIXEL}` : `700 11px ${FONT_PIXEL}`;
      ctx.fillText(m.short, gx + groupW / 2, padT + plotH + 8);

      const innerW = groupW * 0.82;
      const isSingle = list.length === 1;
      const barW = isSingle ? Math.min(26, innerW * 0.45) : Math.max(3, innerW / list.length);
      const startX = isSingle ? (gx + (groupW - barW) / 2) : (gx + (groupW - innerW) / 2);

      const metricRows = list.map((p, pIdx) => {
        const col = COMPARISON_COLORS[pIdx % COMPARISON_COLORS.length];
        const rawVal = p[m.key] != null ? p[m.key] : 0;
        const formatted = m.fmt ? m.fmt(rawVal) : rawVal;
        return { p, col, rawVal, formatted };
      });
      const maxMetricVal = Math.max(...metricRows.map(r => r.rawVal));

      // Hit de columna completa (para que al poner el cursor en cualquier punto de la columna se vean todos los Pokémon)
      canvas._hits.push({
        type: 'column',
        x: gx,
        y: padT,
        w: groupW,
        h: plotH + padB,
        isSpecific: false,
        customHtml: `
          <div class="tip-header">
            <span class="tip-icon">📊</span>
            <b class="tip-title">${m.label} (${m.short})</b>
            <span class="tip-badge">Combate Real</span>
          </div>
          <div class="tip-desc">Techo máximo verificado en motor: ${m.max}${m.unit}</div>
          <div class="tip-rows">
            ${metricRows.map(r => `
              <div class="tip-row ${r.rawVal === maxMetricVal && metricRows.length > 1 ? 'is-leader' : ''}">
                <span class="tip-dot" style="background:${r.col.stroke}; color:${r.col.stroke}"></span>
                <b class="tip-pokename">${r.p.name}</b>
                <span class="tip-stat-val" style="color:${r.col.stroke}">${r.formatted}</span>
                ${r.rawVal === maxMetricVal && metricRows.length > 1 ? '<span class="tip-crown">👑 Mayor</span>' : ''}
              </div>
            `).join('')}
          </div>
        `
      });

      list.forEach((p, idx) => {
        const col = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
        const rawVal = p[m.key] != null ? p[m.key] : 0;
        const normPct = m.scale ? m.scale(rawVal) : (rawVal / m.max) * 100;
        const clampedPct = Math.max(3, Math.min(100, normPct));
        const bh = (clampedPct / 100) * plotH;
        const bx = startX + idx * barW;
        const by = padT + plotH - bh;

        // Barra con degradado vertical
        const grad = ctx.createLinearGradient(0, by, 0, by + bh);
        grad.addColorStop(0, col.stroke);
        grad.addColorStop(1, col.fill);

        ctx.fillStyle = grad;
        ctx.fillRect(bx + 1, by, barW - 2, bh);
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 1, by, barW - 2, bh);

        // Valor arriba de la barra (siempre visible para 1 Pokémon o cuando hay espacio)
        if (isSingle || options.expanded || barW >= 14) {
          ctx.font = `700 10.5px ${FONT_PIXEL}`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(m.fmt ? m.fmt(rawVal) : String(Math.round(rawVal)), bx + barW / 2, by - 2);
        }

        canvas._hits.push({
          type: 'rect',
          x: bx,
          y: padT,
          w: barW,
          h: plotH,
          name: p.name,
          isSpecific: true,
          customHtml: `
            <div class="tip-header">
              <span class="tip-dot" style="background:${col.stroke}; color:${col.stroke}"></span>
              <b class="tip-title">${p.name} · ${m.label}</b>
              <span class="tip-badge">${m.short}</span>
            </div>
            <div class="tip-desc">Valor en combate: <b style="color:#ffd23f">${m.fmt ? m.fmt(rawVal) : rawVal}</b> (${Math.round(clampedPct)}% del máx)</div>
            <div class="tip-rows">
              <div style="font-size:11px; color:#8ea4cc; margin-bottom:2px">Comparativa con la escuadra:</div>
              ${metricRows.map(r => `
                <div class="tip-row ${r.p.dex === p.dex ? 'is-focused' : (r.rawVal === maxMetricVal && metricRows.length > 1 ? 'is-leader' : '')}">
                  <span class="tip-dot" style="background:${r.col.stroke}; color:${r.col.stroke}"></span>
                  <b class="tip-pokename">${r.p.name} ${r.p.dex === p.dex ? '(Enfocado)' : ''}</b>
                  <span class="tip-stat-val" style="color:${r.col.stroke}">${r.formatted}</span>
                  ${r.rawVal === maxMetricVal && metricRows.length > 1 ? '<span class="tip-crown">👑</span>' : ''}
                </div>
              `).join('')}
            </div>
          `
        });
      });
    });
  }

  /* =========================================================================
   * 3. GRÁFICO DE TORTA / ANILLO DONUT DE CUOTA DE PODER Y BALANCE
   * ========================================================================= */
  function drawDonut(canvas, pokemonList, options = {}) {
    const s = setupCanvas(canvas, options);
    if (!s) return;
    const { ctx, width, height } = s;

    canvas._lastDrawFn = drawDonut;
    canvas._lastPokemonList = pokemonList;
    canvas._lastOptions = options;

    const list = Array.isArray(pokemonList) ? pokemonList.slice(0, 4) : [];
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - (options.expanded ? 40 : 28);
    const innerRadius = outerRadius * 0.58;

    if (!list.length) {
      ctx.font = `13px ${FONT_PIXEL}`;
      ctx.fillStyle = 'rgba(185, 203, 240, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Añade Pokémon para comparar', centerX, centerY);
      return;
    }

    // Caso A: 1 Solo Pokémon seleccionado (Anillo completo 360° de cuota de poder)
    if (list.length === 1) {
      const p = list[0];
      const col = COMPARISON_COLORS[0];

      // Anillo Donut completo
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = col.stroke;
      ctx.shadowColor = col.stroke;
      ctx.shadowBlur = options.expanded ? 14 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(11, 16, 29, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Etiqueta 100% en el anillo superior
      ctx.font = `700 13px ${FONT_PIXEL}`;
      ctx.fillStyle = '#0b101d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100%', centerX, centerY - ((outerRadius + innerRadius) / 2));

      // Hit registration para hover tooltip (1 Pokémon)
      canvas._hits.push({
        type: 'arc',
        cx: centerX,
        cy: centerY,
        rIn: innerRadius,
        rOut: outerRadius,
        startAngle: 0,
        endAngle: Math.PI * 2,
        isSpecific: true,
        name: p.name,
        customHtml: `
          <div class="tip-header">
            <span class="tip-dot" style="background:${col.stroke}; color:${col.stroke}"></span>
            <b class="tip-title">${p.name} · Cuota de Poder</b>
            <span class="tip-badge">100% Escuadra</span>
          </div>
          <div class="tip-highlight-box">
            Aporte exclusivo: <b style="color:#ffd23f">100%</b> del BST total
          </div>
          <div class="tip-grid-2">
            <div>BST Oficial: <b>${p.bst}</b></div>
            <div>Score Global: <b style="color:${col.stroke}">${p.performance.overall}/100</b></div>
            <div>Rol: <b>${p.assignedRole || 'Combatiente'}</b></div>
            <div>Velocidad: <b>${p.spd} SPD</b></div>
          </div>
        `
      });

      // Círculo central con información del Pokémon
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(13, 19, 34, 0.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 218, 102, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = options.expanded ? `700 22px ${FONT_PIXEL}` : `700 18px ${FONT_PIXEL}`;
      ctx.fillStyle = '#ffd23f';
      ctx.fillText(`${p.bst}`, centerX, centerY - 6);

      ctx.font = `600 11px ${FONT_PIXEL}`;
      ctx.fillStyle = '#9fb1c9';
      ctx.fillText('BST Base', centerX, centerY + 12);
      return;
    }

    // Caso B: 2, 3 o 4 Pokémon (Reparto porcentual de BST de la escuadra)
    const totalPower = list.reduce((sum, p) => sum + (p.bst || 300), 0);
    const avgBst = Math.round(totalPower / list.length);

    let startAngle = -Math.PI / 2;
    const arcGap = 0.04; // Pequeña separación estética entre porciones

    list.forEach((p, idx) => {
      const col = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
      const slicePct = (p.bst || 300) / totalPower;
      const sliceAngle = slicePct * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      const adjStart = startAngle + (arcGap / 2);
      const adjEnd = endAngle - (arcGap / 2);

      // Dibujar arco Donut
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, adjStart, adjEnd);
      ctx.arc(centerX, centerY, innerRadius, adjEnd, adjStart, true);
      ctx.closePath();

      ctx.fillStyle = col.stroke;
      ctx.shadowColor = col.stroke;
      ctx.shadowBlur = options.expanded ? 12 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Línea de borde
      ctx.strokeStyle = 'rgba(11, 16, 29, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Etiqueta flotante con el porcentaje
      const midAngle = startAngle + (sliceAngle / 2);
      const labelRadius = outerRadius * 0.79;
      const lx = centerX + Math.cos(midAngle) * labelRadius;
      const ly = centerY + Math.sin(midAngle) * labelRadius;

      if (slicePct >= 0.12) {
        ctx.font = `700 12px ${FONT_PIXEL}`;
        ctx.fillStyle = '#0b101d';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(slicePct * 100)}%`, lx, ly);
      }

      // Hit registration para hover tooltip
      let normStart = startAngle;
      let normEnd = endAngle;
      while (normStart < 0) normStart += Math.PI * 2;
      while (normEnd < 0) normEnd += Math.PI * 2;

      canvas._hits.push({
        type: 'arc',
        cx: centerX,
        cy: centerY,
        rIn: innerRadius,
        rOut: outerRadius,
        startAngle: adjStart,
        endAngle: adjEnd,
        isSpecific: true,
        name: p.name,
        customHtml: `
          <div class="tip-header">
            <span class="tip-dot" style="background:${col.stroke}; color:${col.stroke}"></span>
            <b class="tip-title">${p.name} · Cuota de Poder</b>
            <span class="tip-badge">${Math.round(slicePct * 100)}% BST</span>
          </div>
          <div class="tip-highlight-box">
            Aporte a la Escuadra: <b style="color:#ffd23f">${Math.round(slicePct * 100)}%</b> del BST total (${totalPower})
          </div>
          <div class="tip-grid-2">
            <div>Total Base (BST): <b>${p.bst}</b></div>
            <div>Score Global: <b style="color:${col.stroke}">${p.performance.overall}/100</b></div>
            <div>Rol de Combate: <b>${p.assignedRole || 'Combatiente'}</b></div>
            <div>Velocidad Real: <b>${p.spd} SPD</b></div>
          </div>
          ${list.length > 1 ? `
            <div class="tip-sub-compare">
              <div style="font-size:11px; color:#8ea4cc; margin-bottom:3px">Otros integrantes de la escuadra:</div>
              ${list.filter(other => other.dex !== p.dex).map(other => {
                const oIdx = list.indexOf(other);
                const oCol = COMPARISON_COLORS[oIdx % COMPARISON_COLORS.length];
                const oPct = Math.round(((other.bst || 300) / totalPower) * 100);
                return `<div style="font-size:11.5px"><span style="color:${oCol.stroke}">●</span> ${other.name}: <b>${other.bst} BST (${oPct}%)</b></div>`;
              }).join('')}
            </div>
          ` : ''}
        `
      });

      startAngle = endAngle;
    });

    // Círculo central con información resumida y hit interactivo
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13, 19, 34, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 218, 102, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    canvas._hits.push({
      type: 'circle',
      x: centerX,
      y: centerY,
      r: innerRadius - 2,
      isSpecific: false,
      customHtml: `
        <div class="tip-header">
          <span class="tip-icon">⚖️</span>
          <b class="tip-title">Balance de Escuadra</b>
          <span class="tip-badge">${list.length} Integrantes</span>
        </div>
        <div class="tip-desc">BST Promedio: <b style="color:#ffd23f">${avgBst}</b> · BST Total: <b>${totalPower}</b></div>
        <div class="tip-rows">
          ${list.map((item, idx) => {
            const col = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
            const pct = Math.round(((item.bst || 300) / totalPower) * 100);
            return `
              <div class="tip-row">
                <span class="tip-dot" style="background:${col.stroke}; color:${col.stroke}"></span>
                <b class="tip-pokename">${item.name}</b>
                <span class="tip-stat-val" style="color:${col.stroke}">${item.bst} BST (${pct}%)</span>
              </div>
            `;
          }).join('')}
        </div>
      `
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = options.expanded ? `700 20px ${FONT_PIXEL}` : `700 16px ${FONT_PIXEL}`;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`${avgBst}`, centerX, centerY - 6);

    ctx.font = `600 11px ${FONT_PIXEL}`;
    ctx.fillStyle = '#9fb1c9';
    ctx.fillText('BST Medio', centerX, centerY + 12);
  }

  /* =========================================================================
   * 4. MATRIZ CARTESIANA DE POSICIONAMIENTO TÁCTICO (OFENSIVA VS AGUANTE)
   * ========================================================================= */
  function drawMatrix(canvas, pokemonList, options = {}) {
    const s = setupCanvas(canvas, options);
    if (!s) return;
    const { ctx, width, height } = s;

    canvas._lastDrawFn = drawMatrix;
    canvas._lastPokemonList = pokemonList;
    canvas._lastOptions = options;

    const padL = options.expanded ? 50 : 38;
    const padR = options.expanded ? 36 : 24;
    const padT = options.expanded ? 34 : 26;
    const padB = options.expanded ? 46 : 36;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const midX = padL + (plotW / 2);
    const midY = padT + (plotH / 2);

    // Fondos sutiles por cuadrante
    // Q1 (Arriba-Izquierda): Glass Cannon (Ofensiva alta, Supervivencia baja)
    ctx.fillStyle = 'rgba(255, 95, 109, 0.06)';
    ctx.fillRect(padL, padT, plotW / 2, plotH / 2);

    // Q2 (Arriba-Derecha): Titán / All-Rounder (Ofensiva alta, Supervivencia alta)
    ctx.fillStyle = 'rgba(255, 210, 63, 0.08)';
    ctx.fillRect(midX, padT, plotW / 2, plotH / 2);

    // Q3 (Abajo-Izquierda): Scout / Hostigador (Ofensiva moderada, Supervivencia moderada)
    ctx.fillStyle = 'rgba(79, 180, 255, 0.05)';
    ctx.fillRect(padL, midY, plotW / 2, plotH / 2);

    // Q4 (Abajo-Derecha): Muralla / Tanque (Ofensiva moderada, Supervivencia alta)
    ctx.fillStyle = 'rgba(95, 224, 138, 0.06)';
    ctx.fillRect(midX, midY, plotW / 2, plotH / 2);

    // Cuadrícula y cruz central
    ctx.strokeStyle = 'rgba(185, 203, 240, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    ctx.beginPath();
    ctx.moveTo(midX, padT);
    ctx.lineTo(midX, padT + plotH);
    ctx.moveTo(padL, midY);
    ctx.lineTo(padL + plotW, midY);
    ctx.strokeStyle = 'rgba(255, 218, 102, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Etiquetas de los cuadrantes
    ctx.font = options.expanded ? `700 11.5px ${FONT_PIXEL}` : `700 10px ${FONT_PIXEL}`;
    ctx.fillStyle = 'rgba(255, 95, 109, 0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('⚡ ARIETE / GLASS CANNON', padL + 8, padT + 8);

    ctx.fillStyle = 'rgba(255, 210, 63, 0.8)';
    ctx.textAlign = 'right';
    ctx.fillText('👑 TITÁN / ALL-ROUNDER', padL + plotW - 8, padT + 8);

    ctx.fillStyle = 'rgba(79, 180, 255, 0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🏃 SCOUT / HOSTIGADOR', padL + 8, padT + plotH - 8);

    ctx.fillStyle = 'rgba(95, 224, 138, 0.8)';
    ctx.textAlign = 'right';
    ctx.fillText('🛡️ MURALLA / TANQUE', padL + plotW - 8, padT + plotH - 8);

    // Etiquetas de ejes
    ctx.font = `700 12px ${FONT_PIXEL}`;
    ctx.fillStyle = '#b9cbf0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Supervivencia y Aguante (HP + Defensas) →', midX, padT + plotH + 12);

    ctx.save();
    ctx.translate(padL - (options.expanded ? 30 : 22), midY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('← Potencia Ofensiva (ATK / Burst)', 0, 0);
    ctx.restore();

    const list = Array.isArray(pokemonList) ? pokemonList.slice(0, 4) : [];
    if (!list.length) {
      ctx.font = `13px ${FONT_PIXEL}`;
      ctx.fillStyle = 'rgba(185, 203, 240, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Añade Pokémon para comparar', midX, midY);
      return;
    }

    // Caso A: 1 Solo Pokémon seleccionado (Líneas guía a los ejes y tarjeta destacada)
    if (list.length === 1) {
      const p = list[0];
      const col = COMPARISON_COLORS[0];
      const surv = Math.max(10, Math.min(100, p.performance.survival || 50));
      const off = Math.max(10, Math.min(100, p.performance.offensive || 50));

      const px = padL + (surv / 100) * plotW;
      const py = padT + plotH - (off / 100) * plotH;
      const nodeR = options.expanded ? 14 : 11;

      // Líneas guía discontinuas hacia los ejes
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = 1.5;
      // Línea hacia el eje X (abajo)
      ctx.moveTo(px, py);
      ctx.lineTo(px, padT + plotH);
      // Línea hacia el eje Y (izquierda)
      ctx.moveTo(px, py);
      ctx.lineTo(padL, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Indicadores en los ejes
      ctx.font = `700 11px ${FONT_PIXEL}`;
      ctx.fillStyle = col.stroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${surv}%`, px, padT + plotH + 3);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${off}%`, padL - 4, py);

      // Halo exterior brillante
      ctx.beginPath();
      ctx.arc(px, py, nodeR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = col.fill;
      ctx.fill();

      // Círculo del nodo
      ctx.beginPath();
      ctx.arc(px, py, nodeR, 0, Math.PI * 2);
      ctx.fillStyle = col.stroke;
      ctx.shadowColor = col.stroke;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Etiqueta destacada en píldora
      const label = `${p.name} (Of: ${off} · Sup: ${surv})`;
      ctx.font = options.expanded ? `700 13px ${FONT_PIXEL}` : `700 11.5px ${FONT_PIXEL}`;
      const tw = ctx.measureText(label).width;
      const pillW = tw + 14;
      const pillH = 22;
      const pillX = Math.max(padL + 2, Math.min(padL + plotW - pillW - 2, px - (pillW / 2)));
      const pillY = py - nodeR - pillH - 5 > padT ? py - nodeR - pillH - 5 : py + nodeR + 6;

      ctx.fillStyle = 'rgba(8, 15, 34, 0.94)';
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(pillX, pillY, pillW, pillH, 6) : ctx.rect(pillX, pillY, pillW, pillH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pillX + (pillW / 2), pillY + (pillH / 2));

      canvas._hits.push({
        type: 'circle',
        x: px,
        y: py,
        r: nodeR * 2,
        name: p.name,
        title: `${p.name} · Posición Táctica`,
        subtitle: `Ofensiva: ${off}/100 · Supervivencia: ${surv}/100`,
        lines: [
          `Índice Global: <b style="color:${col.stroke}">${p.performance.overall}/100</b>`,
          `Velocidad: <b>${p.spd} SPD</b> · Vida: <b>${p.hp} HP</b>`
        ],
        color: col.stroke
      });
      return;
    }

    // Caso B: 2, 3 o 4 Pokémon (Posicionamiento con etiquetas desfasadas sin colisiones)
    const labelOffsets = [
      { dx: 0, dy: -1, align: 'center', baseline: 'bottom' }, // arriba
      { dx: 0, dy: 1, align: 'center', baseline: 'top' },    // abajo
      { dx: 1, dy: 0, align: 'left', baseline: 'middle' },   // derecha
      { dx: -1, dy: 0, align: 'right', baseline: 'middle' }  // izquierda
    ];

    list.forEach((p, idx) => {
      const col = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
      const surv = Math.max(10, Math.min(100, p.performance.survival || 50));
      const off = Math.max(10, Math.min(100, p.performance.offensive || 50));

      const px = padL + (surv / 100) * plotW;
      const py = padT + plotH - (off / 100) * plotH;
      const nodeR = options.expanded ? 12 : 9;

      // Halo exterior brillante
      ctx.beginPath();
      ctx.arc(px, py, nodeR * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = col.fill;
      ctx.fill();

      // Círculo del nodo
      ctx.beginPath();
      ctx.arc(px, py, nodeR, 0, Math.PI * 2);
      ctx.fillStyle = col.stroke;
      ctx.shadowColor = col.stroke;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Etiqueta con desfase inteligente y cápsula de fondo para máxima legibilidad
      const offsetConfig = labelOffsets[idx % labelOffsets.length];
      const dist = nodeR + 6;
      const tx = px + offsetConfig.dx * dist;
      const ty = py + offsetConfig.dy * dist;

      ctx.font = options.expanded ? `700 11.5px ${FONT_PIXEL}` : `700 10px ${FONT_PIXEL}`;
      const text = p.name;
      const tw = ctx.measureText(text).width;
      const pw = tw + 8;
      const ph = 16;

      let rx = tx - pw / 2;
      let ry = ty - ph;
      if (offsetConfig.baseline === 'top') ry = ty;
      else if (offsetConfig.baseline === 'middle') ry = ty - ph / 2;
      if (offsetConfig.align === 'left') rx = tx;
      else if (offsetConfig.align === 'right') rx = tx - pw;

      // Mantener dentro del área del gráfico
      rx = Math.max(padL + 2, Math.min(padL + plotW - pw - 2, rx));
      ry = Math.max(padT + 2, Math.min(padT + plotH - ph - 2, ry));

      ctx.fillStyle = 'rgba(8, 15, 34, 0.88)';
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(rx, ry, pw, ph, 4) : ctx.rect(rx, ry, pw, ph);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, rx + pw / 2, ry + ph / 2);

      let quadrantName = 'Titán / All-Rounder';
      if (off >= 50 && surv < 50) quadrantName = 'Ariete / Glass Cannon';
      else if (off < 50 && surv >= 50) quadrantName = 'Muralla / Tanque';
      else if (off < 50 && surv < 50) quadrantName = 'Scout / Hostigador';

      const hitHtml = `
          <div class="tip-header">
            <span class="tip-dot" style="background:${col.stroke}; color:${col.stroke}"></span>
            <b class="tip-title">${p.name} · Posición Táctica</b>
            <span class="tip-badge">${quadrantName}</span>
          </div>
          <div class="tip-highlight-box">
            Arquetipo: <b style="color:#ffd23f">${quadrantName}</b>
          </div>
          <div class="tip-grid-2">
            <div>Potencia Ofensiva: <b style="color:${col.stroke}">${off} / 100</b></div>
            <div>Supervivencia: <b style="color:${col.stroke}">${surv} / 100</b></div>
            <div>Salud Real (HP): <b>${p.hp} HP</b></div>
            <div>Velocidad Real: <b>${p.spd} SPD</b></div>
            <div>Multiplicador ATK: <b>×${p.atk.toFixed(2)}</b></div>
            <div>Score Global: <b style="color:#ffd23f">${p.performance.overall} / 100</b></div>
          </div>
          ${list.length > 1 ? `
            <div class="tip-sub-compare">
              <div style="font-size:11px; color:#8ea4cc; margin-bottom:3px">Comparativa con la escuadra:</div>
              ${list.filter(other => other.dex !== p.dex).map(other => {
                const oIdx = list.indexOf(other);
                const oCol = COMPARISON_COLORS[oIdx % COMPARISON_COLORS.length];
                const oOff = Math.round(other.performance.offensive || 50);
                const oSurv = Math.round(other.performance.survival || 50);
                return `<div style="font-size:11.5px"><span style="color:${oCol.stroke}">●</span> ${other.name}: Ofensiva ${oOff} · Supervivencia ${oSurv}</div>`;
              }).join('')}
            </div>
          ` : ''}
        `;

      // Hit en el nodo circular
      canvas._hits.push({
        type: 'circle',
        x: px,
        y: py,
        r: nodeR * 2.5,
        isSpecific: true,
        name: p.name,
        customHtml: hitHtml
      });

      // Hit en la cápsula/etiqueta de texto para facilitar el hover
      canvas._hits.push({
        type: 'rect',
        x: rx,
        y: ry,
        w: pw,
        h: ph,
        isSpecific: true,
        name: p.name,
        customHtml: hitHtml
      });
    });
  }

  /* =========================================================================
   * 5. RENDERIZADO EN MODAL EXPANDIDO (LIGHTBOX DE ALTA RESOLUCIÓN)
   * ========================================================================= */
  function drawExpanded(canvas, chartType, pokemonList) {
    if (!canvas) return;
    const holder = canvas.parentElement;
    const rect = holder ? holder.getBoundingClientRect() : null;
    const width = Math.round((rect && rect.width > 200) ? rect.width : 860);
    const height = Math.round((rect && rect.height > 200) ? rect.height : 480);
    const options = { expanded: true, width, height };

    if (chartType === 'radar') {
      drawRadar(canvas, pokemonList, options);
    } else if (chartType === 'bars') {
      drawBars(canvas, pokemonList, options);
    } else if (chartType === 'donut') {
      drawDonut(canvas, pokemonList, options);
    } else if (chartType === 'matrix') {
      drawMatrix(canvas, pokemonList, options);
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

  // Redibujar automáticamente cuando la fuente Pixelify esté disponible en el navegador
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      ['comparison-radar-canvas', 'comparison-bars-canvas', 'comparison-donut-canvas', 'comparison-matrix-canvas'].forEach(id => {
        const c = document.getElementById(id);
        if (c && c._lastDrawFn && c._lastPokemonList) {
          c._lastDrawFn(c, c._lastPokemonList, c._lastOptions);
        }
      });
      const exp = document.getElementById('comparison-expanded-canvas');
      if (exp && exp._lastDrawFn && exp._lastPokemonList) {
        exp._lastDrawFn(exp, exp._lastPokemonList, exp._lastOptions);
      }
    });
  }

  return {
    COMPARISON_COLORS,
    RADAR_AXES,
    STAT_METRICS,
    drawRadar,
    drawBars,
    drawDonut,
    drawMatrix,
    drawExpanded,
    renderStatBar,
    calculatePercentiles
  };
})();
