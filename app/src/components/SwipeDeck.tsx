// Mazo de preguntas sí/no estilo Tinder a pantalla completa: arrastra a la derecha (sí) o a la izquierda (no).
// Cada tarjeta entra desdoblándose como un papel. Sin botones; en escritorio también vale arrastrar con el ratón o ← →.
import { useEffect, useRef, useState } from 'react'

export interface SwipeCard {
  id: string
  question: string
  hint?: string
  no: string
  yes: string
}

const THRESHOLD = 80 // px para que cuente como respuesta
const FLY_MS = 300

export default function SwipeDeck({ cards, onAnswer }: { cards: SwipeCard[]; onAnswer: (id: string, yes: boolean) => void }) {
  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<null | 'yes' | 'no'>(null)
  const start = useRef<number | null>(null)

  const card = cards[index]
  const next = cards[index + 1]

  const answer = (yes: boolean) => {
    if (!card || leaving) return
    setLeaving(yes ? 'yes' : 'no')
    navigator.vibrate?.(15)
    setTimeout(() => {
      onAnswer(card.id, yes)
      setLeaving(null)
      setDx(0)
      setIndex((i) => i + 1)
    }, FLY_MS)
  }

  // Flechas del teclado (escritorio)
  const answerRef = useRef(answer)
  answerRef.current = answer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') answerRef.current(true)
      if (e.key === 'ArrowLeft') answerRef.current(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!card) return null

  const offset = leaving ? (leaving === 'yes' ? 560 : -560) : dx
  const tilt = offset / 16
  const yesOpacity = Math.min(1, Math.max(0, offset / THRESHOLD))
  const noOpacity = Math.min(1, Math.max(0, -offset / THRESHOLD))

  return (
    <div className="relative min-h-0 w-full flex-1">
      {/* Siguiente tarjeta esperando detrás */}
      {next && <div className="absolute inset-0 translate-y-3 scale-[0.95] rounded-[36px] bg-white/35" aria-hidden="true" />}

      <div
        key={card.id}
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        style={{
          transform: `translateX(${offset}px) rotate(${tilt}deg)`,
          transition: dragging ? 'none' : `transform ${FLY_MS}ms ease-out`,
        }}
        onPointerDown={(e) => {
          if (leaving) return
          start.current = e.clientX
          setDragging(true)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (start.current !== null) setDx(e.clientX - start.current)
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
        <div className="relative flex h-full origin-top animate-unfold flex-col justify-between overflow-hidden rounded-[36px] bg-white px-7 pt-7 pb-8 text-ink shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
          {/* Pliegue del papel: línea central que se desvanece al desdoblarse */}
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-12 -translate-y-1/2 bg-gradient-to-b from-transparent via-black/15 to-transparent"
            style={{ animation: 'crease 0.9s ease-out both' }}
          />

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5" aria-label={`Question ${index + 1} of ${cards.length}`}>
              {cards.map((c, i) => (
                <span key={c.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-7 bg-ink' : i < index ? 'w-3 bg-ink/40' : 'w-3 bg-neutral-200'}`} />
              ))}
            </div>
            <span className="text-[13px] font-extrabold tracking-[0.16em] text-neutral-400">SWIPE</span>
          </div>

          <div>
            <p className="text-[42px] leading-[1.02] font-black tracking-[-0.03em]">{card.question}</p>
            {card.hint && <p className="mt-4 text-[18px] font-semibold text-neutral-500">{card.hint}</p>}
          </div>

          <div className="flex items-end justify-between gap-4 text-[18px] leading-tight font-extrabold">
            <span className="flex items-center gap-2 text-brand">
              <span className="text-[26px] leading-none">←</span>
              {card.no}
            </span>
            <span className="flex items-center gap-2 text-right text-good">
              {card.yes}
              <span className="text-[26px] leading-none">→</span>
            </span>
          </div>

          {/* Sellos que aparecen al arrastrar */}
          <span
            className="pointer-events-none absolute top-24 left-6 -rotate-12 rounded-2xl border-[5px] border-good px-4 py-1 text-[44px] font-black text-good"
            style={{ opacity: yesOpacity }}
          >
            YES
          </span>
          <span
            className="pointer-events-none absolute top-24 right-6 rotate-12 rounded-2xl border-[5px] border-brand px-4 py-1 text-[44px] font-black text-brand"
            style={{ opacity: noOpacity }}
          >
            NO
          </span>
        </div>
      </div>
    </div>
  )
}
