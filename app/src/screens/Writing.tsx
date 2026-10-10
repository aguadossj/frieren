import { useEffect, useRef, useState } from 'react'
import { Bubble, Icon, RolePill, Screen, SectionLabel, TimerPill, TopBar, TypingDots, groupInitials } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { MAX_ANSWER_LENGTH } from '../game/types'

export default function Writing() {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  const [text, setText] = useState('')
  const [mine, setMine] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mine])
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
        subtitle={mine ? `${room.players.length} members` : `${writer.name} is typing…`}
        right={<TimerPill seconds={seconds} />}
      />

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-4">
        <SectionLabel>
          ROUND {room.roundIndex + 1} OF {room.totalRounds}
        </SectionLabel>
        {room.chat.messages.map((m, i) => (
          <div key={i} className="animate-rise" style={{ animationDelay: `${i * step}s` }}>
            <div className="mb-1 pl-1 text-[15px] font-extrabold">{nameOf(m.playerId)}</div>
            <Bubble>{m.text}</Bubble>
          </div>
        ))}

        {/* Lo que escribe el writer va a la derecha: primero "typing…", luego tu respuesta */}
        <div className="flex animate-rise flex-col items-end pt-2" style={{ animationDelay: `${room.chat.messages.length * step}s` }}>
          {mine ? (
            <>
              <div className="mb-1 flex items-center gap-1 pr-1 text-[15px] font-extrabold">
                <Icon name="check" size={14} />
                Sent as {writer.name}
              </div>
              <Bubble dark className="animate-pop">{mine}</Bubble>
            </>
          ) : (
            <>
              <div className="mb-1 pr-1 text-[15px] font-extrabold">{writer.name} is typing…</div>
              <Bubble>
                <TypingDots />
              </Bubble>
            </>
          )}
        </div>
        <div ref={end} />
      </div>

      <div className="shrink-0 bg-white px-5 pt-3 pb-6 text-ink">
        {sent ? (
          <div className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-neutral-100 text-[17px] font-extrabold">
            <Icon name="check" size={18} className="text-good" />
            Sent · waiting for others {room.submittedIds.length}/{room.players.length}
          </div>
        ) : (
          <>
            <RolePill className="mb-3 text-center text-[16px]">
              {isWriter ? `You're ${writer.name}. Say it for real.` : `Write what ${writer.name} would say. Fool them.`}
            </RolePill>
            <form
              className="flex items-center gap-3"
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
                className="flex size-[54px] shrink-0 items-center justify-center rounded-full bg-brand text-white transition active:scale-90 disabled:opacity-50"
              >
                <Icon name="arrowRight" size={24} className="-rotate-90" />
              </button>
            </form>
          </>
        )}
      </div>
    </Screen>
  )
}
