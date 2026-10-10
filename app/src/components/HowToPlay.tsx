/**
 * "Cómo se juega": pantalla completa con 4 páginas que se pasan una a una (botón, deslizar o ← →).
 * Cada página enseña una captura REAL del juego (app/public/howto/{es|en}-*.webp, sacadas de una partida de verdad)
 * dentro de un móvil, con un título y una frase.
 * Sale solo la primera vez que alguien abre la web (se recuerda en localStorage) y desde el botón "Cómo jugar" de la portada.
 */
import { useEffect, useRef, useState } from 'react'
import { useLang, useT } from '../i18n'
import { Icon } from './ui'

const SEEN_KEY = 'typing.howto.seen'
const SHOTS = ['chat', 'vote', 'reveal', 'standings'] as const

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
  const lang = useLang()
  const pages = t.howPages
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [leaving, setLeaving] = useState(false)
  const startX = useRef<number | null>(null)
  const last = page === pages.length - 1

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

      {/* Captura real dentro de un móvil; se puede deslizar para pasar de página */}
      <div
        className="flex min-h-0 flex-1 touch-pan-y items-center justify-center px-6 py-3 select-none"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return
          const dx = e.clientX - startX.current
          startX.current = null
          if (dx < -50) next()
          else if (dx > 50) go(page - 1)
        }}
        onPointerCancel={() => (startX.current = null)}
      >
        <div
          key={page}
          className="relative h-full max-h-[480px] overflow-hidden rounded-[34px] border-[7px] border-[#2B2B2B] bg-brand shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          style={{
            aspectRatio: '450 / 975',
            animation: `${dir === 1 ? 'howto-in-right' : 'howto-in-left'} 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.1) both`,
            rotate: page % 2 ? '2deg' : '-2deg',
          }}
        >
          <img
            src={`/howto/${lang}-${SHOTS[page]}.webp`}
            alt=""
            draggable={false}
            className="size-full object-cover object-top"
          />
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
