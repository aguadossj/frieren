// Idioma de la interfaz (EN/ES). Se guarda en el móvil; por defecto, inglés.
// Uso: `const t = useT()` → `t.createRoom`, `t.youreIn(name)`. Cambiar: `setLang('es')`.
import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'es'
const KEY = 'typing.lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    /* sin almacenamiento: inglés */
  }
  // Por defecto, inglés (también la explicación de la primera visita); quien cambie a ES lo tiene guardado
  return 'en'
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

/** 1,250 / −100 (signo menos de verdad, no guion: la puntuación puede ser negativa) */
export const fmt = (n: number) => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en')
/** +170 / −100 */
export const signed = (n: number) => (n < 0 ? fmt(n) : `+${fmt(n)}`)
const MEDALS = ['🥇', '🥈', '🥉']
const ordinalEn = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${s}`
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const en = {
  // Portada
  pitch1: 'Your friends fake your replies.',
  pitch2: 'Spot the real one.',
  createRoom: 'Create room',
  joinWithCode: 'Join with code',
  // Cómo se juega (pop-up)
  howToPlay: 'How to play',
  howPages: [
    { title: 'A group chat drops', body: 'The AI writes a chat about your group. One of you replies for real, everyone else fakes it.' },
    { title: 'Spot the real one', body: 'All the replies show up. Vote for the real one, and fast: the quicker, the more points.' },
    { title: 'The big reveal', body: 'See who wrote what, and who got fooled.' },
    { title: 'Next round', body: 'Every round it’s someone else’s turn. The panda keeps you posted.' },
  ],
  howNext: 'Next',
  howPlay: 'Let’s play!',
  howSkip: 'Skip',
  // ¿Qué es Mimic? (una sola pantalla)
  mimicInfo: {
    title: 'Mimic is an AI',
    body: 'It pretends to be one of you and sneaks a fake answer into the vote.',
    avoid: 'Avoid its answer: vote for it and you lose 100 points.',
    demoFake: 'lol nope',
    cta: 'Got it',
    more: 'More about the AI',
    close: 'Close',
  },
  back: 'Back',
  next: 'Next',
  // Crear sala
  newRoom1: 'New room · 1/2',
  setUpGame: 'Set up your game',
  setUpSub: 'The AI writes your group chats from this.',
  yourName: 'Your name',
  namePlaceholderHost: 'e.g. Pol',
  namePlaceholderGuest: 'e.g. Laura',
  askName: 'What’s your name?',
  situationLabel: 'What are you guys doing right now?',
  situationPlaceholder: 'Having Friday drinks at Pol’s flat, about to head out…',
  situationHint: 'What you’re doing, where, and who’s there.',
  situationRequired: 'Tell us what you’re up to so we can start.',
  openingRoom: 'Opening your room…',
  swipeIf: 'Swipe if',
  lookingAround: 'Looking around you…',
  near: 'Near',
  cards: {
    together: { question: 'Are you all in the same place right now?', hint: 'We’ll use where you are to write the chats.', no: 'No', yes: 'Yes, together' },
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
  nameTaken: 'That name is already taken. Pick another one.',
  // Sala
  leaveRoom: 'Leave room',
  leaveTitle: 'Leave the room?',
  leaveBody: 'To come back you’ll need the code again.',
  leaveStay: 'Stay',
  leaveConfirm: 'Leave',
  kick: (name: string) => `Kick ${name}`,
  kickTitle: (name: string) => `Kick ${name}?`,
  kickBody: 'They’ll be removed from the room and can’t come back.',
  kickYes: 'Kick',
  kickNo: 'Cancel',
  removedKicked: 'The host kicked you out',
  removedRejected: 'The host didn’t let you in',
  removedBody: 'Join another room or create your own.',
  removedOk: 'Got it',
  checkingRoom: 'Checking room…',
  copyLink: 'Share invite',
  linkCopied: 'Invite copied',
  inviteText: (code: string) => `Join my Typing… game! 💬 Room code: ${code}`,
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
  introImitate: 'Imitate',
  introYou: 'Be yourself',
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
  locked: (done: number, total: number) => `Voted · ${done}/${total}`,
  lockVote: 'Submit',
  tapTheReal: 'Tap the real one',
  voteTitle: (name: string) => `Only one is the real ${name}`,
  voteSub: 'The rest are friends faking it',
  voteSeparator: (name: string) => `${name} replied… only one is real`,
  tapWhatSaid: (name: string) => `Tap what ${name} really said`,
  // Revelación
  theRealSaid: (name: string) => `The real ${name} said…`,
  round: (n: number) => `Round ${n}`,
  nobodyGotIt: 'Nobody got it',
  tooEasy: 'Too easy',
  fooled: (n: number) => `${n} fooled`,
  youPoints: (n: number) => `You ${signed(n)}`,
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
  wins: (name: string, isMe: boolean) => (isMe ? 'You win!' : `${name} wins!`),
  /** Línea bajo el titular del final: tu resultado. */
  myResult: (place: number, score: number) =>
    place === 1 ? `${fmt(score)} points. Untouchable.` : `You finished ${ordinalEn(place)} with ${fmt(score)} points.`,
  winnerScore: (score: number) => `${fmt(score)} points`,
  pts: 'pts',
  playAgain: 'Play again',
  menu: 'Menu',
  shareResult: 'Share',
  copied: 'Copied!',
  /** Mensaje para WhatsApp & co.: podio con medallas + enlace en su propia línea. */
  shareText: (top: { name: string; score: number }[], iWon: boolean, url: string) =>
    [
      iWon ? '🏆 I won Typing…!' : `🏆 ${top[0].name} won Typing…!`,
      '',
      ...top.slice(0, 3).map((p, i) => `${MEDALS[i]} ${p.name} · ${fmt(p.score)} pts`),
      '',
      'Think you can fake your friends? 👇',
      url,
    ].join('\n'),
}

const es: typeof en = {
  pitch1: 'Tus amigos imitan tus respuestas.',
  pitch2: 'Adivina cuál es la de verdad.',
  createRoom: 'Crear sala',
  joinWithCode: 'Unirme con código',
  howToPlay: 'Cómo jugar',
  howPages: [
    { title: 'Os llega un chat', body: 'La IA escribe un chat de vuestro grupo. Uno contesta de verdad y el resto se hace pasar por él.' },
    { title: 'Pilla la de verdad', body: 'Salen todas las respuestas. Vota la auténtica, y rápido: cuanto antes, más puntos.' },
    { title: 'Se destapa todo', body: 'Se ve quién escribió cada una y a quién habéis engañado.' },
    { title: 'Y otra ronda', body: 'Cada ronda le toca a otro. El panda os va contando cómo va la partida.' },
  ],
  howNext: 'Siguiente',
  howPlay: '¡A jugar!',
  howSkip: 'Saltar',
  mimicInfo: {
    title: 'Mimic es una IA',
    body: 'Se hace pasar por uno de vosotros y cuela una respuesta falsa en la votación.',
    avoid: 'Evítala: si la votas, pierdes 100 puntos.',
    demoFake: 'jajaja qué va',
    cta: 'Entendido',
    more: 'Más detalles sobre la IA',
    close: 'Cerrar',
  },
  back: 'Atrás',
  next: 'Siguiente',
  newRoom1: 'Sala nueva · 1/2',
  setUpGame: 'Prepara tu partida',
  setUpSub: 'La IA escribe vuestros chats a partir de esto.',
  yourName: 'Tu nombre',
  namePlaceholderHost: 'Ej: Pol',
  namePlaceholderGuest: 'Ej: Laura',
  askName: '¿Cómo te llamas?',
  situationLabel: '¿Qué estáis haciendo ahora?',
  situationPlaceholder: 'Tomando algo en casa de Pol antes de salir de fiesta…',
  situationHint: 'Qué hacéis, dónde estáis y quién hay.',
  situationRequired: 'Cuéntanos qué estáis haciendo para empezar.',
  openingRoom: 'Abriendo tu sala…',
  swipeIf: 'Desliza si',
  lookingAround: 'Mirando qué hay por la zona…',
  near: 'Cerca',
  cards: {
    together: { question: '¿Estáis todos en el mismo sitio ahora?', hint: 'Usaremos dónde estáis para escribir los chats.', no: 'No', yes: 'Sí, juntos' },
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
  nameTaken: 'Ese nombre ya está cogido. Elige otro.',
  leaveRoom: 'Salir de la sala',
  leaveTitle: '¿Salir de la sala?',
  leaveBody: 'Para volver necesitarás otra vez el código.',
  leaveStay: 'Quedarme',
  leaveConfirm: 'Salir',
  kick: (name) => `Echar a ${name}`,
  kickTitle: (name) => `¿Echar a ${name}?`,
  kickBody: 'Saldrá de la sala y no podrá volver a entrar.',
  kickYes: 'Echar',
  kickNo: 'Cancelar',
  removedKicked: 'El anfitrión te ha echado',
  removedRejected: 'El anfitrión no te ha dejado entrar',
  removedBody: 'Únete a otra sala o crea la tuya.',
  removedOk: 'Entendido',
  checkingRoom: 'Comprobando sala…',
  copyLink: 'Compartir invitación',
  linkCopied: 'Invitación copiada',
  inviteText: (code) => `¡Uníos a mi partida de Typing…! 💬 Código: ${code}`,
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
  introImitate: 'Imita a',
  introYou: 'Sé tú mismo',
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
  lockVote: 'Enviar',
  tapTheReal: 'Toca la de verdad',
  voteTitle: (name) => `Solo una la escribió ${name}`,
  voteSub: 'Las demás son amigos haciéndose pasar',
  voteSeparator: (name) => `${name} ha contestado… solo una es real`,
  tapWhatSaid: (name) => `Toca lo que dijo ${name} de verdad`,
  theRealSaid: (name) => `Lo que dijo ${name} de verdad…`,
  round: (n) => `Ronda ${n}`,
  nobodyGotIt: 'Nadie acertó',
  tooEasy: 'Demasiado fácil',
  fooled: (n) => `${n} engañados`,
  youPoints: (n) => `Tú ${signed(n)}`,
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
  wins: (name, isMe) => (isMe ? '¡Has ganado!' : `¡Gana ${name}!`),
  myResult: (place, score) =>
    place === 1 ? `${fmt(score)} puntos. Intocable.` : `Has quedado ${place}º con ${fmt(score)} puntos.`,
  winnerScore: (score) => `${fmt(score)} puntos`,
  pts: 'pts',
  playAgain: 'Otra partida',
  menu: 'Menú',
  shareResult: 'Compartir',
  copied: '¡Copiado!',
  shareText: (top, iWon, url) =>
    [
      iWon ? '🏆 ¡He ganado en Typing…!' : `🏆 ¡${top[0].name} gana en Typing…!`,
      '',
      ...top.slice(0, 3).map((p, i) => `${MEDALS[i]} ${p.name} · ${fmt(p.score)} pts`),
      '',
      '¿Sabrías imitar a tus amigos? 👇',
      url,
    ].join('\n'),
}

const STRINGS = { en, es }
