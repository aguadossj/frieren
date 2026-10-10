/**
 * "Cómo se juega": pop-up a pantalla completa con los 3 pasos, que van apareciendo uno a uno.
 * Sale solo la primera vez que alguien abre la web (se recuerda en localStorage) y desde el botón "Cómo jugar" de la portada.
 * Tocar en cualquier sitio muestra de golpe los pasos que faltan; "¡A jugar!" (o Saltar / Esc) lo cierra.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { Icon, TypingDots } from './ui'

const SEEN_KEY = 'typing.howto.seen'
/** Cuándo aparece cada paso (ms desde que se abre): 1,5 s entre uno y otro. */
const STEP_AT = [500, 2000, 3500]
const BUTTON_AFTER = 1000 // el botón sale 1 s después del último paso

export function seenHowTo(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true // sin almacenamiento (modo privado raro): mejor no molestar en cada visita
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [shown, setShown] = useState(0) // pasos visibles (0–3)
  const [ready, setReady] = useState(false) // botón "¡A jugar!" visible
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const ids = STEP_AT.map((ms, i) => setTimeout(() => setShown((n) => Math.max(n, i + 1)), ms))
    ids.push(setTimeout(() => setReady(true), STEP_AT[STEP_AT.length - 1] + BUTTON_AFTER))
    return () => ids.forEach(clearTimeout)
  }, [])

  const close = () => {
    if (leaving) return
    markSeen()
    setLeaving(true)
    setTimeout(onClose, 250)
  }

  // Tocar antes de tiempo = enseñar todo ya (para quien lee rápido)
  const revealAll = () => {
    setShown(3)
    setReady(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const visuals: ReactNode[] = [<VisualMessage key="1" />, <VisualFake key="2" />, <VisualVote key="3" />]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="howto-title"
      onClick={revealAll}
      className={`absolute inset-x-0 top-0 z-[60] flex h-full flex-col overflow-hidden bg-ink text-white sm:top-6 sm:h-[calc(100%-3rem)] sm:max-h-[900px] sm:rounded-[44px] ${leaving ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Saltar: solo mientras van saliendo los pasos */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          close()
        }}
        className={`absolute top-2 right-3 z-10 h-[44px] px-3 text-[15px] font-extrabold text-white/60 transition-opacity ${ready ? 'pointer-events-none opacity-0' : ''}`}
        style={{ marginTop: 'env(safe-area-inset-top)' }}
        tabIndex={ready ? -1 : 0}
      >
        {t.howSkip}
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5">
        <div className="my-auto flex flex-col gap-3 pt-14 pb-4 [@media(max-height:700px)]:gap-2.5 [@media(max-height:700px)]:pt-11">
          <div className="mb-3 text-center [@media(max-height:700px)]:mb-1">
            <div className="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase [@media(max-height:700px)]:hidden">{t.howEyebrow}</div>
            <h2 id="howto-title" className="mt-1.5 animate-pop text-[44px] leading-none font-black tracking-[-0.03em] [@media(max-height:700px)]:text-[38px]">
              {t.howTitle}
            </h2>
          </div>

          {t.howSteps.map(([title, line], i) => (
            <div
              key={title}
              aria-hidden={i >= shown}
              className={`rounded-[26px] bg-white p-4 text-ink transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.2)] [@media(max-height:700px)]:p-3 ${
                i < shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-5 scale-95 opacity-0'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-[17px] font-black text-white">{i + 1}</span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[19px] font-black tracking-[-0.01em]">{title}</div>
                  <div className="mt-0.5 text-[15px] leading-snug font-medium text-neutral-500">{line}</div>
                </div>
              </div>
              {/* El hueco de la ilustración está reservado desde el principio (nada salta al aparecer cada paso);
                  se vuelve a montar al mostrarse para que su animación arranque en ese momento. */}
              <div className="mt-3 pl-12 [@media(max-height:700px)]:mt-2" key={i < shown ? 'on' : 'off'} style={i < shown ? undefined : { visibility: 'hidden' }}>
                {visuals[i]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 pt-2 pb-6">
        <button
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
          className={`flex h-[66px] w-full items-center justify-center gap-3 rounded-full bg-brand text-[21px] font-extrabold text-white transition-all duration-500 active:scale-[0.97] ${
            ready ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
          }`}
          tabIndex={ready ? 0 : -1}
        >
          {t.howPlay}
          <Icon name="arrowRight" size={22} />
        </button>
      </div>
    </div>
  )
}

/* Mini-ilustraciones de cada paso (mismas piezas que el juego: avatares de colores, burbujas, puntitos) */

const Dot = ({ color, letter, size = 26 }: { color: string; letter: string; size?: number }) => (
  <span
    className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
    style={{ background: color, width: size, height: size, fontSize: size * 0.45 }}
  >
    {letter}
  </span>
)

function VisualMessage() {
  const t = useT()
  return (
    <div className="flex animate-rise items-end gap-2" style={{ animationDelay: '0.2s' }}>
      <Dot color="#2563EB" letter="P" />
      <div className="rounded-[16px] rounded-bl-[4px] bg-neutral-100 px-3 py-2 text-[14px] whitespace-nowrap leading-snug font-semibold">{t.howDemoMessage}</div>
    </div>
  )
}

function VisualFake() {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {[
        ['#16A34A', 'M'],
        ['#7C3AED', 'L'],
        ['#F97316', 'A'],
      ].map(([color, letter], i) => (
        <span key={letter} className="flex animate-pop items-center gap-0.5" style={{ animationDelay: `${0.2 + i * 0.18}s` }}>
          <Dot color={color} letter={letter} size={22} />
          <span className="flex h-[26px] w-[42px] items-center justify-center rounded-full bg-neutral-100 [&>span]:scale-[0.6]">
            <TypingDots />
          </span>
        </span>
      ))}
    </div>
  )
}

function VisualVote() {
  const t = useT()
  return (
    <div className="flex items-center gap-2">
      <span className="animate-rise rounded-[16px] bg-neutral-100 px-3 py-1.5 text-[14px] whitespace-nowrap font-semibold text-neutral-400" style={{ animationDelay: '0.2s' }}>
        {t.howDemoFake}
      </span>
      <span
        className="flex animate-pop items-center gap-1.5 rounded-[16px] bg-white px-3 py-1.5 text-[14px] whitespace-nowrap font-semibold outline-[3px] outline-ink outline-solid"
        style={{ animationDelay: '0.45s' }}
      >
        <Icon name="check" size={14} />
        {t.howDemoReal}
      </span>
      <span className="animate-pop text-[15px] font-black text-good" style={{ animationDelay: '0.8s' }}>
        +200
      </span>
    </div>
  )
}
