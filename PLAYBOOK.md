# Playbook del equipo — Lytvyn.AI Hackathon

> Ganan los equipos que **terminan** algo pequeño y delicioso, no los que empiezan algo grande.

## Antes de las 18:30 (hoy) — cada persona
- [ ] Claude Code abierto en esta carpeta y funcionando (y Cursor/ChatGPT/lo que uséis).
- [ ] `npx vercel login` hecho en **al menos 2 portátiles** (deploy sin esperas).
- [ ] Repo en GitHub compartido con el equipo (`git remote add origin ...` + `git push -u origin main`).
- [ ] `cd app && npm run dev` arranca y se abre en tu móvil en `http://<ip-del-portátil>:5173`.
- [ ] Móviles cargados: **un iPhone y un Android** para probar. Powerbank.
- [ ] Preguntad a la organización: ¿se puede seguir trabajando/lanzar agentes fuera del recinto el viernes por la noche?

## Roles (4 personas, cada una con sus propias sesiones de Claude en paralelo)
| Rol | Qué hace | Sesiones de agente típicas |
|---|---|---|
| **Capitán / producto** | Decide, recorta, guarda el guion de 60 s, prueba con desconocidos, lanza `/checkpoint` cada ~90 min | `/kickoff`, `/checkpoint`, `idea-critic` |
| **Core builder** | El core loop: lógica, estado, la mecánica principal | 1–2 sesiones en worktrees |
| **Experiencia / UI** | Pantallas, animación, sonido, copy, el momento wow | sesión de UI + `polish` desde las 12:00 |
| **Ops / QA / contenido** | Deploys, `/ship`, `mobile-qa`, assets y datos de demo, `/setup-report` | `/ship`, `mobile-qa`, generación de assets |

Paralelizar sin pisarse: cada uno trabaja en su área de ficheros (columna "Dueños" de `SPEC.md`),
commits pequeños y frecuentes, `git pull --rebase` antes de push. Para dos tareas a la vez en el
mismo portátil: `git worktree add ../wt-<tarea> -b <tarea>`.

## Timeline
| Hora | Qué | Salida |
|---|---|---|
| Vie 18:30 | Tema anunciado → `/kickoff <tema>` | 15 ideas puntuadas |
| **19:15** | **Decisión tomada. Sin vuelta atrás.** | `SPEC.md` |
| 20:00 | **M0** esqueleto desplegado, se abre en móvil | URL pública |
| 23:00 | **M1** core loop de principio a fin (feo vale) | Probado por alguien de otro equipo |
| Noche | Dormir. De verdad. La decisión de mañana vale más que 2 h de código cansado | — |
| Sáb 08:00 | Probad con 3 desconocidos (mentores) en los primeros 30 min. Apuntad dónde se atascan | Lista de fixes |
| **12:00** | **M2 FEATURE FREEZE** | Todo el guion de 60 s funciona |
| 12:00–15:00 | Pulido (`polish`), onboarding, estados, sonido, haptics, share. 5 desconocidos más | **M3** |
| 15:00 | Solo bugs. `/ship` final. Imprimir QR. `/setup-report` | **M4** |
| 15:45 | Congelado. Nadie toca nada | — |
| 16:00 | Code freeze oficial | — |

## Comandos (desde Claude Code en esta carpeta)
- `/kickoff <tema>` — ideación ×15, 3 jurados en paralelo, recomendación, y luego `SPEC.md`.
- `/checkpoint` — ¿vamos en hora? ¿qué recortamos? Plan de los próximos 90 min por persona.
- `/ship` — build, deploy a Vercel, QA móvil a la URL real, QR.
- `/setup-report` — `SETUP.md` con modelos, prompting y tokens (cada persona aporta sus números).
- Subagentes: "usa el agente mobile-qa…", "usa el agente polish en la pantalla de resultados…".

Cada prompt que escribís aquí se guarda solo en `.hackathon/prompts.jsonl` (hook) → material para el informe.
Apuntad en `AGENT_LOG.md` lo que haya funcionado especialmente bien.

## Estrategia por track
- **Game:** un verbo (tap, swipe, hold). Muere en 20–40 s y "one more try" en un toque. Puntuación visible
  y **leaderboard compartido** si cabe (Supabase/Upstash): en la demo todo el mundo compite entre sí → ruido en la sala.
- **Tool:** una tarea semanal real y concreta (no "productividad" en abstracto). Botón "Try with example"
  que enseña el resultado en 1 toque. El antes/después debe verse en una pantalla.
- **Habit:** el valor está en *mañana*, y la demo es *hoy* → **demo mode** que simula días/semanas.
  Una sola acción diaria, ridículamente fácil. Recompensa emocional, no gráficos.

Elegid el track donde el tema encaje mejor, no el favorito. Si el tema empuja a todos al mismo track,
el hueco suele estar en otro.

## Demo (16:15)
- Móviles propios cargados con la app abierta + QR grande en pantalla/papel para el resto.
- No explicar: dar el móvil y callar. Si hay que explicar, el problema está en la app.
- Datos frescos: limpiad `localStorage` antes de cada persona (o botón oculto de reset).
- Plan B: vídeo de 30 s grabado en el móvil por si cae la wifi o el deploy.

## Errores típicos que matan equipos
- Seguir ideando a las 20:00. → Decidir a las 19:15 sí o sí.
- Desplegar por primera vez el sábado a las 15:30. → Desplegar a las 20:00 del viernes.
- Añadir una feature a las 14:00. → Feature freeze a las 12:00.
- Login, onboarding de 4 pantallas, pedir la cámara de entrada. → Nunca.
- LLM en el camino crítico sin fallback ni límite: 60 personas a la vez lo tumban.
