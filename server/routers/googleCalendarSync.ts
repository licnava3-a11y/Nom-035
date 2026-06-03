import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { nom035CommitteeMeetings, nom035CommitteeAgreements, employees } from "../../drizzle/schema";
import { gte, and, isNotNull, eq } from "drizzle-orm";

// ─── Tipos de evento ──────────────────────────────────────────────────────────
export type CalendarEventType = "meeting" | "contract_expiry" | "action_deadline" | "agreement_deadline";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string; // ISO date string
  endDate: string;
  type: CalendarEventType;
  priority: "high" | "medium" | "low";
  location?: string;
  folio?: string;
  url?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toISODate(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return new Date(d).toISOString();
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function generateICalEvent(event: CalendarEvent): string {
  const dtStart = event.startDate.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace("Z", "Z");
  const dtEnd = event.endDate.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace("Z", "Z");
  const uid = `${event.id}@nom035.stps.gob.mx`;
  const summary = event.title.replace(/[,;\\]/g, " ");
  const description = event.description.replace(/[,;\\]/g, " ").replace(/\n/g, "\\n");

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    event.location ? `LOCATION:${event.location}` : "",
    `STATUS:CONFIRMED`,
    `END:VEVENT`,
  ]
    .filter(Boolean)
    .join("\r\n");
}

function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const fmt = (d: string) => d.replace(/[-:T]/g, "").replace(/\.\d{3}Z/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${fmt(event.startDate)}/${fmt(event.endDate)}`,
    details: event.description,
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const googleCalendarSyncRouter = router({
  // Obtener todos los eventos próximos (reuniones, vencimientos, plazos)
  getUpcomingEvents: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(90),
        types: z
          .array(z.enum(["meeting", "contract_expiry", "action_deadline", "agreement_deadline"]))
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const horizon = new Date(now.getTime() + input.days * 86_400_000);
      const events: CalendarEvent[] = [];

      // ── 1. Reuniones del Comité NOM-035 ─────────────────────────────────────
      if (!input.types || input.types.includes("meeting")) {
        try {
          const meetings = await db
            .select()
            .from(nom035CommitteeMeetings)
            .where(
              and(
                gte(nom035CommitteeMeetings.scheduledAt, now),
                isNotNull(nom035CommitteeMeetings.scheduledAt)
              )
            );

          for (const m of meetings) {
            const start = new Date(m.scheduledAt!);
            if (start > horizon) continue;
            events.push({
              id: `meeting-${m.id}`,
              title: `Reunión Comité NOM-035: ${m.title}`,
              description: `Folio: ${m.folio}\nTipo: ${m.meetingType}\nEstado: ${m.status}\nAgenda: ${m.agenda ?? "Sin agenda"}`,
              startDate: toISODate(start),
              endDate: toISODate(addHours(start, 2)),
              type: "meeting",
              priority: "high",
              location: m.location ?? undefined,
              folio: m.folio ?? undefined,
            });
          }
        } catch {
          // Tabla puede no existir aún
        }
      }

      // ── 2. Vencimientos de contratos ─────────────────────────────────────────
      if (!input.types || input.types.includes("contract_expiry")) {
        try {
          const emps = await db
            .select({
              id: employees.id,
              firstName: employees.firstName,
              lastName: employees.lastName,
              positionId: employees.positionId,
              contract1ExpirationDate: employees.contract1ExpirationDate,
              contract2ExpirationDate: employees.contract2ExpirationDate,
              contract3ExpirationDate: employees.contract3ExpirationDate,
            })
            .from(employees)
            .where(eq(employees.isActive, true));

          for (const emp of emps) {
            const contracts = [
              { type: "Contrato 1", date: emp.contract1ExpirationDate },
              { type: "Contrato 2", date: emp.contract2ExpirationDate },
              { type: "Contrato 3", date: emp.contract3ExpirationDate },
            ];
            for (const c of contracts) {
              if (!c.date) continue;
              const expDate = new Date(c.date);
              if (expDate < now || expDate > horizon) continue;
              const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / 86_400_000);
              const fullName = `${emp.firstName} ${emp.lastName}`;
              events.push({
                id: `contract-${emp.id}-${c.type.replace(/\s/g, "")}`,
                title: `Vencimiento ${c.type} — ${fullName}`,
                description: `Empleado: ${fullName}\nPuesto ID: ${emp.positionId ?? "N/A"}\nTipo: ${c.type}\nVence en: ${daysLeft} días`,
                startDate: toISODate(expDate),
                endDate: toISODate(addHours(expDate, 1)),
                type: "contract_expiry",
                priority: daysLeft <= 15 ? "high" : daysLeft <= 30 ? "medium" : "low",
              });
            }
          }
        } catch {
          // Tabla puede no existir aún
        }
      }

      // ── 3. Plazos de acuerdos del Comité ─────────────────────────────────────
      if (!input.types || input.types.includes("agreement_deadline")) {
        try {
          const agreements = await db
            .select()
            .from(nom035CommitteeAgreements)
            .where(
              and(
                isNotNull(nom035CommitteeAgreements.dueDate),
                gte(nom035CommitteeAgreements.dueDate, now)
              )
            );

          for (const ag of agreements) {
            if (!ag.dueDate) continue;
            const dueDate = new Date(ag.dueDate);
            if (dueDate > horizon) continue;
            const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
            events.push({
              id: `agreement-${ag.id}`,
              title: `Plazo Acuerdo: ${ag.description.substring(0, 60)}`,
              description: `Folio: ${ag.folio}\nResponsable: ${ag.responsible ?? "N/A"}\nPrioridad: ${ag.priority}\nEstado: ${ag.status}\nVence en: ${daysLeft} días`,
              startDate: toISODate(dueDate),
              endDate: toISODate(addHours(dueDate, 1)),
              type: "agreement_deadline",
              priority: ag.priority === "alta" ? "high" : ag.priority === "media" ? "medium" : "low",
              folio: ag.folio ?? undefined,
            });
          }
        } catch {
          // Tabla puede no existir aún
        }
      }

      // Ordenar por fecha
      events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      return {
        events,
        total: events.length,
        byType: {
          meeting: events.filter((e) => e.type === "meeting").length,
          contract_expiry: events.filter((e) => e.type === "contract_expiry").length,
          action_deadline: events.filter((e) => e.type === "action_deadline").length,
          agreement_deadline: events.filter((e) => e.type === "agreement_deadline").length,
        },
      };
    }),

  // Generar archivo iCal (.ics) para un evento específico
  generateEventIcal: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        title: z.string(),
        description: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const event: CalendarEvent = {
        id: input.eventId,
        title: input.title,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        type: "meeting",
        priority: "medium",
        location: input.location,
      };

      const ical = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NOM-035 STPS Platform//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        generateICalEvent(event),
        "END:VCALENDAR",
      ].join("\r\n");

      return { ical, googleUrl: buildGoogleCalendarUrl(event) };
    }),

  // Generar iCal de todos los eventos próximos (exportación masiva)
  exportAllEventsIcal: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(90) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Reutilizar la misma lógica de getUpcomingEvents
      const now = new Date();
      const horizon = new Date(now.getTime() + input.days * 86_400_000);
      const events: CalendarEvent[] = [];

      try {
        const meetings = await db
          .select()
          .from(nom035CommitteeMeetings)
          .where(and(gte(nom035CommitteeMeetings.scheduledAt, now), isNotNull(nom035CommitteeMeetings.scheduledAt)));
        for (const m of meetings) {
          const start = new Date(m.scheduledAt!);
          if (start > horizon) continue;
          events.push({
            id: `meeting-${m.id}`,
            title: `Reunión Comité NOM-035: ${m.title}`,
            description: `Folio: ${m.folio}\nTipo: ${m.meetingType}`,
            startDate: toISODate(start),
            endDate: toISODate(addHours(start, 2)),
            type: "meeting",
            priority: "high",
            location: m.location ?? undefined,
            folio: m.folio ?? undefined,
          });
        }
      } catch { /* tabla no existe */ }

      try {
        const agreements = await db
          .select()
          .from(nom035CommitteeAgreements)
          .where(and(isNotNull(nom035CommitteeAgreements.dueDate), gte(nom035CommitteeAgreements.dueDate, now)));
        for (const ag of agreements) {
          if (!ag.dueDate) continue;
          const dueDate = new Date(ag.dueDate);
          if (dueDate > horizon) continue;
          events.push({
            id: `agreement-${ag.id}`,
            title: `Plazo Acuerdo: ${ag.description.substring(0, 60)}`,
            description: `Folio: ${ag.folio}\nResponsable: ${ag.responsible ?? "N/A"}`,
            startDate: toISODate(dueDate),
            endDate: toISODate(addHours(dueDate, 1)),
            type: "agreement_deadline",
            priority: "medium",
            folio: ag.folio ?? undefined,
          });
        }
      } catch { /* tabla no existe */ }

      const ical = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NOM-035 STPS Platform//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:NOM-035 STPS — Eventos",
        "X-WR-TIMEZONE:America/Mexico_City",
        ...events.map(generateICalEvent),
        "END:VCALENDAR",
      ].join("\r\n");

      return { ical, totalEvents: events.length };
    }),

  // Obtener estadísticas de eventos para el dashboard
  getCalendarStats: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const horizon = new Date(now.getTime() + input.days * 86_400_000);
      const urgentHorizon = new Date(now.getTime() + 7 * 86_400_000);

      let meetings = 0, contracts = 0, agreements = 0, urgent = 0;

      try {
        const rows = await db
          .select()
          .from(nom035CommitteeMeetings)
          .where(and(gte(nom035CommitteeMeetings.scheduledAt, now), isNotNull(nom035CommitteeMeetings.scheduledAt)));
        meetings = rows.filter((r) => new Date(r.scheduledAt!) <= horizon).length;
        urgent += rows.filter((r) => new Date(r.scheduledAt!) <= urgentHorizon).length;
      } catch { /* tabla no existe */ }

      try {
        const rows = await db
          .select()
          .from(nom035CommitteeAgreements)
          .where(and(isNotNull(nom035CommitteeAgreements.dueDate), gte(nom035CommitteeAgreements.dueDate, now)));
        agreements = rows.filter((r) => r.dueDate && new Date(r.dueDate) <= horizon).length;
        urgent += rows.filter((r) => r.dueDate && new Date(r.dueDate) <= urgentHorizon).length;
      } catch { /* tabla no existe */ }

      try {
        const emps = await db
          .select({
            contract1ExpirationDate: employees.contract1ExpirationDate,
            contract2ExpirationDate: employees.contract2ExpirationDate,
            contract3ExpirationDate: employees.contract3ExpirationDate,
          })
          .from(employees)
          .where(eq(employees.isActive, true));

        for (const emp of emps) {
          for (const d of [emp.contract1ExpirationDate, emp.contract2ExpirationDate, emp.contract3ExpirationDate]) {
            if (!d) continue;
            const expDate = new Date(d);
            if (expDate >= now && expDate <= horizon) contracts++;
            if (expDate >= now && expDate <= urgentHorizon) urgent++;
          }
        }
      } catch { /* tabla no existe */ }

      return { meetings, contracts, agreements, urgent, total: meetings + contracts + agreements };
    }),
});
