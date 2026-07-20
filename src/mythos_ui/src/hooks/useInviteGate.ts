import { useCallback, useEffect, useState } from "react";

import { setInviteKey, verifyInvite } from "../api";

/**
 * Closed-beta invite gate: probes the stored/URL key against the gated API once
 * on mount and exposes the resolved identity behind a small read surface.
 *
 * - `gate`: "checking" until the probe resolves, "blocked" if the key is
 *   missing/invalid (App shows the gate screen), "ok" if valid OR gating is off.
 *   Network/server errors FAIL OPEN so a backend hiccup can't lock everyone out.
 * - `isAdmin`: unlocks operator-only UI (Dev Console, boot combat sim) — true
 *   when gating is off (local/open dev) or the key is an admin key. Beta testers
 *   never see it.
 * - `gated`: whether the server runs invite-gated at all (CBT). Gated + non-admin
 *   hides the boot combat simulator (it creates real loops → burns the tester
 *   loop cap).
 * - `submitKey(key)`: stores the key and re-probes; resolves to whether it was
 *   accepted (drives the gate-screen submit).
 *
 * Zero inputs — the `api` module (`verifyInvite`/`setInviteKey`) is internal.
 */
export function useInviteGate() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [gated, setGated] = useState(false);
  const [gate, setGate] = useState<"checking" | "blocked" | "ok">("checking");

  useEffect(() => {
    let cancelled = false;
    verifyInvite()
      .then((status) => {
        if (!cancelled) {
          setGate(status.ok ? "ok" : "blocked");
          setIsAdmin(status.isAdmin);
          setGated(status.gated);
        }
      })
      .catch(() => {
        if (!cancelled) setGate("ok");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitKey = useCallback(async (key: string): Promise<boolean> => {
    setInviteKey(key);
    const status = await verifyInvite();
    setIsAdmin(status.isAdmin);
    setGated(status.gated);
    if (status.ok) setGate("ok");
    return status.ok;
  }, []);

  return { gate, gated, isAdmin, submitKey };
}
