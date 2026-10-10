import { Body, Screen, TypingDots } from '../components/ui'

// La IA está preparando la conversación de la ronda (solo con IA activada; máx. ~12 s y luego respaldo).
export default function Generating() {
  return (
    <Screen>
      <Body className="items-center justify-center gap-5 text-center">
        <div className="flex h-[52px] w-[70px] animate-pop items-center justify-center rounded-full bg-white">
          <TypingDots />
        </div>
        <h1 className="text-[34px] leading-tight font-black tracking-[-0.03em]">Reading your group chat…</h1>
        <p className="text-[18px] font-semibold text-white/85">The AI is cooking up the next conversation.</p>
      </Body>
    </Screen>
  )
}
