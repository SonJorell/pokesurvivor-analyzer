/* ============ game-guide.js — Módulo de Inteligencia de Partida y Eventos ============
 * PokéSurvivor Character Analyzer — Tactical Dungeon Intelligence
 *
 * Módulo especializado en la telemetría, progresión cronométrica y mecánicas ocultas
 * de la partida, obtenido y verificado 100% a partir del motor oficial:
 *   - js/systems/events.js: Eventos aleatorios (Hordas monotipo, Hora dorada, Pokémon perdido, Duendes del tesoro).
 *   - js/systems/rift.js: Grietas dimensionales, Mundo Distorsión, Vínculos (fusiones de ataques) y priorización de legendarios.
 *   - js/systems/judgment.js: El Juicio Final (minuto 30:00), invulnerabilidad de Arceus, daño verdadero,
 *     escalado exponencial de legendarios (2^n cada 5s), soft-cap de velocidad (130 SPD) y supervivencia extrema.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.GameGuide = (() => {
  'use strict';

  let currentSimMinute = 12.0;

  /**
   * Renderiza la vista completa de Inteligencia de Partida en el contenedor destino
   */
  function render(container) {
    if (!container) return;

    container.innerHTML = `
      <div class="guide-wrapper">
        <!-- Encabezado de Telemetría Táctica (PMD Box) -->
        <section class="pmd-box intro-banner guide-intro-box">
          <div class="pmd-box-title">
            <span>Inteligencia de Partida & Clímax de Arceus</span>
            <span class="gold" style="font-size:15px">Motor v0.14+ · Telemetría Oficial</span>
          </div>
          <div class="guide-tag-bar">
            <span class="guide-badge primary">TACTICAL DUNGEON INTELLIGENCE</span>
            <span class="guide-badge telemetry">REGLAS OFICIALES DE SALA</span>
            <span class="guide-badge emerald">SISTEMAS VERIFICADOS</span>
          </div>
          <h1 class="guide-title">
            Métricas de Partida: <span class="guide-highlight">Eventos, Grietas y el Juicio</span>
          </h1>
          <p class="guide-subtitle">
            Análisis matemático y operacional de la progresión de una partida estándar en PokéSurvivor.
            Comprende los intervalos de aparición, la mecánica anti-sequía de grietas, las recompensas de Vínculo
            y la fórmula de supervivencia ante la embestida cósmica en el minuto 30:00.
          </p>
        </section>

        <!-- Barra de Telemetría Rápida (HUD Metrics) -->
        <div class="guide-metrics-grid">
          <div class="guide-metric-card" style="--card-accent: var(--primary);">
            <div class="g-metric-icon">${Analyzer.Icons.get('clock', { size: 24 })}</div>
            <div class="g-metric-content">
              <span class="g-metric-val">30:00</span>
              <span class="g-metric-label">Minuto del Clímax</span>
              <span class="g-metric-sub">Descenso inevitable de Arceus</span>
            </div>
          </div>
          <div class="guide-metric-card" style="--card-accent: var(--secondary);">
            <div class="g-metric-icon">${Analyzer.Icons.get('portal', { size: 24 })}</div>
            <div class="g-metric-content">
              <span class="g-metric-val">28:00</span>
              <span class="g-metric-label">Cierre de Grietas</span>
              <span class="g-metric-sub">Última oportunidad de Vínculo</span>
            </div>
          </div>
          <div class="guide-metric-card" style="--card-accent: var(--tertiary);">
            <div class="g-metric-icon">${Analyzer.Icons.get('dice', { size: 24 })}</div>
            <div class="g-metric-content">
              <span class="g-metric-val">20% → 100%</span>
              <span class="g-metric-label">Mecánica Anti-Sequía</span>
              <span class="g-metric-sub">+20% por fallo cada 30s (máx 2.5m)</span>
            </div>
          </div>
          <div class="guide-metric-card" style="--card-accent: #ff5599;">
            <div class="g-metric-icon">${Analyzer.Icons.get('crown', { size: 24 })}</div>
            <div class="g-metric-content">
              <span class="g-metric-val">2ⁿ / 5s</span>
              <span class="g-metric-label">Escalado Legendario</span>
              <span class="g-metric-sub">Doble de vida y daño por oleada</span>
            </div>
          </div>
          <div class="guide-metric-card" style="--card-accent: #66ccff;">
            <div class="g-metric-icon">${Analyzer.Icons.get('zap', { size: 24 })}</div>
            <div class="g-metric-content">
              <span class="g-metric-val">130 SPD</span>
              <span class="g-metric-label">Freno Suave (Soft-Cap)</span>
              <span class="g-metric-sub">Exceso solo cuenta al 25%</span>
            </div>
          </div>
        </div>

        <!-- SIMULADOR Y CALCULADORA INTERACTIVA DE MINUTO (PMD Box) -->
        <section class="pmd-box simulator-panel" id="guide-simulator">
          <div class="pmd-box-title">
            <span>Simulador Táctico en Tiempo Real</span>
            <span class="gold sim-badge" id="sim-clock-badge">MINUTO 12:00</span>
          </div>
          <p class="panel-desc">
            Ajusta el cursor temporal para simular el estado del motor de juego, la probabilidad acumulada de eventos,
            la disponibilidad de grietas interdimensionales y el nivel de peligro activo.
          </p>

          <div class="sim-controls-wrap">
            <div class="sim-slider-row">
              <span class="sim-slider-label">0:00 (Inicio)</span>
              <input type="range" id="sim-time-slider" min="0" max="36" step="0.5" value="12" class="sim-range-input" />
              <span class="sim-slider-label">36:00+ (Sentencia)</span>
            </div>
          </div>

          <div class="sim-telemetry-display" id="sim-telemetry-display">
            <!-- Rellenado por updateSimulator() -->
          </div>
        </section>

        <!-- LÍNEA DE TIEMPO OPERACIONAL (PMD Box) -->
        <section class="pmd-box timeline-panel">
          <div class="pmd-box-title">
            <span>Cronograma de Batalla</span>
            <span class="gold" style="font-size:15px">5 Fases Operacionales</span>
          </div>
          <p class="panel-desc">
            Evolución de las oleadas, comportamiento de los duendes del tesoro y la transición hacia el Juicio Final.
          </p>
          <div class="timeline-phases-grid">

            <!-- Fase 1 -->
            <div class="timeline-phase-card">
              <div class="phase-stamp">00:00 — 05:00</div>
              <div class="phase-title">Fase 1: Despliegue Temprano & Primer Duende</div>
              <div class="phase-badge early">Early Game</div>
              <p class="phase-desc">
                Recolección intensiva de gemas y subida a los primeros 4 ataques. Los enemigos tienen stats base sin mutaciones.
              </p>
              <ul class="phase-bullet-list">
                <li><strong>Primer Duende del Tesoro:</strong> Aparece aleatoriamente entre el minuto <strong>2:00 y 4:00</strong> (75% Meowth con monedas, 25% Gholdengo con Ticket ×10).</li>
                <li><strong>Tiempo de Huida del Duende:</strong> Exactamente <strong>15 segundos</strong> a 92 SPD. ¡Prioriza cazarlo antes de que teletransporte!</li>
                <li><strong>Apertura Dimensional:</strong> La primera grieta puede comenzar a chequearse a partir del <strong>segundo 75 (1:15)</strong>.</li>
              </ul>
            </div>

            <!-- Fase 2 -->
            <div class="timeline-phase-card">
              <div class="phase-stamp">05:00 — 15:00</div>
              <div class="phase-title">Fase 2: Grietas Dimensionales & Eventos de Sala</div>
              <div class="phase-badge mid">Mid Game</div>
              <p class="phase-desc">
                El núcleo estratégico del juego. Comienza la rotación regular de eventos aleatorios y la caza de legendarios en el Mundo Distorsión.
              </p>
              <ul class="phase-bullet-list">
                <li><strong>Eventos Cada 4-5 Minutos:</strong> Si no hay jefes vivos ni grietas, se dispara una <em>Horda Monotipo</em>, <em>Hora Dorada</em> (+100% XP) o <em>Pokémon Perdido</em>.</li>
                <li><strong>Ritmo de Grietas:</strong> El sistema anti-sequía asegura que cada 2.5 minutos sin grieta la probabilidad llegue al <strong>100%</strong>.</li>
                <li><strong>Segundo Duende:</strong> Aparece entre 4 y 6 minutos después del primero.</li>
              </ul>
            </div>

            <!-- Fase 3 -->
            <div class="timeline-phase-card">
              <div class="phase-stamp">15:00 — 28:00</div>
              <div class="phase-title">Fase 3: Late Game & Consolidación de Vínculos</div>
              <div class="phase-badge late">Late Game</div>
              <p class="phase-desc">
                Las oleadas se vuelven masivas con enjambres pesados y élites con multiplicadores elevados de salud y daño de choque.
              </p>
              <ul class="phase-bullet-list">
                <li><strong>Objetivo Vínculo Dorado:</strong> Debes aprovechar las grietas de esta fase para fusionar dos ataques de nivel 5 en una evolución dorada.</li>
                <li><strong>Hordas Críticas:</strong> Las hordas monotipo pueden diezmar a tu escuadra si tus Pokémon sufren debilidad elemental x2 o x4.</li>
                <li><strong>Última Grieta:</strong> La comprobación de grietas finaliza inexorablemente al <strong>minuto 28:00 (1680s)</strong>.</li>
              </ul>
            </div>

            <!-- Fase 4 -->
            <div class="timeline-phase-card">
              <div class="phase-stamp">28:00 — 30:00</div>
              <div class="phase-title">Fase 4: El Silencio Pre-Sentencia</div>
              <div class="phase-badge grace">Ventana de Gracia</div>
              <p class="phase-desc">
                Transición de calma tensa. Las grietas quedan clausuradas para evitar que el jugador quede atrapado en el Mundo Distorsión al sonar la Sentencia.
              </p>
              <ul class="phase-bullet-list">
                <li><strong>Muestreo de Daño (DPS Sampling):</strong> El motor evalúa los últimos 30 segundos de combate y calcula tu daño promedio contra un solo objetivo.</li>
                <li><strong>Fórmula de Salud Inicial:</strong> La salud del primer legendario del clímax se fijará en base a tu DPS para que resista al menos 3 segundos de burst sostenido.</li>
                <li><strong>Preparación Defensiva:</strong> Asegura posiciones en áreas despejadas y optimiza cooldowns de defensa o velocidad.</li>
              </ul>
            </div>

            <!-- Fase 5 -->
            <div class="timeline-phase-card highlight-climax">
              <div class="phase-stamp">30:00 — ∞</div>
              <div class="phase-title">Fase 5: El Clímax — La Sentencia de Arceus</div>
              <div class="phase-badge climax">Sentencia Cósmica</div>
              <p class="phase-desc">
                A las 30:00 exactas, el juego normal cesa. La pantalla se oscurece, suena el doblón cósmico y eres transportado a las Ruinas del Juicio.
              </p>
              <ul class="phase-bullet-list">
                <li><strong>Arceus es Inmortal:</strong> Ningún proyectil o habilidad puede apuntarle ni dañarle.</li>
                <li><strong>Daño Verdadero Celestial:</strong> Rayos en cruz, columnas de luz y ondas que <em>ignoran totalmente armaduras, defensa y resistencias de tipo</em>.</li>
                <li><strong>Invocación Exponencial:</strong> Un legendario cada 5s con el doble de vida y daño que el anterior ($2^n$).</li>
              </ul>
            </div>

          </div>
        </section>

        <!-- DOSSIER COMPLETO DE LOS 3 SISTEMAS OFICIALES -->
        <div class="guide-systems-container">

          <!-- SISTEMA 1: EVENTOS ALEATORIOS (PMD Box) -->
          <article class="pmd-box guide-system-card" id="system-events">
            <div class="pmd-box-title">
              <span style="display:inline-flex; align-items:center; gap:8px">
                <span class="sys-icon-wrap" style="color: var(--primary); display:inline-flex; align-items:center;">
                  ${Analyzer.Icons.get('tornado', { size: 20 })}
                </span>
                Eventos Aleatorios de Sala
              </span>
              <span class="gold" style="font-size:14px">G.Events &mdash; events.js</span>
            </div>

            <div class="sys-body">
              <p class="sys-intro">
                Cada <strong>240 a 300 segundos (4 a 5 minutos)</strong>, siempre que no haya un jefe élite con vida ni una grieta abierta, el juego activa un evento global no repetido consecutivamente.
              </p>

              <div class="sys-feature-grid">
                <!-- Horda -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('swords', { size: 14 })}</span> Horda Monotipo (30s)</div>
                  <p>
                    Durante 30 segundos, el <strong>100% de los enemigos generados pertenecen a un único tipo elemental</strong> determinado por <code>G.Enemies.hordeTypes(time)</code>.
                  </p>
                  <div class="sub-box-note">
                    <strong>Ventaja Táctica:</strong> Si tienes cobertura super efectiva (ej: ataques Eléctrico/Planta contra horda de Agua), tu DPS se multiplicará x2 o x4 por afinidad elemental.
                  </div>
                </div>

                <!-- Hora Dorada -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('sparkles', { size: 14 })}</span> Hora Dorada (30s)</div>
                  <p>
                    Todos los enemigos activos y los que spawnean se transforman en versiones doradas con aura resplandeciente.
                  </p>
                  <div class="sub-box-note">
                    <strong>Recompensa:</strong> Otorgan el <strong>doble de experiencia (+100% XP)</strong> y una tasa drásticamente multiplicada de monedas doradas. Ideal para subir 2-3 niveles de golpe.
                  </div>
                </div>

                <!-- Pokémon Perdido -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('paw', { size: 14 })}</span> Pokémon Perdido (Escolta 120s)</div>
                  <p>
                    Un Pokémon extraviado de rareza &le; 3 aparece a 220-300px del jugador con una marca de destino a 700-850px. Al tocarlo, comenzará a seguirte hacia el objetivo.
                  </p>
                  <div class="event-sprite-card" style="margin-bottom: 10px;">
                    <div class="event-sprite-canvas-wrap" style="background: radial-gradient(circle, rgba(0, 229, 163, 0.2) 0%, transparent 70%);">
                      <canvas id="guide-sprite-lost" width="64" height="64"></canvas>
                    </div>
                    <div class="event-sprite-info">
                      <div class="event-sprite-name">
                        Togepi <span class="event-tag-pill rescue">Misión de Escolta</span>
                      </div>
                      <div class="event-loot-tag" style="color: #00e5a3;">
                        ${Analyzer.Icons.get('sparkles', { size: 14 })} Cura 50% HP Equipo &bull; 20% Reclutamiento Fijo
                      </div>
                      <p style="margin:2px 0 0; font-size:11.5px; color:var(--muted)">Llévalo a salvo a la marca de rescate antes de que expiren los 120s.</p>
                    </div>
                  </div>
                  <div class="sub-box-note">
                    <strong>Recompensas al Éxito:</strong> Cura el <strong>50% de la vida total del equipo</strong>, monedas, 1 Ticket garantizado, y <strong>1 de cada 5 veces (20% fijo) se une permanentemente a tu colección</strong>.
                  </div>
                </div>

                <!-- Duendes del Tesoro -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('coin', { size: 14 })}</span> Duendes del Tesoro (Ladrones de Mazmorra)</div>
                  <p>
                    Solo aparecen <strong>1 o 2 por partida</strong> (el 1º entre min 2 y 4; el 2º entre 4 y 6 min tras el primero). No atacan, huyen a 92 SPD y se desvanecen tras 15 segundos.
                  </p>
                  <div class="event-showcase-row" style="margin-bottom: 10px;">
                    <div class="event-sprite-card">
                      <div class="event-sprite-canvas-wrap">
                        <canvas id="guide-sprite-meowth" width="64" height="64"></canvas>
                      </div>
                      <div class="event-sprite-info">
                        <div class="event-sprite-name">
                          Meowth <span class="event-tag-pill common">75% Spawn</span>
                        </div>
                        <div class="event-loot-tag">
                          ${Analyzer.Icons.get('coin', { size: 14 })} Monedas de Oro Masivas
                        </div>
                        <p style="margin:2px 0 0; font-size:11.5px; color:var(--muted)">92 SPD &bull; 15s de Huida activa.</p>
                      </div>
                    </div>
                    <div class="event-sprite-card">
                      <div class="event-sprite-canvas-wrap" style="background: radial-gradient(circle, rgba(255, 210, 63, 0.25) 0%, transparent 70%);">
                        <canvas id="guide-sprite-gholdengo" width="64" height="64"></canvas>
                      </div>
                      <div class="event-sprite-info">
                        <div class="event-sprite-name">
                          Gholdengo <span class="event-tag-pill gold">25% Raro</span>
                        </div>
                        <div class="event-loot-tag">
                          ${Analyzer.Icons.get('crown', { size: 14 })} Ticket Invocación ×10
                        </div>
                        <p style="margin:2px 0 0; font-size:11.5px; color:var(--muted)">Inmune a empuje &bull; Botín premium.</p>
                      </div>
                    </div>
                  </div>
                  <div class="sub-box-note">
                    <strong>Distribución de Botín Oficial:</strong>
                    <br>&bull; <strong>75% Probabilidad:</strong> Meowth (#52) cargado con decenas de monedas de oro.
                    <br>&bull; <strong>25% Probabilidad:</strong> Gholdengo (#1000) portador de un codiciado <strong>Ticket de Invocación ×10</strong>.
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- SISTEMA 2: GRIETAS Y MUNDO DISTORSIÓN (PMD Box) -->
          <article class="pmd-box guide-system-card" id="system-rift">
            <div class="pmd-box-title">
              <span style="display:inline-flex; align-items:center; gap:8px">
                <span class="sys-icon-wrap" style="color: #b48aff; display:inline-flex; align-items:center;">
                  ${Analyzer.Icons.get('portal', { size: 20 })}
                </span>
                Grietas Dimensionales & Vínculo Dorado
              </span>
              <span class="gold" style="font-size:14px">G.Rift &mdash; rift.js</span>
            </div>

            <div class="sys-body">
              <!-- SHOWCASE HEROICO DE GRIETA DIMENSIONAL EN VIVO -->
              <div class="rift-hero-showcase">
                <div class="rift-stage-box" id="rift-stage-interactive" title="Haz clic en la grieta para sintonizar resonancia">
                  <div class="rift-stage-header">
                    <span class="rift-stage-badge">
                      <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#f2e6ff;"></span>
                      Portal Activo
                    </span>
                    <span style="color:#b48aff;">En Tiempo Real</span>
                  </div>
                  <canvas id="rift-interactive-canvas" width="240" height="200" class="rift-canvas-display"></canvas>
                  <div class="rift-stage-footer">
                    <strong>Fractura del Mundo Distorsión</strong>
                    <span class="interactive-hint">Haz clic en la grieta para emitir resonancia</span>
                  </div>
                </div>

                <div class="rift-lore-panel">
                  <div>
                    <div class="rift-lore-header">
                      <div class="rift-lore-title">
                        Fractura Dimensional &mdash; <span>Mundo Distorsión</span>
                      </div>
                    </div>
                    <p class="sys-intro" style="margin-bottom:12px;">
                      Las grietas son rasgaduras del tejido espacio-temporal generadas por la presencia de <strong>Giratina (#487)</strong> y los Titanes Legendarios. Al cruzar el umbral, los enemigos del supramundo quedan congelados en memoria (<code>EnemyMgr.stash</code>) y el escuadrón es transportado a una arena sellada de 11 tiles de radio con clima forzado.
                    </p>

                    <div class="rift-boss-card">
                      <div class="rift-boss-canvas-wrap">
                        <canvas id="guide-sprite-giratina" width="90" height="80"></canvas>
                      </div>
                      <div class="rift-boss-info">
                        <div class="rift-boss-name">
                          Giratina <span class="event-tag-pill" style="background:rgba(123,60,255,0.25); color:#d9c2ff; border:1px solid #7b3cff;">Guardián del Vacío</span>
                        </div>
                        <div class="rift-boss-desc">
                          Al derrotar al Legendario que custodia la arena en menos de <strong>120 segundos</strong>, obtienes el <strong>VÍNCULO DORADO</strong> para fusionar dos habilidades de nivel 5 en su evolución definitiva.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="rift-steps-grid">
                    <div class="rift-step-card">
                      <span class="step-num">Paso 01</span>
                      <span class="step-title">Chequeo 30s</span>
                      <span class="step-desc">Anti-sequía: 20% → 100% garantizado en 2.5 min.</span>
                    </div>
                    <div class="rift-step-card">
                      <span class="step-num">Paso 02</span>
                      <span class="step-title">Portal 45s</span>
                      <span class="step-desc">Ventana de entrada antes de que se extinga.</span>
                    </div>
                    <div class="rift-step-card">
                      <span class="step-num">Paso 03</span>
                      <span class="step-title">Arena 11t</span>
                      <span class="step-desc">Clima extremo y enemigos externos pausados.</span>
                    </div>
                    <div class="rift-step-card">
                      <span class="step-num">Paso 04</span>
                      <span class="step-title">Vínculo</span>
                      <span class="step-desc">Fusión legendaria de 2 ataques al nivel 5.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="sys-feature-grid">
                <!-- Algoritmo de Aparición -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('clock', { size: 14 })}</span> Ventana y Probabilidad Anti-Drought</div>
                  <p>
                    Se comprueban cada <strong>30 segundos</strong> a partir del segundo 75 y se cancelan al minuto 28:00.
                  </p>
                  <div class="sub-box-note">
                    <strong>Fórmula de Aparición:</strong>
                    <code>Chance = 0.20 × (1 + fallos_consecutivos)</code>
                    <br>Intento 1: 20% | Intento 2: 40% | Intento 3: 60% | Intento 4: 80% | Intento 5: <strong>100% Asegurado</strong>.
                    <br>Tiempo máximo absoluto entre grietas: <strong>2 minutos y 30 segundos</strong>.
                  </div>
                </div>

                <!-- Duración y Entrada -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('door', { size: 14 })}</span> Portal de 45s & Arena Distorsión</div>
                  <p>
                    El portal permanece abierto <strong>45 segundos</strong>. Al entrar, todo el grupo es teletransportado a una arena de <strong>11 tiles de radio</strong>.
                  </p>
                  <div class="sub-box-note">
                    <strong>Aislamiento Total:</strong> Los enemigos del supramundo quedan congelados en memoria (<code>EnemyMgr.stash</code>). La arena fuerza un clima acorde al tipo del jefe (Sol abrasador, Nieve o Lluvia).
                  </div>
                </div>

                <!-- Selección de Legendario -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('target', { size: 14 })}</span> Selección Inteligente de Legendarios</div>
                  <p>
                    El motor extrae los legendarios del juego pero aplica una ponderación proactiva:
                  </p>
                  <div class="sub-box-note">
                    <strong>Ponderación x4:</strong> Los Pokémon Legendarios que <strong>aún no has vencido</strong> tienen un peso de <strong>4 contra 1</strong> respecto a los ya derrotados, garantizando ver caras nuevas y completar la Pokédex.
                  </div>
                </div>

                <!-- Recompensa: El Vínculo -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('star', { size: 14 })}</span> Recompensa: Vínculo (Move Fusion)</div>
                  <p>
                    Tienes <strong>120 segundos</strong> para vencer al Legendario.
                  </p>
                  <div class="sub-box-note">
                    <strong>Botín al Vencer:</strong> Lluvia de monedas, tickets (50% de probabilidad de Ticket ×10) y <strong>un VÍNCULO permanente</strong> que permite fusionar dos ataques de nivel 5 en su versión dorada legendaria.
                    <br><strong>Sin Penalización Letal:</strong> Si expira el tiempo o caen todos, volvéis al mapa con vida reducida; la partida continúa.
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- SISTEMA 3: EL JUICIO DE ARCEUS (PMD Box) -->
          <article class="pmd-box guide-system-card" id="system-judgment">
            <div class="pmd-box-title">
              <span style="display:inline-flex; align-items:center; gap:8px">
                <span class="sys-icon-wrap" style="color: #ffd23f; display:inline-flex; align-items:center;">
                  ${Analyzer.Icons.get('zap', { size: 20 })}
                </span>
                El Clímax: La Sentencia de Arceus
              </span>
              <span class="gold" style="font-size:14px">G.Judgment &mdash; judgment.js</span>
            </div>

            <div class="sys-body">
              <!-- ESCENARIO DIVINO DE ARCEUS -->
              <div class="arceus-divine-stage">
                <div class="arceus-light-beam"></div>
                <div class="arceus-stage-content">
                  <div class="arceus-sprite-center">
                    <div class="arceus-canvas-wrap">
                      <canvas id="guide-sprite-arceus" width="150" height="150"></canvas>
                    </div>
                    <span style="font-family:var(--font); font-size:12px; font-weight:700; color:#ffd23f; margin-top:6px; letter-spacing:0.5px;">
                      ARCEUS &bull; DEX #493
                    </span>
                  </div>
                  <div>
                    <div class="arceus-divine-title">
                      El Juicio Celestial &mdash; <span>La Sentencia Cósmica</span>
                    </div>
                    <div class="arceus-verdict-banner">
                      Inmortalidad Absoluta &bull; Daño Verdadero (Ignora Armadura y Resistencias)
                    </div>
                    <p style="font-size:13.5px; color:#f0f5ff; line-height:1.55; margin:0 0 10px;">
                      Al minuto 30:00 exacto concluye la exploración estándar. Eres transportado a las Ruinas del Juicio (arena colosal de 24 tiles). Arceus no puede ser derrotado ni fijado por proyectiles: el único objetivo es maximizar tu tiempo de supervivencia frente a sus pilares de luz sagrada y el enjambre de titanes.
                    </p>
                    <div class="arceus-rules-grid">
                      <div class="arceus-rule-box">
                        <strong>Contacto Físico Letal</strong>
                        Tocar a Arceus drena de inmediato el <strong>40% de vida máxima</strong>. A partir del min 37:00, escala al <strong>100% (Muerte Súbita)</strong>.
                      </div>
                      <div class="arceus-rule-box">
                        <strong>Freno Suave de Velocidad (130 SPD)</strong>
                        Cualquier velocidad por encima de 130 SPD solo rinde al <strong>25%</strong>. Es matemáticamente imposible huir en círculos indefinidamente.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ENJAMBRE DE LEGENDARIOS INVOCADOS -->
              <div style="margin: 18px 0 10px;">
                <div class="sub-box-title" style="margin-bottom: 8px;">
                  <span class="sub-box-icon">${Analyzer.Icons.get('crown', { size: 16 })}</span>
                  Enjambre de Titanes Invocados (Cada 5s &bull; Escalado Exponencial 2ⁿ)
                </div>
                <p style="font-size:13px; color:var(--muted); margin:0 0 12px;">
                  Cada 5 segundos de Sentencia desciende un Pokémon Legendario a la arena con el doble de vida y daño acumulados respecto a la oleada anterior.
                </p>
                <div class="legendary-swarm-row">
                  <div class="swarm-card">
                    <div class="swarm-canvas-wrap">
                      <canvas id="guide-sprite-mewtwo" width="70" height="70"></canvas>
                    </div>
                    <span class="swarm-wave-tag">Oleada #1 &bull; 00:05</span>
                    <span class="swarm-mon-name">Mewtwo (#150)</span>
                    <span class="swarm-mult-pill green">1× Vida &bull; 1× Daño</span>
                  </div>
                  <div class="swarm-card">
                    <div class="swarm-canvas-wrap">
                      <canvas id="guide-sprite-rayquaza" width="70" height="70"></canvas>
                    </div>
                    <span class="swarm-wave-tag">Oleada #2 &bull; 00:10</span>
                    <span class="swarm-mon-name">Rayquaza (#384)</span>
                    <span class="swarm-mult-pill yellow">2× Vida &bull; 2× Daño</span>
                  </div>
                  <div class="swarm-card">
                    <div class="swarm-canvas-wrap">
                      <canvas id="guide-sprite-dialga" width="70" height="70"></canvas>
                    </div>
                    <span class="swarm-wave-tag">Oleada #4 &bull; 00:20</span>
                    <span class="swarm-mon-name">Dialga (#483)</span>
                    <span class="swarm-mult-pill red">8× Vida &bull; 8× Daño</span>
                  </div>
                  <div class="swarm-card">
                    <div class="swarm-canvas-wrap">
                      <canvas id="guide-sprite-palkia" width="70" height="70"></canvas>
                    </div>
                    <span class="swarm-wave-tag">Oleada #6 &bull; 00:30</span>
                    <span class="swarm-mon-name">Palkia (#484)</span>
                    <span class="swarm-mult-pill purple">32× Vida &bull; 32× Daño</span>
                  </div>
                </div>
              </div>

              <div class="sys-feature-grid">
                <!-- Inmortalidad y Contacto -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('shield', { size: 14 })}</span> Arceus (#493) es 100% Invencible</div>
                  <p>
                    Arceus no es una entidad enemiga estándar: los ataques dirigidos no lo fijan y no posee barra de vida. Es imposible derrotarlo.
                  </p>
                  <div class="sub-box-note">
                    <strong>Penalización por Contacto Físico:</strong> Tocar el cuerpo de Arceus drena de inmediato el <strong>40% de la vida máxima</strong> del jugador. Tras 7 minutos de Sentencia (min 37:00), el contacto escala hasta el <strong>100% (muerte súbita instantánea)</strong>.
                  </div>
                </div>

                <!-- Daño Verdadero Celestial -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('sun', { size: 14 })}</span> Daño Cósmico Verdadero</div>
                  <p>
                    Arceus canaliza pilares de luz descendente, rayos en cruz telegrafiados en el suelo y ondas expansivas doradas.
                  </p>
                  <div class="sub-box-note">
                    <strong>Ignora Defensa y Tipos:</strong> El daño de la Sentencia <em>penetra armadura, defensas planas y resistencias de tipo elemental</em>. Solo se mitiga evitando las zonas rojas telegrafiadas.
                  </div>
                </div>

                <!-- Escalado Exponencial de Legendarios -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('trendUp', { size: 14 })}</span> Escalado Exponencial de Legendarios (2ⁿ)</div>
                  <p>
                    Cada <strong>5 segundos</strong> exactos desciende un nuevo Pokémon legendario a la arena.
                  </p>
                  <div class="sub-box-note">
                    <strong>Multiplicador x2 por Oleada:</strong> Cada legendario tiene el <strong>DOBLE de vida y el DOBLE de daño</strong> que el anterior. El 4º legendario pega x8; el 8º pega <strong>x128</strong>; el 12º pega <strong>x2048</strong>.
                  </div>
                </div>

                <!-- Soft-Cap de Velocidad -->
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('stop', { size: 14 })}</span> Freno Suave de Velocidad (130 SPD)</div>
                  <p>
                    Mecánica introducida específicamente para evitar huir en círculos indefinidamente:
                  </p>
                  <div class="sub-box-note">
                    <strong>Fórmula Oficial:</strong>
                    <code>capSpd(s) = s &le; 130 ? s : 130 + (s - 130) &times; 0.25</code>
                    <br>Una build de 290 SPD se reduce efectivamente a <strong>~170 SPD</strong>.
                    <br>Los legendarios corren como mínimo al <strong>80% de tu velocidad</strong> y Arceus acelera sin límite a partir del minuto 35:00.
                  </div>
                </div>
              </div>

              <!-- Tabla de Multiplicadores Exponenciales -->
              <div class="judgment-table-wrap">
                <div class="sub-box-title" style="margin-bottom: 10px;">
                  <span class="sub-box-icon">${Analyzer.Icons.get('chart', { size: 14 })}</span> Tabla de Escalado Exponencial de Legendarios en el Juicio
                </div>
                <div class="table-responsive">
                  <table class="guide-data-table">
                    <thead>
                      <tr>
                        <th>Oleada (#)</th>
                        <th>Tiempo en Sentencia</th>
                        <th>Multiplicador de Vida</th>
                        <th>Multiplicador de Daño</th>
                        <th>Peligro Estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>#1</strong></td>
                        <td>00:05</td>
                        <td><span class="badge-tag">1× (Base DPS)</span></td>
                        <td><span class="badge-tag">1×</span></td>
                        <td><span style="color:var(--green)">Controlable</span></td>
                      </tr>
                      <tr>
                        <td><strong>#2</strong></td>
                        <td>00:10</td>
                        <td><span class="badge-tag">2×</span></td>
                        <td><span class="badge-tag">2×</span></td>
                        <td><span style="color:var(--green)">Moderado</span></td>
                      </tr>
                      <tr>
                        <td><strong>#4</strong></td>
                        <td>00:20</td>
                        <td><span class="badge-tag">8×</span></td>
                        <td><span class="badge-tag">8×</span></td>
                        <td><span style="color:var(--gold)">Crítico</span></td>
                      </tr>
                      <tr>
                        <td><strong>#6</strong></td>
                        <td>00:30</td>
                        <td><span class="badge-tag">32×</span></td>
                        <td><span class="badge-tag">32×</span></td>
                        <td><span style="color:#ff8855)">Letal</span></td>
                      </tr>
                      <tr>
                        <td><strong>#8</strong></td>
                        <td>00:40</td>
                        <td><span class="badge-tag">128×</span></td>
                        <td><span class="badge-tag">128×</span></td>
                        <td><span style="color:var(--red)">Catastrófico (1-Hit Kill)</span></td>
                      </tr>
                      <tr>
                        <td><strong>#10</strong></td>
                        <td>00:50</td>
                        <td><span class="badge-tag">512×</span></td>
                        <td><span class="badge-tag">512×</span></td>
                        <td><span style="color:#ff3399)">Terminal</span></td>
                      </tr>
                      <tr>
                        <td><strong>#12</strong></td>
                        <td>01:00</td>
                        <td><span class="badge-tag">2,048×</span></td>
                        <td><span class="badge-tag">2,048×</span></td>
                        <td><span style="color:#aa44ff)">Singularidad Cósmica</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

          <!-- CAPÍTULO 4: TIENDA KECLEON, HABILIDADES Y MÁQUINAS TÉCNICAS (ACTUALIZACIÓN 21-10) -->
          <article class="timeline-step">
            <div class="timeline-dot" style="background:#5fe08a; border-color:#ffd23f"></div>
            <div class="timeline-content">
              <div class="step-header">
                <span class="step-clock" style="background:rgba(95,224,138,0.2); color:#5fe08a; border-color:rgba(95,224,138,0.4)">
                  ${Analyzer.Icons.get('shop', { size: 14 })} TIENDA KECLEON & MOCHILA
                </span>
                <span class="step-title">Habilidades Oficiales, Naturalezas (Mentas) y Máquinas Técnicas (MT)</span>
              </div>
              <p class="step-lead">
                La gran actualización del 21-10-2026 introduce la <b>Tienda Kecleon</b> en el menú principal, donde se compran artículos permanentes para la Mochila con Pokémonedas obtenidas en tus partidas:
              </p>

              <div class="sys-feature-grid">
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('mint', { size: 14 })}</span> Mentas (1.500 monedas)</div>
                  <p>
                    Permite cambiar la <b>Naturaleza</b> de cualquier Pokémon por la que elijas. Aplica un <b>+10% a una estadística</b> (Físico, Especial, Defensas o Velocidad) y un <b>−10% a otra</b> (5 de las 25 son neutras).
                  </p>
                </div>
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('capsule', { size: 14 })}</span> Cápsulas Habilidad (1.500 / 5.000)</div>
                  <p>
                    La <b>Cápsula Habilidad</b> permuta entre las dos habilidades normales del Pokémon. La <b>Cápsula Habilidad Oculta</b> permite desbloquear la Habilidad Oculta de la especie (ratio natural 1 de cada 20).
                  </p>
                </div>
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('tm', { size: 14 })}</span> 8 MTs Rotatorias Diarias</div>
                  <p>
                    Cada día a las 00:00 (hora peninsular España) Kecleon expone <b>8 MTs idénticas para todos los jugadores</b>. Al enseñársela a un Pokémon, ese ataque se añade a sus cartas de nivel y puede elegirse como movimiento inicial.
                  </p>
                </div>
                <div class="sys-sub-box">
                  <div class="sub-box-title"><span class="sub-box-icon">${Analyzer.Icons.get('cursor', { size: 14 })}</span> Mejora Segundo Movimiento Inicial</div>
                  <p>
                    En la sección de Mejoras de la Tienda se añade <b>Segundo movimiento inicial (start2)</b> por 400 monedas: permite elegir exactamente con qué segundo ataque de Repertorio comenzarás tu partida.
                  </p>
                </div>
              </div>
            </div>
          </article>

        </div>

      </div>
    `;

    // Vincular slider del simulador
    const slider = container.querySelector('#sim-time-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        currentSimMinute = parseFloat(e.target.value);
        updateSimulator(container);
      });
      updateSimulator(container);
    }

    // Inicializar showcase visual interactivo (Grietas y Sprites)
    initVisualShowcase(container);
  }

  /**
   * Actualiza el panel interactivo del simulador según el minuto elegido
   */
  function updateSimulator(container) {
    const mins = Math.floor(currentSimMinute);
    const secs = Math.floor((currentSimMinute - mins) * 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const badge = container.querySelector('#sim-clock-badge');
    if (badge) {
      badge.textContent = `MINUTO ${timeStr}`;
      badge.classList.toggle('climax-active', currentSimMinute >= 30.0);
    }

    const display = container.querySelector('#sim-telemetry-display');
    if (!display) return;

    // Fórmulas matemáticas basadas en motor
    const isJudged = currentSimMinute >= 30.0;
    const riftsOpen = currentSimMinute >= 1.25 && currentSimMinute <= 28.0;
    const hpScale = (1 + currentSimMinute * 0.22).toFixed(2);
    const dmgScale = (1 + currentSimMinute * 0.18).toFixed(2);

    let eventStatus = 'En ventana de espera (cada 4-5 min)';
    if (currentSimMinute >= 4.0 && currentSimMinute <= 4.5) eventStatus = 'Probable Evento: Horda Monotipo o Hora Dorada';
    else if (currentSimMinute >= 8.5 && currentSimMinute <= 9.0) eventStatus = 'Probable Evento: Pokémon Perdido (Escolta)';
    else if (currentSimMinute >= 13.0 && currentSimMinute <= 13.5) eventStatus = 'Probable Evento: Hora Dorada (2x XP)';
    else if (currentSimMinute >= 18.0 && currentSimMinute <= 18.5) eventStatus = 'Probable Evento: Horda Avanzada';
    else if (isJudged) eventStatus = 'Eventos de sala cancelados por Sentencia';

    let arceusStatus = 'En letargo dimensional';
    let arceusBadgeClass = 'normal';
    if (isJudged) {
      const judgeSecs = Math.max(0, (currentSimMinute - 30.0) * 60);
      const bossCount = Math.floor(judgeSecs / 5);
      const bossMult = Math.pow(2, Math.min(16, bossCount));
      arceusStatus = `ARCEUS ACTIVO — Oleada #${bossCount} (${bossMult}× Vida/Daño)`;
      arceusBadgeClass = 'danger';
    }

    let tacticalAdvice = '';
    if (currentSimMinute < 5) {
      tacticalAdvice = 'Busca rápidamente al Duende del Tesoro (Meowth o Gholdengo). Mantén la movilidad activa y recolecta gemas para desbloquear los 4 slots de ataque.';
    } else if (currentSimMinute < 15) {
      tacticalAdvice = 'Entra en todas las grietas dimensionales disponibles. Vence al Legendario para asegurar el Vínculo que evolucionará tus ataques a nivel Dorado.';
    } else if (currentSimMinute < 28) {
      tacticalAdvice = 'Atento a las Hordas Monotipo; si coinciden con tus debilidades elementales, mantén distancia con habilidades de área. Concluye las fusiones de ataques antes del min 28.';
    } else if (currentSimMinute < 30) {
      tacticalAdvice = 'Las grietas han cerrado. Optimiza tu posicionamiento en zonas abiertas. El motor está evaluando tu DPS para calibrar al primer legendario de las Ruinas.';
    } else {
      tacticalAdvice = '¡PELIGRO EXTREMO! Esquiva a toda costa el cuerpo de Arceus (quita 40%+ de HP al contacto). No intentes matarlo: es invulnerable. Concéntrate en evadir los pilares de luz verdadera.';
    }

    display.innerHTML = `
      <div class="sim-grid-metrics">
        <div class="sim-stat-card">
          <span class="sim-stat-label">Multiplicador HP Enemigos</span>
          <span class="sim-stat-val">${hpScale}×</span>
          <span class="sim-stat-sub">Escala estándar del mapa</span>
        </div>
        <div class="sim-stat-card">
          <span class="sim-stat-label">Multiplicador Daño Hostil</span>
          <span class="sim-stat-val">${dmgScale}×</span>
          <span class="sim-stat-sub">Proyectiles y colisión</span>
        </div>
        <div class="sim-stat-card">
          <span class="sim-stat-label">Estado de Grietas</span>
          <span class="sim-stat-val ${riftsOpen ? 'val-green' : 'val-red'}">
            ${riftsOpen ? 'ABIERTA / DISPONIBLE' : (currentSimMinute > 28 ? 'CLAUSURADAS (28m+)' : 'EN ESPERA (1:15m)')}
          </span>
          <span class="sim-stat-sub">${riftsOpen ? 'Comprobación cada 30s (Anti-Drought)' : 'No se abrirán más portales'}</span>
        </div>
        <div class="sim-stat-card">
          <span class="sim-stat-label">Estado de Arceus</span>
          <span class="sim-stat-val ${isJudged ? 'val-red' : 'val-dim'}">${arceusStatus}</span>
          <span class="sim-stat-sub">${isJudged ? 'Ruinas del Juicio (Radio 24t)' : 'Descenso programado al minuto 30:00'}</span>
        </div>
      </div>

      <div class="sim-event-ticker">
        <div class="ticker-col">
          <strong>Evento de Sala Actual:</strong> <span>${eventStatus}</span>
        </div>
        <div class="ticker-col">
          <strong>Directiva Táctica:</strong> <span>${tacticalAdvice}</span>
        </div>
      </div>
    `;
  }

  /**
   * Inicializa la animación interactiva de la grieta dimensional y registra
   * todos los sprites canvas (Giratina, Arceus, Duendes, Togepi, Titanes).
   */
  function initVisualShowcase(container) {
    // 1. Grieta Dimensional Interactiva (Procedural 60fps con partículas y ondas)
    const riftCanvas = container.querySelector('#rift-interactive-canvas');
    const riftStageBox = container.querySelector('#rift-stage-interactive');
    if (riftCanvas) {
      setupRiftCanvas(riftCanvas, riftStageBox);
    }

    // 2. Registro de Sprites Canvas con el motor oficial
    if (window.Analyzer && Analyzer.App && Analyzer.App.registerCanvasSprite) {
      const reg = (id, dex, opt) => {
        const cv = container.querySelector(id);
        if (cv) Analyzer.App.registerCanvasSprite(cv, dex, opt);
      };

      // Giratina en el dossier de Grietas (#487)
      reg('#guide-sprite-giratina', 487, { scale: 2.0, anim: 'Idle' });

      // Duendes del Tesoro (Meowth #52 y Gholdengo #1000)
      reg('#guide-sprite-meowth', 52, { scale: 1.8, anim: 'Idle' });
      reg('#guide-sprite-gholdengo', 1000, { scale: 1.8, anim: 'Idle' });

      // Pokémon Perdido (Togepi #175)
      reg('#guide-sprite-lost', 175, { scale: 1.8, anim: 'Idle' });

      // Arceus en el Juicio Final (#493)
      reg('#guide-sprite-arceus', 493, { scale: 2.5, anim: 'Idle' });

      // Enjambre Legendario del Clímax
      reg('#guide-sprite-mewtwo', 150, { scale: 1.6, anim: 'Idle' });
      reg('#guide-sprite-rayquaza', 384, { scale: 1.6, anim: 'Idle' });
      reg('#guide-sprite-dialga', 483, { scale: 1.6, anim: 'Idle' });
      reg('#guide-sprite-palkia', 484, { scale: 1.6, anim: 'Idle' });
    }
  }

  /**
   * Genera proceduralmente los 4 fotogramas de la grieta oficial (30x46)
   * y ejecuta un bucle a 60fps con sombras dinámicas, chispas cósmicas
   * y ondas de choque interactivas.
   */
  function setupRiftCanvas(canvas, triggerElement) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Generar los 4 fotogramas de pixel art exactos del motor (tiles.js)
    const riftFrames = [];
    const glow = '#7b3cff', mid = '#b48aff', core = '#140a26', white = '#f2e6ff';

    function packHex(hex) {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
    const cGlow = packHex(glow), cMid = packHex(mid), cCore = packHex(core), cWhite = packHex(white);

    const hash = (x, y, s) => {
      if (window.G && window.G.U && window.G.U.hash) return window.G.U.hash(x, y, s);
      let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };

    for (let variant = 0; variant < 4; variant++) {
      const fcv = document.createElement('canvas');
      fcv.width = 30; fcv.height = 46;
      const fctx = fcv.getContext('2d');
      const img = fctx.createImageData(30, 46);
      const buf = new Uint32Array(img.data.buffer);

      for (let y = 2; y < 44; y++) {
        const t = (y - 2) / 42;
        const w = Math.sin(t * Math.PI) * 9 + 1;
        const off = Math.round(Math.sin(t * 9 + variant * 1.6) * 2.2 + (hash(y, variant, 91) - 0.5) * 2);
        for (let x = -Math.ceil(w) - 2; x <= Math.ceil(w) + 2; x++) {
          const ax = Math.abs(x) / w;
          const px = 15 + x + off;
          if (px >= 0 && px < 30) {
            if (ax <= 0.45) buf[y * 30 + px] = cCore;
            else if (ax <= 0.75) buf[y * 30 + px] = hash(px, y, 92 + variant) < 0.15 ? cWhite : cMid;
            else if (ax <= 1.15 || hash(px, y, 93 + variant) < 0.3) buf[y * 30 + px] = cGlow;
          }
        }
      }
      for (let i = 0; i < 6; i++) {
        const px = 13 + Math.floor(hash(i, variant, 94) * 5);
        const py = 8 + Math.floor(hash(i, variant, 95) * 30);
        if (px >= 0 && px < 30 && py >= 0 && py < 46) {
          buf[py * 30 + px] = cWhite;
        }
      }
      fctx.putImageData(img, 0, 0);
      riftFrames.push(fcv);
    }

    // Partículas cósmicas y anillos de distorsión
    const particles = [];
    const rings = [];
    let clickFlash = 0;

    function addSparks(count = 5, extraSpeed = 0) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: W / 2 + (Math.random() - 0.5) * 60,
          y: H / 2 + 30 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * (20 + extraSpeed),
          vy: -(30 + Math.random() * 50 + extraSpeed * 1.5),
          size: Math.random() < 0.3 ? 3 : 2,
          color: Math.random() < 0.5 ? '#d9c2ff' : '#f2e6ff',
          life: 0.8 + Math.random() * 0.7,
          maxLife: 1.5
        });
      }
    }

    function addRing() {
      rings.push({
        r: 10,
        maxR: 90,
        alpha: 0.8
      });
    }

    if (triggerElement) {
      triggerElement.addEventListener('click', () => {
        clickFlash = 1.0;
        addSparks(25, 40);
        addRing();
        if (window.Analyzer && Analyzer.App && Analyzer.App.playSfx) {
          Analyzer.App.playSfx('select');
        }
      });
    }

    let lastT = performance.now();
    let ringTimer = 0;
    let sparkTimer = 0;

    function animLoop(now) {
      if (!canvas.isConnected) return; // Se detiene automáticamente al cambiar de vista

      const dt = Math.min((now - lastT) / 1000, 0.08);
      lastT = now;
      const t = now / 1000;

      // Generar chispas y ondas de forma periódica
      sparkTimer += dt;
      if (sparkTimer > 0.08) {
        sparkTimer = 0;
        addSparks(2);
      }

      ringTimer += dt;
      if (ringTimer > 1.8) {
        ringTimer = 0;
        addRing();
      }

      // Limpiar lienzo
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;

      const cx = W / 2;
      const cy = H / 2;

      // 1. Sombra / Aura elíptica en el suelo (#7b3cff)
      const shadowPulse = Math.sin(t * 3.5) * 0.08 + 0.32;
      ctx.save();
      ctx.globalAlpha = shadowPulse;
      ctx.fillStyle = '#7b3cff';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 42, 60 + Math.sin(t * 2) * 6, 18 + Math.cos(t * 2) * 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Destello central
      const glowGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 75);
      glowGrad.addColorStop(0, 'rgba(180, 138, 255, 0.45)');
      glowGrad.addColorStop(0.5, 'rgba(123, 60, 255, 0.2)');
      glowGrad.addColorStop(1, 'rgba(123, 60, 255, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Anillos de choque dimensionales
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += dt * 45;
        const progress = ring.r / ring.maxR;
        if (progress >= 1) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = (1 - progress) * 0.6;
        ctx.strokeStyle = '#b48aff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 40, ring.r, ring.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Dibujar fotograma de la grieta escalado (3.6x: ~108 x 165 px)
      const frameIdx = Math.floor(t * 8) % 4;
      const frame = riftFrames[frameIdx];
      const scale = 3.6;
      const fw = 30 * scale;
      const fh = 46 * scale;
      ctx.save();
      if (clickFlash > 0) {
        ctx.filter = `brightness(${1 + clickFlash * 0.8})`;
        clickFlash = Math.max(0, clickFlash - dt * 2.5);
      }
      ctx.drawImage(frame, Math.round(cx - fw / 2), Math.round(cy - fh / 2 + 8), fw, fh);
      ctx.restore();

      // 4. Actualizar y dibujar partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1.0;

      requestAnimationFrame(animLoop);
    }

    requestAnimationFrame(animLoop);
  }

  return {
    render
  };
})();
