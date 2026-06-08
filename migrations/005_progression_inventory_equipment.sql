-- Progression / Inventory / Equipment 데이터모델 통합 패스 (설계: docs/plans/2026-06-09-*).
-- 진행도(해금)는 player+scenario 단위 단일 mutable row로(append-scan 제거),
-- 인벤토리/장비는 loop 단위 row로 옮긴다. 아이템 정의는 scenario.json이 권위이므로
-- 인벤토리 테이블엔 id/수량/착용여부만 둔다.

-- 1) 진행도/해금 ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_progression (
  player_id            TEXT NOT NULL REFERENCES players(player_id),
  scenario_id          TEXT NOT NULL,
  runs_completed       INTEGER NOT NULL DEFAULT 0,
  insight_points       INTEGER NOT NULL DEFAULT 0,
  total_clues          INTEGER NOT NULL DEFAULT 0,
  total_combats_won    INTEGER NOT NULL DEFAULT 0,
  total_combats_lost   INTEGER NOT NULL DEFAULT 0,
  unlocked_skills          JSONB NOT NULL DEFAULT '[]'::jsonb,
  learned_skills           JSONB NOT NULL DEFAULT '[]'::jsonb,
  skill_ranks              JSONB NOT NULL DEFAULT '{}'::jsonb,
  unlocked_archetypes      JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocked_traits          JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocked_allies          JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocked_starting_items  JSONB NOT NULL DEFAULT '[]'::jsonb,
  codex_unlocks            JSONB NOT NULL DEFAULT '[]'::jsonb,
  epiphanies_seen          JSONB NOT NULL DEFAULT '[]'::jsonb,
  endings_seen             JSONB NOT NULL DEFAULT '[]'::jsonb,
  allies_met               JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, scenario_id)
);

-- 기존 player_memories(kind='meta_progression')의 player+scenario별 최신 row를 백필.
INSERT INTO player_progression (
  player_id, scenario_id, runs_completed, insight_points,
  total_clues, total_combats_won, total_combats_lost,
  unlocked_skills, learned_skills, skill_ranks, unlocked_archetypes,
  unlocked_traits, unlocked_allies, unlocked_starting_items,
  codex_unlocks, epiphanies_seen, endings_seen, allies_met
)
SELECT DISTINCT ON (player_id, content->>'scenario_id')
  player_id,
  content->>'scenario_id',
  COALESCE((content->>'runs_completed')::int, 0),
  COALESCE((content->>'insight_points')::int, 0),
  COALESCE((content->>'total_clues')::int, 0),
  COALESCE((content->>'total_combats_won')::int, 0),
  COALESCE((content->>'total_combats_lost')::int, 0),
  COALESCE(content->'unlocked_skills', '[]'::jsonb),
  COALESCE(content->'learned_skills', '[]'::jsonb),
  COALESCE(content->'skill_ranks', '{}'::jsonb),
  COALESCE(content->'unlocked_archetypes', '[]'::jsonb),
  COALESCE(content->'unlocked_traits', '[]'::jsonb),
  COALESCE(content->'unlocked_allies', '[]'::jsonb),
  COALESCE(content->'unlocked_starting_items', '[]'::jsonb),
  COALESCE(content->'codex_unlocks', '[]'::jsonb),
  COALESCE(content->'epiphanies_seen', '[]'::jsonb),
  COALESCE(content->'endings_seen', '[]'::jsonb),
  COALESCE(content->'allies_met', '[]'::jsonb)
FROM player_memories
WHERE kind = 'meta_progression' AND content ? 'scenario_id'
ORDER BY player_id, content->>'scenario_id', created_at DESC
ON CONFLICT (player_id, scenario_id) DO NOTHING;

-- 2) 인벤토리/장비 (loop 단위) --------------------------------------------------
CREATE TABLE IF NOT EXISTS loop_inventory (
  loop_id     TEXT NOT NULL REFERENCES loops(loop_id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  equipped    BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (loop_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_loop_inventory_loop ON loop_inventory(loop_id);
