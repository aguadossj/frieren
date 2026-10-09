import { useState } from 'react'
import { Bubble, RolePill, Screen, TimerPill, TopBar, TypingDots } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { MAX_ANSWER_LENGTH } from '../game/types'

export default function Writing() {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  const [text, setText] = useState('')
  if (!room?.chat || !me) return null

  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const isWriter = writer.id === me.id
  const sent = room.submittedIds.includes(me.id)
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?'

  return (
    <Screen>
      <TopBar title={room.chat.title} subtitle={`${writer.name} is typing…`} right={<TimerPill seconds={seconds} />} />

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="self-center text-[11px] font-extrabold tracking-wider">
          ROUND {room.roundIndex + 1} OF {room.totalRounds}
        </div>
        {room.chat.messages.map((m, i) => (
          <div key={i}>
            <div className="mb-0.5 ml-3 text-[11px] font-bold">{nameOf(m.playerId)}</div>
            <Bubble>{m.text}</Bubble>
          </div>
        ))}
        <div>
          <div className="mb-0.5 ml-3 text-[11px] font-bold">{writer.name}</div>
          <Bubble className="inline-block">
            <TypingDots />
          </Bubble>
        </div>
        <div className="flex-1" />
        <RolePill>
          {sent
            ? `Sent. Waiting for others (${room.submittedIds.length}/${room.players.length})`
            : isWriter
              ? `You're ${writer.name}. Say it for real.`
              : `Write what ${writer.name} would say. Fool them.`}
        </RolePill>
      </div>

      {!sent && (
        <form
          className="flex items-center gap-2 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void game.submitAnswer(text)
            setText('')
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-ink outline-none placeholder:text-neutral-400"
            placeholder={`Message as ${writer.name}`}
            maxLength={MAX_ANSWER_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            aria-label="Send"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg text-white active:scale-90"
          >
            ➤
          </button>
        </form>
      )}
    </Screen>
  )
}
