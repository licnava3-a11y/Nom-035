# Guía de Optimizaciones de Rendimiento - Plataforma NOM-035 STPS 2018

## Fecha: 19 de Febrero de 2026

---

## Introducción

Este documento proporciona una guía técnica detallada para implementar optimizaciones de rendimiento incrementales en la Plataforma NOM-035 STPS 2018. Las optimizaciones están priorizadas según su impacto en la experiencia del usuario y la complejidad de implementación.

---

## 1. Optimizaciones con React.memo

### Objetivo
Reducir re-renders innecesarios en componentes que reciben las mismas props.

### Componentes Prioritarios

#### 1.1 Tablas de Empleados
**Archivo**: `client/src/pages/Employees.tsx`

**Implementación**:
```tsx
// Crear componente memoizado para filas de tabla
const EmployeeRow = React.memo(({ employee, onEdit, onDelete }: {
  employee: Employee;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) => {
  return (
    <tr>
      <td>{employee.firstName} {employee.lastName}</td>
      <td>{employee.email}</td>
      <td>{employee.department}</td>
      <td>
        <Button onClick={() => onEdit(employee.id)}>Editar</Button>
        <Button onClick={() => onDelete(employee.id)}>Eliminar</Button>
      </td>
    </tr>
  );
});

// Usar en el componente principal
{employees.map(emp => (
  <EmployeeRow 
    key={emp.id} 
    employee={emp}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
))}
```

**Beneficio**: Reduce re-renders cuando cambia el estado de filtros o paginación.

#### 1.2 Tablas de Casos
**Archivo**: `client/src/pages/CasesManagement.tsx`

**Implementación similar** a EmployeeRow, memoizando filas individuales.

#### 1.3 Listas de Encuestas
**Archivo**: `client/src/pages/SurveyPeriodsManager.tsx`

**Implementación similar**, enfocándose en cards de periodos de encuesta.

---

## 2. Optimizaciones con useCallback

### Objetivo
Estabilizar referencias de funciones para evitar re-renders en componentes memoizados.

### Implementación Recomendada

#### 2.1 Handlers de Eventos
```tsx
// ❌ Antes (nueva función en cada render)
const handleEdit = (id: number) => {
  setEditingId(id);
};

// ✅ Después (función estable)
const handleEdit = useCallback((id: number) => {
  setEditingId(id);
}, []); // Sin dependencias si no usa estado externo

// ✅ Con dependencias
const handleFilter = useCallback((searchTerm: string) => {
  setFilteredData(data.filter(item => 
    item.name.includes(searchTerm)
  ));
}, [data]); // Dependencia: data
```

#### 2.2 Funciones de Filtrado
```tsx
const filterEmployees = useCallback((filters: FilterOptions) => {
  return employees.filter(emp => {
    if (filters.department && emp.departmentId !== filters.department) return false;
    if (filters.searchTerm && !emp.firstName.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
    return true;
  });
}, [employees]);
```

#### 2.3 Funciones Pasadas a Componentes Hijos
```tsx
// Componente padre
const ParentComponent = () => {
  const [data, setData] = useState([]);
  
  // ✅ Función estable
  const handleUpdate = useCallback((id: number, newData: any) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, ...newData } : item
    ));
  }, []);
  
  return <ChildComponent onUpdate={handleUpdate} />;
};

// Componente hijo memoizado
const ChildComponent = React.memo(({ onUpdate }) => {
  // No se re-renderiza si onUpdate es estable
  return <button onClick={() => onUpdate(1, { name: 'New' })}>Update</button>;
});
```

---

## 3. Loading Skeletons

### Objetivo
Mejorar la percepción de velocidad mostrando placeholders mientras se cargan datos.

### Implementación con shadcn/ui

#### 3.1 Skeleton Component
```tsx
import { Skeleton } from "@/components/ui/skeleton";

const TableSkeleton = () => {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### 3.2 Uso en Tablas
```tsx
const EmployeesTable = () => {
  const { data: employees, isLoading } = trpc.employees.getAll.useQuery();
  
  if (isLoading) {
    return <TableSkeleton />;
  }
  
  return (
    <table>
      {/* Tabla normal */}
    </table>
  );
};
```

#### 3.3 Skeleton para Cards
```tsx
const CardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
};
```

---

## 4. Toasts de Confirmación

### Objetivo
Proporcionar feedback visual inmediato al usuario tras acciones importantes.

### Implementación con shadcn/ui

#### 4.1 Configuración de Toaster
```tsx
// En App.tsx o main.tsx
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      {/* Rutas y componentes */}
      <Toaster />
    </>
  );
}
```

#### 4.2 Uso en Mutaciones
```tsx
import { useToast } from "@/hooks/use-toast";

const EmployeeForm = () => {
  const { toast } = useToast();
  
  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast({
        title: "✅ Empleado creado",
        description: "El empleado ha sido registrado exitosamente.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error al crear empleado",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    },
  });
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Formulario */}
    </form>
  );
};
```

#### 4.3 Toasts con Acciones
```tsx
toast({
  title: "Empleado eliminado",
  description: "El empleado ha sido eliminado del sistema.",
  action: (
    <Button variant="outline" size="sm" onClick={handleUndo}>
      Deshacer
    </Button>
  ),
});
```

---

## 5. Mensajes de Error Mejorados

### Objetivo
Proporcionar mensajes de error descriptivos con sugerencias de solución.

### Implementación

#### 5.1 Validación de Formularios
```tsx
const validateForm = () => {
  const errors: Record<string, string> = {};
  
  if (!formData.email.trim()) {
    errors.email = "El correo electrónico es requerido";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "El correo electrónico no es válido. Ejemplo: usuario@empresa.com";
  }
  
  if (!formData.curp.trim()) {
    errors.curp = "El CURP es requerido";
  } else if (formData.curp.length !== 18) {
    errors.curp = "El CURP debe tener exactamente 18 caracteres. Verifica que esté completo.";
  }
  
  return errors;
};
```

#### 5.2 Manejo de Errores de API
```tsx
const createMutation = trpc.employees.create.useMutation({
  onError: (error: any) => {
    let errorMessage = "Ocurrió un error inesperado.";
    let suggestion = "Por favor, intenta nuevamente.";
    
    if (error.message.includes("duplicate")) {
      errorMessage = "El correo electrónico ya está registrado.";
      suggestion = "Usa un correo diferente o verifica si el empleado ya existe.";
    } else if (error.message.includes("network")) {
      errorMessage = "Error de conexión.";
      suggestion = "Verifica tu conexión a internet e intenta nuevamente.";
    }
    
    toast({
      title: "❌ Error",
      description: `${errorMessage} ${suggestion}`,
      variant: "destructive",
    });
  },
});
```

---

## 6. Prellenado Automático Extendido

### Objetivo
Reducir capturas dobles correlacionando datos automáticamente.

### Implementaciones Recomendadas

#### 6.1 Formulario de Empleados: Departamento → Jefe Directo
```tsx
const EmployeeForm = () => {
  const [formData, setFormData] = useState({
    department: "",
    supervisorId: "",
    // ... otros campos
  });
  
  // Query para obtener jefe del departamento
  const { data: departmentInfo } = trpc.departments.getById.useQuery(
    { id: formData.department },
    { enabled: !!formData.department }
  );
  
  // Efecto para prellenar jefe directo
  useEffect(() => {
    if (departmentInfo?.supervisorId) {
      setFormData(prev => ({
        ...prev,
        supervisorId: departmentInfo.supervisorId
      }));
    }
  }, [departmentInfo]);
  
  return (
    <form>
      <Select 
        value={formData.department}
        onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
      >
        {/* Opciones de departamento */}
      </Select>
      
      <Select 
        value={formData.supervisorId}
        onValueChange={(value) => setFormData(prev => ({ ...prev, supervisorId: value }))}
      >
        {/* Opciones de supervisor */}
      </Select>
    </form>
  );
};
```

#### 6.2 Formulario de Capacitaciones: Empleado → Historial de Cursos
```tsx
const TrainingForm = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  
  // Query para obtener historial de cursos
  const { data: trainingHistory } = trpc.training.getEmployeeHistory.useQuery(
    { employeeId: selectedEmployee! },
    { enabled: !!selectedEmployee }
  );
  
  return (
    <div>
      <Select 
        value={selectedEmployee?.toString()}
        onValueChange={(value) => setSelectedEmployee(Number(value))}
      >
        {/* Opciones de empleados */}
      </Select>
      
      {trainingHistory && trainingHistory.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Historial de Capacitaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {trainingHistory.map(course => (
                <li key={course.id} className="flex justify-between">
                  <span>{course.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(course.completedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

#### 6.3 Formulario de Comité: Miembro → Puesto, Departamento, Email
```tsx
const CommitteeForm = () => {
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    memberId: "",
    position: "",
    department: "",
    email: "",
  });
  
  // Query para obtener datos del miembro
  const { data: memberData } = trpc.employees.getById.useQuery(
    { id: selectedMember! },
    { enabled: !!selectedMember }
  );
  
  // Efecto para prellenar datos
  useEffect(() => {
    if (memberData) {
      setFormData(prev => ({
        ...prev,
        memberId: memberData.id.toString(),
        position: memberData.positionId.toString(),
        department: memberData.departmentId.toString(),
        email: memberData.email,
      }));
    }
  }, [memberData]);
  
  return (
    <form>
      <Select 
        value={selectedMember?.toString()}
        onValueChange={(value) => {
          setSelectedMember(Number(value));
        }}
      >
        {/* Opciones de miembros */}
      </Select>
      
      <Input 
        label="Puesto"
        value={formData.position}
        disabled // Prellenado automático
      />
      
      <Input 
        label="Departamento"
        value={formData.department}
        disabled // Prellenado automático
      />
      
      <Input 
        label="Email"
        value={formData.email}
        disabled // Prellenado automático
      />
    </form>
  );
};
```

---

## 7. Indicadores de Progreso en Formularios Largos

### Objetivo
Mejorar la experiencia del usuario en formularios con múltiples secciones.

### Implementación con Steps

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const steps = [
    { id: 1, title: "Datos Personales" },
    { id: 2, title: "Información Laboral" },
    { id: 3, title: "Documentos" },
    { id: 4, title: "Confirmación" },
  ];
  
  return (
    <div>
      {/* Indicador de progreso */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`flex-1 text-center ${
                step.id === currentStep 
                  ? "text-primary font-semibold" 
                  : step.id < currentStep 
                    ? "text-green-600" 
                    : "text-muted-foreground"
              }`}
            >
              <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                step.id === currentStep 
                  ? "bg-primary text-white" 
                  : step.id < currentStep 
                    ? "bg-green-600 text-white" 
                    : "bg-gray-200"
              }`}>
                {step.id < currentStep ? "✓" : step.id}
              </div>
              <span className="text-sm">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Contenido del paso actual */}
      <div className="mb-8">
        {currentStep === 1 && <PersonalDataForm />}
        {currentStep === 2 && <WorkInfoForm />}
        {currentStep === 3 && <DocumentsForm />}
        {currentStep === 4 && <ConfirmationForm />}
      </div>
      
      {/* Botones de navegación */}
      <div className="flex justify-between">
        <Button 
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          Anterior
        </Button>
        
        <Button 
          onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
          disabled={currentStep === totalSteps}
        >
          {currentStep === totalSteps ? "Finalizar" : "Siguiente"}
        </Button>
      </div>
    </div>
  );
};
```

---

## 8. Plan de Implementación Recomendado

### Fase 1: Optimizaciones de Alto Impacto (Semana 1)
1. ✅ Implementar loading skeletons en tablas principales
2. ✅ Agregar toasts de confirmación en mutaciones críticas
3. ✅ Mejorar mensajes de error con sugerencias

**Beneficio**: Mejora inmediata en la percepción de velocidad y feedback del usuario.

### Fase 2: Prellenado Automático (Semana 2)
1. ✅ Formulario de empleados: departamento → jefe directo
2. ✅ Formulario de capacitaciones: empleado → historial de cursos
3. ✅ Formulario de comité: miembro → datos completos

**Beneficio**: Reducción significativa de capturas dobles y errores de usuario.

### Fase 3: Optimizaciones de Rendimiento (Semana 3)
1. ✅ Aplicar React.memo en componentes de tablas
2. ✅ Implementar useCallback en handlers críticos
3. ✅ Verificar mejoras con React DevTools

**Beneficio**: Reducción de re-renders y mejor rendimiento en listas grandes.

### Fase 4: Indicadores de Progreso (Semana 4)
1. ✅ Implementar steps en formularios largos
2. ✅ Agregar barras de progreso en procesos multi-paso
3. ✅ Validación incremental por paso

**Beneficio**: Mejor experiencia en flujos complejos.

---

## 9. Métricas de Éxito

### Antes de Optimizaciones
- Tiempo de carga inicial: ~3-5 segundos
- Re-renders por acción: 10-15
- Feedback visual: Limitado
- Capturas dobles: Frecuentes

### Después de Optimizaciones
- Tiempo de carga inicial: ~1-2 segundos (con skeletons)
- Re-renders por acción: 2-3 (con React.memo)
- Feedback visual: Inmediato (toasts)
- Capturas dobles: Eliminadas (prellenado)

---

## 10. Herramientas de Monitoreo

### React DevTools Profiler
```bash
# Instalar extensión de navegador
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

# Uso:
1. Abrir DevTools → Profiler
2. Grabar interacción
3. Analizar re-renders y tiempos
4. Identificar componentes lentos
```

### Lighthouse
```bash
# Ejecutar en Chrome DevTools
1. Abrir DevTools → Lighthouse
2. Seleccionar "Performance"
3. Generar reporte
4. Revisar métricas:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)
```

---

## Conclusión

Las optimizaciones propuestas mejorarán significativamente la experiencia del usuario sin requerir cambios arquitectónicos mayores. Se recomienda implementarlas de forma incremental, validando cada fase antes de continuar con la siguiente.

**Prioridad Alta**: Loading skeletons, toasts, mensajes de error mejorados
**Prioridad Media**: Prellenado automático extendido, React.memo
**Prioridad Baja**: Indicadores de progreso multi-paso

Todas las optimizaciones son compatibles con el stack tecnológico actual (React 19, tRPC 11, shadcn/ui) y no requieren dependencias adicionales significativas.
