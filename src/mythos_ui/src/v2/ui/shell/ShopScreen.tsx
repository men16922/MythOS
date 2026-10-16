// Mythos 2.0 — black market: cards, implants, consumables, and services (remove / heal / scrub).
import { art } from '../components/art.ts'
import { Eraser, HeartPulse, Scissors } from 'lucide-react'
import { useState } from 'react'
import { asset } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { CardView } from '../components/CardView.tsx'
import { ImplantSetNote } from '../components/ImplantSetNote.tsx'
import { ImplantIcon } from '../components/ImplantIcon.tsx'
import { sound } from '../components/sound.ts'
import { Tooltip } from '../components/Tooltip.tsx'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './shop.css'

function Price({ value, credits }: { value: number; credits: number }) {
  return <span className={`m2-price m2-mono${credits < value ? ' is-short' : ''}`}>{value} ₵</span>
}

const SHOP_PLACE: Record<number, { ko: string; en: string; bg: string }> = {
  1: { ko: 'C-17 뒷골목 좌판', en: 'C-17 back-alley stall', bg: 'scenes/wet_dawn_street.png' },
  2: { ko: '야시장 뒷골목', en: 'Back alley, night market', bg: 'scenes/night_market.png' },
  3: { ko: '첨탑 하층 · 유령 단말', en: 'Spire underlevel, ghost terminal', bg: 'scenes/control_grid_ghost.png' },
}

export function ShopScreen({ run, C, lang, act }: ScreenProps) {
  const [bought, setBought] = useState<string | null>(null)
  if (run.screen.kind !== 'shop') return null
  const stock = run.screen.stock
  const ko = lang === 'ko'
  const credits = run.credits
  // The market moves with the act (it read "night market" inside the ARK Spire).
  const place = SHOP_PLACE[run.act] ?? SHOP_PLACE[2]!
  // Service previews come from the engine reducers themselves (run with unlimited credits), so the
  // numbers shown are exactly what the purchase does — no duplicated constants.
  const rich = { ...run, credits: Number.MAX_SAFE_INTEGER }
  const healed = rx.shopHeal(rich, C)
  const crewBefore = rx.roster(run)
  const healGain = healed === rich ? 0 : healed.hp - run.hp + rx.roster(healed).reduce((sum, m) => sum + m.hp - (crewBefore.find((b) => b.id === m.id)?.hp ?? m.hp), 0)
  const scrubbed = rx.shopScrub(rich, C)
  const scrubDrop = scrubbed === rich ? 0 : run.trace - scrubbed.trace

  const buy = (key: string, price: number, next: () => ReturnType<typeof rx.buyCard>) => {
    if (credits < price) {
      sound('error')
      return
    }
    sound('buy')
    setBought(key)
    act(next())
  }

  return (
    <div className="m2-shop">
      <div className="m2-shop__bg" style={{ backgroundImage: `url(${asset(place.bg)})` }} />
      <div className="m2-shop__inner">
        <header className="m2-shop__head">
          <div>
            <div className="m2-shop__kicker">{ko ? place.ko : place.en}</div>
            <h1 className="m2-shop__title">{ko ? '암시장' : 'Black Market'}</h1>
          </div>
          <div className="m2-shop__wallet">
            <span>{ko ? '보유' : 'You have'}</span>
            <b className="m2-mono">{credits} ₵</b>
          </div>
        </header>

        <section className="m2-shop__cards">
          {stock.cards.map((s, i) => {
            const def = C.cards[s.cardId]
            if (!def) return null
            const key = `c${i}`
            return (
              <div key={key} className={`m2-shop__item${s.sold ? ' is-sold' : ''}${bought === key ? ' is-bought' : ''}`}>
                <CardView
                  def={def}
                  upgraded={false}
                  lang={lang}
                  size="md"
                  playable={!s.sold}
                  onClick={s.sold ? undefined : () => buy(key, s.price, () => rx.buyCard(run, i, C))}
                  onMouseEnter={() => !s.sold && sound('card_hover')}
                />
                {s.sold ? <span className="m2-price is-sold">{ko ? '판매됨' : 'Sold'}</span> : <Price value={s.price} credits={credits} />}
              </div>
            )
          })}
        </section>

        <div className="m2-shop__lower">
          <section className="m2-shop__shelf">
            <h2>{ko ? '임플란트' : 'Implants'}</h2>
            <div className="m2-shop__row">
              {stock.implants.map((s, i) => {
                const def = C.implants[s.implantId]
                if (!def) return null
                const key = `i${i}`
                return (
                  <Tooltip
                    key={key}
                    content={
                      <div>
                        <div className="m2-tip__title">{tr(def.name, lang)}</div>
                        <div className="m2-tip__text">{tr(def.text, lang)}</div>
                        <ImplantSetNote implantId={def.id} owned={run.implants} lang={lang} />
                      </div>
                    }
                  >
                    <button
                      className={`m2-shop__good${s.sold ? ' is-sold' : ''}${bought === key ? ' is-bought' : ''}`}
                      disabled={s.sold}
                      onMouseEnter={() => sound('ui_hover')}
                      onClick={() => buy(key, s.price, () => rx.buyImplant(run, i, C))}
                    >
                      <ImplantIcon def={def} lang={lang} size={56} noTip flash={bought === key} />
                      <span className="m2-shop__goodname">{tr(def.name, lang)}</span>
                      {s.sold ? <span className="m2-price is-sold">{ko ? '판매됨' : 'Sold'}</span> : <Price value={s.price} credits={credits} />}
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          </section>

          <section className="m2-shop__shelf">
            <h2>{ko ? '소모품' : 'Consumables'}</h2>
            <div className="m2-shop__row">
              {stock.consumables.map((s, i) => {
                const def = C.consumables[s.id]
                if (!def) return null
                const key = `k${i}`
                const full = run.consumables.length >= 3
                return (
                  <Tooltip
                    key={key}
                    content={
                      <div>
                        <div className="m2-tip__title">{tr(def.name, lang)}</div>
                        <div className="m2-tip__text">{tr(def.text, lang)}</div>
                        {full && !s.sold && (
                          <div className="m2-tip__text" style={{ color: 'var(--m2-amber)' }}>
                            {ko ? '소모품 칸이 가득 찼다' : 'Consumable slots are full'}
                          </div>
                        )}
                      </div>
                    }
                  >
                    <button
                      className={`m2-shop__good${s.sold ? ' is-sold' : ''}${bought === key ? ' is-bought' : ''}`}
                      disabled={s.sold}
                      onMouseEnter={() => sound('ui_hover')}
                      onClick={() => (full ? sound('error') : buy(key, s.price, () => rx.buyConsumable(run, i, C)))}
                    >
                      <span className="m2-shop__consimg">
                        <img src={art.consumable(def.id, def.icon)} alt="" />
                      </span>
                      <span className="m2-shop__goodname">{tr(def.name, lang)}</span>
                      {s.sold ? <span className="m2-price is-sold">{ko ? '판매됨' : 'Sold'}</span> : <Price value={s.price} credits={credits} />}
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          </section>

          <section className="m2-shop__shelf m2-shop__services">
            <h2>{ko ? '서비스' : 'Services'}</h2>
            <button
              className="m2-service"
              disabled={stock.removeUsed}
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => buy('remove', stock.removePrice, () => rx.shopRemove(run, C))}
            >
              <Scissors size={18} />
              <span>
                <b>{ko ? '카드 제거' : 'Remove a card'}</b>
                <small>{stock.removeUsed ? (ko ? '이번 방문에 이미 사용' : 'Used this visit') : ko ? '덱에서 한 장을 영구히 지운다' : 'Delete one card from your deck'}</small>
              </span>
              {!stock.removeUsed && <Price value={stock.removePrice} credits={credits} />}
            </button>
            <button
              className="m2-service"
              disabled={healGain <= 0}
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => {
                if (credits >= stock.healPrice) sound('heal')
                buy('heal', stock.healPrice, () => rx.shopHeal(run, C))
              }}
            >
              <HeartPulse size={18} />
              <span>
                <b>{ko ? '응급 처치' : 'Patch up'}</b>
                <small>
                  {healGain <= 0
                    ? ko
                      ? '모두 최대 체력'
                      : 'Everyone is at full HP'
                    : ko
                      ? `파티 전원 회복 · 합계 +${healGain} HP`
                      : `Heals the whole party · +${healGain} HP total`}
                </small>
              </span>
              <Price value={stock.healPrice} credits={credits} />
            </button>
            <button
              className="m2-service"
              disabled={scrubDrop <= 0}
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => buy('scrub', stock.scrubPrice, () => rx.shopScrub(run, C))}
            >
              <Eraser size={18} />
              <span>
                <b>{ko ? '흔적 세탁' : 'Scrub Trace'}</b>
                <small>
                  {scrubDrop <= 0
                    ? ko
                      ? '지울 추적 기록이 없다'
                      : 'No Trace to wipe'
                    : ko
                      ? `IX의 추적 기록을 지운다 · 추적 −${scrubDrop}`
                      : `Wipe IX’s record of you · −${scrubDrop} Trace`}
                </small>
              </span>
              <Price value={stock.scrubPrice} credits={credits} />
            </button>
          </section>
        </div>

        <footer className="m2-shop__foot">
          <button
            className="m2-btn m2-btn--lg"
            onClick={() => {
              sound('transition')
              act(rx.leaveShop(run, C))
            }}
          >
            {ko ? '떠난다' : 'Leave'}
          </button>
        </footer>
      </div>
    </div>
  )
}
