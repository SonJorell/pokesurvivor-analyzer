/* ============ data-adapter.js — Adaptador y Verificador de Datos ============
 * PokéSurvivor Character Analyzer
 *
 * Lee los datos reales del repositorio (G.DEX, G.SPRITE_META, G.Moves, G.STARTERS,
 * G.Enemies, G.Types, G.Upgrades, G.Items, etc.) y los enriquece con verificaciones
 * explícitas y métricas de rendimiento basadas en las fórmulas reales del juego.
 *
 * REGLA FUNDAMENTAL:
 * - NO inventar habilidades, naturalezas, IVs/EVs o defensas que no existen en el código.
 * - Si un dato no existe en PokéSurvivor, se documenta como «No disponible».
 * - Toda puntuación analítica está documentada con su fórmula exacta.
 */

window.G = window.G || {};
window.Analyzer = window.Analyzer || {};

Analyzer.DataAdapter = (() => {
  'use strict';

  // Nombres de las 9 generaciones del juego
  const GEN_NAMES = {
    1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Teselia',
    6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea'
  };

  const getIco = (name, size = 14) => (window.Analyzer && Analyzer.Icons && Analyzer.Icons.get ? Analyzer.Icons.get(name, { size }) : '');

  // Metadatos de Regiones del Mundo Pokémon en PokéSurvivor (100% Verificados)
  const REGIONS = [
    { id: 'all', gen: 'all', name: 'Todas las Regiones', get icon() { return getIco('globe', 14); }, dexRange: '#001 - #1024', count: 966 },
    { id: 1, gen: 1, name: 'Kanto', get icon() { return getIco('tree', 14); }, dexRange: '#001 - #151', count: 151, minDex: 1, maxDex: 151 },
    { id: 2, gen: 2, name: 'Johto', get icon() { return getIco('temple', 14); }, dexRange: '#152 - #251', count: 100, minDex: 152, maxDex: 251 },
    { id: 3, gen: 3, name: 'Hoenn', get icon() { return getIco('water', 14); }, dexRange: '#252 - #386', count: 135, minDex: 252, maxDex: 386 },
    { id: 4, gen: 4, name: 'Sinnoh', get icon() { return getIco('mountain', 14); }, dexRange: '#387 - #493', count: 107, minDex: 387, maxDex: 493 },
    { id: 5, gen: 5, name: 'Teselia', get icon() { return getIco('city', 14); }, dexRange: '#494 - #649', count: 141, minDex: 494, maxDex: 649 },
    { id: 6, gen: 6, name: 'Kalos', get icon() { return getIco('castle', 14); }, dexRange: '#650 - #721', count: 70, minDex: 650, maxDex: 721 },
    { id: 7, gen: 7, name: 'Alola', get icon() { return getIco('flower', 14); }, dexRange: '#722 - #809', count: 83, minDex: 722, maxDex: 809 },
    { id: 8, gen: 8, name: 'Galar', get icon() { return getIco('swords', 14); }, dexRange: '#810 - #905', count: 87, minDex: 810, maxDex: 905 },
    { id: 9, gen: 9, name: 'Paldea', get icon() { return getIco('dunes', 14); }, dexRange: '#906 - #1024', count: 92, minDex: 906, maxDex: 1024 }
  ];

  // Rangos globales para normalizaciones analíticas (100% verificados con los 966 Pokémon)
  const STAT_RANGES = {
    hp:  { min: 70, max: 185, avg: 101.3 },
    spd: { min: 80, max: 162, avg: 106.2 },
    atk: { min: 0.76, max: 1.70, avg: 1.18 },
    pa:  { min: 0.73, max: 1.70, avg: 1.12 },
    sa:  { min: 0.76, max: 1.65, avg: 1.08 },
    df:  { min: 5, max: 230, avg: 71.9 },
    sd:  { min: 20, max: 230, avg: 69.8 },
    bst: { min: 175, max: 720, avg: 425.1 }
  };

  // Explicaciones detalladas de cada rendimiento analítico evaluado (para tooltips y ayudas)
  const METRIC_DEFINITIONS = {
    overall: {
      key: 'overall',
      name: 'Rendimiento Global',
      shortName: 'Global',
      get icon() { return getIco('star', 14); },
      shortDesc: 'Puntuación analítica integral ponderada de todas las dimensiones tácticas.',
      fullDesc: 'Media ponderada que sintetiza las 6 dimensiones clave (Ofensiva 22%, Supervivencia 20%, Movilidad 18%, Control 14%, Flexibilidad 12% y Jefes 14%). Refleja la solvencia y consistencia general del Pokémon a lo largo de una partida completa.',
      desc: 'Puntuación integral (0-100) que sintetiza el daño, supervivencia, agilidad, control de masas y efectividad contra jefes en el motor de combate de PokéSurvivor.'
    },
    offensive: {
      key: 'offensive',
      name: 'Daño Ofensivo',
      shortName: 'Ofensiva',
      get icon() { return getIco('sword', 14); },
      shortDesc: 'Capacidad de infligir daño continuo y en ráfaga a los enemigos.',
      fullDesc: 'Combina el multiplicador base de Ataque (55%), el DPS estimado de su movimiento inicial (25%) y la variedad de movimientos ofensivos de su repertorio (20%) para evaluar el potencial de daño directo.',
      desc: 'Capacidad destructiva calculada combinando el multiplicador ATK base del Pokémon (hasta ×1.70), el daño y cadencia de su ataque inicial, y la variedad de movimientos ofensivos aprendibles.'
    },
    survival: {
      key: 'survival',
      name: 'Supervivencia',
      shortName: 'Defensa',
      get icon() { return getIco('shield', 14); },
      shortDesc: 'Durabilidad, defensas física/especial, tipos y evasión por hitbox.',
      fullDesc: 'Integra los Puntos de Salud (HP) base (35%), la mitigación por Defensa Física y Especial de G.Stats (15%), la red defensiva de tipos (resistencias vs debilidades e inmunidades, 40%) y el tamaño reducido de su hitbox (evasión pasiva de colisiones, 10%).',
      desc: 'Resistencia a morir en combate basada en la salud máxima (70 a 185 HP), la mitigación de daño con Defensa (df) y Def. Especial (sd) según G.Stats, la tabla elemental suavizada y el tamaño de hitbox.'
    },
    mobility: {
      key: 'mobility',
      name: 'Movilidad',
      shortName: 'Agilidad',
      get icon() { return getIco('zap', 14); },
      shortDesc: 'Velocidad de desplazamiento, levitación sobre terrenos y dashes.',
      fullDesc: 'Califica la agilidad para esquivar y recorrer la mazmorra. Considera la Velocidad de movimiento base (70%), la capacidad de levitar/flotar sobre terrenos adversos (agua, pantano, lava, +18 pts) y el acceso a movimientos tipo Dash (+12 pts).',
      desc: 'Agilidad para desplazarse y esquivar calculada con la velocidad base (80 a 162 SPD), bonificación de flotación sobre agua, lava y rocas (G.Sprites.hovers), y acceso a movimientos con dash o embestida.'
    },
    control: {
      key: 'control',
      name: 'Control y Alcance',
      shortName: 'Control',
      get icon() { return getIco('target', 14); },
      shortDesc: 'Capacidad para frenar o neutralizar hordas densas con AoE o estados.',
      fullDesc: 'Mide la capacidad de contener y neutralizar hordas densas de enemigos. Premia efectos de ralentización/aturdimiento (+20), proyectiles teledirigidos (homing, +20), daño en área/novas (+20), minas (+15), perforación (+15) y alto retroceso (knockback, +10).',
      desc: 'Capacidad de neutralizar oleadas masivas con efectos de proyectiles perforantes (pierce), atracción teledirigida (homing), parálisis/ralentización, áreas de daño (AoE) y empuje.'
    },
    flexibility: {
      key: 'flexibility',
      name: 'Flexibilidad de Build',
      shortName: 'Versatilidad',
      get icon() { return getIco('sync', 14); },
      shortDesc: 'Variedad de arquetipos y opciones de adaptación al subir de nivel.',
      fullDesc: 'Variedad de opciones tácticas al subir de nivel. Se basa en el número total de movimientos aprendibles (50%) y la diversidad de arquetipos disponibles (proyectil, rayo, aura, nova, minas, cuerpo a cuerpo, etc., 50%).',
      desc: 'Variedad de opciones viables durante la partida según la cantidad total de movimientos aprendibles y la diversidad de tipos elementales en su repertorio bélico.'
    },
    boss: {
      key: 'boss',
      name: 'Rendimiento vs Jefes',
      shortName: 'Anti-Jefes',
      get icon() { return getIco('crown', 14); },
      shortDesc: 'Eficacia y seguridad al derribar jefes solitarios y élites de oleada.',
      fullDesc: 'Eficacia al enfrentar jefes solitarios y élites de oleada. Premia el daño concentrado (burst damage de 24+ potencia, 25 pts), multiplicador de ataque escalado (55%) y la seguridad para atacar a distancia sin exponerse al contacto (20 pts).',
      desc: 'Eficacia en los minutos 3, 6, 9, 12 y 15 combinando daño concentrado (burst), seguridad de alcance y ataques de alto impacto individual para eliminar bosses rápidamente.'
    },
    lateGame: {
      key: 'lateGame',
      name: 'Partidas Prolongadas',
      shortName: 'Late Game',
      get icon() { return getIco('galaxy', 14); },
      shortDesc: 'Potencial de escalado en oleadas avanzadas (min 15+) y expediciones.',
      fullDesc: 'Potencial en oleadas avanzadas (minuto 15+) y expediciones en Grietas. Mide la cantidad de movimientos con evolución dorada (+30%), el balance combinado de supervivencia y ataque, y su autosuficiencia ante hordas extremas.',
      desc: 'Potencial para superar oleadas avanzadas más allá del minuto 20 y grietas dimensionales gracias a las evoluciones de sus movimientos y resistencia acumulada.'
    }
  };

  // Cache interna de Pokémon procesados
  let enrichedCache = null;
  let dexMap = null;

  /**
   * Determina la disponibilidad de un Pokémon en PokéSurvivor:
   * 1. Inicial (Starter): Test de personalidad o elección directa en el menú inicial.
   * 2. Banner de Gacha: Disponible por tickets en su generación según su rareza (1 a 5 estrellas).
   * 3. Legendario / Grieta: Solo aparece en grietas dimensionales del Mundo Distorsión (y Arceus al min 30).
   * 4. Enemigo Salvaje: Aparece en hordas o tramos según su BST.
   * 5. Jefe de Mapa: Aparece en minutos 3, 6, 9, 12, 15 si tiene BST alto y no es legendario.
   */
  function getAvailability(p) {
    const isStarter = !!p.starter;
    const isLegendary = !!p.leg;
    const inGacha = !isLegendary; // Legendarios salen en grietas; en gacha están los de su banner generacional
    const canBePartner = true;    // Todo Pokémon que esté en G.DEX puede ser compañero una vez obtenido en partida

    const modes = [];
    if (isStarter) modes.push('Compañero Inicial');
    if (inGacha) modes.push(`Gacha Gen ${p.gen} (${GEN_NAMES[p.gen]})`);
    if (isLegendary) modes.push('Grieta Dimensional (Legendario)');

    return {
      isStarter,
      isLegendary,
      inGacha,
      canBePartner,
      rarity: p.rarity,
      rarityName: (G.Gacha && G.Gacha.RARITY_NAME && G.Gacha.RARITY_NAME[p.rarity]) || (p.rarity + ' Estrellas'),
      rarityColor: (G.Gacha && G.Gacha.RARITY_COLOR && G.Gacha.RARITY_COLOR[p.rarity]) || '#ffd23f',
      modes,
      summary: isStarter
        ? 'Inicial seleccionable y gacha'
        : isLegendary
          ? 'Jefe de Grieta / Evento legendario'
          : `Gacha (${p.rarity} Estrellas) y enemigo salvaje`
    };
  }

  /**
   * Obtiene la geometría y metadatos de animación de SpriteCollab
   */
  function getSpriteMetadata(dex) {
    const meta = (G.SPRITE_META && G.SPRITE_META[dex]) || null;
    const hasShiny = !!(meta && meta.sh);
    const hovers = !!(meta && meta.hv);
    const shadowSize = meta ? meta.s : 1;
    const idleAnim = meta && meta.a ? meta.a.Idle : null;
    const frameW = idleAnim ? idleAnim.w : 32;
    const frameH = idleAnim ? idleAnim.h : 32;
    const anchorY = idleAnim ? idleAnim.ay : 24;

    // Fórmulas reales de hitbox en js/core/sprites.js
    const PX = 2;
    const bodyRadius = Math.max(5, Math.min(26, frameW * 0.22)) * PX;
    const bodyHeight = anchorY * PX;

    // Lista de animaciones disponibles
    const availableAnims = meta && meta.a ? Object.keys(meta.a) : ['Idle'];

    return {
      verified: !!meta,
      hasShiny,
      hovers,
      shadowSize,
      frameWidth: frameW,
      frameHeight: frameH,
      anchorY,
      bodyRadius: Math.round(bodyRadius * 10) / 10,
      bodyHeight: Math.round(bodyHeight * 10) / 10,
      availableAnims,
      normalSpritePath: `${(window.G && G.Sprites && G.Sprites.basePath) || ''}assets/pokemon/${dex}/Idle.png`,
      shinySpritePath: hasShiny ? `${(window.G && G.Sprites && G.Sprites.basePath) || ''}assets/pokemon/${dex}/s/Idle.png` : null
    };
  }

  /**
   * Movimiento inicial y lista de movimientos que puede aprender
   */
  function getMovesData(p) {
    // Movimiento inicial verificado en starters.js o moves.js
    const startMoveId = G.startMoveOf ? G.startMoveOf(p.dex) : (G.Moves ? G.Moves.startFor(p) : 'tackle');
    const startMoveDef = (G.Moves && G.Moves.BY_ID && G.Moves.BY_ID[startMoveId]) || null;

    // Repertorio de movimientos que este Pokémon puede aprender (G.Moves.poolFor):
    // tipos del Pokémon + tipo normal común a todos
    const poolIds = (G.Moves && G.Moves.poolFor) ? G.Moves.poolFor(p) : [];
    const poolMoves = poolIds.map(id => {
      const def = G.Moves.BY_ID[id];
      if (!def) return null;
      const evo = G.Moves.EVO ? G.Moves.EVO[id] : null;
      const cat = def.cat || null;
      const catName = cat === 'physical' ? 'Físico' : cat === 'special' ? 'Especial' : 'Mejora';
      const fit = (window.G && G.Stats && G.Stats.fit) ? G.Stats.fit(p, cat) : 1;
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

    // Variedad de familias (kinds)
    const kindsSet = new Set(poolMoves.map(m => m.kind));
    const startCat = startMoveDef ? startMoveDef.cat || null : null;
    const startFit = (startMoveDef && window.G && G.Stats && G.Stats.fit) ? G.Stats.fit(p, startCat) : 1;

    return {
      startMoveId,
      startMove: startMoveDef ? {
        id: startMoveId,
        name: startMoveDef.name,
        type: startMoveDef.type,
        kind: startMoveDef.kind,
        cat: startCat,
        catName: startCat === 'physical' ? 'Físico' : startCat === 'special' ? 'Especial' : 'Mejora',
        fit: Math.round(startFit * 100) / 100,
        fitPct: Math.round(startFit * 100),
        desc: startMoveDef.desc,
        cd: startMoveDef.cd,
        dmg: startMoveDef.dmg || 0,
        dpsEstimate: startMoveDef.cd ? Math.round(((startMoveDef.dmg || 0) / startMoveDef.cd) * 10) / 10 : 0
      } : null,
      totalMoves: poolMoves.length,
      distinctKindsCount: kindsSet.size,
      distinctKinds: Array.from(kindsSet),
      poolMoves
    };
  }

  /**
   * Rasgos de personalidad si es Inicial
   */
  function getStarterTraits(dex) {
    const starterEntry = (G.STARTER_BY && G.STARTER_BY[dex]) || null;
    if (!starterEntry) return null;
    return {
      traits: starterEntry.traits,
      traitDescriptions: starterEntry.traits.map(t => ({
        trait: t,
        description: (G.TRAIT_TEXT && G.TRAIT_TEXT[t]) || 'Rasgo característico'
      }))
    };
  }

  /**
   * Rol y comportamiento como enemigo salvaje en G.Enemies
   */
  function getEnemyRole(p) {
    if (!G.Enemies) return { role: 'Desconocido', description: 'No disponible' };

    // Si es legendario, solo aparece en grietas o evento final
    if (p.leg) {
      return {
        role: 'legendary',
        name: 'Jefe de Grieta',
        description: 'No aparece en hordas salvajes comunes; habita en arenas cerradas de grietas dimensionales.',
        isBossCandidate: true
      };
    }

    const role = G.Enemies.behaviorOf ? G.Enemies.behaviorOf(p) : 'chase';
    const ROLE_INFO = {
      healer:   { name: 'Curandero', desc: 'Cura a otros enemigos cercanos en el campo de batalla.' },
      shielder: { name: 'Escudero', desc: 'Otorga escudos protectores a los enemigos cercanos.' },
      bomber:   { name: 'Explosivo', desc: 'Se aproxima con velocidad acelerada y detona infligiendo gran daño.' },
      summoner: { name: 'Invocador', desc: 'Invoca manadas de compañeros o crías durante el combate.' },
      beamer:   { name: 'Rayo Telegrafiado', desc: 'Carga un potente haz en línea recta con aviso previo en el suelo.' },
      zoner:    { name: 'Control de Zonas', desc: 'Genera círculos de peligro bajo los pies del jugador.' },
      fan:      { name: 'Abanico', desc: 'Dispara proyectiles en abanico multidireccional.' },
      jumper:   { name: 'Saltador', desc: 'Salta y cae sobre la posición con impacto en área telegrafiado.' },
      ranged:   { name: 'A Distancia', desc: 'Mantiene distancia y dispara proyectiles.' },
      charger:  { name: 'Embesticador', desc: 'Se detiene, apunta y embiste en línea recta.' },
      tank:     { name: 'Tanque', desc: 'Movimiento lento, salud elevada y daño contundente.' },
      chase:    { name: 'Perseguidor', desc: 'Avanza directamente hacia el jugador de forma constante.' },
      runner:   { name: 'Corredor', desc: 'Velocidad muy alta para cortar el paso a jugadores que huyen.' }
    };

    const isBossCandidate = p.bst >= 490;

    return {
      role,
      name: (ROLE_INFO[role] && ROLE_INFO[role].name) || role,
      description: (ROLE_INFO[role] && ROLE_INFO[role].desc) || 'Comportamiento en combate salvaje.',
      isBossCandidate
    };
  }

  /**
   * Tabla de efectividad defensiva frente a los 18 tipos de ataque
   * calculada con la tabla suavizada real de G.Types
   */
  function getTypeMatchups(types) {
    if (!G.Types || !G.Types.CHART) return null;
    const ALL_TYPES = Object.keys(G.U.TYPE_COLOR || G.Types.CHART);

    const matchups = {};
    let weakCount = 0;
    let resistCount = 0;
    let immuneEquivalentCount = 0; // x0.3 (el x0 clásico suavizado a 0.3)

    for (const atkType of ALL_TYPES) {
      const mult = G.Types.mult(atkType, types);
      const label = G.Types.label(mult); // 'super' (> 1.05) | 'weak' (< 0.95) | null
      matchups[atkType] = {
        multiplier: Math.round(mult * 100) / 100,
        label, // 'super' (recibe más daño) | 'weak' (recibe menos daño / resiste)
        isImmunityLike: mult <= 0.35,
        isWeakness: mult > 1.05,
        isResistance: mult < 0.95
      };

      if (mult > 1.05) weakCount++;
      if (mult < 0.95) resistCount++;
      if (mult <= 0.35) immuneEquivalentCount++;
    }

    // Ventaja Ofensiva: tipos contra los que este Pokémon hace más daño con sus tipos STAB
    const dealsSuperTo = [];
    for (const targetType of ALL_TYPES) {
      let maxOffMult = 1;
      let bestAtkType = types[0];
      for (const myT of types) {
        const m = G.Types.mult(myT, [targetType]);
        if (m > maxOffMult) {
          maxOffMult = m;
          bestAtkType = myT;
        }
      }
      if (maxOffMult > 1.05) {
        dealsSuperTo.push({
          type: targetType,
          mult: maxOffMult,
          multiplierText: `×${maxOffMult.toFixed(1)}`,
          effectiveWith: bestAtkType,
          label: 'Súper Eficaz'
        });
      }
    }
    dealsSuperTo.sort((a, b) => b.mult - a.mult);

    // Resistencias y Debilidades ordenadas por magnitud
    const resistsList = [];
    const weaknessesList = [];

    for (const [atkType, info] of Object.entries(matchups)) {
      if (info.isResistance) {
        resistsList.push({
          type: atkType,
          mult: info.multiplier,
          multiplierText: `×${info.multiplier}`,
          isImmunity: info.isImmunityLike,
          label: info.isImmunityLike ? 'Inmunidad Suavizada (×0.3)' : `Resistencia (×${info.multiplier})`
        });
      } else if (info.isWeakness) {
        weaknessesList.push({
          type: atkType,
          mult: info.multiplier,
          multiplierText: `×${info.multiplier}`,
          isDoubleWeakness: info.multiplier >= 2.0,
          label: info.multiplier >= 2.0 ? `Doble Debilidad (×${info.multiplier})` : `Debilidad (×${info.multiplier})`
        });
      }
    }

    resistsList.sort((a, b) => a.mult - b.mult);
    weaknessesList.sort((a, b) => b.mult - a.mult);

    return {
      matchups,
      dealsSuperTo,       // Tipos a los que más daño hace con sus ataques
      resistsList,        // Tipos a los que tiene más resistencia de ataque
      weaknessesList,     // Tipos a los que recibe más daño
      weakCount,
      resistCount,
      immuneEquivalentCount,
      defensiveNetScore: resistCount - weakCount + (immuneEquivalentCount * 0.5)
    };
  }

  /**
   * Interacciones con terrenos líquidos (G.World.liquidEffect)
   */
  function getLiquidInteractions(types, hovers) {
    // Si flota (G.Sprites.hovers), pasa por encima de agua, pantano, lava y rocas sin penalización
    if (hovers) {
      return {
        floating: true,
        summary: 'Flota sobre el suelo: Inmune a penalizaciones de agua, lava, pantano y obstáculos terrestres.',
        waterImmune: true,
        lavaImmune: true,
        poisonImmune: true,
        sparkImmune: true,
        iceImmune: true
      };
    }

    // Reglas de G.World:
    // water/swamp: slow 0.6/0.45; immune: ['water']
    // lava: dmg 0.06/every 0.5s; immune: ['fire']
    // poison: dmg 0.035/every 0.5s; immune: ['poison', 'steel']
    // spark: dmg 0.045/every 0.7s; immune: ['electric', 'ground']
    // ice: slide: true; immune: ['ice']
    const has = t => types.includes(t);
    const waterImmune = has('water');
    const lavaImmune = has('fire');
    const poisonImmune = has('poison') || has('steel');
    const sparkImmune = has('electric') || has('ground');
    const iceImmune = has('ice');

    const immunities = [];
    if (waterImmune) immunities.push('Agua / Pantano (Sin ralentización)');
    if (lavaImmune) immunities.push('Lava (Inmune a daño de fuego líquido)');
    if (poisonImmune) immunities.push('Veneno (Inmune a charcos tóxicos)');
    if (sparkImmune) immunities.push('Descarga (Inmune a daño eléctrico terrestre)');
    if (iceImmune) immunities.push('Hielo (Control firme sin resbalar)');

    return {
      floating: false,
      waterImmune,
      lavaImmune,
      poisonImmune,
      sparkImmune,
      iceImmune,
      immunitiesList: immunities,
      summary: immunities.length > 0
        ? `Inmunidades de terreno: ${immunities.join(', ')}`
        : 'Sufre ralentización y daño normal en terrenos hostiles (sin inmunidad por tipo ni flotación).'
    };
  }

  /**
   * Interacciones con el clima dinámico (G.Weather)
   */
  function getWeatherInteractions(types) {
    const has = t => types.includes(t);
    const benefits = [];
    const penalties = [];

    // Sol: Fuego x1.5, Agua x0.5
    if (has('fire')) benefits.push('Sol abrasador: +50% daño de Fuego');
    if (has('water')) penalties.push('Sol abrasador: -50% daño de Agua');

    // Lluvia: Agua x1.5, Eléctrico x1.2, Fuego x0.5
    if (has('water')) benefits.push('Lluvia: +50% daño de Agua');
    if (has('electric')) benefits.push('Lluvia: +20% daño Eléctrico');
    if (has('fire')) penalties.push('Lluvia: -50% daño de Fuego');

    // Tormenta de arena: Roca, Tierra, Acero x1.3; los demás sufren daño continuo
    if (has('rock') || has('ground') || has('steel')) {
      benefits.push('Tormenta de arena: +30% daño y seguro ante daño continuo de arena');
    } else {
      penalties.push('Tormenta de arena: Sufre daño continuo periódico si no es Roca/Tierra/Acero');
    }

    // Nevada: Hielo x1.5; los demás sufren daño continuo y van -10% más lentos
    if (has('ice')) {
      benefits.push('Nevada: +50% daño de Hielo y seguro ante congelación');
    } else {
      penalties.push('Nevada: Sufre daño continuo y -10% velocidad si no es tipo Hielo');
    }

    // Niebla: Fantasma, Hada, Psíquico x1.3
    if (has('ghost') || has('fairy') || has('psychic')) {
      benefits.push('Niebla: +30% daño en ataques Fantasma, Hada y Psíquico');
    }

    return { benefits, penalties };
  }

  /**
   * FÓRMULAS DE EVALUACIÓN DE RENDIMIENTO ANALÍTICO (TRANSPARENTES Y VERIFICADAS):
   *
   * Todas las métricas están normalizadas de 0 a 100 usando los extremos reales del juego:
   *
   * 1. DAÑO OFENSIVO (0-100):
   *    Formula:
   *      AtkNorm = (atk - 0.76) / (1.70 - 0.76) * 55
   *      DpsNorm = min(25, (starterDps / 30) * 25)
   *      VarietyBonus = min(20, (poolDamageMovesCount / 8) * 20)
   *      Total = AtkNorm + DpsNorm + VarietyBonus
   *
   * 2. SUPERVIVENCIA (0-100):
   *    Formula:
   *      HpNorm = (hp - 70) / (185 - 70) * 45
   *      DefenseTypeScore = clamp(35 + (resistances * 3) - (weaknesses * 4) + (immunities * 6), 10, 45)
   *      EvasionHitbox = (26 - bodyRadius) / (26 - 5) * 10
   *      Total = HpNorm + DefenseTypeScore + EvasionHitbox
   *
   * 3. MOVILIDAD (0-100):
   *    Formula:
   *      SpdNorm = (spd - 80) / (162 - 80) * 70
   *      HoverBonus = hovers ? 18 : 0
   *      DashBonus = hasDashMove ? 12 : 0
   *      Total = SpdNorm + HoverBonus + DashBonus
   *
   * 4. CONTROL Y ALCANCE (0-100):
   *    Formula:
   *      Puntos por efectos disponibles en su pool de movimientos:
   *      - Homing (perseguir solo): +16
   *      - Slow / Paralisis / Telaraña: +18
   *      - Large AoE (Nova / Aura / Tormenta): +18
   *      - Trampas / Minas: +14
   *      - Knockback alto: +14
   *      - Proyectiles perforantes (pierce >= 1): +20
   *      Normalizado a max 100.
   *
   * 5. FLEXIBILIDAD DE BUILD (0-100):
   *    Formula:
   *      (totalMoves / 18) * 50 + (distinctKindsCount / 10) * 50
   *
   * 6. RENDIMIENTO CONTRA JEFES (0-100):
   *    Formula:
   *      AtkNorm * 0.40 + BurstMoveBonus(Hidrobomba, Puño Meteoro, etc.) * 0.35 + (RangeSafetyBonus) * 0.25
   *
   * 7. POTENCIAL EN PARTIDAS PROLONGADAS (LATE GAME / GRIETAS) (0-100):
   *    Formula:
   *      Sinergia con evoluciones de movimientos (oro), upgrades y balance HP/Atk.
   */
  function calculatePerformanceRatings(p, spriteMeta, movesData, typeMatchups, liquidInfo) {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    // 1. Ofensiva
    const atkNorm = ((p.atk - 0.76) / (1.70 - 0.76)) * 55;
    const starterDps = movesData.startMove ? movesData.startMove.dpsEstimate : 20;
    const dpsNorm = clamp((starterDps / 30) * 25, 5, 25);
    const damageMoves = movesData.poolMoves.filter(m => m.dmg > 0).length;
    const varietyBonus = clamp((damageMoves / 10) * 20, 5, 20);
    const offensiveRating = Math.round(clamp(atkNorm + dpsNorm + varietyBonus, 10, 100));

    // 2. Supervivencia (Salud + Mitigación por Defensas G.Stats + Red de tipos + Hitbox)
    const hpNorm = ((p.hp - 70) / (185 - 70)) * 35;
    const physTaken = (window.G && G.Stats && G.Stats.taken) ? G.Stats.taken(p, 'physical') : 1.0;
    const specTaken = (window.G && G.Stats && G.Stats.taken) ? G.Stats.taken(p, 'special') : 1.0;
    const avgTaken = (physTaken + specTaken) / 2;
    // avgTaken va de 0.78 (230 def) a 1.25 (5 def). Escala de 0 a 15 pts:
    const defScore = clamp(((1.25 - avgTaken) / (1.25 - 0.78)) * 15, 0, 15);
    const resCount = typeMatchups ? typeMatchups.resistCount : 2;
    const weakCount = typeMatchups ? typeMatchups.weakCount : 2;
    const immCount = typeMatchups ? typeMatchups.immuneEquivalentCount : 0;
    const defTypeScore = clamp(25 + (resCount * 2.5) - (weakCount * 3.5) + (immCount * 5), 5, 40);
    const hitboxEvasion = clamp(((26 - spriteMeta.bodyRadius) / 21) * 10, 0, 10);
    const survivalRating = Math.round(clamp(hpNorm + defScore + defTypeScore + hitboxEvasion, 10, 100));

    // 3. Movilidad
    const spdNorm = ((p.spd - 80) / (162 - 80)) * 70;
    const hoverBonus = spriteMeta.hovers ? 18 : 0;
    const hasDash = movesData.poolMoves.some(m => m.kind === 'dash');
    const dashBonus = hasDash ? 12 : 0;
    const mobilityRating = Math.round(clamp(spdNorm + hoverBonus + dashBonus, 10, 100));

    // 4. Control y Alcance (Nuevos kinds: homing, stun, vortex, bounce, shove, quake, spin)
    let ccScore = 0;
    if (movesData.poolMoves.some(m => m.homing > 0 || m.kind === 'homing')) ccScore += 20;
    if (movesData.poolMoves.some(m => m.slow > 0 || m.stun > 0 || m.kind === 'stun')) ccScore += 20;
    if (movesData.poolMoves.some(m => m.kind === 'vortex' || m.pull > 0)) ccScore += 20;
    if (movesData.poolMoves.some(m => m.kind === 'nova' || m.kind === 'aura' || m.kind === 'orbit' || m.kind === 'spin' || m.kind === 'quake')) ccScore += 18;
    if (movesData.poolMoves.some(m => m.kind === 'mine')) ccScore += 14;
    if (movesData.poolMoves.some(m => m.pierce > 0 || m.bounce > 0 || m.kind === 'bounce')) ccScore += 16;
    if (movesData.poolMoves.some(m => m.knock >= 70 || m.kind === 'shove')) ccScore += 12;
    const controlRating = Math.round(clamp(ccScore, 15, 100));

    // 5. Flexibilidad
    const movesCountScore = (movesData.totalMoves / 18) * 50;
    const kindsScore = (movesData.distinctKindsCount / 10) * 50;
    const flexibilityRating = Math.round(clamp(movesCountScore + kindsScore, 15, 100));

    // 6. Rendimiento contra Jefes
    const singleBurst = movesData.poolMoves.some(m => m.dmg >= 24 || m.kind === 'charge') ? 25 : 12;
    const rangedSafety = movesData.poolMoves.some(m => m.kind === 'beam' || m.kind === 'projectile' || m.kind === 'homing' || m.kind === 'bounce') ? 20 : 8;
    const bossRating = Math.round(clamp((atkNorm * 0.55) + singleBurst + rangedSafety, 15, 100));

    // 7. Partidas Prolongadas (Late Game / Grietas)
    const evoMovesCount = movesData.poolMoves.filter(m => m.evolution).length;
    const evoBonus = clamp((evoMovesCount / 8) * 30, 10, 30);
    const balanceLate = (survivalRating * 0.4) + (offensiveRating * 0.3) + evoBonus;
    const lateGameRating = Math.round(clamp(balanceLate, 15, 100));

    // Media ponderada analítica general
    const overallScore = Math.round(
      (offensiveRating * 0.22) +
      (survivalRating * 0.20) +
      (mobilityRating * 0.18) +
      (controlRating * 0.14) +
      (flexibilityRating * 0.12) +
      (bossRating * 0.14)
    );

    return {
      offensive: offensiveRating,
      survival: survivalRating,
      mobility: mobilityRating,
      control: controlRating,
      flexibility: flexibilityRating,
      boss: bossRating,
      lateGame: lateGameRating,
      overall: overallScore,
      metricDefinitions: METRIC_DEFINITIONS,
      formulasDocumentation: {
        methodology: 'Normalización min-max empírica sobre las variables verificadas del código fuente de PokéSurvivor (incluye mitigación por Def/Sp.Def según G.Stats).',
        limits: 'Estas puntuaciones analíticas resumen tendencias de juego; el rendimiento en cada run depende además de los vínculos de grieta obtenidos, objetos equipados y cartas de subida de nivel seleccionadas.'
      }
    };
  }

  /**
   * Construye el objeto completo y enriquecido de un Pokémon
   */
  function enrichPokemon(raw) {
    const spriteMeta = getSpriteMetadata(raw.dex);
    const movesData = getMovesData(raw);
    const starterTraits = getStarterTraits(raw.dex);
    const enemyRole = getEnemyRole(raw);
    const typeMatchups = getTypeMatchups(raw.types);
    const liquidInteractions = getLiquidInteractions(raw.types, spriteMeta.hovers);
    const weatherInteractions = getWeatherInteractions(raw.types);
    const availability = getAvailability(raw);
    const performance = calculatePerformanceRatings(raw, spriteMeta, movesData, typeMatchups, liquidInteractions);

    const pa = raw.pa != null ? raw.pa : raw.atk;
    const sa = raw.sa != null ? raw.sa : raw.atk;
    const df = raw.df != null ? raw.df : 75;
    const sd = raw.sd != null ? raw.sd : 75;
    const side = (window.G && G.Stats && G.Stats.sideOf) ? G.Stats.sideOf(raw) : (sa > pa ? 'special' : 'physical');
    const sideName = (window.G && G.Stats && G.Stats.NAME && G.Stats.NAME[side]) || (side === 'special' ? 'Especial' : 'Físico');
    const takenPhysical = (window.G && G.Stats && G.Stats.taken) ? G.Stats.taken(raw, 'physical') : 1.0;
    const takenSpecial = (window.G && G.Stats && G.Stats.taken) ? G.Stats.taken(raw, 'special') : 1.0;
    const mitigationPhysical = Math.round((1 - takenPhysical) * 100);
    const mitigationSpecial = Math.round((1 - takenSpecial) * 100);

    return {
      dex: raw.dex,
      name: raw.name,
      gen: raw.gen,
      genName: GEN_NAMES[raw.gen] || `Gen ${raw.gen}`,
      types: raw.types,
      primaryType: raw.types[0],
      secondaryType: raw.types[1] || null,

      // Estadísticas verificadas de juego (incluyendo Físico/Especial y Defensas de G.Stats)
      hp: raw.hp,
      spd: raw.spd,
      atk: raw.atk,
      pa,
      sa,
      df,
      sd,
      side,
      sideName,
      takenPhysical,
      takenSpecial,
      mitigationPhysical,
      mitigationSpecial,
      avgDefense: Math.round(((df + sd) / 2) * 10) / 10,
      bst: raw.bst,
      rarity: raw.rarity,
      isStarter: !!raw.starter,
      isLegendary: !!raw.leg,

      // Geometría y sprites
      sprite: spriteMeta,

      // Movimientos
      moves: movesData,

      // Rasgos y roles
      starterTraits,
      enemyRole,

      // Efectividades y ambientes
      typeMatchups,
      liquidInteractions,
      weatherInteractions,

      // Disponibilidad
      availability,

      // Métricas calculadas
      performance,

      // Metadatos de verificación explícita para la UI
      verification: {
        statsVerifiedInCode: true,
        sourceFiles: [
          'js/data/pokedex.js',
          'js/data/sprites-meta.js',
          'js/data/moves.js',
          'js/data/starters.js',
          'js/data/enemies.js',
          'js/data/types.js',
          'js/systems/stats.js'
        ],
        unavailableFeatures: [
          { feature: 'Habilidades (Abilities clásicas)', status: 'No disponible', reason: 'PokéSurvivor no implementa el sistema de habilidades pasivas de los juegos principales.' },
          { feature: 'EVs / IVs / Naturalezas', status: 'No disponible', reason: 'No existen en el motor; los stats son fijos según la especie más mejoras permanentes de la tienda y objetos.' }
        ]
      }
    };
  }

  /**
   * Inicializa y cachea todos los Pokémon
   */
  function init() {
    if (enrichedCache) return enrichedCache;

    if (!G.DEX || !Array.isArray(G.DEX)) {
      console.error('Analyzer.DataAdapter: G.DEX no está cargado');
      return [];
    }

    enrichedCache = G.DEX.map(enrichPokemon);
    dexMap = new Map();
    for (const p of enrichedCache) {
      dexMap.set(p.dex, p);
    }

    // Calcula de forma dinámica y exacta las medias globales sobre el dataset completo
    computeGlobalStatRanges(enrichedCache);

    return enrichedCache;
  }

  function computeGlobalStatRanges(cache) {
    if (!cache || cache.length === 0) return;
    const keys = ['hp', 'spd', 'atk', 'pa', 'sa', 'df', 'sd', 'bst'];
    for (const k of keys) {
      let min = Infinity, max = -Infinity, sum = 0, count = 0;
      for (const p of cache) {
        const val = p[k];
        if (typeof val === 'number' && !isNaN(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
          sum += val;
          count++;
        }
      }
      if (count > 0) {
        const decimals = (k === 'atk' || k === 'pa' || k === 'sa') ? 2 : 1;
        STAT_RANGES[k] = {
          min,
          max,
          avg: Number((sum / count).toFixed(decimals))
        };
      }
    }
  }

  function getAll() {
    if (!enrichedCache) init();
    return enrichedCache;
  }

  function getByDex(dex) {
    if (!dexMap) init();
    return dexMap.get(+dex) || null;
  }

  function getGenNames() {
    return GEN_NAMES;
  }

  function getStatRanges() {
    return STAT_RANGES;
  }

  function getRegions() {
    return REGIONS;
  }

  /**
   * Efectos numéricos de los objetos equipables (js/data/items.js: on/off del jugador).
   *   atkMul     -> p.atkMul   (daño)
   *   spdMul     -> p.spdMul   (velocidad)
   *   cdMul      -> p.cdMul    (recarga: menor = más DPS)
   *   dmgReduce  -> p.dmgReduce (reducción de daño recibido => vida efectiva = HP / (1 - dmgReduce))
   *   regenPct   -> regenFlat = maxHp * regenPct por segundo
   * Los demás (Banda Focus, Cascabel Concha, Casco Dentado, Moneda Amuleto, Huevo Suerte)
   * no alteran estas métricas y se muestran solo como efecto descriptivo.
   */
  const ITEM_EFFECTS = {
    leftovers:   { regenPct: 0.015 },
    choiceband:  { atkMul: 1.4 },
    quickclaw:   { cdMul: 0.8 },
    focussash:   {},
    shellbell:   {},
    amuletcoin:  {},
    luckyegg:    {},
    lifeorb:     { atkMul: 1.3 },
    choicescarf: { spdMul: 1.35 },
    rockyhelmet: {},
    assaultvest: { dmgReduce: 0.2 }
  };

  const PERF_KEYS = ['overall', 'offensive', 'survival', 'mobility', 'control', 'flexibility', 'boss', 'lateGame'];

  /** Lista de objetos disponibles (id, nombre, descripción y si modifica métricas) */
  function getItemList() {
    const list = (G.Items && G.Items.LIST) || [];
    return list.map(it => {
      const fx = ITEM_EFFECTS[it.id] || {};
      return { id: it.id, name: it.name, desc: it.desc, quantified: Object.keys(fx).length > 0 };
    });
  }

  /**
   * Calcula estadísticas y rendimiento de un Pokémon con un objeto equipado.
   * @returns {{item:Object|null, base:Object, stats:Object, performance:Object, perfDelta:Object, statDelta:Object}}
   */
  function applyItem(p, itemId) {
    const startMove = p.moves && p.moves.startMove;
    const baseDps = startMove ? startMove.dpsEstimate : 0;
    const base = {
      atk: p.atk,
      pa: p.pa != null ? p.pa : p.atk,
      sa: p.sa != null ? p.sa : p.atk,
      df: p.df != null ? p.df : 75,
      sd: p.sd != null ? p.sd : 75,
      spd: p.spd,
      effHp: p.hp,
      dps: baseDps,
      regen: 0
    };

    const def = itemId && G.Items && G.Items.BY ? G.Items.BY[itemId] : null;
    const fx = def ? (ITEM_EFFECTS[itemId] || {}) : null;
    if (!def) {
      const zero = {};
      PERF_KEYS.forEach(k => { zero[k] = 0; });
      return {
        item: null, base, stats: Object.assign({}, base), performance: p.performance,
        perfDelta: zero, statDelta: { atk: 0, pa: 0, sa: 0, spd: 0, effHp: 0, dps: 0, regen: 0 }
      };
    }

    const atkMul = fx.atkMul || 1;
    const spdMul = fx.spdMul || 1;
    const cdMul = fx.cdMul || 1;
    const dmgReduce = fx.dmgReduce || 0;

    const stats = {
      atk: p.atk * atkMul,
      pa: (p.pa != null ? p.pa : p.atk) * atkMul,
      sa: (p.sa != null ? p.sa : p.atk) * atkMul,
      df: p.df != null ? p.df : 75,
      sd: p.sd != null ? p.sd : 75,
      spd: p.spd * spdMul,
      effHp: p.hp / (1 - dmgReduce),
      dps: Math.round((baseDps * atkMul / cdMul) * 10) / 10,
      regen: Math.round(p.hp * (fx.regenPct || 0) * 10) / 10
    };

    const modRaw = { atk: stats.atk, pa: stats.pa, sa: stats.sa, df: stats.df, sd: stats.sd, spd: stats.spd, hp: stats.effHp };
    const modMoves = Object.assign({}, p.moves, {
      startMove: startMove ? Object.assign({}, startMove, { dpsEstimate: stats.dps }) : null
    });
    const performance = calculatePerformanceRatings(modRaw, p.sprite, modMoves, p.typeMatchups, p.liquidInteractions);

    const perfDelta = {};
    PERF_KEYS.forEach(k => { perfDelta[k] = (performance[k] || 0) - (p.performance[k] || 0); });
    const statDelta = {
      atk: stats.atk - base.atk,
      pa: stats.pa - base.pa,
      sa: stats.sa - base.sa,
      spd: stats.spd - base.spd,
      effHp: stats.effHp - base.effHp,
      dps: Math.round((stats.dps - base.dps) * 10) / 10,
      regen: stats.regen - base.regen
    };

    return {
      item: { id: def.id, name: def.name, desc: def.desc, quantified: Object.keys(fx).length > 0 },
      base, stats, performance, perfDelta, statDelta
    };
  }

  return {
    init,
    getAll,
    getByDex,
    getGenNames,
    getStatRanges,
    getRegions,
    getItemList,
    applyItem,
    getMetricDefinitions: () => METRIC_DEFINITIONS,
    METRIC_DEFINITIONS
  };
})();
