/**
 * "¿Qué es Mimic?": UNA sola pantalla, rápida y visual (a pantalla completa, mismo fondo negro que "Cómo se juega").
 * Arriba el bot; en medio una mini votación que se explica sola: la respuesta de Mimic se gira, enseña "AI" y salta
 * el −100. Va encima del mazo (no lo desmonta): al volver sigues en la misma tarjeta.
 */
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { GLYPHS } from './SwipeDeck'
import { Icon } from './ui'

const MIMIC = 1 // posición de la respuesta de Mimic en la votación de ejemplo

export default function MimicInfo({ onClose, moreHref }: { onClose: () => void; moreHref?: string }) {
  const t = useT()
  const m = t.mimicInfo
  const [leaving, setLeaving] = useState(false)
  const close = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onClose, 220)
  }

  // Esc cierra; ninguna tecla llega al mazo de debajo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (!e.key.startsWith('Arrow')) return
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mimic-title"
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute inset-x-0 top-0 z-[60] flex h-full flex-col overflow-hidden bg-ink text-white sm:top-6 sm:h-[calc(100%-3rem)] sm:max-h-[900px] sm:rounded-[44px] ${leaving ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex shrink-0 px-3 pt-2">
        <button type="button" onClick={close} className="flex h-[44px] items-center gap-2 px-2 text-[17px] font-extrabold text-white/80 active:scale-95">
          <Icon name="arrowLeft" size={20} />
          {t.back}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 overflow-y-auto overscroll-contain px-6 py-4 [@media(max-height:700px)]:gap-5">
        {/* El bot */}
        <div className="relative shrink-0 animate-pop">
          <span className="absolute inset-[-14px] animate-ping rounded-full bg-brand/25" style={{ animationDuration: '2.4s' }} />
          <span className="relative flex size-[104px] items-center justify-center rounded-full bg-white text-ink [@media(max-height:700px)]:size-[84px] [&>svg]:size-[56px]">
            {GLYPHS.robot}
          </span>
          <span className="absolute -right-2 -bottom-1 rounded-full bg-brand px-2.5 py-0.5 text-[14px] font-black tracking-[0.08em] ring-4 ring-ink">AI</span>
        </div>

        <div className="max-w-[340px] animate-rise text-center" style={{ animationDelay: '0.1s' }}>
          <div className="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">{m.eyebrow}</div>
          <h1 id="mimic-title" className="mt-1.5 text-[34px] leading-[1.05] font-black tracking-[-0.03em] [@media(max-height:700px)]:text-[29px]">
            {m.title}
          </h1>
          <p className="mt-2 text-[17px] leading-snug font-semibold text-white/75 [@media(max-height:700px)]:text-[15px]">{m.body}</p>
        </div>

        {/* Mini votación: la de Mimic se gira, enseña "AI" y salta el −100 */}
        <div className="flex w-full max-w-[340px] shrink-0 flex-col gap-2">
          {m.demo.map((answer, i) =>
            i === MIMIC ? (
              <div key={answer} className="relative h-[58px] [perspective:700px]">
                <div className="mimic-flip relative h-full [transform-style:preserve-3d]">
                  <div className="absolute inset-0 flex items-center gap-3 rounded-[18px] bg-white px-3.5 text-ink [backface-visibility:hidden]">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[14px] font-black text-neutral-500">B</span>
                    <span className="truncate text-[17px] font-semibold">{answer}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center gap-3 rounded-[18px] bg-[#1F1F1F] px-3.5 ring-2 ring-white/20 [backface-visibility:hidden] [transform:rotateX(180deg)]">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-black text-ink">AI</span>
                    <span className="min-w-0 flex-1 truncate text-[17px] font-semibold">{answer}</span>
                    <span className="mimic-minus shrink-0 rounded-full bg-brand px-3 py-1 text-[17px] font-black tabular-nums">−100</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={answer}
                className="flex h-[58px] animate-rise items-center gap-3 rounded-[18px] bg-white px-3.5 text-ink opacity-90"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[14px] font-black text-neutral-500">{'ABC'[i]}</span>
                <span className="truncate text-[17px] font-semibold">{answer}</span>
              </div>
            ),
          )}
          <p className="mt-1 animate-rise text-center text-[16px] font-extrabold" style={{ animationDelay: '1.6s' }}>
            {m.avoid}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1 px-5 pt-2 pb-6">
        <button
          onClick={close}
          className="flex h-[66px] w-full items-center justify-center rounded-full bg-brand text-[21px] font-extrabold text-white transition active:scale-[0.97]"
        >
          {m.cta}
        </button>
        {moreHref && (
          <a href={moreHref} target="_blank" rel="noopener" className="flex h-[36px] items-center justify-center text-[14px] font-bold text-white/60 underline underline-offset-4">
            {m.more}
          </a>
        )}
      </div>
    </div>
  )
}
