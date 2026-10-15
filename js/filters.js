/* ============ filters.js — Motor de Filtros y Búsqueda ============
 * PokéSurvivor Character Analyzer
 *
 * Gestiona el filtrado reactivo multifacético:
 * - Búsqueda por texto (nombre, número dex, movimiento inicial)
 * - Filtro por tipos (primario, secundario o cualquiera de los dos)
 * - Filtro por generación (1 a 9)
 * - Filtro por categoría de disponibilidad (Inicial, Gacha, Legendario de grieta, Variante Shiny, Flotante)
 * - Filtro por rareza (1★ a 5★)
 * - Filtro por disponibilidad de movimientos o familias de ataque (proyectil, rayo, etc.)
 * - Filtro por características verificadas (inmunidad ambiental, con evoluciones de movimiento)
 * - Ordenamiento multidireccional por todos los atributos numéricos y alfabéticos
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Filters = (() => {
  'use strict';

  // Estado por defecto
  const DEFAULT_STATE = {
    search: '',
    type: 'all',
    gen: 'all',           // 'all' | 1 a 9 (Región)
    region: 'all',        // 'all' | 1 a 9
    category: 'all',      // 'all' | 'starter' | 'legendary' | 'shiny' | 'hover' | 'boss'
    rarity: 'all',        // 'all' | 1 | 2 | 3 | 4 | 5
    minHp: 0,             // Filtro mínimo de salud en juego (0 = desactivado, 70-185)
    minAtk: 0,            // Filtro mínimo de multiplicador de ataque (0 = desactivado, 0.76-1.70)
    minSpd: 0,            // Filtro mínimo de velocidad en juego (0 = desactivado, 80-162)
    moveKind: 'all',      // 'all' | 'projectile' | 'melee' | ...
    moveId: 'all',        // 'all' | id específico
    trait: 'all',         // 'all' | 'hovers' | 'liquid_immune' | 'has_evo'
    sortBy: 'dex',        // 'dex' | 'name' | 'hp' | 'spd' | 'atk' | 'bst' | 'rarity' | 'performance'
    sortDir: 'asc'        // 'asc' | 'desc'
  };

  // Copia activa del estado
  let state = Object.assign({}, DEFAULT_STATE);
  const listeners = [];

  function getState() {
    return Object.assign({}, state);
  }

  function set(key, value) {
    if (state[key] === value) return;
    state[key] = value;
    notify();
  }

  function setMultiple(updates) {
    let changed = false;
    for (const k in updates) {
      if (state[k] !== updates[k]) {
        state[k] = updates[k];
        changed = true;
      }
    }
    if (changed) notify();
  }

  function reset() {
    state = Object.assign({}, DEFAULT_STATE);
    notify();
  }

  function subscribe(fn) {
    if (typeof fn === 'function' && !listeners.includes(fn)) {
      listeners.push(fn);
    }
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }

  function notify() {
    for (const fn of listeners) {
      try {
        fn(getState());
      } catch (err) {
        console.error('Analyzer.Filters listener error:', err);
      }
    }
  }

  /**
   * Aplica todos los filtros activos sobre la colección de Pokémon
   */
  function apply(pokemonList) {
    if (!Array.isArray(pokemonList)) return [];

    const q = state.search.trim().toLowerCase();
    const typeFilter = state.type;
    const genFilter = state.gen;
    const catFilter = state.category;
    const rarityFilter = state.rarity;
    const moveKindFilter = state.moveKind;
    const moveIdFilter = state.moveId;
    const traitFilter = state.trait;

    const filtered = pokemonList.filter(p => {
      // 1. Buscador por texto
      if (q) {
        const matchDex = String(p.dex).includes(q) || String(p.dex).padStart(3, '0').includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchStartMove = p.moves.startMove && p.moves.startMove.name.toLowerCase().includes(q);
        const matchTypes = p.types.some(t => t.toLowerCase().includes(q) || (G.U.TYPE_NAME[t] && G.U.TYPE_NAME[t].toLowerCase().includes(q)));
        if (!matchDex && !matchName && !matchStartMove && !matchTypes) {
          return false;
        }
      }

      // 2. Filtro por tipo
      if (typeFilter !== 'all') {
        if (!p.types.includes(typeFilter)) return false;
      }

      // 3. Filtro por generación / región
      const effectiveGen = genFilter !== 'all' ? genFilter : state.region;
      if (effectiveGen !== 'all') {
        if (p.gen !== Number(effectiveGen)) return false;
      }

      // 4. Filtro por categoría
      if (catFilter !== 'all') {
        if (catFilter === 'starter' && !p.isStarter) return false;
        if (catFilter === 'legendary' && !p.isLegendary) return false;
        if (catFilter === 'shiny' && !p.sprite.hasShiny) return false;
        if (catFilter === 'hover' && !p.sprite.hovers) return false;
        if (catFilter === 'boss' && !p.enemyRole.isBossCandidate) return false;
      }

      // 5. Filtro por rareza (1★ a 5★)
      if (rarityFilter !== 'all') {
        if (p.rarity !== Number(rarityFilter)) return false;
      }

      // 6. Filtros numéricos de estadísticas mínimas (HP, ATK, SPD)
      if (state.minHp > 0 && p.hp < state.minHp) return false;
      if (state.minAtk > 0 && p.atk < state.minAtk) return false;
      if (state.minSpd > 0 && p.spd < state.minSpd) return false;

      // 7. Filtro por familia de movimiento (kind)
      if (moveKindFilter !== 'all') {
        const hasKind = p.moves.poolMoves.some(m => m.kind === moveKindFilter);
        if (!hasKind) return false;
      }

      // 8. Filtro por movimiento específico
      if (moveIdFilter !== 'all') {
        const canLearn = p.moves.poolMoves.some(m => m.id === moveIdFilter);
        if (!canLearn) return false;
      }

      // 9. Filtro por características verificadas
      if (traitFilter !== 'all') {
        if (traitFilter === 'hovers' && !p.sprite.hovers) return false;
        if (traitFilter === 'liquid_immune' && (!p.liquidInteractions.immunitiesList || p.liquidInteractions.immunitiesList.length === 0)) return false;
        if (traitFilter === 'has_evo' && !p.moves.poolMoves.some(m => m.evolution)) return false;
        if (traitFilter === 'has_traits' && !p.starterTraits) return false;
      }

      return true;
    });

    // Ordenamiento
    const sortBy = state.sortBy;
    const dir = state.sortDir === 'desc' ? -1 : 1;

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'es');
          break;
        case 'hp':
          cmp = a.hp - b.hp;
          break;
        case 'spd':
          cmp = a.spd - b.spd;
          break;
        case 'atk':
          cmp = a.atk - b.atk;
          break;
        case 'bst':
          cmp = a.bst - b.bst;
          break;
        case 'rarity':
          cmp = a.rarity - b.rarity;
          break;
        case 'gen':
          cmp = a.gen - b.gen || a.dex - b.dex;
          break;
        case 'performance':
        case 'overall':
          cmp = a.performance.overall - b.performance.overall;
          break;
        case 'offensive':
          cmp = a.performance.offensive - b.performance.offensive;
          break;
        case 'survival':
          cmp = a.performance.survival - b.performance.survival;
          break;
        case 'mobility':
          cmp = a.performance.mobility - b.performance.mobility;
          break;
        case 'dex':
        default:
          cmp = a.dex - b.dex;
          break;
      }
      return cmp !== 0 ? cmp * dir : (a.dex - b.dex) * dir;
    });

    return filtered;
  }

  return {
    getState,
    set,
    setMultiple,
    reset,
    subscribe,
    apply,
    DEFAULT_STATE
  };
})();
