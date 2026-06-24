import { describe, expect, it } from "vitest";
import {
  addSavedFilter,
  deleteSavedFilter,
  normalizeSavedFilterName,
  pickSavedFilterFields,
  renameSavedFilter
} from "./index.js";
import type { SavedFilter, TicketFilter } from "./types.js";

const sampleFilter: TicketFilter = {
  search: "billing",
  status: "open",
  priority: "high",
  assigneeId: "agent-1",
  tag: "vip"
};

function makeFilters(): SavedFilter[] {
  const seed = addSavedFilter([], { id: "sf-1", name: "Urgent", filter: sampleFilter });
  if (!seed.ok) {
    throw new Error("seed filter should be valid");
  }
  return seed.filters;
}

describe("normalizeSavedFilterName", () => {
  it("trims ends and collapses internal whitespace", () => {
    expect(normalizeSavedFilterName("  My   queue  ")).toBe("My queue");
  });

  it("returns an empty string for blank names", () => {
    expect(normalizeSavedFilterName("   ")).toBe("");
    expect(normalizeSavedFilterName("\t\n")).toBe("");
  });
});

describe("pickSavedFilterFields", () => {
  it("keeps only supported fields and drops undefined values", () => {
    const picked = pickSavedFilterFields({
      ...sampleFilter,
      // Unsupported keys must not survive projection.
      ...({ unsupported: "x" } as TicketFilter)
    });
    expect(picked).toEqual(sampleFilter);
    expect(Object.keys(picked)).toEqual(["search", "status", "priority", "assigneeId", "tag"]);
  });

  it("omits fields that are undefined", () => {
    expect(pickSavedFilterFields({ status: "open", priority: undefined })).toEqual({ status: "open" });
  });

  it("does not mutate the input filter", () => {
    const input: TicketFilter = { status: "open" };
    pickSavedFilterFields(input);
    expect(input).toEqual({ status: "open" });
  });
});

describe("addSavedFilter", () => {
  it("appends a normalized, field-reduced entry without mutating the input", () => {
    const filters: SavedFilter[] = [];
    const result = addSavedFilter(filters, {
      id: "sf-1",
      name: "  Hot   tickets ",
      filter: { ...sampleFilter, ...({ unsupported: "x" } as TicketFilter) }
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filters).toHaveLength(1);
    expect(result.filters[0]).toEqual({ id: "sf-1", name: "Hot tickets", filter: sampleFilter });
    expect(filters).toHaveLength(0);
  });

  it("rejects an empty name", () => {
    expect(addSavedFilter([], { id: "sf-1", name: "   ", filter: {} })).toEqual({
      ok: false,
      error: "empty-name"
    });
  });

  it("rejects a case-insensitive duplicate name", () => {
    const filters = makeFilters();
    expect(addSavedFilter(filters, { id: "sf-2", name: "urgent", filter: {} })).toEqual({
      ok: false,
      error: "duplicate-name"
    });
  });
});

describe("renameSavedFilter", () => {
  it("renames an existing entry without mutating the input", () => {
    const filters = makeFilters();
    const result = renameSavedFilter(filters, "sf-1", "  Critical  ");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filters[0]?.name).toBe("Critical");
    expect(filters[0]?.name).toBe("Urgent");
  });

  it("returns not-found for an unknown id", () => {
    expect(renameSavedFilter(makeFilters(), "missing", "Anything")).toEqual({
      ok: false,
      error: "not-found"
    });
  });

  it("rejects an empty name", () => {
    expect(renameSavedFilter(makeFilters(), "sf-1", "  ")).toEqual({
      ok: false,
      error: "empty-name"
    });
  });

  it("allows renaming an entry to its own name (excludes self from clash)", () => {
    const result = renameSavedFilter(makeFilters(), "sf-1", "URGENT");
    expect(result.ok).toBe(true);
  });

  it("rejects a case-insensitive clash with another entry", () => {
    const seeded = makeFilters();
    const added = addSavedFilter(seeded, { id: "sf-2", name: "Backlog", filter: {} });
    if (!added.ok) throw new Error("expected add to succeed");
    expect(renameSavedFilter(added.filters, "sf-2", "urgent")).toEqual({
      ok: false,
      error: "duplicate-name"
    });
  });
});

describe("deleteSavedFilter", () => {
  it("removes the matching entry without mutating the input", () => {
    const filters = makeFilters();
    expect(deleteSavedFilter(filters, "sf-1")).toEqual([]);
    expect(filters).toHaveLength(1);
  });

  it("is idempotent for a missing id", () => {
    const filters = makeFilters();
    expect(deleteSavedFilter(filters, "missing")).toEqual(filters);
  });
});
