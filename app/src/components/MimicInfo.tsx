/**
 * "¿Qué es Mimic?": pop-up a pantalla completa (mismo estilo que "Cómo se juega") que explica el bot impostor
 * con ilustraciones, sin salir de la app. Se abre desde la tarjeta de Mimic del mazo al crear sala.
 * "Entendido" (o Esc) lo cierra; el enlace pequeño lleva a la página legal /ai#mimic (en otra pestaña).
 */
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { Icon, TypingDots } from './ui'

export default function MimicInfo({ onClose, moreHref }: { onClose: () => void; moreHref?: string }) {
  const t = useT()
  const m = t.mimicInfo
  const [leaving, setLeaving] = useState(false)

  const close = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onClose, 250)
  }

  // Esc cierra; las flechas no deben responder la tarjeta del mazo que hay debajo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key.startsWith('Arrow') || e.key === 'Escape') e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const visuals = [<VisualWrites key="1" />, <VisualPenalty key="2" />, <VisualReveal key="3" />]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mimic-title"
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute inset-x-0 top-0 z-[60] flex h-full flex-col overflow-hidden bg-ink text-white sm:top-6 sm:h-[calc(100%-3rem)] sm:max-h-[900px] sm:rounded-[44px] ${leaving ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        onClick={close}
        aria-label={m.close}
        className="absolute top-2 right-2 z-10 flex size-[44px] items-center justify-center text-white/60 active:scale-90"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5">
        <div className="my-auto flex flex-col gap-2.5 pt-10 pb-2 [@media(max-height:799px)]:gap-2 [@media(max-height:799px)]:pt-8">
          {/* Ilustración principal: la IA disfrazada colándose entre los mensajes */}
          {/* Móviles altos: la escena entera; medianos: solo el robot; bajos (SE): nada, que quepa todo sin scroll */}
          <div className="flex animate-pop justify-center [@media(max-height:799px)]:hidden">
            <MimicHero />
          </div>
          <div className="hidden animate-pop justify-center [@media(min-height:701px)_and_(max-height:799px)]:flex">
            <RobotFace size={56} />
          </div>

          <div className="mb-1 text-center">
            <div className="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">{m.eyebrow}</div>
            <h2 id="mimic-title" className="mt-1 text-[32px] leading-[1.02] font-black tracking-[-0.03em] text-balance [@media(max-height:799px)]:text-[28px]">
              {m.title}
            </h2>
            <p className="mx-auto mt-2 max-w-[310px] text-[16px] leading-snug font-medium text-white/70">{m.intro}</p>
            {moreHref && (
              <a href={moreHref} target="_blank" rel="noopener" className="inline-flex h-[32px] items-center px-2 text-[13px] font-bold text-white/45 underline underline-offset-4">
                {m.more}
              </a>
            )}
          </div>

          {/* Cada paso: título corto + su ilustración (sin párrafos: que se entienda de un vistazo) */}
          {m.steps.map((title, i) => (
            <div key={title} className="animate-rise rounded-[24px] bg-white px-4 py-3 text-ink [@media(max-height:799px)]:py-2.5" style={{ animationDelay: `${0.25 + i * 0.2}s` }}>
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[16px] font-black text-white">{i + 1}</span>
                <div className="min-w-0 text-[18px] leading-tight font-black tracking-[-0.01em]">{title}</div>
              </div>
              <div className="mt-2.5 pl-11 [@media(max-height:799px)]:mt-2">{visuals[i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 pt-2 pb-6">
        <button
          onClick={close}
          className="flex h-[66px] w-full items-center justify-center gap-3 rounded-full bg-brand text-[21px] font-extrabold text-white transition active:scale-[0.97]"
        >
          {m.cta}
        </button>
      </div>
    </div>
  )
}

/* ── Ilustraciones ─────────────────────────────────────────────────────────── */

/** Cabeza de robot con disfraz (gafas, nariz y bigote): la "IA que se hace pasar por alguien". */
function RobotFace({ size = 120, disguise = true }: { size?: number; disguise?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {/* antena */}
      <line x1="60" y1="10" x2="60" y2="26" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="10" r="7" fill="#EE2B2B" className="mimic-blink" />
      {/* orejas */}
      <rect x="6" y="52" width="12" height="28" rx="5" fill="#fff" />
      <rect x="102" y="52" width="12" height="28" rx="5" fill="#fff" />
      {/* cabeza */}
      <rect x="16" y="26" width="88" height="80" rx="26" fill="#fff" />
      {/* pantalla de la cara */}
      <rect x="27" y="38" width="66" height="56" rx="18" fill="#111" />
      {/* ojos que miran a los lados */}
      <g className="mimic-eyes">
        <circle cx="46" cy="60" r="6" fill="#fff" />
        <circle cx="74" cy="60" r="6" fill="#fff" />
      </g>
      {disguise && (
        <g>
          {/* gafas */}
          <circle cx="46" cy="60" r="11" fill="none" stroke="#EE2B2B" strokeWidth="4" />
          <circle cx="74" cy="60" r="11" fill="none" stroke="#EE2B2B" strokeWidth="4" />
          <line x1="57" y1="60" x2="63" y2="60" stroke="#EE2B2B" strokeWidth="4" />
          {/* nariz */}
          <ellipse cx="60" cy="72" rx="6" ry="5" fill="#F5B700" />
          {/* bigote */}
          <path className="mimic-stache" d="M42 82c6-6 12-6 18-2 6-4 12-4 18 2-6 4-12 3-18-1-6 4-12 5-18 1z" fill="#fff" />
        </g>
      )}
    </svg>
  )
}

function MimicHero() {
  const t = useT()
  return (
    <div className="relative h-[118px] w-[280px]">
      {/* mensajes "de verdad" a los lados */}
      <div className="absolute top-3 left-0 animate-rise rounded-[18px] rounded-bl-[4px] bg-white/12 px-3 py-2 text-[14px] font-semibold text-white/80" style={{ animationDelay: '0.15s' }}>
        {t.mimicInfo.heroA}
      </div>
      <div className="absolute right-0 bottom-3 animate-rise rounded-[18px] rounded-br-[4px] bg-white/12 px-3 py-2 text-[14px] font-semibold text-white/80" style={{ animationDelay: '0.3s' }}>
        {t.mimicInfo.heroB}
      </div>
      {/* la IA disfrazada en medio, con su "escribiendo…" */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 mimic-bob">
        <RobotFace size={104} />
      </div>
      <div className="absolute bottom-0 left-[44px] flex h-[30px] items-center rounded-full bg-white px-3 [&>span]:scale-75">
        <TypingDots />
      </div>
    </div>
  )
}

/** Mini avatar del bot (círculo negro con la cara del robot). */
const BotDot = ({ size = 26 }: { size?: number }) => (
  <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink" style={{ width: size, height: size }}>
    <RobotFace size={size * 0.95} disguise={false} />
  </span>
)

/** 1 · Escribe como tu amigo: su burbuja parece una más. */
function VisualWrites() {
  const t = useT()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex animate-rise items-end gap-2" style={{ animationDelay: '0.45s' }}>
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[12px] font-extrabold text-white">P</span>
        <div className="rounded-[16px] rounded-bl-[4px] bg-neutral-100 px-3 py-1.5 text-[14px] font-semibold">{t.mimicInfo.demoReal}</div>
      </div>
      <div className="flex animate-rise items-end gap-2" style={{ animationDelay: '0.75s' }}>
        <BotDot />
        <div className="rounded-[16px] rounded-bl-[4px] bg-neutral-100 px-3 py-1.5 text-[14px] font-semibold">{t.mimicInfo.demoFake}</div>
      </div>
    </div>
  )
}

/** 2 · Si la votas, −100. */
function VisualPenalty() {
  const t = useT()
  return (
    <div className="flex items-center gap-2">
      <span className="flex animate-pop items-center gap-1.5 rounded-[16px] bg-white px-3 py-1.5 text-[14px] font-semibold outline-[3px] outline-ink outline-solid" style={{ animationDelay: '0.65s' }}>
        <Icon name="check" size={14} />
        {t.mimicInfo.demoFake}
      </span>
      <span className="animate-pop text-[17px] font-black text-brand" style={{ animationDelay: '1s' }}>
        −100
      </span>
    </div>
  )
}

/** 3 · Al revelar, sale marcada. */
function VisualReveal() {
  const t = useT()
  return (
    <div className="flex animate-pop items-center gap-2.5 rounded-[16px] bg-ink px-3 py-2 text-white" style={{ animationDelay: '0.85s' }}>
      <BotDot size={28} />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[14px] font-semibold">{t.mimicInfo.demoFake}</div>
        <div className="text-[11px] font-black tracking-[0.08em] text-brand">{t.mimicTag}</div>
      </div>
    </div>
  )
}
