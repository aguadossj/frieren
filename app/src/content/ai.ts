// IA ronda a ronda en modo mock (T3). En producción la genera la Edge Function `generate-round` desde la base;
// aquí el mock llama a /api/generate-round, que en `npm run dev` sirve el mismo núcleo
// (supabase/functions/generate-round/core.ts, ver app/vite.config.ts). Nunca lanza: null = usar packs.ts.
// Los tipos se copian de core.ts a propósito: app/ no debe importar nada de supabase/ (rompería el build en Vercel).

import type { Chat, GroupType, Pack, Player } from '../game/types'

export interface AiSetup {
  who?: string | null
  age?: string | null
  vibes?: string[] | null
  topic?: string | null
}

export interface AiPastRound {
  round: number
  writer_id: string
  title: string
  messages: { player_id: string; text: string }[]
  real_answer: string
  fakes: { player_id: string; text: string; fooled?: number }[]
  found_by?: number
  laughs?: Record<string, number>
}

export interface AiRoundRequest {
  round: number // 1-based
  total_rounds: number
  setup: AiSetup
  players: { id: string; name: string }[]
  writer_id: string
  history: AiPastRound[]
  memory: unknown // rooms.memory: lo devuelve la IA y se le reenvía tal cual
}

export interface AiRound {
  chat: Chat
  memory: unknown
}

// El lobby del mock aún usa pack + groupType; se traducen al `setup` de la base (setup_questions).
const PACK_VIBES: Record<Pack, string> = { uni: 'uni', spicy: 'spicy', dating: 'exes', moral: 'ethics' }

export function setupFromLobby(pack: Pack, groupType: GroupType): AiSetup {
  return { who: groupType, vibes: [PACK_VIBES[pack]] }
}

export function toAiPlayers(players: Player[]) {
  return players.map((p) => ({ id: p.id, name: p.name }))
}

export async function generateRound(request: AiRoundRequest, timeoutMs: number): Promise<AiRound | null> {
  try {
    const res = await fetch('/api/generate-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify(request),
    })
    if (!res.ok) throw new Error(`generate-round ${res.status}`)
    const { chat, memory } = (await res.json()) as {
      chat: { title: string; writer_id: string; messages: { player_id: string; text: string }[] }
      memory: unknown
    }
    return {
      chat: {
        title: chat.title,
        writerId: chat.writer_id,
        messages: chat.messages.map((m) => ({ playerId: m.player_id, text: m.text })),
      },
      memory,
    }
  } catch (error) {
    console.info(`AI round ${request.round} unavailable, using packs:`, error)
    return null
  }
}
