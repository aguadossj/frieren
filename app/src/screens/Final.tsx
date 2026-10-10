import { Avatar, Body, Button, Footer, Icon, Row, Screen, TopBar, TopNote } from '../components/ui'
import { useGame } from '../game/useGame'
import { useT } from '../i18n'
import type { Player } from '../game/types'

// Podio: 2º a la izquierda, 1º en el centro (más alto, negro), 3º a la derecha.
const PODIUM = [
  { place: 2, height: 'h-[88px]', block: 'bg-white text-neutral-400', delay: 0.3 },
  { place: 1, height: 'h-[124px]', block: 'bg-ink text-white', delay: 0.6 },
  { place: 3, height: 'h-[64px]', block: 'bg-white/80 text-neutral-400', delay: 0.1 },
] as const

export default function Final() {
  const { room, me, game } = useGame()
  if (!room) return null

  const ranking = [...room.players].sort((a, b) => b.score - a.score)
  const winner = ranking[0]
  const t = useT()
  const label = (p: Player) => (p.id === me?.id ? t.you : p.name)

  const share = () => {
    const text = t.shareText(winner.name, winner.score)
    if (navigator.share) void navigator.share({ text, url: location.origin }).catch(() => {})
    else void navigator.clipboard?.writeText(`${text} ${location.origin}`)
  }

  return (
    <Screen>
      <TopBar title={t.gameOver} right={<TopNote>{t.rounds(room.totalRounds)}</TopNote>} />
      <Body className="gap-3 pt-5">
        <div className="text-center">
          <h1 className="animate-pop text-[44px] leading-none font-black tracking-[-0.03em]">{t.wins(winner.name, winner.id === me?.id)}</h1>
        </div>

        <div className="flex items-end justify-center gap-2.5 pt-8">
          {PODIUM.map(({ place, height, block, delay }) => {
            const p = ranking[place - 1]
            if (!p) return <div key={place} className="flex-1" />
            return (
              <div key={place} className="flex min-w-0 flex-1 animate-rise flex-col items-center" style={{ animationDelay: `${delay}s` }}>
                <div className="relative mb-2">
                  {place === 1 && <Icon name="crown" size={26} className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce text-[#F5B700]" />}
                  <Avatar player={p} size={place === 1 ? 58 : 46} ring />
                </div>
                <span className="w-full truncate text-center text-[16px] leading-tight font-extrabold">{label(p)}</span>
                <span className="mb-2 text-[15px] font-bold text-white/80 tabular-nums">{p.score.toLocaleString('en')}</span>
                <div className={`flex w-full items-center justify-center rounded-t-[22px] text-[28px] font-black ${height} ${block}`}>{place}</div>
              </div>
            )
          })}
        </div>

        {ranking.slice(3).map((p, i) => (
          <Row key={p.id} className="animate-rise" style={{ animationDelay: `${0.8 + i * 0.1}s` }}>
            <b className="w-5 text-center text-[18px] text-neutral-400">{i + 4}</b>
            <Avatar player={p} />
            <span className="flex-1 truncate text-[19px] font-semibold">{label(p)}</span>
            <b className="text-[19px] tabular-nums">{p.score.toLocaleString('en')}</b>
          </Row>
        ))}
      </Body>
      <Footer>
        <Button onClick={() => void game.playAgain()} className="flex items-center justify-center gap-3">
          <Icon name="replay" size={22} />
          {t.playAgain}
        </Button>
        <Button variant="ink" onClick={() => void game.leave()}>
          {t.menu}
        </Button>
        <button onClick={share} className="flex h-[44px] items-center justify-center gap-2 text-[16px] font-bold active:scale-95">
          <Icon name="share" size={18} />
          {t.shareResult}
        </button>
      </Footer>
    </Screen>
  )
}
