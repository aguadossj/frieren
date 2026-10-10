/**
 * Explicación a pantalla completa por páginas (la usan "Cómo se juega" y "¿Qué es Mimic?").
 * Fondo negro, progreso tipo "stories" arriba, una ilustración grande, título y frase, y un botón abajo.
 * Deslizar el dedo a la DERECHA avanza y a la IZQUIERDA vuelve; la página siguiente entra por la derecha.
 * También: botón, tramos del progreso, ← → y Esc. Las teclas no llegan a lo que haya debajo (p. ej. el mazo).
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './ui'

export interface ExplainerPage {
  title: string
  body: string
  visual: ReactNode
}

const SWIPE = 50 // px de deslizamiento para cambiar de página

export default function Explainer({
  pages,
  onClose,
  next: nextLabel,
  done,
  skip,
  footer,
  preload,
}: {
  pages: ExplainerPage[]
  onClose: () => void
  next: string
  done: string
  skip: string
  footer?: ReactNode // p. ej. un enlace debajo del botón
  preload?: ReactNode // imágenes invisibles para que estén decodificadas antes de enseñarlas
}) {
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [leaving, setLeaving] = useState(false)
  const startX = useRef<number | null>(null)
  const last = page === pages.length - 1

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

  // Teclado: ← → para pasar, Esc para cerrar (en captura, para que no lo reciba lo de debajo)
  const keys = useRef({ next, prev: () => go(page - 1), close })
  useEffect(() => {
    keys.current = { next, prev: () => go(page - 1), close }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') keys.current.next()
      else if (e.key === 'ArrowLeft') keys.current.prev()
      else if (e.key === 'Escape') keys.current.close()
      else return
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="explainer-title"
      onPointerDown={(e) => e.stopPropagation()}
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
            {skip}
          </button>
        )}
      </div>

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
          <div className="relative min-h-0 flex-1 overflow-hidden">{pages[page].visual}</div>
          <div className="shrink-0 px-6 pt-2 text-center">
            <div className="text-[13px] font-extrabold tracking-[0.16em] text-brand">
              {page + 1} / {pages.length}
            </div>
            <h2 id="explainer-title" className="mt-1 text-[32px] leading-[1.05] font-black tracking-[-0.03em] [@media(max-height:700px)]:text-[27px]">
              {pages[page].title}
            </h2>
            <p className="mx-auto mt-2 min-h-[48px] max-w-[330px] text-[17px] leading-snug font-semibold text-white/75 [@media(max-height:700px)]:text-[15px]">
              {pages[page].body}
            </p>
          </div>
        </section>
      </div>

      {preload && (
        <div className="pointer-events-none absolute size-px overflow-hidden opacity-0" aria-hidden="true">
          {preload}
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-1 px-5 pt-3 pb-6">
        <button
          onClick={next}
          className={`flex h-[66px] w-full items-center justify-center gap-3 rounded-full text-[21px] font-extrabold transition active:scale-[0.97] ${
            last ? 'bg-brand text-white' : 'bg-white text-ink'
          }`}
        >
          {last ? done : nextLabel}
          <Icon name="arrowRight" size={22} />
        </button>
        {footer}
      </div>
    </div>
  )
}
