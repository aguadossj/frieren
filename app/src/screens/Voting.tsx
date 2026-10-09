import { useState } from 'react'
import { Avatar, Button, Footer, Icon, RoundHeader, Screen } from '../components/ui'
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
      <RoundHeader code={room.code} step="voting" round={room.roundIndex + 1} total={room.totalRounds} seconds={seconds} />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pt-5 pb-5">
        <div className="pb-2 text-center">
          <h1 className="text-[28px] leading-tight font-black tracking-[-0.02em]">Which one did {writer.name} really write?</h1>
          {last && (
            <p className="mt-2 text-[16px] font-semibold text-white/85">
              “{last.text}”{lastAuthor && ` — ${lastAuthor.name}`}
            </p>
          )}
        </div>

        {room.answers.map((answer, i) => {
          const selected = choice === answer.id
          const laughed = room.myLaughs.includes(answer.id)
          return (
            <div key={answer.id} className="flex animate-rise items-center gap-2" style={{ animationDelay: `${i * 0.08}s` }}>
              <button
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-[24px] bg-white p-4 text-left text-ink transition active:scale-[0.98] disabled:active:scale-100 ${
                  selected ? 'outline-[4px] outline-ink outline-solid' : ''
                } ${answer.mine ? 'opacity-60' : ''}`}
                disabled={isWriter || answer.mine || locked}
                onClick={() => setPicked(answer.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-neutral-100 text-[13px] font-black">{i + 1}</span>
                    <Avatar player={writer} size={22} />
                    <span className="text-[14px] font-extrabold text-neutral-500">{writer.name}</span>
                    {answer.mine && <span className="text-[13px] font-semibold text-neutral-400">· your fake</span>}
                  </div>
                  <p className="text-[18px] leading-snug font-semibold">{answer.text}</p>
                </div>
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full transition ${
                    selected ? 'bg-ink text-white' : 'border-2 border-neutral-200'
                  }`}
                >
                  {selected && <Icon name="check" size={16} />}
                </span>
              </button>
              <button
                aria-label="Funniest"
                disabled={answer.mine}
                className={`flex size-11 shrink-0 items-center justify-center text-[26px] transition active:scale-125 disabled:opacity-30 ${laughed ? 'scale-125' : 'opacity-90'}`}
                onClick={() => void game.react(answer.id)}
              >
                😂
              </button>
            </div>
          )
        })}
      </div>

      <Footer>
        <p className="text-center text-[16px] font-semibold">
          {isWriter ? "They're trying to find you… 😏" : locked ? 'Vote locked ✓' : 'Tap the real one · 😂 the funniest'}
        </p>
        <Button variant="ink" disabled={isWriter || locked || !picked} onClick={() => picked && void game.castVote(picked)}>
          {isWriter || locked ? `${room.votedIds.length}/${voters} voted` : 'Lock vote'}
        </Button>
      </Footer>
    </Screen>
  )
}
