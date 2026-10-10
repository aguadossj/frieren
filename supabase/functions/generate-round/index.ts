// Edge Function `generate-round`: envoltorio fino sobre core.ts. Desplegar con --no-verify-jwt:
// cualquier jugador anónimo tiene un JWT válido, así que lo que protege es el secreto compartido.
//
// Siempre: cabecera `x-generate-secret: <GENERATE_ROUND_SECRET>`.
// - Desde la base (migración 3, pg_net): { round_id, input } -> genera y guarda con las RPC
//   public.ai_complete_round / public.ai_fail_round (service role). Responde { outcome }.
// - Bot Mimic (migración style_and_mimic): { mode: 'mimic', round_id, context, examples } -> genera la respuesta
//   del bot y la entrega con public.submit_bot_answer; registra con public.log_ai_generation. Sin round_id la devuelve.
// - Prueba directa: GenerateRoundInput -> devuelve GenerateRoundOutput sin guardar nada.
//
// Dos modelos:
// - Conversaciones (rondas) y bot Mimic: Hermes 3 70B en OpenRouter. Secretos AI_API_KEY (clave de OpenRouter);
//   opcionales AI_BASE_URL, AI_MODEL y AI_JSON_MODE (json_schema | json_object | none).
// - Lo demás (borradores de la ronda 1 en el lobby): Groq, gpt-oss-120b. Secreto GROQ_API_KEY; opcionales
//   GROQ_BASE_URL y GROQ_MODEL. Sin GROQ_API_KEY, los borradores también van con Hermes.
// Siempre GENERATE_ROUND_SECRET. SUPABASE_URL y la clave de servicio los pone Supabase.

import { AiError, generateRound, parseInput } from './core.ts'
import { MIMIC_PROMPT_VERSION, generateMimic } from './mimic.ts'
import { generateDrafts } from './drafts.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const STATUS: Record<AiError['code'], number> = {
  bad_input: 400,
  provider_status: 502,
  provider_failed: 502,
  invalid_output: 502,
  timeout: 504,
}

// Clave de servicio: la clásica (JWT) o la nueva sb_secret_… (SUPABASE_SECRET_KEYS es un JSON { nombre: clave }).
function serviceKey(): string | null {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    return keys.default ?? Object.values(keys)[0] ?? null
  } catch {
    return null
  }
}

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = serviceKey()
  if (!url || !key) throw new Error('missing SUPABASE_URL or service key')
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(args) })
  if (!res.ok) throw new Error(`rpc ${name} ${res.status} ${await res.text()}`)
  return res.json()
}

// Modo JSON de Hermes por defecto (se puede cambiar con el secreto AI_JSON_MODE).
const HERMES_JSON_MODE = 'json_schema'

// Para game.ai_generations: de qué proveedor salió cada llamada.
const providerOf = (baseUrl: string) =>
  baseUrl.includes('openrouter.ai') ? 'openrouter' : baseUrl.includes('groq.com') ? 'groq' : 'openai-compatible'

const failStatus = (code: AiError['code']) =>
  code === 'timeout' ? 'timeout' : code === 'invalid_output' ? 'invalid' : 'error'

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const secret = Deno.env.get('GENERATE_ROUND_SECRET')
  if (!secret || request.headers.get('x-generate-secret') !== secret) return json(401, { error: 'unauthorized' })

  // Hermes: conversaciones de cada ronda y bot Mimic.
  const apiKey = Deno.env.get('AI_API_KEY')
  const config = {
    apiKey: apiKey ?? '',
    baseUrl: Deno.env.get('AI_BASE_URL') ?? 'https://openrouter.ai/api/v1',
    model: Deno.env.get('AI_MODEL') ?? 'nousresearch/hermes-3-llama-3.1-70b',
    // Ronda 1: la sala espera en `generating` (game.config generation_timeout_seconds = 20).
    // Rondas 2+: se piden al empezar la votación anterior, hay ~25 s de margen. Ajustado a Hermes 3 70B (~10–13 s).
    timeoutMs: 18000,
    // En OpenRouter el único proveedor de Hermes 3 70B (DeepInfra) admite json_schema pero no json_object:
    // json_object se descartaba en silencio. core.ts pide require_parameters para que no vuelva a pasar.
    jsonMode: (Deno.env.get('AI_JSON_MODE') ?? HERMES_JSON_MODE) as 'json_schema' | 'json_object' | 'none',
  }
  // Groq: borradores del lobby. Sin clave de Groq, Hermes.
  const groqKey = Deno.env.get('GROQ_API_KEY')
  const groq = groqKey
    ? {
        apiKey: groqKey,
        baseUrl: Deno.env.get('GROQ_BASE_URL') ?? 'https://api.groq.com/openai/v1',
        model: Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-120b',
        timeoutMs: 18000,
        jsonMode: 'json_schema' as const,
      }
    : config

  const body = await request.json().catch(() => null)
  const roundId = typeof body?.round_id === 'string' ? body.round_id : null

  // ── Borradores de la ronda 1 (mientras la gente entra en la sala) ──
  if (body?.mode === 'drafts') {
    const roomId = typeof body?.room_id === 'string' ? body.room_id : null
    try {
      if (!groq.apiKey) throw new AiError('provider_failed', 'no GROQ_API_KEY or AI_API_KEY')
      const output = await generateDrafts(body.input, { ...groq, timeoutMs: 30000 }, Number(body.count) || 3)
      if (!roomId) return json(200, output)
      const saved = output.drafts.length
        ? await rpc('ai_save_drafts', { p_room_id: roomId, p_setup_hash: String(body.setup_hash ?? ''), p_drafts: output.drafts })
        : 0
      await rpc('log_ai_generation', {
        p_room_id: roomId, p_round_id: null, p_provider: providerOf(groq.baseUrl), p_model: output.model,
        p_prompt_version: output.prompt_version, p_status: output.drafts.length ? 'ok' : 'error',
        p_input_tokens: output.input_tokens, p_output_tokens: output.output_tokens, p_latency_ms: output.latency_ms,
        p_error: output.errors.length ? output.errors.join(' | ').slice(0, 900) : null,
      }).catch((e) => console.error('drafts log', e))
      return json(200, { saved })
    } catch (error) {
      console.error('drafts', roomId, error)
      return json(roomId ? 200 : 500, { outcome: 'failed', error: error instanceof AiError ? error.code : 'internal' })
    }
  }

  // ── Bot Mimic ──
  if (body?.mode === 'mimic') {
    const started = Date.now()
    const roomId = typeof body?.context?.room_id === 'string' ? body.context.room_id : null
    try {
      if (!apiKey) throw new AiError('provider_failed', 'no AI_API_KEY')
      // La escritura dura ~25 s y espera al bot como mucho 10 s tras contestar todos: tiene que ser rápido.
      const output = await generateMimic(body.context, body.examples, { ...config, timeoutMs: 15000 })
      if (!roundId) return json(200, output)
      const accepted = await rpc('submit_bot_answer', { p_round_id: roundId, p_text: output.answer })
      await rpc('log_ai_generation', {
        p_room_id: output.room_id, p_round_id: roundId, p_provider: providerOf(config.baseUrl), p_model: output.model,
        p_prompt_version: output.prompt_version, p_status: 'ok', p_input_tokens: output.input_tokens,
        p_output_tokens: output.output_tokens, p_latency_ms: output.latency_ms, p_error: accepted ? null : 'not_accepted',
      }).catch((e) => console.error('mimic log', e))
      return json(200, { outcome: accepted ? 'submitted' : 'not_needed' })
    } catch (error) {
      const code = error instanceof AiError ? error.code : 'provider_failed'
      const message = error instanceof Error ? error.message : String(error)
      console.error('mimic', roundId, code, message)
      if (roundId && roomId) {
        await rpc('log_ai_generation', {
          p_room_id: roomId, p_round_id: roundId, p_provider: providerOf(config.baseUrl), p_model: config.model,
          p_prompt_version: MIMIC_PROMPT_VERSION, p_status: failStatus(code), p_input_tokens: null,
          p_output_tokens: null, p_latency_ms: Date.now() - started, p_error: `${code}: ${message}`,
        }).catch((e) => console.error('mimic log', e))
      }
      return json(roundId ? 200 : STATUS[code as AiError['code']] ?? 500, { outcome: 'failed', error: code })
    }
  }

  // ── Desde la base: generar y guardar ──
  if (roundId) {
    try {
      if (!apiKey) throw new AiError('provider_failed', 'no AI_API_KEY')
      const input = parseInput(body.input)
      const output = await generateRound(input, { ...config, timeoutMs: input.round === 1 ? 18000 : 28000 })
      const outcome = await rpc('ai_complete_round', { p_round_id: roundId, p_result: output })
      return json(200, { outcome })
    } catch (error) {
      const code = error instanceof AiError ? error.code : 'provider_failed'
      const message = error instanceof Error ? error.message : String(error)
      console.error('generate-round', roundId, code, message)
      try {
        const outcome = await rpc('ai_fail_round', { p_round_id: roundId, p_status: failStatus(code), p_error: `${code}: ${message}` })
        return json(200, { outcome })
      } catch (rpcError) {
        console.error('generate-round', roundId, 'could not report failure', rpcError)
        return json(500, { error: 'report_failed' })
      }
    }
  }

  // ── Prueba directa: entrada -> salida ──
  if (!apiKey) return json(503, { error: 'no_key' })
  try {
    return json(200, await generateRound(parseInput(body), config))
  } catch (error) {
    if (error instanceof AiError) {
      console.error('generate-round', error.code, error.message)
      return json(STATUS[error.code], { error: error.code })
    }
    console.error('generate-round', error)
    return json(500, { error: 'internal' })
  }
})
