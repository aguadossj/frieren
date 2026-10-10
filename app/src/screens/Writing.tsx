import { useEffect, useRef, useState } from 'react'
import { Bubble, Icon, Screen, TimerPill, TypingDots, groupInitials } from '../components/ui'
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
  const playerOf = (id: string) => room.players.find((p) => p.id === id)
  const step = 0.35 // s entre mensajes al entrar
  const hint = isWriter ? `You're ${writer.name} · say it for real` : `Fool them · write like ${writer.name}`

  // Layout tipo WhatsApp para aprovechar la pantalla del móvil:
  // cabecera mínima (solo nombre del grupo + tiempo) · chat rojo con el nombre DENTRO de la burbuja ·
  // pista como nota pequeña al final del chat · abajo solo la barra de escribir.
  // Pantalla blanca; solo el chat es una tarjeta roja. Bordes blancos ⇒ Safari pinta sus barras en blanco.
  return (
    <Screen className="bg-white!">
      <header className="flex min-h-[60px] shrink-0 items-center gap-3 bg-white px-4 py-2.5 text-ink">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-brand text-[16px] font-extrabold text-white">
          {groupInitials(room.chat.title)}
        </span>
        <div className="min-w-0 flex-1 truncate text-[18px] leading-tight font-extrabold">{room.chat.title}</div>
        <TimerPill seconds={seconds} />
      </header>

      <div ref={list} className="mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-[28px] bg-brand px-3 pt-3 pb-3">
        {room.chat.messages.map((m, i) => {
          const author = playerOf(m.playerId)
          const firstOfRun = i === 0 || room.chat!.messages[i - 1].playerId !== m.playerId
          return (
            <div key={i} className={`animate-rise ${firstOfRun && i > 0 ? 'mt-2.5' : 'mt-1'}`} style={{ animationDelay: `${i * step}s` }}>
              <Bubble className="max-w-[85%] rounded-[20px] px-4 py-2 text-[17px]">
                {firstOfRun && (
                  <div className="text-[13px] leading-tight font-extrabold" style={{ color: author?.color }}>
                    {author?.name ?? '?'}
                  </div>
                )}
                {m.text}
              </Bubble>
            </div>
          )
        })}

        {/* Lo que escribe el writer va a la derecha: "typing…" y luego tu respuesta */}
        <div className="mt-2.5 flex animate-rise flex-col items-end" style={{ animationDelay: `${room.chat.messages.length * step}s` }}>
          {mine ? (
            <>
              <Bubble dark className="max-w-[85%] animate-pop rounded-[20px] px-4 py-2 text-[17px]">{mine}</Bubble>
              <div className="mt-1 flex items-center gap-1 pr-1 text-[13px] font-extrabold">
                <Icon name="check" size={12} />
                Sent as {writer.name}
              </div>
            </>
          ) : (
            <Bubble className="rounded-[20px] px-4 py-1.5">
              <TypingDots />
            </Bubble>
          )}
        </div>

        {/* Pista como nota del sistema (antes era una caja negra grande abajo) */}
        {!sent && (
          <div className="mt-3 self-center rounded-full bg-black/25 px-3.5 py-1.5 text-center text-[14px] font-extrabold text-white">
            {hint}
          </div>
        )}
      </div>

      <div className={`shrink-0 bg-white px-3 ${typing ? 'pt-2 pb-2' : 'pt-2 pb-4'}`}>
        {sent ? (
          <div className="flex h-[48px] items-center justify-center gap-2 rounded-full bg-neutral-100 text-[16px] font-extrabold text-ink">
            <Icon name="check" size={18} className="text-good" />
            Waiting for others {room.submittedIds.length}/{room.players.length}
          </div>
        ) : (
          <form
            className="flex items-center gap-2"
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
              className="h-[46px] min-w-0 flex-1 rounded-full bg-neutral-100 px-5 text-[17px] text-ink outline-none placeholder:text-neutral-400"
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
              className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-brand text-white transition active:scale-90 disabled:opacity-50"
            >
              <Icon name="arrowRight" size={22} className="-rotate-90" />
            </button>
          </form>
        )}
      </div>
    </Screen>
  )
}
