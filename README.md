# ⚔️ PokéSurvivor Character Analyzer

Herramienta analítica independiente y compendio visual de personajes para **PokéSurvivor**, con estética clásica de **Pokémon Mundo Misterioso**.

---

## 🌟 Características

- **966 Pokémon Verificados:** Estadísticas de salud, ataque, velocidad y BST extraídas directamente del motor de combate.
- **Gráficos de Radar y Métricas Analíticas:** Daño ofensivo, supervivencia, movilidad, control y rendimiento vs jefes.
- **Comparador Táctico Multificha:** Contrasta de 2 a 4 personajes simultáneamente con tabla de efectividades elementales suavizadas.
- **Visualizador de Animaciones PMD en Canvas:** Reproducción en tiempo real de 8 direcciones y variantes Shiny.
- **Filtros por Región y Rol Salvaje:** Kanto a Paldea, starters, legendarios, embestidores, tanques y atacantes a distancia.
- **Sistema de Carga Híbrido:** Funciona en local con sprites del disco y dispone de fallback automático al CDN oficial en la nube si se despliega como paquete ultraligero (< 2 MB).

---

## 🚀 Despliegue en Vercel (En 2 Pasos)

### Opción A: Despliegue Directo vía GitHub
1. Sube el contenido de esta carpeta `analyzer/` a un nuevo repositorio en tu cuenta de GitHub (ej: `pokesurvivor-analyzer`).
2. Entra en [Vercel](https://vercel.com) y pulsa **"Add New Project"**.
3. Importa tu repositorio `pokesurvivor-analyzer`.
4. Deja la configuración por defecto (Framework Preset: **Other**) y haz clic en **Deploy**.
5. ¡Listo! Vercel te dará una URL tipo `https://pokesurvivor-analyzer.vercel.app` completamente operativa.

### Opción B: Despliegue con Vercel CLI
Desde una terminal en esta carpeta:
```bash
npx vercel
```

---

## 💻 Ejecución Local

Para probarlo en tu máquina:
```bash
# Con Node.js:
npx serve .

# O con Python:
python -m http.server 3000
```
Luego abre `http://localhost:3000` en tu navegador.

---

## 📄 Créditos y Licencia
- Datos y sprites derivados del proyecto de código abierto PokéSurvivor.
- Sprites de Pokémon Mundo Misterioso cortesía de la comunidad SpriteCollab.
- Pokémon es una marca registrada de Nintendo / Game Freak / The Pokémon Company.
