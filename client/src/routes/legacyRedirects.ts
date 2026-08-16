export type LegacyRedirect = {
  path: string;
  to: string;
};

/** Rutas históricas conservadas para evitar 404 en enlaces guardados o correos previos. */
export const legacyRedirects: LegacyRedirect[] = [
  { path: "/administrative/expenses/:id", to: "/administrative/expense-requests" },
  { path: "/administrative/expenses", to: "/administrative/expense-requests" },
  { path: "/compliance/checklist", to: "/compliance-checklist" },
  { path: "/documents/history", to: "/documents-history" },
  { path: "/nom035-admin-panel", to: "/nom035-admin" },
  { path: "/survey-send", to: "/surveys/mass-email" },
  { path: "/training/calendar", to: "/training-dashboard" },
  { path: "/training/my-courses", to: "/courses" },
  { path: "/trends-charts", to: "/trends" },
];
