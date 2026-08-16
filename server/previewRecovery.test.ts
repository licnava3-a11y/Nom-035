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

  it("usa middleware de Vite en desarrollo para transformar e hidratar main.tsx", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
    expect(source).toContain('import { serveStatic, setupVite } from "./vite"');
    expect(source).toContain('process.env.NODE_ENV === "development"');
    expect(source).toContain("await setupVite(app, server)");
  });
});
