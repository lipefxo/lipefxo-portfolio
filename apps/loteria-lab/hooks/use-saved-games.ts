"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSavedCollection } from "../lib/lottery/storage";
import type { SavedGame } from "../lib/lottery/types";

const key = "loteria-lab:games:v1";
const empty = '{"schemaVersion":1,"games":[]}';
const listeners = new Set<() => void>();
let sessionFallback: string | null = null;
function snapshot() {
  if (sessionFallback !== null) return sessionFallback;
  try {
    return localStorage.getItem(key) ?? empty;
  } catch {
    return empty;
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const changed = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener("storage", changed);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", changed);
  };
}
const subscribeHydration = () => () => {};

export function useSavedGames() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => empty);
  const loaded = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const parsed = useMemo(() => {
    try {
      return { games: parseSavedCollection(raw), error: "" };
    } catch {
      return {
        games: [] as SavedGame[],
        error:
          "Os dados salvos não puderam ser lidos. Baixe uma cópia para recuperação antes de substituí-los.",
      };
    }
  }, [raw]);
  function store(games: SavedGame[]) {
    const next = JSON.stringify({ schemaVersion: 1, game: "megasena", games });
    parseSavedCollection(next);
    let persisted = true;
    try {
      // Preserve corrupted input before any replacement; if the backup fails,
      // retain the new collection in this session instead of destroying it.
      if (parsed.error)
        localStorage.setItem(`${key}:recovery:${Date.now()}`, raw);
      localStorage.setItem(key, next);
      sessionFallback = null;
    } catch {
      sessionFallback = next;
      persisted = false;
    }
    listeners.forEach((listener) => listener());
    return persisted;
  }
  return { ...parsed, loaded, raw, store };
}
