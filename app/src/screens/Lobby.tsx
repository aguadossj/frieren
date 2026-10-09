import { Avatar, Body, Button, Footer, Row, Screen, TopBar, TopNote } from '../components/ui'
import QR, { joinUrl } from '../components/QR'
import { useGame } from '../game/useGame'
import { MIN_PLAYERS } from '../game/types'
import type { Pack } from '../game/types'

const PACKS: { id: Pack; label: string }[] = [
  { id: 'uni', label: 'Uni' },
  { id: 'spicy', label: 'Spicy' },
  { id: 'dating', label: 'Dating' },
  { id: 'moral', label: 'Moral' },
]

export default function Lobby() {
  const { room, me, game, error } = useGame()
  if (!room || !me) return null
  const missing = MIN_PLAYERS - room.players.length
  const host = room.players.find((p) => p.isHost)

  const share = () => {
    const url = joinUrl(room.code)
    if (navigator.share) void navigator.share({ title: 'Typing…', url }).catch(() => {})
    else void navigator.clipboard?.writeText(url)
  }

  return (
    <Screen>
      <TopBar
        title={
          <>
            Room{' '}
            <button onClick={share} className="ml-1 rounded-full bg-brand px-3 py-0.5 tracking-[0.18em] text-white active:scale-95">
              {room.code}
            </button>
          </>
        }
        right={<TopNote>{room.players.length} joined</TopNote>}
      />

      <Body className="gap-3 pt-4">
        <QR code={room.code} />

        <ul className="mt-1 flex flex-col gap-3">
          {room.players.map((p) => (
            <li key={p.id} className="animate-rise">
              <Row>
                <Avatar player={p} />
                <span className="flex-1 truncate text-[19px] font-semibold">
                  {p.name}
                  {p.id === me.id && <span className="text-neutral-400"> (you)</span>}
                </span>
                {p.isHost && <span className="text-[15px] text-neutral-400">host</span>}
              </Row>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 pt-1">
          {PACKS.map((p) => (
            <button
              key={p.id}
              disabled={!me.isHost}
              onClick={() => void game.setOptions({ pack: p.id })}
              className={`rounded-full px-4 py-2 text-[17px] font-semibold transition ${room.pack === p.id ? 'bg-ink text-white' : 'bg-brand-soft text-white/90'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Body>

      <Footer>
        {error && <p className="text-center text-[15px] font-bold">{error}</p>}
        {me.isHost ? (
          <Button disabled={missing > 0} onClick={() => void game.startGame()}>
            {missing > 0 ? `Need ${missing} more` : 'Start game'}
          </Button>
        ) : (
          <p className="py-5 text-center text-[18px] font-bold">Waiting for {host?.name ?? 'the host'} to start…</p>
        )}
      </Footer>
    </Screen>
  )
}
