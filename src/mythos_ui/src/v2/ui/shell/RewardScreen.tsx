// Mythos 2.0 — post-combat rewards (credits, card picks, implant, consumable) and the standalone card_reward screen.
import { art } from '../components/art.ts'
import { Coins, Layers, Package, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { BACKDROPS } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { CardChoice } from '../components/CardChoice.tsx'
import { ImplantSetNote } from '../components/ImplantSetNote.tsx'
import { ImplantIcon } from '../components/ImplantIcon.tsx'
import { sound } from '../components/sound.ts'
import { lastAct } from '../../engine/run.ts'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './reward.css'

export function RewardScreen({ run, C, lang, settings, act }: ScreenProps) {
  const [openGroup, setOpenGroup] = useState<number | null>(null)
  const [flashImplant, setFlashImplant] = useState<string | null>(null)
  if (run.screen.kind !== 'reward') return null
  const reward = run.screen.reward
  const ko = lang === 'ko'
  const elite = reward.implantChoices.length > 0
  let row = 0
  const delay = () => ({ animationDelay: `${(row++ * (settings.fastAnim ? 40 : 110)).toString()}ms` })

  const group = openGroup !== null ? reward.cardChoices[openGroup] : undefined
  const node = run.nodeId ? run.map.nodes[run.nodeId] : undefined
  const enc = node?.encounterId ? C.encounters[node.encounterId] : undefined
  const backdrop = enc ? BACKDROPS[enc.backdrop] : undefined
  // After a boss the button leads to the next act (or the final choice), not back to this act's map.
  const afterBoss = !!run.nodeId && run.nodeId === run.map.bossId
  const onwardLabel = !afterBoss
    ? ko
      ? '지도로'
      : 'To the map'
    : run.act < lastAct(run, C)
      ? ko
        ? `${run.act + 1}막으로`
        : `On to Act ${run.act + 1}`
      : ko
        ? '마지막 선택으로'
        : 'To the final choice'
  const allTaken =
    (reward.credits <= 0 || reward.taken.credits) &&
    reward.cardChoices.every((_, i) => reward.taken.cards[i]) &&
    (reward.implantChoices.length === 0 || reward.taken.implant) &&
    (!reward.consumable || reward.taken.consumable)

  return (
    <div className="m2-reward">
      {backdrop && <div className="m2-reward__bg" style={{ backgroundImage: `url(${backdrop})` }} />}
      <div className="m2-reward__glow" />
      <div className="m2-reward__panel">
        <div className="m2-reward__kicker">{enc ? tr(enc.name, lang) : ko ? '교전 종료' : 'Fight won'}</div>
        <h1 className="m2-reward__title">
          {afterBoss
            ? ko
              ? '격파'
              : 'Boss down'
            : elite
              ? ko
                ? '전리품'
                : 'Spoils'
              : enc?.objective?.kind === 'survive'
                ? ko
                  ? '버텨 냈다'
                  : 'Held the line'
                : ko
                  ? '제압 완료'
                  : 'Area secured'}
        </h1>

        <div className="m2-reward__list">
          {reward.credits > 0 && (
            <button
              className={`m2-rrow${reward.taken.credits ? ' is-taken' : ''}`}
              style={delay()}
              disabled={reward.taken.credits}
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => {
                sound('coin', { intensity: 1.2 })
                act(rx.takeCredits(run, C))
              }}
            >
              <span className="m2-rrow__ico m2-rrow__ico--gold">
                <Coins size={20} />
              </span>
              <span className="m2-rrow__label">
                <b className="m2-mono">+{reward.credits} ₵</b>
              </span>
              <span className="m2-rrow__state">{reward.taken.credits ? (ko ? '획득' : 'Taken') : ko ? '받기' : 'Take'}</span>
            </button>
          )}

          {reward.cardChoices.map((choices, gi) => (
            <button
              key={gi}
              className={`m2-rrow${reward.taken.cards[gi] ? ' is-taken' : ''}`}
              style={delay()}
              disabled={reward.taken.cards[gi]}
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => {
                sound('ui_click')
                setOpenGroup(gi)
              }}
            >
              <span className="m2-rrow__ico">
                <Layers size={20} />
              </span>
              <span className="m2-rrow__label">
                {ko ? '프로토콜 하나를 덱에 추가' : 'Add a protocol to your deck'}
                {/* A second card group only comes from a met bonus objective (engine/run.ts buildReward). */}
                <small>
                  {gi > 0 && <span className="m2-rrow__bonus">{ko ? '★ 보너스 목표 달성 · ' : '★ Bonus objective · '}</span>}
                  {ko ? `${choices.length}장 중 1장` : `1 of ${choices.length}`}
                </small>
              </span>
              <span className="m2-rrow__state">{reward.taken.cards[gi] ? (ko ? '완료' : 'Done') : ko ? '고르기' : 'Choose'}</span>
            </button>
          ))}

          {reward.implantChoices.length === 1 &&
            reward.implantChoices.map((id) => {
              const def = C.implants[id]
              if (!def) return null
              return (
                <button
                  key={id}
                  className={`m2-rrow m2-rrow--implant${reward.taken.implant ? ' is-taken' : ''}`}
                  style={delay()}
                  disabled={reward.taken.implant}
                  onMouseEnter={() => sound('ui_hover')}
                  onClick={() => {
                    sound('rare')
                    setFlashImplant(id)
                    act(rx.takeImplant(run, id, C))
                  }}
                >
                  <span className="m2-rrow__ico m2-rrow__ico--implant">
                    <ImplantIcon def={def} lang={lang} size={40} noTip flash={flashImplant === id} />
                  </span>
                  <span className="m2-rrow__label">
                    {tr(def.name, lang)}
                    <small>{tr(def.text, lang)}</small>
                    <ImplantSetNote implantId={id} owned={run.implants} lang={lang} />
                  </span>
                  <span className="m2-rrow__state">{reward.taken.implant ? (ko ? '완료' : 'Installed') : ko ? '장착' : 'Install'}</span>
                </button>
              )
            })}

          {reward.implantChoices.length > 1 && (
            <div className="m2-rpick" style={delay()}>
              {reward.noisePaid && <div className="m2-rpick__note">{ko ? '잡음이 걷히고 무언가 손에 남았다.' : 'The noise clears. Something stays in your hand.'}</div>}
              <div className="m2-rpick__head">
                <Sparkles size={15} /> {reward.taken.implant ? (ko ? '임플란트 장착 완료' : 'Implant installed') : ko ? '임플란트 하나를 고른다' : 'Choose one implant'}
              </div>
              <div className="m2-rpick__row">
                {reward.implantChoices.map((id) => {
                  const def = C.implants[id]
                  if (!def) return null
                  const mine = reward.taken.implant && run.implants.includes(id)
                  return (
                    <button
                      key={id}
                      className={`m2-rpick__opt${mine ? ' is-mine' : ''}`}
                      disabled={reward.taken.implant}
                      onMouseEnter={() => sound('ui_hover')}
                      onClick={() => {
                        sound('rare')
                        setFlashImplant(id)
                        act(rx.takeImplant(run, id, C))
                      }}
                    >
                      <ImplantIcon def={def} lang={lang} size={52} noTip flash={flashImplant === id} />
                      <b>{tr(def.name, lang)}</b>
                      <small>{tr(def.text, lang)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {reward.consumable &&
            (() => {
              const def = C.consumables[reward.consumable]
              if (!def) return null
              const full = run.consumables.length >= 3 && !reward.taken.consumable
              return (
                <button
                  className={`m2-rrow${reward.taken.consumable ? ' is-taken' : ''}`}
                  style={delay()}
                  disabled={reward.taken.consumable || full}
                  onMouseEnter={() => sound('ui_hover')}
                  onClick={() => {
                    sound('reward')
                    act(rx.takeConsumable(run, C))
                  }}
                >
                  <span className="m2-rrow__ico m2-rrow__ico--img">
                    <img src={art.consumable(def.id, def.icon)} alt="" />
                  </span>
                  <span className="m2-rrow__label">
                    {tr(def.name, lang)}
                    <small>{full ? (ko ? '소모품 칸이 가득 찼다 (최대 3)' : 'Consumable slots full (max 3)') : tr(def.text, lang)}</small>
                  </span>
                  <span className="m2-rrow__state">{reward.taken.consumable ? (ko ? '획득' : 'Taken') : ko ? '받기' : 'Take'}</span>
                </button>
              )
            })()}

          {reward.echoes > 0 && (
            <div className="m2-rrow m2-rrow--echo" style={delay()}>
              <span className="m2-rrow__ico m2-rrow__ico--echo">◈</span>
              <span className="m2-rrow__label">
                <b className="m2-mono">+{reward.echoes}</b> {ko ? '에코 — 루프가 끝나도 남는다' : 'Echoes — kept after the loop ends'}
              </span>
            </div>
          )}
        </div>

        <div className="m2-reward__foot">
          <button
            className={`m2-btn ${allTaken ? 'm2-btn--primary' : 'm2-btn--ghost'} m2-btn--lg`}
            onClick={() => {
              sound('transition')
              act(rx.leaveReward(run, C))
            }}
          >
            <Package size={17} />
            {allTaken ? onwardLabel : ko ? '남은 보상 두고 떠나기' : 'Leave the rest'}
          </button>
        </div>
      </div>

      {group && openGroup !== null && (
        <div className="m2-overlay">
          <CardChoice
            choices={group}
            C={C}
            lang={lang}
            fast={settings.fastAnim}
            title={ko ? '덱에 추가할 프로토콜' : 'Add a protocol'}
            onPick={(id) => {
              act(rx.takeCard(run, openGroup, id, C))
              setOpenGroup(null)
            }}
            onSkip={() => setOpenGroup(null)}
            skipLabel={ko ? '나중에' : 'Not now'}
          />
        </div>
      )}
    </div>
  )
}

/** Standalone "choose a card" screen (events / treasure): returns to `returnTo` via the engine. */
export function CardRewardScreen({ run, C, lang, settings, act }: ScreenProps) {
  if (run.screen.kind !== 'card_reward') return null
  const ko = lang === 'ko'
  return (
    <div className="m2-reward m2-reward--cards">
      <div className="m2-reward__glow" />
      <CardChoice
        choices={run.screen.choices}
        C={C}
        lang={lang}
        fast={settings.fastAnim}
        title={ko ? '프로토콜 하나를 덱에 추가' : 'Add a protocol to your deck'}
        onPick={(id) => act(rx.chooseCardReward(run, id, C))}
        onSkip={() => act(rx.chooseCardReward(run, null, C))}
      />
    </div>
  )
}
