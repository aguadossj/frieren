// Engranaje de ajustes del host (solo lo ve el host). Cambia los ajustes de la partida en directo:
// se guardan con `game.updateSettings` y aplican desde la siguiente fase (las rondas, solo en el lobby).
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useLang } from '../i18n'
import { useGame } from '../game/useGame'
import { PHASE_SECONDS } from '../game/types'
import type { RoomSettings } from '../game/types'

const TEXT = {
  en: {
    title: 'Game settings',
    note: 'Changes apply from the next phase.',
    write: 'Time to write',
    vote: 'Time to vote',
    rounds: 'Rounds',
    roundsLocked: 'Rounds can only change before the game starts.',
    auto: 'Auto',
    mimic: 'Mimic AI hides among the answers',
    hostNext: 'Wait for me before each round',
    on: 'On',
    off: 'Off',
    done: 'Done',
    open: 'Game settings',
  },
  es: {
    title: 'Ajustes de la partida',
    note: 'Los cambios se aplican desde la siguiente fase.',
    write: 'Tiempo para escribir',
    vote: 'Tiempo para votar',
    rounds: 'Rondas',
    roundsLocked: 'Las rondas solo se cambian antes de empezar.',
    auto: 'Auto',
    mimic: 'La IA Mimic se esconde entre las respuestas',
    hostNext: 'Esperarme antes de cada ronda',
    on: 'Sí',
    off: 'No',
    done: 'Listo',
    open: 'Ajustes de la partida',
  },
}

const WRITE = [30, 45, 60, 90]
const VOTE = [15, 25, 40, 60]
const ROUNDS: (number | null)[] = [null, 3, 4, 5, 6]

export function SettingsGear({ onRed = false }: { onRed?: boolean }) {
  const { room, me, game } = useGame()
  const [open, setOpen] = useState(false)
  if (!room || !me?.isHost || room.phase === 'final') return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={TEXT.en.open}
        className={`flex size-[36px] shrink-0 items-center justify-center rounded-full active:scale-90 ${onRed ? 'bg-white/18 text-white' : 'bg-neutral-100 text-ink'}`}
      >
        <GearIcon />
      </button>
      {open && <SettingsSheet onClose={() => setOpen(false)} game={game} />}
    </>
  )
}

function SettingsSheet({ onClose, game }: { onClose: () => void; game: ReturnType<typeof useGame>['game'] }) {
  const { room } = useGame()
  const t = TEXT[useLang()]
  // Respuesta inmediata al tocar: el valor elegido se marca ya, sin esperar al viaje al servidor.
  const [local, setLocal] = useState<Partial<RoomSettings>>({})
  if (!room) return null
  const s = { ...room.settings, ...local } as Partial<RoomSettings>
  const set = (patch: Partial<RoomSettings>) => {
    setLocal((l) => ({ ...l, ...patch }))
    void game.updateSettings(patch)
  }
  const write = s?.writing_seconds ?? PHASE_SECONDS.writing
  const vote = s?.voting_seconds ?? PHASE_SECONDS.voting
  const rounds = s?.rounds ?? null
  const mimic = Boolean(s?.mimic)
  const hostNext = s?.host_advance ?? true
  const inLobby = room.phase === 'lobby'

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-[440px] animate-rise overflow-y-auto rounded-t-[28px] bg-white px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[22px] leading-tight font-black">{t.title}</div>
        <p className="mt-1 text-[14px] font-semibold text-neutral-500">{t.note}</p>

        <Row label={t.write}>
          {WRITE.map((n) => (
            <Chip key={n} active={write === n} onClick={() => set({ writing_seconds: n })}>
              {n}s
            </Chip>
          ))}
        </Row>

        <Row label={t.vote}>
          {VOTE.map((n) => (
            <Chip key={n} active={vote === n} onClick={() => set({ voting_seconds: n })}>
              {n}s
            </Chip>
          ))}
        </Row>

        <Row label={t.rounds} hint={inLobby ? undefined : t.roundsLocked}>
          {ROUNDS.map((n) => (
            <Chip key={String(n)} active={rounds === n} disabled={!inLobby} onClick={() => set({ rounds: n })}>
              {n ?? t.auto}
            </Chip>
          ))}
        </Row>

        <Toggle label={t.mimic} value={mimic} on={t.on} off={t.off} onChange={(v) => set({ mimic: v })} />
        <Toggle label={t.hostNext} value={hostNext} on={t.on} off={t.off} onChange={(v) => set({ host_advance: v })} />

        <button onClick={onClose} className="mt-6 h-[56px] w-full rounded-full bg-ink text-[18px] font-extrabold text-white active:scale-[0.98]">
          {t.done}
        </button>
      </div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[13px] font-extrabold tracking-[0.12em] text-neutral-500 uppercase">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
      {hint && <p className="mt-1.5 text-[13px] font-semibold text-neutral-400">{hint}</p>}
    </div>
  )
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`h-[44px] min-w-[60px] rounded-full px-4 text-[16px] font-extrabold transition active:scale-95 disabled:opacity-40 ${
        active ? 'bg-brand text-white' : 'bg-neutral-100 text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Toggle({ label, value, on, off, onChange }: { label: string; value: boolean; on: string; off: string; onChange: (v: boolean) => void }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-4">
      <span className="text-[16px] leading-snug font-bold">{label}</span>
      <div className="flex shrink-0 rounded-full bg-neutral-100 p-1">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            onClick={() => onChange(v)}
            className={`h-[36px] min-w-[52px] rounded-full px-3 text-[15px] font-extrabold transition ${value === v ? 'bg-ink text-white' : 'text-neutral-500'}`}
          >
            {v ? on : off}
          </button>
        ))}
      </div>
    </div>
  )
}

function GearIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
