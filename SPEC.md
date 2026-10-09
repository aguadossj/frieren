URL: https://app-azure-sigma-64.vercel.app

# Typing… — your friends fake your replies. Spot the real one.
Track: **Game** · Party game para grupos, en el navegador del móvil.

## La demo de 60 segundos (guion exacto)
1. Uno abre la URL → "Create room" con su nombre → aparece un QR y el código de 4 letras.
2. Los demás escanean el QR → ponen su nombre → "Join room". El host pulsa "Start game".
3. Sale un chat de grupo protagonizado por ellos ("who ate my yogurt 😤 … Pol??") y "Pol is typing…".
4. Pol escribe lo que diría de verdad; los demás escriben lo que creen que diría Pol (25 s).
5. Todas las respuestas aparecen como burbujas de Pol → cada uno toca la que cree real (15 s). 😂 a la más graciosa.
6. Revelación: "The real Pol said…", "Fooled 2! 🎭", puntos y premio del presentador → ranking → siguiente ronda.
Un desconocido entiende la regla en la ronda 1 sin leer nada.

## Core loop (una frase)
La IA escribe un chat de tu grupo, a uno le toca contestar de verdad y los demás le imitan; votad cuál es la real.

## Pantallas
Home (crear / unirse) · Lobby (QR, jugadores, pack) · Writing · Voting · Reveal · Leaderboard · Final.
La fase de la sala decide la pantalla (`app/src/App.tsx`). Estilo: `design-refs/STYLE.md` (rojo `#EE2B2B`, blanco, negro).

## Reglas (fuente de verdad: `app/src/game/types.ts` y `app/src/game/scoring.ts`)
- 3–8 jugadores. Rondas = nº de jugadores (máx. 5); cada uno es el "writer" una vez.
- Fases: `lobby` → `writing` 25 s → `voting` 15 s → `reveal` 8 s → `leaderboard` 4 s → siguiente ronda … → `final`.
  Se avanza antes si todos han enviado / votado.
- Respuesta ≤ 80 caracteres. Si se acaba el tiempo sin enviar → "…".
- Votación: real + hasta 4 impostores al azar (máx. 5), barajadas, todas con el avatar del writer.
  El writer no vota; nadie vota la suya. 😂 opcional a cualquiera.
- Puntos: acertar la real **+200** · writer **+100** por cada amigo que le acierta · impostor **+150** por voto engañado · **+50** por 😂 recibido.
- Premio del presentador: plantillas en `app/src/content/awards.ts`; IA si hay clave.

## Fuera de alcance (no se construye)
Cuentas/login · subir capturas · bots o modo individual · chat libre entre jugadores · pagos/candados en packs ·
idiomas que no sean inglés · historial de partidas · pantalla grande tipo TV (todo va en los móviles).

## Arquitectura
- **Front:** Vite + React 19 + TS + Tailwind v4 en `app/`. La UI solo usa `useGame()` (`app/src/game/useGame.ts`),
  que expone un `GameClient` (contrato en `types.ts`). Hoy: `mockClient.ts` (memoria + 3 bots). Mañana: `supabaseClient.ts`.
- **Tiempo real:** Supabase, **proyecto nuevo dedicado**.
  - Tablas `rooms`, `players`, `answers`, `votes`, `reactions`. RLS activado, **solo `select`** por sala; **ninguna escritura directa**.
  - Todas las escrituras por RPC `security definer`: `create_room`, `join_room`, `set_options`, `start_game`,
    `submit_answer`, `cast_vote`, `react`, `advance_phase`.
  - `advance_phase(room)` es idempotente y **la llama cualquier cliente** cuando vence `phase_ends_at` o todos han enviado.
    Calcula la puntuación como `scoring.ts`. El juego no se para si el host bloquea el móvil.
  - Clientes suscritos por Realtime a su sala. `client_id` en `localStorage` para reconectar tras recargar.
  - Límites en la base: nombre ≤ 16, respuesta ≤ 80, máx. 8 jugadores, código de 4 letras sin I/O.
  - Las respuestas no se exponen con autor hasta la fase `reveal`.
- **IA (mejora, no bloqueante):** `app/api/generate-chats.ts` (función de Vercel, Anthropic, timeout 6 s) recibe
  nombres + pack + tipo de grupo y devuelve N chats en JSON. Si no hay `ANTHROPIC_API_KEY`, falla o tarda →
  `app/src/content/packs.ts`. Los chats se generan todos al empezar la partida.

## Riesgos y plan B
| Riesgo | Plan B |
|---|---|
| Supabase/Realtime da guerra | El mock ya juega solo; para la demo se puede jugar en modo mock con bots en un móvil |
| No conseguimos clave de IA | Packs precargados (≥ 30 chats). El juego no depende de la IA |
| iPhone se desconecta al bloquear | `client_id` en `localStorage` + estado en servidor → al volver, sigue en la sala |
| 60 personas a la vez | Todo por RPC con límites; sin LLM en el camino crítico de cada ronda |
| Contenido ofensivo con nombres reales | Prompt: picante de situación, nunca contra una persona; filtro de palabras en respuestas |

## Dueños (3 portátiles, cada uno con Claude Code; nadie toca lo de otro sin avisar)
| Terminal | Área | Ficheros |
|---|---|---|
| **T1 — Backend** | Supabase, RPCs, Realtime, reconexión | `supabase/**`, `app/src/lib/supabase.ts`, `app/src/game/supabaseClient.ts`, `app/src/game/useGame.ts`, `app/src/game/types.ts` (contrato: avisar antes de cambiar) |
| **T2 — UI** | Pantallas, componentes, animaciones | `app/src/screens/**`, `app/src/components/**`, `app/src/App.tsx`, `app/src/index.css` |
| **T3 — Contenido, IA, QA, deploy** | Packs, premios, IA, QR, sonidos, deploy, QA | `app/src/content/**`, `app/api/**`, `app/public/sfx/**`, QR en Lobby (avisar a T2), `AGENT_LOG.md`, `SETUP.md` |

`app/src/game/scoring.ts` y `mockClient.ts`: T1 (la UI no los toca). Solo T3 despliega (`/ship`, cuenta Vercel `ferrer-labs`).
Git: commits pequeños a `main`, `git pull --rebase` antes de cada push, `npm run build` antes de cada commit.

### Primeros 30 minutos de cada terminal (08:00)
- **T1:** crear proyecto Supabase (región EU) → `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` →
  cargar skills `supabase` y `supabase-postgres-best-practices` → migración con tablas + RLS + `create_room`/`join_room`.
- **T2:** `cd app && npm install && npm run dev`, jugar una partida con el mock, y pulir pantalla a pantalla siguiendo `STYLE.md`
  (animaciones de burbujas, revelación con "typing" → pop, ranking que se reordena).
- **T3:** QR real en Lobby (`npm i qrcode`), ampliar `packs.ts` a ≥ 30 chats (8+ por pack), conseguir clave de Anthropic
  y `npx vercel env add ANTHROPIC_API_KEY`, deploy del estado actual.

## Hitos (sábado 10 oct)
- **08:30** — Supabase creado y env vars puestas; deploy rojo con el mock funcionando en la URL.
- **10:30** — T1: RPCs + Realtime probados en SQL · T2: todas las pantallas pulidas contra el mock · T3: packs + QR + sonidos.
- **11:30** — UI conectada a Supabase: 3 móviles juegan una partida completa con packs.
- **12:00 — FEATURE FREEZE.** IA conectada con fallback si hay clave; si no, packs y listo.
- **12:00–15:00** — Pulido (`polish`), final compartible, 5 desconocidos lo prueban, arreglos.
- **15:00** — Solo bugs. `/ship` final, QR impreso, `/setup-report`. **15:45** congelado. **16:00** code freeze.

## Definition of done
- [ ] 3 móviles reales (al menos un iPhone) juegan 3 rondas seguidas sin errores.
- [ ] Recargar o bloquear un móvil a mitad de ronda → vuelve a su sala y la partida sigue.
- [ ] Ningún texto "TODO", botón muerto ni pantalla en blanco.
- [ ] Sin clave de IA el juego funciona igual (packs).
- [ ] Con la anon key no se puede escribir directamente en ninguna tabla.
- [ ] La URL de producción devuelve 200 sin login de Vercel; QR impreso apunta a ella.
- [ ] `SETUP.md` publicado con modelos, herramientas y tokens de los 3.
