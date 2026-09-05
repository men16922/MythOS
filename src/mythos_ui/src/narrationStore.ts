// The typewriter's revealed text as an external store. It used to be React
// state in App, so every 12 ms tick re-rendered the whole tree (header, tabs,
// story panel, aside with one popover per route node); now only the leaf that
// renders the narration subscribes (NarrationReveal, via useSyncExternalStore).
export interface NarrationSource {
  get(): string;
  subscribe(listener: () => void): () => void;
}

export interface NarrationStore extends NarrationSource {
  set(next: string | ((prev: string) => string)): void;
}

export function createNarrationStore(): NarrationStore {
  let text = "";
  const listeners = new Set<() => void>();
  return {
    get: () => text,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next) => {
      const value = typeof next === "function" ? next(text) : next;
      if (value === text) return;
      text = value;
      listeners.forEach((listener) => listener());
    },
  };
}
