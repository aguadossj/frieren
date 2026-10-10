URL de la demo: **https://frieren-bfq.pages.dev** (Cloudflare Pages, deploy automático en cada push a `main`; ver `DEPLOY.md`).
La antigua `app-azure-sigma-64.vercel.app` (equipo `ferrer-labs`) queda **retirada**: no se despliega ahí ni se imprime en el QR.

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
La fase de la sala decide la pantalla (`app/src/App.tsx`). Estilo: **`design-refs/mockup.png` manda**, detalles en
`design-refs/STYLE.md` (rojo `#EE2B2B` en todas las pantallas, también la revelación; blanco; negro de acento).
Votación en dos pasos: tocar burbuja → **Lock vote**. Final = Leaderboard con `final` + Share.

## Reglas (fuente de verdad: `app/src/game/types.ts` y `app/src/game/scoring.ts`)
- 3–8 jugadores. Rondas = nº de jugadores (máx. 5); cada uno es el "writer" una vez.
- Fases: `lobby` → `writing` 25 s → `voting` 15 s → `reveal` 8 s → `leaderboard` 4 s → siguiente ronda … → `final`.
  Se avanza antes si todos han enviado / votado.
- Respuesta ≤ 80 caracteres. Si se acaba el tiempo sin enviar → "…".
- Votación: real + hasta 4 impostores al azar (máx. 5), barajadas, todas con el avatar del writer.
  El writer no vota; nadie vota la suya. 😂 opcional a cualquiera.
- Puntos (estilo Kahoot): solo puntúa **acertar la real**, de **+200** (votas al instante) a **+100** (último segundo), de 10 en 10. Fallar = 0. Votar al bot Mimic = **−100** (la puntuación puede ser negativa). Engañar, ser reconocido y los 😂 no dan puntos. SQL: `game.speed_points` (migración `speed_scoring`).
- Premio del presentador: plantillas en `app/src/content/awards.ts`; IA si hay clave.

## Fuera de alcance (no se construye)
Cuentas/login · subir capturas · bots o modo individual · chat libre entre jugadores · pagos/candados en packs ·
idiomas que no sean inglés · historial de partidas · pantalla grande tipo TV (todo va en los móviles).

## Arquitectura
- **Front:** Vite + React 19 + TS + Tailwind v4 en `app/`. La UI solo usa `useGame()` (`app/src/game/useGame.ts`),
  que expone un `GameClient` (contrato en `types.ts`). Hoy: `mockClient.ts` (memoria + 3 bots). Mañana: `supabaseClient.ts`.
- **Backend:** Supabase, **proyecto dedicado `frieren`** (ref `xociawfbjmccevhjcfiu`, ya en `.mcp.json`). Nunca usar otro proyecto.
  Migraciones versionadas en `supabase/migrations/` (aplicadas con el MCP). Detalle completo en esos ficheros.
  - **Identidad:** Supabase **Anonymous Sign-In** (sin cuenta). Sesión en `sessionStorage` (muere al cerrar la pestaña,
    sobrevive a recargar). Perfil: nombre ≤ 16 + emoji; `profiles.metadata` jsonb para avatar/foto/edad futuros.
  - **Esquema privado `game`** (no expuesto por la Data API, RLS activado sin políticas): `profiles`, `rooms`,
    `room_players`, `setup_questions` (catálogo editable sin desplegar), `events` (métricas), `rounds`, `answers`,
    `votes`, `reactions`, `round_scores`, `ai_generations`, `fallback_chats` (13 de respaldo, por tema), `config`.
  - **API = RPC en `public`** (security definer, `search_path` vacío, solo rol `authenticated`, cada una comprueba
    `auth.uid()` y permisos). Hechas: `create_room`, `join_room`, `leave_room`, `kick_player`, `transfer_host`,
    `save_setup`, `update_settings`, `get_setup_questions`, `get_my_active_room`, `get_room_state`, `start_game`,
    `submit_answer`, `cast_vote`, `react`, `advance_phase`, `skip_phase` (host), `end_game` (host).
  - **Motor de fases** (`game.advance`): generating → writing → voting → reveal → leaderboard → siguiente | final.
    Avanza cuando vence el tiempo o todos han terminado; lo llama cualquier jugador y, como red de seguridad,
    **pg_cron cada 5 s** (también cierra salas con 3 h sin actividad). Puntuación idéntica a `scoring.ts`.
  - **`get_room_state` devuelve el contrato `Room` de `types.ts` en camelCase** (+ `meId`, `serverNow`, `setup`,
    `settings`, `emoji`): papeleta anónima en `voting`, resultados solo desde `reveal`.
  - Mientras `game.config.ai_enabled = false`, cada ronda usa una conversación de respaldo (sin repetir, por temas;
    sin picante si la edad es `under_18`/`mixed`).
  - **`get_room_state(room_id)`** devuelve solo lo que ese jugador puede ver (las autorías no salen hasta `reveal`).
  - **Tiempo real:** cada cambio sube `rooms.version`; un trigger hace `realtime.send` al canal **privado** `room:<id>`
    (solo jugadores activos pueden escucharlo). El cliente, al recibirlo, vuelve a pedir `get_room_state`.
  - **Reglas de sala:** entrar solo en lobby (`game_in_progress` si ya empezó); echado = no puede volver; si el host se va,
    pasa al jugador activo más antiguo; sala vacía = cerrada; códigos de 4 letras (sin I/O) únicos entre salas activas.
  - **Configuración y contexto:** el host cambia `settings` (tiempos, rondas, máx. jugadores) y el contexto (`setup`:
    who, age, vibes, topic libre ≤ 120) en el lobby y durante la partida; aplica desde la siguiente ronda.
    Rondas por defecto = una por jugador.
  - **Métricas:** `game.events` (room_created, player_joined, player_kicked, setup_saved, host_transferred…) escritas por
    las RPC; duración de partida con `rooms.started_at/ended_at`.
- **Cliente:** `app/src/game/supabaseClient.ts` cumple `GameClient` (sesión anónima al crear/unirse, canal privado
  `room:<id>`, refresco cada 5 s y al volver a la pestaña, `advance_phase` al vencer el reloj, reloj corregido con
  `serverNow`). `useGame.ts` usa Supabase si hay env vars; si no, o con **`?mock=1`** en la URL, el mock con bots (plan B).
  **Env vars (también en Vercel):** `VITE_SUPABASE_URL=https://xociawfbjmccevhjcfiu.supabase.co` y
  `VITE_SUPABASE_PUBLISHABLE_KEY=<clave publicable sb_publishable_…>` (pública por diseño; nunca la service_role).
- **Bot "Mimic" (migración `mimic_bot`, aplicada):** IA impostora independiente del generador. El host lo activa con
  `updateSettings({ mimic: true })`. Su respuesta es una opción extra y anónima en la votación; quien la vota pierde 100
  (suelo 0); se descubre en la revelación (`isBot`, `authorId: "mimic"`) y puede ganar el premio. Si no llega, la ronda
  sigue sin él (la escritura espera como mucho `mimic_wait_seconds` = 10 s si todos han contestado).
  **API para las Edge Functions (solo service_role):** `ai_round_context(round_id)` (historial completo de la sala para
  aprender a imitar a cada jugador), `submit_bot_answer(round_id, text)`, `log_ai_generation(...)`, `update_room_memory`.
  **Pendiente (Nico):** Edge Function `mimic` + disparo al empezar cada `writing` si `settings.mimic` (mismo patrón
  `pg_net` + Vault que `request_generation`). Nota: `game.ai_round_input` debería filtrar `not a.is_bot` en `fakes`.
  **Pendiente (Pau):** interruptor de Mimic para el host, aviso "🤖 An AI is hiding among the answers" (`room.mimic`)
  y "🤖 Mimic" en la revelación.
- **IA (ronda a ronda):** Supabase **Edge Function** `generate-round` con adaptador **compatible con OpenAI**
  (proveedor probable: **Grok/xAI**; URL base, modelo y clave por secretos). Ronda 1 al pulsar Start; ronda N+1 se genera
  en segundo plano al empezar la votación de la N (lanzada desde la base con `pg_net`). Recibe contexto actual, rondas
  anteriores, respuestas reales y `rooms.memory` (preparado para "aprender" y redirigir el tema). Salida JSON validada.
  Si falla o no está lista a tiempo → conversación de respaldo (`app/src/content/packs.ts`).
  Si `age` es `under_18` o `mixed`, sin contenido picante.

## Riesgos y plan B
| Riesgo | Plan B |
|---|---|
| Supabase/Realtime da guerra | El mock ya juega solo; para la demo se puede jugar en modo mock con bots en un móvil |
| No conseguimos clave de IA | Packs precargados (≥ 30 chats). El juego no depende de la IA |
| iPhone se desconecta al bloquear | Sesión anónima + estado en servidor → al volver, `get_my_active_room` le devuelve a su sala |
| 60 personas a la vez | Todo por RPC con límites; sin LLM en el camino crítico de cada ronda |
| Contenido ofensivo con nombres reales | Prompt: picante de situación, nunca contra una persona; filtro de palabras en respuestas |

## Dueños (3 portátiles, cada uno con Claude Code; nadie toca lo de otro sin avisar)
| Terminal | Área | Ficheros |
|---|---|---|
| **T1 — Backend** | Supabase, RPCs, Realtime, reconexión | `supabase/**`, `app/src/lib/supabase.ts`, `app/src/game/supabaseClient.ts`, `app/src/game/useGame.ts`, `app/src/game/types.ts` (contrato: avisar antes de cambiar) |
| **T2 — UI** | Pantallas, componentes, animaciones | `app/src/screens/**`, `app/src/components/**`, `app/src/App.tsx`, `app/src/index.css` |
| **T3 — Contenido, IA, QA, deploy** | Packs, premios, IA, QR, sonidos, deploy, QA | `app/src/content/**`, `app/api/**`, `app/public/sfx/**`, QR en Lobby (avisar a T2), `AGENT_LOG.md`, `SETUP.md` |

`app/src/game/scoring.ts` y `mockClient.ts`: T1 (la UI no los toca).
**Deploy: automático.** Cada push a `main` publica en https://frieren-bfq.pages.dev (Cloudflare Pages). Ver `DEPLOY.md`.
Env vars de build en Cloudflare Pages (Production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `NODE_VERSION=22`. La clave de IA vive solo en Supabase (Edge Function).
Git: `git pull --rebase` **antes de empezar cada tarea** y antes de cada push (el viernes dos sesiones hicieron el Paso 0 a la vez y chocaron),
commits pequeños a `main`, `npm run build` antes de cada commit. Node ≥ 20.19 (Vite 8): `nvm use 22`.

### Primeros 30 minutos de cada terminal (08:00)
- **T1:** `claude /mcp` → autenticar `supabase` y comprobar que el proyecto se llama `frieren` → `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` →
  cargar skills `supabase` y `supabase-postgres-best-practices` → migración con tablas + RLS + `create_room`/`join_room`.
- **T2:** `cd app && npm install && npm run dev`, jugar una partida con el mock. Las pantallas **ya siguen el mockup** (`components/ui.tsx`):
  comparar cada una con `design-refs/mockup.png` en 375×812 y pulir (revelación con "typing" → pop de la real, ranking que se reordena,
  estados vacíos y errores, teclado de iOS tapando el input).
- **T3:** ampliar `packs.ts` a ≥ 30 chats (8+ por pack), premios y sonidos, `api/generate-chats.ts`, conseguir clave de Anthropic
  (Mario la añade al proyecto de Vercel). QR real **ya hecho** (`components/QR.tsx`).

## Hitos (sábado 10 oct)
- **01:30 (vie→sáb) ✓** — Paso 0 (Andrés) + UI estilo mockup con QR (Mario) en `main`; primer deploy desde el proyecto de Mario.
- **08:30** — Supabase creado y env vars puestas en el proyecto de Vercel de Mario; URL de la demo apuntada arriba.
- **10:30** — T1: RPCs + Realtime probados en SQL · T2: todas las pantallas pulidas contra el mock · T3: packs + QR + sonidos.
- **11:30** — UI conectada a Supabase: 3 móviles juegan una partida completa con packs.
- **12:00 — FEATURE FREEZE.** IA conectada con fallback si hay clave; si no, packs y listo.
- **12:00–15:00** — Pulido (`polish`), final compartible, 5 desconocidos lo prueban, arreglos.
- **15:00** — Solo bugs. Deploy final (Mario), QR impreso con la URL de arriba, `/setup-report`. **15:45** congelado. **16:00** code freeze.

## Definition of done
- [ ] 3 móviles reales (al menos un iPhone) juegan 3 rondas seguidas sin errores.
- [ ] Recargar o bloquear un móvil a mitad de ronda → vuelve a su sala y la partida sigue.
- [ ] Ningún texto "TODO", botón muerto ni pantalla en blanco.
- [ ] Sin clave de IA el juego funciona igual (packs).
- [ ] Con la anon key no se puede escribir directamente en ninguna tabla.
- [ ] La URL de producción devuelve 200 sin login de Vercel; QR impreso apunta a ella.
- [ ] `SETUP.md` publicado con modelos, herramientas y tokens de los 3.
