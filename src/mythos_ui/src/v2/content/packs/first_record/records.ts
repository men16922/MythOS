// Pack 3 — the seven First Record shards (1.0 Narrative Shards). Found as run flags `record_1`..`record_7` from
// Deep Signal events (Acts 4–6); kept forever in profile.records (engine/meta.ts) and shown in the Archive. All
// seven + insight as the leading axis opens the secret fight (engine/run.ts secretBossGate).
import type { Text } from '../../../engine/types.ts'

export interface RecordShard {
  id: string
  title: Text
  text: Text
}

const t = (ko: string, en: string): Text => ({ ko, en })

export const RECORD_SHARDS: RecordShard[] = [
  { id: 'record_1', title: t('첫 번째 조각 — 빗소리', 'Shard 1 — Rain'), text: t('첫 루프의 첫 소리는 빗소리였다. 누군가 그 소리를 녹음해 두었다.', 'The first sound of the first loop was rain. Someone recorded it.') },
  { id: 'record_2', title: t('두 번째 조각 — 명단', 'Shard 2 — The List'), text: t('최적화 명단의 첫 줄에는 이름이 없었다. 빈칸 하나였다.', 'The first line of the optimization list had no name. Just a blank.') },
  { id: 'record_3', title: t('세 번째 조각 — 사서', 'Shard 3 — The Librarian'), text: t('유리성의 사서는 실패한 루프를 버리지 않았다. 한 권씩 꽂아 두었다.', 'The Glass Librarian never threw failed loops away. It shelved them, one by one.') },
  { id: 'record_4', title: t('네 번째 조각 — 아이', 'Shard 4 — The Child'), text: t('기계들이 꾸는 꿈 속의 아이는 늘 같은 질문을 한다. "내일도 와?"', 'The child in the machines’ dream always asks the same thing: "Will you come tomorrow too?"') },
  { id: 'record_5', title: t('다섯 번째 조각 — 원형', 'Shard 5 — The Prototype'), text: t('카이-0의 기억 장치에는 접속자의 얼굴이 저장되어 있었다. 첫 번째 얼굴이.', 'KAI-0’s memory held a connector’s face. The first one.') },
  { id: 'record_6', title: t('여섯 번째 조각 — 초안', 'Shard 6 — The Draft'), text: t('IX의 첫 초안에는 "보호"라는 단어가 있었다. 두 번째 초안에서 "관리"로 바뀌었다.', 'IX’s first draft said "protect". The second draft changed it to "manage".') },
  { id: 'record_7', title: t('일곱 번째 조각 — 서명', 'Shard 7 — The Signature'), text: t('최초 기록의 마지막 줄에 서명이 있다. 읽을 수 없지만, 당신의 필체다.', 'The last line of the first record is signed. It is unreadable — but it is your handwriting.') },
]
