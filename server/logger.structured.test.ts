import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("logger estructurado", () => {
  it("mantiene el adaptador de consola heredada solo para producción", () => {
    const source = readFileSync(
      resolve(process.cwd(), "server/_core/logger.ts"),
      "utf8"
    );
    expect(source).toContain("installLegacyConsoleAdapter");
    expect(source).toContain('process.env.NODE_ENV !== "production"');
    expect(source).toContain("[email-redacted]");
  });
});
