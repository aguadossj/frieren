// Chats de respaldo (T3 es dueño). Se usan si no hay IA, si falla o si tarda.
// Objetivo: ≥ 30 plantillas repartidas entre packs.
//
// Formato de plantilla:
// - `who`: índice en la lista de "otros jugadores" (se hace módulo con su número), o 'writer'.
// - `{writer}` en el texto se sustituye por el nombre del jugador que escribe esta ronda.
// - El último mensaje debe ser una pregunta directa al writer: es lo que tiene que contestar.

import type { Chat, Pack, Player } from '../game/types'

export interface ChatTemplate {
  pack: Pack
  title: string
  lines: { who: number | 'writer'; text: string }[]
}

export const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    pack: 'uni',
    title: 'Piso 3B',
    lines: [
      { who: 0, text: 'who ate my yogurt 😤' },
      { who: 1, text: '{writer} has yogurt on his face' },
      { who: 0, text: '{writer}?? explain' },
    ],
  },
  {
    pack: 'uni',
    title: 'Group project 📚',
    lines: [
      { who: 0, text: 'deadline is in 3 hours' },
      { who: 1, text: 'I did the intro and the conclusion' },
      { who: 0, text: '{writer} what did you do exactly' },
    ],
  },
  {
    pack: 'spicy',
    title: 'Saturday plans 🍸',
    lines: [
      { who: 0, text: 'who went home with who last night' },
      { who: 1, text: 'not saying anything 🤐' },
      { who: 0, text: '{writer} you disappeared at 3am. where were you' },
    ],
  },
  {
    pack: 'spicy',
    title: 'The squad',
    lines: [
      { who: 1, text: 'your ex just liked my story' },
      { who: 0, text: 'NO WAY' },
      { who: 1, text: '{writer} should I reply or not' },
    ],
  },
  {
    pack: 'dating',
    title: 'Besties 💅',
    lines: [
      { who: 0, text: 'he replied "k" after I sent a paragraph' },
      { who: 1, text: 'red flag 🚩' },
      { who: 0, text: '{writer} what would you text back' },
    ],
  },
  {
    pack: 'moral',
    title: 'Dinner group',
    lines: [
      { who: 0, text: 'found a wallet with 200€ on the bus' },
      { who: 1, text: 'there is an ID inside' },
      { who: 0, text: '{writer} honestly what would you do' },
    ],
  },
]

/** Construye un chat concreto para una ronda a partir de una plantilla y los jugadores reales. */
export function buildChat(template: ChatTemplate, writer: Player, others: Player[]): Chat {
  const pool = others.length > 0 ? others : [writer]
  return {
    title: template.title,
    writerId: writer.id,
    messages: template.lines.map((line) => ({
      playerId: line.who === 'writer' ? writer.id : pool[line.who % pool.length].id,
      text: line.text.replaceAll('{writer}', writer.name),
    })),
  }
}

/** Elige plantillas del pack (sin repetir mientras haya), rellenando con otros packs si faltan. */
export function pickTemplates(pack: Pack, count: number): ChatTemplate[] {
  const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5)
  const own = shuffle(CHAT_TEMPLATES.filter((t) => t.pack === pack))
  const rest = shuffle(CHAT_TEMPLATES.filter((t) => t.pack !== pack))
  const all = [...own, ...rest]
  return Array.from({ length: count }, (_, i) => all[i % all.length])
}
