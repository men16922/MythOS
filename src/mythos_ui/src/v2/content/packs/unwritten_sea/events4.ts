// Pack 5 — Act 4 scenes of The Unwritten Sea.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const SEA4_EVENTS: EventDef[] = [
  {
    id: 'sea4_ev_hook',
    acts: [4],
    route: 'sea_4',
    title: t('아래쪽만 녹슬었다', 'Rust on the Underside'),
    image: 'v2/events/sea4_ev_hook.webp',
    gmHints: ['하역공 금옥의 끼인 도시락', '아래쪽만 녹슨 크레인 후크', '콘크리트 위로 떨어지는 가루'],
    text: t(
      '하역공 금옥이 녹슨 크레인 후크 밑으로 팔을 넣는다. 도시락 손잡이가 걸려 있다.\n후크 아래쪽에서 붉은 가루가 떨어진다. 위쪽 도장은 멀쩡하다.\n“비 맞아서 이렇다는데, 비가 밑에서 오나.” 금옥이 당신 쪽으로 지렛대를 민다.',
      'Geum-ok reaches beneath a rusty crane hook. A lunch box is caught under it by the handle.\nRed flakes fall from the underside. The paint on top is intact.\n“They say rain did this. Rain comes up from below now?” Geum-ok pushes a pry bar toward you.',
    ),
    options: [
      {
        label: t('후크를 받치고 도시락을 빼낸다', 'Brace the hook and free the lunch box'),
        hint: t('근력 7 · 성공 +70 ₵ · 실패 −7 HP', 'STR 7 · success +70 ₵ · fail −7 HP'),
        check: { stat: 'str', dc: 7 },
        success: {
          text: t(
            '지렛대가 손바닥 살을 누른다. 금옥이 도시락을 빼고 받침을 끼운다.\n“점심값보다 비싸네.” 금옥이 구조 공임을 당신 계좌로 보낸다.',
            'The bar digs into your palm. Geum-ok retrieves the lunch box and slips a support underneath.\n“Cost more than lunch.” The rescue fee lands in your account.',
          ),
          effects: [{ kind: 'credits', amount: 30 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'credits', amount: 40 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '지렛대 끝이 미끄러지고 후크가 팔뚝을 친다.\n금옥이 받침을 걷어 넣는다. 도시락 뚜껑은 아직 벌어지지 않았다.',
            'The bar slips. The hook strikes your forearm.\nGeum-ok kicks a support into place. The lunch box lid has held.',
          ),
          effects: [{ kind: 'hp', amount: -7 }],
        },
      },
      {
        label: t('금옥의 예비 작업 꾸러미를 산다', 'Buy a spare work kit from Geum-ok'),
        hint: t('−30 ₵ · 소모품 1개 · 인간성 +1', '−30 ₵ · 1 consumable · Humanity +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '금옥이 작업 꾸러미를 건넨 뒤 맞은편 식당에 새 점심을 주문한다.\n통화가 끝나자 다시 바닥에 엎드려 도시락 밑에 받침을 고른다.',
            'Geum-ok hands you a work kit, then orders lunch from across the yard.\nAfter the call, the worker lies down again to fit a support beneath the lunch box.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('예비 받침을 옮겨 금옥의 작업을 돕는다', 'Carry spare supports to help Geum-ok'),
        hint: t('−2 HP · 인간성 +1', '−2 HP · Humanity +1'),
        success: {
          text: t(
            '받침 모서리가 팔 안쪽을 긁는다. 금옥이 당신이 옮긴 받침을 후크 밑에 고른다.\n“이제 혼자 해도 되겠네.” 도시락 손잡이가 조금 느슨해진다.',
            'A support edge scrapes your arm. Geum-ok fits the pieces you carried beneath the hook.\n“Can manage from here.” The lunch box handle loosens a little.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_tide_table',
    acts: [4],
    route: 'sea_4',
    title: t('여섯 시간 뒤에 다시', 'Again in Six Hours'),
    image: 'v2/events/sea4_ev_tide_table.webp',
    gmHints: ['당직 서기 문실의 알람', '비 오는 시간을 고친 조석표', '하루 두 번 비워 두는 계단'],
    text: t(
      '당직 서기 문실이 조석표 위에 ‘비 오는 시간’이라고 적는다. 자명종이 울리자 연필을 놓는다.\n표에는 맑은 날에도 같은 간격으로 동그라미가 돌아온다.\n“이때 계단을 비워야 해요. 왜인지는 전임자한테 못 물었고.” 문실이 다음 알람을 맞춘다.',
      'Mun-sil writes “rain times” across a tide table. An alarm rings; the pencil goes down.\nThe circles recur at the same intervals, even on days marked clear.\n“We keep the steps clear at these times. Never got to ask the last clerk why.” Mun-sil sets the next alarm.',
    ),
    options: [
      {
        label: t('지워진 시각을 맞춰 작업 순서를 고친다', 'Reconstruct the times and revise your working sequence'),
        hint: t('추적 +3 · 카드 강화 1 · 통찰 +1', '+3 Trace · upgrade 1 · Insight +1'),
        check: { stat: 'int', dc: 8 },
        success: {
          text: t(
            '덧쓴 숫자 아래에서 일정한 간격이 나온다. 당신은 행동 순서를 그 간격에 맞춰 고친다.\n문실이 복사기를 켠다. 세관 단말에도 복사 이력이 켜진다.',
            'The overwritten figures reveal a regular interval. You adjust a practiced sequence to match it.\nMun-sil starts the copier. A copying record appears on the customs terminal too.',
          ),
          effects: [
            { kind: 'trace', amount: 3 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '요일과 시각을 뒤바꿔 입력한다. 복사기가 오류음을 세 번 낸다.\n문실이 출력을 취소하지만 세관 문의등은 꺼지지 않는다.',
            'You enter the day in the time field. The copier sounds three errors.\nMun-sil cancels the job. The customs inquiry light stays on.',
          ),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('문실에게 계단 우회 안내를 산다', 'Pay Mun-sil for directions around the steps'),
        hint: t('−20 ₵ · 추적 −4', '−20 ₵ · −4 Trace'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '문실이 표를 뒤집고 난방 배관 옆 통로를 그린다.\n계단 입구의 카메라를 지나치지 않고 반대편으로 나온다.',
            'Mun-sil turns the sheet over and sketches a passage beside the heating pipes.\nYou emerge on the far side without passing the camera at the steps.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
      {
        label: t('표를 덮고 알람이 멎은 뒤 우회한다', 'Close the table and detour after the alarm'),
        hint: t('추적 −2 · 통찰 −1', '−2 Trace · Insight −1'),
        success: {
          text: t(
            '문실이 표를 접는다. 당신은 숫자 맞추기를 그만두고 알람이 멎을 때까지 기다린다.\n빈 계단 대신 창고 뒤로 돌아간다. 지워진 시각은 확인하지 못한다.',
            'Mun-sil folds the table. You stop comparing figures and wait for the alarm to end.\nYou go behind the storehouse, leaving the erased times unread.',
          ),
          effects: [
            { kind: 'trace', amount: -2 },
            { kind: 'axis', axis: 'insight', amount: -1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_work_boots',
    acts: [4],
    route: 'sea_4',
    title: t('밑창부터 말린다', 'Soles First'),
    image: 'v2/events/sea4_ev_work_boots.webp',
    gmHints: ['하역공 정수의 아버지 장화', '사다리 아래로 떨어진 한 짝', '먼지 위에서 장화를 뒤집는 손'],
    text: t(
      '하역공 정수가 장화 한 짝을 뒤집어 난간에 건다. 다른 한 짝은 마른 도크 아래에 떨어져 있다.\n밑창에서 먼지가 쏟아진다. 정수는 장화 안쪽을 손등으로 확인한다.\n“아버지가 젖은 쪽을 아래로 걸랬어요. 여기서 젖을 일이 있었나.” 사다리 첫 발판이 덜컥인다.',
      'Jeong-su hangs one boot upside down on the rail. Its mate lies at the bottom of the dry dock.\nDust spills from the sole. The dockhand tests the lining with the back of a hand.\n“Dad said the wet end goes down. What ever got wet here?” The first ladder rung rattles.',
    ),
    options: [
      {
        label: t('사다리를 내려가 장화를 주워 준다', 'Climb down and retrieve the boot'),
        hint: t('HP −3 · 소모품 1 · 인간성 +1', '−3 HP · 1 consumable · Humanity +1'),
        check: { stat: 'agi', dc: 7 },
        success: {
          text: t(
            '깨진 발판이 정강이를 긁는다. 장화를 올려 주자 정수가 두 짝의 높이를 맞춘다.\n정수는 자기 작업 가방에서 구급 꾸러미 하나를 꺼내 건넨다.',
            'A broken rung scrapes your shin. Jeong-su takes the boot and hangs the pair level.\nThe dockhand gives you a first-aid packet from a work bag.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '발판이 돌아가며 무릎이 벽에 부딪힌다. 정수가 위에서 사다리를 붙든다.\n당신이 올라오는 동안 장화 한 짝이 바닥에서 천천히 눕는다.',
            'A rung twists and your knee hits the wall. Jeong-su holds the ladder from above.\nAs you climb back, the fallen boot slowly tips onto its side.',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('새 작업화를 살 돈을 보탠다', 'Contribute toward a new pair of work boots'),
        hint: t('−30 ₵ · 일행 HP +4 · 인간성 +1', '−30 ₵ · party heals 4 HP · Humanity +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '정수가 돈을 받고 구내 의무실 문을 열어 준다. 당신 일행은 발을 씻고 물집을 감는다.\n정수는 돌아와 남은 장화를 아버지 이름이 안쪽으로 보이게 돌려 건다.',
            'Jeong-su accepts the money and opens the works infirmary. Your group washes sore feet and dresses blisters.\nBack at the rail, the dockhand turns the remaining boot so the father’s name faces inward.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'heal_party', amount: 4 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('정수가 내려가도록 사다리를 붙든다', 'Hold the ladder while Jeong-su climbs down'),
        hint: t('−2 HP · 인간성 +1 · +15 ₵', '−2 HP · Humanity +1 · +15 ₵'),
        success: {
          text: t(
            '흔들리는 사다리의 볼트가 손바닥을 누른다. 정수가 천천히 내려가 장화를 집는다.\n당신이 놓아도 된다고 말할 때까지 두 짝을 품에 안고 기다린다.',
            'A bolt presses into your palm as you steady the ladder. Jeong-su climbs down for the boot.\nThe dockhand holds both boots and waits until you say it is safe to let go.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_buoy',
    acts: [4],
    route: 'sea_4',
    title: t('묶인 쪽이 안쪽이다', 'Tied Toward Shore'),
    image: 'v2/events/sea4_ev_buoy.webp',
    gmHints: ['혼자 들어선 마른 수로', '육지 쪽으로 당겨진 항로 표지 부표', '표면의 가느다란 쓸림 자국'],
    text: t(
      '혼자 내려선 수로에서 항로 표지 부표를 발끝으로 돌린다. 속의 쇠추가 한 번 울린다.\n몸통에는 항구 안쪽으로 길게 쓸린 자국이 있다. 묶인 줄도 같은 방향으로 팽팽하다.\n“떠내려간 방향이 이쪽이라고?” 당신이 먼지를 털어 자국의 끝을 찾는다.',
      'Alone in the channel, you turn a navigation buoy with your boot. Its internal weight knocks once.\nLong scrapes run toward the inner harbor. The mooring line is taut in the same direction.\n“It drifted that way?” You brush off the dust to find where the scrapes end.',
    ),
    options: [
      {
        label: t('검사등을 켜고 쓸린 순서를 읽는다', 'Switch on the inspection light and read the scrape marks'),
        hint: t('추적 +4 · 고급 카드 선택 · 통찰 +1', '+4 Trace · uncommon card pick · Insight +1'),
        check: { stat: 'obs', dc: 8 },
        success: {
          text: t(
            '오래된 자국 위로 새 자국이 겹친다. 당신은 무게가 돌아간 순서를 손으로 따라 해 본다.\n등불이 수로 위 카메라에 잡힌다. 손은 배운 순서를 한 번 더 짚는다.',
            'Fresh marks cross older ones. You rehearse the order in which the weight turned.\nA camera above the channel catches your light. Your hands repeat the new sequence.',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'card_choice', rarity: 'uncommon', count: 3 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '손을 댄 틈으로 몸통이 굴러 손가락을 누른다.\n당신이 손을 빼는 동안 카메라의 작은 불빛이 멈춰 선다.',
            'The body rolls over the gap beneath your hand and crushes your fingers.\nAs you pull free, the little camera light stops moving.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('팽팽한 줄 아래로 기어 통과한다', 'Crawl beneath the taut line'),
        hint: t('−3 HP · 추적 −5 · 회복력 +1 · +10 ₵', '−3 HP · −5 Trace · Resilience +1 · +10 ₵'),
        success: {
          text: t(
            '거친 바닥이 팔꿈치를 벗긴다. 몸을 낮춘 채 수로 끝의 그늘로 들어간다.\n뒤에서 쇠추가 한 번 더 울린다.',
            'The rough floor strips skin from your elbows. Keeping low, you reach the shade at the channel mouth.\nBehind you, the weight knocks again.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -5 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_high_cot',
    acts: [4],
    route: 'sea_4',
    requires: { notFlag: 'sea_cot_braced' },
    title: t('침대는 위에 둔다', 'Keep the Bed High'),
    image: 'v2/events/sea4_ev_high_cot.webp',
    gmHints: ['빈 컨테이너를 쓰는 야간 숙소', '관리인 은채의 흔들리는 침대', '천장 가까이 남은 수평 자국'],
    text: t(
      '숙소 관리인 은채가 빈 컨테이너 안에서 침대 다리를 벽에 고정한다. 침대는 어깨 높이에 걸려 있다.\n천장 가까이 누런 선이 돈다. 바닥에는 마른 먼지만 쌓였다.\n“내려놓으면 안심이 안 돼요. 지진 때문이었나.” 은채가 짧은 나사를 바닥에 늘어놓는다.',
      'Eun-chae bolts a bed to the wall of an empty shipping container. The mattress sits at shoulder height.\nA yellow line circles the wall near the ceiling. Dry dust covers the floor.\n“Cannot sleep with it lower. Was it earthquakes?” The lodging caretaker lays short screws in a row.',
    ),
    options: [
      {
        label: t('침대를 어깨로 받쳐 긴 나사를 박는다', 'Shoulder the bed while fitting longer screws'),
        hint: t('−5 HP · 인간성+1 · 저녁 초대 해금', '−5 HP · Humanity+1 · unlock supper'),
        success: {
          text: t(
            '침대 모서리가 어깨에 파고든다. 마지막 나사가 벽을 물자 은채가 사다리를 놓는다.\n“저녁에 식당으로 와요. 오늘은 앉을 자리 있어요.”',
            'The bed frame digs into your shoulder. When the last screw holds, Eun-chae sets the ladder down.\n“Come to the dining room tonight. There will be a seat.”',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_cot_braced' },
          ],
        },
      },
      {
        label: t('옮길 수 있는 받침대를 사서 건넨다', 'Buy a portable support for the bed'),
        hint: t('−30 ₵ · 인간성+1 · 저녁 초대 해금', '−30 ₵ · Humanity+1 · unlock supper'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '은채가 받침대 높이를 천장의 선 아래에 맞춘다. 발로 밀어도 침대가 움직이지 않는다.\n“저녁은 식당에서 같이 먹어요. 이것부터 접어 둘게요.” 사다리가 벽으로 돌아간다.',
            'Eun-chae adjusts the support beneath the line on the wall. A shove with one foot fails to move the bed.\n“Supper with us in the dining room. Let me put this away.” The ladder goes back against the wall.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_cot_braced' },
          ],
        },
      },
      {
        label: t('흩어진 나사를 주워 길이별로 나눈다', 'Gather the screws and sort them by length'),
        hint: t('−2 HP · 회복력 +1 · +15 ₵', '−2 HP · Resilience +1 · +15 ₵'),
        success: {
          text: t(
            '먼지 속 나사 끝이 손을 찌른다. 당신은 손을 털고 긴 것부터 다시 고른다.\n은채가 쓸 수 있는 나사들을 집어 든다. 침대는 아직 사다리에 기대 있다.',
            'A screw hidden in the dust pricks your hand. You shake it off and sort the longest pieces first.\nEun-chae picks out usable screws. The bed still rests against the ladder.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_supper_seat',
    acts: [4],
    route: 'sea_4',
    requires: { flag: 'sea_cot_braced' },
    title: t('의자를 내려도 되는 시간', 'Time to Lower the Chairs'),
    image: 'v2/events/sea4_ev_supper_seat.webp',
    gmHints: ['침대 수리를 기억하는 은채', '벽에 매달아 둔 식당 의자', '찬바람이 새는 난방 밸브'],
    text: t(
      '은채가 당신을 보고 벽에서 의자를 내린다. 의자 다리들이 바닥에 차례로 닿는다.\n식당 난방 밸브가 쉭쉭 샌다. 수프는 작은 화로 위에 있다.\n“물 차기 전에 걸어 두던 버릇이에요. 여기 물이 찼던가.” 은채가 당신 몫의 자리를 닦는다.',
      'Eun-chae sees you and takes chairs down from the wall. Their legs touch the floor one by one.\nThe dining room heating valve hisses. Soup sits over a small burner.\n“Used to hang them up before the water came. Did water ever come here?” Eun-chae wipes a place for you.',
    ),
    options: [
      {
        label: t('식재료 값을 보태고 일행과 먹는다', 'Contribute for ingredients and eat with the group'),
        hint: t('−30 ₵ · 일행 HP +8 · 인간성 +1', '−30 ₵ · party heals 8 HP · Humanity +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '은채가 화로에 냄비 하나를 더 얹는다. 당신 일행은 뜨거운 그릇을 번갈아 돌린다.\n빈 의자는 식사가 끝날 때까지 바닥에 남는다.',
            'Eun-chae puts a second pot on the burner. Your group passes hot bowls around.\nThe empty chairs stay on the floor until the meal is over.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'heal_party', amount: 8 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('뜨거운 밸브를 조이고 작업 요령을 배운다', 'Tighten the hot valve and learn the maintenance routine'),
        hint: t('−4 HP · 카드 제거 1장 · 회복력 +1', '−4 HP · remove 1 card · Resilience +1'),
        success: {
          text: t(
            '장갑 틈으로 뜨거운 김이 든다. 은채가 당신 손을 빼 주고 잠그는 순서를 다시 짚는다.\n필요 없는 동작 하나를 빼자 힘을 덜 주어도 밸브가 닫힌다.',
            'Hot vapor gets inside your glove. Eun-chae pulls your hand clear and demonstrates the closing sequence.\nRemoving one unnecessary movement lets you shut the valve with less force.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('빈 그릇을 씻어 은채의 일손을 돕는다', 'Wash the empty bowls for Eun-chae'),
        hint: t('−2 HP · 인간성 +1', '−2 HP · Humanity +1'),
        success: {
          text: t(
            '그릇의 깨진 테두리가 손가락을 긋는다. 은채가 천을 건네고 젖은 그릇을 받아 닦는다.\n마지막 그릇이 마를 때까지 둘이 나란히 선다.',
            'A chipped rim cuts your finger. Eun-chae gives you a cloth and dries the bowls you wash.\nYou stand side by side until the last bowl is dry.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_seized_coat',
    acts: [4],
    route: 'sea_4',
    title: t('젖은 옷의 주인', 'Who Owns the Coat'),
    image: 'v2/events/sea4_ev_seized_coat.webp',
    gmHints: ['재봉사 현옥의 수선 외투', '소매에 붙은 압류 딱지', '물이 들었다고 적힌 판정 사유'],
    text: t(
      '재봉사 현옥이 외투 소매의 압류 딱지를 손톱으로 민다. 실밥이 따라 일어난다.\n판정 사유는 ‘외부 수역 접촉’. 현옥이 짠 소매에서는 물이 나오지 않는다.\n“손님은 비를 맞았다 하고, 안감엔 모래가 들었어요. 옷은 돌려줘야 하는데.” 접수기의 유예등이 깜빡인다.',
      'Hyeon-ok works a fingernail beneath the seizure tag on a coat sleeve. Threads lift with it.\nThe stated reason is “contact with external waters.” Nothing drips when the tailor wrings the sleeve.\n“The customer says rain. There was sand in the lining. I still owe them their coat.” The collection timer blinks.',
    ),
    options: [
      {
        label: t('내 이름으로 인수하고 외투를 돌려준다', 'Sign for the coat and return it to its owner'),
        hint: t('추적 +6 · 인간성 +1', '+6 Trace · Humanity +1'),
        success: {
          text: t(
            '인수란에 당신 이름이 남는다. 현옥이 외투를 뒤집어 수선한 안감을 덮는다.\n접수기가 당신 얼굴을 찍는 동안 재봉사는 배달 가방을 닫는다.',
            'Your name remains in the collection field. Hyeon-ok turns the coat to cover the repaired lining.\nThe machine photographs your face while the tailor closes the delivery bag.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('현옥 대신 압류함에 외투를 넣는다', 'Put the coat in the seizure hatch for Hyeon-ok'),
        hint: t('추적 −4 · 인간성 −1 · 지배 +1', '−4 Trace · Humanity −1 · Dominance +1'),
        success: {
          text: t(
            '협조 확인등이 켜지고 당신의 현장 조회가 끝난다. 외투가 함 안으로 당겨진다.\n현옥은 빈 옷걸이에 손님 이름을 붙여 놓는다.',
            'A cooperation light comes on and your spot check ends. The hatch draws the coat inside.\nHyeon-ok attaches the customer’s name to the empty hanger.',
          ),
          effects: [
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'humanity', amount: -1 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_salt_wall',
    acts: [4],
    route: 'sea_4',
    title: t('벽에서 나는 맛', 'What the Wall Leaves'),
    image: 'v2/events/sea4_ev_salt_wall.webp',
    gmHints: ['의무공 연주의 벽 긁개', '허리 높이에 맺힌 소금 결정', '빈 급수관 아래의 의무대'],
    text: t(
      '의무공 연주가 긁개로 벽의 소금 결정을 작은 접시에 받는다. 금속 긁는 소리가 의무대까지 간다.\n하얀 띠는 허리 높이에서 끊긴다. 급수관은 그보다 훨씬 위에 있다.\n“배관에서 샜다는데, 그 관은 민물 썼어요.” 연주가 접시를 덮고 치료용 전극을 펼친다.',
      'Yeon-ju scrapes salt crystals from the wall into a dish. The sound carries to the infirmary cot.\nThe white band stops at waist height. The water pipe runs much higher.\n“They blame the pipe. That carried fresh water.” The medic covers the dish and lays out treatment electrodes.',
    ),
    options: [
      {
        label: t('전극 접점을 골라 신체 보조장치를 시험한다', 'Select clean contacts and test a body support implant'),
        hint: t('HP −4 · 고급 임플란트 · 통찰 +1', '−4 HP · uncommon implant · Insight +1'),
        check: { stat: 'obs', dc: 9 },
        success: {
          text: t(
            '오염된 접점을 빼고 남은 장치를 붙인다. 시험 자극이 팔을 깊게 저리게 한다.\n연주가 떨림이 가라앉는 것을 확인하고 고정 나사를 잠근다.',
            'You discard the contaminated contacts and fit the remaining device. The test pulse aches deep in your arm.\nYeon-ju waits for the tremor to stop, then tightens the retaining screw.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '접점 밑에 남은 가루가 타며 팔이 굳는다. 연주가 즉시 전원을 뽑는다.\n장치는 폐기함에 들어가고 당신 팔에는 식힌 천이 감긴다.',
            'Residue beneath a contact burns and locks your arm. Yeon-ju immediately disconnects the power.\nThe device goes into disposal. A cool cloth goes around your arm.',
          ),
          effects: [{ kind: 'hp', amount: -7 }],
        },
      },
      {
        label: t('의무대를 빌려 일행의 상처를 씻는다', 'Pay to use the infirmary for the group'),
        hint: t('−30 ₵ · 일행 HP +6', '−30 ₵ · party heals 6 HP'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '연주가 깨끗한 대야를 침대 사이에 놓는다. 당신 일행은 붕대를 풀고 차례를 기다린다.\n벽에서 긁어 낸 접시는 치료대와 먼 선반으로 옮겨진다.',
            'Yeon-ju sets clean basins between the cots. Your group unwraps dressings and waits a turn.\nThe covered dish moves to a shelf well away from the treatment area.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'heal_party', amount: 6 },
          ],
        },
      },
      {
        label: t('공용 세척대에서 일행의 붕대를 간다', 'Change the group’s dressings at the public basin'),
        hint: t('추적 +2 · 일행 HP +3 · +10 ₵', '+2 Trace · party heals 3 HP · +10 ₵'),
        success: {
          text: t(
            '공용 세척대가 이용 기록을 남긴다. 당신 일행은 깨끗한 물로 상처를 씻고 붕대를 바꾼다.\n연주가 빈 접시를 치우며 수도꼭지를 잠가 준다.',
            'The public basin logs its users. Your group washes wounds with clean water and changes dressings.\nYeon-ju clears the empty dish and shuts off the tap.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 2 },
            { kind: 'heal_party', amount: 3 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_wet_roster',
    acts: [4],
    route: 'sea_4',
    requires: { notFlag: 'sea_roster_copied' },
    title: t('밑장부터 젖었다', 'Wet from the Bottom'),
    image: 'v2/events/sea4_ev_wet_roster.webp',
    gmHints: ['출근 서기 도윤의 젖은 명단', '맑은 날의 승선 인원', '도장을 피해 글자를 말리는 손'],
    text: t(
      '출근 서기 도윤이 젖은 명단 사이에 흡수지를 끼운다. 종이를 떼는 소리가 작게 난다.\n맑은 날의 승선 인원이 밑장에 번져 있다. 도윤은 그날도 배가 없었다고 말한다.\n“그럼 이 사람들 출근은 어디서 받은 거죠.” 도윤이 이름 위의 도장을 피해 손바닥으로 종이를 편다.',
      'Do-yun slips blotting paper between the pages of a wet roster. Each sheet comes away with a soft peel.\nA clear day’s boarding count has bled through the bottom page. The attendance clerk says there were no ships then either.\n“Where did I check these people in?” Do-yun smooths the paper without touching the names.',
    ),
    options: [
      {
        label: t('이름을 옮겨 적고 재접수를 약속한다', 'Copy the names and promise to submit them again'),
        hint: t('추적 +5 · 인간성 +1 · 명단 재접수 해금', '+5 Trace · Humanity +1 · unlock resubmission'),
        success: {
          text: t(
            '도윤이 한 글자씩 읽고 당신이 받아 적는다. 복사 감지등이 책상 아래에서 켜진다.\n도윤은 마른 사본을 당신에게 주고 접수 창구 번호를 적어 준다.',
            'Do-yun reads each character while you write. A copying alert lights beneath the desk.\nThe clerk gives you the dry copy and the number of the submissions window.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_roster_copied' },
          ],
        },
      },
      {
        label: t('흡수지와 수기 복사 비용을 댄다', 'Pay for blotting paper and a handwritten copy'),
        hint: t('−30 ₵ · 통찰 +1 · 명단 재접수 해금', '−30 ₵ · Insight +1 · unlock resubmission'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '도윤이 복사기 덮개를 닫고 새 종이를 편다. 숫자보다 이름을 먼저 옮긴다.\n당신은 승선 칸 아래에 눌려 있던 날짜를 사본 옆에 적는다.',
            'Do-yun closes the copier and lays out fresh paper, copying the names before the figures.\nYou add the date impressed beneath the boarding column to the margin.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'axis', axis: 'insight', amount: 1 },
            { kind: 'flag', key: 'sea_roster_copied' },
          ],
        },
      },
      {
        label: t('명단을 들고 바람에 말리는 일을 돕는다', 'Help hold the roster open to dry'),
        hint: t('−2 HP · 인간성 +1 · +15 ₵', '−2 HP · Humanity +1 · +15 ₵'),
        success: {
          text: t(
            '녹슨 종이집게가 손끝을 찌른다. 당신이 명단을 벌려 들자 도윤이 젖은 흡수지를 뺀다.\n마른 이름들이 원본에 남는다. 사본은 만들지 않는다.',
            'A rusty clip pricks your finger. You hold the roster open while Do-yun removes the wet blotting paper.\nThe names dry on the original. No copy is made.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_roster_window',
    acts: [4],
    route: 'sea_4',
    requires: { flag: 'sea_roster_copied' },
    title: t('없는 선석의 출근', 'Attendance at a Missing Berth'),
    image: 'v2/events/sea4_ev_roster_window.webp',
    gmHints: ['명단 사본을 받는 접수원', '지도에서 빠진 칠 번 선석', '빈칸을 돌려주는 회전 받침'],
    text: t(
      '접수원이 당신의 명단 사본을 회전 받침에 놓는다. 종이가 유리 밑을 다시 돌아온다.\n반려 사유는 칠 번 선석 주소 오류. 벽 지도는 육 번 다음이 팔 번이다.\n“저도 칠 번에서 인계받은 기억은 있습니다.” 접수원이 도장 손잡이를 쥐었다 놓는다.',
      'The clerk puts your copied names on a rotating tray. The paper comes back beneath the glass.\nRejected: invalid address for Berth Seven. The wall map goes from Six to Eight.\n“I remember taking over at Seven myself.” The clerk grips the stamp, then lets go.',
    ),
    options: [
      {
        label: t('주소 대신 실제 인계 시간을 접수하게 한다', 'Ask the clerk to accept the handover time as evidence'),
        hint: t('추적 +4 · 카드 제거 1 · 통찰 +1', '+4 Trace · remove 1 card · Insight +1'),
        check: { stat: 'cha', dc: 9 },
        success: {
          text: t(
            '접수원이 예외 심사를 열고 당신 이름을 증인란에 넣는다. 주소를 되풀이하던 질문이 끝난다.\n당신도 쓸모없이 반복하던 대응 하나를 버린다. 사본은 이번에는 돌아오지 않는다.',
            'The clerk opens an exception review and enters you as witness. The circular questions about the address stop.\nYou discard a response you had kept repeating without purpose. This time, the copy stays behind the glass.',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '접수원이 인계 시각을 입력하자 증인 조회창이 열린다.\n명단은 받침에 남고 천장의 카메라가 당신 쪽으로 내려온다.',
            'Entering the handover time opens a witness inquiry.\nThe copy stays on the tray. The ceiling camera tilts down toward you.',
          ),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
      {
        label: t('사본을 회수하고 대리 제출료를 낸다', 'Retrieve the copy and pay for proxy submission'),
        hint: t('−40 ₵ · 추적 −4', '−40 ₵ · −4 Trace'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '접수원이 대리 제출 봉투를 내민다. 당신 이름이 방문 기록에서 빠지고 봉투 번호가 들어간다.\n사본을 넣자 칠 번 선석 부분만 봉투 창에 남는다.',
            'The clerk offers a proxy envelope. An envelope number replaces your name in the visitor log.\nOnce the copy is inside, only the entry for Berth Seven shows through the window.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
      {
        label: t('사본을 접고 방문 기록만 지워 달라고 한다', 'Fold the copy and ask to clear the visit log'),
        hint: t('추적 −2 · 통찰 −1', '−2 Trace · Insight −1'),
        success: {
          text: t(
            '당신이 접수를 철회하자 접수원이 방문 칸을 비운다. 인계 시각은 입력되지 않는다.\n사본은 당신 주머니로 돌아온다. 지도에서 칠 번을 찾는 일은 멈춘다.',
            'You withdraw the submission. The clerk clears the visit entry without recording the handover time.\nThe copy returns to your pocket. You stop looking for Seven on the map.',
          ),
          effects: [
            { kind: 'trace', amount: -2 },
            { kind: 'axis', axis: 'insight', amount: -1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_survivor_allowance',
    acts: [4],
    route: 'sea_4',
    title: t('생존 사유를 쓰세요', 'State Your Reason for Surviving'),
    image: 'v2/events/sea4_ev_survivor_allowance.webp',
    gmHints: ['퇴직 하역원 복만의 보상 신청', '탁자 밑 휴대용 무적', '익사 수당을 반려한 생존 확인서'],
    text: t(
      '퇴직 하역원 복만이 휴대용 무적을 발로 밀어 탁자 밑에 넣는다. 짧은 나팔 소리에 접수기가 켜진다.\n반려 서류에는 ‘생존 확인’과 ‘해당 수역 없음’이 나란히 찍혀 있다.\n“돌아온 건 제 실수고, 물이 없었던 것도 제 실수래요.” 복만이 생존 사유 칸에 지우개를 문지른다.',
      'Bok-man nudges a portable foghorn under the desk. Its short blast wakes the application terminal.\nThe rejection lists “applicant alive” beside “body of water does not exist.”\n“Coming back was my mistake. Apparently the missing water was mine too.” The retired dockhand erases the reason-for-surviving field.',
    ),
    options: [
      {
        label: t('생존이 수당 취소 사유인지 따져 묻는다', 'Challenge the clause that disqualifies survivors'),
        hint: t('+40 ₵ · 추적 +4 · 인간성 +1', '+40 ₵ · +4 Trace · Humanity +1'),
        check: { stat: 'cha', dc: 7 },
        success: {
          text: t(
            '접수기가 항의 대리인으로 당신을 등록하고 지연 수수료를 지급한다. 복만의 심사도 다시 열린다.\n복만이 지우개를 내려놓는다. “다음엔 구조된 사유도 쓰겠네.”',
            'The terminal registers you as representative and pays a delay fee. Bok-man’s claim reopens too.\nThe eraser goes down. “Next they will want my reason for being rescued.”',
          ),
          effects: [
            { kind: 'credits', amount: 40 },
            { kind: 'trace', amount: 4 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '접수기가 추가 생존자를 확인했다며 당신의 상담 번호를 만든다.\n복만이 옆 의자를 빼 준다. 의자 밑에는 이미 연장 신청서가 있다.',
            'The terminal identifies an additional survivor and assigns you a case number.\nBok-man pulls out the next chair. An extension form is already waiting beneath it.',
          ),
          effects: [{ kind: 'trace', amount: 7 }],
        },
      },
      {
        label: t('복만의 남은 비상 꾸러미를 산다', 'Buy one of Bok-man’s remaining emergency kits'),
        hint: t('−20 ₵ · 소모품 1개 · 인간성 +1', '−20 ₵ · 1 consumable · Humanity +1'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '복만이 좌판 밑에서 꾸러미를 꺼내고 받은 돈으로 접수기 사용 시간을 늘린다.\n지우개 가루를 턴 뒤 생존 사유 칸에 ‘끌어 올려 줬음’이라고 쓴다.',
            'Bok-man fetches a kit from beneath the stall and uses the money to extend the terminal session.\nAfter brushing away the eraser crumbs, the dockhand writes, “Someone pulled me out.”',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('복만의 말을 대신 적어 진술을 남긴다', 'Write down Bok-man’s account as a witness'),
        hint: t('추적 +2 · 인간성 +1', '+2 Trace · Humanity +1'),
        success: {
          text: t(
            '복만이 끌어 올려진 순간을 말하고 당신이 받아 적는다. 접수기가 당신 이름도 저장한다.\n“이번에는 지우지 말죠.” 복만이 지우개를 주머니에 넣는다.',
            'Bok-man describes being pulled out while you write. The terminal saves your name too.\n“Let us leave it this time.” The dockhand pockets the eraser.',
          ),
          effects: [
            { kind: 'trace', amount: 2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_bottle_ring',
    acts: [4],
    route: 'sea_4',
    title: t('입구가 젖었다', 'Wet at the Mouth'),
    image: 'v2/events/sea4_ev_bottle_ring.webp',
    gmHints: ['혼자 들어간 도크 계측실', '거꾸로 선 빈 병', '벽의 지워진 수심 눈금'],
    text: t(
      '혼자 들어간 계측실에서 병을 들어 올린다. 거꾸로 놓였던 입구 자리에 젖은 고리가 남는다.\n벽의 수심 눈금은 긁혀 나갔다. 아래쪽 숫자 몇 개가 책상 뒤에 남아 있다.\n“비는 여기까지 못 들어오는데.” 당신이 마른 손가락으로 고리의 안쪽을 짚는다.',
      'Alone in the measuring room, you lift a bottle. Its upturned mouth leaves a wet ring on the bench.\nThe depth scale has been scraped from the wall. A few low numbers survive behind the desk.\n“Rain cannot get in here.” You touch the inside of the ring with a dry fingertip.',
    ),
    options: [
      {
        label: t('깨진 테두리를 따라 눈금 간격을 옮긴다', 'Use the chipped rim to reconstruct the scale'),
        hint: t('−3 HP · 카드 강화 1장 · 통찰 +1', '−3 HP · upgrade 1 card · Insight +1'),
        success: {
          text: t(
            '유리 끝에 손가락이 베인다. 남은 숫자의 간격을 옮기자 지워진 높이가 잡힌다.\n당신은 그 간격으로 거리 재는 동작을 다시 맞춘다.',
            'The glass cuts your finger. Transferring the gaps between the remaining numbers gives you the missing height.\nYou recalibrate a practiced movement against the recovered intervals.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('유리 조각으로 문밖 감시등을 비껴 비춘다', 'Use a glass shard to divert the surveillance light'),
        hint: t('−5 HP · 추적 −6 · 회복력 +1', '−5 HP · −6 Trace · Resilience +1'),
        success: {
          text: t(
            '바닥에 대고 깨뜨린 유리가 손등을 긁는다. 큰 조각을 창턱에 끼운다.\n감시등이 반사광을 따라 돌아간 사이 계측실을 빠져나온다.',
            'Glass scrapes your hand as you break it against the floor. You wedge a large shard onto the sill.\nThe surveillance light turns toward the reflection. You leave while it follows.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: -6 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_classroom',
    acts: [4],
    route: 'sea_4',
    title: t('그림에 없는 물', 'Water Missing from the Picture'),
    image: 'v2/events/sea4_ev_classroom.webp',
    gmHints: ['야간 교사 혜주의 항구 그림', '배 밑을 덮은 갈색 분필', '그림 뒷면의 학생 이름'],
    text: t(
      '야간 교사 혜주가 아이의 항구 그림 아래쪽을 갈색 분필로 덮는다. 종이에서 가루가 떨어진다.\n배의 밑바닥에는 파란색이 조금 남아 있다. 그림 뒷면에는 학생 이름이 적혔다.\n“아이는 흙이라고 했어요. 그럼 왜 파란색부터 칠했을까.” 혜주가 출석 검사 카메라를 올려다본다.',
      'Hye-ju covers the bottom of a child’s harbor drawing with brown chalk. Powder falls from the paper.\nA little blue remains beneath the hull. The pupil’s name is written on the back.\n“The child says dirt. Why start with blue?” The night teacher looks up at the attendance camera.',
    ),
    options: [
      {
        label: t('원래 그림을 내 이름으로 전시한다', 'Exhibit the original under your own name'),
        hint: t('추적 +5 · 통찰 +1 · 인간성 +1', '+5 Trace · Insight +1 · Humanity +1'),
        success: {
          text: t(
            '갈색 가루를 털어 내고 학생 이름을 가린다. 그림 아래에 당신 이름을 붙인다.\n카메라가 전시물을 읽는 동안 혜주는 파란 분필을 서랍 맨 위에 놓는다.',
            'You brush away the brown powder and cover the pupil’s name with your own.\nWhile the camera reads the exhibit, Hye-ju moves the blue chalk to the top drawer.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'axis', axis: 'insight', amount: 1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('그림은 덮고 학생 이름을 검사판에서 뗀다', 'Cover the drawing and remove the pupil’s name from inspection'),
        hint: t('+10 ₵ · HP −3 · 추적 −3 · 통찰 −1 · 인간성 +1', '+10 ₵ · −3 HP · −3 Trace · Insight −1 · Humanity +1'),
        success: {
          text: t(
            '검사판의 날카로운 테두리에 손이 긁힌다. 이름표를 빼고 갈색 종이를 다시 붙인다.\n혜주가 원본을 수업 공책 사이에 넣는다. 카메라에는 마른 땅 그림만 남는다.',
            'The inspection board’s sharp edge cuts your hand. You remove the name strip and replace the brown cover.\nHye-ju hides the original inside a lesson book. The camera sees only dry ground.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -3 },
            { kind: 'axis', axis: 'insight', amount: -1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_brake',
    acts: [4],
    route: 'sea_4',
    title: t('배가 밀 때 잡는 것', 'For When the Ship Pushes'),
    image: 'v2/events/sea4_ev_brake.webp',
    gmHints: ['정비공 차돌의 걸린 제동판', '빈 도크를 향한 완충 장치', '빠지지 않는 착용형 보조장치'],
    text: t(
      '정비공 차돌이 완충 장치의 제동판을 발로 누른다. 판이 반쯤 돌아가다 쇳소리를 낸다.\n장치 앞에는 배가 닿을 높이까지 빈 공간이 이어진다.\n“배가 밀 때 잡는 거예요. 여긴 배가 온 적 없다던데.” 차돌이 판 뒤에 낀 착용형 보조장치를 가리킨다.',
      'Cha-dol steps on a dock buffer’s brake plate. It turns halfway and screeches.\nEmpty space stretches before it, up to the height where a hull would meet the buffer.\n“Holds when a ship pushes. They say no ship ever came here.” The mechanic points to a wearable support trapped behind the plate.',
    ),
    options: [
      {
        label: t('제동판을 들어 보조장치를 꺼낸다', 'Lift the brake plate and recover the support'),
        hint: t('HP −4 · 고급 임플란트 · 회복력 +1', '−4 HP · uncommon implant · Resilience +1'),
        check: { stat: 'str', dc: 9 },
        success: {
          text: t(
            '판의 무게가 허리를 누른다. 차돌이 장치를 꺼내고 지지대를 꽂는다.\n기름을 닦은 장치가 당신 팔에 맞는다. 차돌이 잠금쇠를 확인해 준다.',
            'The plate bears down on your back. Cha-dol retrieves the support and inserts a brace.\nCleaned of grease, the device fits your arm. The mechanic checks its latch.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '제동판이 돌아와 당신을 벽에 밀어붙인다. 차돌이 비상 받침을 차 넣는다.\n판이 다시 멈출 때까지 갈비뼈에서 숨이 짧게 샌다.',
            'The plate swings back and pins you against the wall. Cha-dol kicks in the emergency brace.\nYour breath comes in short bursts until the plate stops moving.',
          ),
          effects: [{ kind: 'hp', amount: -8 }],
        },
      },
      {
        label: t('정비된 예비 보조장치를 산다', 'Buy a serviced spare support'),
        hint: t('−50 ₵ · 일반 임플란트 1개 · 추적 −3', '−50 ₵ · 1 common implant · −3 Trace'),
        requires: { minCredits: 50 },
        success: {
          text: t(
            '차돌이 예비품을 맞춰 주고 정비 인력용 출구를 연다.\n당신이 안쪽 통로로 들어가자 바깥 점검등이 원래 자리로 돌아간다.',
            'Cha-dol fits the spare and opens the maintenance exit.\nAs you enter the inner passage, the exterior inspection light returns to its usual position.',
          ),
          effects: [
            { kind: 'credits', amount: -50 },
            { kind: 'implant', rarity: 'common' },
            { kind: 'trace', amount: -3 },
          ],
        },
      },
      {
        label: t('낡은 받침을 옮기고 정비 통로로 나간다', 'Carry the old braces and leave by the service passage'),
        hint: t('−2 HP · 추적 −2 · +10 ₵', '−2 HP · −2 Trace · +10 ₵'),
        success: {
          text: t(
            '받침의 거친 손잡이가 손바닥을 벗긴다. 차돌이 정비 통로 안쪽에 내려놓으라고 한다.\n당신은 점검등을 등진 채 통로 끝으로 빠져나간다.',
            'A rough brace handle scrapes your palm. Cha-dol directs you to stack it inside the service passage.\nYou leave through the far end, behind the inspection light.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'trace', amount: -2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_ration_scale',
    acts: [4],
    route: 'sea_4',
    title: t('올라온 만큼 덜어 낸다', 'Subtract What Rises'),
    image: 'v2/events/sea4_ev_ration_scale.webp',
    gmHints: ['취사공 영도의 낡은 배식 저울', '물통 무게가 포함된 옛 계산법', '사용 흔적이 남은 빈 연결관'],
    text: t(
      '취사공 영도가 배식 저울을 영점에 맞춘다. 그릇을 치워도 바늘이 조금 올라간다.\n저울 옆 연결관은 막혀 있다. 오래된 계산 쪽지에는 물통 무게를 빼라고 적혔다.\n“어머니는 저 통을 매일 채웠다는데, 난 통도 본 적 없어요.” 영도가 당신 쪽으로 쪽지를 돌린다.',
      'Yeong-do zeros the serving scale. The needle rises a little even after the bowl is removed.\nA connecting pipe beside it has been capped. An old calculation says to subtract the water tank’s weight.\n“Mother filled that tank every day. I cannot even remember the tank.” The cook turns the calculation toward you.',
    ),
    options: [
      {
        label: t('재료비를 내고 옛 계산으로 배식량을 맞춘다', 'Pay for ingredients and restore the old calculation'),
        hint: t('−20 ₵ · 일행 HP +10 · 통찰 +1', '−20 ₵ · party +10 HP · Insight +1'),
        requires: { minCredits: 20 },
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '빠진 통 무게를 따로 잡자 바늘이 그릇 무게와 맞는다. 영도가 제대로 된 양을 담는다.\n당신 일행이 식사를 마칠 때까지 저울은 같은 자리에 멈춰 있다.',
            'Accounting separately for the missing tank makes the needle match the bowl. Yeong-do serves full portions.\nThe scale holds steady until your group finishes eating.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'heal_party', amount: 10 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '중량 단위를 잘못 읽어 준비한 재료가 모자란다. 영도가 남은 양을 작은 그릇에 나눈다.\n재계량 경고가 뜨고 구내 카메라가 배식대를 향한다.',
            'You misread the weight unit and run short of ingredients. Yeong-do divides the food into smaller bowls.\nA reweighing alert appears. The works camera turns toward the counter.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'heal_party', amount: 4 },
            { kind: 'trace', amount: 3 },
          ],
        },
      },
      {
        label: t('정량 포장식을 사서 일행과 나눈다', 'Buy sealed portions for the group'),
        hint: t('−30 ₵ · 일행 HP +6 · 소모품 1개', '−30 ₵ · party heals 6 HP · 1 consumable'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '영도가 저울을 쓰지 않고 포장식을 꺼낸다. 당신 일행은 난방관 옆에 앉아 먹는다.\n남은 비상식 하나가 당신 가방에 들어간다.',
            'Yeong-do fetches sealed meals without using the scale. Your group eats beside the heating pipe.\nOne spare emergency portion goes into your bag.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'heal_party', amount: 6 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('식사 대신 막힌 연결관을 고정하는 일을 돕는다', 'Skip the meal and help secure the capped pipe'),
        hint: t('−2 HP · 회복력 +1 · +15 ₵', '−2 HP · Resilience +1 · +15 ₵'),
        success: {
          text: t(
            '연결관을 받치던 손목이 꺾인다. 당신은 잡는 위치를 바꾸고 영도가 조임쇠를 잠글 때까지 버틴다.\n배식이 끝난 뒤 빈 그릇을 치우며 손목을 천천히 편다.',
            'Your wrist twists beneath the pipe. You adjust your grip and hold while Yeong-do tightens the clamp.\nAfter serving ends, you clear empty bowls and slowly straighten your wrist.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('무거운 솥을 옮기고 남은 수프를 나눈다', 'Carry the heavy pot and share the remaining soup'),
        hint: t('−4 HP · 일행 HP +2', '−4 HP · party heals 2 HP'),
        success: {
          text: t(
            '솥 손잡이가 어깨를 당긴다. 영도가 바닥에 받침을 놓고 마지막 수프를 작은 그릇에 나눈다.\n당신 일행은 난방관 옆에서 그릇을 돌린다.',
            'The pot handle strains your shoulder. Yeong-do sets down a stand and divides the last soup into small bowls.\nYour group shares them beside the heating pipe.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'heal_party', amount: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_diving_board',
    acts: [4],
    route: 'sea_4',
    title: t('샤워장 바닥까지 삼 미터', 'Three Meters to the Shower Floor'),
    image: 'v2/events/sea4_ev_diving_board.webp',
    gmHints: ['목욕장 관리인 태식의 먼지떨이', '도장 아래 남은 수심 숫자', '바닥을 향해 튀어나온 발판'],
    text: t(
      '목욕장 관리인 태식이 높은 발판의 먼지를 턴다. 발판이 흔들릴 때마다 벽에서 가루가 떨어진다.\n벗겨진 도장 밑으로 ‘3m’가 나온다. 아래에는 물 빠진 직사각형 구덩이가 있다.\n“샤워장이라 배웠는데, 뛰어내릴 자리는 왜 있지.” 태식이 먼지떨이를 멈춘다.',
      'Tae-sik dusts a high springboard. Each wobble shakes powder from the wall.\n“3m” shows beneath the peeling paint. Below lies an empty rectangular basin.\n“They taught me this was a shower room. Why would you jump into it?” The bathhouse caretaker stops dusting.',
    ),
    options: [
      {
        label: t('점검등을 켜고 가려진 깊이 표시를 읽는다', 'Use the inspection light to read the covered depth marks'),
        hint: t('추적 +5 · 관찰 +1 · 통찰 +1', '+5 Trace · OBS +1 · Insight +1'),
        check: { stat: 'obs', dc: 9 },
        success: {
          text: t(
            '비스듬히 빛을 대자 덧칠 아래 숫자가 차례로 드러난다. 당신은 흔적의 높이를 구별하는 법을 익힌다.\n공공시설 점검등의 사용 위치가 관리망에 올라간다.',
            'Angled light brings out the buried figures in sequence. You learn to distinguish marks beneath the surface.\nThe public inspection light reports its location to the facility network.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'stat', stat: 'obs', amount: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '가루를 피해 물러서다 발판 지지대에 이마를 찧는다.\n충격 경고등이 켜지고 점검 카메라가 당신 얼굴을 비춘다.',
            'Backing away from the powder, you strike your forehead on the board support.\nAn impact warning comes on. The inspection camera lights your face.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: 7 },
          ],
        },
      },
      {
        label: t('구덩이 바닥의 정비구로 빠져나간다', 'Leave through the maintenance opening in the basin'),
        hint: t('−4 HP · 추적 −5 · +15 ₵', '−4 HP · −5 Trace · +15 ₵'),
        success: {
          text: t(
            '내려가는 철제 손잡이가 손바닥을 벗긴다. 태식이 위에서 정비구 방향을 짚는다.\n구덩이 벽이 당신을 가린 채 뒤편 배수실까지 이어진다.',
            'The iron handholds scrape your palms on the way down. Tae-sik points toward the opening from above.\nThe basin wall conceals you all the way to the rear drainage room.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: -5 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_export_index',
    acts: [4],
    route: 'sea_4',
    title: t('반출 전의 무게', 'Weight Before Removal'),
    image: 'v2/events/sea4_ev_export_index.webp',
    gmHints: ['세관 계산원의 종이 롤', '품목 칸이 잘린 반출 내역', '선석 무게에서 빠진 큰 수'],
    text: t(
      '세관 계산원이 종이 롤을 발로 고정하고 합계를 다시 낸다. 계산기에서 같은 경고음이 난다.\n품목 칸은 잘려 나갔고 반출 전후의 무게만 남았다. 차이는 선석 여러 개를 채울 만큼 크다.\n“빈 항구였으면 이렇게 가벼워질 수가 없는데.” 계산원이 잘린 가장자리를 맞댄다.',
      'A customs accountant pins a paper roll under one foot and adds the total again. The calculator repeats its warning.\nThe item column has been cut away. Only weights before and after removal remain. The difference could fill several berths.\n“An empty harbor cannot lose this much weight.” The accountant aligns the cut edges.',
    ),
    options: [
      {
        label: t('감사 단말에서 남은 수치를 대조한다', 'Compare the surviving figures on the audit terminal'),
        hint: t('추적 +6 · 카드 강화 2 · 통찰 +1', '+6 Trace · upgrade 2 · Insight +1'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t(
            '누락된 중량을 넣자 하중 계산 두 줄이 바로잡힌다. 당신은 힘을 나눠 쓰는 순서를 수정한다.\n감사 단말이 열람자를 기록한다. 품목 이름 칸은 끝내 비어 있다.',
            'Restoring the missing weight corrects two load calculations. You revise how you distribute force.\nThe audit terminal records its reader. The item name remains blank.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'upgrade_card', count: 2 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '단위를 바꾸는 순간 제한 열람창이 열린다. 당신 이름 옆에 감사 번호가 붙는다.\n계산원이 롤을 감는다. 경고음은 멈추지 않는다.',
            'Changing the unit opens a restricted-access window. An audit number appears beside your name.\nThe accountant rolls up the paper. The warning keeps sounding.',
          ),
          effects: [{ kind: 'trace', amount: 10 }],
        },
      },
      {
        label: t('대조 작업료를 내고 검증된 계산만 배운다', 'Pay for a review of the verified calculations'),
        hint: t('−40 ₵ · 카드 강화 1장 · 회복력 +1', '−40 ₵ · upgrade 1 card · Resilience +1'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '계산원이 종이 롤의 앞부분을 접고 남은 작업표를 펼친다. 무게중심을 잡는 순서가 나온다.\n당신은 책상 위 추로 순서를 익힌다. 잘린 부분은 접힌 채 남는다.',
            'The accountant folds away the beginning of the roll and opens a surviving work sheet. It shows how to balance a load.\nYou practice with desk weights. The cut section stays folded.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('책상 위 추를 옮겨 누락된 하중을 가늠한다', 'Move the desk weights to estimate the missing load'),
        hint: t('−2 HP · 통찰 +1 · +15 ₵', '−2 HP · Insight +1 · +15 ₵'),
        success: {
          text: t(
            '추 밑에 손가락이 눌린다. 계산원이 추를 받아 다른 쪽에 놓는다.\n몇 개를 더해도 저울은 기울어 있다. 당신은 잘린 칸이 작은 품목 하나는 아니었음을 안다.',
            'A weight traps your finger. The accountant shifts it to the other side.\nEven several more leave the scale tilted. The missing entry was no small item.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_pillow_seam',
    acts: [4],
    route: 'sea_4',
    title: t('뜨는 쪽을 안다', 'Which Side Floats'),
    image: 'v2/events/sea4_ev_pillow_seam.webp',
    gmHints: ['세탁공 숙자의 방수 베개', '안쪽으로 접힌 공기 주머니', '숙소 검사 전 마지막 수선'],
    text: t(
      '세탁공 숙자가 베개 솔기를 꿰맨다. 눌린 베개가 작은 숨소리를 내며 다시 부푼다.\n안에는 공기 주머니와 겨드랑이에 거는 끈이 있다. 숙자는 그 용도를 벌레막이라고 설명한다.\n“그런데 벌레 피할 때 왜 턱을 위로 들라고 했을까.” 바늘이 마지막 구멍을 지난다.',
      'Suk-ja stitches a pillow seam. The compressed pillow breathes softly as it fills again.\nInside are an air bladder and straps that fit beneath the arms. The laundry worker calls it an insect guard.\n“Then why did they tell us to keep our chins up?” The needle passes through the final hole.',
    ),
    options: [
      {
        label: t('수선비를 내고 숙자의 작업실에 숨는다', 'Pay for repairs and shelter in Suk-ja’s workroom'),
        hint: t('−20 ₵ · 추적 −6', '−20 ₵ · −6 Trace'),
        requires: { minCredits: 20 },
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '숙자가 당신 외투에 수선표를 달고 작업실 안쪽을 내준다.\n검사원이 수선 중 표시만 확인하고 지나갈 때까지 재봉틀이 돈다.',
            'Suk-ja attaches a repair ticket to your coat and gives you space inside the workroom.\nThe sewing machine runs until the inspector has checked the repair sign and passed.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'trace', amount: -6 },
          ],
        },
        failure: {
          text: t(
            '수선 접수 뒤에 숙소 이용 번호를 묻는다. 당신이 대답하기 전에 검사원이 문을 연다.\n숙자는 수선표를 끝까지 꿰맨다.',
            'After accepting the repair, Suk-ja asks for your lodging number. The inspector opens the door before you answer.\nThe laundry worker finishes stitching on the ticket.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('굳은 솜을 뜯어내고 일행의 깔개를 만든다', 'Pull apart the hardened filling to make pads for the group'),
        hint: t('+10 ₵ · HP −3 · 일행 HP +4 · 인간성 +1', '+10 ₵ · −3 HP · party +4 HP · Humanity +1'),
        success: {
          text: t(
            '굳은 솜 사이 철심이 손가락을 찌른다. 숙자가 풀린 솜을 깨끗한 천에 나눠 넣는다.\n당신 일행은 새 깔개 위에서 눌린 관절을 편다.',
            'A wire inside the hardened filling punctures your finger. Suk-ja divides the loosened stuffing into clean cloth covers.\nYour group rests sore joints on the new pads.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'heal_party', amount: 4 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('수선 바구니를 들고 뒷문까지 옮긴다', 'Carry the repair basket to the rear door'),
        hint: t('−2 HP · 추적 −2', '−2 HP · −2 Trace'),
        success: {
          text: t(
            '바구니에서 나온 바늘이 팔을 긁는다. 숙자가 수선물 아래로 바늘을 밀어 넣는다.\n당신은 바구니를 든 채 검사원과 반대쪽 문으로 나간다.',
            'A needle protruding from the basket scrapes your arm. Suk-ja tucks it beneath the repairs.\nCarrying the basket, you leave through the door opposite the inspector.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'trace', amount: -2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_memorial_stone',
    acts: [4],
    route: 'sea_4',
    title: t('옷을 짜던 손', 'Hands Wringing Clothes'),
    image: 'v2/events/sea4_ev_memorial_stone.webp',
    gmHints: ['유족 차인의 작은 추모석', '추락으로 고친 사망 장소', '글자 홈에 끼어 있는 흰 페인트'],
    text: t(
      '차인이 추모석의 사망 장소를 흰 페인트로 덮는다. 붓이 글자 홈에 걸린다.\n새 서류에는 도크 추락이라고 적혔다. 차인은 젖은 옷을 짜던 손만 기억난다고 한다.\n“장소를 고쳐야 숙소를 안 뺏긴대요.” 차인이 붓을 들고 빈 의자 하나를 바라본다.',
      'Cha-in paints over the place of death on a small memorial stone. The brush catches in the lettering.\nThe new certificate says a fall into the dock. Cha-in remembers only wringing out wet clothes.\n“They say correcting the place lets me keep the lodging.” Brush raised, the mourner looks at an empty chair.',
    ),
    options: [
      {
        label: t('원래 글자를 남기고 내 이름으로 이의를 낸다', 'Preserve the inscription and file an objection in your name'),
        hint: t('추적 +7 · 인간성 +1 · 통찰 +1', '+7 Trace · Humanity +1 · Insight +1'),
        success: {
          text: t(
            '당신 이름으로 이의 접수가 뜨자 차인이 붓을 내려놓는다. 마르기 전 페인트를 천으로 닦는다.\n홈 안의 장소가 다시 드러난다. 세관의 회신 요청은 당신에게 온다.',
            'When the objection appears under your name, Cha-in lowers the brush and wipes off the wet paint.\nThe place becomes legible again. Customs sends the request for a response to you.',
          ),
          effects: [
            { kind: 'trace', amount: 7 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('공개 표석을 떼고 숙소 안으로 옮긴다', 'Remove the public marker and carry it into the lodging'),
        hint: t('+10 ₵ · HP −4 · 추적 −4 · 통찰 −1 · 인간성 +1', '+10 ₵ · −4 HP · −4 Trace · Insight −1 · Humanity +1'),
        success: {
          text: t(
            '돌 밑에 손이 눌린다. 차인이 받침을 빼고 문을 열어 준다.\n밖에서는 이름과 장소가 사라진다. 안에서는 차인이 페인트 묻은 면을 벽으로 돌려 세운다.',
            'The stone traps your hand. Cha-in removes the base and opens the door.\nOutside, the name and place are gone. Inside, the mourner turns the painted face toward the wall.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'insight', amount: -1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea4_ev_compass',
    acts: [4],
    route: 'sea_4',
    title: t('남쪽을 덧칠했다', 'South Has Been Painted Over'),
    image: 'v2/events/sea4_ev_compass.webp',
    gmHints: ['혼자 확인하는 출항 나침반', '유리 안쪽에 덧그린 방위', '남쪽 문 아래의 두 겹 화살표'],
    text: t(
      '출항 대기실에서 혼자 나침반 덮개를 연다. 바늘이 유리에 닿으며 가늘게 긁힌다.\n남쪽 표시는 안쪽 유리에 다시 그려져 있다. 벽 화살표도 같은 방향으로 한 번 꺾였다.\n“바늘까지 돌리지는 못했네.” 당신이 덧칠 아래 남은 옛 표시를 손톱으로 짚는다.',
      'Alone in the departure room, you open a compass case. The needle scratches faintly against the glass.\nSouth has been repainted on the inner face. An arrow on the wall has been turned through the same angle.\n“Could not turn the needle too.” Your nail finds the old mark beneath the paint.',
    ),
    options: [
      {
        label: t('눌린 바늘축을 펴고 실제 방향을 맞춘다', 'Straighten the spindle and restore the true bearing'),
        hint: t('HP −3 · 민첩 +1 · 통찰 +1', '−3 HP · AGI +1 · Insight +1'),
        check: { stat: 'agi', dc: 9 },
        success: {
          text: t(
            '튀어나온 축이 손끝을 찌른다. 힘을 빼고 두 번 나눠 누르자 바늘이 자유롭게 돈다.\n당신은 손놀림을 다시 익힌다. 바늘은 벽의 출항 방향을 지나 다른 문에서 멈춘다.',
            'The spindle pricks your fingertip. Two lighter adjustments let the needle turn freely.\nYou repeat the finer movement. The needle passes the painted departure arrow and settles toward another door.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'stat', stat: 'agi', amount: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '축이 튀면서 갈라진 덮개가 엄지 아래를 깊게 긋는다.\n당신이 손을 감싸는 동안 바늘은 덧칠한 남쪽과 옛 표시 사이에서 떤다.',
            'The spindle springs loose and the cracked cover cuts beneath your thumb.\nWhile you wrap your hand, the needle trembles between the painted south and the old mark.',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('출항 안내를 재생하며 표지의 모순을 익힌다', 'Play the departure briefing and study the conflicting signs'),
        hint: t('추적 +4 · 고급 카드 선택 · 회복력 +1', '+4 Trace · uncommon card pick · Resilience +1'),
        success: {
          text: t(
            '재생기가 당신의 열람을 기록한다. 안내 음성은 닫힌 문을 향하라고 세 번 말한다.\n당신은 실제 출구를 눈으로 확인하며 잘못된 지시에 대응할 순서를 고른다.',
            'The player records your viewing. Three times, the briefing directs you toward a sealed door.\nKeeping the real exit in sight, you choose a response for working around false instructions.',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'card_choice', rarity: 'uncommon', count: 3 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
]

export const SEA4_EVENT_ART: Record<string, string> = {
  sea4_ev_hook: 'Painterly cyberpunk realism, eye-level, natural proportions. One middle-aged Korean dock rigger in worn work clothes kneeling beside a massive crane hook, holding a pry bar beside a trapped lunch box. Dry concrete dock, intact paint above the rusted underside. One restrained effect: a few falling rust flakes. No other people, no text in the image.',
  sea4_ev_tide_table: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean harbor duty clerk at a cramped desk, pencil poised over an old tide table beside a mechanical alarm clock. Window overlooking dusty stairs. One restrained effect: a faint amber alarm light. Paper markings illegible, no other people, no text in the image.',
  sea4_ev_work_boots: 'Painterly cyberpunk realism, eye-level, natural proportions. One worn rubber work boot hanging upside down from a dry dock railing, repaired lining visible at the opening. Empty dock wall receding behind it. One restrained effect: a thin fall of dust from the sole. No people, no text in the image.',
  sea4_ev_buoy: 'Painterly cyberpunk realism, eye-level, natural proportions. One battered navigation buoy lying in a completely dry concrete channel, longitudinal scratches on its body and a taut mooring line leading inland. One restrained effect: a small pool of inspection light across the scratches. No people, no text in the image.',
  sea4_ev_high_cot: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean lodging caretaker fitting a screw beneath a bed fixed at shoulder height inside an empty shipping container. A pale horizontal stain near the ceiling, dusty floor and folded ladder. One restrained effect: a slight glint on the screw. No other people, no text in the image.',
  sea4_ev_supper_seat: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean lodging caretaker lowering a dining chair from a wall bracket in a modest dockworkers dining room. Small soup burner and old heating pipes in the background. One restrained effect: a narrow wisp of steam at a leaking valve. No other people, no text in the image.',
  sea4_ev_seized_coat: 'Painterly cyberpunk realism, eye-level, natural proportions. One older Korean tailor examining the cuff of a repaired coat laid across a counter. A blank seizure tag catches loose threads beside a closed collection hatch. One restrained effect: a muted amber timer light. No other people, no letters or readable markings, no text in the image.',
  sea4_ev_salt_wall: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean industrial medic scraping a narrow waist-high band of salt crystals from a wall into a shallow dish. An empty infirmary cot and capped freshwater pipe in the background. One restrained effect: a small fall of white crystal grains. No other people, no text in the image.',
  sea4_ev_wet_roster: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean attendance clerk carefully separating damp roster pages with blotting paper at an old harbor desk. Dry window frame and silent copier behind the desk. One restrained effect: a subdued wet sheen along the bottom page. All writing illegible, no other people, no text in the image.',
  sea4_ev_roster_window: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean customs reception clerk behind plain glass, hand resting uncertainly above a rubber stamp beside a rotating submission tray. A schematic harbor map with an obvious blank gap but no labels. One restrained effect: a small green terminal light. No other people, no text in the image.',
  sea4_ev_survivor_allowance: 'Painterly cyberpunk realism, eye-level, natural proportions. One elderly Korean dock pensioner erasing a form at a narrow claims desk, tired face carrying a dry hint of amusement. A portable foghorn tucked beneath the desk. One restrained effect: a dim red rejection light on the terminal. All forms blank or illegible, no other people, no text in the image.',
  sea4_ev_bottle_ring: 'Painterly cyberpunk realism, eye-level, natural proportions. One empty glass bottle standing mouth down on a dry wooden measuring-room bench, a narrow damp ring around its lip. Scraped plaster wall and desk shadow in the background. One restrained effect: a tiny condensation bead at the rim. No people, no markings, no text in the image.',
  sea4_ev_classroom: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean night-school teacher holding brown chalk over a childlike harbor drawing, a small blue patch still visible beneath the drawn hull. Modest empty classroom with a plain attendance camera. One restrained effect: a few suspended chalk grains. No other people, no letters or numbers, no text in the image.',
  sea4_ev_brake: 'Painterly cyberpunk realism, eye-level, natural proportions. One stocky Korean dock mechanic pressing a jammed buffer brake plate with a work boot, pointing toward a trapped wearable support device. A deep empty dock beyond the buffer. One restrained effect: a faint oil sheen on the plate. No other people, no text in the image.',
  sea4_ev_ration_scale: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean canteen cook adjusting an old mechanical serving scale beside a capped pipe where a tank once stood. Bare counter and a plain bowl. One restrained effect: a small wisp of steam from the bowl. Scale face unmarked, no other people, no text in the image.',
  sea4_ev_diving_board: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean bathhouse caretaker holding a duster beside an old springboard over a completely drained rectangular basin. Peeling paint exposes traces of an old depth scale without readable characters. One restrained effect: a faint drift of plaster powder. No other people, no text in the image.',
  sea4_ev_export_index: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean customs accountant aligning the cut edges of a long paper roll across a utilitarian desk, one shoe holding the trailing paper in place. A calculator and plain audit terminal nearby. One restrained effect: a tiny amber warning light. All entries illegible, no other people, no text in the image.',
  sea4_ev_pillow_seam: 'Painterly cyberpunk realism, eye-level, natural proportions. One older Korean laundry worker stitching a waterproof pillow, an air bladder and underarm straps partly exposed at the seam. Small dock lodging workroom with folded cloth. One restrained effect: a slight reflected glint on the sewing needle. No other people, no text in the image.',
  sea4_ev_memorial_stone: 'Painterly cyberpunk realism, eye-level, natural proportions. One Korean mourner paused with a paintbrush above a small memorial stone beside an empty chair outside dock lodging. White paint partly covers shallow carved grooves. One restrained effect: a single fresh paint drip. Carving unreadable, no other people, no text in the image.',
  sea4_ev_compass: 'Painterly cyberpunk realism, eye-level, natural proportions. One old departure-room compass with its case open, a bent spindle beneath glass bearing overlapping painted direction marks without letters. A sealed doorway blurred in the background. One restrained effect: a narrow reflected highlight along the needle. No people, no text in the image.',
}