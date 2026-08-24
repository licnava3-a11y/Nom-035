import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("datos verificables del instructor", () => {
  it("no devuelve calificaciones, confirmaciones ni fechas simuladas", () => {
    const source = readFileSync(
      resolve(process.cwd(), "server/routers/training.ts"),
      "utf8"
    );
    expect(source).toContain("averageRating: null");
    expect(source).not.toContain("averageRating: 4.5");
    expect(source).not.toContain("Date.now() + 14");
    expect(source).toContain("return [];");
  });
});
