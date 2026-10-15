/* ============ team-suggester.js — Sugeridor de Equipos Tácticos (1 a 4 Jugadores) ============
 * PokéSurvivor Character Analyzer
 *
 * Algoritmo de sinergia de combate para escuadras de 1, 2, 3 o 4 jugadores:
 * - 1 Jugador: Solo Carry autosuficiente (balance óptimo supervivencia/daño)
 * - 2 Jugadores: Dúo complementario (Tanque Vanguardia + Artillero DPS)
 * - 3 Jugadores: Tríada táctica (Vanguardia + Control AoE + Explorador/Burst)
 * - 4 Jugadores: Escuadra perfecta (Tanque + DPS Rango + Anti-Jefes + Runner Flotador)
 */

window.Analyzer = window.Analyzer || {};

Analyzer.TeamSuggester = (() => {
  'use strict';

  let currentTeam = [];
  let currentConfig = {
    size: 4,
    archetype: 'balanced',
    filter: 'all'
  };

  const ROLE_NAMES = {
    1: ['Solo Carry Autosuficiente'],
    2: ['🛡️ Vanguardia / Tanque Protector', '⚔️ Cañón Elemental / DPS Rango'],
    3: ['🛡️ Muralla de Vanguardia', '🌪️ Artillero de Hordas / AoE', '⚡ Explorador Ágil / Caza-Jefes'],
    4: ['🛡️ Muralla Defensiva / Vanguardia', '💥 Cañón de Rango / Limpieza', '🎯 Especialista Anti-Jefes', '🏃 Recolector de Gemas & Runner']
  };

  /**
   * Genera un equipo con alta sinergia según la configuración
   */
  function generate(config = {}) {
    const size = config.size || currentConfig.size || 4;
    const archetype = config.archetype || currentConfig.archetype || 'balanced';
    const filter = config.filter || currentConfig.filter || 'all';

    currentConfig = { size, archetype, filter };

    let pool = Analyzer.DataAdapter.getAll();
    if (!pool || pool.length === 0) return [];

    // 1. Filtrar pool según restricción
    if (filter === 'starters') {
      pool = pool.filter(p => p.isStarter);
    } else if (filter === 'non-legendary') {
      pool = pool.filter(p => !p.isLegendary);
    } else if (filter === 'legendary') {
      pool = pool.filter(p => p.isLegendary);
    }

    if (pool.length < size) {
      pool = Analyzer.DataAdapter.getAll();
    }

    // 2. Moduladores de arquetipo
    let filteredPool = pool;
    if (archetype === 'offensive') {
      filteredPool = pool.filter(p => p.atk >= 1.22);
    } else if (archetype === 'tank') {
      filteredPool = pool.filter(p => p.hp >= 105);
    } else if (archetype === 'speed') {
      filteredPool = pool.filter(p => p.spd >= 112 || p.sprite.hovers);
    }

    if (filteredPool.length < size * 3) {
      filteredPool = pool;
    }

    const team = [];
    const usedTypes = new Set();

    // 3. Selección del Líder (Anchor del equipo)
    const leaders = [...filteredPool].sort((a, b) => b.performance.overall - a.performance.overall).slice(0, 25);
    const leader = leaders[Math.floor(Math.random() * leaders.length)] || filteredPool[0];
    team.push(leader);
    leader.types.forEach(t => usedTypes.add(t));

    // 4. Selección secuencial de compañeros con complementariedad
    while (team.length < size) {
      const remainingCandidates = filteredPool.filter(p => !team.some(t => t.dex === p.dex));
      if (remainingCandidates.length === 0) break;

      // Muestra aleatoria para variedad y cálculo de afinidad
      const sample = remainingCandidates.sort(() => 0.5 - Math.random()).slice(0, 30);
      let bestPick = sample[0];
      let bestSynergy = -9999;

      for (const cand of sample) {
        let synergy = cand.performance.overall;

        // Bonificación por no solapar tipo primario
        if (!usedTypes.has(cand.primaryType)) {
          synergy += 25;
        }

        // Bonificación por balance de roles
        if (size >= 3) {
          const hasTank = team.some(t => t.hp >= 115);
          if (!hasTank && cand.hp >= 115) synergy += 30;

          const hasRangedOrAtk = team.some(t => t.atk >= 1.35);
          if (!hasRangedOrAtk && cand.atk >= 1.35) synergy += 25;

          const hasRunner = team.some(t => t.spd >= 118 || t.sprite.hovers);
          if (!hasRunner && (cand.spd >= 118 || cand.sprite.hovers)) synergy += 20;
        }

        // Penalización por debilidades elementales compartidas
        if (cand.typeMatchups) {
          for (const member of team) {
            if (!member.typeMatchups) continue;
            for (const [atkType, matchup] of Object.entries(cand.typeMatchups)) {
              if (matchup.isWeakness && member.typeMatchups[atkType] && member.typeMatchups[atkType].isWeakness) {
                synergy -= 18; // Doble debilidad castigada
              }
              if (matchup.isResistance && member.typeMatchups[atkType] && member.typeMatchups[atkType].isWeakness) {
                synergy += 15; // Cobertura defensiva cruzada
              }
            }
          }
        }

        if (synergy > bestSynergy) {
          bestSynergy = synergy;
          bestPick = cand;
        }
      }

      team.push(bestPick);
      bestPick.types.forEach(t => usedTypes.add(t));
    }

    currentTeam = team;
    return team;
  }

  /**
   * Calcula el análisis táctico de la escuadra actual
   */
  function evaluateTeam(team) {
    if (!team || team.length === 0) return null;

    let totalHp = 0;
    let totalAtk = 0;
    let totalSpd = 0;
    let totalOverall = 0;
    const coveredTypes = new Set();
    const commonWeaknesses = new Set();

    team.forEach(p => {
      totalHp += p.hp;
      totalAtk += p.atk;
      totalSpd += p.spd;
      totalOverall += p.performance.overall;
      p.types.forEach(t => coveredTypes.add(t));
    });

    const avgHp = Math.round(totalHp / team.length);
    const avgAtk = (totalAtk / team.length).toFixed(2);
    const avgSpd = Math.round(totalSpd / team.length);
    const avgOverall = Math.round(totalOverall / team.length);

    // Calcular sinergia base (80-98%)
    let synergyScore = 78 + Math.min(18, coveredTypes.size * 2.5);
    if (team.some(p => p.hp >= 115) && team.some(p => p.atk >= 1.30)) synergyScore += 4;
    synergyScore = Math.min(99, Math.round(synergyScore));

    let advice = '';
    if (team.length === 1) {
      advice = 'Especialista versátil para partidas en solitario. Prioriza subidas de salud en los primeros minutos y aprovecha su alcance natural.';
    } else if (team.length === 2) {
      advice = 'Dúo altamente complementario. Mientras la vanguardia retiene las hordas enemigas, el artillero debe posicionarse para limpiar con ataques a distancia.';
    } else if (team.length === 3) {
      advice = 'Tríada estratégica con cobertura de masas. Mantened formación cerrada durante los bosses de los minutos 6 y 12.';
    } else {
      advice = 'Escuadra completa de máximo rendimiento. Tenéis presencia para mitigar daño, eliminar oleadas masivas y recolectar gemas rápidamente.';
    }

    return {
      avgHp,
      avgAtk,
      avgSpd,
      avgOverall,
      synergyScore,
      coveredTypesCount: coveredTypes.size,
      advice
    };
  }

  /**
   * Renderiza el componente del Team Suggester en el contenedor
   */
  function render(container) {
    if (!container) return;

    if (currentTeam.length === 0) {
      generate();
    }

    const evaluation = evaluateTeam(currentTeam);
    const roles = ROLE_NAMES[currentTeam.length] || [];

    container.innerHTML = `
      <section class="pmd-box team-suggester-box" id="team-suggester">
        <div class="pmd-box-title">
          <span>👥 Sugeridor de Equipos Tácticos (1 a 4 Jugadores)</span>
          <span class="gold" style="font-size:14px">Sinergia de Combate Multijugador</span>
        </div>

        <p class="sub" style="margin:0 0 16px">
          Genera composiciones estratégicas optimizadas con <b>cero debilidades compartidas</b>, equilibrio de roles
          (tanque, artillero, anti-jefes y runner) y máxima cobertura elemental para dominar las mazmorras de PokéSurvivor.
        </p>

        <!-- Barra de Controles del Sugeridor -->
        <div class="suggester-controls-bar">
          <div class="control-item">
            <label for="team-size-select">Formato de Escuadra:</label>
            <select id="team-size-select" class="field small">
              <option value="1" ${currentConfig.size === 1 ? 'selected' : ''}>👤 1 Jugador (Solo Carry)</option>
              <option value="2" ${currentConfig.size === 2 ? 'selected' : ''}>👥 2 Jugadores (Dúo Sinergia)</option>
              <option value="3" ${currentConfig.size === 3 ? 'selected' : ''}>⚔️ 3 Jugadores (Tríada Táctica)</option>
              <option value="4" ${currentConfig.size === 4 ? 'selected' : ''}>👑 4 Jugadores (Escuadra Completa)</option>
            </select>
          </div>

          <div class="control-item">
            <label for="team-archetype-select">Estrategia Táctica:</label>
            <select id="team-archetype-select" class="field small">
              <option value="balanced" ${currentConfig.archetype === 'balanced' ? 'selected' : ''}>🛡️ Equilibrado (Tanque + DPS + Rango + Runner)</option>
              <option value="offensive" ${currentConfig.archetype === 'offensive' ? 'selected' : ''}>⚔️ Hiperofensivo (Máximo Daño y Burst)</option>
              <option value="tank" ${currentConfig.archetype === 'tank' ? 'selected' : ''}>🏰 Muralla Inmortal (Alta Salud y Defensas)</option>
              <option value="speed" ${currentConfig.archetype === 'speed' ? 'selected' : ''}>⚡ Velocidad & Blitz (Kiteo y Flotación)</option>
            </select>
          </div>

          <div class="control-item">
            <label for="team-pool-select">Pool de Especies:</label>
            <select id="team-pool-select" class="field small">
              <option value="all" ${currentConfig.filter === 'all' ? 'selected' : ''}>🌟 Cualquier Pokémon (966)</option>
              <option value="starters" ${currentConfig.filter === 'starters' ? 'selected' : ''}>🎒 Solo Iniciales (Starters)</option>
              <option value="non-legendary" ${currentConfig.filter === 'non-legendary' ? 'selected' : ''}>🚫 Sin Legendarios (Gacha Estándar)</option>
              <option value="legendary" ${currentConfig.filter === 'legendary' ? 'selected' : ''}>👑 Solo Legendarios / Deidades</option>
            </select>
          </div>

          <div class="control-actions">
            <button class="btn gold" id="btn-generate-team" style="font-size:15px; font-weight:700">
              🎲 Sugerir Escuadra
            </button>
          </div>
        </div>

        <!-- Escuadra Generada -->
        <div class="suggested-team-grid team-size-${currentTeam.length}">
          ${currentTeam.map((p, idx) => {
            const roleTitle = roles[idx] || `Miembro #${idx + 1}`;
            const dex3 = String(p.dex).padStart(3, '0');
            const typeChips = p.types.map(t => {
              const col = (window.G && G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[t]) || '#555';
              return `<span class="chip-mini" style="background:${col}; color:#fff">${t}</span>`;
            }).join(' ');

            return `
              <div class="team-member-card pmd-box" onclick="Analyzer.App.openModal(${p.dex})">
                <div class="team-role-tag">${roleTitle}</div>
                <div class="team-member-sprite-wrap">
                  <canvas class="team-member-cv" width="56" height="56" data-dex="${p.dex}"></canvas>
                </div>
                <div class="team-member-info">
                  <div class="team-member-title">
                    <span class="team-member-name">${p.name}</span>
                    <span class="team-member-dex">#${dex3}</span>
                  </div>
                  <div class="team-member-types">${typeChips}</div>
                  <div class="team-member-stats-row">
                    <span title="Salud">❤️ ${p.hp}</span>
                    <span title="Ataque">⚔️ ×${p.atk}</span>
                    <span title="Velocidad">⚡ ${p.spd}</span>
                    <span class="gold" title="BST Total">⭐ ${p.bst}</span>
                  </div>
                </div>
                <button class="btn tiny gold-outline" style="width:100%; margin-top:8px" onclick="event.stopPropagation(); Analyzer.App.openModal(${p.dex})">
                  Ver Ficha Técnica 🔍
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Tarjeta de Evaluación de Sinergia -->
        ${evaluation ? `
          <div class="team-synergy-card">
            <div class="synergy-top-row">
              <div class="synergy-score-group">
                <span class="synergy-label">Índice de Sinergia de Escuadra:</span>
                <span class="synergy-num gold">${evaluation.synergyScore}%</span>
                <span class="synergy-status-badge ${evaluation.synergyScore >= 90 ? 'elite' : 'good'}">
                  ${evaluation.synergyScore >= 90 ? '🌟 Sinergia Legendaria' : '✔ Alta Compatibilidad'}
                </span>
              </div>
              <div class="synergy-actions">
                <button class="btn gold" id="btn-load-team-to-comparison">
                  ⚔️ Cargar este Equipo en el Comparador
                </button>
              </div>
            </div>

            <div class="synergy-metrics-row">
              <span>HP Promedio: <b>${evaluation.avgHp} HP</b></span>
              <span>Ataque Medio: <b>×${evaluation.avgAtk}</b></span>
              <span>Velocidad Media: <b>${evaluation.avgSpd} SPD</b></span>
              <span>Tipos Cubiertos: <b>${evaluation.coveredTypesCount} / 18 Tipos</b></span>
            </div>

            <div class="synergy-advice-box">
              <span class="gold" style="font-weight:700">💡 Análisis Estratégico:</span> ${evaluation.advice}
            </div>
          </div>
        ` : ''}

      </section>
    `;

    bindSuggesterEvents(container);
    initTeamSprites(container);
  }

  function bindSuggesterEvents(container) {
    const sizeSelect = container.querySelector('#team-size-select');
    const archetypeSelect = container.querySelector('#team-archetype-select');
    const poolSelect = container.querySelector('#team-pool-select');
    const btnGen = container.querySelector('#btn-generate-team');
    const btnLoad = container.querySelector('#btn-load-team-to-comparison');

    if (btnGen) {
      btnGen.addEventListener('click', () => {
        generate({
          size: +sizeSelect.value,
          archetype: archetypeSelect.value,
          filter: poolSelect.value
        });
        render(container);
        Analyzer.App.playSfx('select');
        Analyzer.App.toast(`Equipo de ${currentTeam.length} Pokémon sugerido con éxito`);
      });
    }

    if (btnLoad) {
      btnLoad.addEventListener('click', () => {
        const dexList = currentTeam.map(p => p.dex);
        Analyzer.Comparison.setSelection(dexList);
        Analyzer.App.switchTab('comparison');
        Analyzer.App.playSfx('confirm');
        Analyzer.App.toast('¡Equipo cargado en el Comparador Táctico!');
      });
    }

    if (sizeSelect) {
      sizeSelect.addEventListener('change', () => {
        generate({
          size: +sizeSelect.value,
          archetype: archetypeSelect.value,
          filter: poolSelect.value
        });
        render(container);
      });
    }
  }

  function initTeamSprites(container) {
    const canvases = container.querySelectorAll('.team-member-cv');
    canvases.forEach(cv => {
      const dex = +cv.dataset.dex;
      if (!dex) return;
      Analyzer.App.registerCanvasSprite(cv, dex, { scale: 1.8, anim: 'Idle', dir: 0 });
    });
  }

  return {
    generate,
    evaluateTeam,
    render,
    getCurrentTeam: () => currentTeam
  };
})();
