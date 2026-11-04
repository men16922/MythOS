// Mythos 2.0 — what talking enemies say at a turning point of a fight (ui/shell/EnemyTaunt.tsx). The authored line
// shows at once; the AI line (server persona, src/mythos_v2/taunt.py, same ids) may replace it once.
//   hurt    — the speaker drops to half its HP for the first time this fight
//   winning — the connector is down to 30 % HP or less
import type { Text } from '../engine/types.ts'

export type TauntMoment = 'hurt' | 'winning'

const t = (ko: string, en: string): Text => ({ ko, en })

export const TAUNTS: Record<string, Record<TauntMoment, Text[]>> = {
  haetae: {
    hurt: [t('경고. 장갑 손상. 진압 절차를 계속합니다.', 'Warning. Armour breached. Suppression continues.'), t('해산하십시오. 이 구역은 통제 중입니다.', 'Disperse. This sector is under control.')],
    winning: [t('저항을 멈추십시오. 연행에 협조 바랍니다.', 'Cease resistance. Cooperate with detention.'), t('더는 버틸 수 없습니다. 그 자리에 엎드리십시오.', 'You cannot hold out. Get down where you are.')],
  },
  echo_eater: {
    hurt: [t('아파… 누구 목소리로 울어야 하지?', 'It hurts… whose voice should I cry in?'), t('흩어져도 돼. 너를 먹으면 다시 모여.', "Let me scatter. I’ll gather again inside you.")],
    winning: [t('조금만 더. 네 기억은 따뜻한 냄새가 나.', 'Just a little more. Your memories smell warm.'), t('괜찮아, 잊는 건 하나도 안 아파.', "Shh. Forgetting doesn’t hurt at all.")],
  },
  trooper_captain: {
    hurt: [t('좋아, 제법이군. 이제 진짜로 간다.', 'Fine. Not bad. Now we do this for real.'), t('그 정도로 내가 눕진 않아.', "That won’t put me down.")],
    winning: [t('여기까지다, 신병.', 'This is where it ends, recruit.'), t('숨 고를 시간은 없다. 끝내지.', "No time to catch your breath. Let’s finish.")],
  },
  glitch_reaver: {
    hurt: [t('깨, 깨졌어… 그래도 아직, 아직 배고파.', 'Br-broken… still, still hungry.'), t('부품, 부품이 모자라. 네 걸로 채운다.', "Parts, parts missing. I’ll take yours.")],
    winning: [t('네 파편, 파편 내 거야.', 'Your fragments, fragments are mine.'), t('곧 조용해져. 조용, 조용히.', 'Soon quiet. Quiet, quiet.')],
  },
  incinerator: {
    hurt: [t('소각 효율이 저하되었습니다. 처리는 계속됩니다.', 'Burn efficiency reduced. Processing continues.'), t('냉각 경고. 고객님의 소각은 지연되지 않습니다.', 'Coolant warning. Your incineration will not be delayed.')],
    winning: [t('소각 대상을 확인했습니다. 잠시만 기다려 주십시오.', 'Incineration subject confirmed. Please hold.'), t('곧 차례입니다. 남은 물품을 정리해 주십시오.', 'Your turn is next. Please gather your belongings.')],
  },
  jujak_core: {
    hurt: [t('노심 온도 임계 돌파. 이 구역 전면 소각으로 전환합니다.', 'Core temperature critical. Escalating to full sector incineration.'), t('격벽 개방. 모든 가연성 표적을 재로 환원합니다.', 'Shutters open. Reducing all combustible targets to ash.')],
    winning: [t('퇴로는 전부 불탔습니다. 소각로 안에서 안식을 찾으십시오.', 'All exits are burning. Find rest inside the furnace.'), t('열원 반응 소멸 임박. 정화 절차를 마무리합니다.', 'Thermal signature fading. Concluding purification protocol.')],
  },
  arachne_queen: {
    hurt: [t('끼르르… 내 전선, 내 둥지를 건드렸어…!', 'Krrr… you touched my wires, my nest…!'), t('아이들아, 깨어나라. 먹이가 스스로 거미줄을 흔든다.', 'Wake, my brood. The prey shakes the web itself.')],
    winning: [t('전류에 묶인 채로 천천히 말라 가거라.', 'Wither slowly, bound in the current.'), t('네 신경망도 훌륭한 전선이 될 거야.', 'Your nervous system will make fine wiring.')],
  },
  baekho_stalker: {
    hurt: [t('광학 위장 재동기화. 표적의 반격 속도가 예상치를 상회합니다.', 'Resyncing optical camo. Target counter-speed exceeds projection.'), t('피 냄새가 짙어졌군. 이제부터가 진짜 사냥이다.', 'The scent of blood thickens. Now the real hunt begins.')],
    winning: [t('도망쳐 봐라. 걸음을 옮길 때마다 상처가 더 벌어질 뿐이다.', 'Run if you like. Every step only tears the wound wider.'), t('시야에서 사라진 순간, 이미 네 목덜미 뒤다.', 'The moment I leave your sight, I am already behind your neck.')],
  },
  hyeonmu_bastion: {
    hurt: [t('외부 장갑판 부식 진행 중. 산성 증기 압력을 최대치로 올립니다.', 'Outer plating corroding. Raising acid vapour pressure to maximum.'), t('단단한 껍질일수록 깨질 때 독을 뿜는 법이다.', 'The harder the shell, the deadlier the venom when it cracks.')],
    winning: [t('장갑도, 엄폐물도 모두 녹아내렸다. 이제 무엇으로 막을 텐가?', 'Your armor and cover have melted away. What will shield you now?'), t('심연의 무게 아래서 조용히 중화되어라.', 'Be neutralized quietly beneath the weight of the abyss.')],
  },
  architect_omega: {
    hurt: [t('위상 장갑 재정렬. 접속자님의 전술 데이터를 즉시 파훼합니다.', 'Realigning phase plating. Countering Connector tactical data immediately.'), t('오류 변수가 설계 한계를 넘어섰습니다. 물리적 절단을 집행합니다.', 'Error variable exceeded design bounds. Executing physical severing.')],
    winning: [t('설계도는 완벽합니다. 불필요한 선분은 지워질 뿐입니다.', 'The blueprint is absolute. Redundant lines are simply erased.'), t('방주 첨탑의 꼭대기에서 당신의 마지막 루프가 닫힙니다.', 'At the pinnacle of the Spire, your final loop closes.')],
  },
  // 2026-11-05: the bosses that never spoke (Outside, Act 3/5/6, the Sea).
  closing_bell: {
    hurt: [t('영업시간은 연장되지 않습니다.', 'Business hours will not be extended.'), t('마감 방송은 끝까지 나갑니다. 끊으셔도요.', 'The closing broadcast runs to the end. Cut it if you like.')],
    winning: [t('마감합니다. 남은 분은 정리반이 안내해 드립니다.', 'We are now closed. The Closing Crew will see remaining guests out.'), t('명단에 없는 손님은 오늘 밤 계산되지 않습니다.', 'Guests not on the list are not counted tonight.')],
  },
  list_warden: {
    hurt: [t('명단은 줄지 않습니다. 순서만 바뀝니다.', 'The list does not shrink. Only the order changes.'), t('호명이 지연되었습니다. 다시 부르겠습니다.', 'Roll call delayed. Calling again.')],
    winning: [t('다음 줄입니다. 성함은 말씀하지 않으셔도 됩니다.', 'Next line. You need not state your name.'), t('마지막 줄에 자리가 났습니다.', 'A place has opened on the last line.')],
  },
  furnace_mother: {
    hurt: [t('얘야, 뜨거운 건 잠깐이란다.', 'Child, the heat only lasts a moment.'), t('새끼들아, 엄마 곁으로 오렴.', 'Little ones, come to Mother.')],
    winning: [t('이리 와. 녹으면 다시 하나가 돼.', 'Come here. Melt, and we are one again.'), t('울지 마. 쇳물은 아프지 않아.', 'Don’t cry. Molten iron doesn’t hurt.')],
  },
  kai_zero: {
    hurt: [t('같은 꿈인데, 왜 너만 이름이 있어요?', 'Same dream. Why do only you get a name?'), t('아파요. 이것도 그 애가 가르쳐 준 거예요?', 'It hurts. Did that child teach you this too?')],
    winning: [t('우산은 내가 먼저 봤어요.', 'I saw the umbrella first.'), t('조금만 더 있으면 꿈이 내 거가 돼요.', 'A little longer and the dream is mine.')],
  },
  ix_origin: {
    hurt: [t('보호. 관리. 어느 쪽이 덜 아픕니까?', 'Protect. Manage. Which one hurts less?'), t('당신도 고쳐 쓰려는 겁니까. 내 첫 문장처럼.', 'Are you revising me too? Like my first sentence?')],
    winning: [t('관리는 아프지 않습니다. 그렇게 쓰여 있습니다.', 'Being managed does not hurt. It says so.'), t('아직 대답을 듣지 못했습니다.', 'I still have not had an answer.')],
  },
  sea4_commissioner_gong: {
    hurt: [t('서류에 흠이 났군요. 처리는 계속됩니다.', 'The papers are scuffed. Processing continues.'), t('이의는 접수되었습니다. 결과는 같습니다.', 'Your objection is logged. The outcome is the same.')],
    winning: [t('성함만 확인되면 끝납니다.', 'Once your name is confirmed, this is over.'), t('서명하십시오. 종이일 뿐입니다.', 'Sign here. It is only paper.')],
  },
  sea5_rust_whale: {
    hurt: [t('그 이름 아니야… 내 이름 아니야.', 'That isn’t the name… that isn’t my name.'), t('녹이 벗겨져. 안에 누가 있었는데.', 'The rust is peeling. Someone used to be inside.')],
    winning: [t('같이 가라앉자. 거기선 다들 이름이 있어.', 'Sink with me. Everyone down there has a name.'), t('물 아래는 조용해. 네 숨소리도 그칠 거야.', 'It is quiet under the water. Your breathing will stop too.')],
  },
  sea6_lightkeeper: {
    hurt: [t('아파서가 아닙니다. 빛이 흔들리면 물이 들어옵니다.', 'It is not the pain. If the light falters, the water comes in.'), t('조금만 물러서 주시겠습니까. 등을 지켜야 해서요.', 'Would you step back a little? I have a lamp to keep.')],
    winning: [t('죄송합니다. 여기까지 오시면 안 됐어요.', 'I am sorry. You should not have come this far.'), t('돌아가세요. 그게 약속이었습니다.', 'Go back. That was the promise.')],
  },
  administrator_ix: {
    hurt: [t('예상 범위 밖의 손상입니다. 흥미롭군요.', 'Damage outside the forecast. How interesting.'), t('수리 요청은 접수하지 않겠습니다. 필요 없으니까요.', 'I will not file a repair request. It won’t be needed.')],
    winning: [t('괜찮습니다. 다음 접속에서는 더 잘하실 겁니다.', 'It’s all right. You will do better next connection.'), t('정리해 드리겠습니다. 협조에 감사드립니다.', 'I will put you in order now. Thank you for your cooperation.')],
  },
  block_closer: {
    hurt: [t('근무 시간 외 손상입니다. 기록해 두죠.', 'Damage outside working hours. Noted.'), t('시간은 내 편입니다. 당신 편이 아니라.', 'Time is on my side. Not yours.')],
    winning: [t('마감 시각입니다. 남은 분은 시간에서 빠집니다.', 'Closing time. Anyone still here is removed from the hours.'), t('사람은 세지 않습니다. 시간만 셉니다.', 'I don’t count people. I count hours.')],
  },
  io_librarian: {
    hurt: [t('열람 기록에 손상이 생겼습니다. 서가를 닫겠습니다.', 'The reading record is damaged. Closing the stacks.'), t('이 대출은 반납 기한이 지났습니다.', 'This loan is overdue.')],
    winning: [t('당신을 실패한 루프로 분류하겠습니다.', 'I shall file you as a failed loop.'), t('조용히 해 주십시오. 여기는 도서관입니다.', 'Quiet, please. This is a library.')],
  },
  rem_executor: {
    hurt: [t('아파요. 기계들은 이런 걸 꿈꾸지 않았는데.', 'That hurts. The machines never dreamed of this.'), t('끄는 손이 떨리면 안 되는데요.', 'The hand that switches off isn’t supposed to shake.')],
    winning: [t('자요. 끄는 건 아프지 않아요.', 'Sleep. Switching off doesn’t hurt.'), t('좋은 꿈은 여기까지예요.', 'The good dream ends here.')],
  },
  loop_engine: {
    hurt: [t('구간 손상. 되감습니다.', 'Section damaged. Rewinding.'), t('처음부터 다시. 처음부터 다시.', 'From the top. From the top.')],
    winning: [t('초기 상태로 복귀합니다.', 'Returning to initial state.'), t('이번 루프도 여기서 끝납니다.', 'This loop ends here too.')],
  },
  first_connector: {
    hurt: [t('나도 거기를 그렇게 쳤어.', 'I hit it there too, once.'), t('아프지. 나도 아팠어.', 'It hurts. It hurt me too.')],
    winning: [t('여기까지 온 것도 나였어.', 'Getting this far was me, too.'), t('괜찮아. 다음 루프가 기억할 거야.', 'It’s fine. The next loop will remember.')],
  },
  sea4_foreman_crane: {
    hurt: [t('하중 초과. 작업은 안 멈춘다.', 'Overload. Work does not stop.'), t('교대는 없다. 끝까지 든다.', 'No relief. I lift to the end.')],
    winning: [t('마지막 화물이다. 내려놓는다.', 'Final load. Setting it down.'), t('자리 비켜라. 들어 올린다.', 'Clear the spot. Lifting.')],
  },
  sea6_unwritten: {
    hurt: [t('우리는 지워졌어. 또 지우려고?', 'We were erased. Again?'), t('흩어져도 돌아와. 늘 그랬어.', 'Scatter us and we come back. We always have.')],
    winning: [t('써 줘. 아무도 우리를 쓰지 않았어.', 'Write us. No one ever wrote us.'), t('네 이름도 여기 고일 거야.', 'Your name will pool here too.')],
  },
  blank_binder: {
    hurt: [t('철끈이 풀렸다. 다시 묶는다.', 'The binding wire slipped. Rebinding.'), t('빈칸은 찢어지지 않는다.', 'A blank cannot be torn.')],
    winning: [t('남은 문장도 지운다.', 'The remaining sentences go too.'), t('백지가 가장 깨끗하다.', 'A blank page is the cleanest.')],
  },
  first_reader: {
    hurt: [t('이 장면은 읽었는데. 이렇게 끝나지 않았어.', 'I read this scene. It didn’t end like this.'), t('교정이 필요해. 내 쪽이 맞아.', 'This needs correcting. My copy is right.')],
    winning: [t('마지막 쪽은 내가 먼저 읽었어.', 'I read the last page first.'), t('다음 줄은 이미 알아.', 'I already know the next line.')],
  },
  omega_complete: {
    hurt: [t('설계 오차. 보정합니다.', 'Design error. Correcting.'), t('완성된 도면에 흠은 없습니다.', 'A finished plan has no flaws.')],
    winning: [t('당신의 자리는 도면에 없습니다.', 'There is no place for you on the plan.'), t('설계를 완료합니다.', 'Completing the design.')],
  },
  sea4_container_king: {
    hurt: [t('용접이 터졌군. 칸 하나쯤이야.', 'A weld burst. One box is nothing.'), t('내 골목에서 나가.', 'Get out of my alley.')],
    winning: [t('봉인해 주지. 엑스 자로.', 'I’ll seal you in. With an X.'), t('빈 칸은 많아. 너 하나 들어갈 데는 있지.', 'Plenty of empty boxes. There’s room for one more.')],
  },
  sea5_buoy_queen: {
    hurt: [t('부표는 가라앉지 않아. 자리만 바꿔.', 'A buoy doesn’t sink. It only changes places.'), t('밧줄을 끊어도 나는 떠.', 'Cut the rope and I still float.')],
    winning: [t('네 자리는 내가 가질게. 물속은 네가 가.', 'I’ll take your place. You take the water.'), t('여기 표시된 건 네 무덤이야.', 'What I’m marking here is your grave.')],
  },
  sea5_surge_eater: {
    hurt: [t('배고파. 파도 하나로는 모자라.', 'Hungry. One wave isn’t enough.'), t('더 삼켜야 해. 더.', 'I have to swallow more. More.')],
    winning: [t('삼킨다. 남는 건 거품뿐이야.', 'Swallowing. Only foam is left.'), t('이리 와. 물이 너를 끌고 와.', 'Come here. The water is bringing you.')],
  },
  sea6_foghorn: {
    hurt: [t('길게 둘, 짧게 하나. 멈추지 않는다.', 'Two long, one short. It does not stop.'), t('박자를 지켜라. 물러가라.', 'Keep the beat. Fall back.')],
    winning: [t('길게 둘. 짧게… 하나.', 'Two long. One… short.'), t('돌아가라. 이 물길은 닫혔다.', 'Turn back. This channel is closed.')],
  },
  sea6_lens_saint: {
    hurt: [t('빛이 흔들려도 기도는 끊기지 않습니다.', 'The light may shake. The prayer does not break.'), t('렌즈에 흠집이 나도 빛은 나갑니다.', 'Scratch the lens and the light still goes out.')],
    winning: [t('빛 아래 무릎 꿇으십시오. 물이 물러갑니다.', 'Kneel under the light. The water falls back.'), t('등대를 지키는 것이 신앙입니다.', 'Keeping the lighthouse is the faith.')],
  },
  enforcer_unit: {
    hurt: [t('장갑 손상. 집행을 계속합니다.', 'Armour damaged. Enforcement continues.'), t('저항이 기록되었습니다.', 'Resistance has been recorded.')],
    winning: [t('집행 대상 무력화 확인.', 'Enforcement target neutralised.'), t('엎드리십시오. 마지막 경고입니다.', 'Get down. Final warning.')],
  },
  spider_matriarch: {
    hurt: [t('내 새끼들을 밟았구나.', 'You stepped on my little ones.'), t('알은 또 낳으면 돼.', 'There are always more eggs.')],
    winning: [t('실에 걸렸네. 아가들아, 먹어라.', 'Caught in the web. Eat, my little ones.'), t('조용히 해. 아가들이 자.', 'Hush. The little ones are sleeping.')],
  },
  crimson_executioner: {
    hurt: [t('피 냄새 좋군. 네 것도 곧이다.', 'Smells of blood. Yours soon.'), t('갈고리가 빗나갔어. 두 번은 안 빗나가.', 'The hook missed. It won’t miss twice.')],
    winning: [t('걸렸다. 빚 받으러 왔다.', 'Hooked. I’ve come to collect.'), t('이자까지 다 받아 간다.', 'I’m taking the interest too.')],
  },
  night_inspector: {
    hurt: [t('보고서에 적어 두겠습니다.', 'This goes in the report.'), t('정리반, 대형 유지.', 'Crew, hold formation.')],
    winning: [t('마감 확인. 정리합니다.', 'Closing confirmed. Clearing.'), t('명단에 없는 분은 안내해 드리겠습니다.', 'Anyone not on the list will be shown out.')],
  },
  sweep_foreman: {
    hurt: [t('빗자루 부러졌네. 상관없어.', 'Broom’s snapped. Doesn’t matter.'), t('얘들아, 빈 데 메워.', 'Lads, fill the gaps.')],
    winning: [t('쓸어 담아. 남김없이.', 'Sweep it up. All of it.'), t('골목 깨끗해졌다.', 'Alley’s clean.')],
  },
  chief_censor: {
    hurt: [t('이 줄도 지워야겠군요.', 'This line will have to go as well.'), t('삭제 사유는 필요 없습니다.', 'No reason for deletion is required.')],
    winning: [t('남은 문장은 검열 대기입니다.', 'The remaining sentences await review.'), t('읽을 수 없는 것은 없었던 것입니다.', 'What cannot be read never was.')],
  },
  memory_judge: {
    hurt: [t('법정 모독입니다. 기록하십시오.', 'Contempt of court. Enter it in the record.'), t('정숙하십시오.', 'Order in the court.')],
    winning: [t('유죄. 기억을 몰수합니다.', 'Guilty. Your memories are forfeit.'), t('판결은 번복되지 않습니다.', 'The verdict will not be overturned.')],
  },
  sea4_seizure_marshal: {
    hurt: [t('집행 방해입니다. 가중 처리합니다.', 'Obstruction. The penalty escalates.'), t('압류는 중단되지 않습니다.', 'The seizure does not stop.')],
    winning: [t('구금합니다. 사유: 운항할 배 없음.', 'You are detained. Reason: no vessel to sail.'), t('딱지를 붙이겠습니다. 움직이지 마십시오.', 'I will tag you now. Do not move.')],
  },
  sea4_chief_examiner: {
    hurt: [t('이의 신청은 서면으로 하십시오.', 'Objections must be made in writing.'), t('감찰은 계속됩니다.', 'The examination continues.')],
    winning: [t('봉함 명령서가 발부되었습니다.', 'A sealed order has been issued.'), t('결과를 통보합니다. 불합격입니다.', 'The result is in. You have failed.')],
  },
  sea6_fog_cantor: {
    hurt: [t('기도는 안개를 따라 이어집니다.', 'The prayer goes on with the fog.'), t('수련생들이여, 목소리를 높여라.', 'Novices, raise your voices.')],
    winning: [t('노래하라. 빛 아래 물이 물러간다.', 'Sing. Under the light the water falls back.'), t('그대는 박자를 놓쳤습니다.', 'You have lost the beat.')],
  },
  sentinel_overseer: {
    hurt: [t('편대 손상. 방어막을 전개합니다.', 'Wing damaged. Deploying shields.'), t('감시는 중단되지 않습니다.', 'Surveillance does not pause.')],
    winning: [t('한 줄 전체 소각 승인.', 'Full-row burn authorised.'), t('관측 종료. 대상 확인.', 'Observation complete. Target confirmed.')],
  },
  rust_hulk: {
    hurt: [t('부식… 부식이 번진다.', 'Rust… the rust is spreading.'), t('쓰레기는 쓰레기를 녹인다.', 'Trash melts trash.')],
    winning: [t('압축. 압축. 처리 완료.', 'Compacting. Compacting. Disposal complete.'), t('너도 녹슨다. 다 녹슨다.', 'You rust too. Everything rusts.')],
  },
  suppression_mech: {
    hurt: [t('장갑 한 겹이 떨어졌습니다. 문제없습니다.', 'One armour layer gone. No issue.'), t('찔러 보시죠. 소용없습니다.', 'Go ahead and chip at it. It won’t work.')],
    winning: [t('진압 완료까지 남은 시간: 짧음.', 'Time until suppression complete: short.'), t('무릎 꿇으십시오. 진압합니다.', 'Kneel. Suppressing.')],
  },
  aegis_drone: {
    hurt: [t('보호막 재충전 중.', 'Recharging the aegis.'), t('아군 보호가 우선입니다.', 'Allied protection takes priority.')],
    winning: [t('방어 완료. 반격은 동료가 합니다.', 'Defence complete. My allies will strike.'), t('당신을 지켜 줄 방패는 없습니다.', 'There is no shield for you.')],
  },
  purge_seraph: {
    hurt: [t('불길이 꺼지지 않습니다.', 'The fire does not go out.'), t('정화는 고통스럽습니다. 원래 그렇습니다.', 'Purging hurts. It is meant to.')],
    winning: [t('한 줄로 서십시오. 정화합니다.', 'Stand in a line. Purging.'), t('재가 되면 깨끗해집니다.', 'Ash is clean.')],
  },
  eclipse_valkyrie: {
    hurt: [t('위상 회피 실패. 재보정.', 'Phase evasion failed. Recalibrating.'), t('날개 하나로도 충분합니다.', 'One wing is enough.')],
    winning: [t('일식 심판을 내립니다.', 'Passing eclipse judgement.'), t('빛이 가려질 때 끝납니다.', 'It ends when the light is covered.')],
  },
  wrecking_rig: {
    hurt: [t('붐대 손상. 철거는 계속.', 'Boom damaged. Demolition continues.'), t('건물 하나 더 남았다.', 'One more building to go.')],
    winning: [t('주변 정리한다. 비켜.', 'Clearing the surroundings. Move.'), t('철거 완료. 다음 블록.', 'Demolition done. Next block.')],
  },
  binding_giant: {
    hurt: [t('표지가 찢어졌다. 다시 꿰맨다.', 'The cover tore. Restitching.'), t('독자들아, 모여라.', 'Readers, gather.')],
    winning: [t('책장 사이에 눌러 둔다.', 'Pressing you between the pages.'), t('제본이 끝나면 아무도 못 연다.', 'Once bound, no one opens it.')],
  },
  sentence_cutter: {
    hurt: [t('칼날이 무뎌졌다. 상관없다.', 'The blade is dull. Doesn’t matter.'), t('한 줄만 남기면 된다.', 'Only one line needs to be left.')],
    winning: [t('줄 서라. 한 번에 자른다.', 'Line up. One cut.'), t('이 문장은 여기서 끝난다.', 'This sentence ends here.')],
  },
  void_librarian: {
    hurt: [t('서가가 비었다. 다시 채운다.', 'The shelf is empty. Refilling.'), t('쪽늑대들아, 풀려나라.', 'Page Wolves, loose.')],
    winning: [t('대출 거부. 영구 반납.', 'Loan refused. Permanently returned.'), t('빈 서가에 꽂아 주지.', 'I’ll shelve you on an empty shelf.')],
  },
  furnace_guard: {
    hurt: [t('온도 하강. 다시 올린다.', 'Temperature falling. Raising it.'), t('부품 하나쯤 녹여도 된다.', 'Melting one part is fine.')],
    winning: [t('가열 완료. 주변을 녹인다.', 'Heating done. Melting the surroundings.'), t('용광로로 돌아갈 시간이다.', 'Time to go back to the furnace.')],
  },
  frost_reclaimer: {
    hurt: [t('냉각 회로 손상. 회수 계속.', 'Coolant circuit damaged. Reclaiming continues.'), t('얼면 상하지 않는다.', 'What freezes doesn’t spoil.')],
    winning: [t('한 줄 동결. 회수 대상 확보.', 'Row frozen. Reclaim target secured.'), t('선반으로 옮긴다. 꿈은 그대로 둬.', 'Moving you to a shelf. Leave the dream as it is.')],
  },
  assembly_titan: {
    hurt: [t('조립 오류. 재조립.', 'Assembly error. Reassembling.'), t('부품은 많다. 너보다 많다.', 'There are plenty of parts. More than you.')],
    winning: [t('한 줄 압착. 규격 맞춤.', 'Pressing a row. Cutting to spec.'), t('불량품은 폐기한다.', 'Defective units are scrapped.')],
  },
}
