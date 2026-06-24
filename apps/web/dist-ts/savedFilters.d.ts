import type { SavedFilter } from "@vcm-testbed/domain";
export declare const SAVED_FILTERS_STORAGE_KEY = "vcm-helpdesk.saved-filters.v1";
export declare function loadSavedFilters(): SavedFilter[];
export declare function storeSavedFilters(filters: SavedFilter[]): void;
