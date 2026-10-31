// Outside the List (DLC 2, "명단 밖의 사람들"): opened by the first escape, entered from one Act 2 event. Three Relay fights
// (a unit on the dashed tile takes direct hits meant for the citizen, enemy included) take the place of that act's next
// plain fights, and the scene below takes the place of its last safehouse, paying what that rest would have. No new
// enemies, cards or currency: the point is the push that keeps someone's evening going.
import type { EncounterDef, EventDef, Pos, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })
const at = (x: number, y: number): Pos => ({ x, y })
const foe = (id: string, x: number, y: number): { id: string; pos: Pos } => ({ id, pos: at(x, y) })
const cover = (x: number, y: number): { pos: Pos; kind: 'cover' } => ({ pos: at(x, y), kind: 'cover' })

export const OUTSIDE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'outside_serving',
    act: 2,
    kind: 'normal',
    secret: true,
    name: t('마지막 배식', 'Last Serving'),
    backdrop: 'undercity',
    enemies: [foe('purge_drone', 5, 1), foe('shock_trooper', 6, 3)],
    terrain: [cover(3, 1), cover(3, 3)],
    neutral: { name: t('배식 담당', 'The Server'), sprite: 'listed-citizen', hp: 14, pos: at(2, 2) },
    relay: at(3, 2),
    next: 'outside_pickup',
    bonus: { kind: 'protect' },
    intro: t(
      '배식 담당은 국자를 놓지 않는다. 점선 칸에 선 누군가가 대신 맞는다. 적을 밀어 넣어도 된다.',
      'The server will not put the ladle down. Whoever stands on the dashed tile takes the hit instead. Push an enemy in, if you can.',
    ),
  },
  {
    id: 'outside_pickup',
    act: 2,
    kind: 'normal',
    secret: true,
    name: t('수거 종료', 'Last Pickup'),
    backdrop: 'undercity',
    enemies: [foe('shock_trooper', 5, 2), foe('purge_drone', 6, 0), foe('glitch_echo', 4, 4)],
    terrain: [cover(2, 0), cover(3, 3)],
    neutral: { name: t('세탁물 수거원', 'The Laundry Runner'), sprite: 'listed-citizen', hp: 12, pos: at(1, 1) },
    relay: at(2, 1),
    next: 'outside_door',
    reinforcements: [{ turn: 3, enemies: [foe('purge_drone', 6, 4)] }],
    bonus: { kind: 'protect' },
    intro: t(
      '수거원이 장치를 끄기 전에는 자리를 뜨지 않는다. 오늘 치 빨래가 아직 남았다.',
      'The runner will not leave until the machine is off. Tonight’s load is not done.',
    ),
  },
  {
    id: 'outside_door',
    act: 2,
    kind: 'normal',
    secret: true,
    name: t('문을 잡는 사람', 'Holding the Door'),
    backdrop: 'undercity',
    enemies: [foe('purge_drone', 5, 1), foe('purge_drone', 5, 3), foe('shock_trooper', 6, 2)],
    terrain: [cover(3, 1), cover(3, 4)],
    neutral: { name: t('문지기', 'The Doorkeeper'), sprite: 'listed-citizen', hp: 16, pos: at(2, 3) },
    relay: at(3, 3),
    reinforcements: [{ turn: 3, enemies: [foe('glitch_echo', 6, 4)] }],
    bonus: { kind: 'protect' },
    intro: t(
      '다들 나갈 때까지 문은 그 사람 손에 있다. 관리망은 그 손부터 지우려 한다.',
      'The door stays in their hands until everyone is out. The grid means to erase the hands first.',
    ),
  },
]

export const OUTSIDE_EVENTS: EventDef[] = [
  {
    id: 'outside_closing',
    acts: [2],
    weight: 0, // placed by the engine (run.ts placeOutside): rolling it would reshuffle every fresh run's events
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
        hint: t('이번 막의 전투 3회가 바뀐다', 'Changes this act’s next 3 fights'),
        success: {
          text: t(
            '멀리서 수거 드론이 방향을 튼다. 국자를 든 사람이 말한다. “오늘 배식은 끝내고 갈 거예요.” 다음 싸움은 여기서 벌어진다.',
            'Far off, a purge drone changes course. The one with the ladle says, “I am finishing tonight’s serving before I go.” The next fight happens here.',
          ),
          effects: [{ kind: 'flag', key: 'outside' }],
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
          effects: [{ kind: 'hp', amount: 10 }],
        },
      },
      {
        label: t('뒤에 올 사람에게 남겨 둔다', 'Leave it for whoever comes next'),
        hint: t('−5 추적', '−5 Trace'),
        success: {
          text: t('뚜껑을 도로 덮는다. 쪽지 아래에 자리 번호 하나를 적어 두고 골목을 뜬다.', 'You close the lid, write a shelter number under the note, and leave the alley.'),
          effects: [{ kind: 'trace', amount: -5 }],
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
          effects: [{ kind: 'hp', amount: 10 }],
        },
      },
      {
        label: t('냄비를 불에서 내려 둔다', 'Take the pot off the heat'),
        hint: t('−5 추적', '−5 Trace'),
        success: {
          text: t('불을 끄고 뚜껑을 고쳐 덮는다. 내일 누가 오든 쓸 수 있게 해 두고 골목을 뜬다.', 'You turn the heat off, set the lid straight so whoever comes tomorrow can use it, and leave the alley.'),
          effects: [{ kind: 'trace', amount: -5 }],
        },
      },
    ],
  },
]
