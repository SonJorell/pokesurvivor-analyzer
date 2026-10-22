/* ============ loadout.js — Configuración de Build (Naturaleza y Objeto) ============
 * PokéSurvivor Character Analyzer
 *
 * Permite cambiar la NATURALEZA (mediante Menta de Kecleon) y asignar UN OBJETO
 * por Pokémon para simular builds completas de combate y ver cómo se transforman
 * sus estadísticas reales de combate y sus índices de rendimiento evaluado.
 * El cálculo de la simulación vive en Analyzer.DataAdapter.applyBuild.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Loadout = (() => {
  'use strict';

  const equipped = {};      // { [dex]: itemId }
  const natures = {};       // { [dex]: natureId }
  let onChangeCb = null;

  const SHORT_STAT_LABEL = {
    pa: 'Atk Fís',
    sa: 'Atk Esp',
    df: 'Def Fís',
    sd: 'Def Esp',
    spd: 'Vel'
  };

  const FULL_STAT_LABEL = {
    pa: 'Ataque Físico',
    sa: 'Ataque Especial',
    df: 'Defensa Física',
    sd: 'Defensa Especial',
    spd: 'Velocidad'
  };

  function get(dex) {
    return equipped[dex] || '';
  }

  function set(dex, itemId) {
    if (itemId) equipped[dex] = itemId;
    else delete equipped[dex];
    if (onChangeCb) onChangeCb(dex, itemId || '');
  }

  function getNature(dex, defaultNatId) {
    if (natures[dex]) return natures[dex];
    if (defaultNatId) return defaultNatId;
    const p = (window.Analyzer && Analyzer.DataAdapter && Analyzer.DataAdapter.getByDex) ? Analyzer.DataAdapter.getByDex(dex) : null;
    if (p && p.natureInfo && p.natureInfo.assigned) return p.natureInfo.assigned.id;
    if (p && p.nature) return p.nature;
    if (window.G && G.Mons && G.Mons.natureOf) {
      const n = G.Mons.natureOf(dex);
      if (n && n.id) return n.id;
    }
    return 'hardy';
  }

  function setNature(dex, natureId) {
    if (natureId) {
      natures[dex] = natureId;
      if (window.G && G.Mons && G.Mons.setNature) {
        try { G.Mons.setNature(dex, natureId); } catch (e) {}
      }
    } else {
      delete natures[dex];
    }
    if (onChangeCb) onChangeCb(dex, natureId || '');
  }

  function onChange(cb) {
    onChangeCb = cb;
  }

  /** Resultado completo de aplicar la naturaleza y el objeto equipado al Pokémon */
  function result(p) {
    const natId = getNature(p.dex);
    const itemId = get(p.dex);
    return Analyzer.DataAdapter.applyBuild(p, itemId, natId);
  }

  /**
   * Versión del Pokémon con su objeto y naturaleza aplicados (para radar, barras, podio y comparador).
   */
  function effective(p) {
    const r = result(p);
    const assignedNatId = (p.natureInfo && p.natureInfo.assigned && p.natureInfo.assigned.id) || p.nature || 'hardy';
    const isNatChanged = r.nature && (r.nature.id !== assignedNatId);
    const hasItem = !!(r.item && r.item.id);

    let suffix = '';
    if (hasItem && isNatChanged) {
      suffix = ` + ${r.item.name} (${r.nature.name})`;
    } else if (hasItem) {
      suffix = ` + ${r.item.name}`;
    } else if (isNatChanged) {
      suffix = ` (${r.nature.name})`;
    }

    return Object.assign({}, p, {
      name: `${p.name}${suffix}`,
      atk: r.stats.atk,
      pa: r.stats.pa,
      sa: r.stats.sa,
      df: r.stats.df,
      sd: r.stats.sd,
      spd: r.stats.spd,
      hp: r.stats.effHp,
      bst: r.stats.bst,
      takenPhysical: r.stats.takenPhysical,
      takenSpecial: r.stats.takenSpecial,
      mitigationPhysical: r.stats.mitigationPhysical,
      mitigationSpecial: r.stats.mitigationSpecial,
      performance: r.performance,
      buildResult: r,
      itemResult: r,
      effectiveNature: r.nature,
      effectiveItem: r.item
    });
  }

  function fmtDelta(v, decimals = 0, prefix = '') {
    if (!v || Math.abs(v) < Math.pow(10, -decimals) / 2) return '<span class="item-delta zero">=</span>';
    const sign = v > 0 ? '+' : '−';
    const cls = v > 0 ? 'pos' : 'neg';
    return `<span class="item-delta ${cls}">${sign}${prefix}${Math.abs(v).toFixed(decimals)}</span>`;
  }

  function row(label, baseTxt, newTxt, deltaHtml) {
    return `
      <tr>
        <td>${label}</td>
        <td>${baseTxt}</td>
        <td><b>${newTxt}</b></td>
        <td>${deltaHtml}</td>
      </tr>`;
  }

  /**
   * Panel interactivo de Build para un Pokémon (Naturaleza / Menta + Objeto equipado + Comparativa de estadísticas)
   * @param {Object} p Pokémon
   * @param {Object} options { showNature: boolean }
   */
  function renderPanel(p, options = {}) {
    const showNature = options.showNature !== false;
    const items = Analyzer.DataAdapter.getItemList();
    const currentItem = get(p.dex);
    const currentNat = getNature(p.dex);
    const assignedNatId = (p.natureInfo && p.natureInfo.assigned && p.natureInfo.assigned.id) || p.nature || 'hardy';
    const r = result(p);

    // 1. Selector de Naturaleza / Menta + Botones 1-Click
    let natureBlock = '';
    if (showNature) {
      const allNatures = (window.G && G.NATURES) ? G.NATURES : [];
      const recNatures = (p.natureInfo && p.natureInfo.recommended) ? p.natureInfo.recommended : ((Analyzer.DataAdapter && Analyzer.DataAdapter.getRecommendedNatures) ? Analyzer.DataAdapter.getRecommendedNatures(p) : []);
      const recSet = new Set(recNatures.map(rn => rn.id));

      const natOptions = allNatures.map(n => {
        const isRec = recSet.has(n.id);
        const isBase = (n.id === assignedNatId);
        const natName = Array.isArray(n.n) ? n.n[0] : n.id;
        const star = isRec ? '⭐ ' : '';
        let modTxt = '(Neutra)';
        if (n.up && n.down) {
          modTxt = `(+10% ${SHORT_STAT_LABEL[n.up] || n.up}, −10% ${SHORT_STAT_LABEL[n.down] || n.down})`;
        }
        const tag = isRec ? ' [Recomendada]' : (isBase ? ' [Base]' : '');
        return `<option value="${n.id}" ${n.id === currentNat ? 'selected' : ''}>${star}${natName} ${modTxt}${tag}</option>`;
      }).join('');

      const activeNatDef = (window.G && G.NATURE_BY && G.NATURE_BY[currentNat]) || null;
      let summaryChips = '';
      if (activeNatDef && activeNatDef.up && activeNatDef.down) {
        const isChanged = currentNat !== assignedNatId;
        summaryChips = `
          <span class="nat-chip up">${(window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('trendUp', { size: 11 }) + ' ' : ''}+10% ${FULL_STAT_LABEL[activeNatDef.up]}</span>
          <span class="nat-chip down">${(window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('trendDown', { size: 11 }) + ' ' : ''}−10% ${FULL_STAT_LABEL[activeNatDef.down]}</span>
          ${isChanged ? '<span class="nat-chip up" title="Modificada con Menta de Kecleon">Menta Activa</span>' : '<span class="nat-chip neutral" title="Naturaleza base que le tocó">Naturaleza Base</span>'}
        `;
      } else {
        summaryChips = '<span class="nat-chip neutral">Naturaleza Neutra (Sin alteración)</span>';
      }

      // Pastillas de 1-click para cambiar al instante de naturaleza
      const quickNatPills = [];
      recNatures.slice(0, 3).forEach(rn => {
        const isAct = rn.id === currentNat;
        const upTxt = rn.up ? `+${SHORT_STAT_LABEL[rn.up] || rn.up}` : '';
        const downTxt = rn.down ? `−${SHORT_STAT_LABEL[rn.down] || rn.down}` : '';
        quickNatPills.push(`
          <button type="button" class="quick-chip-btn nat-btn ${isAct ? 'active' : ''}" data-dex="${p.dex}" data-type="nature" data-val="${rn.id}" title="Cambiar a naturaleza ${rn.name}">
            ⭐ ${rn.name} <small>(${upTxt}/${downTxt})</small>
          </button>
        `);
      });

      const assignedDef = (window.G && G.NATURE_BY && G.NATURE_BY[assignedNatId]) || null;
      const assignedName = assignedDef ? (Array.isArray(assignedDef.n) ? assignedDef.n[0] : (assignedDef.name || assignedNatId)) : 'Base';
      quickNatPills.push(`
        <button type="button" class="quick-chip-btn nat-btn ${currentNat === assignedNatId ? 'active' : ''}" data-dex="${p.dex}" data-type="nature" data-val="${assignedNatId}" title="Restablecer a naturaleza base asignada">
          Base (${assignedName})
        </button>
      `);

      quickNatPills.push(`
        <button type="button" class="quick-chip-btn nat-btn ${currentNat === 'hardy' ? 'active' : ''}" data-dex="${p.dex}" data-type="nature" data-val="hardy" title="Naturaleza neutral sin variaciones">
          Neutra
        </button>
      `);

      natureBlock = `
        <div class="comp-control-group">
          <label class="item-select-label" for="nature-select-${p.dex}">
            ${(window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('sparkles', { size: 14 }) + ' ' : ''}Naturaleza / Menta:
          </label>
          <div class="comp-quick-chips-wrap">
            <span class="quick-chip-label">Cambio rápido de Menta:</span>
            <div class="comp-quick-chips">
              ${quickNatPills.join('')}
            </div>
          </div>
          <select class="field comp-nature-select" id="nature-select-${p.dex}" data-dex="${p.dex}" style="margin-top:6px">${natOptions}</select>
          <div class="comp-nature-summary">${summaryChips}</div>
        </div>
      `;
    }

    // 2. Selector de Objeto equipado + Botones 1-Click
    const QUICK_ITEMS = [
      { id: '', name: 'Sin objeto' },
      { id: 'choiceband', name: 'Cinta (+40% Atk)' },
      { id: 'lifeorb', name: 'Vidasfera (+30% Atk)' },
      { id: 'choicescarf', name: 'Pañuelo (+35% Vel)' },
      { id: 'assaultvest', name: 'Chaleco (-20% Daño)' }
    ];

    const quickItemPills = QUICK_ITEMS.map(qi => `
      <button type="button" class="quick-chip-btn item-btn ${currentItem === qi.id ? 'active' : ''}" data-dex="${p.dex}" data-type="item" data-val="${qi.id}" title="Equipar ${qi.name}">
        ${qi.name}
      </button>
    `).join('');

    const itemOptions = ['<option value="">— Sin objeto —</option>']
      .concat(items.map(it =>
        `<option value="${it.id}" ${it.id === currentItem ? 'selected' : ''}>${it.name}</option>`
      )).join('');

    const itemBlock = `
      <div class="comp-control-group" style="${showNature ? 'margin-top:10px' : ''}">
        <label class="item-select-label" for="item-select-${p.dex}">
          ${(window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('backpack', { size: 14 }) + ' ' : ''}Objeto equipado:
        </label>
        <div class="comp-quick-chips-wrap">
          <span class="quick-chip-label">Objetos rápidos:</span>
          <div class="comp-quick-chips">
            ${quickItemPills}
          </div>
        </div>
        <select class="field item-select" id="item-select-${p.dex}" data-dex="${p.dex}" style="margin-top:6px">${itemOptions}</select>
      </div>
    `;

    // 3. Tabla de mejoras y diferencias rápidas (Base vs Con Build)
    const s = r.stats, b = r.base, d = r.statDelta, pd = r.perfDelta, pf = r.performance, bp = p.performance;

    let body = '';
    if (r.item) {
      body += `
        <p class="item-desc" style="margin-top:8px"><b>${r.item.name}:</b> ${r.item.desc}</p>
        ${r.item.quantified ? '' : '<p class="item-hint">Este objeto no modifica las estadísticas numéricas directas; su efecto es situacional en partida.</p>'}
      `;
    }

    const perfRows = [
      ['Ofensiva', 'offensive', 'sword'],
      ['Supervivencia', 'survival', 'shield'],
      ['Movilidad', 'mobility', 'zap'],
      ['Vs Jefes', 'boss', 'crown'],
      ['Late Game', 'lateGame', 'portal'],
      ['Índice Global', 'overall', 'star']
    ].map(([lbl, k, ico]) => {
      const iconHtml = (window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get(ico, { size: 14 }) + ' ' : '';
      return row(iconHtml + lbl, bp[k], pf[k], fmtDelta(pd[k]));
    }).join('');

    body += `
      <div class="build-diff-box" style="margin-top:10px">
        <div class="build-diff-header">
          <span class="build-diff-title">${(window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('trendUp', { size: 12 }) + ' ' : ''}Diferencias de Build (Base vs Con Menta y Objeto)</span>
        </div>
        <div class="table-container">
          <table class="analyzer-table item-compare-table">
            <thead><tr><th>Estadística</th><th>Base</th><th>Con Build</th><th>Diferencia</th></tr></thead>
            <tbody>
              ${row('Ataque Dominante', '×' + b.atk.toFixed(2), '×' + s.atk.toFixed(2), fmtDelta(d.atk, 2, '×'))}
              ${row('Atk Físico (PA)', '×' + b.pa.toFixed(2), '×' + s.pa.toFixed(2), fmtDelta(d.pa, 2, '×'))}
              ${row('At. Especial (SA)', '×' + b.sa.toFixed(2), '×' + s.sa.toFixed(2), fmtDelta(d.sa, 2, '×'))}
              ${row('Defensa Física (DF)', b.df, s.df, fmtDelta(d.df, 0))}
              ${row('Defensa Especial (SD)', b.sd, s.sd, fmtDelta(d.sd, 0))}
              ${row('Velocidad (SPD)', Math.round(b.spd), Math.round(s.spd), fmtDelta(d.spd, 0))}
              ${row('Vida efectiva (HP)', Math.round(b.effHp), Math.round(s.effHp), fmtDelta(d.effHp, 0))}
              ${row('DPS ataque inicial', b.dps, s.dps, fmtDelta(d.dps, 1))}
              ${s.regen > 0 ? row('Regeneración / s', '0', s.regen, fmtDelta(d.regen, 1)) : ''}
              <tr class="item-compare-sep"><td colspan="4">Rendimiento evaluado (0-100)</td></tr>
              ${perfRows}
            </tbody>
          </table>
        </div>
        <p class="item-hint" style="margin:6px 0 0">Los gráficos superiores y las barras inferiores reflejan automáticamente estas diferencias en vivo.</p>
      </div>
    `;

    return `
      <div class="item-panel" data-dex="${p.dex}">
        ${natureBlock}
        ${itemBlock}
        ${body}
      </div>
    `;
  }

  /** Delegación de eventos: listeners para selectores y botones de cambio rápido */
  function init() {
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.classList) {
        if (t.classList.contains('item-select')) {
          set(+t.dataset.dex, t.value);
        } else if (t.classList.contains('comp-nature-select')) {
          setNature(+t.dataset.dex, t.value);
        }
      }
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-chip-btn');
      if (btn && btn.dataset) {
        const dex = +btn.dataset.dex;
        const type = btn.dataset.type;
        const val = btn.dataset.val;
        if (type === 'nature') {
          setNature(dex, val);
        } else if (type === 'item') {
          set(dex, val);
        }
      }
    });
  }

  return {
    init,
    get,
    set,
    getNature,
    setNature,
    onChange,
    result,
    effective,
    renderPanel
  };
})();
