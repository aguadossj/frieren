import { useT } from '../i18n'

// Panda presentador (estilo dibujo animado: pelo crema, contorno negro, boca abierta):
// asoma desde abajo saludando con la pata, parpadea y comenta la partida en un bocadillo.

const INK = '#1A1A1A'
const CREAM = '#FBF6E6'
const SHADE = '#E8DDBF'
const OUT = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

export function PandaFace({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 150) / 160} viewBox="0 0 160 150" aria-hidden="true" overflow="visible">
      {/* Brazo izquierdo, abierto hacia fuera */}
      <path d="M54 110 C40 110 22 114 12 121 C4 126 7 137 17 137 C30 137 44 131 56 126 Z" fill={INK} {...OUT} />
      <path d="M14 127 L18 131 M20 124 L24 129" stroke="#3B3B3B" strokeWidth={2.4} strokeLinecap="round" />

      {/* Brazo derecho, saludando */}
      <g style={{ transformOrigin: '110px 116px', animation: 'wave 1.6s ease-in-out 1.1s 3' }}>
        <path d="M106 112 C120 104 132 90 138 74 C141 64 155 64 155 75 C154 92 138 112 116 126 Z" fill={INK} {...OUT} />
        <path d="M143 70 L144 75 M149 69 L149 74" stroke="#3B3B3B" strokeWidth={2.4} strokeLinecap="round" />
      </g>

      {/* Pecho negro y barriga crema */}
      <path d="M38 152 C38 122 56 104 80 104 C104 104 122 122 122 152 Z" fill={INK} {...OUT} />
      <path d="M54 152 C54 132 64 122 80 122 C96 122 106 132 106 152 Z" fill={CREAM} {...OUT} strokeWidth={3} />
      <path d="M60 152 C62 140 70 134 80 134 C90 134 98 140 100 152 Z" fill={SHADE} opacity={0.55} />

      {/* Orejas con el interior más claro */}
      <circle cx="37" cy="27" r="18" fill={INK} {...OUT} />
      <circle cx="123" cy="27" r="18" fill={INK} {...OUT} />
      <path d="M33 34 C30 26 34 18 42 17" fill="none" stroke="#3B3B3B" strokeWidth={6} strokeLinecap="round" />
      <path d="M127 34 C130 26 126 18 118 17" fill="none" stroke="#3B3B3B" strokeWidth={6} strokeLinecap="round" />

      {/* Cabeza con mofletes, sombra bajo la barbilla y mechón arriba */}
      <path
        d="M80 15 C113 15 135 35 137 60 C139 80 129 96 113 104 C101 110 91 112 80 112 C69 112 59 110 47 104 C31 96 21 80 23 60 C25 35 47 15 80 15 Z"
        fill={CREAM}
        {...OUT}
      />
      <path d="M30 80 C40 98 60 106 80 106 C100 106 120 98 130 80 C126 96 104 109 80 109 C56 109 34 96 30 80 Z" fill={SHADE} />
      <path d="M71 18 C72 11 78 9 81 14 C83 9 90 10 89 18" fill={CREAM} {...OUT} strokeWidth={3} />

      {/* Cejas */}
      <path d="M43 37 C49 31 58 31 64 35" fill="none" {...OUT} strokeWidth={3} />
      <path d="M96 35 C102 31 111 31 117 37" fill="none" {...OUT} strokeWidth={3} />

      {/* Manchas de los ojos, inclinadas hacia fuera */}
      <ellipse cx="56" cy="58" rx="15" ry="18.5" transform="rotate(28 56 58)" fill={INK} />
      <ellipse cx="104" cy="58" rx="15" ry="18.5" transform="rotate(-28 104 58)" fill={INK} />

      {/* Ojos grandes con brillo; parpadean */}
      <g style={{ transformOrigin: '80px 57px', animation: 'blink 4.2s ease-in-out 2s infinite' }}>
        <circle cx="59" cy="56" r="9.5" fill="#fff" />
        <circle cx="101" cy="56" r="9.5" fill="#fff" />
        <circle cx="61" cy="57" r="6.2" fill={INK} />
        <circle cx="99" cy="57" r="6.2" fill={INK} />
        <circle cx="63.2" cy="54.4" r="2.4" fill="#fff" />
        <circle cx="101.2" cy="54.4" r="2.4" fill="#fff" />
      </g>

      {/* Hocico, nariz con brillo y boca abierta con lengua */}
      <path d="M62 84 C62 72 70 68 80 68 C90 68 98 72 98 84 C98 94 90 99 80 99 C70 99 62 94 62 84 Z" fill="#FFFDF6" />
      <path d="M70 75 C70 70 90 70 90 75 C90 81 84 85 80 85 C76 85 70 81 70 75 Z" fill={INK} />
      <ellipse cx="75.5" cy="74" rx="3.6" ry="1.8" fill="#fff" opacity={0.75} />
      <path d="M80 85 V89" {...OUT} strokeWidth={2.8} />
      <path d="M67 88 Q80 93 93 88 Q91 105 80 105 Q69 105 67 88 Z" fill="#8C2B2B" {...OUT} strokeWidth={2.8} />
      <path d="M71.5 99 Q80 93.5 88.5 99 Q86 104.5 80 104.5 Q74 104.5 71.5 99 Z" fill="#F28C8C" />

      {/* Mejillas */}
      <ellipse cx="40" cy="83" rx="8" ry="5" fill="#FF9EB1" opacity={0.75} />
      <ellipse cx="120" cy="83" rx="8" ry="5" fill="#FF9EB1" opacity={0.75} />
    </svg>
  )
}

/** Panda con bocadillo, pegado al borde inferior de su zona. */
export default function PandaHost({ text }: { text: string }) {
  const t = useT()
  return (
    <div className="pointer-events-none flex shrink-0 items-end gap-0 overflow-hidden pr-4" aria-live="polite">
      <div className="-mb-2 shrink-0 animate-panda" style={{ animationDelay: '0.5s' }}>
        <div style={{ animation: 'bob 2.6s ease-in-out 1.4s infinite', transformOrigin: '50% 100%' }}>
          <PandaFace size={150} />
        </div>
      </div>
      <div className="mb-16 min-w-0 animate-pop" style={{ animationDelay: '0.9s' }}>
        <div className="relative rounded-[22px] bg-white px-4 py-3 text-ink">
          <div className="text-[12px] font-extrabold tracking-[0.14em] text-brand">{t.pandaSays}</div>
          <p className="text-[16px] leading-snug font-extrabold">{text}</p>
          {/* Colita del bocadillo hacia el panda */}
          <svg className="absolute bottom-3 -left-2.5" width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
            <path d="M14 0 L14 16 L0 12 Z" fill="#fff" />
          </svg>
        </div>
      </div>
    </div>
  )
}
