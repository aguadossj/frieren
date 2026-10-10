import { Avatar, AwardCard, Body, Footer, Row, Screen, TopBar, TopNote } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'

export function Reveal() {
  const { room, me } = useGame()
  if (!room?.result || !room.chat || !me) return null

  const result = room.result
  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const real = result.answers.find((a) => a.isReal)!
  const fakes = result.answers.filter((a) => !a.isReal).sort((a, b) => b.voterIds.length - a.voterIds.length)
  const fooled = fakes.reduce((n, a) => n + a.voterIds.length, 0)
  const nameOf = (id: string) => (id === me.id ? 'you' : (room.players.find((p) => p.id === id)?.name ?? '?'))
  const myPoints = result.points[me.id] ?? 0

  return (
    <Screen>
      <TopBar title={`The real ${writer.name} said…`} right={<TopNote>Round {room.roundIndex + 1}</TopNote>} />
      <Body className="gap-3 pt-5">
        <div className="animate-pop rounded-[28px] bg-ink px-6 py-5 text-white">
          <div className="text-[14px] font-extrabold tracking-[0.14em] text-good">REAL · {writer.name.toUpperCase()}</div>
          <p className="mt-1 text-[26px] leading-tight font-black">{real.text}</p>
          <p className="mt-2 text-[15px] font-semibold text-white/60">
            {real.voterIds.length ? `Spotted by ${real.voterIds.map(nameOf).join(', ')}` : 'Nobody spotted it'}
          </p>
        </div>

        <div className="animate-pop py-2 text-center text-[40px] leading-none font-black tracking-[-0.03em]" style={{ animationDelay: '0.35s' }}>
          {fooled === 0 ? 'Nobody fooled' : `${fooled} fooled!`}
        </div>

        {fakes.map((a, i) => (
          <div
            key={a.id}
            className="flex animate-rise items-center gap-4 rounded-[24px] bg-white px-5 py-3.5 text-ink"
            style={{ animationDelay: `${0.6 + i * 0.12}s` }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[18px] leading-snug font-semibold">{a.text}</p>
              <p className="text-[14px] font-bold text-neutral-400">by {nameOf(a.authorId)}</p>
            </div>
            <div className={`shrink-0 text-center leading-none ${a.voterIds.length ? 'text-ink' : 'text-neutral-300'}`}>
              <div className="text-[26px] font-black tabular-nums">{a.voterIds.length}</div>
              <div className="text-[12px] font-bold">{a.voterIds.length === 1 ? 'vote' : 'votes'}</div>
            </div>
          </div>
        ))}
      </Body>
      <Footer>
        <div className="flex animate-rise items-center justify-between rounded-full bg-white/15 px-6 py-3" style={{ animationDelay: '1s' }}>
          <span className="text-[17px] font-extrabold">Your points</span>
          <span className="text-[22px] font-black tabular-nums">+{myPoints}</span>
        </div>
        <AwardCard>{result.award}</AwardCard>
      </Footer>
    </Screen>
  )
}

export function Leaderboard() {
  const { room, me } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  if (!room) return null

  const ranking = [...room.players].sort((a, b) => b.score - a.score)
  const top = Math.max(1, ranking[0]?.score ?? 1)
  // Posición antes de esta ronda, para las flechas ▲/▼
  const earned = room.result?.points ?? {}
  const before = Object.fromEntries(
    [...room.players].sort((a, b) => b.score - (earned[b.id] ?? 0) - (a.score - (earned[a.id] ?? 0))).map((p, i) => [p.id, i]),
  )

  return (
    <Screen>
      <TopBar title="Leaderboard" right={<TopNote>after round {room.roundIndex + 1}</TopNote>} />
      <Body className="gap-3 pt-5">
        {ranking.map((p, i) => {
          const moved = before[p.id] - i
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
              <span className={`w-7 text-[15px] font-bold ${moved > 0 ? 'text-good' : moved < 0 ? 'text-brand' : 'text-neutral-400'}`}>
                {moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : '—'}
              </span>
            </Row>
          )
        })}
      </Body>
      <p className="shrink-0 pb-8 text-center text-[18px] font-bold">
        {room.roundIndex + 1 >= room.totalRounds ? 'Final results' : 'Next round'} in {seconds}…
      </p>
    </Screen>
  )
}
