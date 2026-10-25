// Act 2 — The Runner's Shortcut: Han's proposed route beneath the night market.
// q_shortcut: learn about the blind interval → cross and mark a usable exit (two visits).
// Yul starts the quest; Dami or Odo can prepare a safe crossing in a third visit.
// The hatch also has an unprepared free route with a trace cost. Han never plugs into the grid.
// Budget: 20 credits at Dami, one card pick at Odo; boss payoff = intel. All graphs are acyclic.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D2_RUNNER_SHORTCUT: DistrictDef = {
  id: 'd2_runner_shortcut',
  act: 2,
  name: t('러너의 지름길', 'The Runner’s Shortcut'),
  image: 'v2/districts/d2_runner_shortcut.webp',
  intro: t(
    '야시장 바닥 아래에서 손수레 바퀴 소리가 울린다. 천장에는 관리망 센서가 촘촘하지만, 기둥 하나에는 붉은 점이 닿지 않는다. 누군가 그 밑에 분필로 웃는 얼굴을 그려 놓는다.\n센서가 교정되기 전까지 세 군데를 살필 수 있다.',
    'Cart wheels rumble beneath the night market. Grid sensors crowd the ceiling, yet their red dots never touch one pillar. Someone has drawn a chalk smile beneath it.\nThere is time for three stops before the sensors recalibrate.',
  ),
  actions: 3,
  outro: t(
    '천장의 센서들이 동시에 고개를 돌린다. 위층 시장에서는 개점 종이 울린다. 당신은 다음 계단에서 신발의 분필 가루를 턴다.',
    'The ceiling sensors turn together. Opening bells ring in the market upstairs. At the next stairway, you brush chalk dust off your shoes.',
  ),
  pois: [
    { id: 'map', name: t('분필 지도', 'The Chalk Map'), blurb: t('지워지는 길을 그리는 사람.', 'A route that needs redrawing.'), dialogue: 'd2rs_yul' },
    { id: 'toll', name: t('손수레 계량대', 'The Cart Scales'), blurb: t('바퀴 수만큼 받는다.', 'Charged by the wheel.'), dialogue: 'd2rs_dami' },
    { id: 'relay', name: t('수동 계전함', 'The Manual Relay'), blurb: t('연결하지 않고 듣는 기술.', 'Listening without connecting.'), dialogue: 'd2rs_odo' },
    { id: 'hatch', name: t('센서 밑 샛문', 'The Hatch Beneath the Sensors'), blurb: t('사각에도 끝은 있다.', 'Even a blind spot has an edge.'), dialogue: 'd2rs_hatch' },
  ],
}

const YUL: DialogueDef = {
  id: 'd2rs_yul',
  npc: 'rs_yul',
  start: 'chalk',
  nodes: {
    chalk: {
      speaker: 'rs_yul',
      text: t(
        '율이 바닥에 분필 점을 찍는다. “여기서 저 기둥까지. 관리망이 두 센서의 장부를 합칠 때, 한쪽을 잠깐 안 봐.” 분필 끝이 부러진다. “한이 찾아낸 틈이지. 길로 쓸 수 있는지는 아직 몰라.”',
        'Yul dots the floor with chalk. “Here to that pillar. When the grid merges the two sensor logs, it stops looking at one side.” The chalk snaps. “Han found the gap. Nobody’s proved it’s a route yet.”',
      ),
      options: [
        {
          label: t('“출구까지 확인하고 표시를 남기죠.”', '“I’ll check the exit and mark it.”'),
          intent: 'offer',
          approval: { han: 1, se_rin: 1 },
          success: {
            text: t('율이 분필 반 토막을 건넨다. “안전한 데만 화살표. 막힌 데는 엑스.”', 'Yul hands you half the chalk. “Arrows only where it’s safe. Crosses for dead ends.”'),
            effects: [{ kind: 'quest', id: 'q_shortcut', stage: 1 }],
            goto: 'timing',
          },
        },
        {
          label: t('한에게 지름길을 직접 설명해 달라고 한다', 'Ask Han to explain his shortcut'),
          intent: 'ask',
          requires: { companion: 'han' },
          approval: { han: 2 },
          success: {
            text: t('한이 기둥 그늘에 발끝을 넣는다. 붉은 점이 신발 바로 앞에서 돌아선다. “봤지? 문지기끼리 인수인계를 못 해.”', 'Han puts a toe in the pillar’s shadow. A red dot turns just short of his shoe. “See? The doormen can’t manage a handover.”'),
            effects: [{ kind: 'quest', id: 'q_shortcut', stage: 1 }],
            goto: 'han',
          },
        },
        {
          label: t('“지도만 내놔. 확인은 필요 없어.”', '“Just give me the map. No need to check it.”'),
          intent: 'intimidate',
          approval: { han: -2, se_rin: -1 },
          success: {
            text: t('율이 지도의 마지막 화살표를 발로 지운다. “모르는 길을 아는 척 그려 줄 순 없어.”', 'Yul rubs out the map’s last arrow with a shoe. “I won’t pretend to know a route I haven’t walked.”'),
          },
        },
        {
          label: t('분필 선 바깥으로 물러난다', 'Step outside the chalk line'),
          intent: 'leave',
          success: { text: t('율이 당신 발자국 사이에 점을 다시 찍는다.', 'Yul redraws dots between your footprints.') },
        },
      ],
    },
    han: {
      speaker: 'han',
      text: t(
        '한이 작은 수신기의 선을 손가락에 감는다. “난 여기서 듣기만 해. 접속하면 저쪽 장부에 이름이 생기잖아. 우리 발소리까지 계산에 넣었는지는 가서 보자.”',
        'Han winds the little receiver’s wire around a finger. “Just listening from here. Plug in and you get your name in their book. Let’s find out whether they accounted for our footsteps.”',
      ),
      options: [
        {
          label: t('“계산 틀리면 돌아오는 길도 그려.”', '“Mark a way back in case your sums are wrong.”'),
          intent: 'insight',
          approval: { han: 2 },
          success: {
            text: t('“어, 되돌리기 버튼 중요하지.” 한이 반대 방향 화살표도 긋는다. 율이 그 옆에 계단을 그린다.', '“Yeah. Never skip the undo button.” Han draws arrows pointing back. Yul adds stairs beside them.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
            goto: 'timing',
          },
        },
        {
          label: t('“그냥 접속해서 문 열면 안 돼?”', '“Can’t you just plug in and open it?”'),
          intent: 'ask',
          approval: { han: -1 },
          success: {
            text: t('“내 머리 꽂을 생각은 접어. 문은 밖에서도 열려.” 한이 수신기를 주머니에 넣는다.', '“Forget using my head as a plug. Doors open from outside too.” Han pockets the receiver.'),
            goto: 'timing',
          },
        },
        {
          label: t('일단 지름길 제안을 접는다', 'Set the shortcut aside for now'),
          intent: 'leave',
          success: { text: t('한이 분필을 율에게 돌려준다. “틈은 또 생겨.”', 'Han returns the chalk to Yul. “There’ll be another gap.”') },
        },
      ],
    },
    timing: {
      speaker: 'rs_yul',
      text: t(
        '“운반용 봉인띠가 있으면 그냥 통과해. 다미가 가지고 있어. 아니면 오도한테 계전함 박자를 물어봐.” 율이 샛문 쪽을 가리킨다. “준비 없이 갈 거면, 센서에 찍힐 각오는 하고.”',
        '“A cargo seal gets you straight through. Dami has them. Or ask Odo for the relay timing.” Yul points to the hatch. “Go without either and expect the sensor to log you.”',
      ),
      options: [
        {
          label: t('배달 동선으로 기둥 간격을 재 본다', 'Pace the pillars as a courier would'),
          intent: 'insight',
          requires: { background: 'runner' },
          approval: { han: 1, se_rin: 1 },
          success: {
            text: t('가방을 멨을 때 돌아설 폭까지 잰다. 센서 교대 사이에 세 걸음, 마지막엔 몸을 옆으로. 율이 그 박자를 적는다.', 'You allow room to turn with a bag: three steps between sensor handovers, then sideways. Yul writes down the rhythm.'),
            effects: [{ kind: 'flag', key: 'rs_timing' }],
          },
        },
        {
          label: t('돌아오는 사람을 위한 표식을 묻는다', 'Ask how to mark the way for someone coming back'),
          intent: 'ask',
          success: {
            text: t('율이 둥근 점을 그린다. “여긴 기다려도 되는 자리. 화살표보다 이게 더 중요할 때가 있어.”', 'Yul draws a round dot. “A safe place to wait. Sometimes that matters more than an arrow.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('지도를 외우고 떠난다', 'Memorise the map and leave'),
          intent: 'leave',
          success: { text: t('율이 지나가는 손수레에서 지도를 가린다.', 'Yul shields the map from a passing cart.') },
        },
      ],
    },
  },
}

const DAMI: DialogueDef = {
  id: 'd2rs_dami',
  npc: 'rs_dami',
  start: 'scales',
  nodes: {
    scales: {
      speaker: 'rs_dami',
      text: t(
        '다미가 계량대에 팔꿈치를 괸다. “바퀴 하나당 받아. 발은 바퀴 아니고.” 그녀가 봉인띠를 손목에 감는다. “대신 사람을 짐처럼 통과시켜 달라는 부탁은 비싸.”',
        'Dami leans on the scales. “I charge by the wheel. Feet aren’t wheels.” She wraps a seal around her wrist. “Asking me to pass a person off as cargo costs extra.”',
      ),
      options: [
        {
          label: t('봉인띠를 산다 (15크레딧)', 'Buy a cargo seal (15 credits)'),
          intent: 'offer',
          requires: { minCredits: 15 },
          approval: { lin_yue: 1 },
          success: {
            text: t('다미가 봉인띠를 잘라 건넨다. “돌아올 때 반납해. 번호는 내가 지울게.”', 'Dami cuts off a seal. “Return it on your way back. I’ll clear its number.”'),
            effects: [{ kind: 'credits', amount: -15 }, { kind: 'flag', key: 'rs_seal' }],
          },
        },
        {
          label: t('“검증한 길을 다음 운반조와 공유하죠.”', '“I’ll share the verified route with your next shift.”'),
          intent: 'persuade',
          requires: { quest: { id: 'q_shortcut', stage: 1 } },
          check: { stat: 'cha', dc: 13 },
          assist: 'lin_yue',
          approval: { han: 1, lin_yue: 1 },
          success: {
            text: t('“검증한 길. 그 말 잊지 마.” 다미가 봉인띠를 저울 위에 놓는다.', '“Verified. Remember that word.” Dami lays a seal on the scales.'),
            effects: [{ kind: 'flag', key: 'rs_seal' }],
          },
          failure: {
            text: t('“지도에 없는 길은 담보도 안 돼.” 다미가 봉인띠를 손목으로 되감는다.', '“A route off the map isn’t collateral.” Dami winds the seal back around her wrist.'),
          },
        },
        {
          label: t('기울어진 수레를 계량대까지 밀어 준다', 'Push a leaning cart onto the scales'),
          intent: 'offer',
          check: { stat: 'str', dc: 12 },
          assist: 'tae_o',
          success: {
            text: t('바퀴가 턱을 넘는다. 다미가 장부의 운반비를 당신에게 넘긴다. “바퀴 아닌 발도 벌 수는 있지.”', 'The wheel clears the lip. Dami pays you the haulage fee. “Feet can earn too.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
          failure: {
            text: t('바퀴가 옆으로 꺾인다. 수레는 다미가 붙잡지만 손목에 힘이 잘못 걸린다.', 'The wheel twists sideways. Dami catches the cart, but you strain your wrist.'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('계량대 옆으로 지나간다', 'Walk around the scales'),
          intent: 'leave',
          success: { text: t('다미가 손가락으로 다음 수레를 부른다.', 'Dami beckons the next cart with a finger.') },
        },
      ],
    },
  },
}

const ODO: DialogueDef = {
  id: 'd2rs_odo',
  npc: 'rs_odo',
  start: 'relay',
  nodes: {
    relay: {
      speaker: 'rs_odo',
      text: t(
        '오도가 계전함에 종이컵을 대고 귀를 붙인다. “클릭 두 번, 쉼, 한 번. 기계도 말을 돌려 하네.” 연결 단자는 고무마개로 막혀 있다. “마개는 빼지 마. 듣는 데 필요 없어.”',
        'Odo presses a paper cup to the relay and listens. “Two clicks, pause, one click. Even machines talk around things.” Rubber caps cover the sockets. “Leave those in. Don’t need them to listen.”',
      ),
      options: [
        {
          label: t('교대 박자를 함께 해독한다', 'Work out the handover rhythm together'),
          intent: 'insight',
          check: { stat: 'int', dc: 14 },
          assist: 'han',
          approval: { han: 2 },
          success: {
            text: t('긴 쉼은 오류가 아니라 장부를 넘기는 시간이다. 오도가 그 길이만큼 손가락으로 책상을 두드린다.', 'The long pause is the log handover, not a fault. Odo taps its exact length against the desk.'),
            effects: [{ kind: 'flag', key: 'rs_timing' }],
          },
          failure: {
            text: t('당신이 박자를 틀리자 오도가 컵을 뗀다. “그걸로 뛰면 잡혀. 다른 방법 써.”', 'You miss a beat. Odo lifts the cup away. “Run on that and you’ll get caught. Try something else.”'),
          },
        },
        {
          label: t('폐기된 우회 회로 도면을 정리해 준다', 'Sort the discarded bypass diagrams'),
          intent: 'offer',
          approval: { han: 1 },
          success: {
            text: t('오도가 완성된 묶음 하나를 밀어 준다. “대가야. 현장에서 쓸 만한 거 골라.” 도면 구석에 수동 전환법이 적혀 있다.', 'Odo slides over a finished bundle. “Your pay. Pick something useful in the field.” Manual switching methods fill the margins.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('계전함을 부숴 사각을 넓힌다', 'Smash the relay to widen the blind spot'),
          intent: 'fight',
          check: { stat: 'str', dc: 15 },
          approval: { han: -2, se_rin: -1 },
          success: {
            text: t('계전함이 꺼진다. 천장의 센서가 즉시 고정 감시로 바뀐다. 오도가 컵을 내려놓는다. “이제 틈도 없어.”', 'The relay dies. Ceiling sensors switch to fixed surveillance. Odo puts down the cup. “Now there’s no gap at all.”'),
            effects: [{ kind: 'trace', amount: 8 }, { kind: 'flag', key: 'rs_fixed' }],
          },
          failure: {
            text: t('함은 멀쩡하고 손만 아프다. 오도가 당신을 한 걸음 밀어낸다.', 'The box is fine; your hand isn’t. Odo nudges you a step back.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('듣는 사람을 방해하지 않는다', 'Leave the listener in peace'),
          intent: 'leave',
          success: { text: t('종이컵 안에서 작은 클릭이 이어진다.', 'Little clicks continue inside the paper cup.') },
        },
      ],
    },
  },
}

const HATCH: DialogueDef = {
  id: 'd2rs_hatch',
  start: 'pillar',
  nodes: {
    pillar: {
      text: t(
        '기둥 뒤 샛문에 손바닥 자국이 겹쳐 있다. 문 너머에는 다음 구역으로 올라가는 계단이 보인다. 천장 센서의 위치부터 확인해야 한다.',
        'Palm marks overlap on the hatch behind the pillar. Beyond it, stairs climb toward the next district. You need to check the ceiling sensors first.',
      ),
      options: [
        {
          label: t('율에게 받은 분필을 꺼내 출구를 검증한다', 'Take out Yul’s chalk and verify the exit'),
          intent: 'insight',
          requires: { quest: { id: 'q_shortcut', stage: 1 } },
          success: {
            text: t('계단 아래까지 길은 이어진다. 마지막 센서 하나를 지나면 화살표를 그릴 수 있다.', 'The route reaches the foot of the stairs. One last sensor stands between you and a safe place to mark an arrow.'),
            goto: 'crossing',
          },
        },
        {
          label: t('지나가는 순찰등의 방향만 외운다', 'Memorise the passing patrol lights'),
          intent: 'insight',
          success: {
            text: t('등이 계단 위를 먼저 훑는다. 다음 교전에서는 그 시선보다 먼저 움직일 수 있다.', 'The light scans the top of the stairs first. In the next fight, you can move ahead of that sweep.'),
            effects: [{ kind: 'combat_mod', mod: 'intel' }],
          },
        },
        {
          label: t('샛문을 닫는다', 'Close the hatch'),
          intent: 'leave',
          success: { text: t('손바닥 자국 위에 당신 자국이 하나 더 남는다.', 'Your palm leaves one more print over the others.') },
        },
      ],
    },
    crossing: {
      text: t(
        '센서 아래 바닥은 반질반질하다. 엄폐 기둥과 운반용 인식판 사이로 한 사람이 지나갈 폭이 난다. 반대편 벽에는 아직 아무 표시도 없다.',
        'The floor under the sensor is polished smooth. Between a cover pillar and the cargo reader is room for one person. The wall beyond has no marks yet.',
      ),
      options: [
        {
          label: t('다미의 봉인띠를 인식판에 댄다', 'Touch Dami’s seal to the cargo reader'),
          intent: 'sneak',
          requires: { flag: 'rs_seal' },
          approval: { han: 1 },
          success: {
            text: t('운반 작업 표시가 켜진다. 당신은 계단까지 건너가 화살표와 돌아올 때의 점을 그린다.', 'The cargo indicator lights up. You cross to the stairs and draw an arrow, plus a waiting dot for the return.'),
            effects: [{ kind: 'quest', id: 'q_shortcut', stage: 2 }],
          },
        },
        {
          label: t('준비한 교대 박자에 맞춰 건넌다', 'Cross on the handover rhythm you prepared'),
          intent: 'sneak',
          requires: { flag: 'rs_timing', notFlag: 'rs_fixed' },
          approval: { han: 2 },
          success: {
            text: t('클릭 두 번 사이로 발을 옮긴다. 돌아보면 센서는 빈 기둥을 본다. 마른 벽에 분필이 선명하게 남는다.', 'You move between the two clicks. Behind you, the sensor watches an empty pillar. Chalk stands out on the dry wall.'),
            effects: [{ kind: 'quest', id: 'q_shortcut', stage: 2 }, { kind: 'trace', amount: -4 }],
          },
        },
        {
          label: t('센서의 회전을 눈으로 읽으며 건넌다', 'Read the sensor’s sweep as you cross'),
          intent: 'sneak',
          requires: { notFlag: 'rs_fixed' },
          check: { stat: 'obs', dc: 15 },
          assist: 'han',
          approval: { han: 1 },
          success: {
            text: t('붉은 점이 물러날 때 벽을 탄다. 발자국 하나 없이 계단까지 와서 길을 표시한다.', 'You hug the wall as the red dot retreats. At the stairs, you mark the route without leaving a recorded step.'),
            effects: [{ kind: 'quest', id: 'q_shortcut', stage: 2 }],
          },
          failure: {
            text: t('센서가 어깨를 잡아낸다. 당신은 계단으로 빠져나와 표시 아래 경고도 남긴다. ‘여기서 찍힘.’', 'The sensor catches your shoulder. You reach the stairs and add a warning beneath your mark: “Spotted here.”'),
            effects: [{ kind: 'trace', amount: 7 }, { kind: 'quest', id: 'q_shortcut', stage: 2 }],
          },
        },
        {
          label: t('감시를 감수하고 난간으로 우회한다', 'Take the railing detour and accept being seen'),
          intent: 'insight',
          success: {
            text: t('센서가 얼굴을 기록하지만 막힌 문은 없다. 계단에 닿아 안전한 발판과 노출 지점을 함께 그린다.', 'The sensor records your face, but no door blocks you. At the stairs you mark both safe footing and exposed ground.'),
            effects: [{ kind: 'trace', amount: 6 }, { kind: 'quest', id: 'q_shortcut', stage: 2 }],
          },
        },
        {
          label: t('오늘은 이 틈을 쓰지 않는다', 'Leave the gap unused today'),
          intent: 'leave',
          success: { text: t('분필을 쥔 손을 내린다. 확인하지 않은 화살표는 남기지 않는다.', 'You lower the chalk. No arrow points along an unverified route.') },
        },
      ],
    },
  },
}

export const D2_RUNNER_SHORTCUT_DIALOGUES: DialogueDef[] = [YUL, DAMI, ODO, HATCH]

export const D2_RUNNER_SHORTCUT_NPCS: NpcDef[] = [
  { id: 'rs_yul', name: t('율', 'Yul'), role: t('배달꾼들의 분필 지도를 고치는 길잡이', 'A guide maintaining the couriers’ chalk map'), portrait: 'v2/npcs/rs_yul.webp', faction: 'offgrid' },
  { id: 'rs_dami', name: t('다미', 'Dami'), role: t('야시장 지하 운반로의 계량원', 'The market underpass weighmaster'), portrait: 'v2/npcs/rs_dami.webp', faction: 'market' },
  { id: 'rs_odo', name: t('오도', 'Odo'), role: t('접속 없이 계전함을 듣는 기술자', 'A technician listening to relays without connecting'), portrait: 'v2/npcs/rs_odo.webp', faction: 'offgrid' },
]

export const D2_RUNNER_SHORTCUT_QUESTS: QuestDef[] = [{
  id: 'q_shortcut',
  title: t('돌아오는 화살표', 'The Arrow Back'),
  stages: [
    t('한이 찾은 관리망 사각을 율이 지도에 옮긴다. 샛문 너머 출구를 확인하고 표시해야 한다.', 'Yul maps the grid blind spot Han found. Verify and mark the exit beyond the hatch.'),
    t('출구와 돌아올 길을 확인했다. 지하 길잡이들이 보스 구역의 접근 박자를 전해 준다.', 'You verify the exit and the return route. The underground guides pass on the approach timing for the boss’s district.'),
  ],
  payoff: { stage: 2, bossMod: 'intel', text: t('검증한 지름길로 보스전 첫 움직임을 앞당긴다.', 'The verified shortcut lets you act sooner in the boss fight.') },
}]
