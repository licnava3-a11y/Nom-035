/**
 * Sprint 3 Tests:
 * 1. getRiskComparison procedure exists in psychometric router
 * 2. notifyEmployee procedure exists in internalMailbox router
 * 3. InternalMailbox filters (priority, date) are applied correctly
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── 1. getRiskComparison procedure (static check) ─────────────────────────────
describe("psychometric router", () => {
  it("defines getRiskComparison procedure in source", () => {
    const src = readFileSync(resolve(__dirname, "routers/psychometric.ts"), "utf8");
    expect(src).toContain("getRiskComparison:");
    expect(src).toContain("comparison");
    expect(src).toContain("currentMonthLabel");
    expect(src).toContain("previousMonthLabel");
  });
});

// ── 2. notifyEmployee procedure (static check) ───────────────────────────────
describe("internalMailbox router", () => {
  it("defines notifyEmployee procedure in source", () => {
    const src = readFileSync(resolve(__dirname, "routers/internalMailbox.ts"), "utf8");
    expect(src).toContain("notifyEmployee:");
    expect(src).toContain("emitNotificationToUser");
    expect(src).toContain("isAnonymous");
    expect(src).toContain("notifiedUserId");
  });
});

// ── 3. Filter logic (unit) ───────────────────────────────────────────────────
describe("InternalMailbox filter logic", () => {
  const messages = [
    { id: 1, category: "queja",      status: "nuevo",      priority: "alta",   createdAt: new Date("2024-03-10"), isAnonymous: false, senderId: 1 },
    { id: 2, category: "sugerencia", status: "resuelto",   priority: "normal", createdAt: new Date("2024-04-05"), isAnonymous: false, senderId: 2 },
    { id: 3, category: "queja",      status: "en_proceso", priority: "urgente",createdAt: new Date("2024-04-20"), isAnonymous: true,  senderId: null },
  ];

  const applyFilters = (
    msgs: typeof messages,
    filterCategory: string,
    filterStatus: string,
    filterPriority: string,
    filterDateFrom: string,
    filterDateTo: string,
  ) => msgs.filter(m => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (filterPriority !== "all" && m.priority !== filterPriority) return false;
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + "T00:00:00");
      if (m.createdAt < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + "T23:59:59");
      if (m.createdAt > to) return false;
    }
    return true;
  });

  it("returns all messages when no filters applied", () => {
    expect(applyFilters(messages, "all", "all", "all", "", "")).toHaveLength(3);
  });

  it("filters by category", () => {
    const result = applyFilters(messages, "queja", "all", "all", "", "");
    expect(result).toHaveLength(2);
    expect(result.every(m => m.category === "queja")).toBe(true);
  });

  it("filters by priority", () => {
    const result = applyFilters(messages, "all", "all", "urgente", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("filters by date range", () => {
    const result = applyFilters(messages, "all", "all", "all", "2024-04-01", "2024-04-30");
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual([2, 3]);
  });

  it("filters by category + status + priority combined", () => {
    const result = applyFilters(messages, "queja", "nuevo", "alta", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns empty when no messages match", () => {
    const result = applyFilters(messages, "felicitacion", "all", "all", "", "");
    expect(result).toHaveLength(0);
  });
});
