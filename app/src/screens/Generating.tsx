import { Body, Screen, TypingDots } from '../components/ui'
import { useT } from '../i18n'

// La IA está preparando la conversación de la ronda (solo con IA activada; máx. ~12 s y luego respaldo).
export default function Generating() {
  const t = useT()
  return (
    <Screen>
      <Body className="items-center justify-center gap-5 text-center">
        <div className="flex h-[52px] w-[70px] animate-pop items-center justify-center rounded-full bg-white">
          <TypingDots />
        </div>
        <h1 className="text-[34px] leading-tight font-black tracking-[-0.03em]">{t.generatingTitle}</h1>
        <p className="text-[18px] font-semibold text-white/85">{t.generatingSub}</p>
      </Body>
    </Screen>
  )
}
