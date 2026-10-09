// Componentes base (T2 es dueño). Estilo: design-refs/STYLE.md + design-refs/mockup.png (rojo, blanco, negro).
// Escala del mockup: pills grandes, tipografía muy gruesa, cabecera blanca y cuerpo rojo.

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import type { Player } from '../game/types'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Marco de pantalla. En escritorio se ve como un móvil centrado (como el mockup). */
export function Screen({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <main
      className={cx(
        'flex h-dvh flex-col overflow-hidden text-white sm:my-6 sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-[44px] sm:shadow-2xl',
        dark ? 'bg-ink' : 'bg-brand',
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
        <div className="truncate text-[20px] leading-tight font-extrabold">{title}</div>
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

export function TimerPill({ seconds }: { seconds: number }) {
  return (
    <span
      className={cx(
        'shrink-0 rounded-full bg-ink px-4 py-1.5 text-[17px] font-extrabold tabular-nums text-white',
        seconds <= 5 && 'animate-pulse',
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

export function Bubble({ children, className = '', selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div
      className={cx(
        'w-fit max-w-[82%] rounded-[24px] bg-white px-5 py-3 text-[18px] leading-snug text-ink',
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
