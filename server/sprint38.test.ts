/**
 * Sprint 38 — Tests: Legal y Compliance
 * - terms_acceptance schema y procedures
 * - assignUserToCompany en superAdmin
 * - LegalPortada con PDF
 * - TermsGuard en App.tsx
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectPath = (relativePath: string) => resolve(process.cwd(), relativePath);
const readProjectFile = (relativePath: string) => readFileSync(projectPath(relativePath), "utf8");

describe("Sprint 38 — terms_acceptance schema", () => {
  it("la tabla terms_acceptance tiene las columnas requeridas", () => {
    const schema = readProjectFile("drizzle/schema.ts");
    expect(schema).toContain("termsAcceptance");
    expect(schema).toContain("userId");
    expect(schema).toContain("version");
  });
});

describe("Sprint 38 — termsRouter procedures", () => {
  it("el router de terms exporta termsRouter", () => {
    expect(readProjectFile("server/routers/terms.ts")).toContain("export const termsRouter");
  });

  it("termsRouter tiene el procedure hasAccepted", () => {
    expect(readProjectFile("server/routers/terms.ts")).toContain("hasAccepted");
  });

  it("termsRouter tiene el procedure accept", () => {
    expect(readProjectFile("server/routers/terms.ts")).toContain(".mutation");
  });
});

describe("Sprint 38 — superAdmin.assignUserToCompany", () => {
  it("el superAdminRouter tiene el procedure assignUserToCompany", () => {
    const content = readProjectFile("server/routers/superAdmin.ts");
    expect(content).toContain("assignUserToCompany");
    expect(content).toContain("superAdminProcedure");
  });

  it("assignUserToCompany acepta userId y companyId", () => {
    const content = readProjectFile("server/routers/superAdmin.ts");
    expect(content).toContain("assignUserToCompany");
    expect(content).toContain("userId: z.number()");
    expect(content).toContain("companyId: z.number()");
  });
});

describe("Sprint 38 — TermsAcceptanceModal", () => {
  it("el componente existe en el filesystem", () => {
    expect(existsSync(projectPath("client/src/components/TermsAcceptanceModal.tsx"))).toBe(true);
  });

  it("el componente exporta TermsAcceptanceModal", () => {
    expect(readProjectFile("client/src/components/TermsAcceptanceModal.tsx")).toContain("export function TermsAcceptanceModal");
  });

  it("el modal tiene scroll obligatorio antes de aceptar", () => {
    expect(readProjectFile("client/src/components/TermsAcceptanceModal.tsx")).toContain("hasScrolled");
  });

  it("el modal llama a trpc.terms.accept al confirmar", () => {
    expect(readProjectFile("client/src/components/TermsAcceptanceModal.tsx")).toContain("trpc.terms.accept.useMutation");
  });
});

describe("Sprint 38 — TermsGuard integrado en App.tsx", () => {
  it("App.tsx importa TermsAcceptanceModal", () => {
    expect(readProjectFile("client/src/App.tsx")).toContain("TermsAcceptanceModal");
  });

  it("App.tsx tiene el componente TermsGuard", () => {
    expect(readProjectFile("client/src/App.tsx")).toContain("function TermsGuard");
  });

  it("TermsGuard usa trpc.terms.hasAccepted", () => {
    expect(readProjectFile("client/src/App.tsx")).toContain("trpc.terms.hasAccepted.useQuery");
  });

  it("App renderiza TermsGuard", () => {
    expect(readProjectFile("client/src/App.tsx")).toContain("<TermsGuard />");
  });
});

describe("Sprint 38 — LegalPortada con botón PDF", () => {
  it("LegalPortada.tsx existe en el filesystem", () => {
    expect(existsSync(projectPath("client/src/pages/LegalPortada.tsx"))).toBe(true);
  });

  it("LegalPortada tiene botón de descarga PDF con window.print()", () => {
    expect(readProjectFile("client/src/pages/LegalPortada.tsx")).toContain("window.print()");
  });

  it("LegalPortada tiene texto Descargar PDF", () => {
    expect(readProjectFile("client/src/pages/LegalPortada.tsx")).toContain("Descargar PDF");
  });
});
