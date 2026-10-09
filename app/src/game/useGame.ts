// Punto único de acceso al juego desde la UI (T1 es dueño).
// Hoy siempre usa el mock. T1: cuando exista `supabaseClient.ts`, elegir por
// `import.meta.env.VITE_GAME_BACKEND === 'supabase'` y dejar el mock como respaldo en local.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { createMockClient } from './mockClient'
import type { GameClient } from './types'

export const game: GameClient = createMockClient()

let snapshot = game.getState()
game.subscribe((state) => {
  snapshot = state
})

export function useGame() {
  const state = useSyncExternalStore(
    (onChange) => game.subscribe(onChange),
    () => snapshot,
  )
  const me = state.room?.players.find((p) => p.id === state.meId) ?? null
  return { ...state, me, game }
}

/** Segundos que quedan hasta `endsAt` (epoch ms), actualizado 4 veces por segundo. */
export function useCountdown(endsAt: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt])
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0
}
