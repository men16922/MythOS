import type { CodexLists } from "./viewModels";
import type { SkillTreeNode, SkillTreeResponse } from "./types";

interface SkillTreePanelProps {
  codexLists: CodexLists;
  skillTree?: SkillTreeResponse | null;
  onLearnSkill?: (skillId: string) => void;
  learningSkillId?: string | null;
  skillError?: string | null;
  skillNotice?: string | null;
}

export function SkillTreePanel({
  codexLists,
  skillTree,
  onLearnSkill,
  learningSkillId,
  skillError,
  skillNotice,
}: SkillTreePanelProps) {
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
    <div id="skill-tab-content">
      <div className="panel">
        <h2 className="tab-panel-title">SKILL TREE · 통찰 {insight}p</h2>
        <div className="skill-tree-hint" style={{ marginBottom: "10px" }}>
          통찰은 전투 보상, 루프 보관(+2), 단서 확보(+1), 전투 승리(+1)로 얻습니다.
        </div>
        {skillNotice && <div className="skill-tree-notice">{skillNotice}</div>}
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
                  <div className="skill-rank-row" aria-label={`${skill.name} 강화 단계`}>
                    {Array.from({ length: skill.max_rank }).map((_, idx) => (
                      <span
                        key={idx}
                        className={idx < skill.rank ? "filled" : ""}
                        title={`Rank ${idx + 1}`}
                      />
                    ))}
                    {skill.action === "rankup" && (
                      <small>다음 강화: Rank {skill.rank + 1}</small>
                    )}
                    {skill.action === "learn" && <small>습득 시 전투 액션바에 추가</small>}
                    {skill.is_base && <small>아키타입 기본 스킬</small>}
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
                        ? "처리 중..."
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
  );
}
