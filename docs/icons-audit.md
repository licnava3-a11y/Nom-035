# Auditoría de Iconografía del Sistema NOM-035

**Fecha:** 19 de febrero de 2026  
**Objetivo:** Identificar inconsistencias en el uso de iconos y establecer un estándar visual consistente

---

## Resumen Ejecutivo

Se auditaron 97 páginas del sistema, identificando el uso de **150+ iconos únicos** de la biblioteca Lucide React. Se detectaron las siguientes inconsistencias principales:

1. **Iconos duplicados para la misma acción** (ej: Save vs CheckCircle para guardar)
2. **Tamaños inconsistentes** (h-4, h-5, h-6 usados sin patrón claro)
3. **Colores inconsistentes** (algunos iconos con clases de color, otros heredan)
4. **Mezcla de estilos** (algunos iconos con fill, otros con stroke)

---

## Categorías de Iconos Identificados

### 1. Acciones Principales (CRUD)
| Acción | Iconos Encontrados | Frecuencia | Recomendación |
|--------|-------------------|------------|---------------|
| Crear/Agregar | Plus, PlusCircle | 45 | **Plus** (más limpio) |
| Editar | Edit, Pencil, PenTool | 38 | **Edit** (estándar) |
| Eliminar | Trash2, X, XCircle | 32 | **Trash2** (más claro) |
| Guardar | Save, CheckCircle, FileCheck | 28 | **Save** (acción), **CheckCircle** (confirmación) |
| Ver/Visualizar | Eye, ExternalLink | 25 | **Eye** (ver detalles) |
| Descargar | Download, FileDown | 22 | **Download** (estándar) |
| Subir | Upload, FileUp | 15 | **Upload** (estándar) |
| Buscar | Search | 18 | **Search** (estándar) |
| Filtrar | Filter | 12 | **Filter** (estándar) |

### 2. Estados y Alertas
| Estado | Iconos Encontrados | Frecuencia | Recomendación |
|--------|-------------------|------------|---------------|
| Éxito | CheckCircle, CheckCircle2, Check | 52 | **CheckCircle2** (más moderno) |
| Error | XCircle, AlertCircle, X | 45 | **XCircle** (error), **AlertCircle** (advertencia) |
| Advertencia | AlertTriangle, AlertCircle | 38 | **AlertTriangle** (advertencia crítica) |
| Información | Info, HelpCircle | 15 | **Info** (info general), **HelpCircle** (ayuda contextual) |
| Pendiente | Clock, Loader2 | 28 | **Clock** (en espera), **Loader2** (cargando) |

### 3. Navegación
| Elemento | Iconos Encontrados | Frecuencia | Recomendación |
|----------|-------------------|------------|---------------|
| Inicio | Home | 12 | **Home** (estándar) |
| Atrás | ArrowLeft, ChevronLeft | 18 | **ArrowLeft** (navegación principal), **ChevronLeft** (paginación) |
| Adelante | ArrowRight, ChevronRight | 15 | **ArrowRight** (navegación principal), **ChevronRight** (paginación) |
| Enlace externo | ExternalLink | 8 | **ExternalLink** (estándar) |

### 4. Documentos y Archivos
| Tipo | Iconos Encontrados | Frecuencia | Recomendación |
|------|-------------------|------------|---------------|
| Documento genérico | FileText, File | 65 | **FileText** (más descriptivo) |
| PDF | FileText | 15 | **FileText** + badge "PDF" |
| Excel | FileSpreadsheet | 8 | **FileSpreadsheet** (estándar) |
| Imagen | Image | 5 | **Image** (estándar) |
| Archivo firmado | FileCheck, FileKey | 8 | **FileCheck** (verificado), **FileKey** (firmado) |

### 5. Usuarios y Roles
| Elemento | Iconos Encontrados | Frecuencia | Recomendación |
|----------|-------------------|------------|---------------|
| Usuario individual | User | 42 | **User** (estándar) |
| Múltiples usuarios | Users | 35 | **Users** (estándar) |
| Comité | Users, Shield | 12 | **Shield** (comité/autoridad) |
| Administrador | Shield, UserCog | 8 | **Shield** (admin), **UserCog** (configuración de usuario) |
| Instructor | GraduationCap | 6 | **GraduationCap** (estándar) |

### 6. Datos y Métricas
| Elemento | Iconos Encontrados | Frecuencia | Recomendación |
|----------|-------------------|------------|---------------|
| Gráfico de barras | BarChart3, BarChart | 18 | **BarChart3** (más moderno) |
| Tendencia ascendente | TrendingUp | 32 | **TrendingUp** (estándar) |
| Tendencia descendente | TrendingDown | 25 | **TrendingDown** (estándar) |
| Actividad | Activity | 12 | **Activity** (estándar) |
| Objetivo | Target | 10 | **Target** (estándar) |
| Sparkles (IA) | Sparkles | 5 | **Sparkles** (funciones IA) |

### 7. Comunicación
| Elemento | Iconos Encontrados | Frecuencia | Recomendación |
|----------|-------------------|------------|---------------|
| Email | Mail | 22 | **Mail** (estándar) |
| Teléfono | Phone | 15 | **Phone** (estándar) |
| Mensaje | MessageSquare | 12 | **MessageSquare** (estándar) |
| Notificación | Bell, BellOff | 18 | **Bell** (activo), **BellOff** (silenciado) |
| Enviar | Send | 8 | **Send** (estándar) |

### 8. Fechas y Tiempo
| Elemento | Iconos Encontrados | Frecuencia | Recomendación |
|----------|-------------------|------------|---------------|
| Calendario | Calendar | 28 | **Calendar** (estándar) |
| Reloj | Clock | 25 | **Clock** (estándar) |

### 9. Organizacional
| Elemento | Iconos Encontrados | Frecuencia | Recomendación |
|----------|-------------------|------------|---------------|
| Edificio/Empresa | Building, Building2 | 15 | **Building2** (más detallado) |
| Departamento | Network | 8 | **Network** (estructura organizacional) |
| Puesto | Briefcase | 12 | **Briefcase** (estándar) |

### 10. Configuración y Herramientas
| Elemento | Iconos Encontrados | Frecuencia | Recomendación |
|----------|-------------------|------------|---------------|
| Configuración | Settings | 15 | **Settings** (estándar) |
| Actualizar | RefreshCw, RotateCcw | 12 | **RefreshCw** (actualizar), **RotateCcw** (deshacer) |
| Protección | Shield | 18 | **Shield** (seguridad/autoridad) |

---

## Inconsistencias Detectadas

### Problema 1: Iconos Duplicados para Guardar
**Ubicaciones:**
- `CommitteeOperatingRules.tsx`: usa `Save`
- `AlgorithmConfig.tsx`: usa `Save`
- `DocumentFuncionesComite.tsx`: usa `Save`
- `ApplicationSuccess.tsx`: usa `CheckCircle`

**Recomendación:** Usar `Save` para acciones de guardado, `CheckCircle2` solo para confirmaciones de éxito.

### Problema 2: Tamaños Inconsistentes
**Detectado:**
- Iconos en botones: mezcla de `h-4 w-4` y `h-5 w-5`
- Iconos en headers: mezcla de `h-5 w-5` y `h-6 w-6`
- Iconos en cards: sin patrón claro

**Recomendación:**
- Botones y acciones inline: `h-4 w-4`
- Headers de sección: `h-5 w-5`
- Títulos principales: `h-6 w-6`
- Iconos decorativos grandes: `h-8 w-8` o `h-12 w-12`

### Problema 3: Colores Inconsistentes
**Detectado:**
- Algunos iconos con clases de color explícitas: `text-green-600`, `text-red-500`
- Otros heredan color del padre: `text-muted-foreground`
- Sin patrón claro para estados

**Recomendación:**
- Éxito: `text-green-600`
- Error: `text-destructive` o `text-red-600`
- Advertencia: `text-yellow-600` o `text-amber-600`
- Info: `text-blue-600`
- Neutral: `text-muted-foreground`
- Activo: `text-foreground`

---

## Estándar Propuesto

### Reglas Generales
1. **Una acción = Un icono**: No usar iconos diferentes para la misma acción
2. **Tamaño por contexto**: Seguir la guía de tamaños recomendada
3. **Color semántico**: Usar colores consistentes para estados
4. **Familia única**: Solo usar iconos de Lucide React (ya implementado)

### Implementación
1. Crear archivo `client/src/lib/iconography.ts` con mapeo estándar
2. Exportar constantes de iconos por categoría
3. Documentar uso en guía de desarrollo
4. Aplicar estándar gradualmente en páginas principales

---

## Próximos Pasos

1. ✅ Crear este documento de auditoría
2. ⏳ Crear archivo `iconography.ts` con estándar
3. ⏳ Aplicar estándar en 5 páginas principales
4. ⏳ Documentar guía de uso para desarrolladores
5. ⏳ Revisar y actualizar páginas restantes gradualmente

---

**Conclusión:** El sistema tiene una base sólida usando Lucide React, pero necesita estandarización en tamaños, colores y selección de iconos para mejorar la consistencia visual y la experiencia de usuario.
