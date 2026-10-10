/**
 * "¿Qué es Mimic?": UNA sola pantalla con los colores de la app (fondo rojo con dibujitos, tarjeta blanca,
 * botón blanco con texto rojo). Dos ideas: qué es Mimic y que evites su respuesta porque si la votas pierdes 100.
 * Se abre desde la tarjeta de Mimic del mazo al crear sala; cerrar (Entendido / ✕ / Esc) devuelve a esa tarjeta.
 */
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import ChatDoodles from './ChatDoodles'
import { Button, Icon } from './ui'

export default function MimicInfo({ onClose, moreHref }: { onClose: () => void; moreHref?: string }) {
  const m = useT().mimicInfo
  const [leaving, setLeaving] = useState(false)

  const close = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onClose, 250)
  }

  // Esc cierra; las flechas no deben mover la tarjeta del mazo que hay debajo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (!e.key.startsWith('Arrow')) return
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mimic-title"
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute inset-x-0 top-0 isolate z-[60] flex h-full flex-col overflow-hidden bg-brand text-white sm:top-6 sm:h-[calc(100%-3rem)] sm:max-h-[900px] sm:rounded-[44px] ${leaving ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ChatDoodles seed={7} className="-z-10" />

      <button
        onClick={close}
        aria-label={m.close}
        className="absolute top-2 right-2 z-10 flex size-[44px] items-center justify-center rounded-full text-white active:scale-90 active:bg-white/15"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4">
        <div className="my-auto pt-12 pb-3 [@media(max-height:700px)]:pt-11">
          {/* Tarjeta blanca, como las del mazo, que se despliega y flota sobre el rojo */}
          <div className="origin-top animate-unfold rounded-[36px] bg-white px-7 pt-7 pb-6 text-ink shadow-[0_22px_50px_rgba(90,0,0,0.28)] [@media(max-height:700px)]:px-6 [@media(max-height:700px)]:pt-5 [@media(max-height:700px)]:pb-5">
            <span className="mimic-bob flex size-[88px] items-center justify-center rounded-full bg-ink [@media(max-height:700px)]:size-[68px]">
              <RobotFace size={64} />
            </span>
            <h2 id="mimic-title" className="mt-5 text-[34px] leading-[1.04] font-black tracking-[-0.035em] [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:text-[30px]">
              {m.title}
            </h2>
            <p className="mt-2.5 text-[18px] leading-snug font-semibold text-neutral-500 [@media(max-height:700px)]:text-[16px]">{m.body}</p>

            {/* El aviso: su respuesta, votada… y el −100 que salta */}
            <div className="mt-5 rounded-[24px] bg-neutral-100 p-4 [@media(max-height:700px)]:mt-4">
              <div className="flex items-center gap-3">
                <span className="mimic-voted flex min-w-0 items-center gap-2 rounded-[18px] bg-white px-3.5 py-2.5 text-[16px] font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.08)] outline-[3px] outline-ink outline-solid">
                  <Icon name="check" size={16} />
                  <span className="truncate">{m.demoFake}</span>
                </span>
                <span className="mimic-minus shrink-0 text-[32px] leading-none font-black tracking-[-0.03em] text-brand tabular-nums">−100</span>
              </div>
              <p className="mt-3 text-[17px] leading-snug font-extrabold">{m.avoid}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center px-5 pt-2 pb-4">
        <Button onClick={close}>{m.cta}</Button>
        {moreHref && (
          <a href={moreHref} target="_blank" rel="noopener" className="flex h-[40px] items-center px-2 text-[14px] font-bold text-white/75 underline underline-offset-4">
            {m.more}
          </a>
        )}
      </div>
    </div>
  )
}

/** Cabeza de robot con disfraz (gafas, nariz y bigote): la IA que se hace pasar por alguien. */
function RobotFace({ size = 120 }: { size?: number }) {
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
      <circle cx="46" cy="60" r="11" fill="none" stroke="#EE2B2B" strokeWidth="4" />
      <circle cx="74" cy="60" r="11" fill="none" stroke="#EE2B2B" strokeWidth="4" />
      <line x1="57" y1="60" x2="63" y2="60" stroke="#EE2B2B" strokeWidth="4" />
      <ellipse cx="60" cy="72" rx="6" ry="5" fill="#F5B700" />
      <path className="mimic-stache" d="M42 82c6-6 12-6 18-2 6-4 12-4 18 2-6 4-12 3-18-1-6 4-12 5-18 1z" fill="#fff" />
    </svg>
  )
}
