import { Body, Button, Footer, Screen, TypingDots } from '../components/ui'
import { useLang } from '../i18n'
import { useGame } from '../game/useGame'

const TEXT = {
  en: {
    title: 'Knock knock…',
    sub: (host: string | null) => `${host ?? 'The host'} has to let you in.`,
    room: 'Room',
    cancel: 'Cancel',
  },
  es: {
    title: 'Toc, toc…',
    sub: (host: string | null) => `${host ?? 'El anfitrión'} tiene que dejarte entrar.`,
    room: 'Sala',
    cancel: 'Cancelar',
  },
}

// Sala con aprobación: he pedido entrar y espero a que el host me acepte. No se ve nada de la sala.
export default function WaitingApproval() {
  const { pending, game } = useGame()
  const t = TEXT[useLang()]
  if (!pending) return null
  return (
    <Screen>
      <Body className="items-center justify-center gap-5 text-center">
        <div className="flex h-[52px] w-[70px] animate-pop items-center justify-center rounded-full bg-white">
          <TypingDots />
        </div>
        <h1 className="text-[40px] leading-tight font-black tracking-[-0.03em]">{t.title}</h1>
        <p className="text-[19px] font-semibold text-white/90">{t.sub(pending.hostName)}</p>
        <p className="rounded-full bg-white/15 px-4 py-1.5 text-[15px] font-extrabold tracking-[0.18em]">
          {t.room} {pending.code}
        </p>
      </Body>
      <Footer>
        <Button variant="ink" onClick={() => void game.leave()}>
          {t.cancel}
        </Button>
      </Footer>
    </Screen>
  )
}
