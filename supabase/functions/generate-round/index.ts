// Edge Function `generate-round`: envoltorio fino sobre core.ts. Desplegar con --no-verify-jwt:
// cualquier jugador anónimo tiene un JWT válido, así que lo que protege es el secreto compartido.
//
// Siempre: cabecera `x-generate-secret: <GENERATE_ROUND_SECRET>`.
// - Desde la base (migración 3, pg_net): { round_id, input } -> genera y guarda con las RPC
//   public.ai_complete_round / public.ai_fail_round (service role). Responde { outcome }.
// - Prueba directa: GenerateRoundInput -> devuelve GenerateRoundOutput sin guardar nada.
//
// Secretos: AI_API_KEY, GENERATE_ROUND_SECRET; opcionales AI_BASE_URL (Groq por defecto) y AI_MODEL.
// SUPABASE_URL y la clave de servicio los pone Supabase.

import { AiError, generateRound, parseInput } from './core.ts'

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
