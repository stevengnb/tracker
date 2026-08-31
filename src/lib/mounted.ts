"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hydration guard: false during SSR and the hydration render, true after.
 * Replaces the `useState(false)` + `useEffect(() => setMounted(true), [])`
 * pattern (which trips react-hooks/set-state-in-effect) — same behaviour,
 * one render pass, no effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
