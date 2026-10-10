import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const AI_CORE = fileURLToPath(new URL('../supabase/functions/generate-round/core.ts', import.meta.url))

// Solo en `npm run dev`: sirve /api/generate-round con el mismo núcleo que la Edge Function, para que el mock
// pruebe la IA sin Supabase. Las claves (AI_*, sin prefijo VITE_) salen de .env.local y no llegan al navegador.
function devAi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-ai',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/generate-round', async (req, res) => {
        const reply = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' })
        if (!env.AI_API_KEY) return reply(503, { error: 'no_key' })

        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const core = await server.ssrLoadModule(AI_CORE)
        try {
          const input = core.parseInput(JSON.parse(Buffer.concat(chunks).toString() || 'null'))
          reply(
            200,
            await core.generateRound(input, {
              apiKey: env.AI_API_KEY,
              baseUrl: env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
              model: env.AI_MODEL || 'openai/gpt-oss-120b',
              timeoutMs: 12000,
            }),
          )
        } catch (error) {
          const code: string = error instanceof core.AiError ? (error as { code: string }).code : 'internal'
          console.warn('[dev-ai]', code, error instanceof Error ? error.message : error)
          reply(code === 'bad_input' ? 400 : 502, { error: code })
        }
      })
    },
  }
}

// host: true -> accesible desde el móvil en la misma wifi (http://<ip-del-portátil>:5173)
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'AI_'), ...pickDefined(process.env, 'AI_') }
  return {
    plugins: [react(), tailwindcss(), devAi(env)],
    server: { host: true },
    preview: { host: true },
  }
})

function pickDefined(source: NodeJS.ProcessEnv, prefix: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter((e): e is [string, string] => e[0].startsWith(prefix) && Boolean(e[1])),
  )
}
