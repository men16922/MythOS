import type { CodexLists } from "./viewModels";
import type { SkillTreeNode, SkillTreeResponse } from "./types";

interface CodexPanelProps {
  codexLists: CodexLists;
  skillTree?: SkillTreeResponse | null;
  onLearnSkill?: (skillId: string) => void;
  learningSkillId?: string | null;
  skillError?: string | null;
}

export function CodexPanel({
  codexLists,
  skillTree,
  onLearnSkill,
  learningSkillId,
  skillError,
}: CodexPanelProps) {
  // Prefer the authoritative server tree (with insight + learn/rank actions);
  // fall back to the read-only snapshot-derived list when it isn't loaded yet.
  const interactive = Boolean(skillTree && onLearnSkill);
  const insight = skillTree ? skillTree.insight_points : codexLists.insightPoints;
  const skills: SkillTreeNode[] = skillTree
    ? skillTree.skills
    : codexLists.skills.map((s) => ({
        ...s,
        max_rank: 1,
        learn_cost: 0,
        rankup_cost: 0,
        requires: [],
        requires_met: true,
        is_base: false,
        action: null,
        action_cost: 0,
        can_afford: false,
      }));
  return (
    <div id="codex-tab-content">
      <div className="panel">
        <h2
          style={{
            color: "var(--term)",
            fontSize: "16px",
            margin: "0 0 16px",
          }}
        >
          기억의 별자리
        </h2>
        <div className="codex-grid">
          <div className="codex-sec">
            <div className="codex-sec-title">단서 목록 (Clues)</div>
            <div className="codex-list">
              {codexLists.clues.length > 0 ? (
                codexLists.clues.map((clue, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">
                      <span>{clue.symbol}</span>
                      <span>단서</span>
                    </div>
                    <div className="codex-item-desc">{clue.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  획득한 단서가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">세계 아카이브 (Lore)</div>
            <div className="codex-list">
              {codexLists.allLore.length > 0 ? (
                codexLists.allLore.map((lore, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">{lore.title}</div>
                    <div className="codex-item-desc">{lore.desc}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  조회 가능한 아카이브가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">소지 인벤토리 (Inventory)</div>
            <div className="codex-list">
              {codexLists.inventory.length > 0 ? (
                codexLists.inventory.map((item, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">{String(item)}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  소지품이 비어 있습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">등장인물 (Characters)</div>
            <div className="codex-list">
              {codexLists.characters.length > 0 ? (
                codexLists.characters.map((character, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">{character.symbol}</div>
                    <div className="codex-item-desc">{character.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  기록된 인물이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="codex-sec" style={{ marginTop: "16px" }}>
          <div className="codex-sec-title">
            이전 루프 회상 잔향 (Active Echoes)
          </div>
          <div className="codex-list">
            {codexLists.echoes.length > 0 ? (
              codexLists.echoes.map((echo, idx) => (
                <div className="codex-item" key={idx}>
                  <div className="codex-item-head">{echo.symbol}</div>
                  <div className="codex-item-desc">{echo.text}</div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--ink-dim)" }}>
                감지된 회상 잔향이 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="codex-sec" style={{ marginTop: "16px" }}>
          <div className="codex-sec-title">
            스킬 트리 (Skills) · 통찰 {insight}p
          </div>
          <div className="skill-tree-hint" style={{ marginBottom: "10px" }}>
            통찰은 전투 보상, 루프 보관(+2), 단서 확보(+1), 전투 승리(+1)로 얻습니다.
          </div>
          {skillError && <div className="skill-tree-error">{skillError}</div>}
          <div className="skill-tree-list">
            {skills.length > 0 ? (
              skills.map((skill) => {
                const busy = learningSkillId === skill.id;
                const canAct =
                  interactive && skill.action !== null && skill.can_afford && !busy;
                return (
                  <div className={`skill-tree-item ${skill.status}`} key={skill.id}>
                    <div className="skill-tree-head">
                      <span>{skill.name}</span>
                      <span>
                        {skill.status === "learned"
                          ? `Rank ${skill.rank}${skill.max_rank > 1 ? `/${skill.max_rank}` : ""}`
                          : skill.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="skill-tree-meta">
                      {skill.role || "skill"} · tier {skill.tier ?? 0}
                      {typeof skill.range === "number" ? ` · range ${skill.range}` : ""}
                      {typeof skill.cooldown === "number" ? ` · cd ${skill.cooldown}` : ""}
                    </div>
                    {(skill.tags || []).length > 0 && (
                      <div className="skill-tree-tags">
                        {(skill.tags || []).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                    {skill.status === "locked" && skill.unlock_hint && (
                      <div className="skill-tree-hint">{skill.unlock_hint}</div>
                    )}
                    {interactive && skill.status === "unlocked" && !skill.requires_met && (
                      <div className="skill-tree-hint">
                        선행 스킬 필요: {skill.requires.join(", ")}
                      </div>
                    )}
                    {interactive && skill.action !== null && (
                      <button
                        type="button"
                        className="skill-tree-action"
                        disabled={!canAct}
                        onClick={() => onLearnSkill?.(skill.id)}
                      >
                        {busy
                          ? "처리 중…"
                          : skill.action === "learn"
                            ? `습득 -${skill.action_cost}p`
                            : `강화 -${skill.action_cost}p`}
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--ink-dim)" }}>
                표시할 스킬 트리가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
