export type ActiveTab = "story" | "codex" | "character" | "skills" | "dev";

interface TabNavProps {
  activeTab: ActiveTab;
  onTabClick: (tab: ActiveTab) => void;
  notices?: Partial<Record<ActiveTab, string>>;
}

function TabButton({
  tab,
  label,
  activeTab,
  notices,
  onTabClick,
}: {
  tab: ActiveTab;
  label: string;
  activeTab: ActiveTab;
  notices?: Partial<Record<ActiveTab, string>>;
  onTabClick: (tab: ActiveTab) => void;
}) {
  const notice = notices?.[tab];
  return (
    <button
      className={`tab-btn ${activeTab === tab ? "active" : ""}`}
      onClick={() => onTabClick(tab)}
      title={notice || undefined}
    >
      {label}
      {notice && <span className="tab-notice-dot" aria-label={notice} />}
    </button>
  );
}

export function TabNav({ activeTab, onTabClick, notices }: TabNavProps) {
  return (
    <div className="tabs">
      <TabButton tab="story" label="서사 접속" activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      <TabButton tab="codex" label="기억의 별자리 (Codex)" activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      <TabButton tab="character" label="CHARACTER" activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      <TabButton tab="skills" label="SKILL TREE" activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      <TabButton tab="dev" label="개발자 콘솔 (Dev)" activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
    </div>
  );
}
