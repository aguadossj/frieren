import { Avatar, Bubble, Button, Screen, TopBar } from '../components/ui'
import { useGame } from '../game/useGame'

export function Reveal() {
  const { room } = useGame()
  if (!room?.result || !room.chat) return null

  const writer = room.players.find((p) => p.id === room.chat!.writerId)!
  const real = room.result.answers.find((a) => a.isReal)!
  const fooled = room.result.answers.filter((a) => !a.isReal).reduce((n, a) => n + a.voterIds.length, 0)
  const playerOf = (id: string) => room.players.find((p) => p.id === id)!
  const earned = room.players
    .map((p) => ({ player: p, points: room.result!.points[p.id] ?? 0 }))
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)

  return (
    <Screen dark>
      <TopBar title={`The real ${writer.name} said…`} right={<span className="text-sm font-bold text-brand">Round {room.roundIndex + 1}</span>} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 self-center">
          <Avatar player={writer} />
          <Bubble className="text-lg font-bold">{real.text}</Bubble>
        </div>
        <div className="self-center text-3xl font-black tracking-tight">
          {fooled > 0 ? `Fooled ${fooled}! 🎭` : 'Nobody fooled! 🔍'}
        </div>
        {earned.map(({ player, points }) => {
          const fake = room.result!.answers.find((a) => a.authorId === player.id && !a.isReal)
          return (
            <div key={player.id} className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2 text-ink">
              <Avatar player={playerOf(player.id)} size={26} />
              <span className="flex-1 truncate text-sm">
                <b>{player.name}</b>
                {fake && fake.voterIds.length > 0 ? ` fooled ${fake.voterIds.length}` : ''}
              </span>
              <b className="text-good">+{points}</b>
            </div>
          )
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-3 rounded-2xl bg-brand p-3">
          <span className="text-2xl">🏆</span>
          <span className="font-bold">{room.result.award}</span>
        </div>
      </div>
    </Screen>
  )
}

export function Leaderboard({ final = false }: { final?: boolean }) {
  const { room, game } = useGame()
  if (!room) return null
  const ranking = [...room.players].sort((a, b) => b.score - a.score)
  const top = Math.max(1, ranking[0]?.score ?? 1)

  const share = () => {
    const text = `${ranking[0].name} won Typing… with ${ranking[0].score} points. Think you can fake your friends?`
    if (navigator.share) void navigator.share({ text, url: location.origin }).catch(() => {})
    else void navigator.clipboard?.writeText(`${text} ${location.origin}`)
  }

  return (
    <Screen>
      <TopBar
        title={final ? `${ranking[0]?.name} wins! 👑` : 'Leaderboard'}
        right={<span className="text-sm font-bold text-brand">{final ? 'Final' : `After round ${room.roundIndex + 1}`}</span>}
      />
      <ol className="flex flex-1 flex-col gap-2 p-4">
        {ranking.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 text-ink">
            <b className="w-4">{i + 1}</b>
            <Avatar player={p} size={28} />
            <div className="flex-1">
              <div className="font-bold">{p.name}</div>
              <div className="h-1.5 rounded-full transition-all duration-700" style={{ background: p.color, width: `${(p.score / top) * 100}%` }} />
            </div>
            <b className="tabular-nums">{p.score.toLocaleString()}</b>
          </li>
        ))}
      </ol>
      {final ? (
        <div className="flex flex-col gap-2 p-4">
          <Button onClick={share}>Share</Button>
          <Button variant="ink" onClick={() => void game.leave()}>
            Play again
          </Button>
        </div>
      ) : (
        <p className="p-4 text-center font-semibold">Next round in a sec…</p>
      )}
    </Screen>
  )
}
