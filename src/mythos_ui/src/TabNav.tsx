type ActiveTab = "story" | "codex" | "dev";

interface TabNavProps {
  activeTab: ActiveTab;
  onTabClick: (tab: ActiveTab) => void;
}

export function TabNav({ activeTab, onTabClick }: TabNavProps) {
  return (
    <div className="tabs">
      <button
        className={`tab-btn ${activeTab === "story" ? "active" : ""}`}
        onClick={() => onTabClick("story")}
      >
        서사 접속
      </button>
      <button
        className={`tab-btn ${activeTab === "codex" ? "active" : ""}`}
        onClick={() => onTabClick("codex")}
      >
        기억의 별자리 (Codex)
      </button>
      <button
        className={`tab-btn ${activeTab === "dev" ? "active" : ""}`}
        onClick={() => onTabClick("dev")}
      >
        개발자 콘솔 (Dev)
      </button>
    </div>
  );
}
