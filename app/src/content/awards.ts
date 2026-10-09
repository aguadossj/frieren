// Premios del presentador (T3 es dueño). Plantillas locales; la IA las sustituye si hay clave.
// `{writer}` = quien escribía la ronda; `{winner}` = quien más engañó (o quien más acertó).

export const IMPOSTOR_AWARDS = [
  'Best {writer} impression: {winner}. Scary accurate.',
  '{winner} knows {writer} better than {writer} does.',
  '{winner} should be legally investigated for that {writer} impression.',
]

export const WRITER_AWARDS = [
  'Nobody can fake {writer}. Truly one of a kind.',
  '{writer} is an open book. Everyone saw it coming.',
]

export function pickAward(templates: string[], writer: string, winner: string): string {
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template.replaceAll('{writer}', writer).replaceAll('{winner}', winner)
}
