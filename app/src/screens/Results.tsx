import { useEffect, useState } from 'react'
import PandaHost from '../components/Panda'
import { RoundOutcome } from '../components/RoundOutcome'
import { Avatar, AwardCard, Button, Footer, Icon, Screen, TimeBar, TopBar, TopNote } from '../components/ui'
import { useGame } from '../game/useGame'
import { MIMIC_AUTHOR_ID, PHASE_SECONDS } from '../game/types'
import type { Player, RoundResult, Room } from '../game/types'
import { fmt, signed, useLang, useT } from '../i18n'
import { avatarFor, textOn } from '../lib/avatars'

type Strings = ReturnType<typeof useT>

const LETTERS = 'ABCDEF'

export function Reveal() {
  const { room, me } = useGame()
  const t = useT()
  const lang = useLang()
  if (!room?.result || !room.chat || !me) return null

  const result = room.result
  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const real = result.answers.find((a) => a.isReal)!
  const fooled = result.answers.filter((a) => !a.isReal).reduce((n, a) => n + a.voterIds.length, 0)
  const playerOf = (id: string) => room.players.find((p) => p.id === id)
  const nameOf = (id: string) => (id === me.id ? t.you : (playerOf(id)?.name ?? '?'))
  const myPoints = result.points[me.id] ?? 0

  return (
    <Screen>
      <RoundOutcome key={room.roundIndex} />
      <TopBar title={t.theRealSaid(writer.name)} right={<TopNote>{t.round(room.roundIndex + 1)}</TopNote>} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4 pb-3">
        <div className="flex shrink-0 animate-pop items-center justify-between gap-3">
          <div className="min-w-0 text-[32px] leading-none font-black tracking-[-0.03em] whitespace-nowrap">
            {real.voterIds.length === 0 ? t.nobodyGotIt : fooled === 0 ? t.tooEasy : t.fooled(fooled)}
          </div>
          <div className={`shrink-0 rounded-full px-4 py-2 text-[18px] font-black tabular-nums ${myPoints > 0 ? 'bg-white text-good' : myPoints < 0 ? 'bg-ink text-white' : 'bg-white/15 text-white'}`}>
            {t.youPoints(myPoints)}
          </div>
        </div>

        {/* Mismas tarjetas y mismo orden que en la votación; se giran para revelar */}
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-1 pt-1 pb-2">
          {result.answers.map((a, i) => {
            const bot = a.isBot || a.authorId === MIMIC_AUTHOR_ID
            const tone = a.isReal ? 'bg-good text-white' : bot ? 'bg-ink text-white' : 'bg-white text-ink'
            const voters = a.voterIds.map(playerOf).filter(Boolean) as Player[]
            return (
              <div key={a.id} className="flex h-[84px] shrink-0 animate-flip" style={{ animationDelay: `${0.25 + i * 0.18}s` }}>
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
                      {a.isReal ? t.realBy(writer.name) : bot ? t.mimicTag : t.by(nameOf(a.authorId))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {voters.length === 0 ? (
                      <span className={`text-[13px] font-bold ${a.isReal || bot ? 'text-white/60' : 'text-neutral-300'}`}>{t.noVotes}</span>
                    ) : a.isReal ? (
                      // Respuesta real: los puntos de cada uno (cuanto antes votó, más)
                      <div className="flex max-w-[150px] flex-wrap justify-end gap-1">
                        {voters.slice(0, 3).map((v) => (
                          <span key={v.id} className="flex items-center gap-0.5 rounded-full bg-white/25 py-0.5 pr-2 pl-0.5 text-[12px] font-black tabular-nums">
                            <Avatar player={v} size={22} />⚡{result.points[v.id] ?? 0}
                          </span>
                        ))}
                        {voters.length > 3 && <span className="text-[12px] font-black">+{voters.length - 3}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center -space-x-2">
                        {bot && <span className="mr-3 text-[13px] font-black text-[#FF8A8A]">−100</span>}
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
        <AwardCard>{lang === 'en' ? result.award : localAward(t, result, room.players, writer)}</AwardCard>
      </Footer>
    </Screen>
  )
}

/** Premio en el idioma de la interfaz: el impostor que más engañó, o el writer si nadie lo consiguió. */
function localAward(t: Strings, result: RoundResult, players: Player[], writer: Player) {
  const best = result.answers.filter((a) => !a.isReal && a.voterIds.length).sort((a, b) => b.voterIds.length - a.voterIds.length)[0]
  const who = best && (best.isBot ? 'Mimic' : players.find((p) => p.id === best.authorId)?.name)
  return who ? t.awardImpostor(writer.name, who) : t.awardWriter(writer.name)
}

/** Frase del panda según cómo va la partida. */
function pandaLine(t: Strings, room: Room, meId: string | undefined, leadChanged: boolean, now: Player[]): string {
  const P = t.panda
  const name = (p: Player) => (p.id === meId ? t.you : p.name)
  const obj = (p: Player) => (p.id === meId ? t.youLower : p.name)
  const result = room.result
  const writer = room.players.find((p) => p.id === room.chat?.writerId)
  const real = result?.answers.find((a) => a.isReal)
  const voters = room.players.length - 1
  const lastNext = room.roundIndex + 2 === room.totalRounds
  const finished = room.roundIndex + 1 >= room.totalRounds

  if (leadChanged) return P.stole(name(now[0]))
  if (writer && real && real.voterIds.length === 0) return P.nobody(writer.name)
  if (writer && real && voters > 1 && real.voterIds.length === voters) return P.everyone(writer.name)
  const bot = result?.answers.find((a) => a.isBot)
  if (bot && bot.voterIds.length > 0) return P.ai(bot.voterIds.length)
  const liar = result?.answers.filter((a) => !a.isReal && !a.isBot).sort((a, b) => b.voterIds.length - a.voterIds.length)[0]
  const liarPlayer = liar && room.players.find((p) => p.id === liar.authorId)
  if (liar && liarPlayer && liar.voterIds.length >= 2) return P.liar(name(liarPlayer), liar.voterIds.length)
  if (finished) return P.crown(name(now[0]))
  if (lastNext) return P.last
  if (now[1] && now[0].score === now[1].score) return P.tied(name(now[0]), obj(now[1]))
  if (now[1] && now[0].score - now[1].score <= 200) return P.close(now[0].score - now[1].score, name(now[0]), obj(now[1]))
  return P.runaway(name(now[0]))
}

const ROW = 72 // alto de fila + hueco, para recolocar con animación

export function Leaderboard() {
  const { room, me, game } = useGame()
  const t = useT()
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
        title={t.standings}
        subtitle={t.afterRound(room.roundIndex + 1, room.totalRounds)}
        right={room.roundIndex + 1 >= room.totalRounds ? <TopNote>{t.finalRound}</TopNote> : undefined}
      />

      <div className="relative mx-5 mt-5 shrink-0" style={{ height: now.length * ROW }}>
        {now.map((p) => {
          const pos = order.findIndex((x) => x.id === p.id)
          const rank = now.findIndex((x) => x.id === p.id)
          const score = settled ? p.score : prevScore(p)
          const gained = earned[p.id] ?? 0
          const tint = avatarFor(room.code, p).color
          const light = textOn(tint) !== '#ffffff' // lima, amarillo…: más sombra para que el texto blanco se lea
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
                  style={{ background: tint, width: `${Math.max(16, (score / top) * 100)}%` }}
                />
                <div className={`relative flex h-full items-center gap-2.5 pr-4 pl-1.5 ${light ? '[text-shadow:0_1px_3px_rgba(0,0,0,0.6)]' : '[text-shadow:0_1px_2px_rgba(0,0,0,0.25)]'}`}>
                  <Avatar player={p} size={46} ring />
                  <span className="min-w-0 flex-1 truncate text-[18px] font-extrabold">{p.id === me?.id ? t.you : p.name}</span>
                  {settled && gained !== 0 && <span className="animate-pop text-[14px] font-extrabold text-white/85">{signed(gained)}</span>}
                  <span className="text-[19px] font-black tabular-nums">{fmt(score)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex-1" />
      <PandaHost text={pandaLine(t, room, me?.id, before[0] && prevScore(before[0]) > 0 && before[0].id !== now[0]?.id, now)} />
      <Footer className="pt-0">
        {me?.isHost ? (
          <Button onClick={() => void game.skipPhase()} className="flex items-center justify-center gap-3">
            {last ? t.seeFinal : t.startRound(room.roundIndex + 2)}
            <Icon name="arrowRight" size={22} />
          </Button>
        ) : (
          <div className="flex h-[66px] items-center justify-center gap-3 rounded-full bg-white/15 text-[18px] font-bold">
            <span className="size-2.5 animate-pulse rounded-full bg-white" />
            {t.waitingFor(host?.name ?? t.theHost)}
          </div>
        )}
        {/* Tiempo hasta que la siguiente ronda empiece sola: barra que se vacía (sin números) */}
        {room.phaseEndsAt && (
          <TimeBar
            onRed
            endsAt={room.phaseEndsAt}
            totalSeconds={room.settings?.leaderboard_seconds ?? PHASE_SECONDS.leaderboard}
            className="mx-6 -mt-1"
          />
        )}
      </Footer>
    </Screen>
  )
}
