import { describe, expect, it } from "vitest";
import { legacyRedirects } from "./legacyRedirects";

describe("redirecciones heredadas", () => {
  it("conserva los enlaces históricos de alertas en una ruta canónica", () => {
    expect(legacyRedirects).toEqual(expect.arrayContaining([
      { path: "/intelligent-alerts", to: "/alerts-central" },
      { path: "/alerts-dashboard", to: "/alerts-central" },
    ]));
  });
});
