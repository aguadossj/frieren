// Popup de resultado al revelar la ronda (estilo Kahoot): a pantalla completa ~2,6 s o hasta que se toca.
// Todo sale del resultado de la ronda: qué votaste, de quién era y tus puntos (los calcula el servidor).
//   acierto → verde · fallo (imitación de un jugador) → rojo · caíste en la IA → negro · sin voto → gris
//   eras el writer → lila, con los que te han pillado
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import ChatDoodles from './ChatDoodles'
import { Avatar } from './ui'
import { useGame } from '../game/useGame'
import { fmt, signed, useLang } from '../i18n'
import type { Player } from '../game/types'

const SHOW_MS = 2600

const TEXT = {
  en: {
    correct: 'Correct!',
    caught: (w: string) => `You caught ${w}`,
    wrong: 'Wrong!',
    ai: 'You fell for it!',
    noVote: 'No vote',
    caughtYou: (n: number, m: number) => `${n} of ${m} caught you`,
    nobody: 'Nobody caught you',
    fooledBy: (n: number) => `🎭 Your answer fooled ${n}`,
    total: (n: string) => `Total: ${n}`,
    blazing: '⚡ Lightning fast',
    quick: '⚡ Quick',
  },
  es: {
    correct: '¡Correcto!',
    caught: (w: string) => `Pillaste a ${w}`,
    wrong: 'Has fallado',
    ai: '¡Has caído!',
    noVote: 'Sin voto',
    caughtYou: (n: number, m: number) => `${n} de ${m} te han pillado`,
    nobody: 'Nadie te ha pillado',
    fooledBy: (n: number) => `🎭 Tu respuesta engañó a ${n}`,
    total: (n: string) => `Total: ${n}`,
    blazing: '⚡ ¡Rapidísimo!',
    quick: '⚡ ¡Rápido!',
  },
}

type Kind = 'correct' | 'wrong' | 'ai' | 'noVote' | 'writer'

const STYLE: Record<Kind, { bg: string; fg: string; icon: string }> = {
  correct: { bg: '#00A055', fg: '#00A055', icon: '✓' },
  wrong: { bg: '#EE2B2B', fg: '#EE2B2B', icon: '✗' },
  ai: { bg: '#111111', fg: '#111111', icon: '🤖' },
  noVote: { bg: '#5F5E5A', fg: '#5F5E5A', icon: '⏰' },
  writer: { bg: '#6B3BFF', fg: '#6B3BFF', icon: '🕵️' },
}

/** Cuenta de 0 a `to` en ~600 ms. */
function useCountUp(to: number) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 600)
      setN(Math.round(to * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return n
}

export function RoundOutcome() {
  const { room, me } = useGame()
  const t = TEXT[useLang()]
  const [stage, setStage] = useState<'in' | 'out' | 'gone'>('in')

  useEffect(() => {
    const a = setTimeout(() => setStage((s) => (s === 'in' ? 'out' : s)), SHOW_MS)
    return () => clearTimeout(a)
  }, [])
  useEffect(() => {
    if (stage !== 'out') return
    const b = setTimeout(() => setStage('gone'), 280)
    return () => clearTimeout(b)
  }, [stage])

  const result = room?.result
  const writerId = room?.chat?.writerId
  // Tipo de resultado para este jugador
  let kind: Kind = 'noVote'
  if (result && me && writerId) {
    if (me.id === writerId) kind = 'writer'
    else {
      const mine = result.answers.find((a) => a.voterIds.includes(me.id))
      if (!mine) kind = 'noVote'
      else if (mine.isReal) kind = 'correct'
      else if (mine.isBot) kind = 'ai'
      else kind = 'wrong'
    }
  }
  const points = (result && me && result.points[me.id]) || 0
  const shown = useCountUp(points)

  useEffect(() => {
    if (kind === 'correct') navigator.vibrate?.(30)
    else if (kind === 'wrong' || kind === 'ai') navigator.vibrate?.([60, 40, 60])
  }, [kind])

  if (!room || !result || !me || !writerId || stage === 'gone') return null

  const writer = room.players.find((p) => p.id === writerId)
  const real = result.answers.find((a) => a.isReal)
  const caughtBy = (real?.voterIds ?? []).map((id) => room.players.find((p) => p.id === id)).filter(Boolean) as Player[]
  const myFake = result.answers.find((a) => !a.isReal && !a.isBot && a.authorId === me.id)
  const fooledN = myFake?.voterIds.length ?? 0
  const s = STYLE[kind]

  const title =
    kind === 'correct' ? t.correct
    : kind === 'wrong' ? t.wrong
    : kind === 'ai' ? t.ai
    : kind === 'noVote' ? t.noVote
    : caughtBy.length ? t.caughtYou(caughtBy.length, room.players.length - 1) : t.nobody

  return createPortal(
    <div
      onClick={() => setStage('out')}
      className={`fixed inset-0 z-[95] flex flex-col items-center justify-center gap-5 overflow-hidden px-8 text-center text-white ${
        stage === 'out' ? 'animate-fade-out' : 'animate-fade-in'
      } ${kind === 'wrong' ? 'ro-shake' : ''}`}
      style={{ background: s.bg }}
      role="status"
      aria-live="assertive"
    >
      <style>{CSS}</style>
      <ChatDoodles seed={room.roundIndex + 7} className="pointer-events-none" />
      {kind === 'correct' && <Confetti />}

      <div
        className={`relative flex size-[104px] animate-pop items-center justify-center rounded-full bg-white text-[52px] font-black ${kind === 'ai' ? 'ro-glitch' : ''}`}
        style={{ color: s.fg }}
      >
        {s.icon}
      </div>

      <div className={`relative text-[42px] leading-[1.02] font-black tracking-[-0.03em] ${kind === 'ai' ? 'ro-glitch' : ''}`}>{title}</div>

      {kind === 'correct' && writer && <div className="relative -mt-2 text-[18px] font-bold text-white/90">{t.caught(writer.name)}</div>}

      {kind === 'writer' && caughtBy.length > 0 && (
        // Tablero mínimo: quién te ha pillado
        <div className="relative flex flex-wrap justify-center gap-3">
          {caughtBy.map((p) => (
            <div key={p.id} className="flex w-[64px] flex-col items-center gap-1">
              <Avatar player={p} size={44} ring />
              <span className="w-full truncate text-[13px] font-extrabold">{p.id === me.id ? '—' : p.name}</span>
            </div>
          ))}
        </div>
      )}

      {kind !== 'writer' && (
        <div className="relative rounded-full bg-white px-7 py-2 text-[34px] font-black tabular-nums" style={{ color: points < 0 ? '#EE2B2B' : s.fg }}>
          {signed(shown)}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-2">
        {kind === 'correct' && points >= 180 && <Chip>{t.blazing}</Chip>}
        {kind === 'correct' && points >= 140 && points < 180 && <Chip>{t.quick}</Chip>}
        {kind === 'ai' && <Chip>{t.total(fmt(me.score))}</Chip>}
        {kind !== 'writer' && fooledN > 0 && <Chip>{t.fooledBy(fooledN)}</Chip>}
      </div>
    </div>,
    document.body,
  )
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-black/25 px-4 py-1.5 text-[15px] font-extrabold">{children}</span>
}

const CONFETTI_COLORS = ['#FFFFFF', '#FFD12E', '#7CF29A', '#FF4FA3', '#1E6BFF']

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.2 + Math.random() * 0.9,
      rot: Math.random() * 360,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })),
  )
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="ro-confetti absolute top-[-12px] h-[14px] w-[8px] rounded-[2px]"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }}
        />
      ))}
    </div>
  )
}

const CSS = `
@keyframes ro-fall { to { transform: translateY(110vh) rotate(540deg); } }
.ro-confetti { animation: ro-fall linear forwards; }
@keyframes ro-shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-12px) } 40% { transform: translateX(10px) } 60% { transform: translateX(-6px) } 80% { transform: translateX(4px) } }
.ro-shake > * { animation: ro-shake 0.45s 0.15s ease-in-out both; }
@keyframes ro-glitch { 0%,100% { transform: none; opacity: 1 } 15% { transform: translate(-4px,2px) skewX(-8deg); opacity: .85 } 30% { transform: translate(4px,-2px) skewX(6deg) } 45% { transform: none } 60% { transform: translate(-2px,0) skewX(-4deg); opacity: .9 } 75% { transform: none } }
.ro-glitch { animation: ro-glitch 0.6s 0.2s steps(2, end) 2; }
@media (prefers-reduced-motion: reduce) { .ro-confetti, .ro-shake > *, .ro-glitch { animation: none !important; } }
`
