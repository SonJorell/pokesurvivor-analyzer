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

  /**
   * Determina el rol táctico específico de un miembro en la composición
   * basándose en sus estadísticas reales respecto al resto del equipo
   */
  function determineMemberRole(p, team) {
    if (team.length === 1) return 'Solo Carry Autosuficiente';

    const isTopHp = team.every(m => m.hp <= p.hp);
    const isTopAtk = team.every(m => m.atk <= p.atk);
    const isTopSpd = team.every(m => m.spd <= p.spd);

    if (p.hp >= 115 || ((p.df + p.sd) >= 180 && p.hp >= 100) || (isTopHp && p.hp >= 95)) {
      return 'Vanguardia / Muralla Defensiva';
    }
    if (p.atk >= 1.35 || isTopAtk) {
      const typeLabel = p.side === 'special' ? 'Artillero Especial' : 'Ariete Físico';
      return `Cañón Ofensivo / ${typeLabel}`;
    }
    if (p.spd >= 118 || (p.sprite && p.sprite.hovers) || isTopSpd) {
      return (p.sprite && p.sprite.hovers) ? 'Runner Aéreo / Flotador' : 'Explorador Ágil / Hostigador';
    }
    if (p.moves && p.moves.poolMoves && p.moves.poolMoves.some(m => m.homing > 0 || m.slow > 0 || m.stun > 0 || m.kind === 'vortex')) {
      return 'Control de Masas / Soporte AoE';
    }
    if (p.performance.boss >= 75) {
      return 'Especialista Anti-Jefes / Burst';
    }
    return 'Luchador Versátil / Cobertura';
  }

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

    // 2. Moduladores de arquetipo adaptativos (respetan tanto starters como el pool general)
    let filteredPool = pool;
    if (archetype === 'offensive') {
      const threshold = filter === 'starters' ? 1.02 : 1.22;
      const candidates = pool.filter(p => p.atk >= threshold);
      if (candidates.length >= size * 2) filteredPool = candidates;
      else filteredPool = [...pool].sort((a, b) => b.atk - a.atk).slice(0, Math.max(size * 3, 20));
    } else if (archetype === 'tank') {
      const threshold = filter === 'starters' ? 90 : 105;
      const candidates = pool.filter(p => p.hp >= threshold || (p.df + p.sd) >= 180);
      if (candidates.length >= size * 2) filteredPool = candidates;
      else filteredPool = [...pool].sort((a, b) => (b.hp + (b.df + b.sd) * 0.2) - (a.hp + (a.df + a.sd) * 0.2)).slice(0, Math.max(size * 3, 20));
    } else if (archetype === 'speed') {
      const threshold = filter === 'starters' ? 102 : 112;
      const candidates = pool.filter(p => p.spd >= threshold || (p.sprite && p.sprite.hovers));
      if (candidates.length >= size * 2) filteredPool = candidates;
      else filteredPool = [...pool].sort((a, b) => b.spd - a.spd).slice(0, Math.max(size * 3, 20));
    }

    const team = [];
    const usedPrimaryTypes = new Set();
    const coveredOffensiveTypes = new Set();

    // 3. Selección del Líder (Anchor del equipo)
    let leaders;
    if (archetype === 'offensive') leaders = [...filteredPool].sort((a, b) => b.atk - a.atk).slice(0, 20);
    else if (archetype === 'tank') leaders = [...filteredPool].sort((a, b) => (b.hp + b.avgDefense * 0.3) - (a.hp + a.avgDefense * 0.3)).slice(0, 20);
    else if (archetype === 'speed') leaders = [...filteredPool].sort((a, b) => b.spd - a.spd).slice(0, 20);
    else leaders = [...filteredPool].sort((a, b) => b.performance.overall - a.performance.overall).slice(0, 20);

    const leader = leaders[Math.floor(Math.random() * leaders.length)] || filteredPool[0];
    team.push(leader);
    usedPrimaryTypes.add(leader.primaryType);
    if (leader.typeMatchups && leader.typeMatchups.dealsSuperTo) {
      leader.typeMatchups.dealsSuperTo.forEach(d => coveredOffensiveTypes.add(d.type));
    }

    // 4. Selección secuencial de compañeros con complementariedad elemental y de rol REAL
    while (team.length < size) {
      const remainingCandidates = filteredPool.filter(p => !team.some(t => t.dex === p.dex));
      if (remainingCandidates.length === 0) break;

      const sample = remainingCandidates.sort(() => 0.5 - Math.random()).slice(0, 35);
      let bestPick = sample[0];
      let bestSynergy = -9999;

      for (const cand of sample) {
        let synergy = cand.performance.overall;

        // A. Diversidad elemental primaria
        if (!usedPrimaryTypes.has(cand.primaryType)) {
          synergy += 25;
        }

        // B. Cobertura ofensiva super-efectiva nueva
        if (cand.typeMatchups && cand.typeMatchups.dealsSuperTo) {
          let newSuperTypes = 0;
          for (const d of cand.typeMatchups.dealsSuperTo) {
            if (!coveredOffensiveTypes.has(d.type)) newSuperTypes++;
          }
          synergy += newSuperTypes * 12;
        }

        // C. Balance de roles tácticos
        if (size >= 3) {
          const hasTank = team.some(t => t.hp >= 110 || (t.df + t.sd) >= 170);
          if (!hasTank && (cand.hp >= 110 || (cand.df + cand.sd) >= 170)) synergy += 30;

          const hasDPS = team.some(t => t.atk >= 1.30);
          if (!hasDPS && cand.atk >= 1.30) synergy += 28;

          const hasRunner = team.some(t => t.spd >= 115 || (t.sprite && t.sprite.hovers));
          if (!hasRunner && (cand.spd >= 115 || (cand.sprite && cand.sprite.hovers))) synergy += 22;
        }

        // D. Verificación defensiva cruzada REAL usando cand.typeMatchups.matchups
        if (cand.typeMatchups && cand.typeMatchups.matchups) {
          for (const member of team) {
            if (!member.typeMatchups || !member.typeMatchups.matchups) continue;
            for (const [atkType, candM] of Object.entries(cand.typeMatchups.matchups)) {
              const memM = member.typeMatchups.matchups[atkType];
              if (!memM) continue;

              // Penalizar debilidad compartida
              if (candM.isWeakness && memM.isWeakness) {
                synergy -= 24;
              }
              // Premiar cuando uno resiste lo que el otro teme
              if (candM.isResistance && memM.isWeakness) {
                synergy += 18;
              }
              if (candM.isWeakness && memM.isResistance) {
                synergy += 14;
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
      usedPrimaryTypes.add(bestPick.primaryType);
      if (bestPick.typeMatchups && bestPick.typeMatchups.dealsSuperTo) {
        bestPick.typeMatchups.dealsSuperTo.forEach(d => coveredOffensiveTypes.add(d.type));
      }
    }

    // Asignar el rol táctico específico a cada miembro de la escuadra
    team.forEach(p => {
      p.assignedRole = determineMemberRole(p, team);
    });

    currentTeam = team;
    return team;
  }

  /**
   * Calcula el análisis táctico de la escuadra actual con telemetría exacta
   */
  function evaluateTeam(team) {
    if (!team || team.length === 0) return null;

    let totalHp = 0;
    let totalAtk = 0;
    let totalSpd = 0;
    let totalBst = 0;
    let totalOverall = 0;
    const coveredDefTypes = new Set();
    const coveredOffTypes = new Set();
    const weaknessCounts = {};

    team.forEach(p => {
      totalHp += p.hp;
      totalAtk += p.atk;
      totalSpd += p.spd;
      totalBst += p.bst;
      totalOverall += p.performance.overall;
      p.types.forEach(t => coveredDefTypes.add(t));

      if (p.typeMatchups) {
        if (p.typeMatchups.dealsSuperTo) {
          p.typeMatchups.dealsSuperTo.forEach(d => coveredOffTypes.add(d.type));
        }
        if (p.typeMatchups.matchups) {
          for (const [t, m] of Object.entries(p.typeMatchups.matchups)) {
            if (m.isWeakness) {
              weaknessCounts[t] = (weaknessCounts[t] || 0) + 1;
            }
          }
        }
      }
    });

    const avgHp = Math.round(totalHp / team.length);
    const avgAtk = (totalAtk / team.length).toFixed(2);
    const avgSpd = Math.round(totalSpd / team.length);
    const avgBst = Math.round(totalBst / team.length);
    const avgOverall = Math.round(totalOverall / team.length);

    // Identificar debilidades compartidas (2 o más miembros vulnerables al mismo tipo)
    const sharedWeaknesses = [];
    for (const [t, count] of Object.entries(weaknessCounts)) {
      if (count >= 2) sharedWeaknesses.push({ type: t, count });
    }

    // Calcular sinergia táctica matemática (0 a 100%)
    let synergyScore = 70;
    synergyScore += Math.min(10, coveredDefTypes.size * 1.5);
    synergyScore += Math.min(15, (coveredOffTypes.size / 18) * 15);

    const hasTank = team.some(p => p.hp >= 110 || (p.df + p.sd) >= 170);
    const hasDps = team.some(p => p.atk >= 1.25);
    const hasSpeed = team.some(p => p.spd >= 112 || (p.sprite && p.sprite.hovers));
    if (hasTank && hasDps) synergyScore += 6;
    if (hasSpeed) synergyScore += 4;

    synergyScore -= sharedWeaknesses.length * 6;
    synergyScore = Math.max(65, Math.min(99, Math.round(synergyScore)));

    let advice = '';
    if (team.length === 1) {
      advice = 'Especialista versátil para partidas en solitario. Prioriza subidas de salud en los primeros minutos y aprovecha su alcance natural.';
    } else if (sharedWeaknesses.length === 0) {
      advice = `¡Composición impecable con CERO debilidades elementales compartidas! Cubrís eficazmente ${coveredOffTypes.size} de los 18 tipos elementales y mantenéis equilibrio total de roles.`;
    } else {
      const weakList = sharedWeaknesses.map(w => w.type).join(', ');
      advice = `Excelente potencial de combate con cobertura ofensiva en ${coveredOffTypes.size}/18 tipos. Precaución coordinada frente a ataques tipo [${weakList}], donde tenéis vulnerabilidad compartida.`;
    }

    return {
      avgHp,
      avgAtk,
      avgSpd,
      avgBst,
      avgOverall,
      synergyScore,
      coveredTypesCount: coveredDefTypes.size,
      coveredOffCount: coveredOffTypes.size,
      sharedWeaknesses,
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

    container.innerHTML = `
      <section class="pmd-box team-suggester-box" id="team-suggester">
        <div class="pmd-box-title">
          <span>${Analyzer.Icons.get('users', { size: 16 })} Sugeridor de Equipos Tácticos (1 a 4 Jugadores)</span>
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
              <option value="1" ${currentConfig.size === 1 ? 'selected' : ''}>1 Jugador (Solo Carry)</option>
              <option value="2" ${currentConfig.size === 2 ? 'selected' : ''}>2 Jugadores (Dúo Sinergia)</option>
              <option value="3" ${currentConfig.size === 3 ? 'selected' : ''}>3 Jugadores (Tríada Táctica)</option>
              <option value="4" ${currentConfig.size === 4 ? 'selected' : ''}>4 Jugadores (Escuadra Completa)</option>
            </select>
          </div>

          <div class="control-item">
            <label for="team-archetype-select">Estrategia Táctica:</label>
            <select id="team-archetype-select" class="field small">
              <option value="balanced" ${currentConfig.archetype === 'balanced' ? 'selected' : ''}>Equilibrado (Tanque + DPS + Rango + Runner)</option>
              <option value="offensive" ${currentConfig.archetype === 'offensive' ? 'selected' : ''}>Hiperofensivo (Máximo Daño y Burst)</option>
              <option value="tank" ${currentConfig.archetype === 'tank' ? 'selected' : ''}>Muralla Inmortal (Alta Salud y Defensas)</option>
              <option value="speed" ${currentConfig.archetype === 'speed' ? 'selected' : ''}>Velocidad & Blitz (Kiteo y Flotación)</option>
            </select>
          </div>

          <div class="control-item">
            <label for="team-pool-select">Pool de Especies:</label>
            <select id="team-pool-select" class="field small">
              <option value="all" ${currentConfig.filter === 'all' ? 'selected' : ''}>Cualquier Pokémon (966)</option>
              <option value="starters" ${currentConfig.filter === 'starters' ? 'selected' : ''}>Solo Iniciales (Starters)</option>
              <option value="non-legendary" ${currentConfig.filter === 'non-legendary' ? 'selected' : ''}>Sin Legendarios (Gacha Estándar)</option>
              <option value="legendary" ${currentConfig.filter === 'legendary' ? 'selected' : ''}>Solo Legendarios / Deidades</option>
            </select>
          </div>

          <div class="control-actions">
            <button class="btn gold" id="btn-generate-team" style="font-size:15px; font-weight:700">
              ${Analyzer.Icons.get('dice', { size: 16 })} Sugerir Escuadra
            </button>
          </div>
        </div>

        <!-- Escuadra Generada -->
        <div class="suggested-team-grid team-size-${currentTeam.length}">
          ${currentTeam.map((p) => {
            const roleTitle = determineMemberRole(p, currentTeam);
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
                    <span title="Salud">${Analyzer.Icons.get('heart', { size: 12 })} ${p.hp}</span>
                    <span title="Ataque">${Analyzer.Icons.get('sword', { size: 12 })} ×${p.atk}</span>
                    <span title="Velocidad">${Analyzer.Icons.get('zap', { size: 12 })} ${p.spd}</span>
                    <span class="gold" title="BST Total">${Analyzer.Icons.get('star', { size: 12 })} ${p.bst}</span>
                  </div>
                </div>
                <button class="btn tiny gold-outline" style="width:100%; margin-top:8px" onclick="event.stopPropagation(); Analyzer.App.openModal(${p.dex})">
                  ${Analyzer.Icons.get('search', { size: 12 })} Ver Ficha Técnica
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
                  ${evaluation.synergyScore >= 90 ? `${Analyzer.Icons.get('sparkles', { size: 13 })} Sinergia Legendaria` : `${Analyzer.Icons.get('check', { size: 13 })} Alta Compatibilidad`}
                </span>
              </div>
              <div class="synergy-actions">
                <button class="btn gold" id="btn-load-team-to-comparison">
                  ${Analyzer.Icons.get('swords', { size: 16 })} Cargar este Equipo en el Comparador
                </button>
              </div>
            </div>

            <div class="synergy-metrics-row">
              <span>HP Medio: <b>${evaluation.avgHp} HP</b></span>
              <span>Ataque Medio: <b>×${evaluation.avgAtk}</b></span>
              <span>Velocidad Media: <b>${evaluation.avgSpd} SPD</b></span>
              <span>BST Medio: <b>${evaluation.avgBst}</b></span>
              <span>Cobertura Ofensiva: <b>${evaluation.coveredOffCount} / 18 Tipos</b></span>
              <span>Debilidades Compartidas: <b style="color:${evaluation.sharedWeaknesses.length === 0 ? 'var(--green, #00e5a3)' : '#ff8899'}">${evaluation.sharedWeaknesses.length === 0 ? '0 (Óptimo)' : evaluation.sharedWeaknesses.map(w => w.type).join(', ')}</b></span>
            </div>

            <div class="synergy-advice-box">
              <span class="gold" style="font-weight:700">${Analyzer.Icons.get('bulb', { size: 14 })} Análisis Estratégico:</span> ${evaluation.advice}
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
