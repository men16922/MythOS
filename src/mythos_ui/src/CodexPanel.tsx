import { CutsceneGallery } from "./CutsceneGallery";
import { Surface } from "./Surface";
import { ProgressDashboard } from "./ProgressDashboard";
import { RouteNarrative } from "./RouteNarrative";
import { RunHistoryPanel } from "./SaveHistoryPanel";
import { mergedRuns } from "./runHistory";
import { useLang } from "./i18n/lang";
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
  const { t } = useLang();
  const visibleRuns = mergedRuns(runsHistory, memoryOverview?.run_summaries);
  return (
    <div id="codex-tab-content">
      <Surface variant="surface">
        <h2 className="tab-panel-title">{t("codex.title")}</h2>
        <div className="codex-grid">
          <RouteNarrative routeMap={routeMap} />
          <div className="codex-sec">
            <div className="codex-sec-title">{t("codex.clues")}</div>
            <div className="codex-section-hint">{t("codex.cluesHint")}</div>
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
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">{t("codex.lore")}</div>
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
          </div>
        </div>

        <div className="codex-sec" style={{ marginTop: "16px" }}>
          <div className="codex-sec-title">
            {t("codex.echoes")}
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
                {t("codex.noEchoes")}
              </div>
            )}
          </div>
        </div>

        <div className="codex-status-grid">
          <ProgressDashboard
            snapshot={snapshot ?? null}
            memoryOverview={memoryOverview}
            runs={visibleRuns}
          />
          <RunHistoryPanel runsHistory={visibleRuns} />
        </div>

        <CutsceneGallery
          entries={memoryOverview?.cutscene_gallery}
          scenarioId={scenarioId}
        />
      </Surface>
    </div>
  );
}
