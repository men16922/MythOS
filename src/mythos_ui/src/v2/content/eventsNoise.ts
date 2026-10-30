// Noise gates — a deal on the road: pay a little HP, carry an anomaly for three won fights, and the last of them
// also offers forbidden implants (boss-rarity rule breakers, engine/implantRules.ts). The engine fills the first
// option's hint with the mutator this act's gate brings (seeded, engine/mutators.ts noiseMutatorFor), and the scene
// gives way to another event while a gate is still open. Same rules as events.ts (enforced by narrative.test.ts).
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

/** Won fights a gate lasts. */
export const NOISE_FIGHTS = 3
/** HP paid at the gate. */
export const NOISE_HP = 6
/** Roll weight (other events weigh 1). */
export const NOISE_WEIGHT = 4

/** Replaced on screen by the engine with this act's actual mutator (run.ts noiseOption). */
const HINT = t('−6 HP · 변칙 3승 · 금지 임플란트', '−6 HP · 3-win anomaly · forbidden implant')

const decline = (ko: string, en: string, kText: string, eText: string) => ({
  label: t(ko, en),
  hint: t('잡음 없음 · +20 ₵', 'No noise · +20 ₵'),
  success: { text: t(kText, eText), effects: [{ kind: 'credits' as const, amount: 20 }] },
})

export const NOISE_GATES: EventDef[] = [
  {
    // ACTS 1–2 — the street: a dead relay still humming.
    id: 'noise_gate_street',
    acts: [1, 2],
    noise: true,
    weight: NOISE_WEIGHT,
    improvise: false,
    title: t('잡음 게이트', 'Noise Gate'),
    gmHints: ['a dead relay still hums', 'touching it bends the world for a while', 'a bargain with no clear price'],
    image: 'v2/events/noise_gate_street.webp',
    text: t(
      '철거된 중계기 하나가 아직 웅웅거린다. 금 간 외함 틈으로 파란 빛이 샌다. 손을 대면 신호가 팔을 타고 들어올 것이다.\n뜯어낸 사람들은 말했다. 며칠은 세상이 비틀려 보이지만, 끝나면 뭔가 손에 남는다고. 다만 뭐가 남는지는 아무도 고르지 못했다.',
      'A demolished relay is still humming. Blue light leaks through the crack in its casing. Touch it and the signal will climb your arm.\nThe ones who tore into it said the same thing: the world bends for a few days, and when it stops, something stays in your hand. None of them got to choose what.',
    ),
    options: [
      {
        label: t('외함에 손을 넣는다', 'Reach into the casing'),
        hint: HINT,
        success: {
          text: t(
            '이가 시리다. 시야 가장자리가 한 칸 어긋난 채 돌아오지 않는다. 이제 세 번은 이 상태로 싸워야 한다.',
            'Your teeth ache. The edge of your sight slips one tile and stays there. Three fights like this, now.',
          ),
          effects: [{ kind: 'hp', amount: -NOISE_HP }, { kind: 'noise', fights: NOISE_FIGHTS }],
        },
      },
      decline(
        '전원선만 뽑아 판다',
        'Just pull the power line and sell it',
        '구리선은 정직하다. 웅웅거림이 멎자 골목이 조금 어두워진다.',
        'Copper is honest. The humming stops, and the alley gets a little darker.',
      ),
    ],
  },
  {
    // ACTS 3–4 — the Spire and the Library: a gap in the record.
    id: 'noise_gate_record',
    acts: [3, 4],
    noise: true,
    weight: NOISE_WEIGHT,
    improvise: false,
    title: t('기록의 틈', 'A Gap in the Record'),
    gmHints: ['something erased knocks from behind a panel', 'the noise moves into whoever opens it', 'white corridor, thin wall'],
    image: 'v2/events/noise_gate_record.webp',
    text: t(
      '벽의 흰 패널 하나가 다른 패널보다 얇다. 두드리면 안쪽에서 누군가 같은 박자로 두드린다.\n관리망이 지운 것은 사라지지 않았다. 여기 눌려 있다. 열면 그 잡음이 당신에게 옮는다.',
      'One white panel is thinner than the rest. Knock, and someone inside knocks back in the same rhythm.\nWhat the grid erased never left. It was pressed in here. Open this, and the noise moves into you.',
    ),
    options: [
      {
        label: t('패널을 뜯는다', 'Pry the panel open'),
        hint: HINT,
        success: {
          text: t(
            '바람도 없이 귀가 먹먹해진다. 지워진 누군가의 습관이 손끝에 붙는다. 세 번의 싸움 동안 떨어지지 않을 것이다.',
            'Your ears close with no wind at all. Someone’s erased habit settles into your fingertips. It will not leave for three fights.',
          ),
          effects: [{ kind: 'hp', amount: -NOISE_HP }, { kind: 'noise', fights: NOISE_FIGHTS }],
        },
      },
      decline(
        '패널 뒤 배선만 빼 간다',
        'Take only the wiring behind it',
        '두드리는 소리가 잠시 따라오다 멎는다. 뒤돌아보지 않는다.',
        'The knocking follows for a while, then stops. You do not look back.',
      ),
    ],
  },
  {
    // ACTS 5–6 — the machines and the First Record: the signal under the signal.
    id: 'noise_gate_origin',
    acts: [5, 6],
    noise: true,
    weight: NOISE_WEIGHT,
    improvise: false,
    title: t('신호 아래의 신호', 'The Signal Under the Signal'),
    gmHints: ['a frequency the machines dreamed on', 'never made for a living body', 'scratches on the wall past reading'],
    image: 'v2/events/noise_gate_origin.webp',
    text: t(
      '바닥 아래로 또 하나의 박동이 지나간다. 기계들이 꿈을 꿀 때 쓰다 버린 주파수다. 살아 있는 몸에 맞게 만들어지지 않았다.\n그래도 받아 낸 사람은 있었다. 그 사람이 뭘 얻었는지는 이 층의 벽에 긁혀 있다. 읽을 수 없게.',
      'A second pulse passes under the floor, a frequency the machines dreamed on and threw away. It was never made for a living body.\nSomeone took it anyway. What they gained is scratched into the wall on this level, past reading.',
    ),
    options: [
      {
        label: t('박동에 맞춰 숨을 멈춘다', 'Hold your breath to the pulse'),
        hint: HINT,
        success: {
          text: t(
            '심장이 한 박 늦게 뛴다. 그다음부터 세상이 당신보다 한 박 늦다. 이 어긋남은 세 번 싸우는 동안 이어진다.',
            'Your heart beats one count late. After that the world runs one count behind you. It will last three fights.',
          ),
          effects: [{ kind: 'hp', amount: -NOISE_HP }, { kind: 'noise', fights: NOISE_FIGHTS }],
        },
      },
      decline(
        '주파수를 기록만 해 둔다',
        'Only log the frequency',
        '기록 칩 하나가 미지근해진다. 누군가 사겠지.',
        'A record chip goes lukewarm. Someone will buy it.',
      ),
    ],
  },
]
