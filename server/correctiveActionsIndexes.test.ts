import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("índices de acciones correctivas", () => {
  it("declara índices para los filtros del trabajo de recordatorios y sus relaciones", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "drizzle/schema.ts"),
      "utf8"
    );

    expect(schema).toContain(
      'index("idx_corrective_actions_status_due_date").on(table.status, table.dueDate)'
    );
    expect(schema).toContain(
      'index("idx_corrective_actions_responsible_user_id").on(table.responsibleUserId)'
    );
    expect(schema).toContain(
      'index("idx_corrective_actions_survey_response_id").on(table.surveyResponseId)'
    );
    expect(schema).toContain(
      'index("idx_corrective_actions_survey_period_id").on(table.surveyPeriodId)'
    );
    expect(schema).toContain(
      'index("idx_corrective_actions_target_scope").on(table.targetScope)'
    );
  });
});
