// Edge Function `generate-round`: envoltorio fino sobre core.ts.
//
// POST con cabecera `x-generate-secret: <GENERATE_ROUND_SECRET>` y cuerpo GenerateRoundInput (ver core.ts).
// 200 -> GenerateRoundOutput { chat, memory, model } · 4xx/5xx -> { error } y quien llama usa packs.ts.
//
// Secretos (supabase secrets set …):
//   AI_API_KEY             clave del proveedor (Groq)
//   AI_BASE_URL            opcional, por defecto https://api.groq.com/openai/v1
//   AI_MODEL               opcional, por defecto openai/gpt-oss-120b
//   GENERATE_ROUND_SECRET  secreto compartido con la base (pg_net). Desplegar con --no-verify-jwt:
//                          cualquier jugador anónimo tiene un JWT válido, así que el JWT no protege nada aquí.
//
// Integración pendiente (T1, migración 3): `game.request_generation` la llama con pg_net cuando `ai_enabled`.
// pg_net no devuelve la respuesta a nadie, así que hay que guardar el resultado desde aquí (service role):
//   chat    -> game.rounds.conversation (misma forma) + source 'ai' + status 'ready'
//   memory  -> game.rooms.memory
//   model, prompt_version, input_tokens, output_tokens, latency_ms -> game.ai_generations
// Si falla: rounds.status 'failed' y la base usa game.fill_fallback.

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

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const secret = Deno.env.get('GENERATE_ROUND_SECRET')
  if (!secret || request.headers.get('x-generate-secret') !== secret) return json(401, { error: 'unauthorized' })

  const apiKey = Deno.env.get('AI_API_KEY')
  if (!apiKey) return json(503, { error: 'no_key' })

  try {
    const input = parseInput(await request.json().catch(() => null))
    const output = await generateRound(input, {
      apiKey,
      baseUrl: Deno.env.get('AI_BASE_URL') ?? 'https://api.groq.com/openai/v1',
      model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b',
      timeoutMs: 12000, // en segundo plano; la ronda 1 también cabe en "generating"
    })
    return json(200, output)
  } catch (error) {
    if (error instanceof AiError) {
      console.error('generate-round', error.code, error.message)
      return json(STATUS[error.code], { error: error.code })
    }
    console.error('generate-round', error)
    return json(500, { error: 'internal' })
  }
})
