import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("seguridad del transporte SMTP", () => {
  it("deshabilita accesos a archivos y URL remotas", () => {
    const source = readFileSync(
      resolve(process.cwd(), "server/_core/email.ts"),
      "utf8"
    );
    expect(source).toContain("disableFileAccess: true");
    expect(source).toContain("disableUrlAccess: true");
  });
});
