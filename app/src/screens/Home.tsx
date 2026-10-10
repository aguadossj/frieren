import { useRef, useState } from 'react'
import SwipeDeck, { GLYPHS } from '../components/SwipeDeck'
import type { SwipeCard } from '../components/SwipeDeck'
import { AppHeader, Body, Button, Eyebrow, Footer, Icon, Screen, TextInput, TypingDots } from '../components/ui'
import { useGame } from '../game/useGame'
import { MAX_NAME_LENGTH } from '../game/types'

// El QR de la sala apunta a ?room=CODE: entramos directamente a la página de unirse.
const codeFromUrl = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? ''

type Page = 'start' | 'create' | 'join'

const STEPS = [
  ['Get a message', 'The group chat asks you something.'],
  ['Everyone fakes it', 'Friends copy how you text.'],
  ['Spot the real one', 'Vote. Fool them. Score.'],
] as const

export default function Home() {
  const [page, setPage] = useState<Page>(codeFromUrl ? 'join' : 'start')

  if (page === 'create') return <NamePage onBack={() => setPage('start')} />
  if (page === 'join') return <JoinPage initialCode={codeFromUrl} onBack={() => setPage('start')} />
  return <Start onCreate={() => setPage('create')} onJoin={() => setPage('join')} />
}

function Start({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <Screen>
      <Body className="justify-center gap-7 pt-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-[52px] w-[70px] animate-pop items-center justify-center rounded-full bg-white">
            <TypingDots />
          </div>
          <Eyebrow>Live bluffing party game</Eyebrow>
          <h1 className="mt-2 text-[60px] leading-none font-black tracking-[-0.04em]">Typing…</h1>
          <p className="mt-4 text-[19px] leading-snug font-semibold">
            Your friends fake your replies.
            <br />
            Spot the real one.
          </p>
        </div>

        <ol className="flex animate-rise flex-col gap-3 rounded-[28px] bg-white/15 p-4" style={{ animationDelay: '0.15s' }}>
          {STEPS.map(([title, line], i) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-black text-brand">{i + 1}</span>
              <div className="leading-tight">
                <div className="text-[17px] font-extrabold">{title}</div>
                <div className="text-[15px] font-medium text-white/80">{line}</div>
              </div>
            </li>
          ))}
        </ol>
      </Body>

      <Footer>
        <Button onClick={onCreate} className="flex items-center justify-between px-7">
          <span className="flex items-center gap-3">
            <Icon name="plus" size={22} />
            Create room
          </span>
          <Icon name="arrowRight" size={22} />
        </Button>

        <Button variant="ink" onClick={onJoin} className="flex items-center justify-between px-7">
          <span>Join with code</span>
          <span className="flex gap-1" aria-hidden="true">
            {'ABCD'.split('').map((l) => (
              <span key={l} className="flex size-6 items-center justify-center rounded-[7px] bg-white/12 text-[13px] text-white/60">
                {l}
              </span>
            ))}
          </span>
        </Button>

      </Footer>
    </Screen>
  )
}

// Preguntas sí/no del setup (mazo tipo Tinder). Van a `setup` como contexto libre para la IA;
// `mimic` activa el bot impostor en `settings`.
const CARDS: SwipeCard[] = [
  { id: 'know', question: 'Do you all know each other well?', no: 'Not really', yes: 'Besties', icon: GLYPHS.people },
  { id: 'adults', question: 'Is everyone over 18?', no: 'No', yes: 'Yes', icon: GLYPHS.age },
  { id: 'spicy', question: 'Can the chats get spicy?', no: 'Keep it clean', yes: 'Spicy', icon: GLYPHS.flame },
  { id: 'mimic', question: 'Let an AI hide among your answers?', hint: 'Vote for it and you lose points.', no: 'No AI', yes: 'Bring it', icon: GLYPHS.robot },
]

const MAX_SITUATION = 120

function NamePage({ onBack }: { onBack: () => void }) {
  const { game, error } = useGame()
  const [name, setName] = useState('')
  const [situation, setSituation] = useState('')
  const [step, setStep] = useState<'name' | 'swipe'>('name')
  const [busy, setBusy] = useState(false)
  const answers = useRef<Record<string, boolean>>({})

  const create = async () => {
    setBusy(true)
    const a = answers.current
    try {
      await game.createRoom(name)
      await game.saveSetup({
        ...(situation.trim() && { situation: situation.trim() }),
        know: a.know ? 'yes' : 'no',
        adults: a.adults ? 'yes' : 'no',
        spicy: a.spicy ? 'yes' : 'no',
        // Con menores, el backend apaga el contenido picante
        ...(!a.adults && { age: 'mixed' }),
      })
      if (a.mimic) await game.updateSettings({ mimic: true })
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    if (!name.trim() || busy) return
    answers.current = {}
    setStep('swipe')
  }

  const back = (
    <button
      type="button"
      onClick={step === 'swipe' ? () => setStep('name') : onBack}
      className="-ml-2 flex h-[44px] items-center gap-2 px-2 text-[17px] font-extrabold active:scale-95"
    >
      <Icon name="arrowLeft" size={20} />
      Back
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
              <p className="text-[19px] font-extrabold">Opening your room…</p>
            </div>
          ) : (
            <SwipeDeck
              cards={CARDS}
              onAnswer={(id, yes) => {
                answers.current[id] = yes
                if (id === CARDS[CARDS.length - 1].id) void create()
              }}
            />
          )}
          {error && <p className="pt-3 text-center text-[16px] font-bold">{error}</p>}
        </div>
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
            <Eyebrow>New room · 1/2</Eyebrow>
            <h1 className="mt-2 text-[40px] leading-[1.05] font-black tracking-[-0.03em]">Set up your game</h1>
            <p className="mt-2 text-[18px] font-semibold text-white/85">The AI writes your group chats from this.</p>
          </div>

          <label className="flex animate-rise flex-col gap-2" style={{ animationDelay: '0.1s' }}>
            <Eyebrow>Your name</Eyebrow>
            <TextInput placeholder="e.g. Pol" maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>

          <label className="flex animate-rise flex-col gap-2" style={{ animationDelay: '0.2s' }}>
              <span className="flex items-baseline justify-between">
                <Eyebrow>What’s going on right now?</Eyebrow>
                <span className="text-[13px] font-bold text-white/60 tabular-nums">
                  {situation.length}/{MAX_SITUATION}
                </span>
              </span>
              <textarea
                rows={4}
                maxLength={MAX_SITUATION}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Friday drinks at Pol’s flat. Someone just spilled wine on the sofa…"
                className="w-full resize-none rounded-[28px] bg-white px-6 py-4 text-[17px] leading-snug font-semibold text-ink outline-none placeholder:font-medium placeholder:text-neutral-400"
              />
              <span className="text-[14px] font-semibold text-white/70">Where you are, who’s there, what just happened.</span>
          </label>
        </Body>

        <Footer>
          {error && <p className="text-center text-[16px] font-bold">{error}</p>}
          <Button type="submit" disabled={!name.trim()} className="flex items-center justify-center gap-3">
            Next
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
  const fromQr = initialCode.length === CODE_LENGTH
  const [code, setCode] = useState(initialCode)
  const [step, setStep] = useState<'code' | 'name'>(fromQr ? 'name' : 'code')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)

  const back = (
    <button
      type="button"
      onClick={step === 'name' && !fromQr ? () => setStep('code') : onBack}
      className="-ml-2 flex h-[44px] items-center gap-2 px-2 text-[17px] font-extrabold active:scale-95"
    >
      <Icon name="arrowLeft" size={20} />
      Back
    </button>
  )

  const join = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await game.joinRoom(code, name)
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
            <Eyebrow>Join a room</Eyebrow>
            <h1 className="mt-2 text-[44px] leading-[1.02] font-black tracking-[-0.035em]">Got a code?</h1>
            <p className="mt-2 text-[18px] font-semibold text-white/85">It’s on the host’s screen. Or just scan their QR.</p>
          </div>
          <CodeTiles
            value={code}
            onChange={(v) => {
              setCode(v)
              if (v.length === CODE_LENGTH) setTimeout(() => setStep('name'), 280)
            }}
          />
        </Body>
      </Screen>
    )
  }

  const initial = name.trim().slice(0, 1).toUpperCase()
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
        <Body className="gap-6 pt-4">
          {/* Invitación tipo entrada, con muescas y línea perforada */}
          <div className={`relative animate-pop rounded-[30px] bg-white text-ink ${shake ? 'animate-nudge' : ''}`}>
            <div className="px-6 pt-6 pb-5 text-center">
              <Eyebrow className="text-neutral-400">You’re invited to</Eyebrow>
              <div className="mt-3 flex justify-center gap-2">
                {code.split('').map((l, i) => (
                  <span
                    key={i}
                    className="flex h-[58px] w-[50px] animate-pop items-center justify-center rounded-[16px] bg-brand text-[32px] font-black text-white"
                    style={{ animationDelay: `${0.15 + i * 0.07}s` }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative h-0 border-t-[3px] border-dashed border-neutral-200">
              <span className="absolute -top-[14px] -left-[14px] size-[26px] rounded-full bg-brand" />
              <span className="absolute -top-[14px] -right-[14px] size-[26px] rounded-full bg-brand" />
            </div>
            {/* Vista previa en vivo: así te verán en el chat */}
            <div className="flex items-center gap-3 px-6 pt-5 pb-6">
              <span
                className="flex size-[52px] shrink-0 items-center justify-center rounded-full text-[22px] font-black text-white transition-colors duration-300"
                style={{ background: name.trim() ? '#111111' : '#E5E5E5' }}
              >
                {initial || <TypingDots />}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[19px] leading-tight font-extrabold">{name.trim() || 'You'}</div>
                <div className="text-[15px] font-semibold text-neutral-400">{name.trim() ? 'is joining the chat…' : 'type your name below'}</div>
              </div>
            </div>
          </div>

          <label className="flex animate-rise flex-col gap-2" style={{ animationDelay: '0.15s' }}>
            <Eyebrow>Your name</Eyebrow>
            <TextInput
              placeholder="e.g. Laura"
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              enterKeyHint="go"
            />
          </label>
        </Body>

        <Footer>
          {error && !busy && (
            <div className="flex items-center justify-center gap-3 text-[16px] font-bold">
              <span>{error}</span>
              {!fromQr && (
                <button type="button" onClick={() => setStep('code')} className="min-h-[44px] underline underline-offset-4">
                  Change code
                </button>
              )}
            </div>
          )}
          <Button type="submit" variant="ink" disabled={!name.trim() || busy} className="flex items-center justify-center gap-3">
            {busy ? (
              <>
                Joining <TypingDots />
              </>
            ) : (
              <>
                Join room
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
function CodeTiles({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(true)
  return (
    <div className="relative flex animate-rise justify-center gap-3" style={{ animationDelay: '0.1s' }}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const letter = value[i]
        const active = focused && i === Math.min(value.length, CODE_LENGTH - 1) && value.length < CODE_LENGTH
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
            ) : active ? (
              <span className="h-[44px] w-[4px] animate-pulse rounded-full bg-brand" />
            ) : null}
          </span>
        )
      })}
      <input
        aria-label="Room code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
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
