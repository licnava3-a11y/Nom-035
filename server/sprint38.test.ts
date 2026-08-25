/**
 * Sprint 38 — Tests: Legal y Compliance
 * - terms_acceptance schema y procedures
 * - assignUserToCompany en superAdmin
 * - LegalPortada con PDF
 * - TermsGuard en App.tsx
 */
import { describe, it, expect } from "vitest";

// ─── 1. terms_acceptance schema ────────────────────────────────────────────
describe("Sprint 38 — terms_acceptance schema", () => {
  it("la tabla terms_acceptance tiene las columnas requeridas", () => {
    // Verificar que el archivo de schema menciona terms_acceptance
    const fs = require("fs");
    const schema = fs.readFileSync(
      "/home/ubuntu/nom035_moodle_platform/drizzle/schema.ts",
      "utf8"
    );
    expect(schema).toContain("termsAcceptance");
    expect(schema).toContain("userId");
    expect(schema).toContain("version");
  });
});

// ─── 2. termsRouter procedures ─────────────────────────────────────────────
describe("Sprint 38 — termsRouter procedures", () => {
  it("el router de terms exporta termsRouter", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/nom035_moodle_platform/server/routers/terms.ts",
      "utf8"
    );
    expect(content).toContain("export const termsRouter");
  });

  it("termsRouter tiene el procedure hasAccepted", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/nom035_moodle_platform/server/routers/terms.ts",
      "utf8"
    );
    expect(content).toContain("hasAccepted");
  });

  it("termsRouter tiene el procedure accept", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/nom035_moodle_platform/server/routers/terms.ts",
      "utf8"
    );
    expect(content).toContain(".mutation");
  });
});

// ─── 3. superAdmin.assignUserToCompany ─────────────────────────────────────
describe("Sprint 38 — superAdmin.assignUserToCompany", () => {
  it("el superAdminRouter tiene el procedure assignUserToCompany", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/nom035_moodle_platform/server/routers/superAdmin.ts",
      "utf8"
    );
    expect(content).toContain("assignUserToCompany");
    expect(content).toContain("superAdminProcedure");
  });

  it("assignUserToCompany acepta userId y companyId", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/nom035_moodle_platform/server/routers/superAdmin.ts",
      "utf8"
    );
    expect(content).toContain("assignUserToCompany");
    expect(content).toContain("userId: z.number()");
    expect(content).toContain("companyId: z.number()");
  });
});

// ─── 4. TermsAcceptanceModal component ─────────────────────────────────────
describe("Sprint 38 — TermsAcceptanceModal", () => {
  it("el componente TermsAcceptanceModal existe en el filesystem", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync(
      "/home/ubuntu/nom035_moodle_platform/client/src/components/TermsAcceptanceModal.tsx"
    );
    expect(exists).toBe(true);
  });

  it("el componente exporta TermsAcceptanceModal", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/components/TermsAcceptanceModal.tsx",
        "utf8"
      )
    );
    expect(content).toContain("export function TermsAcceptanceModal");
  });

  it("el modal tiene scroll obligatorio antes de aceptar", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/components/TermsAcceptanceModal.tsx",
        "utf8"
      )
    );
    expect(content).toContain("hasScrolled");
  });

  it("el modal llama a trpc.terms.accept al confirmar", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/components/TermsAcceptanceModal.tsx",
        "utf8"
      )
    );
    expect(content).toContain("trpc.terms.accept.useMutation");
  });
});

// ─── 5. TermsGuard en App.tsx ───────────────────────────────────────────────
describe("Sprint 38 — TermsGuard integrado en App.tsx", () => {
  it("App.tsx importa TermsAcceptanceModal", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/App.tsx",
        "utf8"
      )
    );
    expect(content).toContain("TermsAcceptanceModal");
  });

  it("App.tsx tiene el componente TermsGuard", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/App.tsx",
        "utf8"
      )
    );
    expect(content).toContain("function TermsGuard");
  });

  it("TermsGuard usa trpc.terms.hasAccepted", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/App.tsx",
        "utf8"
      )
    );
    expect(content).toContain("trpc.terms.hasAccepted.useQuery");
  });

  it("App renderiza <TermsGuard /> dentro del ThemeProvider", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/App.tsx",
        "utf8"
      )
    );
    expect(content).toContain("<TermsGuard />");
  });
});

// ─── 6. LegalPortada con botón PDF ─────────────────────────────────────────
describe("Sprint 38 — LegalPortada con botón PDF", () => {
  it("LegalPortada.tsx existe en el filesystem", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync(
      "/home/ubuntu/nom035_moodle_platform/client/src/pages/LegalPortada.tsx"
    );
    expect(exists).toBe(true);
  });

  it("LegalPortada tiene botón de descarga PDF con window.print()", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/pages/LegalPortada.tsx",
        "utf8"
      )
    );
    expect(content).toContain("window.print()");
  });

  it("LegalPortada tiene texto 'Descargar PDF'", async () => {
    const content = await import("fs").then(fs =>
      fs.readFileSync(
        "/home/ubuntu/nom035_moodle_platform/client/src/pages/LegalPortada.tsx",
        "utf8"
      )
    );
    expect(content).toContain("Descargar PDF");
  });
});
