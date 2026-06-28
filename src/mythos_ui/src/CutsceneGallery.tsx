import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type { CutsceneGalleryEntry } from "./types";

type TFn = (key: StringKey) => string;

interface CutsceneGalleryProps {
  entries?: CutsceneGalleryEntry[];
  scenarioId: string;
}

function lockHint(entry: CutsceneGalleryEntry, t: TFn): string {
  const parts = [`${t("cut.affection")} ${entry.affection_required}`];
  if (entry.flags_required.length > 0) {
    parts.push(`${t("cut.flag")} ${entry.flags_required.join(", ")}`);
  }
  return parts.join(" · ");
}

export function CutsceneGallery({
  entries = [],
  scenarioId,
}: CutsceneGalleryProps) {
  const { t } = useLang();
  return (
    <div className="codex-sec" style={{ marginTop: "16px" }}>
      <div className="codex-sec-title">{t("cut.title")}</div>
      {entries.length > 0 ? (
        <div className="skill-tree-list">
          {entries.map((entry) => (
            <div
              className="skill-tree-item"
              key={entry.id}
              style={entry.unlocked ? undefined : { opacity: 0.6 }}
            >
              <div className="codex-item-head">
                <span>{entry.title}</span>
                <span>{entry.companion}</span>
              </div>
              {entry.unlocked ? (
                <>
                  {entry.image && (
                    <img
                      src={`/resources/${scenarioId}/${entry.image}`}
                      alt={entry.title}
                      style={{
                        width: "100%",
                        borderRadius: "4px",
                        margin: "6px 0",
                      }}
                    />
                  )}
                  {entry.body && (
                    <details>
                      <summary
                        style={{ cursor: "pointer", color: "var(--term)" }}
                      >
                        {t("cut.viewScript")}
                      </summary>
                      <div
                        className="codex-item-desc"
                        style={{ whiteSpace: "pre-wrap", marginTop: "4px" }}
                      >
                        {entry.body}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <div className="codex-item-desc">🔒 {t("cut.locked")} · {lockHint(entry, t)}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--ink-dim)" }}>
          {t("cut.empty")}
        </div>
      )}
    </div>
  );
}
