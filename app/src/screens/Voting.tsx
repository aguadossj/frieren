import { useState } from 'react'
import { Button, Footer, Screen, TimerPill, TopBar } from '../components/ui'
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

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-5">
        {last && (
          <p className="pb-1 text-center text-[16px] font-semibold text-white/90">
            “{last.text}”{lastAuthor && ` — ${lastAuthor.name}`}
          </p>
        )}

        {room.answers.map((answer, i) => {
          const selected = choice === answer.id
          return (
            <div key={answer.id} className="animate-rise" style={{ animationDelay: `${i * 0.08}s` }}>
              <button
                className={`w-full rounded-[24px] px-5 py-4 text-left text-[19px] leading-snug font-semibold transition active:scale-[0.98] disabled:active:scale-100 ${
                  selected ? 'bg-ink text-white' : 'bg-white text-ink'
                } ${answer.mine || (locked && !selected) ? 'opacity-50' : ''}`}
                disabled={isWriter || answer.mine || locked}
                onClick={() => setPicked(answer.id)}
              >
                {answer.text}
                {answer.mine && <span className="block text-[14px] font-bold text-neutral-500">Yours</span>}
              </button>
            </div>
          )
        })}
      </div>

      <Footer>
        <p className="text-center text-[16px] font-semibold">
          {isWriter ? 'They’re trying to find you…' : locked ? 'Vote locked' : 'Tap the one you think is real'}
        </p>
        <Button variant="ink" disabled={isWriter || locked || !picked} onClick={() => picked && void game.castVote(picked)}>
          {isWriter || locked ? `${room.votedIds.length}/${voters} voted` : 'Lock vote'}
        </Button>
      </Footer>
    </Screen>
  )
}
