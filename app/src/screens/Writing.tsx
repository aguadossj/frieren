import { useEffect, useRef, useState } from 'react'
import { Avatar, Bubble, Icon, Screen, TimeBar, TypingDots, groupInitials } from '../components/ui'
import ChatDoodles from '../components/ChatDoodles'
import { GameMenu } from '../components/GameMenu'
import { useGame } from '../game/useGame'
import { MAX_ANSWER_LENGTH, PHASE_SECONDS } from '../game/types'
import { focusWithoutScroll, retintSafariBars } from '../lib/viewport'
import { useT } from '../i18n'
import { avatarFor, readableOnWhite } from '../lib/avatars'

export default function Writing() {
  const { room, me, game } = useGame()
  const t = useT()
  const [text, setText] = useState('')
  const [mine, setMine] = useState<string | null>(null)
  const [typing, setTyping] = useState(false) // input con foco ⇒ teclado abierto
  const list = useRef<HTMLDivElement>(null)
  // Presentación de la ronda (a quién imitar) sobre el chat oscurecido: ~2.6 s o hasta que se toque
  const [intro, setIntro] = useState<'in' | 'out' | 'gone'>('in')
  useEffect(() => {
    const a = setTimeout(() => setIntro((v) => (v === 'in' ? 'out' : v)), INTRO_MS)
    return () => clearTimeout(a)
  }, [])
  useEffect(() => {
    if (intro !== 'out') return
    const b = setTimeout(() => setIntro('gone'), 300)
    return () => clearTimeout(b)
  }, [intro])

  // Mensajes del chat de uno en uno, cada MESSAGE_GAP_MS, cuando se va la presentación; al final el "typing…"
  // del writer y la pista. (Antes iban con animation-delay y, al quitarse la presentación, salían todos de golpe.)
  const total = room?.chat?.messages.length ?? 0
  const [shown, setShown] = useState(0) // mensajes visibles; total + 1 = también el "typing…"
  useEffect(() => {
    if (intro !== 'gone' || shown > total) return
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 150 : MESSAGE_GAP_MS)
    return () => clearTimeout(id)
  }, [intro, shown, total])

  // Que Safari repinte sus barras con los colores del chat al entrar (y con los de la siguiente pantalla al salir)
  // Solo el chat es blanco: página y barras de Safari en blanco mientras esté abierto, rojo al salir
  useEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    root.dataset.page = 'chat'
    meta?.setAttribute('content', '#ffffff')
    retintSafariBars()
    const t = setTimeout(retintSafariBars, 400) // por si la primera llega antes de pintar
    return () => {
      clearTimeout(t)
      delete root.dataset.page
      meta?.setAttribute('content', '#EE2B2B')
      setTimeout(retintSafariBars, 50)
    }
  }, [])

  // Bajar al último mensaje dentro de la lista (no scrollIntoView: en iOS desplaza toda la página)
  const toBottom = (smooth = true) => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }
  useEffect(() => toBottom(), [mine, shown])
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
  const allIn = shown > total // ya han salido todos los mensajes
  const hint = isWriter ? t.hintWriter(writer.name) : t.hintFaker(writer.name)

  // Layout tipo WhatsApp para aprovechar la pantalla del móvil:
  // cabecera mínima (solo nombre del grupo + tiempo) · chat rojo con el nombre DENTRO de la burbuja ·
  // pista como nota pequeña al final del chat · abajo solo la barra de escribir.
  // Pantalla blanca; solo el chat es una tarjeta roja. Bordes blancos ⇒ Safari pinta sus barras en blanco.
  return (
    <>
      {/* Franjas blancas fijas en los bordes SOLO en el chat: Safari (iOS 26) recalcula el color de sus barras
          cuando aparece un elemento fijo en el borde. Se montan al entrar y se desmontan al salir. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[4px] bg-white sm:hidden" />
      <div aria-hidden className="fixed inset-x-0 bottom-0 z-[60] h-[6px] bg-white sm:hidden" />
    <Screen plain className="bg-white!">
      <header className="flex min-h-[40px] shrink-0 items-center gap-2.5 bg-white px-3 pt-2.5 pb-1 text-ink">
        <span className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-extrabold text-white">
          {groupInitials(room.chat.title)}
        </span>
        <div className="min-w-0 flex-1 truncate text-[16px] leading-tight font-extrabold">{room.chat.title}</div>
        <TimeBar endsAt={room.phaseEndsAt} totalSeconds={room.settings?.writing_seconds ?? PHASE_SECONDS.writing} className="w-[38%] shrink-0" />
        <GameMenu />
      </header>

      {/* Tarjeta roja del chat con dibujitos blancos de fondo (fijos: no se mueven al hacer scroll) */}
      <div className="relative mx-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-brand">
        <ChatDoodles seed={room.roundIndex + 1} />
      <div ref={list} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pt-3 pb-3">
        {room.chat.messages.slice(0, shown).map((m, i) => {
          const author = playerOf(m.playerId)
          const firstOfRun = i === 0 || room.chat!.messages[i - 1].playerId !== m.playerId
          return (
            <div key={i} className={`animate-rise ${firstOfRun && i > 0 ? 'mt-2.5' : 'mt-1'}`}>
              <Bubble className="max-w-[85%] rounded-[20px] px-4 py-2 text-[17px]">
                {firstOfRun && (
                  <div className="text-[13px] leading-tight font-extrabold" style={{ color: author ? readableOnWhite(avatarFor(room.code, author).color) : undefined }}>
                    {author?.name ?? '?'}
                  </div>
                )}
                {m.text}
              </Bubble>
            </div>
          )
        })}

        {/* Lo que escribe el writer va a la derecha: "typing…" y luego tu respuesta */}
        {(allIn || mine) && (
        <div className="mt-2.5 flex animate-rise flex-col items-end">
          {mine ? (
            <>
              <Bubble dark className="max-w-[85%] animate-pop rounded-[20px] px-4 py-2 text-[17px]">{mine}</Bubble>
              <div className="mt-1 flex items-center gap-1 pr-1 text-[13px] font-extrabold">
                <Icon name="check" size={12} />
                {t.sentAs(writer.name)}
              </div>
            </>
          ) : (
            <Bubble className="rounded-[20px] px-4 py-1.5">
              <TypingDots />
            </Bubble>
          )}
        </div>
        )}

        {/* Pista como nota del sistema (antes era una caja negra grande abajo) */}
        {!sent && allIn && (
          <div className="mt-3 self-center rounded-full bg-black/25 px-3.5 py-1.5 text-center text-[14px] font-extrabold text-white">
            {hint}
          </div>
        )}
      </div>
      </div>

      <div className={`shrink-0 bg-white px-2.5 ${typing ? 'pt-1 pb-1' : 'pt-1 pb-1.5'}`}>
        {sent ? (
          <div className="flex h-[38px] items-center justify-center gap-2 rounded-full bg-neutral-100 text-[15px] font-extrabold text-ink">
            <Icon name="check" size={18} className="text-good" />
            {t.waitingOthers(room.submittedIds.length, room.players.length)}
          </div>
        ) : (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const reply = text.trim()
              if (!reply) return
              setMine(reply)
              setTyping(false)
              void game.submitAnswer(reply)
              setText('')
            }}
          >
            <input
              className="h-[38px] min-w-0 flex-1 rounded-full bg-neutral-100 px-4 text-[16px] text-ink outline-none placeholder:text-neutral-400"
              placeholder={t.messageAs(writer.name)}
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
              aria-label={t.send}
              onMouseDown={(e) => e.preventDefault() /* no cerrar el teclado al tocar enviar */}
              disabled={!text.trim()}
              className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-brand text-white transition active:scale-90 disabled:opacity-50"
            >
              <Icon name="arrowRight" size={18} className="-rotate-90" />
            </button>
          </form>
        )}
      </div>
    </Screen>

      {intro !== 'gone' && (
        <RoundIntro writer={writer} isWriter={isWriter} leaving={intro === 'out'} />
      )}
    </>
  )
}

const INTRO_MS = 5000
const MESSAGE_GAP_MS = 500 // separación entre mensajes del chat al aparecer

/** Al empezar cada ronda: fondo oscurecido y SOLO a quién hay que imitar (avatar + "Imita a" + nombre grande). */
function RoundIntro({ writer, isWriter, leaving }: { writer: { name: string; color: string }; isWriter: boolean; leaving: boolean }) {
  const t = useT()
  return (
    <div
      aria-live="polite"
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/75 px-8 text-center text-white backdrop-blur-[4px] ${leaving ? 'animate-fade-out' : 'animate-fade-in'}`}
    >
      <div className="animate-pop" style={{ animationDelay: '0.15s' }}>
        <Avatar player={writer} size={110} ring />
      </div>
      {isWriter ? (
        <div className="animate-pop text-[44px] leading-tight font-black tracking-[-0.03em]" style={{ animationDelay: '0.45s' }}>
          {t.introYou}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="animate-rise text-[20px] font-bold text-white/75" style={{ animationDelay: '0.4s' }}>
            {t.introImitate}
          </div>
          <div
            className="max-w-full animate-pop truncate text-[64px] leading-none font-black tracking-[-0.04em]"
            style={{ animationDelay: '0.65s' }}
          >
            {writer.name}
          </div>
        </div>
      )}
    </div>
  )
}
