import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  notifyScreenCache,
  readScreenCache,
  subscribeScreenCache,
  touchScreenCache,
  writeScreenCache,
} from "./screenCache";

export interface CachePolicy {
  isFresh: (savedAt: number) => boolean;
  maxAgeMs?: number;
  revalidateOnFocus?: boolean;
}

export function freshFor(ms: number): (savedAt: number) => boolean {
  return (savedAt) => Date.now() - savedAt < ms;
}

export function freshUntilMidnight(savedAt: number): boolean {
  return new Date(savedAt).toDateString() === new Date().toDateString();
}

const inFlight = new Map<string, Promise<void>>();
const failedKeys = new Set<string>();
const queuedKeys = new Set<string>();

function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function revalidateResource<T>(
  key: string,
  load: () => Promise<T>,
  options: { force?: boolean } = {},
): Promise<void> {
  const running = inFlight.get(key);
  if (running) {
    if (!options.force || queuedKeys.has(key)) return running;
    queuedKeys.add(key);
    return running.then(() => {
      queuedKeys.delete(key);
      return revalidateResource(key, load);
    });
  }
  const task = load()
    .then((data) => {
      const wasFailed = failedKeys.delete(key);
      const current = readScreenCache<T>(key);
      if (current && sameData(current.data, data)) {
        touchScreenCache(key);
        if (wasFailed) notifyScreenCache(key);
        return;
      }
      writeScreenCache(key, data);
    })
    .catch(() => {
      if (failedKeys.has(key)) return;
      failedKeys.add(key);
      notifyScreenCache(key);
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, task);
  return task;
}

export function useCachedResource<T>(
  key: string,
  load: () => Promise<T>,
  policy: CachePolicy,
): { data: T | undefined; isLoading: boolean } {
  const loadRef = useRef(load);
  loadRef.current = load;
  const policyRef = useRef(policy);
  policyRef.current = policy;

  const subscribe = useCallback(
    (listener: () => void) => subscribeScreenCache(key, listener),
    [key],
  );
  const entry = useSyncExternalStore(subscribe, () => readScreenCache<T>(key));
  const failed = useSyncExternalStore(subscribe, () => failedKeys.has(key));

  useEffect(() => {
    const check = () => {
      const current = readScreenCache(key);
      if (!current || !policyRef.current.isFresh(current.savedAt)) {
        void revalidateResource(key, () => loadRef.current());
      }
    };
    check();
    if (!policyRef.current.revalidateOnFocus) return;
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [key]);

  const usable =
    entry && (!policy.maxAgeMs || Date.now() - entry.savedAt <= policy.maxAgeMs)
      ? entry
      : undefined;
  return { data: usable?.data, isLoading: !usable && !failed };
}
