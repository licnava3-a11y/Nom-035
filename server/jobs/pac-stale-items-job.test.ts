import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de dependencias externas para aislar el test
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));
vi.mock("../_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { runPacStaleItemsJob } from "./pac-stale-items-job";
import { getDb } from "../db";

describe("runPacStaleItemsJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe retornar success:false cuando la BD no está disponible", async () => {
    vi.mocked(getDb).mockResolvedValueOnce(null);
    const result = await runPacStaleItemsJob();
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Base de datos no disponible");
  });

  it("debe retornar success:true y checked:0 cuando no hay items estancados", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValueOnce(mockDb as any);
    const result = await runPacStaleItemsJob();
    expect(result.success).toBe(true);
    expect(result.checked).toBe(0);
    expect(result.alertsSent).toBe(0);
  });
});
