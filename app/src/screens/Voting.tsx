import { useState } from 'react'
import { Avatar, Button, Footer, Icon, Screen, TimerPill, TopBar } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'

const LETTERS = 'ABCDEF'

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

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4 pb-3">
        {/* Lo que se pregunta, como en el chat */}
        {last && (
          <div className="flex shrink-0 items-end gap-2">
            {lastAuthor && <Avatar player={lastAuthor} size={30} />}
            <div className="min-w-0 rounded-[20px] rounded-bl-[6px] bg-white/18 px-4 py-2">
              <div className="text-[13px] font-extrabold text-white/70">{lastAuthor?.name}</div>
              <p className="line-clamp-2 text-[16px] leading-snug font-semibold">{last.text}</p>
            </div>
          </div>
        )}
        {room.mimic && (
          <p className="shrink-0 self-center rounded-full bg-ink px-4 py-1 text-[13px] font-bold">One of these is an AI. Avoid it.</p>
        )}

        {/* Opciones: todas del mismo tamaño, repartiendo el alto disponible */}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          {room.answers.map((answer, i) => {
            const selected = choice === answer.id
            const dimmed = answer.mine || (locked && !selected)
            return (
              <div key={answer.id} className="flex max-h-[96px] min-h-[58px] flex-1 basis-0 animate-rise" style={{ animationDelay: `${i * 0.07}s` }}>
              <button
                className={`flex w-full items-center gap-3.5 rounded-[22px] px-4 text-left transition-[transform,background-color,color,opacity] duration-200 active:scale-[0.98] disabled:active:scale-100 ${
                  selected ? 'bg-ink text-white' : 'bg-white text-ink'
                } ${dimmed ? 'opacity-55' : ''}`}
                disabled={isWriter || answer.mine || locked}
                onClick={() => setPicked(answer.id)}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[16px] font-black ${
                    selected ? 'bg-white text-ink' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {selected ? <Icon name="check" size={18} /> : LETTERS[i]}
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-[17px] leading-snug font-semibold">{answer.text}</span>
                {answer.mine && <span className="shrink-0 text-[13px] font-extrabold text-neutral-400">YOURS</span>}
              </button>
              </div>
            )
          })}
        </div>
      </div>

      <Footer className="pt-1">
        <Button variant="ink" disabled={isWriter || locked || !picked} onClick={() => picked && void game.castVote(picked)}>
          {isWriter ? `They’re hunting you · ${room.votedIds.length}/${voters}` : locked ? `Locked · ${room.votedIds.length}/${voters} voted` : picked ? 'Lock vote' : 'Tap the real one'}
        </Button>
      </Footer>
    </Screen>
  )
}
