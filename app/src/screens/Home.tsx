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
  const [code, setCode] = useState(codeFromUrl)

  if (page === 'create') return <NamePage mode="create" onBack={() => setPage('start')} />
  if (page === 'join') return <NamePage mode="join" code={code} onBack={() => setPage('start')} />
  return (
    <Start
      code={code}
      setCode={setCode}
      onCreate={() => setPage('create')}
      onJoin={() => setPage('join')}
    />
  )
}

function Start({ code, setCode, onCreate, onJoin }: { code: string; setCode: (c: string) => void; onCreate: () => void; onJoin: () => void }) {
  const [askCode, setAskCode] = useState(false)

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

        {askCode ? (
          <form
            className="flex animate-rise gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.length === 4) onJoin()
            }}
          >
            <TextInput
              placeholder="CODE"
              maxLength={4}
              autoCapitalize="characters"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
              className="min-w-0 flex-1 tracking-[0.3em] uppercase placeholder:tracking-[0.3em]"
            />
            <button
              type="submit"
              disabled={code.length !== 4}
              className="h-[66px] shrink-0 rounded-full bg-ink px-7 text-[21px] font-extrabold text-white transition active:scale-[0.97] disabled:opacity-50"
            >
              Join
            </button>
          </form>
        ) : (
          <Button variant="ink" onClick={() => setAskCode(true)} className="flex items-center justify-between px-7">
            <span>Join with code</span>
            <span className="text-[16px] tracking-[0.2em] text-white/50">ABCD</span>
          </Button>
        )}

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

function NamePage({ mode, code = '', onBack }: { mode: 'create' | 'join'; code?: string; onBack: () => void }) {
  const { game, error } = useGame()
  const [name, setName] = useState('')
  const [situation, setSituation] = useState('')
  const [step, setStep] = useState<'name' | 'swipe'>('name')
  const [busy, setBusy] = useState(false)
  const answers = useRef<Record<string, boolean>>({})
  const join = mode === 'join'

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
    if (join) {
      setBusy(true)
      return void game.joinRoom(code, name).finally(() => setBusy(false))
    }
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
            <Eyebrow>{join ? `Room · ${code}` : 'New room · 1/2'}</Eyebrow>
            <h1 className="mt-2 text-[40px] leading-[1.05] font-black tracking-[-0.03em]">{join ? 'Join the game' : 'Set up your game'}</h1>
            <p className="mt-2 text-[18px] font-semibold text-white/85">
              {join ? 'Pick a name. You’re in.' : 'The AI writes your group chats from this.'}
            </p>
          </div>

          <label className="flex animate-rise flex-col gap-2" style={{ animationDelay: '0.1s' }}>
            <Eyebrow>Your name</Eyebrow>
            <TextInput placeholder="e.g. Pol" maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>

          {!join && (
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
          )}
        </Body>

        <Footer>
          {error && <p className="text-center text-[16px] font-bold">{error}</p>}
          {join ? (
            <Button type="submit" variant="ink" disabled={!name.trim() || busy}>
              Join room
            </Button>
          ) : (
            <Button type="submit" disabled={!name.trim()} className="flex items-center justify-center gap-3">
              Next
              <Icon name="arrowRight" size={22} />
            </Button>
          )}
        </Footer>
      </form>
    </Screen>
  )
}
