# Informe de Actualización de Dependencias y DAST Local

**Fecha:** 2026-08-24  
**Rama:** `audit/correcciones-20260824`

## Actualizaciones aplicadas

| Dependencia | Antes | Después | Motivo |
|---|---:|---:|---|
| `vitest` | 2.1.9 | 4.1.11 | Elimina la vulnerabilidad crítica reportada para el servidor UI de Vitest y actualiza transitorios de Vite. |
| `pnpm` | 10.18.0 | 11.23.0 | Corrige vulnerabilidades de la herramienta de gestión de paquetes. |
| `socket.io` / `socket.io-client` | 4.8.3 | Última versión compatible | Actualiza transitorios de `engine.io`, `socket.io-parser` y `ws`. |
| `exceljs` | 4.4.0 | Última versión compatible | Reduce rutas vulnerables transitivas asociadas a `tmp`, `brace-expansion` y archivado. |

La simulación de autorización se ejecutó correctamente con Vitest 4: **7 de 7 escenarios aprobados**. El comando de CI se ajustó retirando `--minWorkers`, opción eliminada en Vitest 4.

## DAST local

El repositorio provee `docker-compose.yml` con MySQL y la aplicación, adecuado para levantar un entorno aislado. Sin embargo, el entorno de ejecución actual no tiene el binario ni el daemon Docker disponibles, por lo que no fue posible iniciar el conjunto de servicios ni realizar un escaneo OWASP ZAP real sin falsificar resultados.

### Próximo paso reproducible

En un runner con Docker disponible:

```bash
docker compose up -d --build
# esperar el healthcheck de la aplicación
# ejecutar ZAP baseline contra http://localhost:3000
```

El workflow `security.yml` ya incorpora ZAP baseline como ejecución manual con una URL HTTPS autorizada para evitar pruebas no consentidas contra servicios externos.
