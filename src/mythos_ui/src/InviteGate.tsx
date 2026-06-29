import { useState } from "react";
import { useLang } from "./i18n/lang";

interface InviteGateProps {
  // Validate + persist the entered key. Resolves true if accepted, false if rejected.
  onSubmit: (key: string) => Promise<boolean>;
}

export function InviteGate({ onSubmit }: InviteGateProps) {
  const { t } = useLang();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async () => {
    const trimmed = key.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(false);
    try {
      const ok = await onSubmit(trimmed);
      if (!ok) setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="invite-gate">
      <div className="invite-gate-card">
        <div className="invite-gate-brand">{t("gate.brand")}</div>
        <h2>{t("gate.title")}</h2>
        <p className="invite-gate-hint">{t("gate.hint")}</p>
        <div className="invite-gate-row">
          <input
            type="text"
            autoFocus
            placeholder={t("gate.placeholder")}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <button onClick={submit} disabled={busy || !key.trim()}>
            {busy ? t("gate.checking") : t("gate.enter")}
          </button>
        </div>
        {error && <p className="invite-gate-error">{t("gate.invalid")}</p>}
      </div>
    </div>
  );
}
