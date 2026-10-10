// Menú "⋯" durante la partida. Todos: abandonar. Host: echar a un jugador y terminar la partida.
// Las acciones que no se deshacen piden un segundo toque para confirmar (3 s).
import { useEffect, useState } from 'react'
import { useLang } from '../i18n'
import { useGame } from '../game/useGame'
import { Avatar } from './ui'

const TEXT = {
  en: {
    open: 'Game menu',
    title: 'Game menu',
    players: 'Players',
    you: 'you',
    host: 'host',
    remove: 'Remove',
    leave: 'Leave game',
    end: 'End game for everyone',
    confirm: 'Tap again to confirm',
    close: 'Close',
  },
  es: {
    open: 'Menú de la partida',
    title: 'Menú de la partida',
    players: 'Jugadores',
    you: 'tú',
    host: 'anfitrión',
    remove: 'Echar',
    leave: 'Abandonar partida',
    end: 'Terminar la partida para todos',
    confirm: 'Toca otra vez para confirmar',
    close: 'Cerrar',
  },
}

const IN_GAME = new Set(['generating', 'writing', 'voting', 'reveal', 'leaderboard'])

export function GameMenu({ onRed = false }: { onRed?: boolean }) {
  const { room } = useGame()
  const [open, setOpen] = useState(false)
  if (!room || !IN_GAME.has(room.phase)) return null
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={TEXT.en.open}
        className={`flex size-[36px] shrink-0 items-center justify-center rounded-full text-[20px] leading-none font-black active:scale-90 ${onRed ? 'bg-white/18 text-white' : 'bg-neutral-100 text-ink'}`}
      >
        ⋯
      </button>
      {open && <MenuSheet onClose={() => setOpen(false)} />}
    </>
  )
}

/** Botón que pide un segundo toque antes de actuar. */
function ConfirmButton({ label, confirmLabel, onConfirm, className }: { label: string; confirmLabel: string; onConfirm: () => void; className: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button onClick={() => (armed ? onConfirm() : setArmed(true))} className={`${className} ${armed ? 'animate-pulse' : ''}`}>
      {armed ? confirmLabel : label}
    </button>
  )
}

function MenuSheet({ onClose }: { onClose: () => void }) {
  const { room, me, game } = useGame()
  const t = TEXT[useLang()]
  if (!room || !me) return null
  const host = me.isHost

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-[440px] animate-rise overflow-y-auto rounded-t-[28px] bg-white px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[22px] leading-tight font-black">{t.title}</div>

        {host && (
          <div className="mt-4">
            <div className="text-[13px] font-extrabold tracking-[0.12em] text-neutral-500 uppercase">{t.players}</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {room.players.map((p) => (
                <li key={p.id} className="flex min-h-[48px] items-center gap-3 rounded-[16px] bg-neutral-100 px-3">
                  <Avatar player={p} size={34} />
                  <span className="min-w-0 flex-1 truncate text-[16px] font-bold">
                    {p.name}
                    {p.id === me.id && <span className="ml-1.5 text-[13px] text-neutral-400">({t.you})</span>}
                    {p.isHost && p.id !== me.id && <span className="ml-1.5 text-[13px] text-neutral-400">({t.host})</span>}
                  </span>
                  {p.id !== me.id && (
                    <ConfirmButton
                      label={t.remove}
                      confirmLabel={t.confirm}
                      onConfirm={() => void game.kick(p.id)}
                      className="h-[36px] rounded-full bg-white px-3.5 text-[14px] font-extrabold text-brand active:scale-95"
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          {host && (
            <ConfirmButton
              label={t.end}
              confirmLabel={t.confirm}
              onConfirm={() => {
                onClose()
                void game.endGame()
              }}
              className="h-[56px] w-full rounded-full bg-brand text-[17px] font-extrabold text-white active:scale-[0.98]"
            />
          )}
          <ConfirmButton
            label={t.leave}
            confirmLabel={t.confirm}
            onConfirm={() => void game.leave()}
            className="h-[56px] w-full rounded-full bg-ink text-[17px] font-extrabold text-white active:scale-[0.98]"
          />
          <button onClick={onClose} className="h-[48px] w-full rounded-full text-[16px] font-bold text-neutral-500 active:scale-[0.98]">
            {t.close}
          </button>
        </div>
      </div>
    </div>
  )
}
