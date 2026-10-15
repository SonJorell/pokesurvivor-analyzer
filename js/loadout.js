/* ============ loadout.js — Objeto equipado por Pokémon y comparativa de mejoras ============
 * PokéSurvivor Character Analyzer
 *
 * Permite asignar UN objeto (como en el juego: uno por run) a cada Pokémon y ver
 * cómo suben sus estadísticas y su rendimiento evaluado respecto al valor base.
 * El cálculo vive en Analyzer.DataAdapter.applyItem; aquí solo se gestiona el estado
 * y se genera el panel de comparación "sin objeto vs con objeto".
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Loadout = (() => {
  'use strict';

  const equipped = {};      // { [dex]: itemId }
  let onChangeCb = null;

  function get(dex) {
    return equipped[dex] || '';
  }

  function set(dex, itemId) {
    if (itemId) equipped[dex] = itemId;
    else delete equipped[dex];
    if (onChangeCb) onChangeCb(dex, itemId || '');
  }

  function onChange(cb) {
    onChangeCb = cb;
  }

  /** Resultado completo de aplicar el objeto equipado al Pokémon */
  function result(p) {
    return Analyzer.DataAdapter.applyItem(p, get(p.dex));
  }

  /**
   * Versión del Pokémon con su objeto aplicado (para radar y barras).
   * Si no lleva objeto, devuelve el mismo Pokémon.
   */
  function effective(p) {
    const r = result(p);
    if (!r.item) return p;
    return Object.assign({}, p, {
      name: `${p.name} + ${r.item.name}`,
      performance: r.performance,
      itemResult: r
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

  /** Selector de objeto + tabla de mejoras para un Pokémon */
  function renderPanel(p) {
    const items = Analyzer.DataAdapter.getItemList();
    const current = get(p.dex);
    const r = result(p);

    const options = ['<option value="">— Sin objeto —</option>']
      .concat(items.map(it =>
        `<option value="${it.id}" ${it.id === current ? 'selected' : ''}>${it.name}</option>`
      )).join('');

    let body = '<p class="item-hint">Elige un objeto para ver cómo cambian sus estadísticas.</p>';

    if (r.item) {
      const s = r.stats, b = r.base, d = r.statDelta, pd = r.perfDelta, pf = r.performance, bp = p.performance;
      const perfRows = [
        ['⚔️ Ofensiva', 'offensive'],
        ['🛡️ Supervivencia', 'survival'],
        ['⚡ Movilidad', 'mobility'],
        ['👑 Vs Jefes', 'boss'],
        ['🌌 Late Game', 'lateGame'],
        ['⭐ Índice Global', 'overall']
      ].map(([lbl, k]) => row(lbl, bp[k], pf[k], fmtDelta(pd[k]))).join('');

      body = `
        <p class="item-desc"><b>${r.item.name}:</b> ${r.item.desc}</p>
        ${r.item.quantified ? '' : '<p class="item-hint">Este objeto no modifica las estadísticas calculadas; su efecto es situacional dentro de la partida.</p>'}
        <div class="table-container">
          <table class="analyzer-table item-compare-table">
            <thead><tr><th>Estadística</th><th>Base</th><th>Con objeto</th><th>Cambio</th></tr></thead>
            <tbody>
              ${row('Ataque (×)', '×' + b.atk.toFixed(2), '×' + s.atk.toFixed(2), fmtDelta(d.atk, 2, '×'))}
              ${row('Velocidad', Math.round(b.spd), Math.round(s.spd), fmtDelta(d.spd, 0))}
              ${row('Vida efectiva', Math.round(b.effHp), Math.round(s.effHp), fmtDelta(d.effHp, 0))}
              ${row('DPS ataque inicial', b.dps, s.dps, fmtDelta(d.dps, 1))}
              ${row('Regeneración / s', '0', s.regen, fmtDelta(d.regen, 1))}
              <tr class="item-compare-sep"><td colspan="4">Rendimiento evaluado (0-100)</td></tr>
              ${perfRows}
            </tbody>
          </table>
        </div>
        <p class="item-hint">Vida efectiva = HP ÷ (1 − reducción de daño). Los gráficos de radar y barras ya reflejan este objeto.</p>`;
    }

    return `
      <div class="item-panel" data-dex="${p.dex}">
        <label class="item-select-label" for="item-select-${p.dex}">🎒 Objeto equipado:</label>
        <select class="field item-select" id="item-select-${p.dex}" data-dex="${p.dex}">${options}</select>
        ${body}
      </div>`;
  }

  /** Delegación de eventos: un único listener para todos los selectores de objeto */
  function init() {
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.classList && t.classList.contains('item-select')) {
        set(+t.dataset.dex, t.value);
      }
    });
  }

  return { init, get, set, onChange, result, effective, renderPanel };
})();
