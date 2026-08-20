import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("disponibilidad de vista previa", () => {
  it("mantiene el servidor en el puerto que la pasarela puede enrutar", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");

    expect(source).toContain('app.get("/api/health"');
    expect(source).toContain('const port = parseInt(process.env.PORT || "3000", 10);');
    expect(source).toContain('server.once("error"');
    expect(source).toContain("server.listen(port");
    expect(source).not.toContain("findAvailablePort");
    expect(source).not.toContain("preferred_port_unavailable");
  });
});
