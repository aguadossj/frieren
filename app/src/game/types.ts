// Contrato compartido entre UI (T2), backend (T1) y contenido (T3).
// Solo T1 lo cambia, avisando al equipo. La UI solo habla con `GameClient`.

// 'generating' = la IA prepara la ronda (solo con IA activada; si tarda, entra una conversación de respaldo).
export type Phase = 'lobby' | 'generating' | 'writing' | 'voting' | 'reveal' | 'leaderboard' | 'final'
export type Pack = 'uni' | 'spicy' | 'dating' | 'moral'
export type GroupType = 'students' | 'friends' | 'coworkers' | 'family'

export const PHASE_SECONDS = { writing: 45, voting: 25, reveal: 12, leaderboard: 4 } as const // valores por defecto del backend
export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 8
export const MAX_ROUNDS = 5
export const MAX_ANSWER_LENGTH = 80
export const MAX_NAME_LENGTH = 16
export const MAX_VOTE_OPTIONS = 6 // real + hasta 4 impostores + el bot Mimic si está activado
export const MIMIC_AUTHOR_ID = 'mimic'

export const POINTS = {
  foundReal: 200, // votar la respuesta real
  writerPerFinder: 100, // Pol, por cada amigo que le reconoce
  impostorPerFooled: 150, // impostor, por cada voto que engañó
  perLaugh: 50, // por cada 😂 recibido
} as const

export interface Player {
  id: string
  name: string
  color: string // color de avatar, asignado por orden de entrada (ver PLAYER_COLORS)
  score: number
  isHost: boolean
  emoji?: string
}

export interface ChatMessage {
  playerId: string
  text: string
}

/** Chat de la ronda. No incluye el último mensaje del writer: eso es lo que se adivina. */
export interface Chat {
  title: string // nombre del grupo, p. ej. "Piso 3B"
  messages: ChatMessage[]
  writerId: string
}

/** Opción de voto. Anónima: el autor solo se conoce en `RoundResult`. */
export interface Answer {
  id: string
  text: string
  mine: boolean // la escribí yo (no se puede votar)
}

export interface AnswerResult {
  id: string
  text: string
  authorId: string
  isReal: boolean
  isBot?: boolean // respuesta del bot "Mimic" (authorId = 'mimic'); quien la votó pierde puntos
  voterIds: string[]
  laughs: number
}

export interface RoundResult {
  answers: AnswerResult[]
  points: Record<string, number> // playerId -> puntos ganados esta ronda
  award: string // "Best Pol impression: Laura"
}

export interface Room {
  code: string // 4 letras, p. ej. "KRSP"
  phase: Phase
  roundIndex: number // 0-based
  totalRounds: number
  phaseEndsAt: number | null // epoch ms; null en lobby/final
  pack: Pack
  groupType: GroupType
  players: Player[]
  chat: Chat | null // writing/voting/reveal
  answers: Answer[] // solo en voting (barajadas, máx. MAX_VOTE_OPTIONS)
  submittedIds: string[] // quién ha enviado respuesta (writing)
  votedIds: string[] // quién ha votado (voting)
  myVote: string | null
  myLaughs: string[] // answerIds a los que he dado 😂
  result: RoundResult | null // reveal/leaderboard
  setup?: Setup // contexto para la IA (preguntas iniciales); lo edita el host
  settings?: RoomSettings
  pendingPlayers?: PendingPlayer[] // solo el host: solicitudes para entrar (sala con aprobación)
  mimic?: boolean // hay un bot IA escondido entre las respuestas (avisar en lobby y votación)
}

/** Respuestas a las preguntas iniciales: { who: 'students', age: '18_24', vibes: ['spicy'], topic: '...' }. */
export type Setup = Record<string, string | string[] | number | null>

export interface RoomSettings {
  rounds: number | null // null = una por jugador
  writing_seconds: number
  voting_seconds: number
  reveal_seconds: number
  leaderboard_seconds: number
  max_players: number
  mimic?: boolean // el host activa el bot "Mimic" con updateSettings({ mimic: true })
  require_approval?: boolean // sala privada: el host acepta a cada persona que quiere entrar
  host_advance?: boolean // por defecto true: tras cada ronda se espera a que el host pulse "siguiente" (skipPhase)
}

/** Pregunta inicial del catálogo (tabla game.setup_questions). */
export interface SetupQuestion {
  id: string
  label: string
  kind: 'single' | 'multi' | 'text' | 'scale'
  options: { value: string; label: string; emoji?: string }[]
  required: boolean
  rules: Record<string, unknown>
}

export interface GameState {
  room: Room | null
  meId: string | null
  error: string | null
  /** Sala con aprobación: he pedido entrar y espero a que el host me acepte (room = null mientras tanto). */
  pending?: { code: string; hostName: string | null } | null
}

/** Solicitud para entrar en una sala con aprobación (solo la ve el host). */
export interface PendingPlayer {
  id: string
  name: string
  emoji?: string
}

export interface GameClient {
  createRoom(name: string, emoji?: string): Promise<void>
  joinRoom(code: string, name: string, emoji?: string): Promise<void>
  /** Antes de pedir el nombre: ¿se puede entrar con este código? `message` ya traducido si no. */
  checkRoom(code: string): Promise<{ ok: boolean; message?: string }>
  setOptions(options: { pack?: Pack; groupType?: GroupType }): Promise<void> // atajo: guarda en `setup` (who/vibes)
  // Host
  saveSetup(answers: Setup): Promise<void> // contexto para la IA; en lobby y en partida (aplica a la siguiente ronda)
  updateSettings(settings: Partial<RoomSettings>): Promise<void>
  getSetupQuestions(): Promise<SetupQuestion[]>
  kick(playerId: string): Promise<void>
  approve(playerId: string): Promise<void> // sala con aprobación: dejar entrar
  reject(playerId: string): Promise<void> // sala con aprobación: no dejar entrar (no puede volver a pedirlo)
  skipPhase(): Promise<void>
  endGame(): Promise<void>
  startGame(): Promise<void> // solo host, ≥ MIN_PLAYERS
  submitAnswer(text: string): Promise<void>
  castVote(answerId: string): Promise<void>
  react(answerId: string): Promise<void> // 😂
  playAgain(): Promise<void> // en `final`: la sala vuelve a `lobby` con los mismos jugadores y puntos a 0
  leave(): Promise<void>
  subscribe(listener: (state: GameState) => void): () => void
  getState(): GameState
}

// Colores de avatar sin rojo (el fondo de la app es rojo). Ver design-refs/STYLE.md.
export const PLAYER_COLORS = [
  '#1E6BFF', // blue
  '#00B060', // green
  '#6B3BFF', // violet
  '#111111', // black
  '#FF8A00', // orange
  '#00B8A9', // teal
  '#F5B700', // yellow
  '#FF4FA3', // pink
] as const
