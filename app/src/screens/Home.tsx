import { useState } from 'react'
import { Body, Button, Footer, Screen, TextInput, TypingDots } from '../components/ui'
import { useGame } from '../game/useGame'
import { MAX_NAME_LENGTH } from '../game/types'

// El QR de la sala apunta a ?room=CODE: entramos directamente al formulario de unirse.
const codeFromUrl = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? ''

type Mode = 'start' | 'create' | 'join'

export default function Home() {
  const { game, error } = useGame()
  const [mode, setMode] = useState<Mode>(codeFromUrl ? 'join' : 'start')
  const [name, setName] = useState('')
  const [code, setCode] = useState(codeFromUrl)
  const [hint, setHint] = useState<string | null>(null)

  const submit = () => {
    if (!name.trim()) return setHint('Pick a name first.')
    if (mode === 'join' && code.trim().length !== 4) return setHint('Room codes have 4 letters.')
    setHint(null)
    void (mode === 'join' ? game.joinRoom(code, name) : game.createRoom(name))
  }

  return (
    <Screen>
      <Body className="items-center justify-center text-center">
        <div className="mb-10 flex h-[56px] w-[74px] animate-pop items-center justify-center rounded-full bg-white">
          <TypingDots />
        </div>
        <h1 className="text-[64px] leading-none font-black tracking-[-0.04em]">Typing…</h1>
        <p className="mt-6 text-[21px] leading-snug font-semibold">
          Your friends fake your replies.
          <br />
          Spot the real one.
        </p>
      </Body>

      {mode === 'start' ? (
        <Footer>
          <Button onClick={() => setMode('create')}>Create room</Button>
          <Button variant="ink" onClick={() => setMode('join')}>
            Join with code
          </Button>
          <p className="text-center text-[16px] font-semibold">No account. Just a name.</p>
        </Footer>
      ) : (
        <form
          className="flex shrink-0 animate-rise flex-col gap-3 px-5 pt-2 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {mode === 'join' && (
            <TextInput
              placeholder="CODE"
              maxLength={4}
              autoCapitalize="characters"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
              className="tracking-[0.3em] uppercase placeholder:tracking-[0.3em]"
              autoFocus={!codeFromUrl}
            />
          )}
          <TextInput
            placeholder="Your name"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={mode === 'create' || Boolean(codeFromUrl)}
          />
          <Button type="submit" variant={mode === 'join' ? 'ink' : 'white'}>
            {mode === 'join' ? 'Join room' : 'Create room'}
          </Button>
          <button
            type="button"
            className="py-1 text-center text-[16px] font-semibold"
            onClick={() => {
              setHint(null)
              setMode(mode === 'join' ? 'create' : 'join')
            }}
          >
            {hint ?? error ?? (mode === 'join' ? 'Create a room instead' : 'Join with code instead')}
          </button>
        </form>
      )}
    </Screen>
  )
}
