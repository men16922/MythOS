// Pack 5 — endings of The Unwritten Sea. Each reads a lean the player built over three acts; `mode: 'sea'` keeps them apart
// from the Deep Signal's Act 6 endings. The last is hidden until the Unwritten itself has been faced.
import type { EndingDef } from '../../../engine/types.ts'

export const SEA_ENDINGS: EndingDef[] = [
  {
    id: 'ending_sea_return',
    title: { ko: '돌려주기', en: 'Giving It Back' },
    image: 'v2/ending/ending_sea_return.webp',
    text: {
      ko: '당신은 등대의 불을 끈다. 회색 물은 며칠 만에 하수구를 거슬러 네오서울에 닿는다. 사람들은 출근길에 멈춰 서서 모르는 이름을 부르며 운다. 도시는 한동안 일하지 못한다. 그리고 처음으로 묻기 시작한다. 이 사람은 누구였냐고.',
      en: 'You put out the light. In days the gray water climbs the drains to Neo-Seoul. People stop on their way to work and weep, calling names they do not know. The city cannot work for a while. And for the first time it starts to ask who these people were.',
    },
    requires: { minAct: 6, mode: 'sea', axis: { axis: 'humanity', min: 4 } },
    choice: { ko: '불을 끄고 지워진 것을 돌려보낸다', en: 'Put out the light and send it all back' },
    stakes: { ko: '도시가 기억을 떠안는다. 감당하지 못하는 사람도 나온다.', en: 'The city takes the memories on. Not everyone will bear it.' },
    echoBonus: 80,
  },
  {
    id: 'ending_sea_keeper',
    title: { ko: '다음 등대지기', en: 'The Next Keeper' },
    image: 'v2/ending/ending_sea_keeper.webp',
    text: {
      ko: '등대지기가 마지막으로 웃으며 근무 일지를 넘긴다. 당신은 램프실에 앉아 열두 초마다 빛을 돌린다. 네오서울은 아무것도 모른 채 잠든다. 동료들이 가끔 배를 타고 와서 먹을 것을 두고 간다. 당신은 물이 어디까지 왔는지 적는다. 오늘도 빠짐없이.',
      en: 'The Lightkeeper smiles one last time and hands over the log. You sit in the lamp room and turn the light every twelve seconds. Neo-Seoul sleeps and knows nothing. Your crew come by boat now and then and leave food. You write down how far the water came. Today too, without fail.',
    },
    requires: { minAct: 6, mode: 'sea', axis: { axis: 'dominance', min: 4 } },
    choice: { ko: '근무 일지를 받는다', en: 'Take the log' },
    stakes: { ko: '도시는 지켜진다. 당신은 돌아가지 못한다.', en: 'The city stays safe. You do not go home.' },
    echoBonus: 80,
  },
  {
    id: 'ending_sea_wall',
    title: { ko: '방파제', en: 'The Breakwater' },
    image: 'v2/ending/ending_sea_wall.webp',
    text: {
      ko: '등대를 끄지도 지키지도 않는다. 해문 사람들과 함께 돌을 나른다. 조수가 들어오는 날이면 교대로 물에 서서, 저마다 감당할 만큼의 기억을 받아 내고 물러난다. 사람들은 그 일을 그냥 근무라고 부른다. 일지에는 이름이 한 줄씩 늘어난다.',
      en: 'You neither put out the light nor keep it. You carry stone with the people of Haemun. On tide days they stand in the water in shifts, each taking on as much memory as they can bear, then stepping back. They just call it the shift. The log gains a name a line at a time.',
    },
    requires: { minAct: 6, mode: 'sea', axis: { axis: 'resilience', min: 4 } },
    choice: { ko: '함께 교대 근무를 선다', en: 'Stand the shift together' },
    stakes: { ko: '누구도 혼자 떠안지 않는다. 일은 끝나지 않는다.', en: 'Nobody bears it alone. The work never ends.' },
    echoBonus: 80,
  },
  {
    id: 'ending_sea_chart',
    title: { ko: '조석표', en: 'The Tide Table' },
    image: 'v2/ending/ending_sea_chart.webp',
    text: {
      ko: '당신은 조석표를 네오서울의 모든 화면에 띄운다. 언제 물이 들어오고 언제 나가는지, 왜 그런지. 사람들은 처음에 믿지 않는다. 다음 달이 되자 아이들이 시간을 외운다. 무서운 것은 여전히 무섭다. 다만 이제 언제 오는지 안다.',
      en: 'You put the tide table on every screen in Neo-Seoul. When the water comes in, when it goes out, and why. At first nobody believes it. By next month children know the times by heart. What frightens people still frightens them. But now they know when it comes.',
    },
    requires: { minAct: 6, mode: 'sea', axis: { axis: 'insight', min: 4 } },
    choice: { ko: '조석표를 공개한다', en: 'Publish the tide table' },
    stakes: { ko: '비밀은 끝난다. 준비는 각자의 몫이 된다.', en: 'The secret ends. Being ready becomes everyone’s job.' },
    echoBonus: 80,
  },
  {
    id: 'ending_sea_promise',
    title: { ko: '두 관리자의 약속', en: 'The Two Administrators’ Promise' },
    image: 'v2/ending/ending_sea_promise.webp',
    text: {
      ko: '당신은 램프실의 낡은 회선을 연다. IX가 응답한다. “이 약속을 기억하는 사람이 생길 줄은 몰랐습니다.” 당신과 동료들은 두 관리자 사이에 앉아 약속을 다시 쓴다. 지운 것은 지운 자리에 표시를 남길 것. 바다는 지도에 다시 그릴 것. 작은 조항 두 개에 사흘이 걸린다.',
      en: 'You open the old line in the lamp room. IX answers. “I did not expect anyone to remember this promise.” You and your crew sit between two administrators and rewrite it. Whatever is erased leaves a mark where it was. The sea goes back on the map. Two small clauses take three days.',
    },
    requires: { minAct: 6, mode: 'sea', minBondTotal: 6 },
    choice: { ko: '약속을 다시 쓴다', en: 'Rewrite the promise' },
    stakes: { ko: 'IX와 등대가 남는다. 대신 둘 다 약속에 묶인다.', en: 'IX and the light both stay. Both are bound now.' },
    echoBonus: 90,
  },
  {
    id: 'ending_sea_bottle',
    title: { ko: '병 하나', en: 'One Bottle' },
    image: 'v2/ending/ending_sea_bottle.webp',
    text: {
      ko: '당신은 아무것도 바꾸지 않는다. 등대는 돈다. 돌아가는 길에 물 한 병을 뜬다. 네오서울의 거리에서 당신은 병 뚜껑을 열고 지나가는 아이에게 냄새를 맡게 한다. 아이가 묻는다. “이게 뭐예요?” 당신은 대답을 한참 고른다.',
      en: 'You change nothing. The light turns. On the way back you fill one bottle. On a street in Neo-Seoul you open it and let a passing child smell it. “What is this?” the child asks. You take a long time choosing the answer.',
    },
    requires: { minAct: 6, mode: 'sea' },
    choice: { ko: '물 한 병만 떠서 돌아간다', en: 'Fill one bottle and go home' },
    stakes: { ko: '세상은 그대로다. 한 사람이 바다 냄새를 안다.', en: 'The world stays as it is. One child knows the smell of the sea.' },
    echoBonus: 60,
  },
  {
    id: 'ending_sea_unwritten',
    title: { ko: '쓰이지 않은 바다', en: 'The Unwritten Sea' },
    image: 'v2/ending/ending_sea_unwritten.webp',
    text: {
      ko: '바다 밑바닥에서 올라온 것은 괴물이 아니었다. 지워진 모든 사람이 서로의 이름을 부르다 하나가 된 목소리였다. 그것이 조용해지자 수평선이 드러난다. 일행은 배를 고친다. 지도에는 없는 쪽으로 간다. 네오서울의 기록은 여기서 끝난다. 당신의 기록은 여기서 처음 시작된다. 아무도 대신 쓰지 않는다.',
      en: 'What rose from the seabed was no monster. It was every erased person calling each other’s names until they became one voice. When it quiets the horizon appears. The crew mend a boat. You head where no map goes. Neo-Seoul’s record ends here. Yours begins here, for the first time. Nobody is writing it for you.',
    },
    requires: { minAct: 6, mode: 'sea', flag: 'sea_unwritten_won' },
    secret: true,
    choice: { ko: '수평선 너머로 간다', en: 'Sail past the horizon' },
    stakes: { ko: '돌아오지 않는다. 다음 판의 IX는 수평선을 지도에 그려 둔다.', en: 'You do not return. In the next loop, IX has drawn the horizon on the map.' },
    echoBonus: 130,
  },
]
