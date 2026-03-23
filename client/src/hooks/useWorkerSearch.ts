import { useState, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';

export interface WorkerOption {
  id: number;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
  curp: string;
  position: string;
}

/**
 * Hook para búsqueda y selección de trabajadores con prellenado automático
 * Proporciona funcionalidad de búsqueda, filtrado y acceso a datos del trabajador seleccionado
 */
export function useWorkerSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  // Obtener lista de trabajadores activos
  const { data: workersData, isLoading } = trpc.employees.list.useQuery({
    isActive: true,
  });
  const workers = (workersData as any) as Array<{ id: number; firstName: string; lastName: string; email: string; employeeNumber: string | null; department: string; position: string; curp: string | null }> | undefined;

  // Filtrar trabajadores según término de búsqueda
  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    if (!searchTerm) return workers;

    const term = searchTerm.toLowerCase();
    return workers.filter((worker: any) =>
        `${worker.firstName} ${worker.lastName}`.toLowerCase().includes(term) ||
        worker.email.toLowerCase().includes(term) ||
        worker.employeeNumber?.toLowerCase().includes(term) ||
        worker.department?.toLowerCase().includes(term)
    );
  }, [workers, searchTerm]);

  // Obtener trabajador seleccionado
  const selectedWorker = useMemo(() => {
    if (!selectedWorkerId || !workers) return null;
    return workers.find((w: any) => w.id === selectedWorkerId) || null;
  }, [selectedWorkerId, workers]);

  // Función para seleccionar trabajador
  const selectWorker = useCallback((workerId: number | null) => {
    setSelectedWorkerId(workerId);
  }, []);

  // Función para limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedWorkerId(null);
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filteredWorkers,
    selectedWorker,
    selectWorker,
    clearSelection,
    isLoading,
  };
}
