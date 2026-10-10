import { useState } from 'react'
import { Avatar, Button, Footer, Icon, Screen, TimeBar, TopBar } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { PHASE_SECONDS, speedPoints } from '../game/types'
import { useT } from '../i18n'

const LETTERS = 'ABCDEF'

export default function Voting() {
  const { room, me, game } = useGame()
  const t = useT()
  const [picked, setPicked] = useState<string | null>(null)
  useCountdown(room?.phaseEndsAt ?? null) // repinta 4 veces por segundo: los puntos del botón bajan con el tiempo
  if (!room?.chat || !me) return null
  // Puntos si aciertas ahora mismo (estilo Kahoot: 200 al instante → 100 al final). Los da el servidor; esto es la estimación.
  const votingMs = (room.settings?.voting_seconds ?? PHASE_SECONDS.voting) * 1000
  const potential = room.phaseEndsAt ? speedPoints(votingMs - Math.max(0, room.phaseEndsAt - Date.now()), votingMs) : 0

  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const isWriter = writer.id === me.id
  const last = room.chat.messages.at(-1)
  const lastAuthor = last && room.players.find((p) => p.id === last.playerId)
  const locked = room.myVote !== null
  const choice = room.myVote ?? picked
  const voters = room.players.length - 1

  return (
    <Screen>
      <TopBar
        title={t.whichIsReal(writer.name)}
        right={<TimeBar endsAt={room.phaseEndsAt} totalSeconds={room.settings?.voting_seconds ?? PHASE_SECONDS.voting} className="w-[30%] shrink-0" />}
      />

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
          <p className="shrink-0 self-center rounded-full bg-ink px-4 py-1 text-[13px] font-bold">{t.aiAmongThese}</p>
        )}

        {/* Opciones: todas del mismo tamaño (alto fijo). Si no caben, solo esta lista hace scroll;
            la pregunta de arriba y el botón de votar se quedan fijos. */}
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-1 pt-1 pb-2">
          {room.answers.map((answer, i) => {
            const selected = choice === answer.id
            const dimmed = answer.mine || (locked && !selected)
            return (
              <div key={answer.id} className="flex h-[84px] shrink-0 animate-rise" style={{ animationDelay: `${i * 0.07}s` }}>
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
                {answer.mine && <span className="shrink-0 text-[13px] font-extrabold text-neutral-400">{t.yours}</span>}
              </button>
              </div>
            )
          })}
        </div>
      </div>

      <Footer className="pt-1">
        <Button variant="ink" disabled={isWriter || locked || !picked} onClick={() => picked && void game.castVote(picked)}>
          {isWriter ? (
            t.huntingYou(room.votedIds.length, voters)
          ) : locked ? (
            t.locked(room.votedIds.length, voters)
          ) : picked ? (
            <>
              {t.lockVote} · <span className={`tabular-nums ${potential >= 150 ? 'text-[#7CF29A]' : 'text-[#FFC24D]'}`}>+{potential}</span>
            </>
          ) : (
            t.tapTheReal
          )}
        </Button>
      </Footer>
    </Screen>
  )
}
