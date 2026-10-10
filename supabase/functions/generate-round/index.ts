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
// Secretos: AI_API_KEY, GENERATE_ROUND_SECRET; opcionales AI_BASE_URL (Groq por defecto) y AI_MODEL.
// SUPABASE_URL y la clave de servicio los pone Supabase.

import { AiError, generateRound, parseInput } from './core.ts'
import { MIMIC_PROMPT_VERSION, generateMimic } from './mimic.ts'

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

const failStatus = (code: AiError['code']) =>
  code === 'timeout' ? 'timeout' : code === 'invalid_output' ? 'invalid' : 'error'

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const secret = Deno.env.get('GENERATE_ROUND_SECRET')
  if (!secret || request.headers.get('x-generate-secret') !== secret) return json(401, { error: 'unauthorized' })

  const apiKey = Deno.env.get('AI_API_KEY')
  const config = {
    apiKey: apiKey ?? '',
    baseUrl: Deno.env.get('AI_BASE_URL') ?? 'https://api.groq.com/openai/v1',
    model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b',
    timeoutMs: 12000, // la sala espera como mucho 12 s en `generating`
  }

  const body = await request.json().catch(() => null)
  const roundId = typeof body?.round_id === 'string' ? body.round_id : null

  // ── Bot Mimic ──
  if (body?.mode === 'mimic') {
    const started = Date.now()
    const roomId = typeof body?.context?.room_id === 'string' ? body.context.room_id : null
    try {
      if (!apiKey) throw new AiError('provider_failed', 'no AI_API_KEY')
      // La escritura dura ~25 s y espera al bot como mucho 10 s tras contestar todos: tiene que ser rápido.
      const output = await generateMimic(body.context, body.examples, { ...config, timeoutMs: 8000 })
      if (!roundId) return json(200, output)
      const accepted = await rpc('submit_bot_answer', { p_round_id: roundId, p_text: output.answer })
      await rpc('log_ai_generation', {
        p_room_id: output.room_id, p_round_id: roundId, p_provider: 'openai-compatible', p_model: output.model,
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
          p_room_id: roomId, p_round_id: roundId, p_provider: 'openai-compatible', p_model: config.model,
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
      const output = await generateRound(parseInput(body.input), config)
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
