import type { CutsceneGalleryEntry } from "./types";

interface CutsceneGalleryProps {
  entries?: CutsceneGalleryEntry[];
  scenarioId: string;
}

function lockHint(entry: CutsceneGalleryEntry): string {
  const parts = [`호감도 ${entry.affection_required}`];
  if (entry.flags_required.length > 0) {
    parts.push(`플래그 ${entry.flags_required.join(", ")}`);
  }
  return parts.join(" · ");
}

export function CutsceneGallery({
  entries = [],
  scenarioId,
}: CutsceneGalleryProps) {
  return (
    <div className="codex-sec" style={{ marginTop: "16px" }}>
      <div className="codex-sec-title">동료 컷씬 (Cutscene Gallery)</div>
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
                        대본 보기
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
                <div className="codex-item-desc">🔒 잠김 · {lockHint(entry)}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--ink-dim)" }}>
          아직 등록된 컷씬이 없습니다. 동료와의 관계가 깊어지면 특별한 장면이 열립니다.
        </div>
      )}
    </div>
  );
}
