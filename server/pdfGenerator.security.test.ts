import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pdfGenerator — dependencia segura", () => {
  const source = readFileSync(resolve(import.meta.dirname, "utils/pdfGenerator.ts"), "utf-8");

  it("carga Puppeteer de forma dinámica para no afectar el arranque", () => {
    expect(source).toContain('await import("puppeteer")');
    expect(source).toContain("PUPPETEER_EXECUTABLE_PATH");
  });

  it("no depende del envoltorio html-pdf-node vulnerable", () => {
    expect(source).not.toContain('import("html-pdf-node")');
  });
});
