# Funcionalidades Avanzadas: Bases de Funcionamiento del Comité

## Resumen Ejecutivo

Este documento describe las tres funcionalidades avanzadas implementadas para las bases de funcionamiento del comité de la plataforma NOM-035 STPS 2018:

1. **Exportación a PDF con código QR único** (cumplimiento NOM-151)
2. **Notificaciones automáticas de cambios**
3. **Workflow de aprobación multi-nivel con firmas digitales**

---

## 1. Exportación a PDF con Código QR Único

### Descripción

Genera documentos PDF profesionales de las bases de funcionamiento con marca de agua, número de versión y código QR único para validación y trazabilidad según la NOM-151 de la Secretaría de Economía de México.

### Características

- **Plantilla HTML profesional** con header y footer
- **Marca de agua** con número de versión y fecha de vigencia
- **Código QR único** que enlaza a página de verificación pública
- **Cumplimiento NOM-151** para validez legal y trazabilidad
- **Metadatos completos**: versión, fecha de creación, autor, aprobador

### Uso

1. Navegar a **Comité > Bases de Funcionamiento**
2. Seleccionar una base de funcionamiento aprobada
3. Hacer clic en botón **"Exportar a PDF"**
4. El PDF se descargará automáticamente con nombre: `Bases_Funcionamiento_[VERSION]_[FECHA].pdf`

### Verificación de Documento

Cualquier persona puede verificar la autenticidad de un documento escaneando el código QR, que redirige a:

```
https://[dominio]/verify-operating-rules?id=[ID]&v=[VERSION]
```

La página de verificación muestra:
- Versión del documento
- Fecha de vigencia
- Estado (Activo/Inactivo)
- Fecha de aprobación
- Nombre del aprobador

### API tRPC

```typescript
// Generar PDF
const { pdfBase64, filename } = await trpc.committeeOperatingRules.generatePDF.mutate({
  id: operatingRuleId
});

// Convertir base64 a blob y descargar
const blob = base64ToBlob(pdfBase64, "application/pdf");
downloadBlob(blob, filename);
```

---

## 2. Notificaciones Automáticas de Cambios

### Descripción

Sistema de notificaciones que alerta automáticamente a todos los miembros del comité cuando ocurren cambios en las bases de funcionamiento.

### Eventos que Activan Notificaciones

1. **Creación** de nueva base de funcionamiento
2. **Actualización** de base existente (nueva versión)
3. **Restauración** de versión anterior
4. **Aprobación** de base de funcionamiento

### Canales de Notificación

- **Email**: Envío a correos de miembros del comité
- **Notificación interna**: Sistema de notificaciones de la plataforma

### Contenido de Notificación

Cada notificación incluye:
- Tipo de cambio (creación, actualización, restauración, aprobación)
- Versión afectada
- Nombre del usuario que realizó el cambio
- Descripción de cambios (si está disponible)
- Enlace directo al documento

### Configuración SMTP

Para habilitar el envío de emails, configurar variables de entorno:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@example.com
SMTP_PASS=tu-contraseña
SMTP_FROM=noreply@example.com
```

**Nota**: En desarrollo, si no se configuran credenciales SMTP, el sistema simula el envío y registra en consola.

### API Interna

```typescript
// Función de notificación (uso interno)
await notifyOperatingRulesChanges({
  operatingRuleId: number,
  version: string,
  changeType: "created" | "updated" | "restored" | "approved",
  changeDescription?: string,
  changedBy: number,
  changedByName: string,
});
```

---

## 3. Workflow de Aprobación Multi-Nivel

### Descripción

Sistema de aprobación que requiere firmas digitales de múltiples miembros del comité antes de activar una base de funcionamiento.

### Roles de Aprobación

- **Presidente** (president)
- **Secretario** (secretary)
- **Vocal** (vocal)
- **Otro** (other) - con descripción personalizada

### Flujo de Trabajo

1. **Solicitar Aprobaciones**
   - Administrador selecciona aprobadores y sus roles
   - Sistema crea solicitudes de aprobación pendientes
   - Se envían notificaciones a aprobadores

2. **Firmar Aprobación**
   - Aprobador accede a su lista de aprobaciones pendientes
   - Dibuja firma digital en pad táctil
   - Opcionalmente agrega comentarios
   - Confirma firma

3. **Aprobación Automática**
   - Cuando todas las firmas están completas
   - Sistema aprueba automáticamente la base de funcionamiento
   - Cambia estado de `draft` a `active`
   - Envía notificaciones a todos los miembros

### Componente de Firma Digital

El componente `DigitalSignaturePad` permite:
- Dibujar firma con mouse o pantalla táctil
- Limpiar y redibujar
- Confirmar firma
- Almacenamiento seguro en base64

### Estados de Aprobación

- **pending**: Esperando firma
- **signed**: Firmado correctamente
- **rejected**: Rechazado (futuro)

### API tRPC

```typescript
// 1. Solicitar aprobaciones
await trpc.committeeOperatingRules.requestApprovals.mutate({
  operatingRuleId: number,
  approvers: [
    {
      approverId: number,
      approverRole: "president" | "secretary" | "vocal" | "other",
      approverRoleDescription?: string,
      approvalOrder: number,
    }
  ]
});

// 2. Firmar aprobación
await trpc.committeeOperatingRules.signApproval.mutate({
  approvalId: number,
  signatureData: string, // base64
  signatureMethod: "digital_pad" | "uploaded" | "certificate",
  comments?: string,
});

// 3. Obtener estado de aprobaciones
const { approvals, summary } = await trpc.committeeOperatingRules.getApprovalStatus.useQuery({
  operatingRuleId: number
});

// 4. Obtener aprobaciones pendientes del usuario actual
const pendingApprovals = await trpc.committeeOperatingRules.getMyPendingApprovals.useQuery();
```

### Esquema de Base de Datos

```sql
CREATE TABLE `operating_rules_approvals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `operating_rule_id` int NOT NULL,
  `approver_id` int NOT NULL,
  `approver_role` enum('president','secretary','vocal','other') NOT NULL,
  `approver_role_description` varchar(100),
  `status` enum('pending','signed','rejected') NOT NULL DEFAULT 'pending',
  `signature_data` text,
  `signature_method` enum('digital_pad','uploaded','certificate') DEFAULT 'digital_pad',
  `comments` text,
  `signed_at` timestamp,
  `approval_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `operating_rules_approvals_id` PRIMARY KEY(`id`)
);
```

---

## Integración Completa

### Flujo de Trabajo Completo

1. **Crear** base de funcionamiento (estado: `draft`)
2. **Solicitar aprobaciones** a presidente, secretario y vocales
3. **Firmar** digitalmente por cada aprobador
4. **Aprobación automática** cuando todas las firmas están completas
5. **Notificación** a todos los miembros del comité
6. **Exportar a PDF** con código QR para distribución oficial

### Mejores Prácticas

1. **Versionado**: Cada cambio crea una nueva versión automáticamente
2. **Trazabilidad**: Todos los cambios registran autor, fecha y descripción
3. **Seguridad**: Firmas digitales almacenadas de forma segura en base64
4. **Cumplimiento**: Código QR único para validación según NOM-151
5. **Transparencia**: Notificaciones automáticas a todos los involucrados

---

## Próximas Mejoras Sugeridas

1. **Workflow configurable**: Permitir definir flujos de aprobación personalizados
2. **Firma con certificado digital**: Integración con FIEL (Firma Electrónica Avanzada)
3. **Historial de firmas**: Panel de auditoría de todas las firmas realizadas
4. **Rechazo de aprobaciones**: Permitir rechazar con motivo y regresar a borrador
5. **Recordatorios automáticos**: Notificaciones periódicas a aprobadores pendientes
6. **Exportación masiva**: Generar PDFs de múltiples versiones simultáneamente

---

## Soporte Técnico

Para dudas o problemas con estas funcionalidades, contactar al equipo de desarrollo o consultar la documentación técnica en `/docs/Committee_Operating_Rules_Versioning_Guide.md`.

**Última actualización**: 19 de febrero de 2026
