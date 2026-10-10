import { useEffect, useRef, useState } from 'react'
import { retintSafariBars } from '../lib/viewport'
import SwipeDeck, { GLYPHS } from '../components/SwipeDeck'
import HowToPlay, { preloadHowTo, seenHowTo } from '../components/HowToPlay'
import MimicInfo from '../components/MimicInfo'
import type { SwipeCard } from '../components/SwipeDeck'
import { AppHeader, Avatar, Body, Button, ConfirmDialog, Eyebrow, Footer, Icon, LangToggle, Screen, TextInput, TypingDots } from '../components/ui'
import { getLang, useLang, useT } from '../i18n'
import { LEGAL, LEGAL_PAGES, LEGAL_PATHS } from '../content/legal'
import { describePlace, knownPosition } from '../lib/place'
import type { PlaceContext } from '../lib/place'
import { useGame } from '../game/useGame'
import { MAX_NAME_LENGTH } from '../game/types'
import { randomFreeAvatar } from '../lib/avatars'

// El QR de la sala apunta a ?room=CODE: entramos directamente a la página de unirse.
// Se lee UNA vez y se borra de la URL: así, al volver al menú tras una partida, Home es la de siempre
// (antes reabría "unirse" con el código de la partida anterior).
let pendingCode = (() => {
  const params = new URLSearchParams(location.search)
  const code = params.get('room')?.toUpperCase() ?? ''
  if (code) {
    params.delete('room')
    const rest = params.toString()
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash)
  }
  return code
})()

type Page = 'start' | 'create' | 'join'

export default function Home() {
  const [codeFromUrl] = useState(() => pendingCode)
  const [page, setPage] = useState<Page>(codeFromUrl ? 'join' : 'start')
  // "Cómo se juega": solo la primera vez que se abre la web (luego, desde el botón de la portada)
  const [howTo, setHowTo] = useState(() => !seenHowTo())
  // Si vienes de que el host te eche (o no te deje entrar), se avisa una vez al llegar aquí
  const { removed } = useGame()
  const [removedSeen, setRemovedSeen] = useState(false)
  const t = useT()
  // Capturas de "Cómo se juega" precargadas siempre en segundo plano (en la primera visita ya van desde index.html)
  const lang = useLang()
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200))
    idle(() => preloadHowTo(lang))
  }, [lang])

  // Home siempre "limpia", también al volver de una partida: sin restos del chat (fondo blanco, teclado),
  // sin foco en ningún campo, página arriba del todo y barras de Safari recalculadas.
  useEffect(() => {
    pendingCode = '' // el código del QR solo sirve para la primera vez
    const root = document.documentElement
    delete root.dataset.page
    root.dataset.keyboard = 'closed'
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo(0, 0)
    retintSafariBars()
  }, [])

  const current =
    page === 'create' ? (
      <NamePage onBack={() => setPage('start')} />
    ) : page === 'join' ? (
      <JoinPage initialCode={codeFromUrl} onBack={() => setPage('start')} />
    ) : (
      <Start onCreate={() => setPage('create')} onJoin={() => setPage('join')} onHowTo={() => setHowTo(true)} />
    )
  return (
    <>
      {current}
      {howTo && <HowToPlay onClose={() => setHowTo(false)} />}
      {removed && !removedSeen && !howTo && (
        <ConfirmDialog
          title={removed === 'kicked' ? t.removedKicked : t.removedRejected}
          body={t.removedBody}
          confirm={t.removedOk}
          onConfirm={() => setRemovedSeen(true)}
          onCancel={() => setRemovedSeen(true)}
        />
      )}
    </>
  )
}

function Start({ onCreate, onJoin, onHowTo }: { onCreate: () => void; onJoin: () => void; onHowTo: () => void }) {
  const t = useT()
  return (
    <Screen drift className="relative">
      {/* EN · ES flotando sobre el fondo, sin barra ni hueco propio */}
      <LangToggle className="absolute top-2 right-3 z-10" />
      {/* Cómo jugar: reabre el pop-up de los 3 pasos */}
      <button onClick={onHowTo} className="absolute top-2 left-3 z-10 flex h-[44px] items-center gap-2 px-2 text-[15px] font-black active:scale-95">
        <span className="flex size-[26px] items-center justify-center rounded-full bg-white text-[15px] font-black text-brand">?</span>
        {t.howToPlay}
      </button>
      {/* Centrado "seguro": my-auto centra si sobra sitio y, si no cabe, se desplaza normal sin cortar la parte de arriba.
          En móviles bajos se compacta (y se ocultan los pasos) para que no haga falta scroll. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5">
        <div className="my-auto flex flex-col gap-7 pt-12 pb-4 [@media(max-height:700px)]:gap-5 [@media(max-height:700px)]:pt-10">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-[52px] w-[70px] animate-pop items-center justify-center rounded-full bg-white [@media(max-height:700px)]:mb-4">
              <TypingDots />
            </div>
            <h1 className="text-[60px] leading-none font-black tracking-[-0.04em] [@media(max-height:700px)]:text-[50px]">Typing…</h1>
            <p className="mt-4 text-[19px] leading-snug font-semibold [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:text-[17px]">
              {t.pitch1}
              <br />
              {t.pitch2}
            </p>
          </div>

        </div>
      </div>

      <Footer>
        <Button onClick={onCreate} className="flex items-center justify-between px-7">
          <span className="flex items-center gap-3">
            <Icon name="plus" size={22} />
            {t.createRoom}
          </span>
          <Icon name="arrowRight" size={22} />
        </Button>

        <Button variant="ink" onClick={onJoin} className="flex items-center justify-between px-7">
          <span className="flex items-center gap-3 whitespace-nowrap">
            <Icon name="code" size={22} />
            {t.joinWithCode}
          </span>
          <Icon name="arrowRight" size={22} />
        </Button>

        <LegalLinks />
      </Footer>
    </Screen>
  )
}

// Preguntas sí/no del setup (mazo tipo Tinder). Van a `setup` como contexto libre para la IA;
// `mimic` activa el bot impostor en `settings`.
const CARD_ICONS = { together: GLYPHS.pin, know: GLYPHS.people, adults: GLYPHS.age, spicy: GLYPHS.flame, mimic: GLYPHS.robot }
// `together` = estáis todos en el mismo sitio → se pide la ubicación para personalizar los chats
const CARD_IDS = ['together', 'know', 'adults', 'spicy', 'mimic'] as const

const MAX_SITUATION = 120

function NamePage({ onBack }: { onBack: () => void }) {
  const { game, error } = useGame()
  const t = useT()
  const lang = useLang()
  // "¿Qué es Mimic?": pop-up con ilustraciones dentro de la app (antes abría la página legal en otra pestaña)
  const [mimicInfo, setMimicInfo] = useState(false)
  const cards: SwipeCard[] = CARD_IDS.map((id) => ({
    id,
    icon: CARD_ICONS[id],
    ...t.cards[id],
    ...(id === 'mimic' && { link: { label: LEGAL[lang].ui.mimicLink, onClick: () => setMimicInfo(true) } }),
  }))
  const [name, setName] = useState('')
  const [situation, setSituation] = useState('')
  const [step, setStep] = useState<'name' | 'swipe'>('name')
  const [busy, setBusy] = useState(false)
  const answers = useRef<Record<string, boolean>>({})

  // Ubicación: el permiso se pide al ENTRAR en la web (main.tsx). Aquí, si el host desliza "sí" en "estáis juntos",
  // se usa esa posición y se traduce a calle, barrio y sitios cercanos mientras contesta el resto de tarjetas.
  const placeLookup = useRef<Promise<PlaceContext | null> | null>(null)
  const [lookingAround, setLookingAround] = useState(false)
  const locate = () => {
    placeLookup.current = knownPosition().then((pos) => (pos ? describePlace(pos.lat, pos.lon, getLang()) : null))
  }

  const create = async () => {
    setBusy(true)
    const a = answers.current
    try {
      // Esperar al contexto del lugar como mucho 10 s más; si no llega, se crea la sala sin él
      let place: PlaceContext | null = null
      if (placeLookup.current) {
        setLookingAround(true)
        place = await Promise.race([placeLookup.current, new Promise<null>((r) => setTimeout(() => r(null), 10000))])
        setLookingAround(false)
      }
      await game.createRoom(name, randomFreeAvatar())
      await game.saveSetup({
        ...(situation.trim() && { situation: situation.trim() }),
        lang: getLang(), // idioma de la partida, para que la IA escriba los chats en él
        know: a.know ? 'yes' : 'no',
        adults: a.adults ? 'yes' : 'no',
        spicy: a.spicy ? 'yes' : 'no',
        // Con menores, el backend apaga el contenido picante
        ...(!a.adults && { age: 'mixed' }),
        together: a.together ? 'yes' : 'no',
        ...(place?.place && { place: place.place }),
        ...(place && place.nearby.length > 0 && { nearby: place.nearby }),
        ...(place && { local_time: place.local_time }),
      })
      if (a.mimic) await game.updateSettings({ mimic: true })
    } finally {
      setBusy(false)
    }
  }

  // "¿Qué estáis haciendo ahora?" es obligatorio: sin él no se puede seguir (la IA lo necesita para los chats)
  const [situationMissing, setSituationMissing] = useState(false)
  const situationRef = useRef<HTMLTextAreaElement>(null)
  const MIN_SITUATION = 3

  const submit = () => {
    if (!name.trim() || busy) return
    if (situation.trim().length < MIN_SITUATION) {
      setSituationMissing(true)
      situationRef.current?.focus({ preventScroll: true })
      situationRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    answers.current = {}
    placeLookup.current = null
    setStep('swipe')
  }

  const back = (
    <button
      type="button"
      onClick={step === 'swipe' ? () => setStep('name') : onBack}
      className="-ml-2 flex h-[44px] items-center gap-2 px-2 text-[17px] font-extrabold active:scale-95"
    >
      <Icon name="arrowLeft" size={20} />
      {t.back}
    </button>
  )

  if (step === 'swipe') {
    return (
      <Screen>
        <AppHeader left={back} />
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden px-4 pt-1 pb-6">
          {busy ? (
            <div className="flex flex-1 animate-pop flex-col items-center justify-center gap-4">
              <div className="flex h-[52px] w-[70px] items-center justify-center rounded-full bg-white">
                <TypingDots />
              </div>
              <p className="text-[19px] font-extrabold">{lookingAround ? t.lookingAround : t.openingRoom}</p>
            </div>
          ) : (
            <SwipeDeck
              cards={cards}
              lead={t.swipeIf}
              onAnswer={(id, yes) => {
                answers.current[id] = yes
                if (id === 'together' && yes) locate()
                if (id === cards[cards.length - 1].id) void create()
              }}
            />
          )}
          {error && <p className="pt-3 text-center text-[16px] font-bold">{error}</p>}
        </div>
        {mimicInfo && <MimicInfo onClose={() => setMimicInfo(false)} moreHref={`${LEGAL_PATHS.ai}#mimic`} />}
      </Screen>
    )
  }

  return (
    <Screen>
      <AppHeader left={back} />
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Body className="gap-5 pt-4">
          <div className="animate-rise">
            <Eyebrow>{t.newRoom1}</Eyebrow>
            <h1 className="mt-2 text-[40px] leading-[1.05] font-black tracking-[-0.03em]">{t.setUpGame}</h1>
            <p className="mt-2 text-[18px] font-semibold text-white/85">{t.setUpSub}</p>
          </div>

          <label className="flex animate-rise flex-col gap-2" style={{ animationDelay: '0.1s' }}>
            <Eyebrow>{t.yourName}</Eyebrow>
            <TextInput placeholder={t.namePlaceholderHost} maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="flex animate-rise flex-col gap-2" style={{ animationDelay: '0.2s' }}>
              <span className="flex items-baseline justify-between">
                <span className="text-[18px] leading-tight font-extrabold">{t.situationLabel}</span>
                <span className="text-[13px] font-bold text-white/60 tabular-nums">
                  {situation.length}/{MAX_SITUATION}
                </span>
              </span>
              <textarea
                ref={situationRef}
                rows={4}
                aria-required="true"
                aria-invalid={situationMissing}
                maxLength={MAX_SITUATION}
                value={situation}
                onChange={(e) => {
                  setSituation(e.target.value)
                  if (e.target.value.trim().length >= MIN_SITUATION) setSituationMissing(false)
                }}
                placeholder={t.situationPlaceholder}
                className={`w-full resize-none rounded-[28px] bg-white px-6 py-4 text-[17px] leading-snug font-semibold text-ink outline-none placeholder:font-medium placeholder:text-neutral-400 ${situationMissing ? 'animate-nudge ring-4 ring-ink' : ''}`}
              />
              {situationMissing && (
                <span className="text-[14px] font-extrabold text-white" role="alert">
                  {t.situationRequired}
                </span>
              )}
          </label>
        </Body>

        <Footer>
          {error && <p className="text-center text-[16px] font-bold">{error}</p>}
          <Button
            type="submit"
            disabled={!name.trim()}
            className={`flex items-center justify-center gap-3 ${situation.trim().length < MIN_SITUATION ? 'opacity-60' : ''}`}
          >
            {t.next}
            <Icon name="arrowRight" size={22} />
          </Button>
        </Footer>
      </form>
    </Screen>
  )
}

const CODE_LENGTH = 4

/** Unirse: 1) código en 4 casillas (se salta si vienes del QR) → 2) invitación con tu nombre y vista previa. */
function JoinPage({ initialCode, onBack }: { initialCode: string; onBack: () => void }) {
  const { game, error } = useGame()
  const t = useT()
  const fromQr = initialCode.length === CODE_LENGTH
  const [code, setCode] = useState(initialCode)
  const [step, setStep] = useState<'code' | 'name'>(fromQr ? 'name' : 'code')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  // Comprobación del código ANTES de pedir el nombre (check_room): existe, no ha empezado, no está llena
  const [checking, setChecking] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  // Tu panda: uno libre de la sala elegido al confirmar el código; se entra con ESE (join_room lo guarda), así que
  // no cambia al entrar aunque otros estén poniendo su nombre a la vez. Y los nombres que ya hay, para avisar.
  const [myColor, setMyColor] = useState<string | null>(null)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [takenNames, setTakenNames] = useState<string[]>([])
  const nameTaken = takenNames.includes(name.trim().toLowerCase())

  const checkCode = async (v: string) => {
    setChecking(true)
    setCodeError(null)
    const res = await game.checkRoom(v)
    setChecking(false)
    if (res.ok) {
      setMyColor(res.color ?? null)
      setMyAvatar((current) => (current && !(res.takenAvatars ?? []).includes(current) ? current : randomFreeAvatar(res.takenAvatars)))
      setTakenNames(res.takenNames ?? [])
      return setStep('name')
    }
    setStep('code')
    setCodeError(res.message ?? null)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  // Si vienes del QR/enlace, comprobamos ese código al entrar
  useEffect(() => {
    if (fromQr) void checkCode(initialCode)
  }, [])

  const back = (
    <button
      type="button"
      onClick={step === 'name' && !fromQr ? () => setStep('code') : onBack}
      className="-ml-2 flex h-[44px] items-center gap-2 px-2 text-[17px] font-extrabold active:scale-95"
    >
      <Icon name="arrowLeft" size={20} />
      {t.back}
    </button>
  )

  const join = async () => {
    if (!name.trim() || busy || nameTaken) return
    setBusy(true)
    try {
      await game.joinRoom(code, name, myAvatar ?? undefined)
    } finally {
      setBusy(false)
    }
    // Sin sala tras intentarlo = no se pudo entrar (código malo, partida empezada…): sacudir la invitación
    if (game.getState().room) return
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  if (step === 'code') {
    return (
      <Screen>
        <AppHeader left={back} />
        <Body className="gap-8 pt-6">
          <div className="animate-rise">
            <Eyebrow>{t.joinARoom}</Eyebrow>
            <h1 className="mt-2 text-[44px] leading-[1.02] font-black tracking-[-0.035em]">{t.gotACode}</h1>
            <p className="mt-2 text-[18px] font-semibold text-white/85">{t.gotACodeSub}</p>
          </div>
          <div className={shake ? 'animate-nudge' : ''}>
            <CodeTiles
              label={t.roomCode}
              value={code}
              onChange={(v) => {
                setCode(v)
                setCodeError(null)
                if (v.length === CODE_LENGTH) setTimeout(() => void checkCode(v), 280)
              }}
            />
          </div>
          {(checking || codeError) && (
            <p className="-mt-4 animate-rise text-center text-[16px] font-bold" role={codeError ? 'alert' : 'status'}>
              {checking ? t.checkingRoom : codeError}
            </p>
          )}
        </Body>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppHeader left={back} />
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          void join()
        }}
      >
        <Body className="gap-8 pt-6">
          <div className="animate-rise">
            <Eyebrow>{t.joinARoom}</Eyebrow>
            <h1 className="mt-2 text-[44px] leading-[1.02] font-black tracking-[-0.035em]">{t.askName}</h1>
          </div>
          {/* Tu panda (el que tendrás en la sala), encima de la caja del nombre. Sin animación. */}
          <div className="flex flex-col items-center gap-5">
            {myColor ? (
              <Avatar player={{ name: name.trim() || '?', color: myColor, emoji: myAvatar }} roomCode={code} size={160} ring />
            ) : (
              <span className="size-[160px] rounded-full bg-white/20 ring-[3px] ring-white" />
            )}
            <TextInput
              className={`animate-rise ${shake ? 'animate-nudge' : ''}`}
              style={{ animationDelay: '0.1s' }}
              placeholder={t.namePlaceholderGuest}
              aria-label={t.yourName}
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              enterKeyHint="go"
            />
          </div>
        </Body>

        <Footer>
          {error && !busy && (
            <div className="flex items-center justify-center gap-3 text-[16px] font-bold">
              <span>{error}</span>
              {!fromQr && (
                <button type="button" onClick={() => setStep('code')} className="min-h-[44px] underline underline-offset-4">
                  {t.changeCode}
                </button>
              )}
            </div>
          )}
          {nameTaken && (
            <p className="animate-rise text-center text-[16px] font-bold" role="alert">
              {t.nameTaken}
            </p>
          )}
          <Button type="submit" variant="ink" disabled={!name.trim() || busy || nameTaken} className="flex items-center justify-center gap-3">
            {busy ? (
              <>
                {t.joining} <TypingDots />
              </>
            ) : (
              <>
                {t.joinRoom}
                <Icon name="arrowRight" size={22} />
              </>
            )}
          </Button>
        </Footer>
      </form>
    </Screen>
  )
}

/** 4 casillas para el código. Un input invisible encima recoge lo que escribes (y lo pegado). */
function CodeTiles({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false) // sin autoFocus: el teclado solo se abre al tocar
  return (
    <div className="relative flex animate-rise justify-center gap-3" style={{ animationDelay: '0.1s' }}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const letter = value[i]
        // La casilla que toca se ve resaltada siempre; el cursor solo aparece con el teclado abierto
        const active = i === value.length
        return (
          <span
            key={i}
            className={`flex h-[92px] w-[72px] items-center justify-center rounded-[22px] text-[46px] font-black transition-colors ${
              letter ? 'bg-white text-ink' : active ? 'bg-white/90' : 'bg-white/20'
            }`}
          >
            {letter ? (
              <span key={letter + i} className="animate-pop">
                {letter}
              </span>
            ) : active && focused ? (
              <span className="h-[44px] w-[4px] animate-pulse rounded-full bg-brand" />
            ) : null}
          </span>
        )
      })}
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoComplete="one-time-code"
        autoCorrect="off"
        spellCheck={false}
        maxLength={CODE_LENGTH}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  )
}

/** Pie de la portada: Privacy · AI · Terms (páginas en content/legal.ts). Discreto, pero con área táctil de 44 px. */
function LegalLinks() {
  const copy = LEGAL[useLang()]
  return (
    <nav aria-label="Legal" className="-mt-2 -mb-4 flex items-center justify-center text-[13px] font-bold text-white/60">
      {LEGAL_PAGES.map((k, i) => (
        <span key={k} className="flex items-center">
          {i > 0 && <span aria-hidden="true">·</span>}
          <a href={LEGAL_PATHS[k]} className="flex h-[44px] items-center px-2.5 active:text-white">
            {copy[k].tab}
          </a>
        </span>
      ))}
    </nav>
  )
}
