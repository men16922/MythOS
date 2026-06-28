import { createContext, useContext } from "react";
import { ko, type StringKey } from "./strings.ko";
import { en } from "./strings.en";

export type Lang = "ko" | "en";

export const DICTS: Record<Lang, Record<StringKey, string>> = { ko, en };

const STORAGE_KEY = "mythos_lang";

/**
 * Resolve the initial UI language: explicit `?lang=` URL param > localStorage choice >
 * default `ko`.
 *
 * English is opt-in only (via `?lang=en` or a stored choice) until the product default
 * flips. We deliberately do NOT auto-detect from `navigator.language` yet: that would
 * flip every English-locale browser — including the E2E/live-QA runners and current
 * Korean-QA sessions — to a still-incomplete English UI. Enable the navigator branch
 * together with the default flip (plan §3, after S3 golden-path screens land).
 */
export function resolveInitialLang(): Lang {
  try {
    const url = new URLSearchParams(window.location.search).get("lang");
    if (url === "en" || url === "ko") return url;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ko") return stored;
    return "ko";
  } catch {
    return "ko";
  }
}

export function persistLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* localStorage unavailable (private mode) — selection just won't persist */
  }
}

export interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
}

export const LangContext = createContext<LangContextValue | null>(null);

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within a LangProvider");
  }
  return ctx;
}
