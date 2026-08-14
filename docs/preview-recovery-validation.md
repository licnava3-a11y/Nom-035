# Validación de recuperación de vista previa

**Fecha:** 2026-08-14

La URL temporal de vista previa vigente respondió correctamente en el navegador y presentó la pantalla de acceso de la Plataforma NOM-035. Su enlace de inicio de sesión generó un `redirectUri` asociado al dominio temporal activo.

El dominio publicado `https://nom035mood-32dy4ksx.manus.space` también respondió correctamente y generó un `redirectUri` asociado al dominio publicado.

Durante la incidencia se detectaron procesos de desarrollo duplicados y presión crítica de memoria. El reinicio del servicio administrado restableció una instancia operativa; el endpoint local `/api/health` respondió HTTP 200. La indisponibilidad temporal de la URL de vista previa se resolvió con esta recuperación del servicio.
