// GameClient local, sin backend: estado en memoria, temporizadores y 3 bots.
// Sirve para construir y probar la UI (T2) mientras T1 hace Supabase.
// - createRoom: eres host; entran 3 bots y tú pulsas Start.
// - joinRoom: un bot es host y empieza solo a los 4 s.

import { generateRound, setupFromLobby, toAiPlayers, type AiPastRound } from '../content/ai'
import { buildChat, pickTemplates } from '../content/packs'
import { scoreRound } from './scoring'
import {
  MAX_ANSWER_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ROUNDS,
  MAX_VOTE_OPTIONS,
  MIN_PLAYERS,
  PHASE_SECONDS,
  PLAYER_COLORS,
} from './types'
import type { Answer, Chat, GameClient, GameState, Pack, Phase, Player, Room, RoundResult, Setup, SetupQuestion } from './types'
import { getLang } from '../i18n'

/** `crypto.randomUUID` solo existe en contextos seguros (https / localhost). En el móvil por la IP local
 *  (http://192.168.x.x:5173) no está, así que usamos un id aleatorio normal. */
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const BOT_NAMES = ['Marta', 'Laura', 'Pol']
const BOT_REPLIES = [
  'it was the cat bro',
  "I'll buy you 2 tomorrow ok",
  'skincare routine 💅',
  "who's asking",
  'no comment 🙃',
  'ask my lawyer',
  'lol',
  'I was sleepwalking',
]
// Respuestas de los bots cuando la interfaz está en castellano
const BOT_REPLIES_ES = ['fue el gato', 'mañana te compro dos', 'rutina de skincare 💅', '¿quién pregunta?', 'sin comentarios 🙃', 'habla con mi abogado', 'jajaja', 'estaba sonámbulo']

// Sin IA, el contexto elige el pack de chats de respaldo más parecido.
const PACK_BY_SITUATION: Record<string, Pack> = {
  party: 'spicy',
  drinks: 'spicy',
  dinner: 'moral',
  home: 'dating',
  trip: 'moral',
  break: 'uni',
}

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5)
const randomCode = () => Array.from({ length: 4 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''))).join('')

// Copia local del catálogo de game.setup_questions (el real viene de Supabase).
const MOCK_QUESTIONS: SetupQuestion[] = [
  { id: 'who', label: "Who's playing?", kind: 'single', required: false, rules: {}, options: [
    { value: 'students', label: 'Students', emoji: '🎓' }, { value: 'friends', label: 'Friends', emoji: '👯' },
    { value: 'coworkers', label: 'Coworkers', emoji: '💼' }, { value: 'family', label: 'Family', emoji: '🏠' },
    { value: 'couples', label: 'Couples', emoji: '💘' } ] },
  { id: 'age', label: 'Age range', kind: 'single', required: false, rules: {}, options: [
    { value: 'under_18', label: 'Under 18' }, { value: '18_24', label: '18–24' }, { value: '25_34', label: '25–34' },
    { value: '35_plus', label: '35+' }, { value: 'mixed', label: 'Mixed' } ] },
  { id: 'vibes', label: 'What should the chats be about?', kind: 'multi', required: false, rules: {}, options: [
    { value: 'spicy', label: 'Spicy', emoji: '🌶️' }, { value: 'exes', label: 'Exes & dating', emoji: '💔' },
    { value: 'ethics', label: 'Moral dilemmas', emoji: '⚖️' }, { value: 'uni', label: 'Uni life', emoji: '📚' },
    { value: 'work', label: 'Work drama', emoji: '🏢' }, { value: 'chaos', label: 'Pure chaos', emoji: '🌀' } ] },
  { id: 'topic', label: 'Or write your own topic', kind: 'text', required: false, rules: { max_length: 120 }, options: [] },
]

interface Option {
  id: string
  text: string
  authorId: string
  isReal: boolean
}

export function createMockClient(): GameClient {
  const listeners = new Set<(state: GameState) => void>()
  let timers: ReturnType<typeof setTimeout>[] = []

  let meId: string | null = null
  let code = ''
  let phase: Phase = 'lobby'
  let pack: Pack = 'uni'
  let groupType: Room['groupType'] = 'friends'
  let players: Player[] = []
  let roundIndex = 0
  let totalRounds = 0
  let phaseEndsAt: number | null = null
  let writerOrder: string[] = []
  let chats: Chat[] = []
  let submissions: Record<string, string> = {}
  let options: Option[] = []
  let votes: Record<string, string> = {}
  let laughs: Record<string, string[]> = {}
  let result: RoundResult | null = null
  let error: string | null = null
  let setup: Setup = {}

  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
  const clearTimers = () => {
    timers.forEach(clearTimeout)
    timers = []
  }

  const writerId = () => writerOrder[roundIndex]
  const bots = () => players.filter((p) => p.id !== meId)

  function getState(): GameState {
    if (!meId) return { room: null, meId: null, error }
    const answers: Answer[] =
      phase === 'voting' ? options.map((o) => ({ id: o.id, text: o.text, mine: o.authorId === meId })) : []
    const room: Room = {
      code,
      phase,
      roundIndex,
      totalRounds,
      phaseEndsAt,
      pack,
      groupType,
      players,
      chat: ['writing', 'voting', 'reveal'].includes(phase) ? chats[roundIndex] : null,
      answers,
      submittedIds: Object.keys(submissions),
      votedIds: Object.keys(votes),
      myVote: votes[meId] ?? null,
      myLaughs: Object.keys(laughs).filter((id) => laughs[id].includes(meId!)),
      result: phase === 'reveal' || phase === 'leaderboard' ? result : null,
      setup,
    }
    return { room, meId, error }
  }

  const emit = () => {
    const state = getState()
    listeners.forEach((listener) => listener(state))
  }

  function addPlayer(name: string, isHost: boolean): Player {
    const player: Player = {
      id: newId(),
      name: name.trim().slice(0, MAX_NAME_LENGTH),
      color: PLAYER_COLORS[players.length % PLAYER_COLORS.length],
      score: 0,
      isHost,
    }
    players = [...players, player]
    return player
  }

  function setPhase(next: Phase, seconds: number | null, onEnd?: () => void) {
    clearTimers()
    phase = next
    phaseEndsAt = seconds ? Date.now() + seconds * 1000 : null
    if (seconds && onEnd) later(seconds * 1000, onEnd)
  }

  function startWriting() {
    submissions = {}
    votes = {}
    laughs = {}
    options = []
    result = null
    setPhase('writing', PHASE_SECONDS.writing, startVoting)
    for (const bot of bots()) {
      later(2000 + Math.random() * 6000, () => submit(bot.id, pick(getLang() === 'es' ? BOT_REPLIES_ES : BOT_REPLIES)))
    }
    emit()
  }

  function submit(playerId: string, text: string) {
    if (phase !== 'writing' || submissions[playerId] !== undefined) return
    submissions = { ...submissions, [playerId]: text.trim().slice(0, MAX_ANSWER_LENGTH) || '…' }
    if (Object.keys(submissions).length === players.length) startVoting()
    else emit()
  }

  function startVoting() {
    const writer = writerId()
    const textOf = (id: string) => submissions[id] ?? '…'
    // Siempre incluimos la mía si soy impostor, para poder ver que no se puede votar.
    const impostors = shuffle(players.filter((p) => p.id !== writer).map((p) => p.id))
    const chosen = impostors.slice(0, MAX_VOTE_OPTIONS - 2) // el mock no tiene bot Mimic: real + 4 impostores
    options = shuffle([
      { id: 'real', text: textOf(writer), authorId: writer, isReal: true },
      ...chosen.map((id) => ({ id: `a-${id}`, text: textOf(id), authorId: id, isReal: false })),
    ]).map((o, i) => ({ ...o, id: `opt-${i}` }))
    recordRoundForAi()

    setPhase('voting', PHASE_SECONDS.voting, startReveal)
    for (const bot of bots().filter((b) => b.id !== writer)) {
      later(1500 + Math.random() * 6000, () => {
        const choices = options.filter((o) => o.authorId !== bot.id)
        vote(bot.id, pick(choices).id)
      })
    }
    emit()
  }

  function vote(voterId: string, answerId: string) {
    const option = options.find((o) => o.id === answerId)
    if (phase !== 'voting' || !option || option.authorId === voterId || voterId === writerId()) return
    votes = { ...votes, [voterId]: answerId }
    if (Object.keys(votes).length === players.length - 1) startReveal()
    else emit()
  }

  function laugh(voterId: string, answerId: string) {
    if (phase !== 'voting') return
    const current = laughs[answerId] ?? []
    if (current.includes(voterId)) return
    laughs = { ...laughs, [answerId]: [...current, voterId] }
    emit()
  }

  function startReveal() {
    const writer = players.find((p) => p.id === writerId())!
    result = scoreRound({ writer, players, options, votes, laughs })
    recordVotesForAi(result)
    players = players.map((p) => ({ ...p, score: p.score + (result!.points[p.id] ?? 0) }))
    setPhase('reveal', PHASE_SECONDS.reveal, () => {
      // La clasificación espera a que alguien pulse "Next round" (skipPhase). Si el host es un bot, pulsa él.
      setPhase('leaderboard', null)
      if (!players.find((p) => p.id === meId)?.isHost) later(5000, nextRound)
      emit()
    })
    emit()
  }

  function nextRound() {
    if (phase !== 'leaderboard') return
    if (roundIndex + 1 < totalRounds) {
      roundIndex += 1
      startWriting()
    } else {
      setPhase('final', null)
      emit()
    }
  }

  // ── IA ronda a ronda (mismo flujo que SPEC › IA): ronda 1 al pulsar Start, ronda N+1 al empezar la
  // votación de la N, con el historial y la memoria. Si no llega a tiempo, se queda el chat de packs.ts.
  let starting = false
  let gameId = 0
  let aiMemory: unknown = null
  let history: AiPastRound[] = []

  async function requestRound(index: number, timeoutMs: number): Promise<Chat | null> {
    const game = gameId
    const ai = await generateRound(
      {
        round: index + 1,
        total_rounds: totalRounds,
        setup: { ...setupFromLobby(pack, groupType), ...setup }, // lo que eligió el host manda
        players: toAiPlayers(players),
        writer_id: writerOrder[index],
        history: structuredClone(history),
        memory: aiMemory,
      },
      timeoutMs,
    )
    if (!ai || game !== gameId) return null
    aiMemory = ai.memory
    return ai.chat
  }

  /** Lo que aprende la IA de esta ronda: respuestas reales y falsas (los votos llegan en startReveal). */
  function recordRoundForAi() {
    const writer = writerId()
    history.push({
      round: roundIndex + 1,
      writer_id: writer,
      title: chats[roundIndex].title,
      messages: chats[roundIndex].messages.map((m) => ({ player_id: m.playerId, text: m.text })),
      real_answer: submissions[writer] ?? '…',
      fakes: players.filter((p) => p.id !== writer).map((p) => ({ player_id: p.id, text: submissions[p.id] ?? '…' })),
    })
    const next = roundIndex + 1
    if (next >= totalRounds) return
    const game = gameId
    void requestRound(next, 15000).then((chat) => {
      if (chat && game === gameId && roundIndex < next) chats[next] = chat
    })
  }

  function recordVotesForAi(round: RoundResult) {
    const entry = history[history.length - 1]
    if (!entry) return
    const byAuthor = new Map(round.answers.map((a) => [a.authorId, a]))
    entry.found_by = round.answers.find((a) => a.isReal)?.voterIds.length ?? 0
    entry.fakes = entry.fakes.map((f) => ({ ...f, fooled: byAuthor.get(f.player_id)?.voterIds.length ?? 0 }))
    entry.laughs = Object.fromEntries(round.answers.map((a) => [a.authorId, a.laughs]))
  }

  async function begin() {
    if (players.length < MIN_PLAYERS) {
      error = getLang() === 'es' ? `Hacen falta al menos ${MIN_PLAYERS} jugadores.` : `You need at least ${MIN_PLAYERS} players.`
      emit()
      return
    }
    if (starting) return
    starting = true
    error = null
    gameId += 1
    history = []
    aiMemory = null
    totalRounds = Math.min(players.length, MAX_ROUNDS)
    writerOrder = shuffle(players.map((p) => p.id)).slice(0, totalRounds)
    // Respaldo para todas las rondas; la IA los va sustituyendo si llega a tiempo.
    chats = pickTemplates(pack, totalRounds).map((template, i) => {
      const writer = players.find((p) => p.id === writerOrder[i])!
      return buildChat(template, writer, shuffle(players.filter((p) => p.id !== writer.id)))
    })
    const first = await requestRound(0, 6000)
    starting = false
    if (players.length === 0 || phase !== 'lobby') return // salió de la sala mientras se generaba
    if (first) chats[0] = first
    roundIndex = 0
    startWriting()
  }

  function reset() {
    gameId += 1
    clearTimers()
    meId = null
    players = []
    phase = 'lobby'
    phaseEndsAt = null
    roundIndex = 0
    result = null
    error = null
    setup = {}
    pack = 'uni'
  }

  return {
    async createRoom(name) {
      reset()
      code = randomCode()
      meId = addPlayer(name, true).id
      emit()
      BOT_NAMES.forEach((botName, i) =>
        later(600 * (i + 1), () => {
          addPlayer(botName, false)
          emit()
        }),
      )
    },
    // Mock: cualquier código de 4 letras es una sala con bots (útil para probar sin backend)
    async checkRoom(roomCode) {
      return /^[A-Za-z]{4}$/.test(roomCode.trim()) ? { ok: true } : { ok: false, message: 'Room not found' }
    },
    async joinRoom(roomCode, name) {
      reset()
      code = roomCode.toUpperCase()
      addPlayer(BOT_NAMES[0], true)
      meId = addPlayer(name, false).id
      addPlayer(BOT_NAMES[1], false)
      addPlayer(BOT_NAMES[2], false)
      emit()
      later(4000, begin)
    },
    async setOptions(options) {
      if (phase !== 'lobby') return
      pack = options.pack ?? pack
      groupType = options.groupType ?? groupType
      emit()
    },
    async saveSetup(answers) {
      setup = { ...setup, ...answers }
      const situation = setup.situation
      if (typeof situation === 'string' && PACK_BY_SITUATION[situation]) pack = PACK_BY_SITUATION[situation]
      emit()
    },
    async playAgain() {
      if (phase !== 'final') return
      players = players.map((p) => ({ ...p, score: 0 }))
      roundIndex = 0
      result = null
      setPhase('lobby', null)
      emit()
      // Si el host es un bot (entraste con código), vuelve a empezar solo
      if (!players.find((p) => p.id === meId)?.isHost) later(4000, begin)
    },
    async startGame() {
      if (phase === 'lobby') await begin()
    },
    async updateSettings() {},
    async getSetupQuestions() {
      return MOCK_QUESTIONS
    },
    async kick(playerId) {
      if (phase !== 'lobby' || playerId === meId) return
      players = players.filter((p) => p.id !== playerId)
      emit()
    },
    async skipPhase() {
      const timer = timers.at(-1)
      if (timer) clearTimeout(timer)
      if (phase === 'writing') startVoting()
      else if (phase === 'voting') startReveal()
      else if (phase === 'leaderboard') nextRound()
    },
    async endGame() {
      setPhase('final', null)
      emit()
    },
    async submitAnswer(text) {
      if (meId) submit(meId, text)
    },
    async castVote(answerId) {
      if (meId) vote(meId, answerId)
    },
    async react(answerId) {
      if (meId) laugh(meId, answerId)
    },
    async leave() {
      reset()
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState,
  }
}
