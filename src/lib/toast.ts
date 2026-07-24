// Lightweight module-level toast bus so non-hook helpers (e.g. the shared
// `api()` fetch wrappers) can raise a toast without React context plumbing.
export type ToastKind = "error" | "success" | "info";
export type ToastItem = { id: number; message: string; kind: ToastKind };
type Listener = (t: ToastItem) => void;

let listeners: Listener[] = [];
let counter = 0;

export function toast(message: string, kind: ToastKind = "error") {
  const item: ToastItem = { id: ++counter, message, kind };
  listeners.forEach((l) => l(item));
}

export function subscribeToast(l: Listener) {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}
