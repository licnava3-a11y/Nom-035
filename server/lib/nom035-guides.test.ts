import { describe, expect, it } from "vitest";
import { getNom035ComplianceLevel, getRecommendedNom035Guides } from "./nom035-guides";

describe("recomendación de guías NOM-035", () => {
  it("aplica Guía I a todo centro y Guía II entre 16 y 50 personas", () => {
    expect(getRecommendedNom035Guides(15).map(guide => guide.id)).toEqual(["guia_i"]);
    expect(getRecommendedNom035Guides(16).map(guide => guide.id)).toEqual(["guia_i", "guia_ii"]);
    expect(getRecommendedNom035Guides(50)[1].required).toBe(true);
  });

  it("incluye Guía III y nivel completo a partir de 51 personas", () => {
    expect(getRecommendedNom035Guides(51).map(guide => guide.id)).toEqual(["guia_i", "guia_ii", "guia_iii"]);
    expect(getNom035ComplianceLevel(15)).toBe("basic");
    expect(getNom035ComplianceLevel(16)).toBe("intermediate");
    expect(getNom035ComplianceLevel(51)).toBe("complete");
  });
});
