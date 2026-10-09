import { useState } from 'react'
import { Body, Bubble, RolePill, Screen, SectionLabel, TimerPill, TopBar, TypingDots, groupInitials } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { MAX_ANSWER_LENGTH } from '../game/types'

export default function Writing() {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  const [text, setText] = useState('')
  const [mine, setMine] = useState<string | null>(null)
  if (!room?.chat || !me) return null

  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const isWriter = writer.id === me.id
  const sent = room.submittedIds.includes(me.id) || mine !== null
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?'
  const step = 0.35 // s entre mensajes al entrar

  return (
    <Screen>
      <TopBar
        avatar={
          <span className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-brand text-[18px] font-extrabold text-white">
            {groupInitials(room.chat.title)}
          </span>
        }
        title={room.chat.title}
        subtitle={`${writer.name} is typing…`}
        right={<TimerPill seconds={seconds} />}
      />

      <Body className="gap-2">
        <SectionLabel>
          ROUND {room.roundIndex + 1} OF {room.totalRounds}
        </SectionLabel>
        {room.chat.messages.map((m, i) => (
          <div key={i} className="animate-rise" style={{ animationDelay: `${i * step}s` }}>
            <div className="mb-1 pl-1 text-[15px] font-extrabold">{nameOf(m.playerId)}</div>
            <Bubble>{m.text}</Bubble>
          </div>
        ))}
        <div className="animate-rise" style={{ animationDelay: `${room.chat.messages.length * step}s` }}>
          <div className="mb-1 pl-1 text-[15px] font-extrabold">{writer.name}</div>
          {mine ? (
            <Bubble className="animate-pop">{mine}</Bubble>
          ) : (
            <Bubble>
              <TypingDots />
            </Bubble>
          )}
        </div>
        <div className="flex-1" />
        <RolePill className="mt-6">
          {sent
            ? `Sent ✓ Waiting for others (${room.submittedIds.length}/${room.players.length})`
            : isWriter
              ? `You're ${writer.name}. Say it for real. They're copying you.`
              : `Write what ${writer.name} would say. Fool them.`}
        </RolePill>
      </Body>

      {!sent && (
        <form
          className="flex shrink-0 items-center gap-3 bg-white px-5 pt-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            const t = text.trim()
            if (!t) return
            setMine(t)
            void game.submitAnswer(t)
            setText('')
          }}
        >
          <input
            className="h-[54px] min-w-0 flex-1 rounded-full bg-neutral-100 px-6 text-[18px] text-ink outline-none placeholder:text-neutral-400"
            placeholder={`Message as ${writer.name}`}
            maxLength={MAX_ANSWER_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!text.trim()}
            className="flex size-[54px] shrink-0 items-center justify-center rounded-full bg-brand text-[22px] text-white transition active:scale-90 disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      )}
    </Screen>
  )
}
