import { useState } from 'react'
import { AppHeader, Avatar, Body, Button, Card, Eyebrow, Footer, Icon, Row, Screen } from '../components/ui'
import QR, { joinUrl } from '../components/QR'
import { useGame } from '../game/useGame'
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/types'
import type { Pack } from '../game/types'

const PACKS: { id: Pack; label: string }[] = [
  { id: 'uni', label: 'Uni' },
  { id: 'spicy', label: 'Spicy' },
  { id: 'dating', label: 'Dating' },
  { id: 'moral', label: 'Moral' },
]

export default function Lobby() {
  const { room, me, game, error } = useGame()
  const [copied, setCopied] = useState(false)
  if (!room || !me) return null
  const missing = MIN_PLAYERS - room.players.length
  const host = room.players.find((p) => p.isHost)

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
      <header className="shrink-0 bg-white text-ink">
        <AppHeader />
      </header>

      <Body className="gap-5 pt-5">
        <Card className="animate-pop">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Eyebrow className="text-neutral-500">Room code</Eyebrow>
              <div className="text-[38px] leading-none font-black tracking-[0.16em]">{room.code}</div>
            </div>
            <button
              onClick={copy}
              className="flex h-[44px] shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-extrabold text-white active:scale-95"
            >
              <Icon name={copied ? 'check' : 'copy'} size={16} />
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <div className="-mx-5 -mb-2">
            <QR code={room.code} size={144} />
          </div>
          <p className="text-center text-[15px] font-semibold text-neutral-500">Point a camera here to join</p>
        </Card>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between px-1">
            <Eyebrow>Players ({room.players.length})</Eyebrow>
            <span className="text-[14px] font-bold text-white/75">
              {missing > 0 ? `Min ${MIN_PLAYERS}` : `Max ${MAX_PLAYERS}`}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {room.players.map((p) => (
              <li key={p.id} className="animate-rise">
                <Row className="min-h-[60px]">
                  <Avatar player={p} />
                  <span className="flex-1 truncate text-[19px] font-semibold">
                    {p.name}
                    {p.id === me.id && <span className="text-neutral-400"> (you)</span>}
                  </span>
                  {p.isHost && (
                    <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-[14px] font-extrabold">
                      <Icon name="crown" size={14} className="text-[#F5B700]" />
                      Host
                    </span>
                  )}
                </Row>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <Eyebrow className="px-1">Chat pack</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {PACKS.map((p) => (
              <button
                key={p.id}
                disabled={!me.isHost}
                onClick={() => void game.setOptions({ pack: p.id })}
                className={`min-h-[44px] rounded-full px-5 text-[17px] font-extrabold transition active:scale-95 ${room.pack === p.id ? 'bg-ink text-white' : 'bg-brand-soft text-white/90'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>
      </Body>

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
