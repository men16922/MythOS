-- 동료 컷씬 크로스-루프 갤러리 (설계: docs/plans/2026-06-16-companion-affection-cutscenes.md P1).
-- 매 루프의 최종 affection + flags로 결정론 언락된 컷씬 id(list[str])를 archive 시
-- allies_met/epiphanies_seen 와 동형으로 player+scenario 단위 union/이월한다.

ALTER TABLE player_progression
  ADD COLUMN IF NOT EXISTS unlocked_cutscenes JSONB NOT NULL DEFAULT '[]'::jsonb;
