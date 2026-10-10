/**
 * "Cómo se juega": 4 páginas a pantalla completa (formato en Explainer.tsx).
 * Cada página enseña una captura REAL del juego (app/public/howto/{es|en}-*.webp, sacadas de una partida de verdad)
 * dentro de un móvil, con un título y una frase.
 * Sale solo la primera vez que alguien entra en la web, por donde entre (portada o enlace/QR de una sala), y luego
 * desde el botón "Cómo jugar" de la portada. Se recuerda en localStorage y en una cookie.
 */
import { useEffect } from 'react'
import { useLang, useT } from '../i18n'
import Explainer from './Explainer'

const SEEN_KEY = 'typing.howto.seen'
const SHOTS = ['chat', 'vote', 'reveal', 'standings'] as const

/**
 * Encuadre de cada página según lo que explica:
 * - full: el iPhone entero (se ve la pantalla completa).
 * - zoom: el iPhone muy grande, centrado en una zona (focus = fracción del alto del móvil) y fundido arriba y abajo.
 */
type Frame = { mode: 'full'; tilt: number } | { mode: 'zoom'; focus: number; tilt: number }
const FRAMES: Frame[] = [
  { mode: 'full', tilt: -3 }, // chat: todo el chat y la respuesta a medio escribir
  { mode: 'zoom', focus: 0.3, tilt: 1.5 }, // votación: las opciones
  { mode: 'zoom', focus: 0.27, tilt: -1.5 }, // revelación: titular y resultados
  { mode: 'full', tilt: 3 }, // clasificación: barras y panda
]
const PHONE_RATIO = 2.2 // alto / ancho del iPhone dibujado (marco + barra de estado + captura)

const COOKIE = 'typing_seen=1'

/**
 * ¿Ha entrado ya alguna vez en la web? Se mira en dos sitios (localStorage y una cookie de 1 año): si cualquiera
 * de los dos lo recuerda, no se vuelve a enseñar. Si el navegador no deja guardar nada, tampoco se enseña
 * (mejor eso que salir en cada visita).
 */
export function seenHowTo(): boolean {
  let stored = false
  let canStore = false
  try {
    stored = localStorage.getItem(SEEN_KEY) === '1'
    canStore = true
  } catch {
    /* sin localStorage */
  }
  try {
    if (document.cookie.split('; ').includes(COOKIE)) stored = true
    if (navigator.cookieEnabled) canStore = true
  } catch {
    /* sin cookies */
  }
  return stored || !canStore
}

const preloaded = new Set<string>()

/**
 * Descarga y decodifica en segundo plano las 4 capturas de un idioma (una sola vez por idioma), para que al abrir
 * "Cómo se juega" (primera visita o botón "Cómo jugar") salgan al instante y no en blanco.
 */
export function preloadHowTo(lang: string) {
  if (preloaded.has(lang)) return
  preloaded.add(lang)
  for (const shot of SHOTS) {
    const img = new Image()
    img.decoding = 'async'
    img.src = `/howto/${lang}-${shot}.webp`
    img.decode?.().catch(() => {})
  }
}

/** Se marca al ENSEÑARLO (primera visita), no al cerrarlo: recargar ya no lo vuelve a sacar. */
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* sin localStorage */
  }
  try {
    document.cookie = `${COOKIE}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`
  } catch {
    /* sin cookies */
  }
}

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  const t = useT()
  const lang = useLang()

  useEffect(markSeen, [])

  const visual = (i: number) => {
    const frame = FRAMES[i]
    const src = `/howto/${lang}-${SHOTS[i]}.webp`
    return frame.mode === 'full' ? (
      <div className="flex h-full items-center justify-center px-5 py-2">
        <IPhone src={src} tilt={frame.tilt} className="h-full max-h-[620px]" />
      </div>
    ) : (
      <>
        {/* Zoom: el móvil más ancho que la pantalla, desplazado para que la zona clave quede en el centro */}
        <div
          className="absolute left-1/2 w-[min(94vw,400px)] -translate-x-1/2"
          style={{ top: `calc(50% - ${frame.focus * PHONE_RATIO} * min(94vw, 400px))` }}
        >
          <IPhone src={src} tilt={frame.tilt} className="w-full" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink via-ink/80 to-transparent" />
      </>
    )
  }

  return (
    <Explainer
      pages={t.howPages.map((p, i) => ({ ...p, visual: visual(i) }))}
      onClose={onClose}
      next={t.howNext}
      done={t.howPlay}
      skip={t.howSkip}
      // Las 4 capturas montadas y ya decodificadas: al cambiar de página salen al instante
      preload={SHOTS.map((shot) => (
        <img key={shot} src={`/howto/${lang}-${shot}.webp`} alt="" decoding="sync" fetchPriority="high" />
      ))}
    />
  )
}

/**
 * iPhone dibujado alrededor de la captura: marco negro, Dynamic Island, barra de estado (9:41, cobertura, wifi, batería)
 * y botones laterales. Todo escala con el ancho del móvil (unidades cqw).
 */
function IPhone({ src, tilt = 0, className = '' }: { src: string; tilt?: number; className?: string }) {
  return (
    <div className={`@container relative ${className}`} style={{ aspectRatio: `1 / ${PHONE_RATIO}`, rotate: `${tilt}deg` }}>
      {/* Botones laterales */}
      <span className="absolute top-[17%] -left-[1.1cqw] h-[6%] w-[1.6cqw] rounded-l-[1cqw] bg-[#2A2A2A]" />
      <span className="absolute top-[25%] -left-[1.1cqw] h-[9%] w-[1.6cqw] rounded-l-[1cqw] bg-[#2A2A2A]" />
      <span className="absolute top-[35%] -left-[1.1cqw] h-[9%] w-[1.6cqw] rounded-l-[1cqw] bg-[#2A2A2A]" />
      <span className="absolute top-[28%] -right-[1.1cqw] h-[14%] w-[1.6cqw] rounded-r-[1cqw] bg-[#2A2A2A]" />
      {/* Marco */}
      <div className="absolute inset-0 rounded-[15cqw] bg-[#0B0B0B] p-[3.4cqw] shadow-[0_30px_70px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[11.6cqw] bg-white">
          {/* Barra de estado + Dynamic Island */}
          <div className="relative flex h-[12cqw] shrink-0 items-center justify-between px-[7cqw] text-[4.2cqw] font-bold text-black">
            <span className="tabular-nums">9:41</span>
            <span className="absolute top-[2.6cqw] left-1/2 h-[7.6cqw] w-[28cqw] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-[1.3cqw]">
              <svg viewBox="0 0 18 12" className="h-[3.3cqw]" aria-hidden="true">
                <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
                <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
                <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
              </svg>
              <svg viewBox="0 0 16 12" className="h-[3.3cqw]" aria-hidden="true">
                <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0L8 11.5ZM3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0L3.4 6.8ZM1 4.4a9.9 9.9 0 0 1 14 0l-1.4 1.4a7.9 7.9 0 0 0-11.2 0L1 4.4Z" fill="currentColor" />
              </svg>
              <svg viewBox="0 0 27 13" className="h-[3.5cqw]" aria-hidden="true">
                <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.4" />
                <rect x="2.5" y="2.5" width="17" height="8" rx="2" fill="currentColor" />
                <path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="currentColor" fillOpacity="0.4" />
              </svg>
            </span>
          </div>
          <img src={src} alt="" draggable={false} decoding="sync" fetchPriority="high" className="pointer-events-none min-h-0 w-full flex-1 object-cover object-top" />
          {/* Barra de inicio */}
          <span className="absolute bottom-[1.6cqw] left-1/2 h-[1.3cqw] w-[34cqw] -translate-x-1/2 rounded-full bg-black/80" />
        </div>
      </div>
    </div>
  )
}
