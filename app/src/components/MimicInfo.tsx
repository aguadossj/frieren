/**
 * "¿Qué es Mimic?": mismo formato que "Cómo jugar" (HowToPlay): pantalla completa oscura, progreso tipo stories,
 * páginas que se pasan deslizando a los lados (scroll-snap nativo, o botón / ← →) y en cada una una ilustración
 * grande + título + una frase. Poca información: qué es, qué hace y qué pasa si la votas.
 * Se abre desde la tarjeta de Mimic del mazo al crear sala; cerrar devuelve a esa misma tarjeta.
 */
import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { Icon, TypingDots } from './ui'

export default function MimicInfo({ onClose, moreHref }: { onClose: () => void; moreHref?: string }) {
  const t = useT()
  const m = t.mimicInfo
  const pages = m.pages
  const [page, setPage] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const pager = useRef<HTMLDivElement>(null)
  const last = page === pages.length - 1

  const close = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onClose, 250)
  }
  const go = (to: number) => {
    const el = pager.current
    if (!el || to < 0 || to >= pages.length) return
    el.scrollTo({ left: to * el.clientWidth, behavior: 'smooth' })
  }
  const next = () => (last ? close() : go(page + 1))

  // Teclado: ← → pasan página y Esc cierra. En fase de captura y sin propagar: el mazo de debajo no debe enterarse.
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

  const visuals = [<SceneAI key="ai" />, <SceneCopy key="copy" />, <ScenePenalty key="penalty" />]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mimic-title"
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute inset-x-0 top-0 z-[60] flex h-full flex-col overflow-hidden bg-ink text-white sm:top-6 sm:h-[calc(100%-3rem)] sm:max-h-[900px] sm:rounded-[44px] ${leaving ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Progreso tipo "stories" + Saltar (igual que "Cómo jugar") */}
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

      <div
        ref={pager}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.round(el.scrollLeft / el.clientWidth)
          if (i !== page) setPage(Math.max(0, Math.min(pages.length - 1, i)))
        }}
      >
        {pages.map((p, i) => (
          <section key={p.title} className="flex w-full shrink-0 snap-center snap-always flex-col" aria-hidden={i !== page}>
            {/* La ilustración se vuelve a montar al llegar a su página, para que su animación empiece entonces */}
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-3" key={i === page ? 'on' : 'off'}>
              {visuals[i]}
            </div>
            <div className="shrink-0 px-6 text-center">
              <div className="text-[13px] font-extrabold tracking-[0.16em] text-brand">
                {i + 1} / {pages.length}
              </div>
              <h2 id={i === page ? 'mimic-title' : undefined} className="mt-1 text-[32px] leading-[1.05] font-black tracking-[-0.03em] [@media(max-height:700px)]:text-[27px]">
                {p.title}
              </h2>
              <p className="mx-auto mt-2 min-h-[48px] max-w-[330px] text-[17px] leading-snug font-semibold text-white/75 [@media(max-height:700px)]:text-[15px]">
                {p.body}
              </p>
            </div>
          </section>
        ))}
      </div>

      <div className="shrink-0 px-5 pt-3 pb-6">
        <button
          onClick={next}
          className={`flex h-[66px] w-full items-center justify-center gap-3 rounded-full text-[21px] font-extrabold transition active:scale-[0.97] ${
            last ? 'bg-brand text-white' : 'bg-white text-ink'
          }`}
        >
          {last ? m.cta : t.howNext}
          {!last && <Icon name="arrowRight" size={22} />}
        </button>
        {/* Detalle legal (AI Act), discreto y solo al final */}
        <div className={`flex h-[34px] items-end justify-center ${last && moreHref ? '' : 'invisible'}`}>
          <a href={moreHref} target="_blank" rel="noopener" tabIndex={last ? 0 : -1} className="text-[13px] font-bold text-white/45 underline underline-offset-4">
            {m.more}
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Ilustraciones (grandes, una idea por página) ──────────────────────────── */

/** Cabeza de robot con disfraz (gafas, nariz y bigote): la IA que se hace pasar por alguien. */
function RobotFace({ size = 120, disguise = true }: { size?: number; disguise?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <line x1="60" y1="10" x2="60" y2="26" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="10" r="7" fill="#EE2B2B" className="mimic-blink" />
      <rect x="6" y="52" width="12" height="28" rx="5" fill="#fff" />
      <rect x="102" y="52" width="12" height="28" rx="5" fill="#fff" />
      <rect x="16" y="26" width="88" height="80" rx="26" fill="#fff" />
      <rect x="27" y="38" width="66" height="56" rx="18" fill="#111" />
      <g className="mimic-eyes">
        <circle cx="46" cy="60" r="6" fill="#fff" />
        <circle cx="74" cy="60" r="6" fill="#fff" />
      </g>
      {disguise && (
        <g>
          <circle cx="46" cy="60" r="11" fill="none" stroke="#EE2B2B" strokeWidth="4" />
          <circle cx="74" cy="60" r="11" fill="none" stroke="#EE2B2B" strokeWidth="4" />
          <line x1="57" y1="60" x2="63" y2="60" stroke="#EE2B2B" strokeWidth="4" />
          <ellipse cx="60" cy="72" rx="6" ry="5" fill="#F5B700" />
          <path className="mimic-stache" d="M42 82c6-6 12-6 18-2 6-4 12-4 18 2-6 4-12 3-18-1-6 4-12 5-18 1z" fill="#fff" />
        </g>
      )}
    </svg>
  )
}

/** Avatar del bot (círculo blanco con la cara del robot). */
const BotAvatar = ({ size = 40 }: { size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full bg-white" style={{ width: size, height: size }}>
    <RobotFace size={size * 0.9} />
  </span>
)

const Avatar = ({ letter, color, size = 40 }: { letter: string; color: string; size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-white" style={{ background: color, width: size, height: size, fontSize: size * 0.45 }}>
    {letter}
  </span>
)

/** 1 · Mimic es una IA: el robot disfrazado, grande, con su "escribiendo…". */
function SceneAI() {
  return (
    <div className="relative flex animate-pop flex-col items-center">
      <div className="flex size-[min(230px,34vh)] items-center justify-center rounded-full bg-brand mimic-bob">
        <RobotFace size={170} />
      </div>
      <div className="absolute -right-3 bottom-2 flex h-[46px] animate-pop items-center rounded-full rounded-br-[8px] bg-white px-4" style={{ animationDelay: '0.5s' }}>
        <TypingDots />
      </div>
    </div>
  )
}

/** 2 · Escribe como tu amigo: dos burbujas casi iguales, una de verdad y otra de Mimic. */
function SceneCopy() {
  const m = useT().mimicInfo
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-4">
      <div className="flex animate-rise items-end gap-2.5" style={{ animationDelay: '0.1s' }}>
        <Avatar letter="P" color="#2563EB" />
        <div className="rounded-[22px] rounded-bl-[6px] bg-white px-4 py-3 text-[19px] font-semibold text-ink">{m.demoReal}</div>
      </div>
      <div className="flex animate-rise items-end justify-end gap-2.5" style={{ animationDelay: '0.55s' }}>
        <div className="rounded-[22px] rounded-br-[6px] bg-white px-4 py-3 text-[19px] font-semibold text-ink">{m.demoFake}</div>
        <BotAvatar />
      </div>
    </div>
  )
}

/** 3 · ¡No la votes!: votas la de Mimic y salta el −100. */
function ScenePenalty() {
  const m = useT().mimicInfo
  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-5">
      <div className="flex animate-pop items-center gap-2.5 rounded-[22px] bg-white px-4 py-3 text-[19px] font-semibold text-ink outline-[4px] outline-brand outline-solid" style={{ animationDelay: '0.1s' }}>
        <Icon name="check" size={20} />
        {m.demoFake}
        <BotAvatar size={34} />
      </div>
      <div className="animate-pop text-[64px] leading-none font-black tracking-[-0.04em] text-brand" style={{ animationDelay: '0.6s' }}>
        −100
      </div>
    </div>
  )
}
