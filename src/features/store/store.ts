import { useRef, useSyncExternalStore } from "react";
import type { StoreState } from "./types";
import { makeSampleState } from "./sample";

/**
 * Device-local repository. All reads/writes go through these functions so the persistence layer
 * can be swapped for an authenticated backend without touching the UI.
 */
const KEY = "earthos.v1";
const EMPTY: StoreState = { version: 1, seeded: false, passports: [], projects: [], aiRuns: [] };

let state: StoreState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (parsed && parsed.version === 1) {
        state = parsed;
        return;
      }
    }
  } catch {
    /* corrupted storage: start fresh */
  }
  state = makeSampleState();
  persist();
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — keep in memory */
  }
}

export function getState() {
  load();
  return state;
}

export function setState(fn: (s: StoreState) => StoreState) {
  load();
  state = fn(state);
  persist();
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && e.newValue) {
      try {
        state = JSON.parse(e.newValue) as StoreState;
        for (const x of listeners) x();
      } catch {
        /* ignore */
      }
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore<T>(selector: (s: StoreState) => T): T {
  // Cache by (state, selector) so derived arrays keep a stable identity between snapshot reads.
  const cache = useRef<{ s?: StoreState; f?: (s: StoreState) => T; v?: T }>({});
  const read = (s: StoreState) => {
    const c = cache.current;
    if (c.s !== s || c.f !== selector) cache.current = { s, f: selector, v: selector(s) };
    return cache.current.v as T;
  };
  return useSyncExternalStore(
    subscribe,
    () => read(getState()),
    () => read(EMPTY),
  );
}

/** True once the browser store has been read (avoids flashing empty states). */
export function useStoreReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function removeSamples() {
  setState((s) => ({
    ...s,
    passports: s.passports.filter((p) => !p.sample),
    projects: s.projects.filter((p) => !p.sample),
  }));
}
export function restoreSamples() {
  const sample = makeSampleState();
  setState((s) => ({
    ...s,
    passports: [...sample.passports, ...s.passports.filter((p) => !p.sample)],
    projects: [...sample.projects, ...s.projects.filter((p) => !p.sample)],
  }));
}
export function resetAll() {
  setState(() => ({ ...EMPTY, seeded: true }));
}
