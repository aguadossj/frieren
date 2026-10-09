// Componentes base (T2 es dueño). Estilo: design-refs/STYLE.md (rojo, blanco, negro).

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Player } from '../game/types'

export function Screen({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <main className={`flex min-h-dvh flex-col text-white ${dark ? 'bg-ink' : 'bg-brand'}`}>{children}</main>
  )
}

export function TopBar({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 bg-white px-4 py-3 text-ink">
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{title}</div>
        {subtitle && <div className="truncate text-xs font-semibold text-brand">{subtitle}</div>}
      </div>
      {right}
    </header>
  )
}

export function TimerPill({ seconds }: { seconds: number }) {
  return (
    <span
      className={`rounded-xl bg-ink px-2.5 py-1 text-sm font-bold tabular-nums text-white ${seconds <= 5 ? 'animate-pulse' : ''}`}
    >
      0:{String(seconds).padStart(2, '0')}
    </span>
  )
}

export function Avatar({ player, size = 32 }: { player: Pick<Player, 'name' | 'color'>; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-white font-bold text-white"
      style={{ background: player.color, width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {player.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function Bubble({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`max-w-[80%] rounded-[18px] bg-white px-3.5 py-2.5 text-[15px] text-ink ${className}`}>
      {children}
    </div>
  )
}

export function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 animate-bounce rounded-full bg-neutral-400"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'white' | 'ink' }

export function Button({ variant = 'white', className = '', ...props }: ButtonProps) {
  const colors = variant === 'white' ? 'bg-white text-brand' : 'bg-ink text-white'
  return (
    <button
      className={`w-full rounded-[18px] py-4 text-base font-extrabold transition active:scale-[0.97] ${colors} ${className}`}
      {...props}
    />
  )
}

export function RolePill({ children }: { children: ReactNode }) {
  return (
    <div className="self-center rounded-[14px] bg-ink px-3.5 py-2 text-center text-sm font-bold text-white">
      {children}
    </div>
  )
}
