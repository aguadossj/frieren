import { useState } from 'react'
import { Avatar, Button, Footer, Icon, Row, Screen, TopBar, TopNote } from '../components/ui'
import QR, { joinUrl } from '../components/QR'
import { useGame } from '../game/useGame'
import { MIN_PLAYERS } from '../game/types'

const SITUATION_LABEL: Record<string, string> = {
  drinks: 'Drinks out',
  party: 'Party',
  dinner: 'Dinner',
  home: 'Chilling at home',
  trip: 'On a trip',
  break: 'Class or work break',
}

export default function Lobby() {
  const { room, me, game, error } = useGame()
  const [copied, setCopied] = useState(false)
  if (!room || !me) return null
  const missing = MIN_PLAYERS - room.players.length
  const host = room.players.find((p) => p.isHost)
  const situation = SITUATION_LABEL[String(room.setup?.situation)]
  const know = room.setup?.know === 'yes' ? 'Close friends' : room.setup?.know === 'no' ? 'Just met' : null

  const copy = () => {
    const url = joinUrl(room.code)
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    } else if (navigator.share) void navigator.share({ title: 'Typing…', url }).catch(() => {})
  }

  return (
    <Screen>
      <TopBar
        title={
          <span className="flex items-center gap-2">
            Room
            <button onClick={copy} aria-label="Copy invite link" className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-0.5 tracking-[0.18em] text-white active:scale-95">
              {room.code}
              <Icon name={copied ? 'check' : 'copy'} size={14} className="opacity-80" />
            </button>
          </span>
        }
        right={<TopNote>{copied ? 'Link copied' : `${room.players.length} joined`}</TopNote>}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pt-5">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <QR code={room.code} size={150} />
          <p className="text-[15px] font-semibold text-white/85">Scan to join · tap the code to copy</p>
          {(situation || know) && (
            <p className="rounded-full bg-white/15 px-4 py-1.5 text-[14px] font-bold">{[situation, know].filter(Boolean).join(' · ')}</p>
          )}
        </div>

        <ul className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-2">
          {room.players.map((p) => (
            <li key={p.id} className="animate-rise">
              <Row className="min-h-[60px]">
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
      </div>

      <Footer>
        {error && <p className="text-center text-[15px] font-bold">{error}</p>}
        {me.isHost ? (
          <Button disabled={missing > 0} onClick={() => void game.startGame()}>
            {missing > 0 ? `Need ${missing} more` : 'Start game'}
          </Button>
        ) : (
          <div className="flex h-[66px] items-center justify-center gap-3 rounded-full bg-white/15 text-[18px] font-bold">
            <span className="size-2.5 animate-pulse rounded-full bg-white" />
            Waiting for {host?.name ?? 'the host'} to start…
          </div>
        )}
      </Footer>
    </Screen>
  )
}
