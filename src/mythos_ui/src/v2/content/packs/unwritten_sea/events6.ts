// Pack 5: Act 6 scenes of The Unwritten Sea.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const SEA6_EVENTS: EventDef[] = [
  {
    id: 'sea6_ev_hook_transfer',
    acts: [6],
    route: 'sea_6',
    title: t('빌린 장비', 'Borrowed Equipment'),
    image: 'v2/events/sea6_ev_hook_transfer.webp',
    gmHints: ['하역조 태석의 반납 작업', '난간에 걸린 녹슨 크레인 후크', '젖은 장갑을 따로 두는 등대단'],
    text: t(
      '철탑 길 입구에서 하역조 태석이 녹슨 크레인 후크를 당긴다. 끝이 난간 아래에 걸려 쇳소리만 난다.\n태석이 젖은 장갑을 벗어 사람 발길에서 먼 쪽에 놓는다. 안감에서 낯선 아이의 울음이 새어 나온다.\n“장비는 오늘 반납인데, 저 장갑은 등대단이 말려 준대요.”',
      'At the tower walkway, Tae-seok from the Longshore Crew pulls on a rusty crane hook. Its tip catches beneath the rail with a metallic knock.\nHe leaves his wet gloves well away from passing feet. A child can be heard crying inside the lining.\n“The rig is due back today. The Keepers said they would dry the gloves.”',
    ),
    options: [
      {
        label: t('난간을 받치고 후크를 들어 뺀다', 'Brace the rail and lift the hook free'),
        hint: t('HP −4 · +40 ₵ · 회복력 +1', '−4 HP · +40 ₵ · Resilience +1'),
        check: { stat: 'str', dc: 8 },
        success: {
          text: t(
            '난간이 팔뚝을 벗긴다. 후크가 빠지자 태석이 마른 손으로 공임을 나눈다.\n“장갑 만지지 마요. 아까부터 제 애가 아닌 애를 찾게 돼서.”',
            'The rail scrapes your forearm. With the hook free, Tae-seok divides the pay using his bare, dry hands.\n“Leave the gloves. They keep making me look for a child who is not mine.”',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'credits', amount: 40 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '후크가 돌아가며 어깨를 친다. 태석이 비상 정지를 누르고 철탑의 점검등이 켜진다.\n“손부터 빼요. 장비는 기다려도 돼요.”',
            'The hook swings into your shoulder. Tae-seok hits the emergency stop, bringing on the tower inspection lights.\n“Get your hand clear. The equipment can wait.”',
          ),
          effects: [
            { kind: 'hp', amount: -7 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('태석의 마른 작업 동작을 배운다', 'Practice with the dry rig'),
        hint: t('−30 ₵ · 카드 1장 강화', '−30 ₵ · upgrade 1 card'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '연습 장비 대여료를 내고 태석이 잡아 주는 각도로 손목을 돌린다. 젖은 장비 없이도 같은 무게가 움직인다.\n“등대단이 가르쳐 준 거예요. 손을 물에서 멀리 두는 법.”',
            'You pay to rent the practice rig and turn your wrist to the angle Tae-seok shows you. The weight moves without touching the wet equipment.\n“The Keepers taught us. Keeps your hands away from the water.”',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'upgrade_card', count: 1 },
          ],
        },
      },
      {
        label: t('마른 공구를 정리하고 품삯을 나눈다', 'Sort the dry tools and share the pay'),
        hint: t('HP −2 · +10 ₵ · +10 ₵', '−2 HP · +10 ₵ · +10 ₵'),
        success: {
          text: t(
            '공구함 모서리에 손등이 긁힌다. 태석이 마른 공구를 받아 넣고 남은 공임을 조금 건넨다.\n“장갑은 그대로 둬요. 저건 따로 가져갈게요.”',
            'The tool chest scrapes your hand. Tae-seok puts away the dry tools and gives you a little of the remaining pay.\n“Leave the gloves there. I will take those separately.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'credits', amount: 10 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_coat_hem',
    acts: [6],
    route: 'sea_6',
    title: t('접어 올린 단', 'Turned-Up Hems'),
    image: 'v2/events/sea6_ev_coat_hem.webp',
    gmHints: ['수선사 은실의 짧은 작업대', '바닥에 닿는 교대복 자락', '젖은 옷을 벗는 순서'],
    text: t(
      '수선사 은실이 교대복의 밑단을 접는다. 재봉기 발판을 밟을 때마다 천 아래로 물받이가 덜컹거린다.\n새로 온 등대단원의 옷은 바닥에 닿는다. 은실이 아직 마른 부분에 바늘을 꽂는다.\n“기도할 때 무릎 꿇으면 자락이 젖어요. 그래서 여기선 서서 해요.”',
      'Eun-sil turns up the hem of a shift coat. The catch tray rattles beneath her sewing-machine pedal.\nThe new Keeper’s coat trails on the floor. She pins a section that is still dry.\n“Kneeling gets the hems wet. That is why they pray standing here.”',
    ),
    options: [
      {
        label: t('재봉 속도에 맞춰 천을 넘긴다', 'Feed the cloth at her sewing pace'),
        hint: t('HP −3 · 카드 강화 1 · 회복력 +1', '−3 HP · upgrade 1 · Resilience +1'),
        check: { stat: 'agi', dc: 8 },
        success: {
          text: t(
            '손등이 바늘에 긁히지만 천은 젖은 부분에 닿지 않는다. 반복하던 손동작이 짧아진다.\n“벗을 때도 그 순서예요. 마른 손부터 안으로.”',
            'The needle scratches your hand, but the cloth stays clear of the wet section. Your movements become shorter with practice.\n“Same order when you take it off. Dry hands go inside first.”',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '천을 늦게 놓아 바늘이 손가락을 찌른다. 은실이 기계를 멈추고 마른 거즈를 누른다.\n“바닥 것은 제가 치워요. 손 내려놓지 마요.”',
            'You release the cloth too late and the needle catches your finger. Eun-sil stops the machine and presses on dry gauze.\n“I will clean the floor. Keep that hand up.”',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('일행의 젖은 옷을 맡기고 처치를 받는다', 'Have the group’s wet clothes treated'),
        hint: t('−30 ₵ · 일행 HP +6 · 인간성 +1', '−30 ₵ · party heals 6 HP · Humanity +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '은실이 깨끗한 옷을 먼저 내주고 벗은 옷을 집게로 옮긴다. 일행이 차례로 손과 발을 씻는다.\n“이쪽 물은 위에서 받아요. 바닥으로 내려간 건 다시 안 써요.”',
            'Eun-sil hands out clean clothes before lifting the discarded ones with tongs. Everyone washes their hands and feet in turn.\n“This water comes from above. Once it reaches the floor, we never use it again.”',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'heal_party', amount: 6 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('마른 천을 나르고 작업대 뒤로 빠진다', 'Carry the dry cloth and leave behind the workbench'),
        hint: t('HP −2 · 추적 −2 · +10 ₵', '−2 HP · −2 Trace · +10 ₵'),
        success: {
          text: t(
            '천 꾸러미를 넘기다 거친 선반에 팔이 긁힌다. 은실이 작업대 뒤의 가림막을 열어 감시등을 피해 보내 준다.\n“마른 건 위에 놓고요. 그 뒤로 나가요.”',
            'The rough shelf scrapes your arm as you pass up the cloth. Eun-sil opens the screen behind her bench so you can avoid the watch lights.\n“Dry things go up here. You can leave through the back.”',
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
    id: 'sea6_ev_missing_hours',
    acts: [6],
    route: 'sea_6',
    title: t('도시가 비우는 시간', 'When the City Empties'),
    image: 'v2/events/sea6_ev_missing_hours.webp',
    gmHints: ['조석표에 겹친 도시 정리 시간', '연필 끝으로 짚는 유입 시각', '달보다 늦게 차오르는 물'],
    text: t(
      '해저 케이블 기지에서 당직자가 조석표에 시각을 덧쓴다. 벽 안쪽으로 물이 쏟아지는 소리가 난다.\n당직자가 달 표시를 지우고 네오서울의 야간 기록 정리 시간을 적는다.\n“도시가 지우는 날은 물이 더 들어와요. 달만 보고 교대하면 늦어요.”',
      'At the subsea cable station, the duty operator adds times to a tide table. Water rushes somewhere inside the wall.\nThe operator crosses out a moon symbol and writes in Neo-Seoul’s nightly record purge.\n“More comes down when the city deletes things. A lunar schedule leaves us late for the watch.”',
    ),
    options: [
      {
        label: t('도시 정리 시간과 유입 간격을 맞춘다', 'Match the purge times to the incoming surges'),
        hint: t('추적 +4 · 고급 카드 선택 · 통찰 +1', '+4 Trace · uncommon card pick · Insight +1'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t(
            '접속 기록에 당신 위치가 남는다. 지워진 구역의 수만큼 다음 유입이 늦어지는 규칙을 찾는다.\n“그 계산이면 다음 교대 전에 움직일 수 있겠어요.”',
            'Your connection leaves a location record. You find how the number of erased districts predicts the delay before each surge.\n“With that calculation, you can move before the next watch.”',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'card_choice', rarity: 'uncommon', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '도시 시각과 항만 시각을 잘못 겹친다. 점검창이 열리는 순간 뜨거운 배수가 손목을 친다.\n“한 시간 차이예요. 여기 시계는 아직 옛 항만 시각이라서.”',
            'You align the city and harbor clocks incorrectly. Hot runoff catches your wrist as the inspection hatch opens.\n“One hour out. This station still keeps the old harbor time.”',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('차단된 낮은 점검로를 기어서 지난다', 'Crawl through the isolated inspection passage'),
        hint: t('HP −3 · 추적 −5 · 회복력 +1 · +10 ₵', '−3 HP · −5 Trace · Resilience +1 · +10 ₵'),
        success: {
          text: t(
            '좁은 바닥이 무릎을 긁는다. 당직자가 바깥에서 문을 닫자 유입 소리와 감시등이 함께 끊긴다.\n“그 길은 사람들이 쉬라고 따로 막아 뒀어요.”',
            'The low floor scrapes your knees. When the operator shuts the door, the rushing water and inspection lights disappear together.\n“We isolated that passage so people would have somewhere to rest.”',
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
    id: 'sea6_ev_inward_buoy',
    acts: [6],
    route: 'sea_6',
    title: t('육지 쪽으로', 'Toward Land'),
    image: 'v2/events/sea6_ev_inward_buoy.webp',
    gmHints: ['안쪽을 향한 항로 표지 부표', '볼트를 푸는 표지 정비공', '돌아가는 사람만 비추는 불빛'],
    text: t(
      '표지 정비공이 항로 표지 부표의 고정 볼트를 푼다. 불빛은 바다를 등지고 철탑 길 입구를 비춘다.\n정비공이 발로 받침을 밀어 빛을 조금 더 육지 쪽으로 돌린다.\n“들어오는 배는 없어요. 돌아가는 사람이 발을 헛디뎌요.”',
      'A marker technician loosens the mounting bolts on a navigation buoy. Its light faces away from the sea, toward the walkway entrance.\nA foot shifts the base, turning the beam farther inland.\n“No ships coming in. Plenty of people missing their footing on the way back.”',
    ),
    options: [
      {
        label: t('불빛이 끊기는 난간 틈을 찾는다', 'Find the gap the light misses'),
        hint: t('+30 ₵ · 추적 +3 · 통찰 +1', '+30 ₵ · +3 Trace · Insight +1'),
        check: { stat: 'obs', dc: 8 },
        success: {
          text: t(
            '끊어진 난간 앞에서만 발판이 어두워진다. 당신이 서서 위치를 잡아 주는 동안 점검 카메라가 얼굴을 담는다.\n“거기였군요. 위험 수당은 같이 받아요.”',
            'The beam misses the footing beside a broken rail. You mark the spot with your body while an inspection camera records your face.\n“There it is. You get a share of the hazard pay.”',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'trace', amount: 3 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '안개 속 반사를 발판으로 잘못 본다. 정강이가 난간에 부딪히고 구조 확인등이 당신을 따라 켜진다.\n“빛 말고 철판을 밟아요. 빛은 물에도 있어요.”',
            'You mistake a reflection in the fog for solid footing. Your shin hits the rail, and rescue lights track your position.\n“Step on the steel. Light can sit on water too.”',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
      {
        label: t('불빛 아래로 낮게 기어 돌아간다', 'Crawl back beneath the beam'),
        hint: t('HP −3 · 추적 −4 · 회복력 +1 · +10 ₵', '−3 HP · −4 Trace · Resilience +1 · +10 ₵'),
        success: {
          text: t(
            '거친 이음매가 팔꿈치를 긁는다. 정비공이 당신 위로 빛을 올려 감시 시야에서 몸을 빼 준다.\n“등대단도 다 이쪽으로 퇴근해요.”',
            'The rough joints scrape your elbows. The technician raises the beam, leaving you below the cameras’ view.\n“The Keepers use this way home too.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_coffin_rent',
    acts: [6],
    route: 'sea_6',
    title: t('살아 있으면 대여료', 'Rent for the Living'),
    image: 'v2/events/sea6_ev_coffin_rent.webp',
    gmHints: ['하역조 길수의 임시 잠자리', '관 뚜껑의 압류 딱지', '돌아온 생존자의 장례 정산'],
    text: t(
      '하역조 길수가 관 뚜껑의 압류 딱지를 손톱으로 긁는다. 안쪽에는 베개 자국이 남아 있다.\n도시에서는 장례가 끝났고, 등대단 숙소에서는 길수 몫의 침대가 아직 나오지 않았다.\n“살아 있다고 했더니 관 대여료를 내래요.” 길수가 뚜껑을 다시 덮는다.',
      'Gil-su from the Longshore Crew picks at a seizure label on a coffin lid. A pillow has left an impression inside.\nThe city has held his funeral. The Keepers’ shelter has yet to find him a bed.\n“I told them I was alive. Now they want rent for the coffin.” He puts the lid back on.',
    ),
    options: [
      {
        label: t('살아 있는 숙박객으로 다시 접수시킨다', 'Register him again as a living guest'),
        hint: t('+40 ₵ · 추적 +5 · 인간성 +1', '+40 ₵ · +5 Trace · Humanity +1'),
        check: { stat: 'cha', dc: 7 },
        success: {
          text: t(
            '보증인 칸에 당신 이름이 남고 환급금이 나온다. 길수가 반을 건네며 관 속에서 베개를 꺼낸다.\n“이제 코 골아도 유족한테 연락 안 가겠네요.”',
            'Your name goes down as guarantor, and a refund arrives. Gil-su gives you half and retrieves his pillow.\n“Good. Snoring should stop triggering calls to my next of kin.”',
          ),
          effects: [
            { kind: 'credits', amount: 40 },
            { kind: 'trace', amount: 5 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '생존 확인용 문이 손등을 끼운다. 단말기가 당신까지 장례 정산 담당자로 등록한다.\n“그 칸은 상주래요. 아까 저도 눌렀어요.”',
            'The proof-of-life hatch closes on your hand. The terminal registers you to handle the funeral account as well.\n“That field makes you chief mourner. I pressed it earlier.”',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: 7 },
          ],
        },
      },
      {
        label: t('공용 휴게실 요금을 내고 함께 쉰다', 'Pay for the common room and rest together'),
        hint: t('−20 ₵ · 일행 HP +5 · 회복력 +1', '−20 ₵ · party heals 5 HP · Resilience +1'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '길수가 휴게실 난방을 켜고 일행에게 자리를 내준다. 접수대 뒤에는 아직 돌아오지 않은 사람의 식사가 놓여 있다.\n“등대단은 사망 통지 와도 밥을 하루 더 남겨요.”',
            'Gil-su switches on the common-room heater and makes space for everyone. A meal waits behind reception for someone still missing.\n“The Keepers hold a meal one more day, even after a death notice.”',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'heal_party', amount: 5 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('길수와 빈 상자를 나르고 품삯을 나눈다', 'Carry empty crates with Gil-su and split the pay'),
        hint: t('HP −2 · +10 ₵ · +10 ₵', '−2 HP · +10 ₵ · +10 ₵'),
        success: {
          text: t(
            '상자 모서리가 손바닥을 벗긴다. 길수가 운반비를 나눈 뒤 관 속 베개를 다시 편다.\n“오늘은 여기서 자고요. 침대 나오면 그때 반납하죠.”',
            'A crate edge scrapes your palm. Gil-su splits the carrying fee, then straightens the pillow in the coffin.\n“One more night here. I will return it when they find me a bed.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'credits', amount: 10 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_wet_names',
    acts: [6],
    route: 'sea_6',
    title: t('밖에서 읽어 주세요', 'Read Them Outside'),
    image: 'v2/events/sea6_ev_wet_names.webp',
    gmHints: ['대피실 앞의 젖은 명단', '종이를 얼굴에서 멀리 드는 관리인', '자기 이름을 듣고 싶어 하는 실종자'],
    text: t(
      '대피실 관리인이 젖은 명단을 얼굴에서 멀리 든다. 종이에서 떨어지는 물마다 다른 성이 들린다.\n문 안쪽에서는 잠든 사람이 자기 이름을 반복한다. 바깥 계단에는 이름을 찾으러 온 형상이 서 있다.\n“읽을 거면 밖에서요. 안에서는 이제 겨우 잠들었어요.”',
      'The shelter attendant holds a wet list away from her face. Each falling drop speaks a different family name.\nInside, a sleeper repeats their own name. On the outer steps, a figure waits to hear the name it has lost.\n“Outside, if you read it. They only just got to sleep in here.”',
    ),
    options: [
      {
        label: t('문을 닫고 바깥에서 이름을 읽는다', 'Close the door and read the names outside'),
        hint: t('추적 +8 · 인간성 +1', '+8 Trace · Humanity +1'),
        success: {
          text: t(
            '당신 목소리를 따라 계단 아래에서 얼굴들이 돌아본다. 등대의 순찰등도 그쪽으로 움직인다.\n“한 번만 더요.” 형상 하나가 자기 성을 되풀이한다.',
            'Faces turn beneath the steps at the sound of your voice. The lighthouse patrol lights turn with them.\n“Once more, please.” One figure repeats its family name.',
          ),
          effects: [
            { kind: 'trace', amount: 8 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('명단을 외부 보관칸에 넣고 문을 막는다', 'Store the list outside and secure the door'),
        hint: t('HP −3 · 추적 −4 · 회복력 +1 · +10 ₵', '−3 HP · −4 Trace · Resilience +1 · +10 ₵'),
        success: {
          text: t(
            '무거운 문을 밀다 손바닥이 까진다. 종이의 목소리가 벽 너머로 낮아지고 순찰등이 지나간다.\n“아침에 한 사람씩 확인할게요.” 관리인이 잠든 쪽으로 돌아간다.',
            'The heavy door scrapes your palm as you push it shut. The voices fade behind the wall, and the patrol lights pass.\n“We will check one person at a time in the morning.” The attendant returns to the sleepers.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_dry_sump',
    acts: [6],
    route: 'sea_6',
    title: t('같은 구덩이', 'The Same Sump'),
    image: 'v2/events/sea6_ev_dry_sump.webp',
    gmHints: ['혼자 들어간 배수 점검실', '펌프 진동에 떨리는 소금 결정', '하수관과 해저 케이블의 합류부'],
    text: t(
      '점검실에는 당신 혼자다. 도시 하수관과 해저 케이블이 같은 구덩이로 내려가고, 소금 결정이 펌프 진동에 떨린다.\n당신이 유입구 덮개를 민다. 물 표면에 도시에서 지워진 주소가 차례로 나타난다.\n“삭제한 것도 여기로 보냈군.” 펌프가 다시 돈다.',
      'You are alone in the inspection room. City drains and subsea cables descend into the same sump. Salt crystals tremble with the pump.\nYou shift the intake cover. Addresses erased from the city appear across the water in sequence.\n“So this is where the deletions went.” The pump starts again.',
    ),
    options: [
      {
        label: t('뜨거운 발판에서 펌프 순서를 고친다', 'Correct the pump sequence from the hot platform'),
        hint: t('HP −4 · 카드 제거 1 · 통찰 +1', '−4 HP · remove 1 card · Insight +1'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t(
            '발바닥이 달아오르는 동안 불필요한 왕복 동작을 줄인다. 몸에 밴 우회 동작도 하나 버린다.\n“한 번이면 되는 거였네.” 당신이 덮개를 닫는다.',
            'Heat builds beneath your soles as you eliminate the needless return cycle. You drop a wasteful movement from your own routine too.\n“One pass was enough.” You close the cover.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '역류 방지판이 닫히며 팔을 친다. 비상등이 켜지고 점검실 위치가 관제 화면에 뜬다.\n“다음 순서가 먼저였군.” 당신이 팔을 빼낸다.',
            'The backflow plate snaps against your arm. Emergency lights come on, reporting the room to control.\n“Wrong order.” You pull your arm clear.',
          ),
          effects: [
            { kind: 'hp', amount: -7 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('자동 정비함에서 절연 보조 장치를 산다', 'Buy an insulating aid from the service cabinet'),
        hint: t('−40 ₵ · 일반 임플란트 1개', '−40 ₵ · 1 common implant'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '결제가 끝나자 마른 서랍 하나가 열린다. 장치 포장에는 등대단의 손때가 묻은 장착 그림이 있다.\n“처음 오는 사람 몫도 뒀네.” 당신이 빈 서랍을 밀어 넣는다.',
            'Payment opens a dry drawer. The fitting diagram on the package is worn smooth by Keepers’ hands.\n“They stocked these for newcomers too.” You slide the drawer shut.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'implant', rarity: 'common' },
          ],
        },
      },
      {
        label: t('점검 기록을 남기고 안전 난간으로 돌아간다', 'Log the inspection and return to the safe rail'),
        hint: t('추적 +2 · 통찰 +1 · +10 ₵', '+2 Trace · Insight +1 · +10 ₵'),
        success: {
          text: t(
            '점검 단말기에 위치가 남는다. 난간 안쪽에서 유입 순서를 적으니 도시의 삭제 시각과 맞아떨어진다.\n“돌아가서도 이 시간은 기억해야겠네.” 당신이 덮개를 닫는다.',
            'The inspection terminal records your location. From behind the rail, you note that the inflow sequence matches the city purge times.\n“I need to remember these times back there too.” You close the cover.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 2 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_sealed_voice',
    acts: [6],
    route: 'sea_6',
    title: t('오늘은 열지 않고', 'Closed for Today'),
    image: 'v2/events/sea6_ev_sealed_voice.webp',
    gmHints: ['병을 무릎에 올린 주민', '자기 이름을 손목에서 읽는 버릇', '보관 열쇠를 기다리는 손'],
    text: t(
      '주민 하나가 병을 무릎에 올린다. 회색 물이 흔들릴 때마다 안쪽에서 밥 먹으라는 목소리가 난다.\n주민이 손목에 적은 자기 이름을 읽고 마개를 잡는다. 등대단 보관칸은 바로 뒤에 있다.\n“엄마 목소리예요. 어제 열었을 때는 제 이름을 잊었어요.”',
      'A resident balances a bottle on her knees. Whenever the gray water shifts, a voice inside calls someone to dinner.\nShe reads her own name from her wrist, then reaches for the stopper. A Keeper storage locker stands behind her.\n“That is my mother. Yesterday I opened it and forgot my own name.”',
    ),
    options: [
      {
        label: t('직접 열 수 있게 받쳐 주고 곁을 지킨다', 'Steady the bottle and stay while she opens it'),
        hint: t('HP −3 · 추적 +6 · 인간성 +1', '−3 HP · +6 Trace · Humanity +1'),
        success: {
          text: t(
            '당신이 받친 손에 물이 튄다. 무릎이 꺾이는 동안 주민의 목소리가 커져 순찰등을 부른다.\n“엄마, 오늘은 여기까지.” 주민이 직접 마개를 닫는다.',
            'Water splashes onto your supporting hand. Your knees buckle as her voice rises, drawing the patrol lights.\n“Enough for today, Mum.” She closes the bottle herself.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: 6 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('보관료를 내고 열쇠는 주민에게 준다', 'Pay for storage and give her the key'),
        hint: t('−20 ₵ · 추적 −4 · 회복력 +1', '−20 ₵ · −4 Trace · Resilience +1'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '주민이 고개를 끄덕인 뒤 보관칸을 잠근다. 물소리가 가라앉고 바깥 순찰등이 지나간다.\n“내일도 제가 정할게요.” 주민이 열쇠를 손목 끈에 단다.',
            'She nods before you lock the compartment. The water falls quiet, and the patrol light moves past.\n“I will decide tomorrow too.” She fastens the key to her wrist cord.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('닫힌 마개를 천으로 묶고 곁에 앉는다', 'Wrap the closed stopper in cloth and sit beside her'),
        hint: t('HP −2 · 추적 −2 · +10 ₵', '−2 HP · −2 Trace · +10 ₵'),
        success: {
          text: t(
            '병을 받치다 깨진 받침에 손이 긁힌다. 주민이 직접 천을 묶자 목소리가 잦아들고 순찰등이 지나간다.\n“오늘은 안 열래요. 잠깐만 같이 있어요.”',
            'The chipped base scrapes your hand as you steady the bottle. She ties the cloth herself; the voice fades and the patrol light passes.\n“I will leave it closed today. Stay a little while.”',
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
    id: 'sea6_ev_foghorn_pitch',
    acts: [6],
    route: 'sea_6',
    title: t('대답을 기다리는 간격', 'The Gap for an Answer'),
    image: 'v2/events/sea6_ev_foghorn_pitch.webp',
    gmHints: ['무적의 끊어진 경고음', '되돌아오는 옛 항만 응답', '사람이 건너는 동안 비워 두는 간격'],
    text: t(
      '경계 근무자가 무적의 손잡이를 당긴다. 긴 소리 뒤에 안개 속에서 짧은 대답이 돌아온다.\n근무자가 다음 경고를 늦춘다. 물 아래에서 올라온 형상 하나가 빈 간격에 계단을 오른다.\n“옛 항만의 응답이에요. 대답하는 동안은 길을 비워 둡니다.”',
      'A watchkeeper pulls the foghorn lever. After the long blast, a short reply comes through the fog.\nThe next warning is delayed. A figure from beneath the water climbs the steps during the gap.\n“An old harbor reply. We leave the passage clear while someone answers.”',
    ),
    options: [
      {
        label: t('응답이 끝나는 순간의 이동법을 익힌다', 'Learn to move at the end of the reply'),
        hint: t('추적 +5 · 희귀 카드 선택 · 통찰 +1', '+5 Trace · rare card pick · Insight +1'),
        check: { stat: 'obs', dc: 9 },
        success: {
          text: t(
            '공개 점검등 아래서 마지막 울림까지 기다린다. 짧은 간격 안에 몸을 옮기는 방법이 잡힌다.\n“먼저 답한 사람이 지나갈 때까지예요.” 근무자가 손잡이를 놓는다.',
            'You wait beneath the inspection lights until the last vibration fades. The brief opening becomes a movement you can repeat.\n“Wait until whoever answered first is through.” The watchkeeper releases the lever.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'card_choice', rarity: 'rare', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '메아리를 응답으로 잘못 짚는다. 닫히는 안전대가 갈비뼈를 치고 경계등이 당신에게 모인다.\n“저쪽에서 숨을 들이쉬는 소리까지 들어야 해요.”',
            'You mistake the echo for the reply. A closing safety bar catches your ribs, drawing the watch lights.\n“Listen until you hear them take a breath over there.”',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('방음 점검로 이용료를 내고 지나간다', 'Pay to use the enclosed inspection passage'),
        hint: t('−30 ₵ · 추적 −6 · 회복력 +1', '−30 ₵ · −6 Trace · Resilience +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '근무자가 안쪽 문을 열어 준다. 닫힌 벽 너머로 경고와 응답이 낮게 이어진다.\n“길을 막으려는 소리로만 듣는 분도 있어요.”',
            'The watchkeeper opens an inner door. Warning and reply continue softly beyond the enclosed walls.\n“Some people hear all that and think we are only keeping them out.”',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'trace', amount: -6 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('공개 대기선에서 응답이 끝나기를 기다린다', 'Wait at the public line until the reply ends'),
        hint: t('추적 +2 · 회복력 +1 · +10 ₵', '+2 Trace · Resilience +1 · +10 ₵'),
        success: {
          text: t(
            '대기선의 카메라가 얼굴을 남긴다. 마지막 형상이 지나간 뒤 근무자가 마른 계단을 가리킨다.\n“서두르지 않아도 건널 수 있어요.”',
            'The camera at the waiting line records your face. After the last figure passes, the watchkeeper points to the dry steps.\n“You can cross without rushing.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 2 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_lens_cradle',
    acts: [6],
    route: 'sea_6',
    title: t('손이 닿지 않는 곳', 'Out of Reach'),
    image: 'v2/events/sea6_ev_lens_cradle.webp',
    gmHints: ['등대 렌즈 아래의 낡은 받침', '탑 안쪽에서 들리는 등대지기', '들어 올릴 때만 교체할 수 있는 부품'],
    text: t(
      '등대 렌즈 아래에서 받침이 한 바퀴마다 긁힌다. 오래된 제작판에는 항만 관리 AI 등대지기의 이름이 있다.\n탑 안쪽에서 친절한 목소리가 들린다. 문장 사이로 냉각기가 오래 돈다.\n“제 몸이라 여기는 손이 닿지 않네요. 잠깐 들어 주시겠습니까.”',
      'A support scrapes once per revolution beneath the lighthouse lens. An old maker’s plate names the harbor-management AI, the Lightkeeper.\nA courteous voice comes from inside the tower. Cooling fans run through the long pauses.\n“This part of my body is rather out of reach. Would you lift it for a moment?”',
    ),
    options: [
      {
        label: t('받침을 들고 교체 부품을 꺼낸다', 'Lift the support and retrieve the spare component'),
        hint: t('HP −6 · 희귀 임플란트 · 회복력 +1', '−6 HP · rare implant · Resilience +1'),
        check: { stat: 'str', dc: 9 },
        success: {
          text: t(
            '무게가 어깨를 누르는 동안 교체 팔이 받침을 갈아 끼운다. 마른 수납구에서 작은 부품이 나온다.\n“여분입니다. 제 쪽은 아직 하나로 버틸 수 있어요.”',
            'The weight bears into your shoulder while a service arm replaces the support. A small component emerges from a dry compartment.\n“A spare. I can still manage with one on my side.”',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'implant', rarity: 'rare' },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '받침이 미끄러져 등을 누른다. 탑의 비상등이 켜지고 교체 팔이 급히 무게를 받는다.\n“그만 놓으세요. 다치게 하려고 부른 게 아닙니다.”',
            'The support slips against your back. Emergency lights flare as the service arm catches the weight.\n“Let go now. I did not ask you here to get you hurt.”',
          ),
          effects: [
            { kind: 'hp', amount: -9 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('정비 인건비를 보태고 세척실에서 쉰다', 'Contribute to repairs and rest in the washroom'),
        hint: t('−40 ₵ · 일행 HP +8 · 인간성 +1', '−40 ₵ · party heals 8 HP · Humanity +1'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '정비 요청이 다음 교대에 배정된다. 세척실에 따뜻한 물이 나오고 일행이 상처를 씻는다.\n“제 수리보다 먼저 쓰셔도 됩니다.” 등대지기가 물 온도를 낮춘다.',
            'The repair goes onto the next watch’s schedule. Warm water runs in the washroom, and everyone cleans their wounds.\n“You may use that before my repairs.” The Lightkeeper lowers the water temperature.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'heal_party', amount: 8 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('점검등 아래서 받침의 긁히는 간격을 적는다', 'Record the scraping intervals under the inspection light'),
        hint: t('추적 +2 · 통찰 +1 · +10 ₵', '+2 Trace · Insight +1 · +10 ₵'),
        success: {
          text: t(
            '점검등이 당신 위치를 남긴다. 한 바퀴마다 나는 소리를 적어 보내자 등대지기가 회전 속도를 늦춘다.\n“어디가 닳았는지 이제 알겠습니다. 다음 교대까지는 버티겠어요.”',
            'The inspection light logs your position. You send the scraping intervals, and the Lightkeeper slows the lens.\n“Now I know where the wear is. It should last until the next watch.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 2 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_borrowed_shift',
    acts: [6],
    route: 'sea_6',
    requires: { notFlag: 'sea_ila_relieved' },
    title: t('엄마의 교대', 'Her Mother’s Watch'),
    image: 'v2/events/sea6_ev_borrowed_shift.webp',
    gmHints: ['교대 손잡이를 잡은 주민 이라', '봉인 테이프로 감은 젖은 문', '어머니 이름으로 남은 근무 자리'],
    text: t(
      '주민 이라가 교대 손잡이를 양손으로 잡는다. 문 아래 젖은 틈은 봉인 테이프로 감겨 있다.\n근무판의 어머니 이름 아래에서 이라의 손이 떨린다. 대피실 사용 기한은 다음 교대까지다.\n“엄마가 돌아올 수도 있잖아요. 이 자리 지우면 어디서 기다려요.”',
      'A resident named Ila holds the watch handle with both hands. Sealing tape covers the wet gap beneath the door.\nHer hands shake beneath her mother’s name on the duty board. Her shelter stay expires at the next change of watch.\n“Mum might come back. If they remove this post, where do I wait?”',
    ),
    options: [
      {
        label: t('이라가 쉬는 동안 교대를 맡는다', 'Take the watch while Ila rests'),
        hint: t('HP −4 · 인간성 +1 · 이라의 교대 인계 약속', '−4 HP · Humanity +1 · Ila handover agreed'),
        success: {
          text: t(
            '굳은 손잡이가 손바닥을 벗긴다. 이라가 당신 자리를 확인하고 빈 의자에 앉는다.\n“다음 종 울리면 식당으로 와요. 인계는 제가 할게요.”',
            'The stiff handle scrapes your palms. Ila checks your grip, then sits in an empty chair.\n“Come to the dining room at the next bell. I will take the handover.”',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_ila_relieved', value: 1 },
          ],
        },
      },
      {
        label: t('대피실 연장료를 내고 조용한 통로를 묻는다', 'Extend her shelter stay and ask for a quiet passage'),
        hint: t('−30 ₵ · 추적 −4 · 회복력 +1', '−30 ₵ · −4 Trace · Resilience +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '연장 확인등이 켜진다. 이라가 손잡이를 자동 받침에 걸고 감시등 뒤의 통로를 가리킨다.\n“기다리는 자리는 남겨 둘 수 있네요. 근무 안 해도.”',
            'The extension light comes on. Ila sets the handle in its automatic brace and points behind the watch lights.\n“So I can keep a place to wait. Even off duty.”',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('공개 창구에 이라의 교대 지원을 요청한다', 'Request relief for Ila at the public desk'),
        hint: t('추적 +3 · 인간성 +1 · +10 ₵', '+3 Trace · Humanity +1 · +10 ₵'),
        success: {
          text: t(
            '요청서에 당신 위치와 이름이 남는다. 이라가 접수등을 보며 손잡이를 고쳐 잡는다.\n“사람 오면 엄마 자리 없애지 말라고 같이 말해 줘요.”',
            'The request logs your name and location. Ila watches the receipt light and adjusts her grip.\n“When someone comes, help me ask them to keep Mum’s post.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 3 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_second_supper',
    acts: [6],
    route: 'sea_6',
    requires: { flag: 'sea_ila_relieved' },
    title: t('한 사람분은 남겨 두고', 'Leave One Portion'),
    image: 'v2/events/sea6_ev_second_supper.webp',
    gmHints: ['식당에서 인계하는 이라', '뚜껑을 덮은 어머니의 저녁', '교대 동작을 적은 마른 종이'],
    text: t(
      '교대 종이 멎자 이라가 식당에서 손을 든다. 식탁 한쪽에는 뚜껑을 덮은 저녁이 있다.\n이라가 마른 종이에 손잡이를 놓는 순서를 그린다. 어머니가 돌아오면 앉을 자리를 팔꿈치로 비워 둔다.\n“돌아와도 바로 일시키지는 말래요. 등대단에서 그랬어요.”',
      'As the watch bell stops, Ila raises a hand from the dining room. A covered supper waits at one end of the table.\nShe draws the handle-release sequence on dry paper, keeping an elbow’s space for her mother.\n“The Keepers said not to put her straight back to work if she returns.”',
    ),
    options: [
      {
        label: t('공개 인계대에서 동작을 배운다', 'Learn the sequence at the monitored handover desk'),
        hint: t('추적 +4 · 카드 강화 1 · 통찰 +1 · 인계 완료', '+4 Trace · upgrade 1 · Insight +1 · handover done'),
        success: {
          text: t(
            '인계대가 당신 얼굴을 남긴다. 이라가 손목을 돌리는 각도를 고쳐 주자 버티는 데 힘이 덜 든다.\n“엄마가 가르쳐 줬어요. 남의 기억이 섞이기 전부터요.”',
            'The desk records your face. Ila adjusts your wrist angle, making the hold easier to sustain.\n“Mum taught me. Before the other memories got mixed in.”',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
            { kind: 'flag', key: 'sea_ila_relieved', value: 0 },
          ],
        },
      },
      {
        label: t('교대문을 직접 닫고 뒷길로 나간다', 'Close the watch door yourself and take the back way'),
        hint: t('HP −3 · 추적 −4 · 인간성 +1 · 인계 완료', '−3 HP · −4 Trace · Humanity +1 · handover done'),
        success: {
          text: t(
            '마지막 손잡이가 손가락을 누른다. 문이 잠기자 이라가 식탁으로 돌아가 덮어 둔 저녁을 안쪽으로 옮긴다.\n“식기 전에 오면 좋겠어요. 일 얘기는 나중에 하고.”',
            'The final handle pinches your fingers. With the door secured, Ila returns to move the covered supper farther onto the table.\n“I hope she gets here while it is warm. Work can wait.”',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_ila_relieved', value: 0 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_two_signatures',
    acts: [6],
    route: 'sea_6',
    requires: { notFlag: 'sea_pact_copy' },
    title: t('두 서명', 'Two Signatures'),
    image: 'v2/events/sea6_ev_two_signatures.webp',
    gmHints: ['혼자 연 구형 협약 보관함', '등대지기와 IX의 공동 서명', '바다의 위치를 지우는 조항'],
    text: t(
      '보관실에는 당신 혼자다. 손으로 돌린 발전기가 윙윙거리며 오래된 협약을 비춘다.\n항만 관리 AI 등대지기의 서명 옆에 IX의 서명이 있다. 바다의 위치를 지우고, 등대의 빛으로 조수를 막는다는 조항이다.\n“둘 다 서명했네.” 당신이 종이 가장자리를 누른다.',
      'You are alone in the archive room. A hand-cranked generator hums over an old agreement.\nThe harbor AI’s signature sits beside IX’s. One clause removes the sea from public records; another commits the lighthouse beam to holding back the tide.\n“They both signed.” You press down the edge of the page.',
    ),
    options: [
      {
        label: t('발전기를 돌리며 협약을 복사한다', 'Keep the generator turning and copy the agreement'),
        hint: t('HP −3 · 추적 +6 · 통찰 +1 · 협약 사본', '−3 HP · +6 Trace · Insight +1 · pact copy'),
        success: {
          text: t(
            '손잡이가 손바닥을 벗긴다. 복사기가 켜지며 열람 위치를 알리고 마지막 서명까지 인쇄한다.\n“여기까지 오지 못하게 하려고.” 당신이 출입 금지 조항을 다시 읽는다.',
            'The crank strips skin from your palm. The copier reports its location as it prints through the final signature.\n“To stop people reaching this place.” You reread the access restriction.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: 6 },
            { kind: 'axis', axis: 'insight', amount: 1 },
            { kind: 'flag', key: 'sea_pact_copy', value: 1 },
          ],
        },
      },
      {
        label: t('열람 흔적을 지우고 보관함을 닫는다', 'Clear the access record and close the archive'),
        hint: t('HP −3 · 추적 −5 · 지배 +1 · +10 ₵', '−3 HP · −5 Trace · Dominance +1 · +10 ₵'),
        success: {
          text: t(
            '초기화 손잡이를 끝까지 당기다 손목이 까진다. 방문 기록이 꺼지고 협약이 어둠 속으로 접힌다.\n“누가 볼지는 내가 정하지.” 당신이 문을 잠근다.',
            'The reset handle scrapes your wrist as you pull it fully down. The visitor record clears, and the agreement folds into darkness.\n“I decide who gets to see it.” You lock the door.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -5 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_copy_window',
    acts: [6],
    route: 'sea_6',
    requires: { flag: 'sea_pact_copy' },
    title: t('접수창의 증인', 'The Witness at the Window'),
    image: 'v2/events/sea6_ev_copy_window.webp',
    gmHints: ['협약 사본을 읽는 늙은 등대단원', '밖으로 향한 공개 열람창', '방문자를 막아 달라고 했던 요청'],
    text: t(
      '늙은 등대단원이 접수창 아래에서 협약 사본을 편다. 손가락이 IX의 서명 앞에서 멈춘다.\n공개 열람 스위치가 창 밖을 향해 있다. 단원이 젖지 않은 소매로 스위치 먼지를 닦는다.\n“찾아오지 못하게 해 달라고 했어요. 여기 물에 닿으면 어떻게 되는지 봤으니까.”',
      'An elderly Keeper unfolds your copy beneath the reception window. A finger stops before IX’s signature.\nA public-viewing switch faces the outer walkway. The Keeper dusts it with a dry sleeve.\n“We asked them to keep people away. We had seen what happened when they touched the water.”',
    ),
    options: [
      {
        label: t('위험 설명과 협약을 함께 공개한다', 'Publish the agreement with its warning'),
        hint: t('추적 +8 · 희귀 카드 선택 · 인간성 +1 · 사본 전달', '+8 Trace · rare card pick · Humanity +1 · copy given'),
        success: {
          text: t(
            '당신 위치와 함께 협약이 공개된다. 열람창이 열리며 봉인됐던 항만 대응 절차도 나온다.\n“길을 보여 줬으면 위험도 끝까지 읽어 주세요.” 단원이 경고문을 당신 옆에 세운다.',
            'The agreement goes public with your location attached. The viewing system also releases the sealed harbor-response procedures.\n“If you show them the way, read them the whole warning.” The Keeper sets it beside you.',
          ),
          effects: [
            { kind: 'trace', amount: 8 },
            { kind: 'card_choice', rarity: 'rare', count: 1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_pact_copy', value: 0 },
          ],
        },
      },
      {
        label: t('사본을 맡기고 열람창의 외부 연결을 끊는다', 'Deposit the copy and disconnect public access'),
        hint: t('HP −4 · 추적 −6 · 회복력 +1 · 사본 전달', '−4 HP · −6 Trace · Resilience +1 · copy given'),
        success: {
          text: t(
            '뻑뻑한 차단 손잡이가 손을 찢는다. 외부 열람등이 꺼지고 단원이 사본을 마른 서랍에 넣는다.\n“숨겨 두는 동안 살아남는 사람도 있어요. 당신한테도 그 말을 남겨야겠네요.”',
            'The stiff disconnect lever cuts your hand. The public-access light goes out, and the Keeper stores the copy in a dry drawer.\n“Some people stay alive while this stays hidden. You should have that on your conscience too.”',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: -6 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
            { kind: 'flag', key: 'sea_pact_copy', value: 0 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_wrong_size',
    acts: [6],
    route: 'sea_6',
    title: t('발은 여기 있는데', 'The Feet Are Here'),
    image: 'v2/events/sea6_ev_wrong_size.webp',
    gmHints: ['하역조 심부름꾼 해진의 신발', '다른 크기로 잘린 왼쪽 깔창', '회색 물 뒤에 남은 남의 걸음'],
    text: t(
      '하역조 심부름꾼 해진이 왼쪽 깔창을 또 자른다. 가위가 움직일 때마다 발가락이 신발 밖으로 움츠러든다.\n옆에는 등대단이 빌려준 마른 실내화가 있다. 해진이 자기 맨발과 잘라 낸 조각을 번갈아 본다.\n“왼발 크기를 자꾸 남의 걸로 기억해요. 발은 여기 있는데.”',
      'Hae-jin, a Longshore Crew runner, trims the left insole again. Each snip makes the exposed toes curl.\nDry slippers borrowed from the Keepers sit nearby. Hae-jin looks between a bare foot and the pieces on the floor.\n“I keep remembering someone else’s left foot. Mine is right here.”',
    ),
    options: [
      {
        label: t('해진의 발에 맞춰 가장자리를 다시 꿰맨다', 'Restitch the edge to fit Hae-jin’s foot'),
        hint: t('HP −3 · 소모품 1 · 인간성 +1', '−3 HP · 1 consumable · Humanity +1'),
        check: { stat: 'agi', dc: 9 },
        success: {
          text: t(
            '굳은 가죽에 바늘을 밀다 손끝이 찢어진다. 해진이 발을 넣고 걸어 본 뒤 배달 가방의 예비 보급품을 건넨다.\n“이 걸음은 제 거예요.”',
            'Pushing the needle through stiff leather splits your fingertip. Hae-jin tries a few steps, then gives you a spare supply from the delivery bag.\n“This is how I walk.”',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '당기던 실이 끊어져 바늘이 손바닥에 박힌다. 해진이 신발을 내려놓고 당신 손을 받친다.\n“오늘은 빌린 걸로 갈게요. 손부터 봐요.”',
            'The thread snaps under tension and drives the needle into your palm. Hae-jin sets the shoe down and supports your hand.\n“I can wear the borrowed pair today. Look after that first.”',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('새 실내화와 일행의 발 처치를 함께 산다', 'Buy replacement slippers and foot care for the group'),
        hint: t('−20 ₵ · 일행 HP +5 · 회복력 +1', '−20 ₵ · party heals 5 HP · Resilience +1'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '해진이 새 실내화를 신고 빌린 것을 반납한다. 일행도 마른 자리에 앉아 물집을 감싼다.\n“저쪽 사람도 기다려요. 빌려준 사람.” 해진이 반납 선반을 가리킨다.',
            'Hae-jin changes into the new slippers and returns the borrowed pair. Everyone sits on the dry platform to dress their blisters.\n“Someone else is waiting for those.” Hae-jin points to the return shelf.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'heal_party', amount: 5 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('해진과 반납함을 옮기고 품삯을 받는다', 'Move the return bin with Hae-jin for a small fee'),
        hint: t('HP −2 · +10 ₵ · +10 ₵', '−2 HP · +10 ₵ · +10 ₵'),
        success: {
          text: t(
            '반납함 손잡이가 손바닥을 긁는다. 해진이 빌린 실내화로 발을 옮기며 품삯을 나눈다.\n“오늘 걸음은 천천히 맞춰 볼게요.”',
            'The bin handle scrapes your palm. Hae-jin shifts in the borrowed slippers and shares the moving fee.\n“I will take my time finding my step today.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'credits', amount: 10 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_handwheel',
    acts: [6],
    route: 'sea_6',
    title: t('놓으면 돌아간다', 'It Turns Back'),
    image: 'v2/events/sea6_ev_handwheel.webp',
    gmHints: ['계속 되감기는 배수 밸브', '손을 바꾸지 못한 당직자', '대피실 아래로 흐르려는 회색 물'],
    text: t(
      '당직자가 배수 밸브를 붙잡고 있다. 힘을 조금 뺄 때마다 바퀴가 되감기며 아래층 배관이 운다.\n당직자의 젖지 않은 손등에도 경련이 인다. 아래층 문에는 대피실에서 가져온 신발들이 놓여 있다.\n“한 번만 끝까지 돌려 주면 잠금을 걸 수 있어요. 손이 안 펴져서.”',
      'The duty Keeper holds a drainage wheel. Each time the grip eases, it turns back and the lower pipes groan.\nEven the dry hand is cramping. Shoes from the shelter line the doorway below.\n“One full turn and I can lock it. My fingers will not open.”',
    ),
    options: [
      {
        label: t('당직자 대신 끝까지 돌린다', 'Take the wheel through the final turn'),
        hint: t('HP −5 · 근력 +1 · 회복력 +1', '−5 HP · STR +1 · Resilience +1'),
        check: { stat: 'str', dc: 9 },
        success: {
          text: t(
            '팔꿈치가 타는 듯 아프다. 몸 전체로 미는 자세를 잡자 바퀴가 끝까지 돌고 잠금쇠가 떨어진다.\n“이 손으로 또 버텨야 하나 했어요.” 당직자가 손가락을 하나씩 편다.',
            'Your elbows burn. Shifting your whole weight behind the turn gets the wheel home, and the locking pin drops.\n“I thought these hands would have to hold another watch.” The Keeper unfolds one finger at a time.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'stat', stat: 'str', amount: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '바퀴가 되감기며 팔을 꺾는다. 당직자가 비상 호출을 밟아 관제등을 켠다.\n“같이 놓으면 안 돼요. 셋에 다시 잡아요.”',
            'The wheel snaps back and twists your arm. The Keeper stamps the emergency call, lighting up the control panel.\n“We cannot both let go. Grip again on three.”',
          ),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('자동 잠금 부품을 결제해 설치한다', 'Buy and fit an automatic locking part'),
        hint: t('−40 ₵ · 소모품 1개 · 통찰 +1', '−40 ₵ · 1 consumable · Insight +1'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '정비함에서 나온 부품이 되감기는 바퀴를 잡는다. 당직자가 남은 정비 보급품을 당신 가방에 넣는다.\n“신앙이 부족해서 손이 풀린 건 아니었네요.”',
            'The service-cabinet part catches the returning wheel. The Keeper puts the remaining maintenance supply in your bag.\n“So my grip was not failing for lack of faith.”',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('비상 호출을 켜고 당직자 곁을 지킨다', 'Call for help and stay beside the Keeper'),
        hint: t('추적 +3 · 인간성 +1 · +10 ₵', '+3 Trace · Humanity +1 · +10 ₵'),
        success: {
          text: t(
            '호출등이 당신 위치를 남긴다. 교대원이 도착할 때까지 당직자 곁에서 손을 바꾸는 순서를 짚어 준다.\n“혼자 세고 있으니까 자꾸 틀렸어요.”',
            'The call light records your location. You count out the changes of grip beside the Keeper until relief arrives.\n“I kept losing count on my own.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 3 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_covered_coast',
    acts: [6],
    route: 'sea_6',
    title: t('남쪽을 덮는 천', 'The Cloth over the South'),
    image: 'v2/events/sea6_ev_covered_coast.webp',
    gmHints: ['벽지도 남쪽을 가린 천', '경고부터 읽히려는 안내인', '바다를 처음 그려 보는 방문객'],
    text: t(
      '등대 안내인이 벽지도 남쪽에 천을 건다. 천 아래로 해문항의 해안선이 조금 보인다.\n안내인이 방문객용 연습판에서 물결 그림을 지운다. 그림 옆의 주의 사항은 아무도 베껴 쓰지 않았다.\n“네오서울에서 오면 다 처음 그려 봐요. 물결부터 그리고 경고는 빼요.”',
      'A lighthouse guide hangs a cloth over the southern part of a wall map. A little of Haemun’s coastline shows beneath it.\nThe guide wipes waves from a visitors’ practice board. Nobody has copied the warning beside them.\n“People from Neo-Seoul are drawing it for the first time. They start with waves and leave out the warning.”',
    ),
    options: [
      {
        label: t('위험을 설명한 뒤 지도를 보여 주자고 설득한다', 'Argue for showing the map after explaining the danger'),
        hint: t('추적 +6 · 매력 +1 · 인간성 +1', '+6 Trace · CHA +1 · Humanity +1'),
        check: { stat: 'cha', dc: 9 },
        success: {
          text: t(
            '안내인이 공개 설명대를 켜 당신 얼굴과 설명을 남긴다. 당신이 방문객 눈높이로 문장을 고쳐 읽는다.\n“그럼 돌아갈 길부터 보여 줍시다.” 안내인이 천을 걷는다.',
            'The guide switches on the public desk, recording your face and explanation. You rephrase the warning for someone seeing the sea for the first time.\n“Then we show the way back first.” The cloth comes down.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'stat', stat: 'cha', amount: 1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '천을 먼저 걷으려다 고정쇠에 손을 긁힌다. 안내인이 출입 확인을 눌러 당신 위치를 남긴다.\n“당신도 아직 경고를 끝까지 안 읽었어요.”',
            'You reach for the cloth too soon and scrape your hand on its fastening. The guide logs your position with an access check.\n“You have not finished reading the warning either.”',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('천을 고정하고 잘못 외운 길을 버린다', 'Secure the cloth and abandon the route you memorized'),
        hint: t('HP −4 · 카드 1장 제거 · 회복력 +1', '−4 HP · remove 1 card · Resilience +1'),
        success: {
          text: t(
            '높은 고정쇠를 누르다 팔이 찢어진다. 지도에서 외운 지름길을 지우고 안전한 동작만 다시 짚는다.\n“다 외워서 오는 사람을 제일 많이 데리러 가요.”',
            'The high fastening cuts your arm. You abandon the shortcut you memorized and rehearse only the safe approach.\n“The people who know every shortcut are the ones we fetch most often.”',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_name_first',
    acts: [6],
    route: 'sea_6',
    title: t('이름부터 물어봐요', 'Ask My Name First'),
    image: 'v2/events/sea6_ev_name_first.webp',
    gmHints: ['세척대에 손목을 묶은 생존자', '처치 순서를 기다리는 마른 거즈', '남의 주소를 말하다 멎는 입'],
    text: t(
      '생존자가 세척대에 자기 손목을 묶는다. 입에서는 다른 동네의 주소가 나오고 발은 자꾸 문 쪽으로 간다.\n등대단 구급함이 열려 있다. 생존자가 마른 거즈를 당신 쪽으로 밀어 준다.\n“씻기기 전에 제 이름부터 물어봐요. 대답할 수 있을 때요.”',
      'A survivor ties one wrist to the washstand. An address from another district spills out, while the feet keep turning toward the door.\nThe Keepers’ first-aid case is open. The survivor pushes dry gauze toward you.\n“Ask my name before you wash me. While I can still answer.”',
    ),
    options: [
      {
        label: t('대답을 기다리며 맨손으로 몸을 받친다', 'Support the survivor by hand and wait for an answer'),
        hint: t('HP −5 · 일행 HP +6 · 인간성 +1', '−5 HP · party heals 6 HP · Humanity +1'),
        success: {
          text: t(
            '몸부림치는 팔을 받치다 어깨가 삔다. 이름을 확인한 뒤 세척을 마치고 남은 약으로 일행도 처치한다.\n“이번 대답은 제 거였어요.” 생존자가 손목 매듭을 푼다.',
            'Holding the struggling arm strains your shoulder. Once the name is spoken, you finish the wash and use the remaining medicine on the group.\n“That answer was mine.” The survivor unties the wrist strap.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'heal_party', amount: 6 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('구조 호출을 켜고 즉시 세척을 시작한다', 'Call for assistance and begin the wash immediately'),
        hint: t('추적 +5 · 일행 HP +8 · 지배 +1', '+5 Trace · party heals 8 HP · Dominance +1'),
        success: {
          text: t(
            '구조등이 당신 위치를 올린다. 자동 처치대가 생존자와 일행의 상처를 차례로 씻는다.\n“지금 제 이름 물어봐도 돼요.” 물이 멎은 뒤 작은 목소리가 난다.',
            'The rescue light reports your location. The treatment station washes the survivor’s wounds, then the group’s.\n“You can ask my name now.” The voice comes quietly after the water stops.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'heal_party', amount: 8 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_warm_bench',
    acts: [6],
    route: 'sea_6',
    title: t('자는 동안만', 'While They Sleep'),
    image: 'v2/events/sea6_ev_warm_bench.webp',
    gmHints: ['빈 컨테이너 안의 온열 벤치', '잠든 교대자를 지키는 관리인', '회색 물에서 돌아온 사람들의 숙소'],
    text: t(
      '빈 컨테이너 안에서 숙소 관리인이 온열 벤치의 꺼진 쪽을 두드린다. 벽 너머로 고른 코 고는 소리가 난다.\n관리인이 잠든 교대자의 신발을 문에서 멀리 옮긴다. 신발 주인은 돌아온 첫날 세 사람의 이름으로 대답했다.\n“자는 동안만이라도 부를 이름이 하나면 좋겠어요.”',
      'Inside an empty container, the shelter manager taps the dead half of a heated bench. Steady snoring comes through the partition.\nThe manager moves a sleeping Keeper’s shoes away from the door. On the first day back, their owner answered to three names.\n“While they sleep, I would like there to be only one name to call them.”',
    ),
    options: [
      {
        label: t('뜨거운 배관을 옮겨 일행도 쉴 자리를 만든다', 'Shift the hot pipe to make room for everyone'),
        hint: t('+10 ₵ · HP −6 · 일행 HP +10 · 회복력 +1', '+10 ₵ · −6 HP · party +10 HP · Resilience +1'),
        success: {
          text: t(
            '달아오른 배관이 팔을 데운다. 벤치 전체에 온기가 돌고 일행이 차례로 몸을 눕힌다.\n“문은 제가 볼게요.” 관리인이 등받이 없는 의자를 끌어간다.',
            'The hot pipe burns your arm. Warmth spreads along the bench, and the group settles down in turn.\n“I will watch the door.” The manager pulls up a chair without a back.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -6 },
            { kind: 'heal_party', amount: 10 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('예비 온열 장치를 사고 교체비를 보탠다', 'Buy the spare thermal unit and fund its replacement'),
        hint: t('−60 ₵ · 희귀 임플란트 1개 · 인간성 +1', '−60 ₵ · 1 rare implant · Humanity +1'),
        requires: { minCredits: 60 },
        success: {
          text: t(
            '관리인이 휴대용 예비 장치를 내주고 벤치 수리 주문을 넣는다. 벽 너머 잠든 사람의 호흡이 길어진다.\n“밖에서 버티는 사람한테도 필요하겠죠.”',
            'The manager gives you the portable spare and places an order to repair the bench. Beyond the partition, the sleeper’s breathing deepens.\n“Someone holding out beyond these walls needs one too.”',
          ),
          effects: [
            { kind: 'credits', amount: -60 },
            { kind: 'implant', rarity: 'rare' },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('출입등을 켜고 잠든 사람들의 문을 지킨다', 'Switch on the entry light and watch the sleepers’ door'),
        hint: t('추적 +3 · 인간성 +1', '+3 Trace · Humanity +1'),
        success: {
          text: t(
            '출입등에 당신 얼굴이 남는다. 관리인이 잠깐 앉아 쉬는 동안 문 앞으로 다가오는 발소리를 돌려보낸다.\n“깨어나면 본인이 이름을 말하게 둬요.”',
            'The entry light records your face. While the manager sits down for a moment, you turn approaching footsteps away from the door.\n“Let them tell you their own name when they wake.”',
          ),
          effects: [
            { kind: 'trace', amount: 3 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea6_ev_return_stair',
    acts: [6],
    route: 'sea_6',
    title: t('돌아갈 계단', 'The Stairs Back'),
    image: 'v2/events/sea6_ev_return_stair.webp',
    gmHints: ['수평선 아래로 이어진 계단', '안쪽과 바깥쪽에 그은 분필선', '돌려줄 기억과 대피할 사람의 순서'],
    text: t(
      '등대단원이 마지막 계단에 분필선을 긋는다. 바깥쪽 물에서 지워진 사람들이 도시의 집 주소를 말한다.\n안쪽 문 너머에서는 살아 있는 사람들이 돌아갈 차례를 기다린다. 단원이 두 줄 사이에 발을 둔다.\n“돌려보낼 것부터 정할까요. 먼저 돌아갈 사람부터 정할까요.”',
      'A Keeper draws chalk lines on the final stairs. Beyond them, erased people in the water recite their city addresses.\nBehind the inner door, living people wait for their turn to go home. The Keeper stands between the two lanes.\n“Do we start with what we give back, or with who gets home first?”',
    ),
    options: [
      {
        label: t('돌려받겠다는 사람의 이름부터 받는다', 'Begin with those who choose to receive what was erased'),
        hint: t('추적 +8 · 희귀 카드 선택 1회 · 인간성 +1', '+8 Trace · 1 rare card choice · Humanity +1'),
        success: {
          text: t(
            '당신이 접수대에 이름을 올리자 공개등이 켜진다. 단원이 회수 작업에 쓰던 동작들을 펼쳐 보인다.\n“받겠다는 사람부터요.” 당신이 첫 번째 빈칸을 남에게 돌린다.',
            'Putting your name on the desk brings on the public lights. The Keeper lays out the methods used on recovery work.\n“Those who choose it first.” You turn the next empty field toward someone else.',
          ),
          effects: [
            { kind: 'trace', amount: 8 },
            { kind: 'card_choice', rarity: 'rare', count: 1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('대피 보급품을 사고 돌아갈 순서부터 세운다', 'Buy evacuation supplies and organize the way home'),
        hint: t('−40 ₵ · 일행 HP +10 · 회복력 +1', '−40 ₵ · party heals 10 HP · Resilience +1'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '보급품을 나누는 동안 일행이 상처를 감싸고 물을 마신다. 단원이 안쪽 계단부터 마르게 닦는다.\n“돌아간 뒤에 다시 묻겠습니다.” 단원이 바깥쪽 줄을 지우지 않고 둔다.',
            'While supplies are handed out, the group dresses wounds and drinks. The Keeper dries the inner stairs first.\n“We will ask again when they are home.” The outer chalk line stays where it is.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'heal_party', amount: 10 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('마른 계단에 짐을 옮겨 대피로를 비운다', 'Move the luggage onto dry steps to clear the exit'),
        hint: t('HP −2 · 회복력 +1', '−2 HP · Resilience +1'),
        success: {
          text: t(
            '짐끈이 손바닥을 벗긴다. 단원이 안쪽 줄의 사람들을 한 명씩 안내하는 동안 계단을 비운다.\n“바깥 줄도 남겨 둡시다. 다시 올 사람도 있으니까.”',
            'The luggage straps scrape your palms. You clear the stairs while the Keeper guides the inner line through one person at a time.\n“Leave the outer line there. Some will want to come back.”',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
]

export const SEA6_EVENT_ART: Record<string, string> = {
  sea6_ev_hook_transfer: 'Painterly cyberpunk realism, eye-level, natural proportions. A single middle-aged Korean longshore worker in a worn lifting harness, standing on an offshore steel walkway, bare dry hands held away from damp work gloves. One restrained effect: a thin band of harbor mist. Muted industrial colors, no text in the image.',
  sea6_ev_coat_hem: 'Painterly cyberpunk realism, eye-level, natural proportions. A single Korean seamstress seated at a compact sewing machine, carefully turning up the hem of a heavy charcoal watch coat in a cramped lighthouse repair room. One restrained effect: a small warm pool of task light. No text in the image.',
  sea6_ev_missing_hours: 'Painterly cyberpunk realism, eye-level. A single worn paper tide chart as the subject on an angled inspection desk, abstract timing marks with no legible characters, subsea station architecture softly out of focus. One restrained effect: a faint cool indicator reflection. No people, no text in the image.',
  sea6_ev_inward_buoy: 'Painterly cyberpunk realism, eye-level. A single weathered navigation buoy mounted beside an offshore walkway, its hooded lamp directed toward a dry landward platform. One restrained effect: a narrow pale beam through light fog. No people, no text in the image.',
  sea6_ev_coffin_rent: 'Painterly cyberpunk realism, eye-level, natural proportions. A single tired Korean longshore porter sitting upright beside a plain utilitarian coffin used as temporary sleeping furniture, an ordinary pillow under one arm, a small blank adhesive label on the lid. One restrained effect: dim amber shelter lighting. Quiet bureaucratic dark humor, no text in the image.',
  sea6_ev_wet_names: 'Painterly cyberpunk realism, eye-level. A single waterlogged paper list held in a wall-mounted drying clip outside a sealed shelter door, indistinct ink marks with no readable characters. One restrained effect: a droplet catching weak light at the lower edge. No people, no text in the image.',
  sea6_ev_dry_sump: 'Painterly cyberpunk realism, eye-level. A single cluster of salt crystals on the rim of a steel drainage sump, municipal pipes and thick subsea cables blurred behind it. One restrained effect: a faint gray reflection from water below. No people, no text in the image.',
  sea6_ev_sealed_voice: 'Painterly cyberpunk realism, eye-level. A single sealed glass bottle containing dull gray water on a dry shelter bench, secure storage compartments blurred in the background. One restrained effect: a gentle internal ripple. No faces in the water, no people, no text in the image.',
  sea6_ev_foghorn_pitch: 'Painterly cyberpunk realism, eye-level. A single old industrial foghorn with a manual lever, bolted beside an offshore staircase. One restrained effect: a thin veil of sea fog behind its mouth. Subdued steel and ochre palette, no people, no text in the image.',
  sea6_ev_lens_cradle: 'Painterly cyberpunk realism, eye-level. A single massive lighthouse lens resting in an aging mechanical cradle, worn bearings and a compact service arm visible beneath it. One restrained effect: a narrow pale reflection through the glass. No people, no text in the image.',
  sea6_ev_borrowed_shift: 'Painterly cyberpunk realism, eye-level, natural proportions. A single young adult Korean harbor resident gripping a stiff watch handle with both hands, exhausted posture, dry sleeves, patched watertight door behind her. One restrained effect: a soft amber duty light. No text in the image.',
  sea6_ev_second_supper: 'Painterly cyberpunk realism, eye-level. A single covered supper tray at the edge of a modest lighthouse dining table, an empty place setting softly out of focus beside it. One restrained effect: a small trace of warmth escaping beneath the lid. No people, no text in the image.',
  sea6_ev_two_signatures: 'Painterly cyberpunk realism, eye-level. A single old folded agreement on a hand-powered archive reader, two separate abstract signature impressions with no legible writing, worn paper fibers and metal fittings. One restrained effect: a weak warm reading light. No people, no text in the image.',
  sea6_ev_copy_window: 'Painterly cyberpunk realism, eye-level, natural proportions. A single elderly Korean Keeper in a plain weatherproof coat at a small reception window, one dry hand resting beside a public-access switch, restrained weary expression. One restrained effect: a muted green indicator glow. No text in the image.',
  sea6_ev_wrong_size: 'Painterly cyberpunk realism, eye-level, natural proportions. A single adult Korean harbor runner seated on a dry repair platform, examining an ill-fitting left shoe with cut insole pieces near one foot. One restrained effect: soft workshop light on the hands. No text in the image.',
  sea6_ev_handwheel: 'Painterly cyberpunk realism, eye-level, natural proportions. A single exhausted Korean duty Keeper gripping a large drainage handwheel, cramped fingers and braced shoulders, enclosed offshore maintenance corridor. One restrained effect: a dim red indicator reflection on steel. No text in the image.',
  sea6_ev_covered_coast: 'Painterly cyberpunk realism, eye-level. A single heavy cloth draped over the lower half of an old wall map, only a small unlabeled stretch of coastline exposed beneath the edge. One restrained effect: soft side lighting across the fabric. No people, no readable symbols, no text in the image.',
  sea6_ev_name_first: 'Painterly cyberpunk realism, eye-level, natural proportions. A single adult Korean survivor seated at a utilitarian washstand, one wrist loosely secured with a broad safety strap, the other hand resting beside dry gauze. One restrained effect: a cool overhead reflection on the basin. Dignified and non-graphic, no text in the image.',
  sea6_ev_warm_bench: 'Painterly cyberpunk realism, eye-level. A single worn heated bench inside an empty shipping container converted into a lighthouse shelter, exposed repair pipe beneath the seat, simple insulated walls. One restrained effect: a small amber heating indicator. No people, no text in the image.',
  sea6_ev_return_stair: 'Painterly cyberpunk realism, eye-level, natural proportions. A single weathered Korean Keeper standing between two plain chalk lanes on an offshore staircase, calm tired posture, distant gray horizon. One restrained effect: faint lighthouse illumination across the stair edge. No other figures, no text in the image.',
}