# Informe de Escaneo de Seguridad y Pipeline CI

**Fecha:** 2026-08-24  
**Rama:** `audit/correcciones-20260824`  
**Alcance:** Dependencias, secretos, SAST de código de aplicación, simulación de autorización y configuración de GitHub Actions.

## Controles ejecutados

| Control | Herramienta | Resultado |
|---|---|---|
| Simulación de autorización | Vitest / tRPC | 7 de 7 escenarios aprobados. |
| SAST de código de aplicación | Semgrep OWASP Top Ten | 9 advertencias iniciales; se corrigieron interpolaciones HTML no escapadas en `confirmReadRouter.ts`. |
| Auditoría de dependencias | `pnpm audit` | Hallazgos de severidad crítica, alta y moderada pendientes de actualización controlada. |
| Escaneo de secretos por patrón | Script local | Alto volumen de falsos positivos por tokens generados, configuraciones y pruebas; el pipeline agrega Gitleaks para detección especializada. |
| DAST | OWASP ZAP baseline | Configurado como ejecución manual contra una URL HTTPS autorizada. |

## Correcciones realizadas

1. Se escaparon `signerName`, `minuteFolio` y `minuteTitle` antes de interpolarlos en respuestas HTML públicas de confirmación de lectura.
2. Se amplió la suite de autorización para cubrir manipulación de parámetros, IDOR de lectura/escritura, cuentas sin perfil y roles gestores.
3. Se agregó `.github/workflows/security.yml` para correr autorización, dependencia, Gitleaks, Semgrep, CodeQL y DAST manual.

## Riesgos abiertos

| Categoría | Estado | Acción recomendada |
|---|---|---|
| Dependencias transitivas | Abierto | Actualizar de manera controlada dependencias afectadas y validar build y pruebas. El pipeline bloquea nuevas PR con vulnerabilidades de severidad alta o crítica. |
| Acciones de GitHub sin SHA | Advertencia | Migrar gradualmente de tags de acciones a SHA fijados, con calendario de renovación. |
| DAST autenticado | Pendiente | Configurar un entorno efímero y una cuenta de pruebas para recorrido autenticado sin afectar producción. |
| Secretos | En monitoreo | Revisar la línea base de Gitleaks en la primera ejecución y rotar cualquier secreto real detectado. |

## Pipeline configurado

El workflow `security.yml` se activa en cada `pull_request` y `push` a `main`. Incluye los siguientes gates:

- Simulación de pentest de autorización.
- Auditoría de dependencias de severidad alta o crítica.
- Detección de secretos con Gitleaks.
- SAST con Semgrep y reglas OWASP.
- Análisis CodeQL de JavaScript/TypeScript.
- DAST manual con OWASP ZAP mediante `workflow_dispatch` y una URL HTTPS explícitamente autorizada.

## Referencias

[1] [OWASP Top 10](https://owasp.org/www-project-top-ten/)  
[2] [OWASP ZAP Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/)  
[3] [GitHub CodeQL](https://docs.github.com/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql)
