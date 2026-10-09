import { useState } from 'react'
import { Bubble, Button, Screen, TypingDots } from '../components/ui'
import { useGame } from '../game/useGame'
import { MAX_NAME_LENGTH } from '../game/types'

// El QR de la sala apunta a ?room=CODE: entramos directamente al formulario de unirse.
const codeFromUrl = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? ''

export default function Home() {
  const { game, error } = useGame()
  const [name, setName] = useState('')
  const [code, setCode] = useState(codeFromUrl)
  const [joining, setJoining] = useState(Boolean(codeFromUrl))
  const [hint, setHint] = useState<string | null>(null)

  const go = (action: () => Promise<void>) => {
    if (!name.trim()) return setHint('Pick a name first.')
    if (joining && code.trim().length !== 4) return setHint('Room codes have 4 letters.')
    setHint(null)
    void action()
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Bubble className="px-3">
          <TypingDots />
        </Bubble>
        <h1 className="text-5xl font-black tracking-tighter">Typing…</h1>
        <p className="font-medium">
          Your friends fake your replies.
          <br />
          Spot the real one.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          go(() => (joining ? game.joinRoom(code, name) : game.createRoom(name)))
        }}
      >
        <input
          className="rounded-[18px] bg-white px-4 py-3.5 text-ink outline-none placeholder:text-neutral-400"
          placeholder="Your name"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
        {joining && (
          <input
            className="rounded-[18px] bg-white px-4 py-3.5 text-center font-bold tracking-[0.3em] text-ink uppercase outline-none placeholder:tracking-normal placeholder:text-neutral-400"
            placeholder="Room code"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
          />
        )}
        {(hint || error) && <p className="text-center text-sm font-bold">{hint ?? error}</p>}
        <Button type="submit">{joining ? 'Join room' : 'Create room'}</Button>
        <Button type="button" variant="ink" onClick={() => setJoining(!joining)}>
          {joining ? 'Create a room instead' : 'Join with code'}
        </Button>
        <p className="text-center text-xs font-medium">No account. Just a name.</p>
      </form>
    </Screen>
  )
}
