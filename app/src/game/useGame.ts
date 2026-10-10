// Punto único de acceso al juego desde la UI (T1 es dueño).
// Backend real (Supabase) si está configurado; mock con bots si no, o si la URL lleva `?mock=1`
// (plan B para la demo) o `VITE_GAME_BACKEND=mock`.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { supabaseConfigured } from '../lib/supabase'
import { createMockClient } from './mockClient'
import { createSupabaseClient } from './supabaseClient'
import type { GameClient } from './types'

const forceMock =
  import.meta.env.VITE_GAME_BACKEND === 'mock' || new URLSearchParams(location.search).has('mock')

export const backend: 'supabase' | 'mock' = supabaseConfigured && !forceMock ? 'supabase' : 'mock'
export const game: GameClient = backend === 'supabase' ? createSupabaseClient() : createMockClient()

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
