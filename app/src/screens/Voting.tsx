import { Avatar, Bubble, RolePill, Screen, TimerPill, TopBar } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'

export default function Voting() {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  if (!room?.chat || !me) return null

  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const isWriter = writer.id === me.id
  const lastMessage = room.chat.messages.at(-1)

  return (
    <Screen>
      <TopBar title={`Which one is the real ${writer.name}?`} right={<TimerPill seconds={seconds} />} />

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        {lastMessage && <p className="text-center text-xs font-medium">"{lastMessage.text}"</p>}
        {room.answers.map((answer) => {
          const chosen = room.myVote === answer.id
          const laughed = room.myLaughs.includes(answer.id)
          return (
            <div key={answer.id} className="flex items-center gap-2">
              <Avatar player={writer} size={28} />
              <button
                className="flex-1 text-left disabled:opacity-60"
                disabled={isWriter || answer.mine || room.myVote !== null}
                onClick={() => void game.castVote(answer.id)}
              >
                <Bubble className={`max-w-none ${chosen ? 'outline-[3px] outline-ink outline-solid' : ''}`}>
                  {answer.text}
                  {answer.mine && <span className="ml-2 text-xs text-neutral-400">yours</span>}
                </Bubble>
              </button>
              <button
                aria-label="Funniest"
                className={`size-10 shrink-0 rounded-full text-lg ${laughed ? 'bg-white' : 'bg-white/20'}`}
                onClick={() => void game.react(answer.id)}
              >
                😂
              </button>
            </div>
          )
        })}
        <div className="flex-1" />
        <RolePill>
          {isWriter
            ? "They're trying to find you…"
            : room.myVote
              ? `Voted. Waiting (${room.votedIds.length}/${room.players.length - 1})`
              : 'Tap the real one · 😂 the funniest'}
        </RolePill>
      </div>
    </Screen>
  )
}
