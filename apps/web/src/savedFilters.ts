import type { SavedFilter } from "@vcm-testbed/domain";

// localStorage key for the persisted saved-filter collection. Versioned so the
// stored shape can evolve without colliding with older data.
export const SAVED_FILTERS_STORAGE_KEY = "vcm-helpdesk.saved-filters.v1";

// Load the persisted saved filters from localStorage. Defensive: returns an
// empty array when storage is unavailable, empty, malformed JSON, or not an
// array of well-formed `SavedFilter` entries. Never throws.
export function loadSavedFilters(): SavedFilter[] {
  // VCM:CODE SCF-005
  throw new Error("not implemented");
}

// Persist the saved-filter collection to localStorage as JSON under
// SAVED_FILTERS_STORAGE_KEY. Best-effort: swallows storage write errors (e.g.
// quota or unavailable storage) so UI flows never crash on persistence. Never
// throws.
export function storeSavedFilters(filters: SavedFilter[]): void {
  // VCM:CODE SCF-005
  throw new Error("not implemented");
}
