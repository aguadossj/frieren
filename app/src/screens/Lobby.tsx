import { Avatar, Button, Screen, TopBar } from '../components/ui'
import { useGame } from '../game/useGame'
import { MIN_PLAYERS } from '../game/types'
import type { Pack } from '../game/types'

const PACKS: { id: Pack; label: string }[] = [
  { id: 'uni', label: 'Uni' },
  { id: 'spicy', label: 'Spicy 🌶️' },
  { id: 'dating', label: 'Dating' },
  { id: 'moral', label: 'Moral' },
]

export default function Lobby() {
  const { room, me, game, error } = useGame()
  if (!room || !me) return null
  const joinUrl = `${location.origin}/?room=${room.code}`

  return (
    <Screen>
      <TopBar
        title={
          <>
            Room <span className="ml-1 rounded-lg bg-brand px-2 py-0.5 tracking-[0.2em] text-white">{room.code}</span>
          </>
        }
        right={<span className="text-sm font-bold text-brand">{room.players.length} joined</span>}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* T3: sustituir por el QR real de joinUrl (librería `qrcode`). */}
        <div className="self-center rounded-[18px] bg-white px-4 py-3 text-center text-ink">
          <div className="text-xs text-neutral-500">Scan or go to</div>
          <div className="text-sm font-bold break-all">{joinUrl}</div>
        </div>

        <ul className="flex flex-col gap-2">
          {room.players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2 text-ink">
              <Avatar player={p} size={28} />
              <span className="font-semibold">{p.name}</span>
              {p.id === me.id && <span className="text-xs text-neutral-400">you</span>}
              {p.isHost && <span className="ml-auto text-xs text-neutral-400">host</span>}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          {PACKS.map((p) => (
            <button
              key={p.id}
              disabled={!me.isHost}
              onClick={() => void game.setOptions({ pack: p.id })}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold ${room.pack === p.id ? 'bg-ink text-white' : 'bg-white/20'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {error && <p className="text-center text-sm font-bold">{error}</p>}
        {me.isHost ? (
          <Button onClick={() => void game.startGame()}>
            {room.players.length < MIN_PLAYERS ? `Waiting for ${MIN_PLAYERS - room.players.length} more…` : 'Start game'}
          </Button>
        ) : (
          <p className="py-4 text-center font-bold">Waiting for the host to start…</p>
        )}
      </div>
    </Screen>
  )
}
