import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
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

const SITUATIONS = [
  { value: 'drinks', label: 'Drinks out', emoji: '🍻' },
  { value: 'party', label: 'Party', emoji: '🎉' },
  { value: 'dinner', label: 'Dinner', emoji: '🍕' },
  { value: 'home', label: 'Chilling at home', emoji: '🛋️' },
  { value: 'trip', label: 'On a trip', emoji: '🚐' },
  { value: 'break', label: 'Class or work break', emoji: '☕' },
] as const

const KNOW = [
  { value: 'yes', label: 'Yes, we’re close' },
  { value: 'no', label: 'Not really' },
] as const

function NamePage({ mode, code = '', onBack }: { mode: 'create' | 'join'; code?: string; onBack: () => void }) {
  const { game, error } = useGame()
  const [name, setName] = useState('')
  const [step, setStep] = useState<'name' | 'setup'>('name')
  const [situation, setSituation] = useState<string | null>(null)
  const [know, setKnow] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [nudge, setNudge] = useState<'situation' | 'know' | null>(null)
  const situationRef = useRef<HTMLDivElement>(null)
  const knowRef = useRef<HTMLDivElement>(null)
  const join = mode === 'join'

  /** Falta una respuesta: llevar a esa pregunta y resaltarla (en móvil puede quedar fuera de pantalla). */
  const point = (which: 'situation' | 'know') => {
    setNudge(which)
    ;(which === 'situation' ? situationRef : knowRef).current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setNudge(null), 900)
  }

  const submit = async () => {
    if (!name.trim() || busy) return
    if (join) {
      setBusy(true)
      return void game.joinRoom(code, name).finally(() => setBusy(false))
    }
    if (step === 'name') return setStep('setup')
    if (!situation) return point('situation')
    if (!know) return point('know')
    setBusy(true)
    try {
      await game.createRoom(name)
      await game.saveSetup({ situation, know })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <AppHeader
        left={
          <button
            type="button"
            onClick={step === 'setup' ? () => setStep('name') : onBack}
            className="-ml-2 flex h-[44px] items-center gap-2 px-2 text-[17px] font-extrabold active:scale-95"
          >
            <Icon name="arrowLeft" size={20} />
            Back
          </button>
        }
      />
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {step === 'name' ? (
          <Body className="gap-6 pt-6">
            <div className="animate-rise">
              <Eyebrow>{join ? `Room · ${code}` : 'New room · 1/2'}</Eyebrow>
              <h1 className="mt-2 text-[40px] leading-[1.05] font-black tracking-[-0.03em]">{join ? 'Join the game' : 'Set up your game'}</h1>
              <p className="mt-2 text-[18px] font-semibold text-white/85">{join ? 'Pick a name. You’re in.' : 'First, your name.'}</p>
            </div>
            <label className="flex animate-rise flex-col gap-2" style={{ animationDelay: '0.1s' }}>
              <Eyebrow>Your name</Eyebrow>
              <TextInput placeholder="e.g. Pol" maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
          </Body>
        ) : (
          <Body className="gap-6 pt-4">
            <div className="animate-rise">
              <Eyebrow>New room · 2/2</Eyebrow>
              <h1 className="mt-2 text-[36px] leading-[1.05] font-black tracking-[-0.03em]">What are you up to?</h1>
              <p className="mt-2 text-[17px] font-semibold text-white/85">The chats will match the moment.</p>
            </div>

            <div
              ref={situationRef}
              className={`grid animate-rise grid-cols-2 gap-2.5 rounded-[26px] transition ${nudge === 'situation' ? 'animate-nudge ring-4 ring-white' : ''}`}
              style={{ animationDelay: '0.05s' }}
            >
              {SITUATIONS.map((s) => (
                <Choice key={s.value} selected={situation === s.value} onClick={() => setSituation(s.value)}>
                  <span className="text-[26px] leading-none">{s.emoji}</span>
                  <span className="text-[16px] leading-tight font-extrabold">{s.label}</span>
                </Choice>
              ))}
            </div>

            <div
              ref={knowRef}
              className={`flex animate-rise scroll-mb-32 flex-col gap-2.5 rounded-[26px] transition ${nudge === 'know' ? 'animate-nudge ring-4 ring-white ring-offset-4 ring-offset-brand' : ''}`}
              style={{ animationDelay: '0.1s' }}
            >
              <Eyebrow>Do you know each other?</Eyebrow>
              <div className="grid grid-cols-2 gap-2.5">
                {KNOW.map((k) => (
                  <Choice key={k.value} selected={know === k.value} onClick={() => setKnow(k.value)} className="min-h-[60px] items-center justify-center text-center">
                    <span className="text-[17px] leading-tight font-extrabold">{k.label}</span>
                  </Choice>
                ))}
              </div>
            </div>
          </Body>
        )}

        <Footer>
          {error && <p className="text-center text-[16px] font-bold">{error}</p>}
          {join ? (
            <Button type="submit" variant="ink" disabled={!name.trim() || busy}>
              Join room
            </Button>
          ) : step === 'name' ? (
            <Button type="submit" disabled={!name.trim()} className="flex items-center justify-center gap-3">
              Next
              <Icon name="arrowRight" size={22} />
            </Button>
          ) : (
            <>
              {(!situation || !know) && (
                <p className="text-center text-[15px] font-semibold text-white/85">
                  {!situation ? 'Pick what you’re up to' : 'One more: do you know each other?'}
                </p>
              )}
              <Button type="submit" disabled={busy} className={!situation || !know ? 'opacity-70' : ''}>
                {busy ? 'Creating…' : 'Create room'}
              </Button>
            </>
          )}
        </Footer>
      </form>
    </Screen>
  )
}

/** Botón grande de opción: rojo claro sin elegir, blanco con texto rojo al elegirlo. */
function Choice({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-[84px] flex-col items-start justify-between gap-2 rounded-[22px] p-4 text-left transition active:scale-[0.97] ${
        selected ? 'bg-white text-brand shadow-[0_6px_0_rgba(0,0,0,0.18)]' : 'bg-white/15 text-white'
      } ${className}`}
    >
      {children}
    </button>
  )
}
