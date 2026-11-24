import { toast } from "sonner";
import { setState, getState } from "./store";
import type { Result } from "./actions";
import type { StoreState } from "./types";

/** Apply a guarded transition; show its rule message instead of silently failing. */
export function commit(fn: (s: StoreState) => Result, success?: string): boolean {
  const r = fn(getState());
  if (!r.ok) {
    toast.error(r.error);
    return false;
  }
  setState(() => r.state);
  if (success) toast.success(success);
  return true;
}

export function apply(fn: (s: StoreState) => StoreState, success?: string) {
  setState(fn);
  if (success) toast.success(success);
}

export const nowIso = () => new Date().toISOString();
