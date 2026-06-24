import type { SavedFilter, TicketFilter } from "./types.js";

// Supported queue-filter fields that a saved filter may persist. Anything
// outside this set is dropped by `pickSavedFilterFields` so saved filters can
// never carry unsupported or stale criteria.
export const SAVED_FILTER_FIELDS = ["search", "status", "priority", "assigneeId", "tag"] as const;

// Failure reasons for saved-filter mutations:
// - `empty-name`: the normalized name is empty.
// - `duplicate-name`: another entry already uses the name (case-insensitive).
// - `not-found`: no entry matches the target id (rename only).
export type SavedFilterError = "empty-name" | "duplicate-name" | "not-found";

// Result of a pure saved-filter mutation. On success it carries the next
// immutable collection; on failure it carries the reason and leaves the caller
// to keep the previous collection unchanged.
export type SavedFilterMutation =
  | { ok: true; filters: SavedFilter[] }
  | { ok: false; error: SavedFilterError };

// Normalize a saved-filter name for storage and comparison: trim ends and
// collapse internal whitespace runs to single spaces. Returns "" when the name
// is blank, which callers treat as the `empty-name` failure.
export function normalizeSavedFilterName(name: string): string {
  // VCM:CODE SCF-002
  throw new Error("not implemented");
}

// Project an arbitrary `TicketFilter` down to only the supported saved-filter
// fields, dropping any other keys and any `undefined` values. Pure; never
// mutates the input. Used before persisting so a saved filter stays within the
// supported field set.
export function pickSavedFilterFields(filter: TicketFilter): TicketFilter {
  // VCM:CODE SCF-002
  throw new Error("not implemented");
}

// Add a new saved filter to the collection. The name is normalized; an empty
// normalized name fails with `empty-name` and a case-insensitive name clash
// fails with `duplicate-name`. The stored filter is reduced via
// `pickSavedFilterFields`. On success returns a new array with the entry
// appended; the input array is never mutated.
export function addSavedFilter(
  filters: SavedFilter[],
  input: { id: string; name: string; filter: TicketFilter }
): SavedFilterMutation {
  // VCM:CODE SCF-002
  throw new Error("not implemented");
}

// Rename an existing saved filter identified by `id`. Fails with `not-found`
// when no entry matches, `empty-name` when the normalized name is blank, and
// `duplicate-name` when another entry (excluding the target) already uses the
// name case-insensitively. On success returns a new array with the renamed
// entry; the input array is never mutated.
export function renameSavedFilter(filters: SavedFilter[], id: string, name: string): SavedFilterMutation {
  // VCM:CODE SCF-002
  throw new Error("not implemented");
}

// Remove the saved filter identified by `id`. Idempotent: a missing id yields a
// new array equal to the input contents. Never mutates the input array.
export function deleteSavedFilter(filters: SavedFilter[], id: string): SavedFilter[] {
  // VCM:CODE SCF-002
  throw new Error("not implemented");
}
