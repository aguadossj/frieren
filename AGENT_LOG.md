# Agent log

Formato: `HH:MM — quién — qué se decidió / qué estrategia de agentes funcionó`

- 01:40 — Andrés + Claude — Idea cerrada: "Typing…" (la IA escribe un chat del grupo, uno contesta de verdad, el resto le imita, votación). Estilo: chat rojo `#EE2B2B` (ver `design-refs/STYLE.md`).
- 01:40 — Claude — Paso 0 del plan para 3 terminales: `SPEC.md`, contrato `app/src/game/types.ts`, `mockClient.ts` con 3 bots y temporizadores, `scoring.ts`, packs/premios de respaldo y todas las pantallas base jugables contra el mock. Verificado jugando una ronda completa en el navegador a 375×812.
- 01:25 — Mario + Claude — UI al estilo de `design-refs/mockup.png` sobre el contrato de Andrés (sin tocar `game/*`): escala grande, QR real (`qrcode`), voto en dos pasos (Lock vote), revelación roja, ranking con ▲/▼. Dos sesiones hicieron el Paso 0 a la vez → regla: `git pull --rebase` antes de empezar cualquier tarea.
