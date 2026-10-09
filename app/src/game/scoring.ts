// Puntuación de una ronda. Referencia de las reglas de SPEC.md:
// el mock la usa tal cual y T1 la replica en SQL (advance_phase).

import { pickAward, IMPOSTOR_AWARDS, WRITER_AWARDS } from '../content/awards'
import { POINTS } from './types'
import type { AnswerResult, Player, RoundResult } from './types'

export interface ScoreInput {
  writer: Player
  players: Player[]
  options: { id: string; text: string; authorId: string; isReal: boolean }[]
  votes: Record<string, string> // voterId -> answerId
  laughs: Record<string, string[]> // answerId -> voterIds
}

export function scoreRound({ writer, players, options, votes, laughs }: ScoreInput): RoundResult {
  const points: Record<string, number> = Object.fromEntries(players.map((p) => [p.id, 0]))
  const fooled: Record<string, number> = {}

  const answers: AnswerResult[] = options.map((option) => ({
    ...option,
    voterIds: Object.keys(votes).filter((voterId) => votes[voterId] === option.id),
    laughs: laughs[option.id]?.length ?? 0,
  }))

  for (const answer of answers) {
    for (const voterId of answer.voterIds) {
      if (answer.isReal) {
        points[voterId] += POINTS.foundReal
        points[writer.id] += POINTS.writerPerFinder
      } else {
        points[answer.authorId] += POINTS.impostorPerFooled
        fooled[answer.authorId] = (fooled[answer.authorId] ?? 0) + 1
      }
    }
    points[answer.authorId] += answer.laughs * POINTS.perLaugh
  }

  const best = Object.entries(fooled).sort((a, b) => b[1] - a[1])[0]
  const winner = best ? players.find((p) => p.id === best[0]) : undefined
  const award = winner
    ? pickAward(IMPOSTOR_AWARDS, writer.name, winner.name)
    : pickAward(WRITER_AWARDS, writer.name, writer.name)

  return { answers, points, award }
}
