// Panda presentador: asoma desde abajo y comenta la partida en un bocadillo.

export function PandaFace({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 100 90" aria-hidden="true">
      <circle cx="21" cy="20" r="14" fill="#111" />
      <circle cx="79" cy="20" r="14" fill="#111" />
      <ellipse cx="50" cy="52" rx="42" ry="37" fill="#fff" />
      <ellipse cx="34" cy="49" rx="10" ry="13" transform="rotate(-22 34 49)" fill="#111" />
      <ellipse cx="66" cy="49" rx="10" ry="13" transform="rotate(22 66 49)" fill="#111" />
      <circle cx="35" cy="47" r="4.2" fill="#fff" />
      <circle cx="65" cy="47" r="4.2" fill="#fff" />
      <circle cx="36" cy="47.5" r="2.2" fill="#111" />
      <circle cx="64" cy="47.5" r="2.2" fill="#111" />
      <ellipse cx="50" cy="63" rx="6" ry="4" fill="#111" />
      <path d="M44 70 Q50 75 56 70" stroke="#111" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="64" r="5" fill="#FF8FA3" opacity="0.8" />
      <circle cx="75" cy="64" r="5" fill="#FF8FA3" opacity="0.8" />
    </svg>
  )
}

/** Panda con bocadillo, pegado al borde inferior de la pantalla. */
export default function PandaHost({ text }: { text: string }) {
  return (
    <div className="pointer-events-none flex shrink-0 items-end gap-2 overflow-hidden px-4 pt-2" aria-live="polite">
      <div className="animate-panda" style={{ animationDelay: '0.5s' }}>
        <div style={{ animation: 'bob 2.4s ease-in-out 1.2s infinite', transformOrigin: '50% 100%' }}>
          <PandaFace size={92} />
        </div>
      </div>
      <div className="mb-8 animate-pop" style={{ animationDelay: '0.9s' }}>
        <div className="relative rounded-[22px] rounded-bl-[6px] bg-white px-4 py-3 text-[16px] leading-snug font-extrabold text-ink shadow-[0_8px_20px_rgba(0,0,0,0.15)]">
          {text}
        </div>
      </div>
    </div>
  )
}
