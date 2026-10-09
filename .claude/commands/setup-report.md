---
description: Genera SETUP.md con modelos, herramientas, prompting y tokens consumidos
---

Al final hay que publicar el setup del equipo: modelos, herramientas, enfoque de prompting y tokens totales.
Genera `SETUP.md`:

1. Tokens y coste de esta máquina: `npx -y ccusage@latest daily --since 20261009 --json` (y la versión de tabla
   para leerla). Suma input, output, cache read/write y coste. Desglosa por modelo.
   Recuerda al usuario que **cada miembro del equipo** debe ejecutar `/setup-report` (o el comando ccusage)
   en su portátil y pegar sus totales; deja una tabla por persona con huecos para rellenar.
   Si alguien usó otras herramientas (Cursor, ChatGPT, Codex, generación de imágenes/audio), deja filas para ello.
2. Prompts: lee `.hackathon/prompts.jsonl` (registro automático de cada prompt) y cuenta prompts por sesión
   y en total. Cita 3–5 prompts que mejor muestren cómo exprimimos a los agentes.
3. Lee `AGENT_LOG.md`, `CLAUDE.md`, `.claude/commands/` y `.claude/agents/` y resume la estrategia:
   - Sesiones en paralelo, worktrees, subagentes (idea-critic ×3, mobile-qa, polish), comandos
   - Qué funcionó, qué no, qué haríamos distinto
4. Estructura de `SETUP.md`:
   `Producto + URL` · `Equipo` · `Modelos` · `Herramientas` · `Enfoque de prompting y orquestación` ·
   `Tokens y coste (tabla por persona + total)` · `Timeline real (de AGENT_LOG)` · `Lecciones`.
Claro, honesto y con números. Nada de marketing.
