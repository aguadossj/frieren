// Simulación para votar: genera muchos chats (prompt candidato y, como control, el actual) con ajustes de sala
// realistas, barajados y numerados, para que el equipo los vote a ciegas. No toca la partida.
//
//   node supabase/functions/generate-round/prompt-sim.mjs [candidato.txt] [chats por ajuste]
//
// Escribe prompt-sim-chats.json (con qué prompt escribió cada chat; no se publica) junto a este fichero.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const core = await import(pathToFileURL(join(here, 'core.ts')).href)
const candidate = readFileSync(resolve(process.argv[2] ?? join(here, 'prompt-candidate.txt')), 'utf8')
const perSetting = Number(process.argv[3]) || 4 // 3 del candidato + 1 del actual

const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
)
const config = {
  apiKey: env.AI_API_KEY,
  baseUrl: env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
  model: env.AI_MODEL || 'nousresearch/hermes-3-llama-3.1-70b',
  jsonMode: env.AI_JSON_MODE || 'json_object',
  timeoutMs: 28000,
}

const players = ['Nico', 'Andrés', 'Pau', 'Mario'].map((name, i) => ({ id: `p${i}`, name }))
const nameOf = Object.fromEntries(players.map((p) => [p.id, p.name]))

// Lo que escribiría un host de verdad, con las tarjetas del setup (adultos, picante, os conocéis).
const SETTINGS = [
  { lang: 'es', situation: 'cumpleaños de Mario, cumple 30 y no supera a su ex', adults: true, spicy: true, know: true },
  { lang: 'es', situation: 'previa en casa de Pau antes de ir a Razzmatazz', adults: true, spicy: true, know: true },
  { lang: 'es', situation: 'en el bar después de la hackathon, llevamos dos días sin dormir', adults: true, spicy: false, know: true },
  { lang: 'es', situation: 'cena de piso, alguien ha vuelto a dejar los platos sin fregar', adults: true, spicy: false, know: true },
  { lang: 'es', situation: 'viaje en coche a Valencia, quedan 3 horas', adults: true, spicy: true, know: true },
  { lang: 'es', situation: 'comida familiar de domingo en casa de la abuela', adults: false, spicy: false, know: true },
  { lang: 'en', situation: "Mario's leaving party, he's moving to Berlin on Monday", adults: true, spicy: true, know: true },
  { lang: 'en', situation: 'watching the Barça match at a bar, losing 2-0', adults: true, spicy: false, know: true },
  { lang: 'en', situation: 'first time meeting at a hackathon in Barcelona', adults: true, spicy: false, know: false },
  { lang: 'en', situation: 'school trip to the science museum', adults: false, spicy: false, know: true },
]

const setupOf = (s) => ({
  lang: s.lang,
  situation: s.situation,
  know: s.know ? 'yes' : 'no',
  spicy: s.spicy ? 'yes' : 'no',
  ...(!s.adults && { age: 'mixed' }),
})

const jobs = SETTINGS.flatMap((setting, si) =>
  Array.from({ length: perSetting }, (_, k) => ({ setting, variant: k === 0 ? 'current' : 'candidate', writer: players[(si + k) % 4] })),
)

async function generate(job) {
  const input = core.parseInput({
    round: 1,
    total_rounds: 4,
    setup: setupOf(job.setting),
    players,
    writer_id: job.writer.id,
    history: [],
  })
  const started = Date.now()
  try {
    const out = await core.generateRound(input, { ...config, systemPrompt: job.variant === 'candidate' ? candidate : undefined })
    return {
      ...job,
      ok: true,
      ms: Date.now() - started,
      attempts: out.attempts,
      theme: out.theme_id,
      format: out.format_id,
      title: out.chat.title,
      lines: out.chat.messages.map((m) => ({ who: nameOf[m.player_id], text: m.text })),
    }
  } catch (error) {
    return { ...job, ok: false, ms: Date.now() - started, error: `${error.code ?? 'error'} ${error.message}` }
  }
}

// De 8 en 8 para no saturar al proveedor.
const results = []
for (let i = 0; i < jobs.length; i += 8) {
  results.push(...(await Promise.all(jobs.slice(i, i + 8).map(generate))))
  process.stdout.write(`${results.length}/${jobs.length} `)
}

// Barajados y numerados: el número no dice qué prompt lo escribió.
const shuffled = results.filter((r) => r.ok).sort(() => Math.random() - 0.5)
const chats = shuffled.map((r, i) => ({
  id: `c${String(i + 1).padStart(2, '0')}`,
  variant: r.variant,
  theme: r.theme,
  format: r.format,
  lang: r.setting.lang,
  situation: r.setting.situation,
  adults: r.setting.adults,
  spicy: r.setting.spicy,
  know: r.setting.know,
  writer: r.writer.name,
  title: r.title,
  lines: r.lines,
  ms: r.ms,
  attempts: r.attempts,
}))
writeFileSync(join(here, 'prompt-sim-chats.json'), JSON.stringify({ model: config.model, created_at: new Date().toISOString(), chats, failed: results.filter((r) => !r.ok).map((r) => ({ variant: r.variant, situation: r.setting.situation, error: r.error })) }, null, 2))
console.log(`\n${chats.length} chats ok, ${results.length - chats.length} failed`)
