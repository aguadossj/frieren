// Contrato compartido entre UI (T2), backend (T1) y contenido (T3).
// Solo T1 lo cambia, avisando al equipo. La UI solo habla con `GameClient`.

export type Phase = 'lobby' | 'writing' | 'voting' | 'reveal' | 'leaderboard' | 'final'
export type Pack = 'uni' | 'spicy' | 'dating' | 'moral'
export type GroupType = 'students' | 'friends' | 'coworkers' | 'family'

export const PHASE_SECONDS = { writing: 25, voting: 15, reveal: 8, leaderboard: 4 } as const
export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 8
export const MAX_ROUNDS = 5
export const MAX_ANSWER_LENGTH = 80
export const MAX_NAME_LENGTH = 16
export const MAX_VOTE_OPTIONS = 5

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
}

export interface GameState {
  room: Room | null
  meId: string | null
  error: string | null
}

export interface GameClient {
  createRoom(name: string): Promise<void>
  joinRoom(code: string, name: string): Promise<void>
  setOptions(options: { pack?: Pack; groupType?: GroupType }): Promise<void> // solo host, en lobby
  startGame(): Promise<void> // solo host, ≥ MIN_PLAYERS
  submitAnswer(text: string): Promise<void>
  castVote(answerId: string): Promise<void>
  react(answerId: string): Promise<void> // 😂
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
