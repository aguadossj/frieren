import { useEffect, useRef, useState } from 'react'
import { Bubble, Icon, RolePill, Screen, SectionLabel, TimerPill, TopBar, TypingDots, groupInitials } from '../components/ui'
import { useCountdown, useGame } from '../game/useGame'
import { MAX_ANSWER_LENGTH } from '../game/types'
import { focusWithoutScroll } from '../lib/viewport'

export default function Writing() {
  const { room, me, game } = useGame()
  const seconds = useCountdown(room?.phaseEndsAt ?? null)
  const [text, setText] = useState('')
  const [mine, setMine] = useState<string | null>(null)
  const [typing, setTyping] = useState(false) // input con foco ⇒ teclado abierto
  const list = useRef<HTMLDivElement>(null)

  // La barra de escribir es blanca: lo que asoma bajo ella con el teclado abierto también (ver index.css)
  useEffect(() => {
    document.documentElement.dataset.kbBg = 'white'
    return () => {
      delete document.documentElement.dataset.kbBg
    }
  }, [])

  // Bajar al último mensaje dentro de la lista (no scrollIntoView: en iOS desplaza toda la página)
  const toBottom = (smooth = true) => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }
  useEffect(() => toBottom(), [mine])
  useEffect(() => {
    if (!typing) return
    // el teclado tarda ~250 ms en subir y encoger la lista
    const vv = window.visualViewport
    const onResize = () => toBottom(false)
    vv?.addEventListener('resize', onResize)
    const t = setTimeout(() => toBottom(false), 300)
    return () => {
      vv?.removeEventListener('resize', onResize)
      clearTimeout(t)
    }
  }, [typing])
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

      <div ref={list} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-5 pb-4">
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
      </div>

      <div className={`shrink-0 bg-white px-5 pt-3 text-ink ${typing ? 'pb-3' : 'pb-6'}`}>
        {sent ? (
          <div className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-neutral-100 text-[17px] font-extrabold">
            <Icon name="check" size={18} className="text-good" />
            Sent · waiting for others {room.submittedIds.length}/{room.players.length}
          </div>
        ) : (
          <>
            {/* Con el teclado abierto, el hint pasa a ser una línea fina para no comerse el chat */}
            {typing ? (
              <p className="mb-2 truncate text-center text-[14px] font-extrabold text-neutral-500">
                {isWriter ? `You're ${writer.name} · say it for real` : `Fool them · write like ${writer.name}`}
              </p>
            ) : (
              <RolePill className="mb-3 text-center text-[16px]">
                {isWriter ? `You're ${writer.name}. Say it for real.` : `Write what ${writer.name} would say. Fool them.`}
              </RolePill>
            )}
            <form
              className="flex items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const t = text.trim()
                if (!t) return
                setMine(t)
                setTyping(false)
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
                enterKeyHint="send"
                onTouchEnd={focusWithoutScroll}
                onFocus={() => setTyping(true)}
                onBlur={() => setTyping(false)}
              />
              <button
                type="submit"
                aria-label="Send"
                onMouseDown={(e) => e.preventDefault() /* no cerrar el teclado al tocar enviar */}
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
