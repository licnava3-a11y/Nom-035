# Guía de Encuestas Públicas con Autenticación CURP

## Introducción

Esta guía describe el flujo completo para implementar encuestas públicas en la Plataforma NOM-035 STPS 2018, permitiendo que empleados respondan encuestas sin necesidad de iniciar sesión, autenticándose únicamente con su CURP.

## Características Principales

- ✅ **Acceso sin login**: Empleados responden mediante link único
- ✅ **Autenticación CURP**: Verificación de identidad sin contraseñas
- ✅ **Tokens únicos**: Un token por empleado por encuesta
- ✅ **Expiración automática**: Tokens válidos por 30 días
- ✅ **Envío masivo por email**: Invitaciones automáticas con links personalizados
- ✅ **Seguridad**: Tokens de un solo uso, no reutilizables

---

## Flujo Completo del Proceso

### Paso 1: Crear Periodo de Encuesta

1. Inicie sesión como **Administrador**
2. Navegue a **Encuestas** → **Gestión de Periodos**
3. Haga clic en **Nuevo Periodo**
4. Complete los datos:
   - **Nombre del periodo**: Ej. "Encuesta NOM-035 - Q1 2026"
   - **Fecha de inicio**: Fecha de apertura de la encuesta
   - **Fecha de fin**: Fecha de cierre de la encuesta
   - **Descripción**: Información adicional sobre el periodo
5. Haga clic en **Crear Periodo**

### Paso 2: Generar Tokens de Acceso

Una vez creado el periodo de encuesta, el sistema debe generar tokens únicos para cada empleado:

**Opción A: Generación Automática (Recomendado)**

1. En la lista de periodos, localice el periodo creado
2. Haga clic en el botón **Generar Tokens**
3. El sistema generará automáticamente un token UUID único para cada empleado activo
4. Los tokens se asocian con:
   - ID del empleado
   - CURP del empleado
   - ID del periodo de encuesta
   - Fecha de expiración (30 días desde la generación)

**Opción B: Generación Manual (Avanzado)**

Si necesita regenerar tokens o crear tokens para empleados específicos, contacte al administrador del sistema.

### Paso 3: Enviar Invitaciones por Email

**Configuración previa requerida:**
- SMTP configurado (ver [Guía de Configuración SMTP](./SMTP_Configuration_Guide.md))
- Empleados con correos electrónicos válidos en el sistema

**Proceso de envío:**

1. En la lista de periodos, localice el periodo con tokens generados
2. Haga clic en el botón **Enviar Invitaciones por Email**
3. Aparecerá un modal con la información del envío:
   - Nombre del periodo
   - Número total de empleados con tokens
   - Fecha de expiración de los tokens
4. Revise la información y haga clic en **Confirmar Envío**
5. El sistema enviará correos electrónicos a todos los empleados con:
   - Link personalizado: `https://sudominio.com/survey/public/[TOKEN]`
   - Nombre del empleado
   - Nombre de la encuesta
   - Fecha de expiración del link
   - Instrucciones para responder

**Ejemplo de correo enviado:**

```
Asunto: Invitación a Encuesta NOM-035 - Q1 2026

Estimado/a [Nombre del Empleado],

Ha sido invitado/a a participar en la encuesta: Encuesta NOM-035 - Q1 2026

Para responder la encuesta, haga clic en el siguiente enlace:
https://sudominio.com/survey/public/a1b2c3d4-e5f6-7890-abcd-ef1234567890

Este enlace es personal e intransferible. Para acceder, deberá ingresar su CURP.

Fecha límite para responder: 20 de marzo de 2026

Gracias por su participación.

Atentamente,
Equipo de Recursos Humanos
```

### Paso 4: Empleado Accede a la Encuesta

**Desde el punto de vista del empleado:**

1. El empleado recibe el correo electrónico con el link personalizado
2. Hace clic en el link, que lo redirige a: `/survey/public/[TOKEN]`
3. El sistema valida automáticamente:
   - ✅ Token existe en la base de datos
   - ✅ Token no ha sido usado previamente
   - ✅ Token no ha expirado (< 30 días)
4. Si el token es válido, se muestra el formulario de autenticación CURP

### Paso 5: Autenticación con CURP

1. El empleado ve una pantalla de bienvenida con:
   - Nombre de la encuesta
   - Instrucciones de autenticación
   - Campo para ingresar CURP
2. El empleado ingresa su CURP (18 caracteres)
3. El sistema valida que el CURP coincida con el empleado asociado al token
4. Si la autenticación es exitosa:
   - ✅ Se muestra la encuesta completa
   - ✅ El empleado puede responder todas las preguntas
5. Si la autenticación falla:
   - ❌ Se muestra un mensaje de error
   - ❌ Se permite reintentar (máximo 3 intentos)

**Validaciones de seguridad:**

- CURP debe tener exactamente 18 caracteres
- CURP debe coincidir con el empleado del token
- Después de 3 intentos fallidos, el token se bloquea temporalmente (15 minutos)

### Paso 6: Responder la Encuesta

Una vez autenticado, el empleado:

1. Ve todas las preguntas de la encuesta NOM-035
2. Responde cada pregunta según la escala proporcionada
3. Puede guardar progreso (opcional, si está implementado)
4. Al finalizar, hace clic en **Enviar Respuestas**
5. El sistema:
   - ✅ Guarda todas las respuestas en la base de datos
   - ✅ Marca el token como "usado"
   - ✅ Muestra mensaje de confirmación
   - ✅ Envía email de confirmación al empleado (opcional)

### Paso 7: Monitoreo y Seguimiento

**Panel de administración:**

1. Navegue a **Encuestas** → **Gestión de Periodos**
2. Seleccione el periodo activo
3. Visualice estadísticas en tiempo real:
   - Total de invitaciones enviadas
   - Total de respuestas recibidas
   - Porcentaje de participación
   - Empleados pendientes de responder
4. Exporte reportes en formato Excel o PDF

**Envío de recordatorios:**

Para empleados que no han respondido:

1. Identifique tokens no utilizados y no expirados
2. Use el botón **Enviar Recordatorio** en el panel de periodos
3. El sistema enviará un correo de recordatorio solo a empleados pendientes

---

## Estructura Técnica

### Tabla: `survey_employee_tokens`

```sql
CREATE TABLE survey_employee_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(255) UNIQUE NOT NULL,
  employeeId INT NOT NULL,
  surveyPeriodId INT NOT NULL,
  expiresAt DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  usedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employeeId) REFERENCES employees(id),
  FOREIGN KEY (surveyPeriodId) REFERENCES survey_periods(id)
);
```

### Endpoint Público

**URL**: `/survey/public/:token`

**Método**: GET (para cargar la página) / POST (para enviar respuestas)

**Autenticación**: No requiere login, solo validación de CURP

**Flujo de validación:**

1. Verificar que el token existe
2. Verificar que el token no ha sido usado
3. Verificar que el token no ha expirado
4. Solicitar CURP al usuario
5. Validar CURP contra `employees.curp` del `employeeId` asociado
6. Si es válido, mostrar encuesta
7. Al enviar respuestas, marcar token como usado

---

## Seguridad y Privacidad

### Protección de Datos

- **Tokens UUID**: Imposibles de adivinar (128 bits de entropía)
- **Un solo uso**: Tokens se invalidan después de responder
- **Expiración automática**: Tokens válidos solo por 30 días
- **Autenticación CURP**: Verifica identidad sin exponer contraseñas
- **Límite de intentos**: Máximo 3 intentos de autenticación CURP

### Cumplimiento Normativo

- **NOM-035-STPS-2018**: Cumple con requisitos de confidencialidad
- **LFPDPPP**: Protección de datos personales (Ley Federal de Protección de Datos Personales en Posesión de los Particulares)
- **Trazabilidad**: Registro de fecha y hora de cada respuesta

### Prevención de Fraude

- **Tokens únicos**: Un token por empleado por encuesta
- **Validación CURP**: Solo el empleado correcto puede responder
- **IP logging**: Registro de dirección IP (opcional)
- **Timestamp**: Fecha y hora exacta de cada respuesta

---

## Solución de Problemas

### Error: "Token inválido o expirado"

**Causas comunes:**
- Token ya fue utilizado
- Token expiró (>30 días desde generación)
- Token no existe en la base de datos

**Solución:**
- Contacte al administrador para regenerar el token
- Verifique que el link copiado esté completo

### Error: "CURP incorrecto"

**Causas comunes:**
- CURP ingresado no coincide con el empleado del token
- Error tipográfico en el CURP

**Solución:**
- Verifique su CURP en documentos oficiales
- Asegúrese de ingresar exactamente 18 caracteres
- Contacte a Recursos Humanos si el error persiste

### Error: "Encuesta no disponible"

**Causas comunes:**
- Periodo de encuesta cerrado
- Encuesta eliminada por el administrador

**Solución:**
- Contacte al administrador para verificar el estado del periodo

### Correo de invitación no llega

**Causas comunes:**
- Correo electrónico incorrecto en el sistema
- Correo marcado como spam
- SMTP no configurado correctamente

**Solución:**
- Verifique la carpeta de spam
- Contacte a Recursos Humanos para actualizar su correo
- Administrador: verifique configuración SMTP

---

## Mejores Prácticas

### Para Administradores

1. **Planifique con anticipación**: Cree periodos con al menos 1 semana de antelación
2. **Verifique correos**: Asegúrese de que todos los empleados tengan correos válidos
3. **Pruebe primero**: Envíe invitaciones de prueba a un grupo pequeño
4. **Monitoree participación**: Revise diariamente el porcentaje de respuestas
5. **Envíe recordatorios**: A mitad del periodo, recuerde a empleados pendientes

### Para Empleados

1. **Responda pronto**: No espere hasta el último día
2. **Use un dispositivo seguro**: Responda desde un lugar privado
3. **Sea honesto**: Las respuestas son confidenciales y anónimas
4. **Guarde el correo**: Por si necesita volver a acceder al link
5. **Contacte RH**: Si tiene problemas técnicos, reporte inmediatamente

### Para Recursos Humanos

1. **Comunique claramente**: Explique el propósito de la encuesta
2. **Garantice confidencialidad**: Asegure a empleados que sus respuestas son anónimas
3. **Facilite el proceso**: Proporcione soporte técnico durante el periodo
4. **Analice resultados**: Use los datos para mejorar el ambiente laboral
5. **Dé seguimiento**: Comunique acciones tomadas basadas en resultados

---

## Preguntas Frecuentes (FAQ)

**P: ¿Puedo responder la encuesta desde mi celular?**  
R: Sí, la plataforma es completamente responsive y funciona en cualquier dispositivo.

**P: ¿Mis respuestas son anónimas?**  
R: Sí, aunque el sistema registra quién respondió (para evitar duplicados), las respuestas individuales no son visibles para supervisores.

**P: ¿Puedo cambiar mis respuestas después de enviar?**  
R: No, una vez enviadas las respuestas, el token se marca como usado y no puede reutilizarse.

**P: ¿Qué pasa si pierdo el correo con el link?**  
R: Contacte a Recursos Humanos para que le reenvíen la invitación.

**P: ¿El link funciona en cualquier navegador?**  
R: Sí, funciona en Chrome, Firefox, Safari, Edge y navegadores modernos.

**P: ¿Cuánto tiempo toma responder la encuesta?**  
R: Aproximadamente 15-20 minutos, dependiendo de la cantidad de preguntas.

---

## Soporte Técnico

Para asistencia adicional:

- **Recursos Humanos**: Contacte a su departamento de RH
- **Soporte IT**: Reporte problemas técnicos al equipo de sistemas
- **Documentación**: Consulte las guías en `/docs`

---

**Última actualización**: Febrero 2026  
**Versión del documento**: 1.0
