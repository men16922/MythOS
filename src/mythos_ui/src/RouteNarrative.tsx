import { CodexSection } from "./CodexSection";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type { RouteMap } from "./types";

// Ending id -> player-facing label + a one-line plain-language gloss of what the
// outcome actually means (condensed from scenario.json `endings[].narration`). The
// strings are localized; this map only holds the i18n key pair per ending id.
const ENDING_KEYS: Record<string, { label: StringKey; gloss: StringKey }> = {
  ending_safe_refuge: { label: "route.end.safeRefuge.label", gloss: "route.end.safeRefuge.gloss" },
  ending_code_rewrite: { label: "route.end.codeRewrite.label", gloss: "route.end.codeRewrite.gloss" },
  ending_noble_sacrifice: { label: "route.end.nobleSacrifice.label", gloss: "route.end.nobleSacrifice.gloss" },
  ending_erasure: { label: "route.end.erasure.label", gloss: "route.end.erasure.gloss" },
};

/**
 * Narrative-meta view of the current route: which lens (perspective) the player
 * is living right now and which ending their accumulated choices lean toward.
 * Lives in the 기억의 별자리(Codex) tab so the operation map stays a clean graph.
 */
export function RouteNarrative({
  routeMap,
  defaultOpen = true,
}: {
  routeMap?: RouteMap | null;
  defaultOpen?: boolean;
}) {
  const { t } = useLang();
  const layers = routeMap?.layers || [];
  if (!routeMap || layers.length === 0) return null;

  const nodes = routeMap.nodes || {};
  const currentId = routeMap.current || (layers[0] || [])[0];
  const activePerspectives = routeMap.active_perspectives || {};
  const leaderboard = routeMap.ending_leaderboard || [];
  const currentNode = nodes[currentId];
  const activeLensId = activePerspectives[currentId];
  const activeLens = (currentNode?.perspectives || []).find((p) => p.id === activeLensId);
  const topEndingScore = leaderboard.length ? leaderboard[0][1] : 0;

  if (!activeLens && leaderboard.length === 0) return null;

  return (
    <CodexSection title={t("route.flow")} defaultOpen={defaultOpen} className="route-narrative">
      {activeLens && (
        <div className="route-active-lens">
          <span className="route-active-tag">{t("route.currentTag")}</span> {activeLens.lens}
          {activeLens.summary && <div className="route-active-summary">{activeLens.summary}</div>}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="route-ending-lead">
          <div className="route-ending-title">
            {t("route.headingEnding")}
            <span
              className="route-ending-help-icon"
              title={t("route.endingHelpTitle")}
            >
              ⓘ
            </span>
          </div>
          <div className="route-ending-help">
            {t("route.endingHelpNote")}
          </div>
          {leaderboard.slice(0, 3).map(([id, score]) => {
            const meta = ENDING_KEYS[id];
            return (
              <div key={id} className="route-ending-row">
                <div className="route-ending-head">
                  <span className="route-ending-name">{meta ? t(meta.label) : id}</span>
                  <span className="route-ending-bar">
                    <span
                      className="route-ending-fill"
                      style={{ width: `${topEndingScore ? (score / topEndingScore) * 100 : 0}%` }}
                    />
                  </span>
                </div>
                {meta?.gloss && <div className="route-ending-gloss">{t(meta.gloss)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </CodexSection>
  );
}
