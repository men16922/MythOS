import { CutsceneGallery } from "./CutsceneGallery";
import { CodexSection } from "./CodexSection";
import { isCoarseOrSmallViewport } from "./viewport";
import { Surface } from "./Surface";
import { ProgressDashboard } from "./ProgressDashboard";
import { RouteNarrative } from "./RouteNarrative";
import { RunHistoryPanel } from "./SaveHistoryPanel";
import { mergedRuns } from "./runHistory";
import { useLang } from "./i18n/lang";
import { glossaryFor } from "./glossary";
import type { CodexLists } from "./viewModels";
import type { MemoryOverview, RouteMap, RunSummary, RuntimeSnapshot } from "./types";

interface CodexPanelProps {
  codexLists: CodexLists;
  routeMap?: RouteMap | null;
  snapshot?: RuntimeSnapshot | null;
  runsHistory?: RunSummary[];
  memoryOverview?: MemoryOverview | null;
  scenarioId: string;
}

export function CodexPanel({
  codexLists,
  routeMap,
  snapshot,
  runsHistory = [],
  memoryOverview = null,
  scenarioId,
}: CodexPanelProps) {
  const { t, lang } = useLang();
  const visibleRuns = mergedRuns(runsHistory, memoryOverview?.run_summaries);
  const glossary = glossaryFor(scenarioId);
  // Desktop (fine pointer): sections open. Mobile: collapsed into a scannable list.
  const open = !isCoarseOrSmallViewport();
  return (
    <div id="codex-tab-content">
      <Surface variant="surface">
        <h2 className="tab-panel-title">{t("codex.title")}</h2>
        <div className="codex-grid">
          {glossary.length > 0 && (
            <CodexSection
              title={t("codex.glossary")}
              hint={t("codex.glossaryHint")}
              count={glossary.length}
              defaultOpen={open}
            >
              <div className="codex-list">
                {glossary.map((entry) => (
                  <div className="codex-item" key={entry.id}>
                    <div className="codex-item-head">
                      <span>{lang === "en" ? entry.term.en : entry.term.ko}</span>
                    </div>
                    <div className="codex-item-desc">
                      {lang === "en" ? entry.desc.en : entry.desc.ko}
                    </div>
                  </div>
                ))}
              </div>
            </CodexSection>
          )}
          <CodexSection
            title={t("codex.clues")}
            hint={t("codex.cluesHint")}
            count={codexLists.clues.length}
            defaultOpen={open}
          >
            <div className="codex-list">
              {codexLists.clues.length > 0 ? (
                codexLists.clues.map((clue, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">
                      <span>{clue.symbol}</span>
                      <span>{t("codex.clue")}</span>
                    </div>
                    <div className="codex-item-desc">{clue.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  {t("codex.noClues")}
                </div>
              )}
            </div>
          </CodexSection>

          <CodexSection
            title={t("codex.lore")}
            count={codexLists.allLore.length}
            defaultOpen={open}
          >
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
                  {t("codex.noLore")}
                </div>
              )}
            </div>
          </CodexSection>

          <CodexSection
            title={t("codex.echoes")}
            count={codexLists.echoes.length}
            defaultOpen={open}
          >
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
                  {t("codex.noEchoes")}
                </div>
              )}
            </div>
          </CodexSection>

          <RouteNarrative routeMap={routeMap} defaultOpen={open} />
        </div>

        <CodexSection
          title={t("codex.progress")}
          defaultOpen={open}
          className="codex-standalone"
        >
          <div className="codex-status-grid">
            <ProgressDashboard
              snapshot={snapshot ?? null}
              memoryOverview={memoryOverview}
              runs={visibleRuns}
            />
            <RunHistoryPanel runsHistory={visibleRuns} />
          </div>
        </CodexSection>

        <CutsceneGallery
          entries={memoryOverview?.cutscene_gallery}
          scenarioId={scenarioId}
          defaultOpen={open}
        />
      </Surface>
    </div>
  );
}
