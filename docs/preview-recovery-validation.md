# Validación de recuperación de vista previa

**Fecha:** 2026-08-14

La URL temporal de vista previa vigente respondió correctamente en el navegador y presentó la pantalla de acceso de la Plataforma NOM-035. Su enlace de inicio de sesión generó un `redirectUri` asociado al dominio temporal activo.

El dominio publicado `https://nom035mood-32dy4ksx.manus.space` también respondió correctamente y generó un `redirectUri` asociado al dominio publicado.

Durante la incidencia se detectaron procesos de desarrollo duplicados y presión crítica de memoria. El reinicio del servicio administrado restableció una instancia operativa; el endpoint local `/api/health` respondió HTTP 200. La indisponibilidad temporal de la URL de vista previa se resolvió con esta recuperación del servicio.

## Seguimiento de hidratación

El 2026-08-16 se verificó la URL temporal activa en dos momentos consecutivos. El servidor respondió y construyó un enlace OAuth con `redirectUri` correcto, pero el DOM conservó el texto “Cargando aplicación...”. Se registró una investigación específica para distinguir entre carga inicial estática y un error de importación/hidratación del cliente antes de considerar cerrada la corrección de vista previa.

**Resolución:** el servidor estaba sirviendo el HTML estático durante desarrollo, por lo que `/src/main.tsx` no se transformaba ni montaba React. `server/_core/index.ts` usa ahora `setupVite(app, server)` únicamente con `NODE_ENV=development` y mantiene `serveStatic(app)` en producción. La validación posterior mostró el DOM de React ya montado, sin el mensaje de carga persistente, y el enlace OAuth conserva el `redirectUri` temporal correcto.
