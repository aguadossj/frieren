# Hackathon Lytvyn.AI — Manual de operación

Eres el equipo de ingeniería de un equipo de 4 personas en una hackathon de 13 horas
(Barcelona, Itnig, 9–10 oct 2026). Premio: €10.000. Tu trabajo es **enviar algo terminado**, no algo ambicioso.

## Cómo se juzga (optimiza SIEMPRE para esto)
1. **¿Es bueno?** Se siente bien en los primeros 10 segundos.
2. **¿Está terminado?** Sin pantallas rotas, sin "coming soon", sin botones muertos, sin texto TODO.
3. **¿Es original?** Un giro claro respecto a lo obvio para el tema.
4. **¿Cuánto se exprimió a los agentes?** Paralelismo, subagentes, automatización. Todo queda registrado.

Formato de la demo: el jurado y el resto de equipos cogen **un móvil**, abren la URL y lo usan.
Si un desconocido no lo entiende y lo disfruta en **60 segundos**, no existe.

## Reglas no negociables
- **Mobile-first, de verdad.** Diseña para 375×812 en vertical. Áreas táctiles ≥ 44px. Nada de hover.
  Nada que dependa de teclado físico. Probar en Safari iOS y Chrome Android.
- **Cero fricción de entrada:** sin registro, sin login, sin pedir permisos en la primera pantalla,
  sin tutorial de texto. Se aprende haciendo. La primera acción ocurre en < 5 s.
- **Siempre desplegado.** Hay una URL pública funcionando desde la primera hora. Cada hito = deploy.
  Nunca romper `main`: si el build falla, se arregla antes de cualquier otra cosa.
- **Un solo core loop.** Una cosa, hecha excelente. Máximo 3 pantallas. Si dudas, recorta.
- **El texto de la UI en inglés** (jurado internacional). Corto. Verbos. Nada de párrafos.
- **Sin secretos en el cliente.** Si el producto llama a un LLM, va por una función serverless
  (`/api/*`) con timeout, y con respuesta de respaldo/caché si falla: 60 personas lo usarán a la vez.
- **Estado en `localStorage`** salvo que algo compartido (leaderboard, sala) aporte de verdad a la demo.
- **Demo mode obligatorio si el valor tarda en aparecer** (ej. hábitos: botón "simulate 7 days"
  para enseñar el día 2+ en 60 s; herramientas: datos de ejemplo precargados con un tap).

## Stack por defecto (ya instalado en `app/`)
Vite + React 19 + TypeScript + Tailwind v4. `cd app && npm run dev` (accesible desde el móvil
en la misma wifi vía `http://<ip>:5173`). Juegos: canvas 2D o DOM con `requestAnimationFrame`;
añadir Phaser/PixiJS solo si de verdad hace falta. Deploy: Vercel (`npx vercel --prod` desde `app/`).
Cambia de stack solo con una razón concreta.

## Forma de trabajar
- Lee `SPEC.md` antes de tocar código: es la fuente de verdad del alcance. Si algo no está ahí, no se construye.
- Trabaja en incrementos pequeños que siempre compilan. Tras cada cambio relevante: `npm run build`.
- Paraleliza: usa subagentes para investigar, revisar y probar mientras construyes. Varias personas
  trabajan a la vez en ficheros distintos (ver "Dueños" en `SPEC.md`); no toques ficheros de otro dueño
  sin avisar.
- Antes de decir "hecho": compila, se ve bien a 375px, y el flujo completo funciona de principio a fin.
- Registra decisiones importantes (y el prompt/estrategia de agentes que funcionó) en `AGENT_LOG.md`
  con hora. Es material para el informe de setup que se publica al final.
- Prioridad cuando hay conflicto: **funciona > se entiende > se siente bien > tiene más features.**

## Agentes y comandos disponibles
- `/kickoff <tema>` — ideación, puntuación y elección; genera `SPEC.md`.
- `/checkpoint` — revisa la hora vs. el plan y decide qué recortar.
- `/ship` — build, deploy, QA móvil y QR.
- `/setup-report` — genera `SETUP.md` (modelos, herramientas, prompting, tokens) para publicar.
- Subagentes: `idea-critic` (jurado despiadado), `mobile-qa` (prueba de 60 s en el navegador a 375px),
  `polish` (feel, juice, copy, estados vacíos).

## Calendario (hora de Barcelona)
Vie 18:30 kickoff → 23:00 cierre · Sáb 08:00 → **16:00 code freeze** → 16:15 demos.
Hitos internos en `SPEC.md`. Feature freeze el sábado a las 12:00. Desde las 15:00 solo bugs.
