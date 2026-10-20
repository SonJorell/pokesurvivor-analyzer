/* ============ builds.js — Recomendador de Builds (4 Ataques + Objeto) y Escalado ============
 * PokéSurvivor Character Analyzer
 *
 * Administra:
 * 1. Generación de las mejores combinaciones de 4 ataques (el límite de una run)
 *    para cada Pokémon, alineadas con su lado fuerte (físico/especial), STAB,
 *    control de masas, daño concentrado a jefes y sinergia de evoluciones doradas.
 * 2. Asignación del objeto equipable óptimo para cada arquetipo de build.
 * 3. Desglose del escalado exacto nivel por nivel (Nivel 1 a 5) y evolución dorada
 *    para cada ataque y buff del juego.
 * 4. Evaluación táctica y sinergia (0-100%) para combinaciones personalizadas de 4 ataques.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.Builds = (() => {
  'use strict';

  /**
   * Obtiene el escalado detallado (niveles 1 a 5 y evolución dorada) para cualquier movimiento
   */
  function getMoveScaling(moveId, pokemon) {
    if (!window.G || !G.Moves || !G.Moves.BY_ID) return null;
    const def = G.Moves.BY_ID[moveId];
    if (!def) return null;

    const evoEntry = G.Moves.EVO ? G.Moves.EVO[moveId] : null;
    const evoMods = (evoEntry && G.Moves.EVO_MODS) ? G.Moves.EVO_MODS[def.kind] : null;
    const cat = def.cat || null;
    const catName = cat === 'physical' ? 'Físico' : cat === 'special' ? 'Especial' : 'Mejora';

    // Eficacia con el Pokémon si se proporciona
    let fit = 1;
    let fitPct = 100;
    if (pokemon && window.G && G.Stats && G.Stats.fit) {
      fit = G.Stats.fit(pokemon, cat);
      fitPct = Math.round(fit * 100);
    }

    // Instancia nivel 1 (base)
    const inst1 = G.Moves.instance ? G.Moves.instance(moveId, 1) : Object.assign({}, def);
    // Instancia nivel 5 (máximo antes de evolucionar)
    const inst5 = G.Moves.instance ? G.Moves.instance(moveId, 5) : Object.assign({}, def);

    // Niveles completos 1 al 5
    const levels = [];
    for (let lvl = 1; lvl <= 5; lvl++) {
      const instL = G.Moves.instance ? G.Moves.instance(moveId, lvl) : def;
      levels.push({
        level: lvl,
        dmg: Math.round((instL.dmg || 0) * 10) / 10,
        cd: instL.cd ? Math.round(instL.cd * 100) / 100 : 0,
        dps: instL.cd && instL.dmg ? Math.round((instL.dmg / instL.cd) * 10) / 10 : 0,
        count: instL.count || 1,
        radius: instL.radius ? Math.round(instL.radius) : 0,
        pierce: instL.pierce || 0,
        speed: instL.speed ? Math.round(instL.speed) : 0
      });
    }

    // Instancia evolucionada dorada
    let instEvo = null;
    if (evoEntry && G.Moves.instance && G.Moves.evolve) {
      instEvo = G.Moves.instance(moveId, 5);
      G.Moves.evolve(instEvo);
    }

    // Escalera de mejoras paso a paso (niveles 2 al 5)
    const ladder = [];
    const ups = def.ups || (G.Moves.LADDERS && G.Moves.LADDERS[def.kind]) || [];
    ups.forEach((step, idx) => {
      ladder.push({
        level: idx + 2,
        text: step.t,
        mods: step.m
      });
    });

    // Desglose de buff si corresponde
    const isBuff = def.kind === 'buff';
    let buffScaling = null;
    let buffLadder = [];
    if (isBuff) {
      const baseAmt = def.amount || 0.1;
      const baseStacks = def.stacks || 5;
      const baseDur = def.dur || 7;
      const lvl5Amt = inst5.amount || (baseAmt * 1.96);
      const lvl5Stacks = inst5.stacks || (baseStacks + 2);
      const lvl5Dur = inst5.dur || (baseDur * 1.5);

      for (let lvl = 1; lvl <= 5; lvl++) {
        const instL = G.Moves.instance ? G.Moves.instance(moveId, lvl) : def;
        const curAmt = instL.amount || baseAmt;
        const curSt = instL.stacks || baseStacks;
        const curDur = instL.dur || baseDur;
        buffLadder.push({
          level: lvl,
          perStackPct: Math.round(curAmt * 1000) / 10,
          maxStacks: curSt,
          bonusPct: Math.round(curAmt * curSt * 1000) / 10,
          duration: Math.round(curDur * 10) / 10
        });
      }

      buffScaling = {
        stat: def.stat,
        statLabel: def.stat === 'patk' ? 'Ataque Físico' : def.stat === 'satk' ? 'Ataque Especial' : def.stat === 'spd' ? 'Velocidad' : def.stat === 'def' ? 'Defensa' : 'Regeneración',
        basePerStack: Math.round(baseAmt * 1000) / 10,
        baseMaxStacks: baseStacks,
        baseTotalBonus: Math.round(baseAmt * baseStacks * 1000) / 10,
        baseDuration: baseDur,
        lvl5PerStack: Math.round(lvl5Amt * 1000) / 10,
        lvl5MaxStacks: lvl5Stacks,
        lvl5TotalBonus: Math.round(lvl5Amt * lvl5Stacks * 1000) / 10,
        lvl5Duration: Math.round(lvl5Dur * 10) / 10
      };
    }

    const evoObj = evoEntry ? {
      name: evoEntry[0],
      newName: evoEntry[0],
      needs: evoEntry[1],
      requiredStat: evoEntry[1],
      statName: (G.Moves.NEED_NAME && G.Moves.NEED_NAME[evoEntry[1]]) || evoEntry[1],
      modText: evoMods ? evoMods.t : 'Mejora masiva de daño, alcance y proyectiles',
      goldDmg: instEvo && instEvo.dmg ? Math.round(instEvo.dmg * 10) / 10 : null,
      evolvedDmg: instEvo && instEvo.dmg ? Math.round(instEvo.dmg * 10) / 10 : null,
      evolvedCount: instEvo && instEvo.count ? instEvo.count : null,
      evolvedPierce: instEvo && instEvo.pierce ? instEvo.pierce : null,
      evolvedCd: instEvo && instEvo.cd ? Math.round(instEvo.cd * 100) / 100 : null
    } : null;

    return {
      id: moveId,
      name: def.name,
      type: def.type,
      kind: def.kind,
      cat,
      catName,
      desc: def.desc,
      fit,
      fitPct,
      levels,
      maxLevel: levels[4],
      lvl1: {
        dmg: Math.round((inst1.dmg || 0) * 10) / 10,
        cd: inst1.cd ? Math.round(inst1.cd * 100) / 100 : 0,
        dps: inst1.cd && inst1.dmg ? Math.round((inst1.dmg / inst1.cd) * 10) / 10 : 0,
        count: inst1.count || 1,
        radius: inst1.radius ? Math.round(inst1.radius) : 0,
        pierce: inst1.pierce || 0,
        speed: inst1.speed ? Math.round(inst1.speed) : 0,
        homing: inst1.homing || 0,
        bounce: inst1.bounce || 0,
        stun: inst1.stun || 0,
        charge: inst1.charge || 0
      },
      ladder,
      lvl5: {
        dmg: Math.round((inst5.dmg || 0) * 10) / 10,
        cd: inst5.cd ? Math.round(inst5.cd * 100) / 100 : 0,
        dps: inst5.cd && inst5.dmg ? Math.round((inst5.dmg / inst5.cd) * 10) / 10 : 0,
        count: inst5.count || 1,
        radius: inst5.radius ? Math.round(inst5.radius) : 0,
        pierce: inst5.pierce || 0,
        speed: inst5.speed ? Math.round(inst5.speed) : 0,
        homing: inst5.homing || 0,
        bounce: inst5.bounce || 0,
        stun: inst5.stun || 0,
        charge: inst5.charge || 0
      },
      isBuff,
      buffLadder,
      buffCap: buffLadder.length ? buffLadder[4].maxStacks : 0,
      buffDuration: buffLadder.length ? buffLadder[4].duration : 0,
      buffScaling,
      evolution: evoObj,
      goldenEvolution: evoObj
    };
  }

  /**
   * Genera las mejores combinaciones de 4 movimientos + objeto para cualquier Pokémon
   */
  function generateRecommendedBuilds(pokemon) {
    if (!pokemon) return [];

    let pool = pokemon.moves && pokemon.moves.poolMoves;
    if (!pool && window.G && G.Moves) {
      const ids = G.Moves.poolFor(pokemon);
      pool = ids.map(id => {
        const def = G.Moves.BY_ID[id];
        if (!def) return null;
        const evo = G.Moves.EVO ? G.Moves.EVO[id] : null;
        const cat = def.cat || null;
        const catName = cat === 'physical' ? 'Físico' : cat === 'special' ? 'Especial' : 'Mejora';
        const fit = (window.G && G.Stats && G.Stats.fit) ? G.Stats.fit(pokemon, cat) : 1;
        return {
          id,
          name: def.name,
          type: def.type,
          kind: def.kind,
          cat,
          catName,
          fit: Math.round(fit * 100) / 100,
          fitPct: Math.round(fit * 100),
          desc: def.desc,
          cd: def.cd,
          dmg: def.dmg || 0,
          knock: def.knock || 0,
          radius: def.radius || 0,
          speed: def.speed || 0,
          count: def.count || 1,
          pierce: def.pierce || 0,
          burn: def.burn || 0,
          poison: def.poison || 0,
          slow: def.slow || 0,
          homing: def.homing || 0,
          bounce: def.bounce || 0,
          charge: def.charge || 0,
          stun: def.stun || 0,
          pull: def.pull || 0,
          dur: def.dur || 0,
          stat: def.stat || null,
          amount: def.amount || 0,
          evolution: evo ? {
            newName: evo[0],
            requiresStat: evo[1],
            statName: (G.Moves.NEED_NAME && G.Moves.NEED_NAME[evo[1]]) || evo[1]
          } : null
        };
      }).filter(Boolean);
    }
    if (!pool || pool.length === 0) return [];

    const side = pokemon.side || ((window.G && G.Stats && G.Stats.sideOf) ? G.Stats.sideOf(pokemon) : 'physical');
    const sideName = (window.G && G.Stats && G.Stats.NAME && G.Stats.NAME[side]) || (side === 'special' ? 'Especial' : 'Físico');
    const isPhys = side === 'physical';
    const types = pokemon.types || ['normal'];

    // Filtros de movimientos por rol táctico
    const matchingSideMoves = pool.filter(m => m.cat === side || !m.cat);
    const stabMoves = pool.filter(m => types.includes(m.type));
    const stabMatchingMoves = matchingSideMoves.filter(m => types.includes(m.type));
    const evoMoves = pool.filter(m => m.evolution);

    // Clasificación por roles
    const ccKinds = ['vortex', 'stun', 'shove', 'nova', 'orbit', 'spin', 'quake'];
    const burstKinds = ['charge', 'beam', 'meteor'];
    const spammers = ['projectile', 'melee', 'cone', 'chain', 'homing', 'bounce'];

    const ccMoves = pool.filter(m => ccKinds.includes(m.kind) || m.slow > 0 || m.stun > 0 || m.pull > 0);
    const burstMoves = pool.filter(m => burstKinds.includes(m.kind) || m.dmg >= 22);
    const spammerMoves = pool.filter(m => spammers.includes(m.kind));
    const dashMoves = pool.filter(m => m.kind === 'dash');
    const buffMoves = pool.filter(m => m.kind === 'buff');

    const builds = [];

    // -------------------------------------------------------------
    // BUILD 1: "Meta Dominante (Lado Fuerte & DPS Máximo)"
    // -------------------------------------------------------------
    const metaPicked = [];
    const usedIds = new Set();

    // 1. Spammer principal con STAB o del lado fuerte
    const primaryDps = stabMatchingMoves.find(m => spammers.includes(m.kind) && m.dmg > 0)
      || matchingSideMoves.find(m => spammers.includes(m.kind) && m.dmg > 0)
      || pool.find(m => m.dmg > 0);
    if (primaryDps) { metaPicked.push(primaryDps); usedIds.add(primaryDps.id); }

    // 2. Ataque de Daño en Área / Hordas
    const aoeMove = matchingSideMoves.find(m => !usedIds.has(m.id) && ['nova', 'aura', 'orbit', 'spin', 'quake', 'vortex'].includes(m.kind))
      || pool.find(m => !usedIds.has(m.id) && ['nova', 'aura', 'orbit', 'spin', 'quake', 'vortex'].includes(m.kind));
    if (aoeMove) { metaPicked.push(aoeMove); usedIds.add(aoeMove.id); }

    // 3. Daño Concentrado / Anti-Jefes
    const finisherMove = matchingSideMoves.find(m => !usedIds.has(m.id) && (burstKinds.includes(m.kind) || m.dmg >= 22))
      || pool.find(m => !usedIds.has(m.id) && (burstKinds.includes(m.kind) || m.dmg >= 22));
    if (finisherMove) { metaPicked.push(finisherMove); usedIds.add(finisherMove.id); }

    // 4. Buff del lado fuerte (Danza Espada para físicos, Maquinación para especiales) o Dash o Teledirigido
    const sideBuffId = isPhys ? 'swords-dance' : 'nasty-plot';
    const strongBuff = buffMoves.find(m => m.id === sideBuffId && !usedIds.has(m.id));
    const utilityMove = strongBuff
      || dashMoves.find(m => !usedIds.has(m.id))
      || matchingSideMoves.find(m => !usedIds.has(m.id) && m.homing > 0)
      || matchingSideMoves.find(m => !usedIds.has(m.id) && m.evolution)
      || pool.find(m => !usedIds.has(m.id));
    if (utilityMove) { metaPicked.push(utilityMove); usedIds.add(utilityMove.id); }

    // Rellenar hasta 4 si faltan
    for (const m of matchingSideMoves.concat(pool)) {
      if (metaPicked.length >= 4) break;
      if (!usedIds.has(m.id)) { metaPicked.push(m); usedIds.add(m.id); }
    }

    const metaItem = isPhys
      ? { id: 'choiceband', name: 'Cinta Elección', desc: '+40% de daño físico masivo en todos los golpes.' }
      : { id: 'lifeorb', name: 'Vidasfera', desc: '+30% de daño destructivo en todos los ataques especiales.' };

    builds.push({
      id: 'meta_burst',
      title: `Meta Dominante: ${sideName}`,
      tag: isPhys ? 'Físico Puro' : 'Especial Puro',
      badgeClass: isPhys ? 'phys' : 'spec',
      icon: (window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get(isPhys ? 'burst' : 'sparkles', { size: 18 }) : '',
      desc: `Maximiza el multiplicador dominante de ${pokemon.name} (×${pokemon.atk.toFixed(2)}) aprovechando ataques al 100% de eficacia, sinergia STAB y daño explosivo.`,
      moves: metaPicked.slice(0, 4),
      item: metaItem,
      synergyScore: 97,
      highlights: [
        `100% afinidad de daño con ${sideName}`,
        `${metaPicked.filter(m => types.includes(m.type)).length} ataques con bonificación STAB`,
        `${metaPicked.filter(m => m.evolution).length} movimientos con evolución dorada final`
      ]
    });

    // -------------------------------------------------------------
    // BUILD 2: "Supervivencia y Control de Hordas (Min 15+ & Grietas)"
    // -------------------------------------------------------------
    const survPicked = [];
    const survIds = new Set();

    // 1. Mejor control de masas (vortex, stun, shove, slow)
    const primaryCc = pool.find(m => m.kind === 'vortex' || m.kind === 'stun' || m.kind === 'shove' || m.slow > 0);
    if (primaryCc) { survPicked.push(primaryCc); survIds.add(primaryCc.id); }

    // 2. Escudo / Barrera de daño continuo (orbit, aura, spin)
    const barrier = pool.find(m => !survIds.has(m.id) && ['orbit', 'aura', 'spin', 'nova'].includes(m.kind));
    if (barrier) { survPicked.push(barrier); survIds.add(barrier.id); }

    // 3. Movilidad tipo Dash para escapar con frames de invulnerabilidad
    const dash = dashMoves.find(m => !survIds.has(m.id))
      || pool.find(m => !survIds.has(m.id) && m.id === 'substitute');
    if (dash) { survPicked.push(dash); survIds.add(dash.id); }

    // 4. Regeneración o defensa (Acua Aro, Fortaleza, o ataque con retroceso/perforación)
    const sustain = pool.find(m => !survIds.has(m.id) && (m.id === 'aqua-ring' || m.id === 'harden' || m.pierce >= 1))
      || matchingSideMoves.find(m => !survIds.has(m.id))
      || pool.find(m => !survIds.has(m.id));
    if (sustain) { survPicked.push(sustain); survIds.add(sustain.id); }

    // Rellenar hasta 4
    for (const m of pool) {
      if (survPicked.length >= 4) break;
      if (!survIds.has(m.id)) { survPicked.push(m); survIds.add(m.id); }
    }

    const survItem = (pokemon.df >= 80 || pokemon.sd >= 80 || pokemon.hp >= 110)
      ? { id: 'assaultvest', name: 'Chaleco Asalto', desc: '+20% de reducción de daño general (acumula con defensas base).' }
      : { id: 'leftovers', name: 'Restos', desc: 'Regenera un 1,5% de vida por segundo continuamente.' };

    builds.push({
      id: 'survival_cc',
      title: 'Control de Masas & Supervivencia',
      tag: 'Resistencia y Zonas',
      badgeClass: 'def',
      icon: (window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('shield', { size: 18 }) : '',
      desc: `Diseñada para superar las oleadas más densas del minuto 15 y expediciones en Grietas mediante contención en área, barreras y mitigación defensiva.`,
      moves: survPicked.slice(0, 4),
      item: survItem,
      synergyScore: 94,
      highlights: [
        'Neutralización de aglomeraciones con aturdimiento y atracción',
        'Frames de invulnerabilidad con Dash para salir de trampas',
        `Mitigación sinérgica con Defensa (${pokemon.df} DF / ${pokemon.sd} SD)`
      ]
    });

    // -------------------------------------------------------------
    // BUILD 3: "Anti-Jefes & Francotirador (Burst a Distancia)"
    // -------------------------------------------------------------
    const bossPicked = [];
    const bossIds = new Set();

    // 1. Proyectil teledirigido (homing o bounce) para pegar mientras esquivas patrones de jefes
    const homing = pool.find(m => m.kind === 'homing' || m.homing > 0 || m.kind === 'bounce');
    if (homing) { bossPicked.push(homing); bossIds.add(homing.id); }

    // 2. Cañón de daño puro a distancia (beam o charge)
    const sniper = pool.find(m => !bossIds.has(m.id) && (m.kind === 'beam' || m.kind === 'charge' || m.dmg >= 25));
    if (sniper) { bossPicked.push(sniper); bossIds.add(sniper.id); }

    // 3. Segundo proyectil o meteoro
    const secondRanged = pool.find(m => !bossIds.has(m.id) && (m.kind === 'meteor' || m.kind === 'projectile' || m.kind === 'chain'))
      || pool.find(m => !bossIds.has(m.id) && m.dmg >= 18);
    if (secondRanged) { bossPicked.push(secondRanged); bossIds.add(secondRanged.id); }

    // 4. Utilidad de reposicionamiento rápido (Agilidad, Dash o ataque rápido)
    const repos = pool.find(m => !bossIds.has(m.id) && (m.id === 'agility' || m.kind === 'dash'))
      || matchingSideMoves.find(m => !bossIds.has(m.id))
      || pool.find(m => !bossIds.has(m.id));
    if (repos) { bossPicked.push(repos); bossIds.add(repos.id); }

    // Rellenar hasta 4
    for (const m of pool) {
      if (bossPicked.length >= 4) break;
      if (!bossIds.has(m.id)) { bossPicked.push(m); bossIds.add(m.id); }
    }

    const bossItem = (pokemon.spd < 115)
      ? { id: 'choicescarf', name: 'Pañuelo Elección', desc: '+35% de velocidad para kitear jefes sin recibir contacto.' }
      : { id: 'quickclaw', name: 'Garra Rápida', desc: '-20% de recarga en todos los ataques para disparar sin pausa.' };

    builds.push({
      id: 'boss_sniper',
      title: 'Anti-Jefes & Francotirador',
      tag: 'Burst a Distancia',
      badgeClass: 'boss',
      icon: (window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('target', { size: 18 }) : '',
      desc: `Enfocada en liquidar a los jefes de los minutos 3, 6, 9, 12 y 15 atacando desde una distancia segura mientras se esquivan los avisos en el suelo.`,
      moves: bossPicked.slice(0, 4),
      item: bossItem,
      synergyScore: 92,
      highlights: [
        'Ataque teledirigido automático mientras te mueves',
        'Impacto de alto calibre con rayos y proyectiles perforantes',
        'Kiting seguro para evitar el daño letal de contacto de los bosses'
      ]
    });

    // -------------------------------------------------------------
    // BUILD 4: "Sinergia Dorada (Evolución Cuádruple en Grietas)"
    // -------------------------------------------------------------
    // Agrupa movimientos que comparten la misma condición de tienda (needs)
    const needsGroups = {};
    evoMoves.forEach(m => {
      const need = m.evolution ? m.evolution.requiresStat : 'atk';
      needsGroups[need] = needsGroups[need] || [];
      needsGroups[need].push(m);
    });

    let bestNeed = 'atk';
    let maxNeedCount = 0;
    for (const need in needsGroups) {
      if (needsGroups[need].length > maxNeedCount) {
        maxNeedCount = needsGroups[need].length;
        bestNeed = need;
      }
    }

    const goldenPicked = (needsGroups[bestNeed] || []).slice(0, 4);
    const goldenIds = new Set(goldenPicked.map(m => m.id));

    // Si faltan para 4, añadir otros con evolución
    for (const m of evoMoves) {
      if (goldenPicked.length >= 4) break;
      if (!goldenIds.has(m.id)) { goldenPicked.push(m); goldenIds.add(m.id); }
    }
    // Si aún faltan, rellenar del pool
    for (const m of pool) {
      if (goldenPicked.length >= 4) break;
      if (!goldenIds.has(m.id)) { goldenPicked.push(m); goldenIds.add(m.id); }
    }

    const needName = (G.Moves && G.Moves.NEED_NAME && G.Moves.NEED_NAME[bestNeed]) || bestNeed;
    builds.push({
      id: 'golden_synergy',
      title: `Sinergia Dorada: ${needName}`,
      tag: 'Cuádruple Evolución',
      badgeClass: 'gold',
      icon: (window.Analyzer && Analyzer.Icons) ? Analyzer.Icons.get('crown', { size: 18 }) : '',
      desc: `Permite evolucionar múltiples movimientos a su forma dorada en la misma run priorizando la mejora de tienda «${needName}».`,
      moves: goldenPicked.slice(0, 4),
      item: { id: 'luckyegg', name: 'Huevo Suerte', desc: '+30% de experiencia para alcanzar el nivel 5 rápidamente.', reason: '+30% de experiencia para alcanzar el nivel 5 rápidamente.' },
      synergyScore: 90,
      highlights: [
        `Optimizado para la mejora de tienda «${needName}»`,
        `${goldenPicked.filter(m => m.evolution).length} ataques con evolución dorada disponible`,
        'Escalado de daño devastador en partidas prolongadas'
      ]
    });

    const defaultRoles = ['DPS Principal', 'Control / AoE', 'Finisher / Anti-Jefe', 'Soporte / Utilidad'];
    builds.forEach(b => {
      b.name = b.title;
      if (!b.slots) {
        b.slots = (b.moves || []).map((m, idx) => ({
          role: defaultRoles[idx] || 'Ataque',
          move: m
        }));
      }
      if (b.item) {
        b.item.reason = b.item.reason || b.item.desc;
      }
    });

    return builds;
  }

  /**
   * Evalúa una combinación personalizada de 4 movimientos + objeto elegida por el usuario
   */
  function evaluateCustomBuild(pokemon, moveIds, itemId) {
    if (!pokemon || !Array.isArray(moveIds)) return null;

    const moves = moveIds.map(id => {
      const def = G.Moves.BY_ID ? G.Moves.BY_ID[id] : null;
      return def ? Object.assign({}, def, {
        evolution: G.Moves.EVO ? G.Moves.EVO[id] : null
      }) : null;
    }).filter(Boolean);

    const typesHit = new Set();
    let totalDps = 0;
    let matchingSideCount = 0;
    let stabCount = 0;
    let evoCount = 0;
    let ccCount = 0;
    let aoeCount = 0;

    moves.forEach(m => {
      if (m.cd && m.dmg) totalDps += (m.dmg / m.cd);
      if (m.cat === pokemon.side || !m.cat) matchingSideCount++;
      if (pokemon.types.includes(m.type)) stabCount++;
      if (m.evolution) evoCount++;
      if (['vortex', 'stun', 'shove'].includes(m.kind) || m.slow > 0) ccCount++;
      if (['nova', 'aura', 'orbit', 'spin', 'quake', 'vortex'].includes(m.kind)) aoeCount++;

      // Cobertura ofensiva de tipos
      const ALL_TYPES = Object.keys(G.U.TYPE_COLOR || {});
      for (const t of ALL_TYPES) {
        if (G.Types && G.Types.mult(m.type, [t]) > 1.05) {
          typesHit.add(t);
        }
      }
    });

    // Puntuación de sinergia (0 a 100)
    let score = 50;
    score += (matchingSideCount / 4) * 20; // Hasta +20 si coinciden con su lado fuerte
    score += (stabCount / 4) * 15;         // Hasta +15 por STAB
    score += (evoCount / 4) * 15;          // Hasta +15 por evoluciones doradas
    if (ccCount > 0) score += 10;          // +10 por tener control de masas
    if (aoeCount > 0) score += 10;         // +10 por tener área
    if (moves.length === 4) score += 10;   // +10 por tener el set completo de 4

    return {
      moves,
      totalMoves: moves.length,
      synergyScore: Math.min(100, Math.round(score)),
      matchingSideCount,
      stabCount,
      evoCount,
      coveredTypesCount: typesHit.size,
      coveredTypes: Array.from(typesHit),
      estimatedDps: Math.round(totalDps * 10) / 10
    };
  }

  /**
   * Renderiza las tarjetas de las mejores builds recomendadas de 4 movimientos + objeto
   */
  function renderBuildsHtml(pokemon) {
    const builds = generateRecommendedBuilds(pokemon);
    if (!builds || builds.length === 0) {
      return '<p class="sub">No hay suficientes movimientos para generar combinaciones completas.</p>';
    }

    return builds.map((b, idx) => {
      const movesHtml = b.moves.map((m, slot) => {
        const catBadge = m.cat === 'physical'
          ? `<span class="tag-chip cat-phys">${Analyzer.Icons.get('physical', { size: 12 })} Físico</span>`
          : m.cat === 'special'
            ? `<span class="tag-chip cat-spec">${Analyzer.Icons.get('special', { size: 12 })} Especial</span>`
            : `<span class="tag-chip cat-buff">${Analyzer.Icons.get('buff', { size: 12 })} Mejora</span>`;
        const evoBadge = m.evolution
          ? `<span class="gold build-evo-pill" title="Evoluciona a ${m.evolution.newName} con stat ${m.evolution.statName}">${Analyzer.Icons.get('crown', { size: 11 })} ${m.evolution.newName}</span>`
          : '';
        return `
          <div class="build-slot-card">
            <div class="build-slot-num">${slot + 1}</div>
            <div class="build-slot-info">
              <div class="build-slot-top">
                <span class="type-pill-sm" style="background:${G.U.TYPE_COLOR[m.type]}">${G.U.TYPE_NAME[m.type] || m.type}</span>
                <b class="gold">${m.name}</b>
                ${catBadge}
                ${evoBadge}
              </div>
              <div class="build-slot-meta">
                <span class="kind-tag">${m.kind}</span>
                <span>${m.dmg > 0 ? m.dmg + ' daño' : 'Buff'}</span>
                <span>${m.cd ? m.cd + 's cd' : ''}</span>
                <span class="fit-chip ${m.fitPct >= 99 ? 'fit-100' : 'fit-sub'}">${m.fitPct}% eficacia</span>
              </div>
            </div>
            <button class="btn small btn-inspect-scale" data-move-id="${m.id}" data-dex="${pokemon.dex}" title="Ver escalado completo de este ataque">${Analyzer.Icons.get('trendUp', { size: 12 })} Escalado</button>
          </div>
        `;
      }).join('');

      return `
        <div class="build-card ${b.badgeClass}">
          <div class="build-card-head">
            <div class="build-card-title-group">
              <span class="build-icon">${b.icon}</span>
              <div>
                <h4 class="build-title">${b.title}</h4>
                <span class="side-badge ${b.badgeClass}">${b.tag}</span>
              </div>
            </div>
            <div class="build-synergy-badge" title="Puntuación matemática de sinergia entre los 4 movimientos, STAB, lado fuerte y cobertura elemental">
              <b>${b.synergyScore}%</b>
              <small>Sinergia</small>
            </div>
          </div>

          <p class="build-desc">${b.desc}</p>

          <div class="build-slots-container">
            ${movesHtml}
          </div>

          <div class="build-item-box">
            <div class="build-item-head">
              <span>${Analyzer.Icons.get('backpack', { size: 14 })} <b>Objeto Recomendado:</b> <span class="gold">${b.item.name}</span></span>
              <button class="btn small gold btn-equip-build-item" data-dex="${pokemon.dex}" data-item-id="${b.item.id}">Equipar ${b.item.name}</button>
            </div>
            <div class="build-item-desc">${b.item.desc}</div>
          </div>

          <div class="build-highlights">
            ${b.highlights.map(h => `<div class="build-hl-item">${Analyzer.Icons.get('check', { size: 12 })} ${h}</div>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Renderiza el contenido interno para el modal de escalado detallado (Niveles 1 a 5 y evolución dorada)
   */
  function renderMoveScalingModalHtml(scalingData, pokemon) {
    if (!scalingData) return '<p>No se encontraron datos de escalado para este movimiento.</p>';

    const s = scalingData;
    const catBadge = s.cat === 'physical'
      ? `<span class="tag-chip cat-phys">${Analyzer.Icons.get('physical', { size: 12 })} Ataque Físico</span>`
      : s.cat === 'special'
        ? `<span class="tag-chip cat-spec">${Analyzer.Icons.get('special', { size: 12 })} Ataque Especial</span>`
        : `<span class="tag-chip cat-buff">${Analyzer.Icons.get('buff', { size: 12 })} Potenciador (Buff)</span>`;

    let fitNote = '';
    if (pokemon) {
      const strongSide = pokemon.side === 'special' ? 'Ataque Especial (SA)' : 'Ataque Físico (PA)';
      fitNote = `
        <div class="scaling-fit-note">
          Con <b>${pokemon.name}</b>: Se ejecuta usando su <b>${s.cat === 'special' ? 'Ataque Especial (SA ×' + pokemon.sa.toFixed(2) + ')' : 'Ataque Físico (PA ×' + pokemon.pa.toFixed(2) + ')'}</b>, alcanzando un <b class="gold">${s.fitPct}%</b> de su potencia máxima relativa a su ${strongSide}.
        </div>
      `;
    }

    // Escalera de niveles 2 al 5
    const ladderRows = s.ladder.map(step => `
      <div class="ladder-step-row">
        <span class="ladder-lvl-badge">Nivel ${step.level}</span>
        <span class="ladder-text">${step.text}</span>
      </div>
    `).join('');

    // Sección de evolución dorada
    let evoSection = '';
    if (s.evolution) {
      evoSection = `
        <div class="scaling-evo-card">
          <div class="scaling-evo-head">
            <span class="scaling-evo-icon">${Analyzer.Icons.get('crown', { size: 20 })}</span>
            <div>
              <div class="scaling-evo-badge">Evolución Dorada Definitiva</div>
              <h3 class="scaling-evo-title gold">${s.evolution.newName}</h3>
            </div>
          </div>
          <div class="scaling-evo-req">
            <span>Requisito en Run:</span> Haber comprado en la tienda la mejora pasiva de <b>${s.evolution.statName}</b> (sale carta dorada al alcanzar nivel 5).
          </div>
          <div class="scaling-evo-mod">
            <b>Bonificación Dorada:</b> ${s.evolution.modText}
          </div>
          ${s.evolution.evolvedDmg ? `
            <div class="scaling-evo-stats">
              <span>Daño: <b>${s.evolution.evolvedDmg}</b></span>
              <span>Proyectiles/Vueltas: <b>${s.evolution.evolvedCount}</b></span>
              ${s.evolution.evolvedPierce ? `<span>Perforación: <b>${s.evolution.evolvedPierce}</b></span>` : ''}
              <span>Recarga: <b>${s.evolution.evolvedCd}s</b></span>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Tabla de valores base (Nv. 1) vs Nivel Máximo (Nv. 5)
    let statsTable = '';
    if (s.buffScaling) {
      const b = s.buffScaling;
      statsTable = `
        <div class="table-container">
          <table class="analyzer-table scaling-compare-table">
            <thead>
              <tr>
                <th>Propiedad del Buff</th>
                <th>Nivel 1 (Base)</th>
                <th>Nivel 5 (Máximo)</th>
                <th>Crecimiento Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Estadística Modificada</td>
                <td colspan="3"><b class="gold">${b.statLabel}</b></td>
              </tr>
              <tr>
                <td>Potencia por Acumulación</td>
                <td>+${b.basePerStack}%</td>
                <td><b class="pos">+${b.lvl5PerStack}%</b></td>
                <td><span class="item-delta pos">+${Math.round((b.lvl5PerStack - b.basePerStack) * 10) / 10}%</span></td>
              </tr>
              <tr>
                <td>Acumulaciones Máximas</td>
                <td>${b.baseMaxStacks} veces</td>
                <td><b class="pos">${b.lvl5MaxStacks} veces</b></td>
                <td><span class="item-delta pos">+${b.lvl5MaxStacks - b.baseMaxStacks}</span></td>
              </tr>
              <tr>
                <td>Potencia Máxima Acumulada</td>
                <td>+${b.baseTotalBonus}%</td>
                <td><b class="gold">+${b.lvl5TotalBonus}%</b></td>
                <td><span class="item-delta pos">+${Math.round((b.lvl5TotalBonus - b.baseTotalBonus) * 10) / 10}%</span></td>
              </tr>
              <tr>
                <td>Duración del Efecto</td>
                <td>${b.baseDuration}s</td>
                <td><b class="pos">${b.lvl5Duration}s</b></td>
                <td><span class="item-delta pos">+${Math.round((b.lvl5Duration - b.baseDuration) * 10) / 10}s</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      const l1 = s.lvl1;
      const l5 = s.lvl5;
      statsTable = `
        <div class="table-container">
          <table class="analyzer-table scaling-compare-table">
            <thead>
              <tr>
                <th>Estadística de Combate</th>
                <th>Nivel 1 (Base)</th>
                <th>Nivel 5 (Máximo)</th>
                <th>Aumento / Reducción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Daño Base por Impacto</td>
                <td>${l1.dmg}</td>
                <td><b class="pos">${l5.dmg}</b></td>
                <td><span class="item-delta pos">+${Math.round(((l5.dmg - l1.dmg) / (l1.dmg || 1)) * 100)}%</span></td>
              </tr>
              <tr>
                <td>Tiempo de Recarga (Cooldown)</td>
                <td>${l1.cd}s</td>
                <td><b class="pos">${l5.cd}s</b></td>
                <td><span class="item-delta ${l5.cd < l1.cd ? 'pos' : 'zero'}">${l5.cd < l1.cd ? Math.round(((l5.cd - l1.cd) / l1.cd) * 100) + '%' : '='}</span></td>
              </tr>
              <tr>
                <td>DPS Estimado</td>
                <td>${l1.dps} / s</td>
                <td><b class="gold">${l5.dps} / s</b></td>
                <td><span class="item-delta pos">+${Math.round(((l5.dps - l1.dps) / (l1.dps || 1)) * 100)}%</span></td>
              </tr>
              <tr>
                <td>Proyectiles / Impactos</td>
                <td>${l1.count}</td>
                <td><b>${l5.count}</b></td>
                <td><span class="item-delta ${l5.count > l1.count ? 'pos' : 'zero'}">${l5.count > l1.count ? '+' + (l5.count - l1.count) : '='}</span></td>
              </tr>
              ${l1.pierce || l5.pierce ? `
                <tr>
                  <td>Perforación de Enemigos</td>
                  <td>${l1.pierce}</td>
                  <td><b>${l5.pierce}</b></td>
                  <td><span class="item-delta pos">+${l5.pierce - l1.pierce}</span></td>
                </tr>
              ` : ''}
              ${l1.radius || l5.radius ? `
                <tr>
                  <td>Radio / Alcance</td>
                  <td>${l1.radius} px</td>
                  <td><b>${l5.radius} px</b></td>
                  <td><span class="item-delta ${l5.radius > l1.radius ? 'pos' : 'zero'}">${l5.radius > l1.radius ? '+' + Math.round(((l5.radius - l1.radius) / l1.radius) * 100) + '%' : '='}</span></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <div class="scaling-modal-header">
        <div class="scaling-title-row">
          <span class="type-pill" style="background:${G.U.TYPE_COLOR[s.type]}">${G.U.TYPE_NAME[s.type] || s.type}</span>
          <h2>${s.name}</h2>
          ${catBadge}
          <span class="kind-tag">${s.kind}</span>
        </div>
        <p class="scaling-desc">${s.desc}</p>
        ${fitNote}
      </div>

      <div class="scaling-section">
        <h4>Comparativa de Poder: Nivel 1 (Inicial) vs Nivel 5 (Máximo)</h4>
        ${statsTable}
      </div>

      <div class="scaling-section">
        <h4>Escalera de Mejoras por Subida de Nivel (Niveles 2 al 5)</h4>
        <div class="ladder-steps-container">
          ${ladderRows}
        </div>
      </div>

      ${evoSection}
    `;
  }

  return {
    getMoveScaling,
    generateRecommendedBuilds,
    evaluateCustomBuild,
    renderBuildsHtml,
    renderMoveScalingModalHtml
  };
})();

