// Juez de coherencia: un modelo de razonamiento rápido (gpt-oss-20b en Groq, ~0,6 s) lee el chat ya
// generado y dice si se entiende: si la situación se sigue, si el final va de lo mismo, si alguien habla de sí
// mismo en tercera persona… No juzga la gracia ni el estilo.
//
// Dos capas: primero comprobaciones en código (0 ms, lo que el modelo se saltaba en las pruebas: gente que se nombra
// a sí misma, marcadores P1/{W} sueltos) y luego el modelo. Nunca bloquea la partida: si el juez falla o tarda más
// de lo previsto, el chat se da por bueno (source = 'skipped').
//
// TS puro y sin imports de core.ts (core.ts lo importa a él). Se activa con el secreto JUDGE_MODEL (index.ts).

export const JUDGE_PROMPT_VERSION = 'judge-v1'

export interface JudgeConfig {
  baseUrl: string
  apiKey: string
  model: string
  effort?: 'low' | 'medium' | 'high'
  timeoutMs?: number
}

export interface JudgeChat {
  writer: string
  title: string
  lines: { from: string; text: string }[]
  /** Todos los nombres de la sala (para avisar si dos jugadores se llaman igual). */
  players?: string[]
}

export interface Verdict {
  ok: boolean
  issues: string[]
  situation: string
  /** Frase corta para el reintento ("off_topic_end: the chat is about X but the end asks about Y"). */
  problem: string
  source: 'code' | 'model' | 'skipped'
  model: string | null
  latency_ms: number
  input_tokens: number | null
  output_tokens: number | null
}

// El modelo no da un "ok": describe el chat y cita, y el código decide. Pidiendo un veredicto directo, gpt-oss
// aprobó casi todos los chats rotos de la base (prueba del 10/10 con 24 chats etiquetados a mano). La cita se puede
// comprobar: si lo que dice que conecta el final con el resto no está en los mensajes anteriores, no conecta.
const SYSTEM_PROMPT = `You review short fake group chats written by an AI for a party game played by real friends. The last message asks or challenges one player, the WRITER, who then answers for real from their own life while the others try to fake that answer. The answer is never in the chat.

Read the chat and fill these fields:
- setup: what the messages BEFORE the last one are about, in at most 10 words.
- ask: what the LAST message asks or challenges the writer about, in at most 10 words.
- link: copy 1 to 6 words, exactly as written, from the messages BEFORE the last one, naming the event, object, claim or story that the last message is about. If the last message is about something the earlier messages never mention, use an empty string. A name alone does not count. Do not stretch: if the chat is about a lost jacket and the end asks about their dream holiday, link is empty.
- odd_message: copy the first message that does not make sense where it is (it is gibberish, it refers to something nobody mentioned, it contradicts what the same person just said, or it has nothing to do with the messages around it). Empty string if every message fits. Short reactions like "JAJAJA", "nooo", "?" or an emoji always fit.
- has_hook: false only if the last message gives the writer nothing to answer or react to.

Ignore style, slang, swearing, typos, punctuation, emoji and how funny it is. The chat may be in Spanish or English.
Reply with JSON only: {"setup": "...", "ask": "...", "link": "...", "odd_message": "...", "has_hook": true|false}`

const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** ¿La cita está de verdad en los mensajes anteriores al último, y dice algo más que un nombre? */
export function linkHolds(chat: JudgeChat, link: string): boolean {
  const quote = fold(link)
  if (!quote) return false
  const names = new Set([...(chat.players ?? []), chat.writer, ...chat.lines.map((l) => l.from)].flatMap((n) => fold(n).split(' ')))
  if (quote.split(' ').every((word) => names.has(word))) return false
  const earlier = ` ${chat.lines.slice(0, -1).map((l) => fold(l.text)).join(' ')} `
  return earlier.includes(` ${quote} `)
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hasWord = (text: string, word: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${escape(word)}($|[^\\p{L}\\p{N}])`, 'u').test(text.toLowerCase())

/** ¿El texto nombra a `name`? El nombre entero, o una palabra suya que no lleve nadie más ("Ana" de "Ana María"). */
function names(text: string, name: string, everyone: string[]): boolean {
  const lower = name.toLowerCase()
  if (hasWord(text, lower)) return true
  const others = everyone.map((n) => n.toLowerCase()).filter((n) => n !== lower)
  return lower
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !others.some((other) => other.split(/\s+/).includes(word)))
    .some((word) => hasWord(text, word))
}

/** Lo que se ve sin modelo. Devuelve null si no hay nada. */
export function codeIssues(chat: JudgeChat): Pick<Verdict, 'issues' | 'problem'> | null {
  const everyone = [...new Set([...(chat.players ?? []), ...chat.lines.map((l) => l.from), chat.writer])]
  const counts = new Map<string, number>()
  for (const name of chat.players ?? []) counts.set(name.toLowerCase(), (counts.get(name.toLowerCase()) ?? 0) + 1)
  const found: { issue: string; problem: string }[] = []
  for (const line of chat.lines) {
    // Dos jugadores con el mismo nombre (alguien volvió a entrar): no se puede saber a quién nombra.
    const shared = (counts.get(line.from.toLowerCase()) ?? 0) > 1
    if (!shared && line.from.toLowerCase() !== chat.writer.toLowerCase() && names(line.text, line.from, everyone)) {
      found.push({ issue: 'self_reference', problem: `${line.from} names themselves in "${line.text}"` })
    }
    if (/\{\s*(W|P\d)\s*\}|\bP\d\b|\bWRITER\b/.test(line.text)) {
      found.push({ issue: 'broken_text', problem: `leftover placeholder in "${line.text}"` })
    }
  }
  if (!found.length) return null
  return { issues: [...new Set(found.map((f) => f.issue))], problem: found.map((f) => f.problem).join('; ') }
}

function parseReply(content: unknown): Record<string, unknown> {
  const text = typeof content === 'string' ? content.trim() : ''
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no_json')
  return JSON.parse(text.slice(start, end + 1))
}

function userMessage(chat: JudgeChat): string {
  const all = [...new Set([...(chat.players ?? []), ...chat.lines.map((l) => l.from), chat.writer])]
  const lower = all.map((n) => n.toLowerCase())
  const twins = [...new Set(lower.filter((n, i) => lower.indexOf(n) !== i))]
  return [
    `PLAYERS: ${all.map((n) => (n === chat.writer ? `${n} (writer)` : n)).join(', ')}`,
    ...(twins.length ? [`NOTE: two different players are both called ${twins.join(', ')}; that alone is not self_reference.`] : []),
    `WRITER: ${chat.writer}`,
    `TITLE: ${chat.title}`,
    'CHAT:',
    ...chat.lines.map((l) => `${l.from}: ${l.text}`),
  ].join('\n')
}

/** Juzga un chat. Nunca lanza: si algo falla, `source: 'skipped'` y `ok: true`. */
export async function judgeChat(chat: JudgeChat, config: JudgeConfig): Promise<Verdict> {
  const started = Date.now()
  const base = { model: config.model, input_tokens: null, output_tokens: null }
  const fromCode = codeIssues(chat)
  if (fromCode) return { ...base, ok: false, situation: '', source: 'code', latency_ms: 0, ...fromCode }

  const openRouter = config.baseUrl.includes('openrouter.ai')
  const effort = config.effort ?? 'low'
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(config.timeoutMs ?? 4000),
      body: JSON.stringify({
        model: config.model,
        // Groq y la API de OpenAI: reasoning_effort; OpenRouter: reasoning.effort y el proveedor más rápido.
        ...(openRouter ? { reasoning: { effort }, provider: { sort: 'throughput' } } : { reasoning_effort: effort }),
        response_format: { type: 'json_object' },
        max_tokens: effort === 'low' ? 800 : 1500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage(chat) },
        ],
      }),
    })
    if (!response.ok) throw new Error(`${response.status} ${(await response.text().catch(() => '')).slice(0, 200)}`)
    const data = await response.json()
    const reply = parseReply(data.choices?.[0]?.message?.content)
    const text = (key: string) => (typeof reply[key] === 'string' ? (reply[key] as string).trim().slice(0, 200) : '')
    // Una reacción suelta ("?", "JAJAJA", "nooo", un emoji) siempre encaja aunque el modelo la señale.
    const odd = text('odd_message').replace(/^[^:]{1,30}:\s*/, '')
    if (odd.length <= 4 || !/\p{L}{3}/u.test(odd) || /^(j[aeiou]){2,}|^(h[ae]){2,}|^n+o+$|^lo+l$|^x+d+$/i.test(odd)) reply.odd_message = ''
    // La decisión se toma aquí, no en el modelo: con un "ok" suelto los modelos lo aprobaban todo.
    const linked = linkHolds(chat, text('link'))
    const issues = [
      ...(!linked ? ['off_topic_end'] : []),
      ...(text('odd_message') ? ['non_sequitur'] : []),
      ...(reply.has_hook === false ? ['no_hook'] : []),
    ]
    return {
      model: config.model,
      ok: issues.length === 0,
      issues,
      situation: `${text('setup')} -> ${text('ask')} (link: "${text('link')}")`,
      problem: [
        !linked ? `the chat is about "${text('setup')}" but the end asks about "${text('ask')}", which the chat never set up` : '',
        text('odd_message') ? `this message does not fit: "${text('odd_message')}"` : '',
        reply.has_hook === false ? 'the last message gives the writer nothing to answer' : '',
      ].filter(Boolean).join('; '),
      source: 'model',
      latency_ms: Date.now() - started,
      input_tokens: data.usage?.prompt_tokens ?? null,
      output_tokens: data.usage?.completion_tokens ?? null,
    }
  } catch (error) {
    return {
      ...base,
      ok: true,
      issues: [],
      situation: '',
      problem: `judge_skipped: ${String((error as Error)?.message ?? error).slice(0, 200)}`,
      source: 'skipped',
      latency_ms: Date.now() - started,
    }
  }
}

/** Texto para el reintento del generador. */
export function feedbackFor(verdict: Verdict): string {
  return `A reviewer rejected your previous chat (${verdict.issues.join(', ')}): ${verdict.problem || verdict.issues.join(', ')}. Write a new chat on the same theme that fixes this. Keep every other rule.`
}
