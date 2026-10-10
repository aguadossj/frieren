// Sala con aprobación: el host ve quién quiere entrar y le deja pasar o no.
import { useLang } from '../i18n'
import { useGame } from '../game/useGame'

const TEXT = {
  en: { title: 'Wants to join', allow: 'Let in', deny: 'No' },
  es: { title: 'Quiere entrar', allow: 'Dejar entrar', deny: 'No' },
}

export function PendingRequests() {
  const { room, me, game } = useGame()
  const t = TEXT[useLang()]
  const pending = room?.pendingPlayers ?? []
  if (!me?.isHost || pending.length === 0) return null
  return (
    <div className="flex shrink-0 animate-pop flex-col gap-2 rounded-[24px] bg-white p-3 text-ink">
      <div className="px-1 text-[13px] font-extrabold tracking-[0.12em] text-neutral-500 uppercase">{t.title}</div>
      {pending.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5">
          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[20px]">{p.emoji ?? '🙂'}</span>
          <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">{p.name}</span>
          <button onClick={() => void game.reject(p.id)} className="h-[40px] rounded-full bg-neutral-100 px-4 text-[15px] font-extrabold active:scale-95">
            {t.deny}
          </button>
          <button onClick={() => void game.approve(p.id)} className="h-[40px] rounded-full bg-brand px-4 text-[15px] font-extrabold text-white active:scale-95">
            {t.allow}
          </button>
        </div>
      ))}
    </div>
  )
}
