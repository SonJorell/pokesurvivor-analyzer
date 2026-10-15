/* ============ dungeon-bg.js — Fondo Animado Ecosistema Mundo Misterioso ============
 * PokéSurvivor Character Analyzer
 *
 * Crea una atmósfera envolvente y viva con orbes de energía elemental,
 * estelas místicas y partículas flotantes características de las Mazmorras Misteriosas.
 */

window.Analyzer = window.Analyzer || {};

Analyzer.DungeonBg = (() => {
  'use strict';

  let canvas = null;
  let ctx = null;
  let animId = null;
  let width = 0;
  let height = 0;
  let isRunning = false;

  const PARTICLE_COUNT = 55;
  const particles = [];
  const mouse = { x: -1000, y: -1000, radius: 130 };

  const DARK_COLORS = [
    { r: 255, g: 210, b: 63 },   // Oro Místico / Rayo
    { r: 76,  g: 201, b: 240 },  // Zafiro Helado / Agua
    { r: 168, g: 85,  b: 247 },  // Distorsión Púrpura / Psíquico
    { r: 95,  g: 224, b: 138 },  // Energía Vital / Planta
    { r: 255, g: 95,  b: 109 }   // Ascuas Carmesí / Fuego
  ];

  const LIGHT_COLORS = [
    { r: 190, g: 130, b: 10 },   // Ámbar Solar
    { r: 35,  g: 110, b: 215 },  // Azul Zafiro Profundo
    { r: 140, g: 50,  b: 210 },  // Púrpura Celestial
    { r: 25,  g: 150, b: 75 },   // Verde Esmeralda
    { r: 220, g: 55,  b: 70 }    // Rubí Carmesí
  ];

  let activeColors = DARK_COLORS;

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.8 + 1.2;
      this.baseAlpha = Math.random() * 0.45 + 0.25;
      this.alpha = this.baseAlpha;
      this.color = activeColors[Math.floor(Math.random() * activeColors.length)];
      this.speedY = -(Math.random() * 0.5 + 0.25);
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.swayAngle = Math.random() * Math.PI * 2;
      this.swaySpeed = Math.random() * 0.02 + 0.01;
      this.pulseAngle = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.03 + 0.015;
    }

    update() {
      this.y += this.speedY;
      this.swayAngle += this.swaySpeed;
      this.x += Math.sin(this.swayAngle) * 0.5 + this.speedX;

      this.pulseAngle += this.pulseSpeed;
      this.alpha = this.baseAlpha + Math.sin(this.pulseAngle) * 0.15;

      // Interacción suave con cursor
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouse.radius && dist > 0) {
        const force = (mouse.radius - dist) / mouse.radius;
        this.x -= (dx / dist) * force * 2.2;
        this.y -= (dy / dist) * force * 2.2;
      }

      // Reiniciar al salir por arriba o laterales
      if (this.y < -20 || this.x < -30 || this.x > width + 30) {
        this.reset(false);
      }
    }

    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${Math.max(0.05, this.alpha)})`;
      ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
      ctx.shadowBlur = this.size * 3.5;
      ctx.fill();
      ctx.restore();
    }
  }

  function resize() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function drawConnections() {
    const maxDist = 100;
    const maxDistSq = maxDist * maxDist;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / maxDist) * 0.15;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(185, 203, 240, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    if (!isRunning) return;

    ctx.clearRect(0, 0, width, height);
    drawConnections();

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }

    animId = requestAnimationFrame(loop);
  }

  function init(canvasId = 'dungeon-bg-canvas') {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resize();

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('mouseleave', () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    start();

    // Pausar si la pestaña del navegador está oculta
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    isRunning = false;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function setTheme(theme) {
    activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
    particles.forEach(p => {
      p.color = activeColors[Math.floor(Math.random() * activeColors.length)];
    });
  }

  return {
    init,
    start,
    stop,
    setTheme
  };
})();
