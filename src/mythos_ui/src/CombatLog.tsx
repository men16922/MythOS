export function CombatLog({ log }: { log: string }) {
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
      <div className="cc-label">전술 전투 로그</div>
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
