import type { CodexLists } from "./viewModels";
import type { SkillTreeNode, SkillTreeResponse } from "./types";
import { deriveSkillAction } from "./skillState";
import { Surface } from "./Surface";
import { useLang } from "./i18n/lang";

interface SkillTreePanelProps {
  codexLists: CodexLists;
  scenarioId: string;
  skillTree?: SkillTreeResponse | null;
  onLearnSkill?: (skillId: string) => void;
  learningSkillId?: string | null;
  skillError?: string | null;
  skillNotice?: string | null;
}

function skillGraphColumns(skills: SkillTreeNode[]): SkillTreeNode[][] {
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const memo = new Map<string, number>();

  const depthOf = (skill: SkillTreeNode, visiting = new Set<string>()): number => {
    const cached = memo.get(skill.id);
    if (cached != null) return cached;
    if (visiting.has(skill.id)) return 0;
    const nextVisiting = new Set(visiting).add(skill.id);
    const dependencies = skill.requires.map((id) => byId.get(id)).filter((item): item is SkillTreeNode => Boolean(item));
    const depth = dependencies.length > 0
      ? 1 + Math.max(...dependencies.map((dependency) => depthOf(dependency, nextVisiting)))
      : 0;
    memo.set(skill.id, depth);
    return depth;
  };

  const columns: SkillTreeNode[][] = [];
  skills.forEach((skill) => {
    const depth = depthOf(skill);
    (columns[depth] ||= []).push(skill);
  });
  columns.forEach((column) => column.sort((left, right) => (left.role || "").localeCompare(right.role || "") || left.name.localeCompare(right.name)));
  return columns;
}

export function SkillTreePanel({
  codexLists,
  scenarioId,
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
        rank_bonuses: { power: 0, focus_reduction: 0, cooldown_reduction: 0 },
        next_rank_bonuses: { power: 0, focus_reduction: 0, cooldown_reduction: 0 },
        requires: [],
        requires_met: true,
        is_base: false,
        action: null,
        action_cost: 0,
        can_afford: false,
      }));
  const columns = skillGraphColumns(skills);
  const learnedCount = skills.filter((skill) => skill.status === "learned").length;
  const availableCount = skills.filter((skill) => skill.status === "unlocked").length;
  const lockedCount = skills.filter((skill) => skill.status === "locked").length;
  const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]));

  return (
    <div id="skill-tab-content">
      <Surface variant="surface">
        <h2 className="tab-panel-title">SKILL TREE · {t("skill.insight")} {insight}p</h2>
        <div className="skill-tree-hint" style={{ marginBottom: "10px" }}>
          {t("skill.graphHint")} · {t("skill.insightHint")}
        </div>
        <div className="skill-tree-summary" aria-label={t("skill.treeSummary")}>
          <span className="learned">{t("skill.learned")} <strong>{learnedCount}</strong></span>
          <span className="unlocked">{t("skill.available")} <strong>{availableCount}</strong></span>
          <span className="locked">{t("skill.locked")} <strong>{lockedCount}</strong></span>
        </div>
        {skillNotice && <div className="skill-tree-notice">{skillNotice}</div>}
        {skillError && <div className="skill-tree-error">{skillError}</div>}
        <div className="skill-tree-graph" role="tree" aria-label={t("skill.graphAria")}>
          {skills.length > 0 ? (
            columns.map((column, columnIndex) => (
              <div className="skill-tree-column" key={columnIndex} data-depth={columnIndex}>
                <div className="skill-tree-column-title">
                  <span>{columnIndex === 0 ? t("skill.foundation") : columnIndex === columns.length - 1 ? t("skill.advanced") : t("skill.branches")}</span>
                  <small>0{columnIndex + 1}</small>
                </div>
                <div className="skill-tree-column-nodes">
                  {column.map((skill) => {
                    const busy = learningSkillId === skill.id;
                    const actionView = deriveSkillAction(skill, interactive, busy, t);
                    return (
                      <div className={`skill-tree-item ${skill.status}`} key={skill.id} role="treeitem">
                        <div className="skill-tree-node-main">
                          <img
                            className="skill-tree-icon"
                            src={`/resources/${scenarioId}/skills/${skill.id}.png`}
                            alt=""
                            loading="lazy"
                            onError={(event) => { event.currentTarget.hidden = true; }}
                          />
                          <div>
                            <div className="skill-tree-head">
                              <span>{skill.name}</span>
                              <span>
                                {skill.status === "learned"
                                  ? `${t("skill.rank")} ${skill.rank}${skill.max_rank > 1 ? `/${skill.max_rank}` : ""}`
                                  : skill.status === "unlocked" ? t("skill.available") : t("skill.locked")}
                              </span>
                            </div>
                            <div className="skill-tree-meta">
                              {skill.role || "skill"} · {t("skill.tier")} {skill.tier ?? 0}
                              {typeof skill.range === "number" ? ` · ${t("skill.range")} ${skill.range}` : ""}
                              {typeof skill.cooldown === "number" ? ` · ${t("skill.cooldown")} ${skill.cooldown}` : ""}
                            </div>
                          </div>
                        </div>
                        {skill.requires.length > 0 && (
                          <div className="skill-tree-dependencies">
                            <span>←</span>
                            {skill.requires.map((required) => (
                              <span key={required}>{skillNames.get(required) || required}</span>
                            ))}
                          </div>
                        )}
                        <div className="skill-rank-row" aria-label={`${skill.name} ${t("skill.enhanceStageAria")}`}>
                          {Array.from({ length: skill.max_rank }).map((_, idx) => (
                            <span key={idx} className={idx < skill.rank ? "filled" : ""} title={`${t("skill.rank")} ${idx + 1}`} />
                          ))}
                          {skill.action === "rankup" && <small>{t("skill.nextEnhance")} {skill.rank + 1}</small>}
                          {skill.action === "learn" && <small>{t("skill.learnAdds")}</small>}
                          {skill.is_base && <small>{t("skill.baseSkill")}</small>}
                        </div>
                        {skill.status === "learned" && (
                          <div className="skill-rank-effect">
                            {t("skill.rankEffect")}: +{skill.rank_bonuses.power} {t("skill.power")}
                            {skill.rank_bonuses.focus_reduction > 0 ? ` · ${t("skill.focus")} -${skill.rank_bonuses.focus_reduction}` : ""}
                            {skill.rank_bonuses.cooldown_reduction > 0 ? ` · ${t("skill.cooldown")} -${skill.rank_bonuses.cooldown_reduction}` : ""}
                          </div>
                        )}
                        {(skill.tags || []).length > 0 && (
                          <div className="skill-tree-tags">
                            {(skill.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
                          </div>
                        )}
                        {skill.status === "locked" && skill.unlock_hint && <div className="skill-tree-hint">{skill.unlock_hint}</div>}
                        {actionView.show && actionView.blocked === "prereq" && (
                          <div className="skill-tree-hint">{t("skill.requires")}: {skill.requires.map((id) => skillNames.get(id) || id).join(", ")}</div>
                        )}
                        {actionView.show && actionView.blocked === "insight" && (
                          <div className="skill-tree-hint">{t("skill.lowInsight")} · {t("skill.have")} {insight}p / {t("skill.need")} {skill.action_cost}p</div>
                        )}
                        {actionView.show && (
                          <button type="button" className="skill-tree-action" disabled={actionView.disabled} onClick={() => onLearnSkill?.(skill.id)}>
                            {actionView.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--ink-dim)" }}>
              {t("skill.noTree")}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
