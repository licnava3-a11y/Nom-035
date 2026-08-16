export type LogLevel = "debug" | "info" | "warn" | "error";

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
  if (level === "error") console.error(`[NOM035] ${payload}`);
  else if (level === "warn") console.warn(`[NOM035] ${payload}`);
  else if (level === "info") console.info(`[NOM035] ${payload}`);
  else if (process.env.NODE_ENV !== "production") console.debug(`[NOM035] ${payload}`);
}

export function logNonBlockingFailure(event: string, error: unknown, context: Record<string, unknown> = {}) {
  logStructured("warn", event, { ...context, error: serializeError(error) });
}
