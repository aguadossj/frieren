/**
 * "Cómo se juega": pantalla completa con 4 páginas. Deslizar a la derecha avanza y a la izquierda vuelve (o botón / ← →).
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
const SWIPE = 50 // px de deslizamiento para cambiar de página

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
  const [leaving, setLeaving] = useState(false)
  const [dir, setDir] = useState<1 | -1>(1)
  const startX = useRef<number | null>(null)
  const last = page === pages.length - 1

  useEffect(markSeen, [])

  const close = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onClose, 250)
  }
  const go = (to: number) => {
    if (to < 0 || to >= pages.length || to === page) return
    setDir(to > page ? 1 : -1)
    setPage(to)
  }
  const next = () => (last ? close() : go(page + 1))

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

      {/* Una página cada vez. Deslizar el dedo a la DERECHA avanza y a la IZQUIERDA vuelve; la animación va como
          siempre: la siguiente entra por la derecha y la anterior por la izquierda. */}
      <div
        className="flex min-h-0 flex-1 touch-pan-y flex-col select-none"
        onPointerDown={(e) => {
          startX.current = e.clientX
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return
          const dx = e.clientX - startX.current
          startX.current = null
          if (dx > SWIPE) next()
          else if (dx < -SWIPE) go(page - 1)
        }}
        onPointerCancel={() => {
          startX.current = null
        }}
      >
        <section
          key={page}
          className="flex min-h-0 flex-1 flex-col"
          style={{ animation: `${dir === 1 ? 'howto-in-right' : 'howto-in-left'} 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.1) both` }}
        >
          {/* Móvil grande "con zoom": se ve la parte de arriba de la pantalla y el resto se funde con el fondo */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="flex justify-center px-8 pt-5">
              <div className="w-[min(78vw,330px)]">
                <Phone src={`/howto/${lang}-${SHOTS[page]}.webp`} style={{ rotate: page % 2 ? '2.5deg' : '-2.5deg' }} />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink via-ink/80 to-transparent" />
          </div>
          <div className="shrink-0 px-6 pt-2 text-center">
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
        </section>
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
      className={`relative w-full overflow-hidden rounded-[38px] border-[8px] border-[#2B2B2B] bg-brand shadow-[0_24px_60px_rgba(0,0,0,0.55)] ${className}`}
      style={{ aspectRatio: '450 / 975', ...style }}
    >
      <img src={src} alt="" draggable={false} className="pointer-events-none size-full object-cover object-top" />
    </div>
  )
}
