import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ko, type StringKey } from "./strings.ko";
import { DICTS, LangContext, persistLang, resolveInitialLang, type Lang } from "./lang";

/** Provides the active UI language + `t()` to the tree. Exported alone (no constants)
 * so React Fast Refresh stays happy; the hook/context live in ./lang. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(resolveInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistLang(next);
  }, []);

  const t = useCallback(
    (key: StringKey): string => DICTS[lang][key] ?? ko[key],
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
