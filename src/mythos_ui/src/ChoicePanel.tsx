import { choiceCostLabel, choiceRequirementLabel, isChoiceDisabled, cleanChoiceLabel } from "./choices";
import { Popover } from "./Popover";
import type { RouteMap, RouteNode, SceneChoice } from "./types";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";

interface ChoicePanelProps {
  choices: SceneChoice[];
  stability: number;
  tension: number;
  routeMap?: RouteMap | null;
  onChoose: (choiceId: string) => void;
  // Choice optimistically in flight ("전송 중"): that card shows a sending
  // badge and every card is disabled until the stream/error resolves it.
  pendingChoiceId?: string | null;
}

function routeDestination(choice: SceneChoice, routeMap?: RouteMap | null): { node: RouteNode; index: number } | null {
  if (!choice.choice_id.startsWith("route:") || !routeMap) return null;
  const nodeId = choice.choice_id.slice("route:".length);
  const node = routeMap.nodes?.[nodeId];
  if (!node) return null;
  const outgoing = routeMap.current ? routeMap.edges?.[routeMap.current] || [] : [];
  const index = outgoing.indexOf(nodeId);
  return { node, index: index >= 0 ? index : 0 };
}

// StS-style risk/reward hint per destination node type, so a junction pick is a
// plan (elite-vs-campfire tradeoff) instead of a label guess.
const NODE_TYPE_HINT_KEYS: Record<string, StringKey> = {
  market: "choice.node.market",
  rest: "choice.node.rest",
  patrol: "choice.node.patrol",
  combat: "choice.node.combat",
  clue: "choice.node.clue",
  event: "choice.node.event",
  story: "choice.node.story",
  boss: "choice.node.boss",
};

// M3 (mobile clarity): the axis chip's hint used to be a hover-only `title=`,
// invisible on touch. DS1b: now a thin wrapper over the shared Popover
// (bottom-left anchor), which keeps desktop hover and adds tap-to-toggle,
// without nesting a focusable control inside the choice <button>.
function AxisChip({ label, tooltip, ariaLabel }: { label: string; tooltip?: string; ariaLabel: string }) {
  return (
    <Popover className="cmd-chip axis-chip" anchor="bottom-left" tooltip={tooltip} ariaLabel={ariaLabel}>
      <span>{label}</span>
      <span className="axis-chip-icon" aria-hidden="true">ⓘ</span>
    </Popover>
  );
}

const intentKey = (intent?: string): StringKey | null => {
  if (!intent) return null;
  const cleanIntent = intent.trim().toLowerCase();
  if (cleanIntent.includes("explore")) return "choice.intent.explore";
  if (cleanIntent.includes("interact")) return "choice.intent.interact";
  if (cleanIntent.includes("rewrite")) return "choice.intent.rewrite";
  if (cleanIntent.includes("archive")) return "choice.intent.archive";
  return null;
};

export function ChoicePanel({ choices, stability, tension, routeMap, onChoose, pendingChoiceId }: ChoicePanelProps) {
  const { t } = useLang();
  const anyPending = pendingChoiceId != null;
  return (
    <div id="choices">
      {choices.map((choice, index) => {
        const isPending = pendingChoiceId === choice.choice_id;
        const disabled = isChoiceDisabled(choice, stability, tension) || anyPending;
        const iKey = intentKey(choice.intent);
        const intentLabel = iKey ? t(iKey) : null;
        const destination = routeDestination(choice, routeMap);
        const routeClass = destination ? ` route-choice-link route-choice-link-${destination.index % 4}` : "";
        const axisTooltip = choice.axis_label
          ? `${t("choice.axis.tooltip")} ${choice.axis_label}`
          : undefined;
        return (
          <button
            key={choice.choice_id}
            className={`command-card${routeClass}${isPending ? " choice-pending" : ""}`}
            disabled={disabled}
            aria-busy={isPending || undefined}
            onClick={() => onChoose(choice.choice_id)}
            style={disabled && !isPending ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <div className="cmd-hotkey">
              {t("choice.pick")} {index + 1}
              {isPending && <span className="cmd-chip choice-sending">{t("choice.sending")}</span>}
            </div>
            <div className="cmd-label">
              {cleanChoiceLabel(choice.label)}
              {choiceCostLabel(choice, t)}
              {choiceRequirementLabel(choice, t)}
            </div>
            <div className="cmd-meta-row">
              {choice.combat_risk && (
                <span className="cmd-chip combat-risk">{t("choice.combatRisk")}</span>
              )}
              {choice.axis_label && (
                <AxisChip
                  label={choice.axis_label}
                  tooltip={axisTooltip}
                  ariaLabel={`${t("choice.axis.aria")}: ${choice.axis_label}`}
                />
              )}
              {intentLabel && <span className="cmd-chip muted">{intentLabel}</span>}
              {choice.stakes?.slice(1).map((stake) => (
                <span key={stake} className="cmd-chip muted">
                  {stake}
                </span>
              ))}
            </div>
            {choice.result_preview && (
              <div className="cmd-preview">{t("choice.preview")}: {choice.result_preview}</div>
            )}
            {destination && (
              <div className="cmd-route-target">
                <span className="route-link-marker">{destination.index + 1}</span>
                <span>{t("choice.destination")}: {destination.node.title || destination.node.label}</span>
                {destination.node.risk != null && (
                  <small>{t("aside.route.risk")} {destination.node.risk}</small>
                )}
                {NODE_TYPE_HINT_KEYS[destination.node.type] && (
                  <small className="route-node-hint">
                    {t(NODE_TYPE_HINT_KEYS[destination.node.type])}
                  </small>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
