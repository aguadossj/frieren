// Fondo del chat estilo "papel pintado" de WhatsApp: pandas y cervezas blancos de línea, con poca opacidad,
// repartidos al azar (distintos en cada ronda, fijos durante la ronda). Puramente decorativo.
import { useMemo } from 'react'

// Solo pandas y cervezas, dibujados con línea en una caja de 24×24 (trazo blanco, sin relleno)
const PANDA = [
  'M4 13a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', // cabeza
  'M3.6 6.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0', // oreja izquierda
  'M15.2 6.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0', // oreja derecha
  'M7.3 12.8c-.2-1.7 1-2.9 2.3-2.5s1.5 2.1.7 3.2-2.8.9-3-.7z', // mancha ojo izq.
  'M16.7 12.8c.2-1.7-1-2.9-2.3-2.5s-1.5 2.1-.7 3.2 2.8.9 3-.7z', // mancha ojo der.
  'M11 15.6h2M12 15.6v1.1M10.7 17.6c.8.5 1.8.5 2.6 0', // nariz y boca
].join(' ')

const PANDA_WINK = [
  'M4 13a8 8 0 1 0 16 0a8 8 0 1 0 -16 0',
  'M3.6 6.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0',
  'M15.2 6.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0',
  'M7.3 12.8c-.2-1.7 1-2.9 2.3-2.5s1.5 2.1.7 3.2-2.8.9-3-.7z',
  'M14 12.4c.8-.6 1.8-.6 2.6 0', // ojo guiñado
  'M11 15.6h2M12 15.6v1.1M10.4 17.3c1 1 2.2 1 3.2 0', // sonrisa
].join(' ')

const BEER_MUG = [
  'M5 9h10v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z', // jarra
  'M15 11h2.4a2.4 2.4 0 0 1 0 4.8H15', // asa
  'M4.4 9c-.3-1.9 1.2-3.5 3-3.1a3 3 0 0 1 4.8-.7 2.7 2.7 0 0 1 3.4 2.3c.1.6-.1 1.1-.4 1.5', // espuma
  'M8.5 12.5v5.5M11.5 12.5v5.5', // reflejos
].join(' ')

const BEER_BOTTLE = [
  'M10.5 2h3v4.2l1.8 2.6c.4.5.6 1.1.6 1.8V20a2 2 0 0 1-2 2h-3.8a2 2 0 0 1-2-2v-9.4c0-.7.2-1.3.6-1.8l1.8-2.6z', // botella
  'M8.1 13h7.8M8.1 18h7.8', // etiqueta
].join(' ')

const CHEERS = [
  'M3 8l6-1.6 1.8 7a3 3 0 0 1-2.1 3.6l-.4.1a3 3 0 0 1-3.6-2.1z', // vaso izq.
  'M21 8l-6-1.6-1.8 7a3 3 0 0 0 2.1 3.6l.4.1a3 3 0 0 0 3.6-2.1z', // vaso der.
  'M3.5 10l6.1-1.6M20.5 10l-6.1-1.6', // espuma
  'M12 2.5v2M9.5 3.5l.8 1.6M14.5 3.5l-.8 1.6', // chin-chin
].join(' ')

// Más pandas que cervezas (y de vez en cuando un brindis)
const ICONS: string[] = [PANDA, PANDA, PANDA_WINK, BEER_MUG, BEER_MUG, BEER_BOTTLE, CHEERS]

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

type Doodle = { d: string; x: number; y: number; r: number; s: number }

/**
 * Posiciones aleatorias de verdad (no en rejilla): se lanzan puntos al azar y se aceptan si no se
 * solapan con los ya puestos. La distancia se mide "dando la vuelta" en horizontal y en vertical, así
 * el patrón encaja consigo mismo por los cuatro lados y se puede desplazar en diagonal sin cortes.
 */
function scatter(seed: number, target: number, gap: number): Doodle[] {
  const rand = rng(seed * 7919 + 17)
  const out: (Doodle & { rad: number })[] = []
  for (let tries = 0; tries < target * 45 && out.length < target; tries++) {
    const sc = 0.8 + rand() ** 1.6 * 0.95 // casi todos pequeños/medianos, algunos grandes
    const rad = 12 * sc + gap
    const x = rand() * W
    const y = rand() * H
    const free = out.every((o) => {
      let dx = Math.abs(o.x - x)
      dx = Math.min(dx, W - dx) // vuelta horizontal
      let dy = Math.abs(o.y - y)
      dy = Math.min(dy, H - dy) // vuelta vertical
      return dx * dx + dy * dy >= (o.rad + rad) ** 2
    })
    if (!free) continue
    out.push({ d: ICONS[Math.floor(rand() * ICONS.length)], x, y, r: Math.round(rand() * 90 - 45), s: sc, rad })
  }
  return out
}

export default function ChatDoodles({
  seed,
  opacity = 0.13,
  className = '',
  drift = false,
}: {
  seed: number
  opacity?: number
  className?: string
  /** Pantalla principal: más dibujos y desplazamiento lento y continuo en diagonal (izquierda y hacia abajo). */
  drift?: boolean
}) {
  const items = useMemo(() => (drift ? scatter(seed, 240, 2) : scatter(seed, 150, 6)), [seed, drift])
  // Copias del patrón para cubrir cualquier desplazamiento: encaja consigo mismo por los cuatro lados
  const offsets = drift
    ? [[0, 0], [W, 0], [0, -H], [W, -H]] // se mueve a la izquierda (copia a la derecha) y hacia abajo (copia arriba)
    : [[-W, 0], [0, 0], [W, 0], [0, -H], [0, H]]
  const paths = offsets.flatMap(([dx, dy]) =>
    items.map((it, i) => (
      <path
        key={`${dx}:${dy}:${i}`}
        d={it.d}
        transform={`translate(${it.x + dx} ${it.y + dy}) rotate(${it.r}) scale(${it.s}) translate(-12 -12)`}
      />
    )),
  )

  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMin slice"
      style={{ opacity }}
    >
      <g fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {drift ? (
          // Dos animaciones independientes (horizontal y vertical) con distinta duración = diagonal suave
          <g className="doodle-drift-x">
            <g className="doodle-drift-y">{paths}</g>
          </g>
        ) : (
          paths
        )}
      </g>
    </svg>
  )
}
