# Plantilla de Alerta de Vulnerabilidades

## Uso

Utilice esta comunicación al terminar la auditoría semanal cuando exista al menos una vulnerabilidad de severidad alta o crítica. Reemplace los campos entre corchetes y comparta únicamente la información necesaria para priorizar la remediación.

## Mensaje para Slack

```text
:warning: *Alerta de seguridad — Auditoría semanal de dependencias*

*Severidad máxima:* [Crítica / Alta]
*Componentes afectados:* [paquete(s) o servicio(s)]
*Estado:* [Nueva / Reabierta / En validación]
*Impacto resumido:* [describa el efecto potencial en una frase]
*Acción requerida:* [actualizar / validar / aprobar excepción temporal]
*Responsable propuesto:* [@persona o equipo]
*Fecha objetivo:* [AAAA-MM-DD]
*Evidencia:* [URL a incidencia, artefacto pnpm-audit o ejecución]

> No se cerrará la alerta hasta contar con `pnpm audit`, pruebas y build aprobados.
```

## Correo para responsables técnicos

**Asunto:** [Crítica/Alta] Acción requerida — vulnerabilidad detectada en [componente]

Hola, [nombre]:

La auditoría semanal de dependencias identificó una vulnerabilidad de severidad **[Crítica/Alta]** relacionada con **[componente]**. El hallazgo se encuentra en estado **[estado]** y requiere revisión prioritaria antes de integrar cambios que puedan ampliar la exposición.

El impacto potencial es: **[impacto resumido]**. La acción propuesta es **[acción concreta]**, con una fecha objetivo de **[AAAA-MM-DD]**. La evidencia técnica está disponible en: **[enlace]**.

Por favor, confirma la persona responsable y actualiza la incidencia con el plan de remediación. El cierre requiere evidencia de `pnpm audit`, pruebas automatizadas y build exitosos.

Gracias,
Equipo de Seguridad y Calidad

## Escalamiento por severidad

| Severidad | Tiempo de primera respuesta | Tiempo objetivo de remediación | Destinatarios |
|---|---:|---:|---|
| Crítica | 4 horas hábiles | 24 horas | Responsable técnico, seguridad y liderazgo de ingeniería. |
| Alta | 1 día hábil | 5 días hábiles | Responsable técnico y seguridad. |
| Media | 3 días hábiles | Próximo ciclo planificado | Responsable del componente. |
| Baja | Próxima revisión semanal | Según backlog | Responsable del componente. |
