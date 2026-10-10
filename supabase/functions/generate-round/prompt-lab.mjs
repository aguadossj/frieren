// Laboratorio de prompts: mismas situaciones con el prompt actual (SYSTEM_PROMPT de core.ts) y con un candidato,
// lado a lado. No guarda nada ni toca la partida; solo llama al modelo con la clave de supabase/functions/.env.
//
//   node supabase/functions/generate-round/prompt-lab.mjs [candidato.txt] [veces]
//
// Por defecto el candidato es prompt-candidate.txt (junto a este fichero) y cada situación se genera 1 vez.
// Cada situación fija el tema (THEMES) para que la única diferencia sea el prompt. Escribe prompt-lab-report.md.
// Node ≥ 22.18 (ejecuta core.ts directamente).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const core = await import(pathToFileURL(join(here, 'core.ts')).href)
const candidatePath = resolve(process.argv[2] ?? join(here, 'prompt-candidate.txt'))
const times = Number(process.argv[3]) || 1

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

const players = [
  { id: 'a', name: 'Pol' },
  { id: 'b', name: 'Ana' },
  { id: 'c', name: 'Nico' },
  { id: 'd', name: 'Laura' },
]
const nameOf = Object.fromEntries(players.map((p) => [p.id, p.name]))

const SCENARIOS = [
  { label: 'ES · fiesta en casa · secreto', lang: 'es', writer: 'c', theme: 'secret', setup: { situation: 'de fiesta en casa de Pol', know: 'yes' } },
  { label: 'EN · drinks · last night', lang: 'en', writer: 'b', theme: 'last_night', setup: { situation: 'out for drinks', know: 'yes' } },
  { label: 'ES · clase · manía nueva', lang: 'es', writer: 'd', theme: 'habit', setup: { situation: 'en la uni entre clases', know: 'yes' } },
  { label: 'EN · trip · went wrong', lang: 'en', writer: 'a', theme: 'trip', setup: { know: 'yes' } },
  { label: 'ES · opinión impopular', lang: 'es', writer: 'b', theme: 'opinion', setup: { situation: 'cenando juntos', know: 'yes' } },
  { label: 'EN · strangers · talent', lang: 'en', writer: 'c', theme: 'talent', setup: { know: 'no' } },
]

const run = async (scenario, systemPrompt) => {
  const input = core.parseInput({
    round: 1,
    total_rounds: 4,
    setup: { lang: scenario.lang, ...scenario.setup },
    players,
    writer_id: scenario.writer,
    history: [],
    // Todos los temas "usados" menos el de la situación: así los dos prompts escriben sobre lo mismo.
    memory: { used_themes: core.THEMES.map((t) => t.id).filter((id) => id !== scenario.theme) },
  })
  const started = Date.now()
  try {
    const out = await core.generateRound(input, { ...config, systemPrompt })
    return {
      ok: true,
      ms: Date.now() - started,
      attempts: out.attempts,
      title: out.chat.title,
      lines: out.chat.messages.map((m) => `${nameOf[m.player_id]}: ${m.text}`),
    }
  } catch (error) {
    return { ok: false, ms: Date.now() - started, error: `${error.code ?? 'error'} ${error.message}` }
  }
}

const candidate = readFileSync(candidatePath, 'utf8')
const jobs = SCENARIOS.flatMap((s) =>
  Array.from({ length: times }, () => [run(s, undefined), run(s, candidate)]).map(async ([a, b]) => ({ s, current: await a, candidate: await b })),
)
const results = await Promise.all(jobs)

const block = (r) =>
  r.ok ? [`*${r.title}* · ${(r.ms / 1000).toFixed(1)} s · ${r.attempts} intento(s)`, ...r.lines.map((l) => `- ${l}`)] : [`**FALLO** ${r.error}`]
const report = [
  `# Prompt lab`,
  ``,
  `Modelo: \`${config.model}\` (${config.jsonMode}) · candidato: \`${candidatePath}\``,
  ``,
  ...results.flatMap(({ s, current, candidate }) => [
    `## ${s.label} · writer ${nameOf[s.writer]}`,
    ``,
    `**Actual**`,
    ...block(current),
    ``,
    `**Candidato**`,
    ...block(candidate),
    ``,
  ]),
].join('\n')
writeFileSync(join(here, 'prompt-lab-report.md'), report)
console.log(report)
