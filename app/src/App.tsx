import { useGame } from './game/useGame'
import Home from './screens/Home'
import Lobby from './screens/Lobby'
import Writing from './screens/Writing'
import Voting from './screens/Voting'
import { Leaderboard, Reveal } from './screens/Results'
import Final from './screens/Final'
import Generating from './screens/Generating'
import WaitingApproval from './screens/WaitingApproval'

// Router por fase: la fase de la sala decide la pantalla. Sin rutas ni navegación manual.
export default function App() {
  const { room, pending } = useGame()
  if (!room) return pending ? <WaitingApproval /> : <Home />

  switch (room.phase) {
    case 'lobby':
      return <Lobby />
    case 'generating':
      return <Generating />
    case 'writing':
      return <Writing key={room.roundIndex} />
    case 'voting':
      return <Voting />
    case 'reveal':
      return <Reveal />
    case 'leaderboard':
      return <Leaderboard />
    case 'final':
      return <Final />
  }
}
