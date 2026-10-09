import { Avatar, AwardCard, Body, Bubble, Button, Footer, Row, Screen, TopBar, TopNote } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { POINTS } from '../game/types'
import type { Player } from '../game/types'

export function Reveal() {
  const { room } = useGame()
  if (!room?.result || !room.chat) return null

  const result = room.result
  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const real = result.answers.find((a) => a.isReal)!
  const fooled = result.answers.filter((a) => !a.isReal).reduce((n, a) => n + a.voterIds.length, 0)
  const playerOf = (id: string) => room.players.find((p) => p.id === id)

  // Una fila por motivo de puntos, en el orden del mockup: engañó → acertó → Pol → 😂
  const lines: { player: Player; text: string; points: number }[] = []
  for (const a of result.answers) {
    const p = playerOf(a.authorId)
    if (!a.isReal && a.voterIds.length && p)
      lines.push({ player: p, text: `${p.name} fooled ${a.voterIds.length}`, points: a.voterIds.length * POINTS.impostorPerFooled })
  }
  lines.sort((x, y) => y.points - x.points)
  for (const id of real.voterIds) {
    const p = playerOf(id)
    if (p) lines.push({ player: p, text: `${p.name} spotted ${writer.name}`, points: POINTS.foundReal })
  }
  lines.push({
    player: writer,
    text: real.voterIds.length ? `${writer.name}, recognised by ${real.voterIds.length}` : `Nobody recognised ${writer.name}`,
    points: real.voterIds.length * POINTS.writerPerFinder,
  })
  for (const a of result.answers) {
    const p = playerOf(a.authorId)
    if (a.laughs && p) lines.push({ player: p, text: `${p.name} got ${a.laughs} 😂`, points: a.laughs * POINTS.perLaugh })
  }

  return (
    <Screen>
      <TopBar title={`The real ${writer.name} said…`} right={<TopNote>Round {room.roundIndex + 1}</TopNote>} />
      <Body className="gap-3">
        <div className="flex animate-pop items-center justify-center gap-3 pt-5">
          <Avatar player={writer} size={48} ring />
          <Bubble className="text-[22px] font-extrabold">{real.text}</Bubble>
        </div>
        <div className="animate-pop py-3 text-center text-[46px] leading-none font-black tracking-[-0.03em]" style={{ animationDelay: '0.4s' }}>
          {fooled > 0 ? `Fooled ${fooled}! 🎭` : 'Nobody fooled! 🔍'}
        </div>
        {lines.map((l, i) => (
          <Row key={i} className="animate-rise" style={{ animationDelay: `${0.7 + i * 0.15}s` }}>
            <Avatar player={l.player} />
            <span className="flex-1 truncate text-[18px] font-semibold">{l.text}</span>
            <b className={`text-[19px] ${l.points ? 'text-good' : 'text-neutral-400'}`}>+{l.points}</b>
          </Row>
        ))}
      </Body>
      <Footer>
        <AwardCard>{result.award}</AwardCard>
      </Footer>
    </Screen>
  )
}

export function Leaderboard({ final = false }: { final?: boolean }) {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  if (!room) return null

  const ranking = [...room.players].sort((a, b) => b.score - a.score)
  const top = Math.max(1, ranking[0]?.score ?? 1)
  // Posición antes de esta ronda, para las flechas ▲/▼
  const earned = room.result?.points ?? {}
  const before = Object.fromEntries(
    [...room.players].sort((a, b) => b.score - (earned[b.id] ?? 0) - (a.score - (earned[a.id] ?? 0))).map((p, i) => [p.id, i]),
  )

  const share = () => {
    const text = `${ranking[0].name} won Typing… with ${ranking[0].score} points. Think you can fake your friends?`
    if (navigator.share) void navigator.share({ text, url: location.origin }).catch(() => {})
    else void navigator.clipboard?.writeText(`${text} ${location.origin}`)
  }

  return (
    <Screen>
      <TopBar
        title={final ? `${ranking[0]?.name} wins! 👑` : 'Leaderboard'}
        right={<TopNote>{final ? 'Final' : `after round ${room.roundIndex + 1}`}</TopNote>}
      />
      <Body className="gap-3 pt-5">
        {ranking.map((p, i) => {
          const moved = final ? 0 : before[p.id] - i
          return (
            <Row key={p.id} className="min-h-[76px] animate-rise" style={{ animationDelay: `${i * 0.1}s` }}>
              <b className="w-5 text-center text-[20px]">{i + 1}</b>
              <Avatar player={p} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[20px] leading-tight font-extrabold">{p.id === me?.id ? 'You' : p.name}</div>
                <div className="mt-1 h-[7px] rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-1000 ease-out"
                    style={{ background: p.color, width: `${Math.max(6, (p.score / top) * 100)}%` }}
                  />
                </div>
              </div>
              <b className="text-[20px] tabular-nums">{p.score.toLocaleString('en')}</b>
              {!final && (
                <span className={`w-7 text-[15px] font-bold ${moved > 0 ? 'text-good' : moved < 0 ? 'text-brand' : 'text-neutral-400'}`}>
                  {moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : '—'}
                </span>
              )}
            </Row>
          )
        })}
      </Body>
      {final ? (
        <Footer>
          <Button onClick={share}>Share</Button>
          <Button variant="ink" onClick={() => void game.leave()}>
            Play again
          </Button>
        </Footer>
      ) : (
        <p className="shrink-0 pb-8 text-center text-[18px] font-bold">
          {room.roundIndex + 1 >= room.totalRounds ? 'Final results' : 'Next round'} in {seconds}…
        </p>
      )}
    </Screen>
  )
}
