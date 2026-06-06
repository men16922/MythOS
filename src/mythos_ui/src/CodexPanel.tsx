import type { CodexLists } from "./viewModels";

interface CodexPanelProps {
  codexLists: CodexLists;
}

export function CodexPanel({ codexLists }: CodexPanelProps) {
  return (
    <div id="codex-tab-content">
      <div className="panel">
        <h2
          style={{
            color: "var(--term)",
            fontSize: "16px",
            margin: "0 0 16px",
          }}
        >
          기억의 별자리
        </h2>
        <div className="codex-grid">
          <div className="codex-sec">
            <div className="codex-sec-title">단서 목록 (Clues)</div>
            <div className="codex-list">
              {codexLists.clues.length > 0 ? (
                codexLists.clues.map((clue, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">
                      <span>{clue.symbol}</span>
                      <span>단서</span>
                    </div>
                    <div className="codex-item-desc">{clue.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  획득한 단서가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">세계 아카이브 (Lore)</div>
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
                  조회 가능한 아카이브가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">소지 인벤토리 (Inventory)</div>
            <div className="codex-list">
              {codexLists.inventory.length > 0 ? (
                codexLists.inventory.map((item, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">{String(item)}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  소지품이 비어 있습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">등장인물 (Characters)</div>
            <div className="codex-list">
              {codexLists.characters.length > 0 ? (
                codexLists.characters.map((character, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">{character.symbol}</div>
                    <div className="codex-item-desc">{character.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  기록된 인물이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="codex-sec" style={{ marginTop: "16px" }}>
          <div className="codex-sec-title">
            이전 루프 회상 잔향 (Active Echoes)
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
                감지된 회상 잔향이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
