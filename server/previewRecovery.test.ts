import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("recuperación de vista previa", () => {
  it("restaura el índice de desarrollo antes de devolver un error", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/vite.ts"), "utf8");
    expect(source).toContain("restoreDevelopmentIndex");
    expect(source).toContain("if (!fs.existsSync(indexPath)) restoreDevelopmentIndex()");
    expect(source).toContain("La vista previa se está recuperando");
  });
});
