// GameClient real sobre Supabase (T1). Cumple el mismo contrato que mockClient: la UI no cambia.
//
// - Identidad: sesión anónima de Supabase, creada solo al crear/unirse a una sala.
// - Estado: siempre se pide entero con la RPC `get_room_state` (solo lo que este jugador puede ver).
// - Tiempo real: canal privado `room:<id>`; cada broadcast `room_changed` → volver a pedir el estado.
//   Red de seguridad: refresco cada 5 s y al volver a la pestaña (iOS suspende las pestañas en segundo plano).
// - Fases: cuando vence `phaseEndsAt`, el cliente pide `advance_phase` (el servidor decide; pg_cron también lo hace).

import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { GameClient, GameState, GroupType, Pack, Room, RoomSettings, Setup, SetupQuestion } from './types'
import { getLang } from '../i18n'
import type { Lang } from '../i18n'

const ROOM_KEY = 'typing.roomId'
const POLL_MS = 5000

const PACK_TO_VIBE: Record<Pack, string> = { uni: 'uni', spicy: 'spicy', dating: 'exes', moral: 'ethics' }
const VIBE_TO_PACK: Record<string, Pack> = { uni: 'uni', spicy: 'spicy', exes: 'dating', ethics: 'moral' }

const ERRORS: Record<Lang, Record<string, string>> = {
  en: {
    room_not_found: "That room doesn't exist. Check the code.",
    game_in_progress: 'That game already started. Wait for the next one.',
    room_full: 'That room is full.',
    kicked: 'You were removed from this room.',
    rejected: "The host didn't let you in.",
    not_enough_players: 'You need at least 3 players.',
    invalid_name: 'Pick a name (1–16 characters).',
    host_only: 'Only the host can do that.',
    not_in_room: "You're not in this room anymore.",
    already_answered: 'You already sent your answer.',
    already_voted: 'You already voted.',
    cannot_vote_own: "You can't vote for your own answer.",
    writer_cannot_vote: "It's your round. Just watch them guess.",
    not_writing_phase: 'Too late, time is up.',
    not_voting_phase: 'Voting is closed.',
    unknown: 'Something went wrong. Try again.',
  },
  es: {
    room_not_found: 'Esa sala no existe. Revisa el código.',
    game_in_progress: 'Esa partida ya ha empezado. Espera a la siguiente.',
    room_full: 'La sala está llena.',
    kicked: 'Te han sacado de esta sala.',
    rejected: 'El anfitrión no te ha dejado entrar.',
    not_enough_players: 'Hacen falta al menos 3 jugadores.',
    invalid_name: 'Elige un nombre (1–16 caracteres).',
    host_only: 'Solo el anfitrión puede hacer eso.',
    not_in_room: 'Ya no estás en esta sala.',
    already_answered: 'Ya has enviado tu respuesta.',
    already_voted: 'Ya has votado.',
    cannot_vote_own: 'No puedes votar tu propia respuesta.',
    writer_cannot_vote: 'Es tu ronda. Mira cómo intentan adivinar.',
    not_writing_phase: 'Tarde, se acabó el tiempo.',
    not_voting_phase: 'La votación está cerrada.',
    unknown: 'Algo ha fallado. Vuelve a intentarlo.',
  },
}

function friendly(message: string | undefined): string {
  const key = (message ?? '').split(':')[0]
  const errors = ERRORS[getLang()]
  return errors[key] ?? errors.unknown
}

function readRoomId(): string | null {
  try {
    return sessionStorage.getItem(ROOM_KEY)
  } catch {
    return null
  }
}

function writeRoomId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(ROOM_KEY, id)
    else sessionStorage.removeItem(ROOM_KEY)
  } catch {
    /* sin almacenamiento: la sala solo vive en memoria */
  }
}

type ServerRoom = Omit<Room, 'pack' | 'groupType'> & {
  roomId: string
  meId: string
  serverNow: number
  status: string
  version: number
  kicked?: boolean
  left?: boolean
  rejected?: boolean
  pending?: boolean
  hostName?: string | null
}

export function createSupabaseClient(): GameClient {
  if (!supabase) throw new Error('Supabase is not configured')
  const db = supabase

  const listeners = new Set<(state: GameState) => void>()
  let state: GameState = { room: null, meId: null, error: null }
  let roomId: string | null = readRoomId()
  let channel: RealtimeChannel | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let phaseTimer: ReturnType<typeof setTimeout> | null = null
  let requestSeq = 0
  let lastVersion = -1

  const emit = () => listeners.forEach((listener) => listener(state))
  const setState = (patch: Partial<GameState>) => {
    state = { ...state, ...patch }
    emit()
  }

  async function ensureSession() {
    const { data } = await db.auth.getSession()
    if (data.session) return
    const { error } = await db.auth.signInAnonymously()
    if (error) throw new Error(error.message)
  }

  async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await db.rpc(fn, args)
    if (error) throw new Error(error.message)
    return data as T
  }

  /** Ejecuta una acción; si falla, deja el mensaje en `state.error` (la UI lo muestra) sin lanzar. */
  async function act(fn: () => Promise<unknown>) {
    try {
      await fn()
      if (state.error) setState({ error: null })
      await refresh()
    } catch (e) {
      setState({ error: friendly((e as Error).message) })
    }
  }

  function toRoom(s: ServerRoom): Room {
    const setup = (s.setup ?? {}) as Setup
    const vibes = Array.isArray(setup.vibes) ? setup.vibes : []
    // Ajusta el reloj del servidor al del móvil para que la cuenta atrás no se desfase.
    const skew = Date.now() - s.serverNow
    return {
      code: s.code,
      phase: s.phase,
      roundIndex: s.roundIndex,
      totalRounds: s.totalRounds,
      phaseEndsAt: s.phaseEndsAt ? s.phaseEndsAt + skew : null,
      pack: VIBE_TO_PACK[vibes[0] as string] ?? 'uni',
      groupType: ((setup.who as GroupType | undefined) ?? 'friends') as GroupType,
      players: s.players,
      chat: s.chat ?? null,
      answers: s.answers ?? [],
      submittedIds: s.submittedIds ?? [],
      votedIds: s.votedIds ?? [],
      myVote: s.myVote ?? null,
      myLaughs: s.myLaughs ?? [],
      result: s.result ?? null,
      setup,
      settings: s.settings as RoomSettings,
      mimic: Boolean(s.mimic),
      pendingPlayers: s.pendingPlayers ?? [],
    }
  }

  function leaveLocally(error: string | null = null) {
    stopSync()
    roomId = null
    lastVersion = -1
    writeRoomId(null)
    state = { room: null, meId: null, error, pending: null }
    emit()
  }

  async function refresh() {
    if (!roomId) return
    const seq = ++requestSeq
    try {
      const s = await rpc<ServerRoom>('get_room_state', { p_room_id: roomId })
      if (seq !== requestSeq) return // llegó una respuesta más nueva
      if (s.kicked) return leaveLocally(ERRORS[getLang()].kicked)
      if (s.rejected) return leaveLocally(ERRORS[getLang()].rejected)
      if (s.left) return leaveLocally()
      if (s.pending) {
        // Sala con aprobación: esperando al host (sin ver nada de la sala)
        state = { ...state, room: null, meId: s.meId, pending: { code: s.code, hostName: s.hostName ?? null } }
        return emit()
      }
      lastVersion = s.version
      state = { ...state, room: toRoom(s), meId: s.meId, pending: null }
      emit()
      schedulePhaseTimer()
    } catch (e) {
      if (friendly((e as Error).message) === ERRORS[getLang()].not_in_room) leaveLocally()
    }
  }

  /** Cuando se acaba la fase, pide avanzar (con un poco de azar para no llamar todos a la vez). */
  function schedulePhaseTimer() {
    if (phaseTimer) clearTimeout(phaseTimer)
    phaseTimer = null
    const endsAt = state.room?.phaseEndsAt
    if (!endsAt || !roomId) return
    const wait = Math.max(0, endsAt - Date.now()) + 300 + Math.random() * 700
    const id = roomId
    phaseTimer = setTimeout(() => {
      void rpc<boolean>('advance_phase', { p_room_id: id })
        .catch(() => false)
        .then(() => refresh())
    }, wait)
  }

  async function startSync(id: string) {
    stopSync()
    roomId = id
    writeRoomId(id)
    await db.realtime.setAuth()
    channel = db
      .channel(`room:${id}`, { config: { private: true } })
      .on('broadcast', { event: 'room_changed' }, ({ payload }) => {
        if (typeof payload?.version !== 'number' || payload.version > lastVersion) void refresh()
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') return void refresh()
        console.warn('[realtime]', status, err?.message ?? '')
        // Canal caído (red móvil, token renovado…): reintentar; mientras tanto el sondeo cada 5 s mantiene el estado.
        if (status !== 'CLOSED' || roomId === id) {
          setTimeout(() => {
            if (roomId === id && channel?.state !== 'joined') void startSync(id)
          }, 3000)
        }
      })
    pollTimer = setInterval(() => void refresh(), POLL_MS)
    await refresh()
  }

  function stopSync() {
    if (channel) void db.removeChannel(channel)
    channel = null
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
    if (phaseTimer) clearTimeout(phaseTimer)
    phaseTimer = null
  }

  // Volver a la pestaña (iOS) → ponerse al día.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refresh()
    })
  }

  // Al cargar: si ya había sesión y sala (recarga), volver a ella. Sin sesión no se crea ningún usuario.
  void (async () => {
    const { data } = await db.auth.getSession()
    if (!data.session) return leaveLocally()
    if (!roomId) {
      const active = await rpc<{ room_id: string } | null>('get_my_active_room').catch(() => null)
      roomId = active?.room_id ?? null
    }
    if (roomId) await startSync(roomId)
  })()

  const roomArgs = () => ({ p_room_id: roomId })

  return {
    async createRoom(name, emoji) {
      try {
        await ensureSession()
        const r = await rpc<{ room_id: string }>('create_room', { p_name: name, p_emoji: emoji ?? null })
        // Idioma del host como contexto de la sala: la IA escribe los chats y el bot en ese idioma.
        await rpc('save_setup', { p_room_id: r.room_id, p_answers: { lang: getLang() } }).catch(() => {})
        setState({ error: null })
        await startSync(r.room_id)
      } catch (e) {
        setState({ error: friendly((e as Error).message) })
      }
    },
    async checkRoom(code) {
      try {
        const r = await rpc<{ ok: boolean; reason: string | null }>('check_room', { p_code: code })
        return r.ok ? { ok: true } : { ok: false, message: friendly(r.reason ?? 'room_not_found') }
      } catch {
        // Si la función aún no está desplegada o falla la red, no bloqueamos: join_room vuelve a comprobarlo
        return { ok: true }
      }
    },
    async joinRoom(code, name, emoji) {
      try {
        await ensureSession()
        const r = await rpc<{ room_id: string }>('join_room', { p_code: code, p_name: name, p_emoji: emoji ?? null })
        setState({ error: null })
        await startSync(r.room_id)
      } catch (e) {
        setState({ error: friendly((e as Error).message) })
      }
    },
    setOptions: (options) =>
      act(() => {
        const answers: Setup = {}
        if (options.pack) answers.vibes = [PACK_TO_VIBE[options.pack]]
        if (options.groupType) answers.who = options.groupType
        return rpc('save_setup', { ...roomArgs(), p_answers: answers })
      }),
    saveSetup: (answers) => act(() => rpc('save_setup', { ...roomArgs(), p_answers: { lang: getLang(), ...answers } })),
    updateSettings: (settings) => act(() => rpc('update_settings', { ...roomArgs(), p_settings: settings })),
    getSetupQuestions: () => rpc<SetupQuestion[]>('get_setup_questions').catch(() => []),
    kick: (playerId) => act(() => rpc('kick_player', { ...roomArgs(), p_player_id: playerId })),
    approve: (playerId) => act(() => rpc('approve_player', { ...roomArgs(), p_player_id: playerId })),
    reject: (playerId) => act(() => rpc('reject_player', { ...roomArgs(), p_player_id: playerId })),
    skipPhase: () => act(() => rpc('skip_phase', roomArgs())),
    endGame: () => act(() => rpc('end_game', roomArgs())),
    startGame: () => act(() => rpc('start_game', roomArgs())),
    submitAnswer: (text) => act(() => rpc('submit_answer', { ...roomArgs(), p_text: text })),
    castVote: (answerId) => act(() => rpc('cast_vote', { ...roomArgs(), p_answer_id: answerId })),
    react: (answerId) => act(() => rpc('react', { ...roomArgs(), p_answer_id: answerId })),
    // Pendiente en backend (T1): RPC `play_again(p_room_id)` → final → lobby, puntos a 0.
    // Mientras no exista, se sale al menú para que el botón no quede muerto.
    async playAgain() {
      try {
        await rpc('play_again', roomArgs())
        await refresh()
      } catch {
        if (roomId) await rpc('leave_room', roomArgs()).catch(() => {})
        leaveLocally()
      }
    },
    async leave() {
      if (roomId) await rpc('leave_room', { p_room_id: roomId }).catch(() => {})
      leaveLocally()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState: () => state,
  }
}
