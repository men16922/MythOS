import { useLang } from "./i18n/lang";

export type ActiveTab = "story" | "codex" | "character" | "skills" | "dev";

interface TabNavProps {
  activeTab: ActiveTab;
  onTabClick: (tab: ActiveTab) => void;
  notices?: Partial<Record<ActiveTab, string>>;
  // Dev Console tab is operator-only — rendered only for admin keys / local-open dev.
  showDev?: boolean;
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

export function TabNav({ activeTab, onTabClick, notices, showDev = false }: TabNavProps) {
  const { t } = useLang();
  return (
    <div className="tabs">
      <TabButton tab="story" label={t("tab.story")} activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      <TabButton tab="codex" label={t("tab.codex")} activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      <TabButton tab="character" label={t("tab.character")} activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      <TabButton tab="skills" label={t("tab.skills")} activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      {showDev && (
        <TabButton tab="dev" label={t("tab.dev")} activeTab={activeTab} notices={notices} onTabClick={onTabClick} />
      )}
    </div>
  );
}
