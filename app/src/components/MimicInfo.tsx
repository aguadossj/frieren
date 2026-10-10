/**
 * "¿Qué es Mimic?": 3 páginas a pantalla completa con el mismo formato que "Cómo se juega" (Explainer.tsx).
 * Ilustraciones hechas con piezas del juego: el bot escribiendo, la votación con su respuesta camuflada y la
 * tarjeta "MIMIC · la IA" de la revelación con el −100. Va encima del mazo (no lo desmonta): al volver sigues
 * en la misma tarjeta.
 */
import { useT } from '../i18n'
import Explainer from './Explainer'
import { GLYPHS } from './SwipeDeck'
import { TypingDots } from './ui'

const MIMIC = 1 // posición de la respuesta de Mimic en la votación de ejemplo

export default function MimicInfo({ onClose, moreHref }: { onClose: () => void; moreHref?: string }) {
  const t = useT()
  const m = t.mimicInfo
  const visuals = [<BotTyping key="bot" label={m.typing} reply={m.demo[MIMIC]} />, <VoteDemo key="vote" answers={m.demo} />, <Penalty key="penalty" reply={m.demo[MIMIC]} tag={t.mimicTag} />]

  return (
    <Explainer
      pages={m.pages.map((p, i) => ({ ...p, visual: visuals[i] }))}
      onClose={onClose}
      next={t.howNext}
      done={m.cta}
      skip={t.howSkip}
      footer={
        moreHref && (
          <a href={moreHref} target="_blank" rel="noopener" className="flex h-[36px] items-center justify-center text-[14px] font-bold text-white/60 underline underline-offset-4">
            {m.more}
          </a>
        )
      }
    />
  )
}

/** 1 · El bot (robot en un círculo blanco) escribiendo su respuesta, como en el chat. */
function BotTyping({ label, reply }: { label: string; reply: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
      <div className="relative animate-pop">
        <span className="absolute inset-[-18px] animate-ping rounded-full bg-brand/25" style={{ animationDuration: '2.2s' }} />
        <span className="relative flex size-[132px] items-center justify-center rounded-full bg-white text-ink [&>svg]:size-[70px]">{GLYPHS.robot}</span>
        <span className="absolute -right-1 -bottom-1 rounded-full bg-brand px-3 py-1 text-[15px] font-black tracking-[0.08em] ring-4 ring-ink">AI</span>
      </div>
      <div className="flex w-full max-w-[300px] flex-col items-start gap-2">
        <span className="pl-1 text-[13px] font-extrabold text-white/60">{label}</span>
        <div className="animate-rise rounded-[22px] rounded-bl-[6px] bg-white px-5 py-3 text-ink" style={{ animationDelay: '0.3s' }}>
          <TypingDots />
        </div>
        <div className="animate-rise self-end rounded-[22px] rounded-br-[6px] bg-brand px-5 py-3 text-[18px] font-semibold" style={{ animationDelay: '1.1s' }}>
          {reply}
        </div>
      </div>
    </div>
  )
}

/** 2 · La votación: la respuesta de Mimic parece una más (con un "?" que la señala sin delatarla). */
function VoteDemo({ answers }: { answers: string[] }) {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-7">
      {answers.map((a, i) => (
        <div key={a} className="flex h-[76px] animate-rise items-center gap-3.5 rounded-[22px] bg-white px-4 text-ink" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[16px] font-black text-neutral-500">{'ABC'[i]}</span>
          <span className="min-w-0 flex-1 truncate text-[18px] font-semibold">{a}</span>
          {i === MIMIC && (
            <span className="flex size-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-brand text-[17px] font-black text-white">?</span>
          )}
        </div>
      ))}
    </div>
  )
}

/** 3 · La revelación: la tarjeta de Mimic (como en el juego) y el −100 a quien la votó. */
function Penalty({ reply, tag }: { reply: string; tag: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-7">
      <div className="flex h-[84px] w-full animate-flip items-center gap-3.5 rounded-[22px] bg-[#1F1F1F] px-4 ring-2 ring-white/15">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[14px] font-black text-ink">AI</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-semibold">{reply}</p>
          <p className="text-[13px] font-extrabold text-white/70">{tag}</p>
        </div>
      </div>
      <div className="animate-pop text-[96px] leading-none font-black tracking-[-0.05em] text-brand" style={{ animationDelay: '0.45s' }}>
        −100
      </div>
    </div>
  )
}
