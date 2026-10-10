// Mazo de preguntas sí/no estilo Tinder a pantalla completa: arrastra a la derecha (sí) o a la izquierda (no).
// Cada tarjeta entra desdoblándose como un papel; la primera hace un pequeño amago para enseñar el gesto.
// Sin botones; en escritorio también vale arrastrar con el ratón o ← →. Las respuestas se apilan arriba como burbujas.
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface SwipeCard {
  id: string
  question: string
  hint?: string
  /** Enlace pequeño bajo la pista: abre un pop-up (onClick) sin salir del mazo. */
  link?: { label: string; onClick: () => void }
  no: string
  yes: string
  icon: ReactNode
}

const THRESHOLD = 80 // px para que cuente como respuesta
const FLY_MS = 320

/** Iconos de línea blancos para el círculo negro de cada tarjeta. */
const glyph = (d: string) => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
export const GLYPHS = {
  people: glyph('M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M16 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.3c2.6.8 4.5 3.2 4.5 6.2'),
  flame: glyph('M12 2.5c.8 3.4 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.2.1 2.2 1 3.4 2.3 3.4 0-3.3-1.6-5.6.8-9.2z'),
  pin: glyph('M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'),
  robot: glyph('M5 9.5h14v10H5zM12 5.5v4M12 5.5a1.2 1.2 0 1 0 0-.1M9 13.5v1M15 13.5v1M9.5 17h5M2.5 13v3M21.5 13v3'),
  age: (
    <span className="text-[28px] leading-none font-black tracking-[-0.04em]" aria-hidden="true">
      18+
    </span>
  ),
}

export default function SwipeDeck({
  cards,
  lead,
  onAnswer,
}: {
  cards: SwipeCard[]
  lead: string // "Swipe if": va encima de cada respuesta del pie de la tarjeta
  onAnswer: (id: string, yes: boolean) => void
}) {
  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<null | 'yes' | 'no'>(null)
  const [given, setGiven] = useState<{ id: string; label: string; yes: boolean }[]>([])
  const start = useRef<number | null>(null)
  const passed = useRef(false) // para vibrar una sola vez al cruzar el umbral

  const card = cards[index]

  const answer = (yes: boolean) => {
    if (!card || leaving) return
    setLeaving(yes ? 'yes' : 'no')
    navigator.vibrate?.(18)
    setTimeout(() => {
      onAnswer(card.id, yes)
      setGiven((g) => [...g, { id: card.id, label: yes ? card.yes : card.no, yes }])
      setLeaving(null)
      setDx(0)
      setIndex((i) => i + 1)
    }, FLY_MS)
  }

  // Flechas del teclado (escritorio)
  const answerRef = useRef(answer)
  useEffect(() => {
    answerRef.current = answer
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') answerRef.current(true)
      if (e.key === 'ArrowLeft') answerRef.current(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const offset = leaving ? (leaving === 'yes' ? 600 : -600) : dx
  const yes = Math.min(1, Math.max(0, offset / THRESHOLD))
  const no = Math.min(1, Math.max(0, -offset / THRESHOLD))

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      {/* Respuestas dadas, como burbujas enviadas */}
      <div className="flex min-h-[34px] shrink-0 flex-wrap items-center justify-end gap-1.5">
        {given.map((g) => (
          <span
            key={g.id}
            className={`animate-pop rounded-[16px] rounded-br-[5px] px-3 py-1.5 text-[14px] font-extrabold ${g.yes ? 'bg-white text-good' : 'bg-ink text-white'}`}
          >
            {g.label}
          </span>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Mazo: las siguientes tarjetas asoman por detrás */}
        {cards.slice(index + 1, index + 3).map((c, i) => (
          <div
            key={c.id}
            className="absolute inset-0 rounded-[36px] bg-white transition-transform duration-300"
            style={{ transform: `translateY(${(i + 1) * 12}px) scale(${1 - (i + 1) * 0.05})`, opacity: 0.45 - i * 0.2 }}
            aria-hidden="true"
          />
        ))}

        {card && (
          <div
            key={card.id}
            className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
            style={{
              transform: `translateX(${offset}px) rotate(${offset / 16}deg)`,
              transition: dragging ? 'none' : `transform ${FLY_MS}ms cubic-bezier(0.3, 0.8, 0.4, 1)`,
            }}
            onPointerDown={(e) => {
              if (leaving) return
              start.current = e.clientX
              passed.current = false
              setDragging(true)
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (start.current === null) return
              const d = e.clientX - start.current
              if (!passed.current && Math.abs(d) > THRESHOLD) {
                passed.current = true
                navigator.vibrate?.(8)
              }
              setDx(d)
            }}
            onPointerUp={() => {
              if (start.current === null) return
              start.current = null
              setDragging(false)
              if (Math.abs(dx) > THRESHOLD) answer(dx > 0)
              else setDx(0)
            }}
            onPointerCancel={() => {
              start.current = null
              setDragging(false)
              setDx(0)
            }}
          >
            {/* Amago en la primera tarjeta para enseñar el gesto */}
            <div className="h-full" style={index === 0 && !dragging && !dx ? { animation: 'swipe-hint 0.9s ease-in-out 0.8s 2' } : undefined}>
              <div className="relative flex h-full origin-top animate-unfold flex-col overflow-hidden rounded-[36px] bg-white px-7 pt-7 pb-7 text-ink">
                {/* Pliegue del papel que se desvanece al desdoblarse */}
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/25" style={{ animation: 'crease 0.9s ease-out both' }} />

                <div className="text-right text-[15px] font-extrabold tabular-nums text-neutral-400">
                  {index + 1}/{cards.length}
                </div>

                <div className="flex flex-1 flex-col justify-center gap-6">
                  <span className="flex size-[88px] items-center justify-center rounded-full bg-ink text-white">{card.icon}</span>
                  <div>
                    <p className="text-[40px] leading-[1.04] font-black tracking-[-0.035em]">{card.question}</p>
                    {card.hint && <p className="mt-4 text-[18px] leading-snug font-semibold text-neutral-500">{card.hint}</p>}
                    {card.link && (
                      <button
                        type="button"
                        onClick={card.link.onClick}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="-ml-1 mt-2 inline-flex h-[44px] items-center px-1 text-[16px] font-extrabold text-ink underline decoration-brand decoration-2 underline-offset-4"
                      >
                        {card.link.label}
                      </button>
                    )}
                  </div>
                </div>

                {/* Pie: "Swipe if No" arriba a la izquierda y "Swipe if Yes" abajo a la derecha, torcidos,
                    cada uno con una flecha a mano que apunta hacia donde hay que deslizar */}
                <div className="relative h-[104px] shrink-0 whitespace-nowrap">
                  <div
                    className="absolute top-0 left-[-6px] flex -rotate-[6deg] items-center gap-1 transition-opacity"
                    style={{ opacity: 1 - yes * 0.8 }}
                  >
                    <span className="swipe-nudge-l">
                      <Scribble flip />
                    </span>
                    <span className="leading-none">
                      <span className="block text-[14px] font-bold text-neutral-400">{lead}</span>
                      <span className="block text-[22px] font-black">{card.no}</span>
                    </span>
                  </div>
                  <div
                    className="absolute right-[-6px] bottom-0 flex rotate-[4deg] items-center gap-1 text-good transition-opacity"
                    style={{ opacity: 1 - no * 0.8 }}
                  >
                    <span className="text-right leading-none">
                      <span className="block text-[14px] font-bold text-neutral-400">{lead}</span>
                      <span className="block text-[22px] font-black">{card.yes}</span>
                    </span>
                    <span className="swipe-nudge-r">
                      <Scribble />
                    </span>
                  </div>
                </div>

                {/* Al arrastrar: la tarjeta se tiñe y aparece la respuesta en grande, como burbuja */}
                <div className="pointer-events-none absolute inset-0 bg-good" style={{ opacity: yes }} />
                <div className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: no }} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                  <span
                    className="rounded-[28px] rounded-br-[8px] bg-white px-7 py-4 text-center text-[34px] leading-tight font-black text-good"
                    style={{ opacity: yes, transform: `scale(${0.7 + yes * 0.3})` }}
                  >
                    {card.yes}
                  </span>
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                  <span
                    className="rounded-[28px] rounded-bl-[8px] bg-white px-7 py-4 text-center text-[34px] leading-tight font-black text-ink"
                    style={{ opacity: no, transform: `scale(${0.7 + no * 0.3})` }}
                  >
                    {card.no}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Flecha dibujada a mano (trazo curvo + punta de dos rayas) que se "dibuja" al entrar la tarjeta. Apunta a la derecha; `flip` a la izquierda. */
function Scribble({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="72"
      height="55"
      viewBox="0 0 58 44"
      fill="none"
      stroke="currentColor"
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="scribble block"
      style={flip ? { transform: 'scaleX(-1) rotate(8deg)' } : { transform: 'rotate(-4deg)' }}
      aria-hidden="true"
    >
      <path pathLength={1} d="M4 38c9 2.5 22 1 33-7.5 6-4.6 10.5-11 13.5-19" />
      <path pathLength={1} className="scribble-head" d="M39.5 14.5 50.8 9.5 54 21.5" />
    </svg>
  )
}
