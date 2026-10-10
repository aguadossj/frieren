/**
 * "¿Qué es Mimic?": una página normal de la app, hecha con las mismas piezas que "Unirse a una sala"
 * (cabecera con ← Atrás, Eyebrow + titular + subtítulo, botón blanco abajo). Enseña la tarjeta tal cual sale
 * en la revelación ("MIMIC · la IA") y el castigo por votarla. Va encima del mazo (no lo desmonta), así que al
 * volver sigues en la misma tarjeta.
 */
import { useEffect } from 'react'
import { useT } from '../i18n'
import { AppHeader, Body, Button, Eyebrow, Footer, Icon, Row, Screen } from './ui'

export default function MimicInfo({ onClose, moreHref }: { onClose: () => void; moreHref?: string }) {
  const t = useT()
  const m = t.mimicInfo

  // Esc vuelve; las flechas no deben responder la tarjeta del mazo que hay debajo
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
    <div role="dialog" aria-modal="true" aria-labelledby="mimic-title" className="absolute inset-0 z-[60] flex flex-col" onPointerDown={(e) => e.stopPropagation()}>
      <Screen>
        <AppHeader
          left={
            <button type="button" onClick={onClose} className="-ml-2 flex h-[44px] items-center gap-2 px-2 text-[17px] font-extrabold active:scale-95">
              <Icon name="arrowLeft" size={20} />
              {t.back}
            </button>
          }
        />
        <Body className="gap-8 pt-6">
          <div className="animate-rise">
            <Eyebrow>{m.eyebrow}</Eyebrow>
            <h1 id="mimic-title" className="mt-2 text-[44px] leading-[1.02] font-black tracking-[-0.035em]">
              {m.title}
            </h1>
            <p className="mt-2 text-[18px] font-semibold text-white/85">{m.body}</p>
          </div>

          <div className="flex animate-rise flex-col gap-2.5" style={{ animationDelay: '0.15s' }}>
            {/* La misma tarjeta que sale en la revelación cuando una respuesta era de Mimic */}
            <div className="flex h-[84px] items-center gap-3.5 rounded-[22px] bg-ink px-4 text-white">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[14px] font-black text-ink">AI</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[17px] leading-snug font-semibold">{m.demoFake}</p>
                <p className="text-[13px] font-extrabold text-white/80">{t.mimicTag}</p>
              </div>
            </div>
            <Row>
              <span className="w-[72px] shrink-0 text-center text-[24px] font-black tracking-[-0.02em] text-brand tabular-nums">−100</span>
              <span className="text-[17px] leading-snug font-extrabold">{m.avoid}</span>
            </Row>
          </div>
        </Body>
        <Footer>
          <Button onClick={onClose}>{m.cta}</Button>
          {moreHref && (
            <a href={moreHref} target="_blank" rel="noopener" className="flex h-[32px] items-center justify-center text-[14px] font-bold text-white/70 underline underline-offset-4">
              {m.more}
            </a>
          )}
        </Footer>
      </Screen>
    </div>
  )
}
