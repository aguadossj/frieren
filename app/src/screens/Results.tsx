import { useEffect, useState } from 'react'
import PandaHost from '../components/Panda'
import { Avatar, AwardCard, Button, Footer, Icon, Screen, TopBar, TopNote } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { MIMIC_AUTHOR_ID } from '../game/types'
import type { Player, Room } from '../game/types'

const LETTERS = 'ABCDEF'

export function Reveal() {
  const { room, me } = useGame()
  if (!room?.result || !room.chat || !me) return null

  const result = room.result
  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const real = result.answers.find((a) => a.isReal)!
  const fooled = result.answers.filter((a) => !a.isReal).reduce((n, a) => n + a.voterIds.length, 0)
  const playerOf = (id: string) => room.players.find((p) => p.id === id)
  const nameOf = (id: string) => (id === me.id ? 'You' : (playerOf(id)?.name ?? '?'))
  const myPoints = result.points[me.id] ?? 0

  return (
    <Screen>
      <TopBar title={`The real ${writer.name} said…`} right={<TopNote>Round {room.roundIndex + 1}</TopNote>} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4 pb-3">
        <div className="flex shrink-0 animate-pop items-center justify-between gap-3">
          <div className="min-w-0 text-[32px] leading-none font-black tracking-[-0.03em] whitespace-nowrap">
            {real.voterIds.length === 0 ? 'Nobody got it' : fooled === 0 ? 'Too easy' : `${fooled} fooled`}
          </div>
          <div className={`shrink-0 rounded-full px-4 py-2 text-[18px] font-black tabular-nums ${myPoints ? 'bg-white text-good' : 'bg-white/15 text-white'}`}>
            You +{myPoints}
          </div>
        </div>

        {/* Mismas tarjetas y mismo orden que en la votación; se giran para revelar */}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          {result.answers.map((a, i) => {
            const bot = a.isBot || a.authorId === MIMIC_AUTHOR_ID
            const tone = a.isReal ? 'bg-good text-white' : bot ? 'bg-ink text-white' : 'bg-white text-ink'
            const voters = a.voterIds.map(playerOf).filter(Boolean) as Player[]
            return (
              <div key={a.id} className="flex max-h-[96px] min-h-[58px] flex-1 basis-0 animate-flip" style={{ animationDelay: `${0.25 + i * 0.18}s` }}>
                <div className={`flex w-full items-center gap-3.5 rounded-[22px] px-4 ${tone}`}>
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[14px] font-black ${
                      a.isReal ? 'bg-white text-good' : bot ? 'bg-white text-ink' : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {a.isReal ? <Icon name="check" size={18} /> : bot ? 'AI' : LETTERS[i]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[17px] leading-snug font-semibold">{a.text}</p>
                    <p className={`text-[13px] font-extrabold ${a.isReal || bot ? 'text-white/80' : 'text-neutral-400'}`}>
                      {a.isReal ? `REAL · ${writer.name}` : bot ? 'MIMIC · the AI' : `by ${nameOf(a.authorId)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {voters.length === 0 ? (
                      <span className={`text-[13px] font-bold ${a.isReal || bot ? 'text-white/60' : 'text-neutral-300'}`}>no votes</span>
                    ) : (
                      <div className="flex -space-x-2">
                        {voters.slice(0, 4).map((v) => (
                          <Avatar key={v.id} player={v} size={26} ring />
                        ))}
                        {voters.length > 4 && (
                          <span className="flex size-[26px] items-center justify-center rounded-full bg-neutral-200 text-[12px] font-black text-ink ring-[3px] ring-white">
                            +{voters.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Footer className="pt-1">
        <AwardCard>{result.award}</AwardCard>
      </Footer>
    </Screen>
  )
}

/** Frase del panda según cómo va la partida. */
function pandaLine(room: Room, meId: string | undefined, leadChanged: boolean, now: Player[]): string {
  const name = (p: Player) => (p.id === meId ? 'You' : p.name)
  const obj = (p: Player) => (p.id === meId ? 'you' : p.name)
  const result = room.result
  const writer = room.players.find((p) => p.id === room.chat?.writerId)
  const real = result?.answers.find((a) => a.isReal)
  const voters = room.players.length - 1
  const lastNext = room.roundIndex + 2 === room.totalRounds
  const finished = room.roundIndex + 1 >= room.totalRounds

  if (leadChanged) return `${name(now[0])} just stole first place!`
  if (writer && real && real.voterIds.length === 0) return `Nobody recognised ${writer.name}. Do you even know each other?`
  if (writer && real && voters > 1 && real.voterIds.length === voters) return `Too easy. ${writer.name}, be less predictable.`
  const bot = result?.answers.find((a) => a.isBot)
  if (bot && bot.voterIds.length > 0) return `The AI fooled ${bot.voterIds.length} of you. Embarrassing.`
  const liar = result?.answers.filter((a) => !a.isReal && !a.isBot).sort((a, b) => b.voterIds.length - a.voterIds.length)[0]
  const liarPlayer = liar && room.players.find((p) => p.id === liar.authorId)
  if (liar && liarPlayer && liar.voterIds.length >= 2) return `${name(liarPlayer)} fooled ${liar.voterIds.length} people. Should we be worried?`
  if (finished) return `That’s it. ${name(now[0])} takes the crown.`
  if (lastNext) return 'Last round. Everything can still change.'
  if (now[1] && now[0].score === now[1].score) return `${name(now[0])} and ${obj(now[1])} are tied at the top. Tense.`
  if (now[1] && now[0].score - now[1].score <= 200) return `Only ${now[0].score - now[1].score} points between ${name(now[0])} and ${obj(now[1])}.`
  return `${name(now[0])} is running away with it.`
}

const ROW = 72 // alto de fila + hueco, para recolocar con animación

export function Leaderboard() {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  // Primero se pintan en el orden de antes de la ronda; luego se recolocan y las barras crecen.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setSettled(true), 350)
    return () => clearTimeout(id)
  }, [])
  if (!room) return null

  const earned = room.result?.points ?? {}
  const prevScore = (p: Player) => p.score - (earned[p.id] ?? 0)
  const now = [...room.players].sort((a, b) => b.score - a.score)
  const before = [...room.players].sort((a, b) => prevScore(b) - prevScore(a))
  const top = Math.max(1, now[0]?.score ?? 1)
  const order = settled ? now : before
  const last = room.roundIndex + 1 >= room.totalRounds
  const host = room.players.find((p) => p.isHost)

  return (
    <Screen>
      <TopBar
        title="Standings"
        subtitle={`After round ${room.roundIndex + 1} of ${room.totalRounds}`}
        right={room.roundIndex + 1 >= room.totalRounds ? <TopNote>Final round</TopNote> : undefined}
      />

      <div className="relative mx-5 mt-5 shrink-0" style={{ height: now.length * ROW }}>
        {now.map((p) => {
          const pos = order.findIndex((x) => x.id === p.id)
          const rank = now.findIndex((x) => x.id === p.id)
          const score = settled ? p.score : prevScore(p)
          const gained = earned[p.id] ?? 0
          return (
            <div
              key={p.id}
              className="absolute inset-x-0 flex h-[60px] items-center gap-3 transition-[top] duration-700 ease-[cubic-bezier(0.3,1.3,0.5,1)]"
              style={{ top: pos * ROW }}
            >
              <span className="w-6 shrink-0 text-center text-[24px] font-black tabular-nums">{rank + 1}</span>
              <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out"
                  style={{ background: p.color, width: `${Math.max(16, (score / top) * 100)}%` }}
                />
                <div className="relative flex h-full items-center gap-2.5 pr-4 pl-1.5 [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
                  <Avatar player={p} size={46} ring />
                  <span className="min-w-0 flex-1 truncate text-[18px] font-extrabold">{p.id === me?.id ? 'You' : p.name}</span>
                  {settled && gained > 0 && <span className="animate-pop text-[14px] font-extrabold text-white/85">+{gained}</span>}
                  <span className="text-[19px] font-black tabular-nums">{score.toLocaleString('en')}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex-1" />
      <PandaHost text={pandaLine(room, me?.id, before[0] && prevScore(before[0]) > 0 && before[0].id !== now[0]?.id, now)} />
      <Footer className="pt-0">
        {me?.isHost ? (
          <Button onClick={() => void game.skipPhase()} className="flex items-center justify-center gap-3">
            {last ? 'See final results' : `Start round ${room.roundIndex + 2}`}
            <Icon name="arrowRight" size={22} />
          </Button>
        ) : (
          <div className="flex h-[66px] items-center justify-center gap-3 rounded-full bg-white/15 text-[18px] font-bold">
            <span className="size-2.5 animate-pulse rounded-full bg-white" />
            Waiting for {host?.name ?? 'the host'}…
          </div>
        )}
        {room.phaseEndsAt && seconds > 0 && (
          <p className="-mt-1 text-center text-[14px] font-semibold text-white/70">Starts by itself in {seconds}s</p>
        )}
      </Footer>
    </Screen>
  )
}
