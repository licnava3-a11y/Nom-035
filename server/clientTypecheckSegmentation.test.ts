import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("verificación TypeScript del cliente con memoria limitada", () => {
  it("mantiene el tipado semántico completo en CI y ofrece un preflight sintáctico local", () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

    expect(packageJson.scripts["check:client"]).toContain("tsconfig.client.json");
    expect(packageJson.scripts["check:client:semantic"]).toBe("pnpm check:client");
    expect(packageJson.scripts["check:client:local"]).toContain("--noCheck");
    expect(packageJson.scripts["check:client:local"]).toContain("--max-old-space-size=768");
  });
});
