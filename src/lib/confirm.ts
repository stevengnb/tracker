// Promise-based confirm dialog, driven by a single mounted <ConfirmHost>.
// Call `await confirmDialog({ message })` in place of window.confirm().
export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type ConfirmRequest = {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
};

let listener: ((req: ConfirmRequest) => void) | null = null;

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      // Fallback if the host isn't mounted yet.
      resolve(typeof window !== "undefined" ? window.confirm(opts.message) : false);
      return;
    }
    listener({ opts, resolve });
  });
}

export function registerConfirm(l: (req: ConfirmRequest) => void) {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}
