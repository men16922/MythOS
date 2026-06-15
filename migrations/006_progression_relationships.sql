-- 동료 호감도(companion affection) 크로스-루프 이월 (설계: docs/plans/2026-06-16-companion-affection-cutscenes.md).
-- 매 루프의 최종 loop.state["relationships"](dict[name -> int])를 archive 시 합산해
-- insight_points 와 동형으로 player+scenario 단위 누적/이월한다. P1 컷씬 언락 게이팅 prereq.

ALTER TABLE player_progression
  ADD COLUMN IF NOT EXISTS relationships JSONB NOT NULL DEFAULT '{}'::jsonb;
