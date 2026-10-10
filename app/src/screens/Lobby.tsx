import { useState } from 'react'
import { Avatar, Button, ConfirmDialog, Eyebrow, Footer, Icon, LangToggle, Row, Screen } from '../components/ui'
import QR, { shareInvite } from '../components/QR'
import { SettingsGear } from '../components/HostSettings'
import { PendingRequests } from '../components/PendingRequests'
import { useGame } from '../game/useGame'
import { MIN_PLAYERS } from '../game/types'
import { useT } from '../i18n'

export default function Lobby() {
  const { room, me, game, error } = useGame()
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null) // "¿Echar a X?" abierto
  if (!room || !me) return null
  const missing = MIN_PLAYERS - room.players.length
  const host = room.players.find((p) => p.isHost)
  const situation = typeof room.setup?.situation === 'string' ? room.setup.situation : null
  // Lugar detectado (si el host compartió la ubicación): barrio/ciudad + 2 sitios cercanos
  // del "calle, barrio, ciudad" enseñamos solo el barrio (o la ciudad si no hay barrio)
  const place = typeof room.setup?.place === 'string' ? (room.setup.place.split(', ').slice(-2)[0] ?? null) : null
  const nearby = Array.isArray(room.setup?.nearby) ? room.setup.nearby.slice(0, 2).map((n) => String(n).replace(/ \([^)]*\)$/, '')) : []
  const placeChip = place && (
    <p className="flex max-w-full items-start gap-1.5 rounded-[18px] bg-ink px-4 py-1.5 text-[14px] leading-snug font-bold">
      <Icon name="pin" size={15} className="mt-0.5 shrink-0" />
      <span className="line-clamp-2">
        {place}
        {nearby.length > 0 && <span className="text-white/60"> · {t.near}: {nearby.join(', ')}</span>}
      </span>
    </p>
  )

  // Tocar el código abre el menú de compartir del móvil con la invitación (texto + código + enlace)
  const copy = async () => {
    if ((await shareInvite(room.code, t.inviteText(room.code))) === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  /** Código en fichas grandes: tocarlo comparte la invitación. */
  const codeButton = (
    <button onClick={() => void copy()} aria-label={t.copyLink} className="flex items-center gap-2 active:scale-95">
      {room.code.split('').map((l, i) => (
        <span key={i} className="flex h-[52px] w-[44px] items-center justify-center rounded-[14px] bg-white text-[28px] font-black text-ink">
          {l}
        </span>
      ))}
      <span className={`flex size-[44px] items-center justify-center rounded-full transition-colors ${copied ? 'bg-good' : 'bg-white/18'}`}>
        <Icon name={copied ? 'check' : 'share'} size={20} />
      </span>
    </button>
  )

  return (
    <Screen className="relative">
      {confirmLeave && (
        <ConfirmDialog
          title={t.leaveTitle}
          body={t.leaveBody}
          cancel={t.leaveStay}
          confirm={t.leaveConfirm}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => void game.leave()}
        />
      )}
      {kickTarget && (
        <ConfirmDialog
          title={t.kickTitle(kickTarget.name)}
          body={t.kickBody}
          cancel={t.kickNo}
          confirm={t.kickYes}
          onCancel={() => setKickTarget(null)}
          onConfirm={() => {
            void game.kick(kickTarget.id)
            setKickTarget(null)
          }}
        />
      )}
      {/* Sin cabecera: atrás e idioma flotando arriba */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <button
          onClick={() => setConfirmLeave(true)}
          aria-label={t.leaveRoom}
          className="flex size-[44px] items-center justify-center rounded-full bg-white/18 active:scale-90"
        >
          <Icon name="arrowLeft" size={22} />
        </button>
        <div className="flex items-center gap-2">
          <LangToggle />
          <SettingsGear onRed />
        </div>
      </div>

      {/* Zona central con UN solo scroll (QR/bienvenida + jugadores). Antes la lista tenía su propio scroll y en
          móviles bajos se quedaba con altura ~0 entre el QR y el botón: no se veía nadie ni se podía deslizar. */}
      <div className="flex min-h-0 flex-1 touch-pan-y flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-2 pb-3 [-webkit-overflow-scrolling:touch]">
        <PendingRequests />
        {me.isHost ? (
          <div className="flex shrink-0 flex-col items-center gap-3">
            <QR code={room.code} size={150} />
            {codeButton}
            {copied && <p className="-mt-1 animate-pop text-[14px] font-bold">{t.linkCopied}</p>}
            {situation && (
              <p className="line-clamp-2 max-w-full rounded-[18px] bg-white/15 px-4 py-1.5 text-center text-[14px] font-bold">“{situation}”</p>
            )}
            {placeChip}
            {room.mimic && <p className="rounded-full bg-ink px-4 py-1.5 text-[14px] font-bold">{t.aiHiding}</p>}
          </div>
        ) : (
          /* Invitado: bienvenida en grande en vez del QR */
          <div className="flex shrink-0 flex-col items-center gap-3 text-center">
            <div className="relative animate-pop">
              <Avatar player={me} size={84} ring />
              <span className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-good text-white ring-[3px] ring-brand">
                <Icon name="check" size={18} />
              </span>
            </div>
            <h1 className="animate-pop text-[38px] leading-none font-black tracking-[-0.03em]" style={{ animationDelay: '0.15s' }}>
              {t.youreIn(me.name)}
            </h1>
            <p className="text-[17px] font-semibold text-white/85">{host ? t.hostsRoom(host.name) : ''}</p>
            {situation && (
              <p className="line-clamp-2 max-w-full rounded-[18px] bg-white/15 px-4 py-1.5 text-[14px] font-bold">“{situation}”</p>
            )}
            {placeChip}
            {room.mimic && <p className="rounded-full bg-ink px-4 py-1.5 text-[14px] font-bold">{t.aiHiding}</p>}
          </div>
        )}

        <div className="flex shrink-0 flex-col gap-2.5">
          <div className="flex shrink-0 items-center justify-between px-1">
            <Eyebrow>{t.players(room.players.length)}</Eyebrow>
            <div className="flex -space-x-2">
              {room.players.slice(0, 6).map((p) => (
                <Avatar key={p.id} player={p} size={24} ring />
              ))}
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {room.players.map((p) => (
              <li key={p.id} className="animate-rise">
                <Row className={`min-h-[60px] ${p.id === me.id && !me.isHost ? 'outline-[3px] outline-ink outline-solid' : ''}`}>
                  <Avatar player={p} />
                  <span className="flex-1 truncate text-[19px] font-semibold">
                    {p.name}
                    {p.id === me.id && <span className="text-neutral-400"> ({t.youLower})</span>}
                  </span>
                  {p.isHost && <span className="text-[15px] text-neutral-400">{t.hostTag}</span>}
                  {/* El host puede echar a alguien: la ✕ abre "¿Echar a X?" */}
                  {me.isHost && p.id !== me.id && (
                    <button
                      onClick={() => setKickTarget({ id: p.id, name: p.name })}
                      aria-label={t.kick(p.name)}
                      className="-mr-1 flex size-[44px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition active:scale-90 active:bg-brand active:text-white"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  )}
                </Row>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {me.isHost ? (
        <Footer>
          {error && <p className="text-center text-[15px] font-bold">{error}</p>}
          <Button disabled={missing > 0} onClick={() => void game.startGame()}>
            {missing > 0 ? t.needMore(missing) : t.startGame}
          </Button>
        </Footer>
      ) : (
        // El panda solo habla entre rondas (Leaderboard); aquí solo el mensaje de espera
        <Footer>
          <p className="rounded-[22px] bg-ink px-5 py-3.5 text-center text-[16px] leading-snug font-extrabold text-white">
            {missing > 0 ? t.needMorePanda(missing) : t.waitingPanda(host?.name ?? t.theHost)}
          </p>
        </Footer>
      )}
    </Screen>
  )
}
