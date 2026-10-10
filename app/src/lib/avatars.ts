// Avatares de panda (app/public/avatars/panda-01…20.webp, recortados de design-refs/avatars.png).
// Cada sala baraja los 20 con su código como semilla y cada jugador recibe el de su orden de entrada
// (el índice de su color, que el servidor asigna en orden y sin repetir). Así es aleatorio por sala,
// igual en todos los móviles y sin repetidos dentro de la sala, sin tocar el backend ni el contrato.
import { PLAYER_COLORS } from '../game/types'
import type { Player } from '../game/types'

export interface PandaAvatar {
  src: string
  color: string // color del círculo del avatar: es el color del jugador en el resto de la interfaz
}

const COLORS = [
  '#226EEE', '#07A061', '#6A3EF2', '#101010', '#F77901', '#08ACA1', '#F3B502', '#FB418D', '#94805F', '#3F0C4F',
  '#576922', '#D22C1A', '#055D54', '#047F89', '#343D90', '#D5F505', '#F91542', '#171E67', '#085355', '#DA4B02',
]

export const AVATARS: PandaAvatar[] = COLORS.map((color, i) => ({
  src: `/avatars/panda-${String(i + 1).padStart(2, '0')}.webp`,
  color,
}))

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 2166136261)

/** Permutación de 0..n-1 determinista para una semilla (mulberry32 + Fisher-Yates). */
function shuffled(n: number, seed: string): number[] {
  let a = hash(seed) || 1
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const cache = new Map<string, number[]>()

export function avatarFor(roomCode: string, player: Pick<Player, 'color'> & { id?: string; name?: string }): PandaAvatar {
  if (!cache.has(roomCode)) cache.set(roomCode, shuffled(AVATARS.length, roomCode || 'typing'))
  const order = cache.get(roomCode)!
  const slot = PLAYER_COLORS.indexOf(player.color as (typeof PLAYER_COLORS)[number])
  const index = slot >= 0 ? slot : hash(player.id ?? player.name ?? '') % AVATARS.length
  return AVATARS[order[index % AVATARS.length]]
}

/** Para texto sobre fondo blanco: si el color del avatar es muy claro (lima, amarillo), usar negro. */
export function readableOnWhite(color: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#111111' : color
}

/** Para texto blanco sobre el color del avatar: negro si el fondo es muy claro. */
export function textOn(color: string): string {
  return readableOnWhite(color) === color ? '#ffffff' : '#111111'
}
