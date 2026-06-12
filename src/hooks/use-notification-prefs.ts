import { useEffect, useState } from "react";

export type NotificationPrefs = {
  toasts: boolean;
  badge: boolean;
};

const LS_KEY = "sw-app:notification-prefs";
const DEFAULTS: NotificationPrefs = { toasts: true, badge: true };
const EVENT = "sw-app:notification-prefs-change";

export function readNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      toasts: typeof parsed.toasts === "boolean" ? parsed.toasts : DEFAULTS.toasts,
      badge: typeof parsed.badge === "boolean" ? parsed.badge : DEFAULTS.badge,
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeNotificationPrefs(prefs: NotificationPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => readNotificationPrefs());

  useEffect(() => {
    const sync = () => setPrefs(readNotificationPrefs());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", (e) => {
      if (e.key === LS_KEY) sync();
    });
    return () => {
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const update = (next: Partial<NotificationPrefs>) => {
    const merged = { ...prefs, ...next };
    writeNotificationPrefs(merged);
    setPrefs(merged);
  };

  return { prefs, update };
}
