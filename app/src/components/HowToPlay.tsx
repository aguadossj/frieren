/**
 * "Cómo se juega": pantalla completa con 4 páginas que se pasan una a una (botón, deslizar o ← →).
 * Cada página enseña una captura REAL del juego (app/public/howto/{es|en}-*.webp, sacadas de una partida de verdad)
 * dentro de un móvil, con un título y una frase.
 * Sale solo la primera vez que alguien entra en la web, por donde entre (portada o enlace/QR de una sala), y luego
 * desde el botón "Cómo jugar" de la portada. Se recuerda en localStorage y en una cookie.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLang, useT } from '../i18n'
import { Icon } from './ui'

const SEEN_KEY = 'typing.howto.seen'
const SHOTS = ['chat', 'vote', 'reveal', 'standings'] as const
const SWIPE = 70 // px para que la carta salga volando
const FLY_MS = 300

const COOKIE = 'typing_seen=1'

/**
 * ¿Ha entrado ya alguna vez en la web? Se mira en dos sitios (localStorage y una cookie de 1 año): si cualquiera
 * de los dos lo recuerda, no se vuelve a enseñar. Si el navegador no deja guardar nada, tampoco se enseña
 * (mejor eso que salir en cada visita).
 */
export function seenHowTo(): boolean {
  let stored = false
  let canStore = false
  try {
    stored = localStorage.getItem(SEEN_KEY) === '1'
    canStore = true
  } catch {
    /* sin localStorage */
  }
  try {
    if (document.cookie.split('; ').includes(COOKIE)) stored = true
    if (navigator.cookieEnabled) canStore = true
  } catch {
    /* sin cookies */
  }
  return stored || !canStore
}

/** Se marca al ENSEÑARLO (primera visita), no al cerrarlo: recargar ya no lo vuelve a sacar. */
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* sin localStorage */
  }
  try {
    document.cookie = `${COOKIE}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`
  } catch {
    /* sin cookies */
  }
}

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const pages = t.howPages
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [leaving, setLeaving] = useState(false)
  const startX = useRef<number | null>(null)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState<0 | 1 | -1>(0)
  const last = page === pages.length - 1
  const offset = flying ? flying * 640 : dx

  /** La carta sale volando hacia ese lado y entra la siguiente (en la última, se cierra y a jugar). */
  const fly = (side: 1 | -1) => {
    setFlying(side)
    navigator.vibrate?.(12)
    setTimeout(() => {
      setFlying(0)
      setDx(0)
      if (last) close()
      else {
        setDir(1)
        setPage((p) => p + 1)
      }
    }, FLY_MS)
  }

  useEffect(markSeen, [])

  // Precargar las 4 capturas para que el paso de página sea instantáneo
  useEffect(() => {
    SHOTS.forEach((s) => {
      const img = new Image()
      img.src = `/howto/${lang}-${s}.webp`
    })
  }, [lang])

  const close = () => {
    if (leaving) return
    markSeen()
    setLeaving(true)
    setTimeout(onClose, 250)
  }
  const go = (to: number) => {
    if (to < 0 || to >= pages.length || to === page) return
    setDir(to > page ? 1 : -1)
    setPage(to)
  }
  const next = () => {
    if (!flying) fly(-1) // el botón y → también tiran la carta
  }

  // Teclado: ← → para pasar, Esc para cerrar
  const keys = useRef({ next, prev: () => go(page - 1), close })
  useEffect(() => {
    keys.current = { next, prev: () => go(page - 1), close }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') keys.current.next()
      if (e.key === 'ArrowLeft') keys.current.prev()
      if (e.key === 'Escape') keys.current.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="howto-title"
      className={`absolute inset-x-0 top-0 z-[60] flex h-full flex-col overflow-hidden bg-ink text-white sm:top-6 sm:h-[calc(100%-3rem)] sm:max-h-[900px] sm:rounded-[44px] ${leaving ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Progreso tipo "stories" (cada tramo lleva a su página) + Saltar */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-2">
        <div className="flex flex-1 gap-1.5">
          {pages.map((p, i) => (
            <button key={p.title} onClick={() => go(i)} aria-label={`${i + 1} / ${pages.length}`} className="flex h-[44px] flex-1 items-center">
              <span className={`h-[5px] w-full rounded-full transition-colors duration-300 ${i <= page ? 'bg-white' : 'bg-white/20'}`} />
            </button>
          ))}
        </div>
        {!last && (
          <button onClick={close} className="h-[44px] shrink-0 px-2 text-[15px] font-extrabold text-white/60">
            {t.howSkip}
          </button>
        )}
      </div>

      {/* Capturas como cartas de Tinder: la de arriba sigue al dedo y, si la sueltas lejos, sale volando y entra la siguiente,
          que ya asoma detrás. La primera hace un amago para enseñar el gesto. */}
      <div className="relative min-h-0 flex-1 px-6 py-3 select-none">
        {page + 1 < pages.length && (
          <div className="absolute inset-0 flex items-center justify-center px-6 py-3" aria-hidden="true">
            <Phone src={`/howto/${lang}-${SHOTS[page + 1]}.webp`} className="scale-[0.9] opacity-50" style={{ rotate: page % 2 ? '-3deg' : '3deg' }} />
          </div>
        )}
        <div
          className="absolute inset-0 flex touch-none items-center justify-center px-6 py-3"
          onPointerDown={(e) => {
            if (flying) return
            startX.current = e.clientX
            setDragging(true)
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (startX.current !== null) setDx(e.clientX - startX.current)
          }}
          onPointerUp={() => {
            if (startX.current === null) return
            startX.current = null
            setDragging(false)
            if (Math.abs(dx) > SWIPE) fly(dx > 0 ? 1 : -1)
            else setDx(0)
          }}
          onPointerCancel={() => {
            startX.current = null
            setDragging(false)
            setDx(0)
          }}
        >
          <div
            key={page}
            className="h-full max-h-[480px]"
            style={{
              transform: `translateX(${offset}px) rotate(${offset / 18}deg)`,
              transition: dragging ? 'none' : `transform ${FLY_MS}ms cubic-bezier(0.3, 0.8, 0.4, 1)`,
            }}
          >
            <div
              className="h-full"
              style={{
                animation: `${dir === 1 ? 'howto-in-right' : 'howto-in-left'} 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.1) both${
                  page === 0 && !dragging && !dx ? ', swipe-hint 1.4s ease-in-out 1.6s 2' : ''
                }`,
              }}
            >
              <Phone src={`/howto/${lang}-${SHOTS[page]}.webp`} style={{ rotate: page % 2 ? '2deg' : '-2deg' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Texto de la página */}
      <div key={`text-${page}`} className="shrink-0 animate-rise px-6 text-center">
        <div className="text-[13px] font-extrabold tracking-[0.16em] text-brand">
          {page + 1} / {pages.length}
        </div>
        <h2 id="howto-title" className="mt-1 text-[32px] leading-[1.05] font-black tracking-[-0.03em] [@media(max-height:700px)]:text-[27px]">
          {pages[page].title}
        </h2>
        <p className="mx-auto mt-2 min-h-[48px] max-w-[330px] text-[17px] leading-snug font-semibold text-white/75 [@media(max-height:700px)]:text-[15px]">
          {pages[page].body}
        </p>
      </div>

      <div className="shrink-0 px-5 pt-3 pb-6">
        <button
          onClick={next}
          className={`flex h-[66px] w-full items-center justify-center gap-3 rounded-full text-[21px] font-extrabold transition active:scale-[0.97] ${
            last ? 'bg-brand text-white' : 'bg-white text-ink'
          }`}
        >
          {last ? t.howPlay : t.howNext}
          <Icon name="arrowRight" size={22} />
        </button>
      </div>
    </div>
  )
}

/** Captura del juego dentro de un marco de móvil. */
function Phone({ src, className = '', style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`relative h-full max-h-[480px] overflow-hidden rounded-[34px] border-[7px] border-[#2B2B2B] bg-brand shadow-[0_24px_60px_rgba(0,0,0,0.55)] ${className}`}
      style={{ aspectRatio: '450 / 975', ...style }}
    >
      <img src={src} alt="" draggable={false} className="pointer-events-none size-full object-cover object-top" />
    </div>
  )
}
