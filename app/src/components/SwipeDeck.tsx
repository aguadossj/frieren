// Mazo de preguntas sí/no estilo Tinder: arrastra a la derecha (sí) o a la izquierda (no).
// Cada tarjeta entra desdoblándose como un papel. Los botones de abajo hacen lo mismo (sin depender del gesto).
import { useRef, useState } from 'react'

export interface SwipeCard {
  id: string
  question: string
  hint?: string
  no: string
  yes: string
}

const THRESHOLD = 90 // px para que cuente como respuesta
const FLY_MS = 280

export default function SwipeDeck({ cards, onAnswer }: { cards: SwipeCard[]; onAnswer: (id: string, yes: boolean) => void }) {
  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
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

  if (!card) return null

  const offset = leaving ? (leaving === 'yes' ? 520 : -520) : dx
  const tilt = offset / 18
  const yesOpacity = Math.min(1, Math.max(0, offset / THRESHOLD))
  const noOpacity = Math.min(1, Math.max(0, -offset / THRESHOLD))

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-[330px] w-full">
        {/* Siguiente tarjeta, doblada y esperando detrás */}
        {next && (
          <div className="absolute inset-0 translate-y-3 scale-[0.94] rounded-[32px] bg-white/35" aria-hidden="true" />
        )}

        <div
          key={card.id}
          className="absolute inset-0 touch-none select-none"
          style={{
            transform: `translateX(${offset}px) rotate(${tilt}deg)`,
            transition: start.current === null ? `transform ${FLY_MS}ms ease-out` : 'none',
          }}
          onPointerDown={(e) => {
            if (leaving) return
            start.current = e.clientX
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setDx(e.clientX - start.current)
          }}
          onPointerUp={() => {
            if (start.current === null) return
            start.current = null
            if (Math.abs(dx) > THRESHOLD) answer(dx > 0)
            else setDx(0)
          }}
          onPointerCancel={() => {
            start.current = null
            setDx(0)
          }}
        >
          <div className="relative flex h-full origin-top animate-unfold flex-col justify-between overflow-hidden rounded-[32px] bg-white p-7 text-ink shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            {/* Pliegue del papel: una línea en el centro que se desvanece al desdoblarse */}
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 bg-gradient-to-b from-transparent via-black/15 to-transparent"
              style={{ animation: 'crease 0.9s ease-out both' }}
            />

            <div className="flex items-center justify-between text-[14px] font-extrabold tracking-[0.14em] text-neutral-400">
              <span>
                {index + 1} / {cards.length}
              </span>
              <span>SWIPE</span>
            </div>

            <div>
              <p className="text-[32px] leading-[1.08] font-black tracking-[-0.02em]">{card.question}</p>
              {card.hint && <p className="mt-3 text-[16px] font-semibold text-neutral-500">{card.hint}</p>}
            </div>

            <div className="flex items-center justify-between text-[15px] font-extrabold">
              <span className="text-neutral-400">← {card.no}</span>
              <span className="text-good">{card.yes} →</span>
            </div>

            {/* Sellos que aparecen al arrastrar */}
            <span
              className="pointer-events-none absolute top-8 left-6 -rotate-12 rounded-xl border-4 border-good px-3 py-1 text-[30px] font-black text-good"
              style={{ opacity: yesOpacity }}
            >
              YES
            </span>
            <span
              className="pointer-events-none absolute top-8 right-6 rotate-12 rounded-xl border-4 border-brand px-3 py-1 text-[30px] font-black text-brand"
              style={{ opacity: noOpacity }}
            >
              NO
            </span>
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => answer(false)}
          className="h-[60px] rounded-full bg-ink text-[18px] font-extrabold text-white transition active:scale-95"
        >
          {card.no}
        </button>
        <button
          type="button"
          onClick={() => answer(true)}
          className="h-[60px] rounded-full bg-white text-[18px] font-extrabold text-brand transition active:scale-95"
        >
          {card.yes}
        </button>
      </div>
    </div>
  )
}
