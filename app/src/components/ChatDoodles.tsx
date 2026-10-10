// Fondo del chat estilo "papel pintado" de WhatsApp: dibujitos blancos de línea, con poca opacidad,
// repartidos al azar (distintos en cada ronda, fijos durante la ronda). Puramente decorativo.
import { useMemo } from 'react'

// Iconos de línea en una caja de 24×24 (trazo blanco, sin relleno)
const ICONS: string[] = [
  'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z', // corazón
  'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z', // estrella
  'M4 5h16v10H9l-5 4z', // bocadillo de chat
  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01', // cara sonriente
  'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z', // nota musical
  'M13 2L4 14h7l-1 8 9-12h-7z', // rayo
  'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M11 3v2', // taza de café
  'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 19h2', // móvil
  'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18', // destello
  'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z', // luna
  'M3 12h4l3-8 4 16 3-8h4', // pulso / onda
  'M7 4h10l-1 16H8zM6 4h12M10 8v8M14 8v8', // vaso
  'M4 18L18 4M14 4h4v4M6 14l4 4', // flecha
  'M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', // pin
  'M3 7h18M3 12h18M3 17h12', // líneas de texto
  'M7 10a5 5 0 0 1 10 0v4l2 3H5l2-3zM10 20a2 2 0 0 0 4 0', // campana
]

/** Pseudoaleatorio con semilla: mismo dibujo durante toda la ronda, distinto en cada una. */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const W = 400
const H = 900
const CELL = 74 // rejilla con desplazamiento aleatorio: reparto uniforme pero sin parecer una cuadrícula

export default function ChatDoodles({ seed, opacity = 0.13 }: { seed: number; opacity?: number }) {
  const items = useMemo(() => {
    const rand = rng(seed * 7919 + 17)
    const out: { d: string; x: number; y: number; r: number; s: number }[] = []
    for (let row = 0; row * CELL < H; row++) {
      for (let col = 0; col * CELL < W; col++) {
        if (rand() < 0.12) continue // algún hueco para que respire
        out.push({
          d: ICONS[Math.floor(rand() * ICONS.length)],
          x: col * CELL + 10 + rand() * (CELL - 40) + (row % 2 ? CELL / 2 : 0),
          y: row * CELL + 10 + rand() * (CELL - 40),
          r: Math.round(rand() * 60 - 30),
          s: 0.9 + rand() * 0.5,
        })
      }
    }
    return out
  }, [seed])

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMin slice"
      style={{ opacity }}
    >
      <g fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {items.map((it, i) => (
          <path key={i} d={it.d} transform={`translate(${it.x} ${it.y}) rotate(${it.r} 12 12) scale(${it.s})`} />
        ))}
      </g>
    </svg>
  )
}
