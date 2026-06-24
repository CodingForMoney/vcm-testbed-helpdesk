// localStorage key for the persisted saved-filter collection. Versioned so the
// stored shape can evolve without colliding with older data.
export const SAVED_FILTERS_STORAGE_KEY = "vcm-helpdesk.saved-filters.v1";
// Load the persisted saved filters from localStorage. Defensive: returns an
// empty array when storage is unavailable, empty, malformed JSON, or not an
// array of well-formed `SavedFilter` entries. Never throws.
export function loadSavedFilters() {
    try {
        const raw = window.localStorage.getItem(SAVED_FILTERS_STORAGE_KEY);
        if (raw === null) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(isSavedFilter);
    }
    catch {
        return [];
    }
}
// Persist the saved-filter collection to localStorage as JSON under
// SAVED_FILTERS_STORAGE_KEY. Best-effort: swallows storage write errors (e.g.
// quota or unavailable storage) so UI flows never crash on persistence. Never
// throws.
export function storeSavedFilters(filters) {
    try {
        window.localStorage.setItem(SAVED_FILTERS_STORAGE_KEY, JSON.stringify(filters));
    }
    catch {
        // Persistence is best-effort; storage failures must not break UI flows.
    }
}
// Narrow an unknown stored entry to a well-formed `SavedFilter`. A persisted
// entry must have string `id`/`name` and an object `filter`; malformed entries
// are dropped on load.
function isSavedFilter(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const entry = value;
    return (typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.filter === "object" &&
        entry.filter !== null &&
        !Array.isArray(entry.filter));
}
