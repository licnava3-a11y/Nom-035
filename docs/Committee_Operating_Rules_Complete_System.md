# Sistema Completo de Bases de Funcionamiento del Comité NOM-035

## Resumen Ejecutivo

Este documento describe el sistema completo implementado para la gestión de bases de funcionamiento del comité de la plataforma NOM-035 STPS 2018, incluyendo:

1. **Sistema de versionado completo**
2. **Exportación a PDF con código QR único** (cumplimiento NOM-151)
3. **Notificaciones automáticas de cambios**
4. **Workflow de aprobación multi-nivel con firmas digitales**
5. **Interfaz de usuario para gestión de aprobaciones**
6. **Panel de configuración SMTP**

---

## 1. Sistema de Versionado

### Descripción

Cada modificación a las bases de funcionamiento crea automáticamente una nueva versión, manteniendo un historial completo de cambios con metadatos.

### Características

- **Versionado automático**: V1, V2, V3... al editar
- **Historial completo**: Fecha, autor, descripción de cambios
- **Comparación visual**: Lado a lado con highlighting de diferencias
- **Restauración segura**: Crea nueva versión al restaurar
- **Aprobación**: Draft → Active con workflow completo

### API tRPC

```typescript
// Crear base de funcionamiento
await trpc.committeeOperatingRules.create.mutate({ ... });

// Actualizar (crea nueva versión automáticamente)
await trpc.committeeOperatingRules.update.mutate({ id, changeDescription, ... });

// Listar versiones
const versions = await trpc.committeeOperatingRules.listVersions.useQuery({ operatingRuleId });

// Comparar versiones
const comparison = await trpc.committeeOperatingRules.compareVersions.useQuery({
  operatingRuleId,
  versionId1,
  versionId2
});

// Restaurar versión
await trpc.committeeOperatingRules.restoreVersion.mutate({
  operatingRuleId,
  versionId,
  changeDescription
});
```

---

## 2. Exportación a PDF con Código QR

### Descripción

Genera documentos PDF profesionales con marca de agua, número de versión, código QR único y firmas digitales de aprobadores.

### Características

- **Plantilla HTML profesional** con header y footer
- **Marca de agua** con número de versión y fecha de vigencia
- **Código QR único** que enlaza a página de verificación pública
- **Firmas digitales** de todos los aprobadores con imágenes, nombres, roles y fechas
- **Cumplimiento NOM-151** para validez legal y trazabilidad
- **Metadatos completos**: versión, fecha de creación, autor, aprobador

### Uso

1. Navegar a **Comité > Bases de Funcionamiento**
2. Seleccionar una base de funcionamiento aprobada
3. Hacer clic en botón **"Exportar a PDF"**
4. El PDF se descargará con firmas digitales incluidas

### API tRPC

```typescript
// Generar PDF con firmas digitales
const { pdfBase64, filename } =
  await trpc.committeeOperatingRules.generatePDF.mutate({
    id: operatingRuleId,
  });
```

---

## 3. Notificaciones Automáticas

### Descripción

Sistema de notificaciones que alerta automáticamente a todos los miembros del comité cuando ocurren cambios.

### Eventos que Activan Notificaciones

1. **Creación** de nueva base de funcionamiento
2. **Actualización** de base existente (nueva versión)
3. **Restauración** de versión anterior
4. **Aprobación** de base de funcionamiento

### Canales de Notificación

- **Email**: Envío a correos de miembros del comité (requiere configuración SMTP)
- **Notificación interna**: Sistema de notificaciones de la plataforma

### Configuración SMTP

Para habilitar el envío de emails, configurar en **Administración > Configuración SMTP**:

- Servidor SMTP (host y puerto)
- Usuario y contraseña
- Email remitente
- Toggle para activar/desactivar notificaciones

---

## 4. Workflow de Aprobación Multi-Nivel

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

---

## 5. Interfaz de Usuario para Workflow de Aprobación

### Componente ApprovalWorkflow

Componente React que gestiona todo el flujo de aprobación de forma visual e intuitiva.

### Características

- **Solicitar Aprobaciones**: Dialog con selector de aprobadores, roles y orden
- **Estado de Aprobaciones**: Card con progreso visual (barra de progreso)
- **Lista de Aprobadores**: Muestra nombre, rol, estado, fecha de firma
- **Firmar Aprobación**: Integra DigitalSignaturePad para captura de firma
- **Comentarios**: Campo opcional al firmar
- **Indicador de Completitud**: Badge "Aprobado" cuando todas las firmas están completas

### Uso

El componente se muestra automáticamente en la página de **Bases de Funcionamiento** cuando se selecciona una base específica.

```typescript
import ApprovalWorkflow from "@/components/ApprovalWorkflow";

<ApprovalWorkflow
  operatingRuleId={selectedRuleId}
  operatingRuleVersion={selectedRule.version}
/>
```

---

## 6. Panel de Configuración SMTP

### Descripción

Interfaz de administración para configurar credenciales SMTP sin editar variables de entorno.

### Características

- **Formulario completo**: Host, puerto, usuario, contraseña, remitente
- **Toggle SSL/TLS**: Configuración de seguridad
- **Toggle Activar/Desactivar**: Control de notificaciones por email
- **Prueba de Conexión**: Envío de email de prueba para verificar configuración
- **Encriptación AES-256**: Contraseña almacenada de forma segura
- **Guía de Configuración**: Instrucciones para Gmail, Outlook, SendGrid, Mailgun

### Acceso

**Administración > Configuración SMTP** (ruta: `/administrative/smtp-config`)

Solo usuarios con rol `admin` pueden acceder.

### API tRPC

```typescript
// Obtener configuración actual
const config = await trpc.smtpConfig.getConfig.useQuery();

// Actualizar configuración
await trpc.smtpConfig.updateConfig.mutate({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "tu-email@gmail.com",
  password: "tu-contraseña",
  fromEmail: "noreply@example.com",
  fromName: "Sistema NOM-035",
  isActive: true,
});

// Probar conexión
await trpc.smtpConfig.testConnection.mutate({
  host,
  port,
  secure,
  user,
  password,
  fromEmail,
  testEmail: "tu-email@example.com",
});
```

---

## Integración Completa

### Flujo de Trabajo Completo

1. **Crear** base de funcionamiento (estado: `draft`)
2. **Solicitar aprobaciones** a presidente, secretario y vocales usando ApprovalWorkflow
3. **Firmar** digitalmente por cada aprobador con DigitalSignaturePad
4. **Aprobación automática** cuando todas las firmas están completas
5. **Notificación** a todos los miembros del comité (email + notificación interna)
6. **Exportar a PDF** con código QR y firmas digitales para distribución oficial
7. **Verificación pública** mediante código QR en página `/verify-operating-rules`

### Esquema de Base de Datos

```sql
-- Tabla principal
CREATE TABLE `committee_operating_rules` (
  `id` int AUTO_INCREMENT NOT NULL,
  `version` varchar(10) NOT NULL,
  `effective_date` date NOT NULL,
  `objectives` text NOT NULL,
  `structure` text NOT NULL,
  `roles` text NOT NULL,
  `meeting_frequency` text NOT NULL,
  `quorum` text NOT NULL,
  `decision_making` text NOT NULL,
  `communication` text NOT NULL,
  `case_handling` text NOT NULL,
  `confidentiality` text NOT NULL,
  `status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
  `created_by` int NOT NULL,
  `approved_by` int,
  `approved_at` timestamp,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `committee_operating_rules_id` PRIMARY KEY(`id`)
);

-- Tabla de versiones
CREATE TABLE `committee_operating_rules_versions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `operating_rule_id` int NOT NULL,
  `version_number` int NOT NULL,
  `version` varchar(10) NOT NULL,
  `effective_date` date NOT NULL,
  `objectives` text NOT NULL,
  -- ... (todos los campos de contenido)
  `change_description` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `committee_operating_rules_versions_id` PRIMARY KEY(`id`)
);

-- Tabla de aprobaciones
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

-- Tabla de configuración SMTP
CREATE TABLE `smtp_config` (
  `id` int AUTO_INCREMENT NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int NOT NULL DEFAULT 587,
  `secure` boolean NOT NULL DEFAULT false,
  `user` varchar(255) NOT NULL,
  `password` text NOT NULL, -- Encrypted with AES-256
  `from_email` varchar(320) NOT NULL,
  `from_name` varchar(255) NOT NULL DEFAULT 'Sistema NOM-035',
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `smtp_config_id` PRIMARY KEY(`id`)
);
```

---

## Mejores Prácticas

1. **Versionado**: Cada cambio crea una nueva versión automáticamente
2. **Trazabilidad**: Todos los cambios registran autor, fecha y descripción
3. **Seguridad**: Firmas digitales almacenadas de forma segura en base64
4. **Cumplimiento**: Código QR único para validación según NOM-151
5. **Transparencia**: Notificaciones automáticas a todos los involucrados
6. **Configuración**: Panel SMTP para gestionar notificaciones sin editar código

---

## Próximas Mejoras Sugeridas

1. **Rechazo de aprobaciones**: Permitir rechazar con motivo y regresar a borrador
2. **Recordatorios automáticos**: Notificaciones periódicas a aprobadores pendientes
3. **Firma con certificado digital**: Integración con FIEL (Firma Electrónica Avanzada)
4. **Historial de firmas**: Panel de auditoría de todas las firmas realizadas
5. **Exportación masiva**: Generar PDFs de múltiples versiones simultáneamente
6. **Workflow configurable**: Permitir definir flujos de aprobación personalizados

---

## Soporte Técnico

Para dudas o problemas con estas funcionalidades, contactar al equipo de desarrollo o consultar la documentación técnica en:

- `/docs/Committee_Operating_Rules_Versioning_Guide.md`
- `/docs/Advanced_Operating_Rules_Features.md`

**Última actualización**: 19 de febrero de 2026
