// Pack 4 — the three scripted scenes of Outside the List: the choice before Act 2's title and the two endings that take
// the place of its first safehouse, paying what that rest would have. Losing someone is never a numeric penalty.
import type { EventDef, Text } from '../../../engine/types.ts'
import { OUTSIDE_ROUTE } from './act.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const OUTSIDE_EVENTS: EventDef[] = [
  {
    id: 'outside_closing',
    acts: [2],
    weight: 0, // opened by the engine as Act 2 begins (run.ts advanceAct), never rolled
    improvise: false,
    requires: { opened: 'outside_open', notFlag: 'outside' },
    gmHints: ['구역 영업 종료 방송', '명단에 없는 사람들의 배식 줄', '국자를 놓지 않는 배식 담당'],
    title: t('영업 종료', 'Closing Time'),
    image: 'v2/events/outside_closing.webp',
    text: t(
      '스피커가 구역 영업 종료를 방송한다. 명단에 없는 사람은 이 시간 이후 존재하지 않는다는 뜻이다.\n골목 안쪽 배식대에는 아직 줄이 있다. 국자를 든 사람이 스피커를 한 번 보고, 다시 국을 푼다.',
      'The speakers announce closing time for the block. After this hour, anyone not on the list does not exist.\nThere is still a line at the serving counter down the alley. The one holding the ladle glances at the speaker, then goes back to serving.',
    ),
    options: [
      {
        label: t('배식대 앞에 선다', 'Stand at the counter'),
        hint: t('2막이 「명단 밖의 사람들」로 바뀐다', 'Act 2 becomes Outside the List'),
        success: {
          text: t(
            '멀리서 수거 드론이 방향을 튼다. 국자를 든 사람이 말한다. “오늘 배식은 끝내고 갈 거예요.” 다음 싸움은 여기서 벌어진다.',
            'Far off, a purge drone changes course. The one with the ladle says, “I am finishing tonight’s serving before I go.” The next fight happens here.',
          ),
          effects: [{ kind: 'flag', key: 'outside' }, { kind: 'route', id: OUTSIDE_ROUTE }],
        },
      },
      {
        label: t('줄을 지나친다', 'Walk past the line'),
        hint: t('+20 ₵', '+20 ₵'),
        success: {
          text: t(
            '바닥에 떨어진 크레딧 칩을 줍는다. 뒤에서 국자가 냄비에 부딪히는 소리가 한동안 들린다.',
            'You pick a credit chip off the ground. Behind you, a ladle knocks against a pot for a while longer.',
          ),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
    ],
  },
  {
    id: 'outside_last_meal_kept',
    acts: [2],
    weight: 0,
    title: t('한 그릇', 'One Bowl'),
    gmHints: ['닫힌 배식대에 남은 도시락', '내일도 연다는 쪽지'],
    image: 'v2/events/outside_last_meal_kept.webp',
    improvise: false,
    text: t(
      '은신처로 가는 길, 닫힌 배식대 위에 도시락 하나가 남아 있다. 쪽지가 끼워져 있다.\n“내일도 엽니다. 명단에는 없어도 줄은 있으니까요.”',
      'On the way to the safehouse, one lunch box sits on the closed counter with a note tucked under it.\n“Open again tomorrow. The list may not have us, but the line does.”',
    ),
    options: [
      {
        label: t('뚜껑을 연다', 'Open it'),
        hint: t('+10 HP', '+10 HP'),
        success: {
          text: t('아직 따뜻하다. 다 먹고 나서야 손이 떨리는 것을 멈춘다.', 'Still warm. Only when it is gone do your hands stop shaking.'),
          effects: [{ kind: 'hp', amount: 10 }, { kind: 'flag', key: 'outside_kept' }],
        },
      },
      {
        label: t('뒤에 올 사람에게 남겨 둔다', 'Leave it for whoever comes next'),
        hint: t('−5 추적', '−5 Trace'),
        success: {
          text: t('뚜껑을 도로 덮는다. 쪽지 아래에 자리 번호 하나를 적어 두고 골목을 뜬다.', 'You close the lid, write a shelter number under the note, and leave the alley.'),
          effects: [{ kind: 'trace', amount: -5 }, { kind: 'flag', key: 'outside_kept' }],
        },
      },
    ],
  },
  {
    id: 'outside_last_meal_lost',
    acts: [2],
    weight: 0,
    title: t('닫힌 배식대', 'The Closed Counter'),
    gmHints: ['덮인 냄비와 닦인 국자', '내일 올지 모르는 사람'],
    image: 'v2/events/outside_last_meal_lost.webp',
    improvise: false,
    text: t(
      '은신처로 가는 길, 배식대에는 뚜껑 덮인 냄비만 남아 있다. 국자는 깨끗이 닦여 걸려 있다.\n누가 닦았는지는 모른다. 그 사람이 내일 올지도 모른다.',
      'On the way to the safehouse, only a covered pot is left on the counter. The ladle hangs washed and clean.\nYou do not know who washed it. You do not know whether they will come tomorrow.',
    ),
    options: [
      {
        label: t('남은 국을 뜬다', 'Take what is left'),
        hint: t('+10 HP', '+10 HP'),
        success: {
          text: t('식었지만 먹는다. 국자는 닦아서 도로 걸어 둔다.', 'It is cold. You eat it anyway, then wash the ladle and hang it back up.'),
          effects: [{ kind: 'hp', amount: 10 }, { kind: 'flag', key: 'outside_gone' }],
        },
      },
      {
        label: t('냄비를 불에서 내려 둔다', 'Take the pot off the heat'),
        hint: t('−5 추적', '−5 Trace'),
        success: {
          text: t('불을 끄고 뚜껑을 고쳐 덮는다. 내일 누가 오든 쓸 수 있게 해 두고 골목을 뜬다.', 'You turn the heat off, set the lid straight so whoever comes tomorrow can use it, and leave the alley.'),
          effects: [{ kind: 'trace', amount: -5 }, { kind: 'flag', key: 'outside_gone' }],
        },
      },
    ],
  },
]
