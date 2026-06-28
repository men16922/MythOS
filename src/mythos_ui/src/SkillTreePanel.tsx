import type { CodexLists } from "./viewModels";
import type { SkillTreeNode, SkillTreeResponse } from "./types";
import { deriveSkillAction } from "./skillState";
import { useLang } from "./i18n/lang";

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
  const { t } = useLang();
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
        <h2 className="tab-panel-title">SKILL TREE · {t("skill.insight")} {insight}p</h2>
        <div className="skill-tree-hint" style={{ marginBottom: "10px" }}>
          {t("skill.insightHint")}
        </div>
        {skillNotice && <div className="skill-tree-notice">{skillNotice}</div>}
        {skillError && <div className="skill-tree-error">{skillError}</div>}
        <div className="skill-tree-list">
          {skills.length > 0 ? (
            skills.map((skill) => {
              const busy = learningSkillId === skill.id;
              const actionView = deriveSkillAction(skill, interactive, busy, t);
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
                  <div className="skill-rank-row" aria-label={`${skill.name} ${t("skill.enhanceStageAria")}`}>
                    {Array.from({ length: skill.max_rank }).map((_, idx) => (
                      <span
                        key={idx}
                        className={idx < skill.rank ? "filled" : ""}
                        title={`Rank ${idx + 1}`}
                      />
                    ))}
                    {skill.action === "rankup" && (
                      <small>{t("skill.nextEnhance")} {skill.rank + 1}</small>
                    )}
                    {skill.action === "learn" && <small>{t("skill.learnAdds")}</small>}
                    {skill.is_base && <small>{t("skill.baseSkill")}</small>}
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
                  {actionView.show && actionView.blocked === "prereq" && (
                    <div className="skill-tree-hint">
                      {t("skill.requires")}: {skill.requires.join(", ")}
                    </div>
                  )}
                  {actionView.show && actionView.blocked === "insight" && (
                    <div className="skill-tree-hint">
                      {t("skill.lowInsight")} · {t("skill.have")} {insight}p / {t("skill.need")} {skill.action_cost}p
                    </div>
                  )}
                  {actionView.show && (
                    <button
                      type="button"
                      className="skill-tree-action"
                      disabled={actionView.disabled}
                      onClick={() => onLearnSkill?.(skill.id)}
                    >
                      {actionView.label}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ color: "var(--ink-dim)" }}>
              {t("skill.noTree")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
