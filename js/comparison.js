/* ============ comparison.js — Motor de Comparación y Exportación ============
 * PokéSurvivor Character Analyzer
 *
 * Administra la selección de 2 a 4 personajes simultáneos, cálculo de deltas
 * numéricas y porcentuales, análisis de ventajas/limitaciones mecánicas,
 * persistencia en localStorage, enlaces para compartir (URL query) y exportación a CSV.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Comparison = (() => {
  'use strict';

  const STORAGE_KEY = 'pokesurvivor_character_analyzer_comparison';
  const MAX_SELECTION = 4;
  const MIN_SELECTION = 1;

  // Lista de dex seleccionados [dex1, dex2, ...]
  let selectedDexes = [];
  const listeners = [];

  function init() {
    // 1. Intentar cargar desde la URL (?compare=1,4,7 o ?p=1,4)
    if (!loadFromUrl()) {
      // 2. Si no hay parámetros en la URL, intentar restaurar del localStorage
      loadFromStorage();
    }
  }

  function getSelectedDexes() {
    return selectedDexes.slice();
  }

  function getSelected() {
    return selectedDexes
      .map(d => Analyzer.DataAdapter.getByDex(d))
      .filter(Boolean);
  }

  function isSelected(dex) {
    return selectedDexes.includes(+dex);
  }

  function count() {
    return selectedDexes.length;
  }

  function add(dex) {
    dex = +dex;
    if (selectedDexes.includes(dex)) return false;
    if (selectedDexes.length >= MAX_SELECTION) {
      if (window.Analyzer.UI && window.Analyzer.UI.toast) {
        window.Analyzer.UI.toast(`Límite máximo de ${MAX_SELECTION} Pokémon en comparación`);
      }
      return false;
    }
    selectedDexes.push(dex);
    saveToStorage();
    updateUrl();
    notify();
    return true;
  }

  function remove(dex) {
    dex = +dex;
    const idx = selectedDexes.indexOf(dex);
    if (idx < 0) return false;
    selectedDexes.splice(idx, 1);
    saveToStorage();
    updateUrl();
    notify();
    return true;
  }

  function toggle(dex) {
    if (isSelected(dex)) {
      return remove(dex);
    } else {
      return add(dex);
    }
  }

  function clear() {
    selectedDexes = [];
    saveToStorage();
    updateUrl();
    notify();
  }

  function setSelection(dexArray) {
    if (!Array.isArray(dexArray)) return;
    selectedDexes = dexArray.map(Number).filter(d => Analyzer.DataAdapter.getByDex(d)).slice(0, MAX_SELECTION);
    saveToStorage();
    updateUrl();
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
    const list = getSelected();
    for (const fn of listeners) {
      try {
        fn(list);
      } catch (err) {
        console.error('Analyzer.Comparison listener error:', err);
      }
    }
  }

  /**
   * Persistencia en localStorage
   */
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedDexes));
    } catch (e) {
      // Ignorar quota errors en navegación privada
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          selectedDexes = parsed.map(Number).filter(d => Analyzer.DataAdapter.getByDex(d)).slice(0, MAX_SELECTION);
          return selectedDexes.length > 0;
        }
      }
    } catch (e) {
      // Fallback a array vacío
    }
    return false;
  }

  /**
   * URL de compartir (?compare=1,4,7)
   */
  function getShareUrl() {
    const url = new URL(window.location.href);
    if (selectedDexes.length > 0) {
      url.searchParams.set('compare', selectedDexes.join(','));
    } else {
      url.searchParams.delete('compare');
    }
    return url.toString();
  }

  function updateUrl() {
    if (!window.history || !window.history.replaceState) return;
    try {
      const url = new URL(window.location.href);
      if (selectedDexes.length > 0) {
        url.searchParams.set('compare', selectedDexes.join(','));
      } else {
        url.searchParams.delete('compare');
      }
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      // Ignorar si se abre directamente por file://
    }
  }

  function loadFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const comp = params.get('compare') || params.get('p');
      if (comp) {
        const list = comp.split(',').map(Number).filter(d => !isNaN(d) && Analyzer.DataAdapter.getByDex(d));
        if (list.length > 0) {
          selectedDexes = list.slice(0, MAX_SELECTION);
          saveToStorage();
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  /**
   * Calcula diferencias numéricas y porcentuales entre un Pokémon objetivo
   * y un Pokémon de referencia (el primero de la comparación)
   */
  function calculateDelta(targetVal, refVal, decimals = 0) {
    if (refVal == null || targetVal == null) return null;
    const diff = targetVal - refVal;
    if (Math.abs(diff) < 0.0001) {
      return { diff: 0, pct: 0, formatted: '0' };
    }
    const pct = refVal !== 0 ? Math.round((diff / refVal) * 1000) / 10 : 0;
    const formattedDiff = decimals > 0 ? diff.toFixed(decimals) : String(Math.round(diff));
    const sign = diff > 0 ? '+' : '';
    return {
      diff,
      pct,
      value: diff,
      formatted: `${sign}${formattedDiff} (${sign}${pct.toFixed(1)}%)`
    };
  }

  /**
   * Calcula todas las deltas comparativas para un Pokémon respecto al primero
   */
  function getPokemonDeltas(pokemon, referencePokemon) {
    if (!pokemon || !referencePokemon || pokemon.dex === referencePokemon.dex) {
      return null;
    }

    return {
      hp: calculateDelta(pokemon.hp, referencePokemon.hp, 0),
      spd: calculateDelta(pokemon.spd, referencePokemon.spd, 0),
      atk: calculateDelta(pokemon.atk, referencePokemon.atk, 2),
      pa: calculateDelta(pokemon.pa != null ? pokemon.pa : pokemon.atk, referencePokemon.pa != null ? referencePokemon.pa : referencePokemon.atk, 2),
      sa: calculateDelta(pokemon.sa != null ? pokemon.sa : pokemon.atk, referencePokemon.sa != null ? referencePokemon.sa : referencePokemon.atk, 2),
      df: calculateDelta(pokemon.df != null ? pokemon.df : 75, referencePokemon.df != null ? referencePokemon.df : 75, 0),
      sd: calculateDelta(pokemon.sd != null ? pokemon.sd : 75, referencePokemon.sd != null ? referencePokemon.sd : 75, 0),
      bst: calculateDelta(pokemon.bst, referencePokemon.bst, 0),
      overall: calculateDelta(pokemon.performance.overall, referencePokemon.performance.overall, 0),
      bodyRadius: calculateDelta(pokemon.sprite.bodyRadius, referencePokemon.sprite.bodyRadius, 1),
      movesCount: calculateDelta(pokemon.moves.totalMoves, referencePokemon.moves.totalMoves, 0)
    };
  }

  /**
   * Evalúa ventajas y limitaciones mecánicas verificadas de un Pokémon
   */
  function evaluateStrengthsAndLimitations(p) {
    const strengths = [];
    const limitations = [];

    // 1. Salud (HP)
    if (p.hp >= 120) {
      strengths.push(`Salud colosal (${p.hp} HP): Gran capacidad para absorber impactos y sobrevivir errores.`);
    } else if (p.hp <= 86) {
      limitations.push(`Salud baja (${p.hp} HP): Alta vulnerabilidad ante ráfagas de daño si queda acorralado.`);
    }

    // 2. Velocidad (Spd)
    if (p.spd >= 120) {
      strengths.push(`Velocidad sobresaliente (${p.spd}): Facilita esquivar proyectiles y reposicionarse en hordas.`);
    } else if (p.spd <= 95) {
      limitations.push(`Velocidad reducida (${p.spd}): Dificultad para escapar de enemigos rápidos tipo 'runner' o 'charger'.`);
    }

    // 3. Ataque y Especialización Física / Especial
    if (p.atk >= 1.35) {
      strengths.push(`Multiplicador ofensivo letal (×${p.atk.toFixed(2)}): Daño abrumador en su categoría fuerte (${p.sideName || 'Físico'}).`);
    } else if (p.atk <= 1.0) {
      limitations.push(`Ataque moderado o bajo (×${p.atk.toFixed(2)}): Requiere mejoras de 'Fuerza' o cartas de subida para limpiar rápido.`);
    }
    if (p.pa != null && p.sa != null) {
      if (p.side === 'physical' && p.pa >= 1.25) {
        strengths.push(`Atacante Físico devastador (PA ×${p.pa.toFixed(2)}): Máxima sinergia con ataques físicos y de contacto.`);
      } else if (p.side === 'special' && p.sa >= 1.25) {
        strengths.push(`Atacante Especial devastador (SA ×${p.sa.toFixed(2)}): Máxima sinergia con proyectiles elementales y rayos.`);
      }
    }

    // 4. Defensas Física y Especial (Mitigaciones G.Stats)
    if (p.df != null && p.df >= 100) {
      strengths.push(`Defensa Física destacada (${p.df}): Reduce un ${p.mitigationPhysical}% del daño de ataques físicos enemigos.`);
    } else if (p.df != null && p.df <= 45) {
      limitations.push(`Defensa Física frágil (${p.df}): Recibe un ${Math.abs(p.mitigationPhysical)}% más de daño físico.`);
    }
    if (p.sd != null && p.sd >= 100) {
      strengths.push(`Defensa Especial destacada (${p.sd}): Reduce un ${p.mitigationSpecial}% del daño de ataques especiales enemigos.`);
    } else if (p.sd != null && p.sd <= 45) {
      limitations.push(`Defensa Especial frágil (${p.sd}): Recibe un ${Math.abs(p.mitigationSpecial)}% más de daño especial.`);
    }

    // 4. Hitbox y flotación
    if (p.sprite.hovers) {
      strengths.push('Capacidad de flotar: Ignora penalizaciones de terreno líquido (lava, pantano) y vuela sobre rocas.');
    } else if (!p.liquidInteractions.waterImmune && !p.liquidInteractions.lavaImmune) {
      limitations.push('Desplazamiento puramente terrestre: Sufre ralentización en agua/pantano y daño en lava.');
    }

    if (p.sprite.bodyRadius <= 10) {
      strengths.push(`Hitbox diminuta (radio ${p.sprite.bodyRadius}): Mayor facilidad para navegar huecos entre proyectiles.`);
    } else if (p.sprite.bodyRadius >= 18) {
      limitations.push(`Hitbox voluminosa (radio ${p.sprite.bodyRadius}): Mayor superficie vulnerable a colisiones enemigas.`);
    }

    // 5. Movimiento inicial
    if (p.moves.startMove) {
      const sm = p.moves.startMove;
      if (sm.kind === 'melee') {
        limitations.push(`Ataque inicial cuerpo a cuerpo (${sm.name}): Exige proximidad de riesgo (mitigado con -25% daño recibido).`);
      } else if (sm.homing > 0) {
        strengths.push(`Movimiento teledirigido inicial (${sm.name}): Apuntado automático óptimo para principiantes.`);
      } else if (sm.kind === 'beam' || sm.kind === 'projectile') {
        strengths.push(`Ataque inicial a distancia (${sm.name}): Permite infligir daño seguro desde la lejanía.`);
      }
    }

    // 6. Repertorio y evoluciones
    const evoCount = p.moves.poolMoves.filter(m => m.evolution).length;
    if (p.moves.totalMoves >= 16) {
      strengths.push(`Repertorio amplio (${p.moves.totalMoves} movimientos): Alta probabilidad de obtener ataques idóneos al subir nivel.`);
    }
    if (evoCount >= 4) {
      strengths.push(`Potencial dorado: Puede evolucionar ${evoCount} movimientos diferentes a su forma máxima dorada.`);
    }

    // 7. Perfil defensivo
    if (p.typeMatchups) {
      if (p.typeMatchups.resistCount >= 5) {
        strengths.push(`Resistencias elementales múltiples: Reduce daño frente a ${p.typeMatchups.resistCount} tipos de ataque.`);
      }
      if (p.typeMatchups.weakCount >= 4) {
        limitations.push(`Vulnerabilidad elemental acusada: Recibe daño aumentado frente a ${p.typeMatchups.weakCount} tipos de ataque.`);
      }
    }

    return { strengths, limitations };
  }

  /**
   * Exporta la tabla de comparación actual a un archivo CSV descargable
   */
  function exportToCsv() {
    const list = getSelected();
    if (list.length === 0) return false;

    const headers = [
      'Nº Pokédex',
      'Nombre',
      'Generación',
      'Tipos',
      'Vida (HP)',
      'Velocidad (Spd)',
      'Multiplicador Ataque Dominante',
      'Ataque Físico (PA)',
      'Ataque Especial (SA)',
      'Lado Fuerte',
      'Defensa Física (DF)',
      'Defensa Especial (SD)',
      'BST (Base Total)',
      'Rareza',
      'Es Inicial',
      'Es Legendario',
      'Flota',
      'Radio Hitbox',
      'Movimiento Inicial',
      'DPS Estimado Inicial',
      'Total Movimientos Aprendibles',
      'Puntuación Daño Ofensivo',
      'Puntuación Supervivencia',
      'Puntuación Movilidad',
      'Puntuación Control',
      'Puntuación Flexibilidad',
      'Puntuación Vs Jefes',
      'Puntuación Global'
    ];

    const rows = list.map(p => [
      p.dex,
      `"${p.name}"`,
      p.gen,
      `"${p.types.map(t => G.U.TYPE_NAME[t] || t).join(' / ')}"`,
      p.hp,
      p.spd,
      p.atk.toFixed(2),
      (p.pa != null ? p.pa : p.atk).toFixed(2),
      (p.sa != null ? p.sa : p.atk).toFixed(2),
      `"${p.sideName || 'Físico'}"`,
      p.df != null ? p.df : 75,
      p.sd != null ? p.sd : 75,
      p.bst,
      p.availability.rarityName,
      p.isStarter ? 'Sí' : 'No',
      p.isLegendary ? 'Sí' : 'No',
      p.sprite.hovers ? 'Sí' : 'No',
      p.sprite.bodyRadius,
      `"${(p.moves.startMove && p.moves.startMove.name) || 'N/A'}"`,
      p.moves.startMove ? p.moves.startMove.dpsEstimate : 0,
      p.moves.totalMoves,
      p.performance.offensive,
      p.performance.survival,
      p.performance.mobility,
      p.performance.control,
      p.performance.flexibility,
      p.performance.boss,
      p.performance.overall
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `pokesurvivor-comparativa-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  return {
    init,
    MAX_SELECTION,
    MIN_SELECTION,
    getSelectedDexes,
    getSelected,
    isSelected,
    count,
    add,
    remove,
    toggle,
    clear,
    setSelection,
    subscribe,
    getShareUrl,
    calculateDelta,
    getPokemonDeltas,
    evaluateStrengthsAndLimitations,
    exportToCsv
  };
})();
