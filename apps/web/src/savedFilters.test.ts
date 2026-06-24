import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedFilter } from "@vcm-testbed/domain";
import { SAVED_FILTERS_STORAGE_KEY, loadSavedFilters, storeSavedFilters } from "./savedFilters.js";

// The adapter reads/writes `window.localStorage`. These tests run in the Node
// environment, so we install a minimal in-memory localStorage on globalThis and
// exercise the public adapter functions to prove the "never throws, tolerates
// garbage" contract through real behavior (not implementation internals).

interface FakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function installStorage(storage: FakeStorage): void {
  (globalThis as unknown as { window?: { localStorage: FakeStorage } }).window = {
    localStorage: storage
  };
}

function memoryStorage(): { store: Map<string, string> } & FakeStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    }
  };
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
  vi.restoreAllMocks();
});

describe("loadSavedFilters", () => {
  beforeEach(() => {
    installStorage(memoryStorage());
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadSavedFilters()).toEqual([]);
  });

  it("returns an empty array for malformed JSON", () => {
    const storage = memoryStorage();
    storage.store.set(SAVED_FILTERS_STORAGE_KEY, "{not json");
    installStorage(storage);
    expect(loadSavedFilters()).toEqual([]);
  });

  it("returns an empty array when the stored value is not an array", () => {
    const storage = memoryStorage();
    storage.store.set(SAVED_FILTERS_STORAGE_KEY, JSON.stringify({ id: "x" }));
    installStorage(storage);
    expect(loadSavedFilters()).toEqual([]);
  });

  it("drops malformed entries and keeps well-formed ones", () => {
    const valid: SavedFilter = { id: "sf-9", name: "Mixed", filter: { status: "open" } };
    const garbage = [
      valid,
      null,
      42,
      { id: 1, name: "bad-id", filter: {} },
      { id: "no-name", filter: {} },
      { id: "bad-filter", name: "x", filter: [] },
      { id: "null-filter", name: "x", filter: null }
    ];
    const storage = memoryStorage();
    storage.store.set(SAVED_FILTERS_STORAGE_KEY, JSON.stringify(garbage));
    installStorage(storage);
    expect(loadSavedFilters()).toEqual([valid]);
  });

  it("never throws even when getItem throws", () => {
    installStorage({
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => undefined
    });
    expect(() => loadSavedFilters()).not.toThrow();
    expect(loadSavedFilters()).toEqual([]);
  });
});

describe("storeSavedFilters", () => {
  it("round-trips an arbitrary (non-fixture) collection through load", () => {
    const storage = memoryStorage();
    installStorage(storage);
    const filters: SavedFilter[] = [
      { id: `id-${Date.now()}`, name: "Recent escalations", filter: { search: "outage", priority: "urgent" } },
      { id: "id-2", name: "Unassigned VIP", filter: { assigneeId: "unassigned", tag: "vip" } }
    ];
    storeSavedFilters(filters);
    expect(loadSavedFilters()).toEqual(filters);
  });

  it("never throws when setItem throws (e.g. quota or unavailable storage)", () => {
    installStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      }
    });
    expect(() => storeSavedFilters([{ id: "a", name: "n", filter: {} }])).not.toThrow();
  });
});
