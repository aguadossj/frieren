import { useState, type CSSProperties } from 'react'
import { Avatar, Body, Button, Footer, Icon, Row, Screen, TopBar, TopNote } from '../components/ui'
import { PUBLIC_URL, shareText } from '../components/QR'
import { useGame } from '../game/useGame'
import { useT } from '../i18n'
import type { Player } from '../game/types'

/**
 * Podio: 2º a la izquierda, 1º en el centro (más alto, negro), 3º a la derecha.
 * Los bloques crecen de abajo arriba (3º → 2º → 1º), después aparece cada jugador y al final cae la corona + confeti.
 */
// La altura del podio escala con la pantalla (sin huecos vacíos en móviles altos); `k` = proporción respecto al 1º.
const PODIUM = [
  { place: 2, k: 0.72, avatar: 58, block: 'bg-white text-ink', delay: 0.25 },
  { place: 1, k: 1, avatar: 80, block: 'bg-ink text-white', delay: 0.5 },
  { place: 3, k: 0.52, avatar: 58, block: 'bg-white text-ink', delay: 0 },
] as const
// 667 px (iPhone SE) → 140 px · 760 → 182 · 844 → 220 (lo que queda tras título, avatares y botones)
const FIRST_HEIGHT = 'clamp(110px, calc(var(--vv-h, 100dvh) * 0.45 - 160px), 260px)'
const GROW_S = 0.55

export default function Final() {
  const { room, me, game } = useGame()
  const t = useT()
  const [copied, setCopied] = useState(false)
  if (!room) return null

  const ranking = [...room.players].sort((a, b) => b.score - a.score)
  const winner = ranking[0]
  const myPlace = ranking.findIndex((p) => p.id === me?.id) + 1
  const iWon = myPlace === 1
  const label = (p: Player) => (p.id === me?.id ? t.you : p.name)

  const share = async () => {
    const text = t.shareText(ranking, iWon, PUBLIC_URL)
    if ((await shareText(text)) === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <Screen>
      <Confetti delay={GROW_S + 0.9} />
      <TopBar title={t.gameOver} right={<TopNote>{t.rounds(room.totalRounds)}</TopNote>} />
      <Body className="gap-3 pt-6">
        <div className="text-center">
          <h1 className="animate-pop text-[44px] leading-[0.95] font-black tracking-[-0.03em] text-balance">{t.wins(winner.name, iWon)}</h1>
          <p className="mt-2 animate-rise text-[17px] font-bold text-white/85" style={{ animationDelay: '0.15s' }}>
            {myPlace > 0 ? t.myResult(myPlace, me!.score) : t.winnerScore(winner.score)}
          </p>
        </div>

        {/* El podio ocupa el hueco libre y se apoya abajo, encima de los botones; nunca se encoge (si no cabe, hay scroll) */}
        <div className="flex flex-[1_0_auto] items-end justify-center gap-2.5 pt-11">
          {PODIUM.map(({ place, k, avatar, block, delay }) => {
            const p = ranking[place - 1]
            if (!p) return <div key={place} className="flex-1" />
            const appear = delay + GROW_S * 0.7
            const isMe = p.id === me?.id
            return (
              <div key={place} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="relative mb-2 animate-pop" style={{ animationDelay: `${appear}s` }}>
                  {place === 1 && (
                    // la corona cae cuando el ganador ya está en su sitio
                    <span
                      className="absolute -top-10 left-1/2 text-[#F5B700] drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]"
                      style={{ animation: `crown-drop 0.7s ${appear + 0.35}s cubic-bezier(0.3, 1.3, 0.5, 1) both` }}
                    >
                      <Icon name="crown" size={36} className="fill-current" />
                    </span>
                  )}
                  <Avatar player={p} size={avatar} ring />
                </div>
                <span
                  className={`mb-2.5 w-full animate-rise truncate text-center leading-tight font-extrabold ${place === 1 ? 'text-[19px]' : 'text-[16px]'}`}
                  style={{ animationDelay: `${appear + 0.1}s` }}
                >
                  {label(p)}
                  {isMe && place !== 1 && <span className="sr-only"> ({p.name})</span>}
                </span>
                <div
                  className={`flex w-full origin-bottom flex-col items-center justify-start rounded-t-[22px] pt-3 ${block}`}
                  style={{ height: `calc(${FIRST_HEIGHT} * ${k})`, animation: `podium-grow ${GROW_S}s ${delay}s cubic-bezier(0.2, 0.9, 0.3, 1.1) both` }}
                >
                  <span className={`leading-none font-black ${place === 1 ? 'text-[44px]' : 'text-[34px]'}`}>{place}</span>
                  <span className={`mt-1 text-[14px] font-extrabold tabular-nums ${place === 1 ? 'text-white/70' : 'text-neutral-400'}`}>
                    {p.score.toLocaleString('en')} {t.pts}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {ranking.slice(3).map((p, i) => (
          <Row key={p.id} className="animate-rise" style={{ animationDelay: `${1.2 + i * 0.08}s` }}>
            <b className="w-5 text-center text-[18px] text-neutral-400">{i + 4}</b>
            <Avatar player={p} />
            <span className="flex-1 truncate text-[19px] font-semibold">{label(p)}</span>
            <b className="text-[19px] tabular-nums">{p.score.toLocaleString('en')}</b>
          </Row>
        ))}
      </Body>
      <Footer>
        <Button onClick={() => void game.playAgain()} className="flex items-center justify-center gap-3">
          <Icon name="replay" size={22} />
          {t.playAgain}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ink" onClick={() => void share()} className="flex items-center justify-center gap-2.5 text-[19px]">
            <Icon name={copied ? 'check' : 'share'} size={20} className={copied ? 'text-good' : ''} />
            {copied ? t.copied : t.shareResult}
          </Button>
          <Button variant="ink" onClick={() => void game.leave()} className="text-[19px]">
            {t.menu}
          </Button>
        </div>
      </Footer>
    </Screen>
  )
}

const CONFETTI_COLORS = ['#FFFFFF', '#F5B700', '#111111', '#2563EB', '#16A34A', '#7C3AED', '#EC4899', '#F97316']

/** Confeti que cae una sola vez sobre toda la pantalla (no bloquea toques). */
function Confetti({ delay }: { delay: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: 44 }, (_, i) => ({
      left: Math.random() * 100,
      w: 6 + Math.random() * 6,
      round: Math.random() < 0.3,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dur: 2.2 + Math.random() * 1.6,
      start: delay + Math.random() * 0.6,
      dx: `${Math.round((Math.random() - 0.5) * 160)}px`,
      rot: `${Math.round((Math.random() - 0.5) * 1080)}deg`,
    })),
  )
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {pieces.map((c, i) => (
        <span
          key={i}
          className="confetti absolute -top-4 block"
          style={
            {
              left: `${c.left}%`,
              width: c.w,
              height: c.round ? c.w : c.w * 1.7,
              borderRadius: c.round ? '50%' : 2,
              background: c.color,
              '--dx': c.dx,
              '--rot': c.rot,
              animation: `confetti-fall ${c.dur}s ${c.start}s cubic-bezier(0.25, 0.5, 0.45, 1) both`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
