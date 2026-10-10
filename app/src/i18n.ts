// Idioma de la interfaz (EN/ES). Se guarda en el móvil y por defecto sigue al idioma del sistema.
// Uso: `const t = useT()` → `t.createRoom`, `t.youreIn(name)`. Cambiar: `setLang('es')`.
import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'es'
const KEY = 'typing.lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    /* sin almacenamiento: seguimos con el del sistema */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

let current: Lang = initial()
const listeners = new Set<() => void>()
if (typeof document !== 'undefined') document.documentElement.lang = current

export function setLang(lang: Lang) {
  if (lang === current) return
  current = lang
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    /* ignorar */
  }
  document.documentElement.lang = lang
  listeners.forEach((l) => l())
}

export const getLang = () => current

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

export function useT() {
  return STRINGS[useLang()]
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const en = {
  // Portada
  tagline: 'Live bluffing party game',
  pitch1: 'Your friends fake your replies.',
  pitch2: 'Spot the real one.',
  steps: [
    ['Get a message', 'The group chat asks you something.'],
    ['Everyone fakes it', 'Friends copy how you text.'],
    ['Spot the real one', 'Vote. Fool them. Score.'],
  ] as [string, string][],
  createRoom: 'Create room',
  joinWithCode: 'Join with code',
  back: 'Back',
  next: 'Next',
  // Crear sala
  newRoom1: 'New room · 1/2',
  setUpGame: 'Set up your game',
  setUpSub: 'The AI writes your group chats from this.',
  yourName: 'Your name',
  namePlaceholderHost: 'e.g. Pol',
  namePlaceholderGuest: 'e.g. Laura',
  situationLabel: 'What’s going on right now?',
  situationPlaceholder: 'Friday drinks at Pol’s flat. Someone just spilled wine on the sofa…',
  situationHint: 'Where you are, who’s there, what just happened.',
  openingRoom: 'Opening your room…',
  quickOnes: '4 quick ones. Swipe.',
  cards: {
    know: { question: 'Do you all know each other well?', no: 'Not really', yes: 'Besties' },
    adults: { question: 'Is everyone over 18?', no: 'No', yes: 'Yes' },
    spicy: { question: 'Can the chats get spicy?', no: 'Keep it clean', yes: 'Spicy' },
    mimic: { question: 'Let an AI hide among your answers?', hint: 'Vote for it and you lose points.', no: 'No AI', yes: 'Bring it' },
  },
  // Unirse
  joinARoom: 'Join a room',
  gotACode: 'Got a code?',
  gotACodeSub: 'It’s on the host’s screen. Or just scan their QR.',
  roomCode: 'Room code',
  invitedTo: 'You’re invited to',
  you: 'You',
  youLower: 'you',
  joiningChat: 'is joining the chat…',
  typeYourName: 'type your name below',
  joinRoom: 'Join room',
  joining: 'Joining',
  changeCode: 'Change code',
  // Sala
  leaveRoom: 'Leave room',
  copyLink: 'Copy invite link',
  linkCopied: 'Link copied',
  players: (n: number) => `Players · ${n}`,
  aiHiding: 'An AI is hiding among the answers',
  youreIn: (name: string) => `You’re in, ${name}!`,
  hostsRoom: (host: string) => `${host}’s room`,
  startGame: 'Start game',
  needMore: (n: number) => `Need ${n} more`,
  needMorePanda: (n: number) => `Need ${plural(n, 'more player', 'more players')}. Send them the code!`,
  waitingPanda: (host: string) => `Waiting for ${host} to start. Warm up those thumbs.`,
  theHost: 'the host',
  hostTag: 'host',
  // Chat
  hintWriter: (name: string) => `You’re ${name} · say it for real`,
  hintFaker: (name: string) => `Fool them · write like ${name}`,
  sentAs: (name: string) => `Sent as ${name}`,
  waitingOthers: (done: number, total: number) => `Waiting for others ${done}/${total}`,
  messageAs: (name: string) => `Message as ${name}`,
  send: 'Send',
  generatingTitle: 'Reading your group chat…',
  generatingSub: 'The AI is cooking up the next conversation.',
  // Votación
  whichIsReal: (name: string) => `Which one is the real ${name}?`,
  aiAmongThese: 'One of these is an AI. Avoid it.',
  yours: 'YOURS',
  huntingYou: (done: number, total: number) => `They’re hunting you · ${done}/${total}`,
  locked: (done: number, total: number) => `Locked · ${done}/${total} voted`,
  lockVote: 'Lock vote',
  tapTheReal: 'Tap the real one',
  // Revelación
  theRealSaid: (name: string) => `The real ${name} said…`,
  round: (n: number) => `Round ${n}`,
  nobodyGotIt: 'Nobody got it',
  tooEasy: 'Too easy',
  fooled: (n: number) => `${n} fooled`,
  youPoints: (n: number) => `You +${n}`,
  realBy: (name: string) => `REAL · ${name}`,
  mimicTag: 'MIMIC · the AI',
  by: (name: string) => `by ${name}`,
  noVotes: 'no votes',
  awardImpostor: (writer: string, who: string) => `Best ${writer} impression: ${who}.`,
  awardWriter: (writer: string) => `Nobody fakes ${writer} like ${writer}.`,
  // Clasificación
  standings: 'Standings',
  afterRound: (n: number, total: number) => `After round ${n} of ${total}`,
  finalRound: 'Final round',
  startRound: (n: number) => `Start round ${n}`,
  seeFinal: 'See final results',
  waitingFor: (name: string) => `Waiting for ${name}…`,
  startsBySelf: (s: number) => `Starts by itself in ${s}s`,
  pandaSays: 'PANDA SAYS',
  panda: {
    stole: (name: string) => `${name} just stole first place!`,
    nobody: (writer: string) => `Nobody recognised ${writer}. Do you even know each other?`,
    everyone: (writer: string) => `Too easy. ${writer}, be less predictable.`,
    ai: (n: number) => `The AI fooled ${n} of you. Embarrassing.`,
    liar: (name: string, n: number) => `${name} fooled ${n} people. Should we be worried?`,
    crown: (name: string) => `That’s it. ${name} takes the crown.`,
    last: 'Last round. Everything can still change.',
    tied: (a: string, b: string) => `${a} and ${b} are tied at the top. Tense.`,
    close: (gap: number, a: string, b: string) => `Only ${gap} points between ${a} and ${b}.`,
    runaway: (name: string) => `${name} is running away with it.`,
  },
  // Final
  gameOver: 'Game over',
  rounds: (n: number) => plural(n, 'round', 'rounds'),
  wins: (name: string, isMe: boolean) => (isMe ? 'You win! 👑' : `${name} wins! 👑`),
  playAgain: 'Play again',
  menu: 'Menu',
  shareResult: 'Share the result',
  shareText: (name: string, score: number) => `${name} won Typing… with ${score} points. Think you can fake your friends?`,
}

const es: typeof en = {
  tagline: 'Juego de faroles en grupo',
  pitch1: 'Tus amigos imitan tus respuestas.',
  pitch2: 'Adivina cuál es la de verdad.',
  steps: [
    ['Te llega un mensaje', 'El chat del grupo te pregunta algo.'],
    ['Todos lo imitan', 'Tus amigos copian cómo escribes.'],
    ['Pilla la de verdad', 'Vota. Engaña. Suma puntos.'],
  ],
  createRoom: 'Crear sala',
  joinWithCode: 'Unirme con código',
  back: 'Atrás',
  next: 'Siguiente',
  newRoom1: 'Sala nueva · 1/2',
  setUpGame: 'Prepara tu partida',
  setUpSub: 'La IA escribe vuestros chats a partir de esto.',
  yourName: 'Tu nombre',
  namePlaceholderHost: 'p. ej. Pol',
  namePlaceholderGuest: 'p. ej. Laura',
  situationLabel: '¿Qué está pasando ahora?',
  situationPlaceholder: 'Cervezas del viernes en casa de Pol. Alguien acaba de tirar vino en el sofá…',
  situationHint: 'Dónde estáis, quién hay, qué acaba de pasar.',
  openingRoom: 'Abriendo tu sala…',
  quickOnes: '4 preguntas rápidas. Desliza.',
  cards: {
    know: { question: '¿Os conocéis todos bien?', no: 'No mucho', yes: 'Uña y carne' },
    adults: { question: '¿Sois todos mayores de 18?', no: 'No', yes: 'Sí' },
    spicy: { question: '¿Pueden picar los chats?', no: 'Mejor suave', yes: 'Picante' },
    mimic: { question: '¿Escondemos una IA entre las respuestas?', hint: 'Si la votas, pierdes puntos.', no: 'Sin IA', yes: 'Dale' },
  },
  joinARoom: 'Unirse a una sala',
  gotACode: '¿Tienes el código?',
  gotACodeSub: 'Está en la pantalla de quien crea la sala. O escanea su QR.',
  roomCode: 'Código de sala',
  invitedTo: 'Te invitan a',
  you: 'Tú',
  youLower: 'tú',
  joiningChat: 'está entrando al chat…',
  typeYourName: 'escribe tu nombre abajo',
  joinRoom: 'Entrar',
  joining: 'Entrando',
  changeCode: 'Cambiar código',
  leaveRoom: 'Salir de la sala',
  copyLink: 'Copiar enlace de invitación',
  linkCopied: 'Enlace copiado',
  players: (n) => `Jugadores · ${n}`,
  aiHiding: 'Hay una IA escondida entre las respuestas',
  youreIn: (name) => `¡Ya estás dentro, ${name}!`,
  hostsRoom: (host) => `Sala de ${host}`,
  startGame: 'Empezar partida',
  needMore: (n) => `Faltan ${n}`,
  needMorePanda: (n) => `${n === 1 ? 'Falta 1 jugador' : `Faltan ${n} jugadores`}. ¡Pasadles el código!`,
  waitingPanda: (host) => `Esperando a que ${host} empiece. Calentad esos pulgares.`,
  theHost: 'el anfitrión',
  hostTag: 'anfitrión',
  hintWriter: (name) => `Eres ${name} · contesta de verdad`,
  hintFaker: (name) => `Engáñales · escribe como ${name}`,
  sentAs: (name) => `Enviado como ${name}`,
  waitingOthers: (done, total) => `Esperando al resto ${done}/${total}`,
  messageAs: (name) => `Mensaje como ${name}`,
  send: 'Enviar',
  generatingTitle: 'Leyendo vuestro chat…',
  generatingSub: 'La IA está preparando la siguiente conversación.',
  whichIsReal: (name) => `¿Cuál escribió ${name} de verdad?`,
  aiAmongThese: 'Una de estas es de la IA. Evítala.',
  yours: 'TUYA',
  huntingYou: (done, total) => `Te están buscando · ${done}/${total}`,
  locked: (done, total) => `Votado · ${done}/${total}`,
  lockVote: 'Confirmar voto',
  tapTheReal: 'Toca la de verdad',
  theRealSaid: (name) => `Lo que dijo ${name} de verdad…`,
  round: (n) => `Ronda ${n}`,
  nobodyGotIt: 'Nadie acertó',
  tooEasy: 'Demasiado fácil',
  fooled: (n) => `${n} engañados`,
  youPoints: (n) => `Tú +${n}`,
  realBy: (name) => `REAL · ${name}`,
  mimicTag: 'MIMIC · la IA',
  by: (name) => `de ${name}`,
  noVotes: 'sin votos',
  awardImpostor: (writer, who) => `Mejor imitación de ${writer}: ${who}.`,
  awardWriter: (writer) => `Nadie imita a ${writer} como ${writer}.`,
  standings: 'Clasificación',
  afterRound: (n, total) => `Tras la ronda ${n} de ${total}`,
  finalRound: 'Última ronda',
  startRound: (n) => `Empezar ronda ${n}`,
  seeFinal: 'Ver resultados',
  waitingFor: (name) => `Esperando a ${name}…`,
  startsBySelf: (s) => `Empieza sola en ${s}s`,
  pandaSays: 'DICE EL PANDA',
  panda: {
    stole: (name) => `¡${name} acaba de robar el primer puesto!`,
    nobody: (writer) => `Nadie ha reconocido a ${writer}. ¿Seguro que os conocéis?`,
    everyone: (writer) => `Demasiado fácil. ${writer}, sé menos predecible.`,
    ai: (n) => `La IA ha engañado a ${n}. Qué vergüenza.`,
    liar: (name, n) => `${name} ha engañado a ${n}. ¿Nos preocupamos?`,
    crown: (name) => `Se acabó. ${name} se lleva la corona.`,
    last: 'Última ronda. Todo puede cambiar.',
    tied: (a, b) => `${a} y ${b} empatan arriba. Tensión.`,
    close: (gap, a, b) => `Solo ${gap} puntos entre ${a} y ${b}.`,
    runaway: (name) => `${name} se está escapando.`,
  },
  gameOver: 'Fin de la partida',
  rounds: (n) => plural(n, 'ronda', 'rondas'),
  wins: (name, isMe) => (isMe ? '¡Has ganado! 👑' : `¡Gana ${name}! 👑`),
  playAgain: 'Otra partida',
  menu: 'Menú',
  shareResult: 'Compartir resultado',
  shareText: (name, score) => `${name} ha ganado en Typing… con ${score} puntos. ¿Sabrías imitar a tus amigos?`,
}

const STRINGS = { en, es }
