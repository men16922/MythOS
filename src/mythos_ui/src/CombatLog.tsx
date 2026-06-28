import { useLang } from "./i18n/lang";

export function CombatLog({ log }: { log: string }) {
  const { t } = useLang();
  if (!log) return null;
  return (
    <div
      id="combat-log-container"
      style={{
        marginTop: "14px",
        borderTop: "1px solid var(--line-soft)",
        paddingTop: "12px",
      }}
    >
      <div className="cc-label">{t("combatLog.title")}</div>
      <div
        id="combat-log"
        style={{
          fontSize: "12px",
          color: "var(--ink-dim)",
          maxHeight: "150px",
          overflowY: "auto",
          fontFamily: "var(--mono)",
          whiteSpace: "pre-wrap",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid var(--line-soft)",
          padding: "8px",
          borderRadius: "4px",
        }}
      >
        {log}
      </div>
    </div>
  );
}
