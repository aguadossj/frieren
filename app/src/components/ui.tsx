// Componentes base (T2 es dueño). Estilo: design-refs/STYLE.md + design-refs/mockup.png (rojo, blanco, negro).
// Escala del mockup: pills grandes, tipografía muy gruesa, cabecera blanca y cuerpo rojo.

import { useEffect, useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import type { Player } from '../game/types'
import { joinUrl } from './QR'
import { setLang, useLang } from '../i18n'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Iconos de línea (estilo lucide), heredan el color del texto. */
const ICONS = {
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  replay: 'M4 4v6h6M4.6 15a8 8 0 1 0 1.8-8.3L4 10',
} as const

export function Icon({ name, size = 20, className = '' }: { name: keyof typeof ICONS; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

/** Cabecera de la app: marca a la izquierda y, dentro de una sala, el código (tocar = copiar el enlace). */
export function AppHeader({ code, left }: { code?: string; left?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!code) return
    const url = joinUrl(code)
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    } else if (navigator.share) void navigator.share({ title: 'Typing…', url }).catch(() => {})
  }
  return (
    <div className="flex h-[56px] shrink-0 items-center justify-between gap-3 px-5">
      {left ?? <span className="text-[22px] font-black tracking-[-0.03em] text-brand">Typing…</span>}
      {code && (
        <button onClick={copy} aria-label="Copy invite link" className="flex h-[38px] items-center gap-2 rounded-full bg-neutral-100 px-4 text-ink active:scale-95">
          <span className="text-[16px] font-extrabold tracking-[0.18em]">{code}</span>
          <Icon name={copied ? 'check' : 'copy'} size={15} className={copied ? 'text-good' : 'text-neutral-400'} />
        </button>
      )}
    </div>
  )
}

/** Etiqueta pequeña en mayúsculas sobre un título ("NEW ROOM", "ROOM CODE"). */
export const Eyebrow = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={cx('text-[13px] font-extrabold tracking-[0.16em] uppercase opacity-80', className)}>{children}</div>
)

/** Marco de pantalla. En escritorio se ve como un móvil centrado (como el mockup). */
export function Screen({ children, dark = false, className = '' }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <main
      className={cx(
        'flex h-full flex-col overflow-hidden text-white sm:my-6 sm:h-[calc(100%-3rem)] sm:max-h-[900px] sm:rounded-[44px] sm:shadow-2xl',
        dark ? 'bg-ink' : 'bg-brand',
        className,
      )}
    >
      {children}
    </main>
  )
}

/** Zona con scroll entre la cabecera y el pie. */
export function Body({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex flex-1 flex-col overflow-y-auto px-5 pb-5', className)}>{children}</div>
}

/** Pie fijo (botones). */
export function Footer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex shrink-0 flex-col gap-3 px-5 pt-2 pb-6', className)}>{children}</div>
}

export function TopBar({ title, subtitle, right, avatar }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; avatar?: ReactNode }) {
  return (
    <header className="flex min-h-[72px] shrink-0 items-center gap-3 bg-white px-6 py-3 text-ink">
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[20px] leading-tight font-extrabold">{title}</div>
        {subtitle && <div className="truncate text-[15px] font-semibold text-brand">{subtitle}</div>}
      </div>
      {right}
    </header>
  )
}

/** Texto rojo a la derecha de la cabecera ("3 joined", "Round 2"). */
export const TopNote = ({ children }: { children: ReactNode }) => (
  <span className="shrink-0 text-[15px] font-bold text-brand">{children}</span>
)

/**
 * Barra de tiempo: fina y alargada, se va acortando y desvaneciendo hasta llegar a 0.
 * Se anima con requestAnimationFrame (suave, no a saltos de 1 s). Los últimos 5 s parpadea.
 */
export function TimeBar({ endsAt, totalSeconds, className = '' }: { endsAt: number | null; totalSeconds: number; className?: string }) {
  const [left, setLeft] = useState(1)
  useEffect(() => {
    if (!endsAt) return
    let raf = 0
    const tick = () => {
      const ms = Math.max(0, endsAt - Date.now())
      setLeft(Math.min(1, ms / (totalSeconds * 1000)))
      if (ms > 0) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [endsAt, totalSeconds])
  const urgent = endsAt !== null && left * totalSeconds <= 5
  return (
    <div
      role="progressbar"
      aria-label="Time left"
      aria-valuemin={0}
      aria-valuemax={totalSeconds}
      aria-valuenow={Math.ceil(left * totalSeconds)}
      className={cx('h-[6px] overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div
        className={cx('h-full rounded-full bg-ink', urgent && 'animate-pulse')}
        style={{ width: `${left * 100}%`, opacity: 0.3 + 0.7 * left }}
      />
    </div>
  )
}

export function TimerPill({ seconds, className = '' }: { seconds: number; className?: string }) {
  return (
    <span
      className={cx(
        'shrink-0 rounded-full bg-ink px-4 py-1.5 text-[17px] font-extrabold tabular-nums text-white',
        seconds <= 5 && 'animate-pulse',
        className,
      )}
    >
      0:{String(seconds).padStart(2, '0')}
    </span>
  )
}

export function Avatar({ player, size = 36, ring = false }: { player: Pick<Player, 'name' | 'color'>; size?: number; ring?: boolean }) {
  return (
    <div
      className={cx('flex shrink-0 items-center justify-center rounded-full font-extrabold text-white', ring && 'ring-[3px] ring-white')}
      style={{ background: player.color, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {player.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function Bubble({ children, className = '', selected = false, dark = false }: { children: ReactNode; className?: string; selected?: boolean; dark?: boolean }) {
  return (
    <div
      className={cx(
        'w-fit max-w-[82%] rounded-[24px] px-5 py-3 text-[18px] leading-snug',
        dark ? 'bg-ink text-white' : 'bg-white text-ink',
        selected && 'outline-[4px] outline-ink outline-solid',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[6px] py-1.5" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-[10px] rounded-full bg-neutral-400" style={{ animation: `typing 1.2s ${i * 0.15}s infinite` }} />
      ))}
    </span>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'white' | 'ink' }

export function Button({ variant = 'white', className = '', ...props }: ButtonProps) {
  const colors = variant === 'white' ? 'bg-white text-brand' : 'bg-ink text-white'
  return (
    <button
      className={cx(
        'h-[66px] w-full shrink-0 rounded-full text-[21px] font-extrabold transition active:scale-[0.97] disabled:opacity-50',
        colors,
        className,
      )}
      {...props}
    />
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      autoComplete="off"
      {...props}
      className={cx(
        'h-[66px] w-full rounded-full bg-white px-7 text-center text-[21px] font-extrabold text-ink outline-none placeholder:font-semibold placeholder:text-neutral-400',
        props.className,
      )}
    />
  )
}

/** Caja negra de instrucciones ("Write what Pol would say. Fool them."). */
export function RolePill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-[22px] bg-ink px-5 py-3.5 text-[17px] leading-snug font-extrabold text-white', className)}>
      {children}
    </div>
  )
}

/** Fila blanca tipo pill (lobby, puntos, ranking). */
export function Row({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div style={style} className={cx('flex min-h-[64px] items-center gap-4 rounded-[24px] bg-white px-4 text-ink', className)}>
      {children}
    </div>
  )
}

/** Cartel negro con trofeo (premio del presentador). */
export function AwardCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-rise items-center gap-4 rounded-[24px] bg-ink px-5 py-4 text-white">
      <span className="text-[34px]">🏆</span>
      <div className="text-[17px] leading-snug font-extrabold">{children}</div>
    </div>
  )
}

/** Etiqueta en mayúsculas con tracking ancho ("ROUND 2 OF 5"). */
export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="pt-5 pb-1 text-center text-[15px] font-extrabold tracking-[0.18em]">{children}</div>
)

/** Avatar del grupo en la cabecera del chat: "Piso 3B" → "3B". */
export function groupInitials(title: string) {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/)
  return (words[words.length - 1] ?? '?').slice(0, 2).toUpperCase()
}

/** Selector de idioma EN/ES (se recuerda en el móvil). `dark` = sobre fondo blanco. */
export function LangToggle({ className = '' }: { className?: string }) {
  const lang = useLang()
  return (
    <div role="group" aria-label="Language" className={cx('flex h-[44px] shrink-0 items-center gap-0.5 rounded-full bg-white/18 p-1', className)}>
      {(['en', 'es'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cx(
            'h-full min-w-[44px] rounded-full px-3 text-[15px] font-black uppercase transition',
            lang === l ? 'bg-white text-brand' : 'text-white/80',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
