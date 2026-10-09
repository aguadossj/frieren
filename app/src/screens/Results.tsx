import { AppHeader, Avatar, AwardCard, Body, Bubble, Eyebrow, Footer, Icon, Row, RoundHeader, Screen } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { POINTS } from '../game/types'

export function Reveal() {
  const { room, me } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  if (!room?.result || !room.chat || !me) return null

  const result = room.result
  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const real = result.answers.find((a) => a.isReal)!
  const fooled = result.answers.filter((a) => !a.isReal).reduce((n, a) => n + a.voterIds.length, 0)
  const nameOf = (id: string) => (id === me.id ? 'You' : (room.players.find((p) => p.id === id)?.name ?? '?'))
  // La real primero, después los fakes por votos
  const answers = [...result.answers].sort((a, b) => Number(b.isReal) - Number(a.isReal) || b.voterIds.length - a.voterIds.length)

  // Desglose de mis puntos de esta ronda (mismas reglas que scoring.ts)
  const mine: string[] = []
  if (real.voterIds.includes(me.id)) mine.push(`Spotted ${writer.name} +${POINTS.foundReal}`)
  if (writer.id === me.id && real.voterIds.length)
    mine.push(`Recognised by ${real.voterIds.length} +${real.voterIds.length * POINTS.writerPerFinder}`)
  for (const a of result.answers.filter((a) => a.authorId === me.id)) {
    if (!a.isReal && a.voterIds.length) mine.push(`Fooled ${a.voterIds.length} +${a.voterIds.length * POINTS.impostorPerFooled}`)
    if (a.laughs) mine.push(`${a.laughs} 😂 +${a.laughs * POINTS.perLaugh}`)
  }
  const myPoints = result.points[me.id] ?? 0

  return (
    <Screen>
      <RoundHeader code={room.code} step="reveal" round={room.roundIndex + 1} total={room.totalRounds} seconds={seconds} />
      <Body className="gap-3 pt-5">
        <Eyebrow className="text-center">The real {writer.name} said…</Eyebrow>
        <div className="flex animate-pop items-center justify-center gap-3">
          <Avatar player={writer} size={48} ring />
          <Bubble className="text-[22px] font-extrabold">{real.text}</Bubble>
        </div>
        <div className="animate-pop py-2 text-center text-[44px] leading-none font-black tracking-[-0.03em]" style={{ animationDelay: '0.4s' }}>
          {fooled > 0 ? `Fooled ${fooled}! 🎭` : 'Nobody fooled! 🔍'}
        </div>

        <div className="animate-rise rounded-[24px] bg-ink px-5 py-4 text-white" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-baseline justify-between">
            <span className="text-[17px] font-extrabold">Your round</span>
            <span className={`text-[22px] font-black tabular-nums ${myPoints ? 'text-good' : 'text-white/50'}`}>+{myPoints}</span>
          </div>
          {mine.length > 0 ? (
            <ul className="mt-1 text-[15px] font-medium text-white/75">
              {mine.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[15px] font-medium text-white/75">No points this time. Next one.</p>
          )}
        </div>

        {answers.map((a, i) => (
          <div
            key={a.id}
            className={`animate-rise rounded-[24px] bg-white p-4 text-ink ${a.isReal ? 'outline-[4px] outline-ink outline-solid' : ''}`}
            style={{ animationDelay: `${0.8 + i * 0.12}s` }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              {a.isReal ? (
                <span className="flex items-center gap-1 rounded-full bg-good px-2.5 py-0.5 text-[13px] font-extrabold text-white">
                  <Icon name="check" size={13} />
                  REAL · {writer.name}
                </span>
              ) : (
                <span className="text-[14px] font-extrabold text-neutral-500">Fake by {nameOf(a.authorId)}</span>
              )}
              <span className="text-[14px] font-bold text-neutral-500 tabular-nums">
                {a.voterIds.length} vote{a.voterIds.length === 1 ? '' : 's'}
                {a.laughs > 0 && ` · ${a.laughs} 😂`}
              </span>
            </div>
            <p className="text-[18px] leading-snug font-semibold">{a.text}</p>
            {a.voterIds.length > 0 && <p className="mt-1 text-[14px] font-medium text-neutral-500">Voted by {a.voterIds.map(nameOf).join(', ')}</p>}
          </div>
        ))}

      </Body>
      <Footer>
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
      <header className="shrink-0 bg-white text-ink">
        <AppHeader code={room.code} />
      </header>
      <Body className="gap-3 pt-5">
        <div className="pb-2">
          <Eyebrow>After round {room.roundIndex + 1} of {room.totalRounds}</Eyebrow>
          <h1 className="mt-1 text-[40px] leading-none font-black tracking-[-0.03em]">Leaderboard</h1>
        </div>
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
