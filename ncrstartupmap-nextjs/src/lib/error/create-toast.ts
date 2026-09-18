export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

let toasts: ToastMessage[] = [];

export function createToast(message: Omit<ToastMessage, "id">): ToastMessage {
  const toast: ToastMessage = {
    ...message,
    id: Math.random().toString(36).substring(7),
  };
  toasts.push(toast);
  return toast;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
}

export function getToasts(): ToastMessage[] {
  return toasts;
}
