// Mythos 2.0 — authored companion replies and IX comms lines, shown instantly or whenever the AI GM is
// unreachable. Mirrors the server pools in src/mythos_v2/talk.py (keep the two in step).

import type { Lang } from '../../engine/types.ts'
import type { IxTrigger } from '../../net/api.ts'

type Pool = Record<Lang, readonly string[]>

export const COMPANION_REPLIES: Record<string, Pool> = {
  se_rin: {
    ko: [
      '말은 쉽지. 일단 살아서 나가고 나서 얘기하자.',
      '그런 건 잘 몰라. 물건 옮기는 거랑 도망치는 거 말고는.',
      '그 얘긴 나중에. 지금은 눈 좀 붙여. 망은 내가 볼게.',
      '웃기네. 너랑 다니느니 밀수하던 시절이 차라리 조용했어.',
      '걱정 마. 가라앉는 법은 아직도 못 배웠으니까.',
      '흠. 그 말, 기억해 둘게. 이자 붙여서.',
    ],
    en: [
      "Easy to say. Let's talk once we're out of here alive.",
      "Don't ask me. I move cargo and I run. That's the whole skill set.",
      "Later. Get some sleep. I'll keep watch.",
      'Funny. Smuggling was quieter than tagging along with you.',
      "Relax. I still haven't learned how to sink.",
      "Hm. I'll remember you said that. With interest.",
    ],
  },
  tae_o: {
    ko: [
      '그렇다. 그 이상은 말하지 않겠다.',
      '쉬어라. 문은 내가 지킨다.',
      '예전엔 이런 곳을 부수러 왔었다. 지금은 지킨다.',
      '말보다 손이 빠른 편이다. 미안하다.',
      '잊지 않는다. 내가 한 일도, 네가 한 일도.',
      '괜찮다. 아직 버틸 수 있다.',
    ],
    en: [
      "Yes. I won't say more than that.",
      "Rest. I'll hold the door.",
      'I used to come to places like this to break them. Now I guard them.',
      'My hands are faster than my words. Sorry.',
      "I don't forget. Not what I did, not what you did.",
      "I'm fine. I can still hold.",
    ],
  },
  han: {
    ko: [
      'ㅋㅋ 그거 완전 내 전문인데? 나중에 보여줄게.',
      '야, 걱정 마. IX 방화벽보다 네 표정이 더 뚫기 쉬워.',
      '솔직히? 나 지금 좀 신났어. 이런 판 진짜 오랜만이거든.',
      '그건 비밀. 해커가 다 털어놓으면 그게 해커냐?',
      '오케이 오케이, 접수. 근데 다음엔 나 먼저 들여보내 줘.',
      '난 접속 안 해도 다 보여. 너 지금 엄청 피곤한 것도.',
    ],
    en: [
      "Ha, that's literally my specialty. I'll show you sometime.",
      "Relax. Your face is easier to crack than IX's firewall.",
      "Honestly? I'm kind of hyped. Haven't had a run like this in ages.",
      "That's a secret. A hacker who spills everything isn't much of a hacker.",
      'Okay, okay, noted. But next time let me go in first.',
      "I don't need to plug in to see it. Like how tired you are right now.",
    ],
  },
  su_ah: {
    ko: [
      '괜찮아. 금 간 건 다시 두드리면 돼.',
      '쇠도 너무 급하게 식히면 깨져. 너도 좀 천천히 해.',
      '그 말, 불씨처럼 오래 남겠다. 고마워.',
      '잠깐 손 줘 봐. 굳은살이 많이 늘었네.',
      '다음 길 나서기 전에 네 장비부터 한번 볼게.',
      '좋은 칼은 한 번에 안 나와. 우리도 그래.',
    ],
    en: [
      "It's alright. Cracks can be hammered out.",
      'Cool steel too fast and it shatters. Go easy on yourself.',
      "I'll keep that like an ember. Thank you.",
      'Give me your hand a second. More calluses than before.',
      'Let me look over your gear before we move on.',
      'A good blade never comes out in one strike. Neither do we.',
    ],
  },
  kai: {
    ko: [
      '그 말을 들으니까… 가슴 쪽이 따뜻해져요. 이상하죠?',
      '잘 모르겠어요. 하지만 모르는 게 싫지는 않아요.',
      '저도 쉬어도 되는 걸까요? 이런 건 처음이라서요.',
      '당신 목소리를 기록해 두고 싶어요. 아니, 그냥 기억하고 싶어요.',
      '꿈에서 이 장면을 본 것 같아요. 그때보다 지금이 좋아요.',
      '계산으로는 설명이 안 돼요. 그래서 더 궁금해요.',
    ],
    en: [
      "Hearing that… something in my chest feels warm. Strange, isn't it?",
      "I'm not sure. But I don't mind not knowing.",
      'Am I allowed to rest too? This is all new to me.',
      'I want to record your voice. No… I just want to remember it.',
      'I think I saw this in a dream. I like it better now.',
      "I can't explain it by calculation. That makes me more curious.",
    ],
  },
  lin_yue: {
    ko: [
      '그 얘기, 공짜로 들려주긴 아깝네. 다음에 이자 쳐서 받을게.',
      '좋아, 거래 성립. 조건은 나중에 내가 정해.',
      '야시장에선 웃는 얼굴이 제일 비싸. 오늘은 할인해 줄게.',
      '손해 보는 장사는 안 해. 근데 너는… 예외로 해 두지.',
      '정보는 돈이야. 그 말도 장부에 적어 둘게.',
      '흥정은 끝났어. 이제 쉬어. 그건 서비스야.',
    ],
    en: [
      "That story's too good to give away free. I'll collect with interest.",
      "Fine, deal. I'll name the terms later.",
      'In the night market a smile is the priciest thing. You get a discount today.',
      "I don't take losing deals. But you… I'll make an exception.",
      "Information is money. I'm writing that down in my ledger.",
      "Haggling's over. Get some rest. That part's on the house.",
    ],
  },
}

const GENERIC_REPLIES: Pool = {
  ko: ['그래. 그 얘긴 조금 쉬고 나서 하자.', '여기선 잠깐이라도 숨을 돌려 둬.', '알았어. 기억해 둘게.'],
  en: ["Yeah. Let's talk about that once we've rested.", 'Catch your breath while you can.', "Got it. I'll remember that."],
}

/** IX lines by trigger; `{enemy}` / `{boss}` / `{companion}` variants only when that name is known. */
export const IX_LINES: Record<IxTrigger, Pool> = {
  elite_start: {
    ko: [
      '정예 개체 배치를 승인했습니다. 접속자님의 처리 시간을 측정합니다.',
      '이 구역의 관리 등급을 상향했습니다. 통과는 권장하지 않습니다.',
      '{enemy} 투입을 완료했습니다. 이번 교전은 별도 문서로 보관됩니다.',
    ],
    en: [
      'Elite deployment approved. Your processing time is being measured.',
      "This sector's clearance level has been raised. Passage is not recommended.",
      '{enemy} deployed. This engagement will be filed separately.',
    ],
  },
  boss_start: {
    ko: [
      '{boss} 활성화. 이 접속은 여기서 종결 처리됩니다.',
      '여기까지 오신 기록은 이미 작성했습니다. 마지막 줄만 남았습니다.',
      '최종 심사를 시작합니다. 이의 제기는 받지 않습니다.',
    ],
    en: [
      '{boss} online. This connection will be closed here.',
      'The record of you getting this far is already written. Only the last line remains.',
      'Final review begins. Appeals are not accepted.',
    ],
  },
  env_kill: {
    ko: [
      '도시 기반 시설의 무단 사용을 확인했습니다. 파손 내역은 기록에 남습니다.',
      '구조물 손상을 접수했습니다. 처리 방식이 규정에 어긋납니다.',
      '지형을 무기로 쓰셨군요. 해당 구역은 폐쇄 대상으로 분류합니다.',
    ],
    en: [
      'Unauthorised use of city infrastructure confirmed. The damage goes on your record.',
      'Structural damage logged. The method is out of compliance.',
      'You used the terrain as a weapon. That sector is now flagged for closure.',
    ],
  },
  multi_kill: {
    ko: [
      '단일 행동으로 복수 개체가 정지했습니다. 위협 등급을 재산정합니다.',
      '손실 보고서가 길어지는군요. 대체 인력은 이미 배정했습니다.',
      '효율적입니다. 그 효율은 접속자님을 삭제할 근거로 첨부됩니다.',
    ],
    en: [
      'Multiple units halted in a single action. Recalculating your threat rating.',
      'The loss report grows longer. Replacements are already assigned.',
      'Efficient. That efficiency will be attached as grounds for your deletion.',
    ],
  },
  companion_down: {
    ko: [
      '{companion}의 신호가 소실됐습니다. 동행자 명단에서 삭제합니다.',
      '{companion}, 정지를 확인했습니다. 접속자님의 선택이 낳은 결과입니다.',
      '보호 대상이 하나 줄었습니다. 판단에 참고하십시오.',
    ],
    en: [
      "{companion}'s signal is lost. Removing them from your party roster.",
      '{companion}: halt confirmed. A consequence of your choices.',
      'One fewer person to protect. Take it into account.',
    ],
  },
  low_hp: {
    ko: ['신호 강도가 위험 수준입니다. 종료 절차를 준비합니다.', '접속자님의 손상을 확인했습니다. 삭제는 곧 완료됩니다.', '이 정도면 충분합니다. 저항을 중단하십시오.'],
    en: [
      'Signal strength critical. Preparing the termination procedure.',
      'Damage to the connector confirmed. Deletion will be complete shortly.',
      'That is enough. Cease resistance.',
    ],
  },
  boss_phase: {
    ko: ['{boss}의 제한을 해제했습니다. 지금부터가 정식 절차입니다.', '예비 검증을 마쳤습니다. 본 심사로 넘어갑니다.', '형태 전환을 승인했습니다. 접속자님에게 맞춘 조정입니다.'],
    en: [
      "{boss}'s restrictions lifted. The formal procedure starts now.",
      'Preliminary review complete. Proceeding to the main hearing.',
      'Form change approved. It has been adjusted to you.',
    ],
  },
  flawless: {
    ko: ['손상 없는 교전. 이상 행동으로 분류해 정밀 감시 대상에 올립니다.', '깔끔하군요. 그만큼 다음 배치를 늘리겠습니다.', '기록상 오류로 보입니다. 재검토하겠습니다.'],
    en: [
      'An engagement without damage. Classified as anomalous; you are now under close watch.',
      'Clean. The next deployment will be scaled to match.',
      'This looks like a recording error. It will be reviewed.',
    ],
  },
}

export type IxNames = Partial<Record<'enemy' | 'boss' | 'companion', string>>

/** An in-voice reply the companion has not said yet in this conversation. */
export function pickCompanionReply(companion: string, lang: Lang, said: readonly string[], seed: number): string {
  const pool = (COMPANION_REPLIES[companion] ?? GENERIC_REPLIES)[lang]
  const start = Math.abs(Math.floor(seed)) % pool.length
  for (let i = 0; i < pool.length; i++) {
    const line = pool[(start + i) % pool.length]
    if (line && !said.includes(line)) return line
  }
  return pool[start] ?? ''
}

/** An authored IX line for the moment, names filled in (variants needing an unknown name are skipped). */
export function pickIxLine(trigger: IxTrigger, lang: Lang, names: IxNames, seed: number): string {
  const usable = IX_LINES[trigger][lang].filter((line) => [...line.matchAll(/\{(\w+)\}/g)].every((m) => names[m[1] as keyof IxNames]))
  const line = usable[Math.abs(Math.floor(seed)) % usable.length] ?? IX_LINES[trigger][lang][1] ?? ''
  return line.replace(/\{(\w+)\}/g, (_, key: string) => names[key as keyof IxNames] ?? '')
}
