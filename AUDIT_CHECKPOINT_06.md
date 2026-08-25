# Checkpoint de Auditoría 06 — Simulación de Pentest de Autorización

**Fecha:** 2026-08-24  
**Estado:** Validado localmente

## Alcance

Simulación controlada sobre el router `assessments` de la PR #2. No se realizaron pruebas contra servicios externos ni datos reales.

## Escenarios cubiertos

1. Inicio legítimo con identidad derivada de sesión.
2. Inyección de `employeeId` al iniciar una evaluación.
3. Consulta de resultados de un intento ajeno.
4. Consulta de historial de otro colaborador.
5. Envío de respuestas sobre un intento ajeno.
6. Sesión sin perfil de colaborador vinculado.
7. Acceso transversal de un rol gestor autorizado.

## Resultado

| Control | Resultado |
|---|---|
| Simulación de pentest | 7 de 7 pruebas aprobadas. |
| Manipulación de parámetros | Mitigada. |
| IDOR de lectura y escritura | Mitigada. |
| Permiso gestor explícito | Validado. |

## Evidencia

- `server/assessments.authorization.test.ts`
- `INFORME_SIMULACION_PENTEST_AUTORIZACION.md`
- `arquitectura_autorizacion_comparativa.png`
