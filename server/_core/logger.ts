export type LogLevel = "debug" | "info" | "warn" | "error";
const nativeConsole = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
let legacyConsoleAdapterInstalled = false;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

/**
 * Registro estructurado, seguro para JSON y consistente entre servicios.
 * Evita incluir valores sensibles; cada llamador debe enviar solo contexto operativo.
 */
export function logStructured(level: LogLevel, event: string, context: Record<string, unknown> = {}) {
  const payload = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...context });
  if (level === "error") nativeConsole.error(`[NOM035] ${payload}`);
  else if (level === "warn") nativeConsole.warn(`[NOM035] ${payload}`);
  else if (level === "info") nativeConsole.info(`[NOM035] ${payload}`);
  else if (process.env.NODE_ENV !== "production") nativeConsole.debug(`[NOM035] ${payload}`);
}

export function logNonBlockingFailure(event: string, error: unknown, context: Record<string, unknown> = {}) {
  logStructured("warn", event, { ...context, error: serializeError(error) });
}

function sanitizeLegacyMessage(args: unknown[]) {
  const message = args.map((value) => {
    if (value instanceof Error) return value.message;
    if (typeof value === "string") return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  }).join(" ");
  return message
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email-redacted]")
    .replace(/(bearer\s+)[^\s]+/gi, "$1[redacted]")
    .slice(0, 1200);
}

/** Convierte logs heredados a JSON estructurado en producción sin tocar cada job histórico. */
export function installLegacyConsoleAdapter() {
  if (process.env.NODE_ENV !== "production" || legacyConsoleAdapterInstalled) return;
  legacyConsoleAdapterInstalled = true;
  const adapt = (level: LogLevel) => (...args: unknown[]) => {
    logStructured(level, "legacy_console", { message: sanitizeLegacyMessage(args) });
  };
  console.debug = adapt("debug") as typeof console.debug;
  console.log = adapt("info") as typeof console.log;
  console.info = adapt("info") as typeof console.info;
  console.warn = adapt("warn") as typeof console.warn;
  console.error = adapt("error") as typeof console.error;
}
