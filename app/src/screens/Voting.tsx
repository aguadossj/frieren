import { useState } from 'react'
import { Avatar, Body, Bubble, Button, Footer, Screen, TimerPill, TopBar } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'

export default function Voting() {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  const [picked, setPicked] = useState<string | null>(null)
  if (!room?.chat || !me) return null

  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const isWriter = writer.id === me.id
  const last = room.chat.messages.at(-1)
  const lastAuthor = last && room.players.find((p) => p.id === last.playerId)
  const locked = room.myVote !== null
  const choice = room.myVote ?? picked
  const voters = room.players.length - 1

  return (
    <Screen>
      <TopBar title={`Which one is the real ${writer.name}?`} right={<TimerPill seconds={seconds} />} />

      <Body className="gap-3">
        {last && (
          <p className="pt-4 pb-1 text-center text-[16px] font-semibold">
            "{last.text}"{lastAuthor && ` — ${lastAuthor.name}`}
          </p>
        )}
        {room.answers.map((answer, i) => {
          const laughed = room.myLaughs.includes(answer.id)
          return (
            <div key={answer.id} className="flex animate-rise items-center gap-3" style={{ animationDelay: `${i * 0.08}s` }}>
              <Avatar player={writer} size={40} ring />
              <button
                className="min-w-0 flex-1 text-left transition active:scale-[0.98] disabled:active:scale-100"
                disabled={isWriter || answer.mine || locked}
                onClick={() => setPicked(answer.id)}
              >
                <Bubble selected={choice === answer.id} className={`max-w-full ${answer.mine ? 'opacity-70' : ''}`}>
                  {answer.text}
                  {answer.mine && <span className="ml-2 text-[13px] text-neutral-400">yours</span>}
                </Bubble>
              </button>
              <button
                aria-label="Funniest"
                disabled={answer.mine}
                className={`shrink-0 text-[26px] transition active:scale-125 disabled:opacity-30 ${laughed ? 'scale-125' : 'opacity-90'}`}
                onClick={() => void game.react(answer.id)}
              >
                😂
              </button>
            </div>
          )
        })}
      </Body>

      <Footer>
        <p className="text-center text-[16px] font-semibold">
          {isWriter ? "They're trying to find you… 😏" : 'Tap the real one · 😂 the funniest'}
        </p>
        <Button
          variant="ink"
          disabled={isWriter || locked || !picked}
          onClick={() => picked && void game.castVote(picked)}
        >
          {isWriter || locked ? `${room.votedIds.length}/${voters} voted` : 'Lock vote'}
        </Button>
      </Footer>
    </Screen>
  )
}
