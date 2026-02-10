import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Calendar, FileSpreadsheet, TrendingUp, Plus, Edit, Trash2, Search, Filter, FileText } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function OrganizationalChanges() {
  // Estados de filtros
  const [changeType, setChangeType] = useState<'all' | 'created' | 'updated' | 'deleted'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para comparación temporal
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');

  // Queries
  const { data: changes, isLoading: isLoadingChanges } = trpc.departments.getChangeHistory.useQuery({
    changeType: changeType === 'all' ? undefined : changeType,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: stats, isLoading: isLoadingStats } = trpc.departments.getChangeStats.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Filtrar cambios por búsqueda
  const filteredChanges = useMemo(() => {
    if (!changes) return [];
    if (!searchTerm) return changes;
    
    const term = searchTerm.toLowerCase();
    return changes.filter((change: any) => 
      change.name?.toLowerCase().includes(term) ||
      change.code?.toLowerCase().includes(term)
    );
  }, [changes, searchTerm]);

  // Calcular estadísticas de resumen
  const summaryStats = useMemo(() => {
    if (!changes) return { total: 0, created: 0, updated: 0, deleted: 0 };
    
    return {
      total: changes.length,
      created: changes.filter((c: any) => c.changeType === 'created').length,
      updated: changes.filter((c: any) => c.changeType === 'updated').length,
      deleted: changes.filter((c: any) => c.changeType === 'deleted').length,
    };
  }, [changes]);

  // Preparar datos para gráfica de cambios por mes
  const monthlyChartData = useMemo(() => {
    if (!stats?.byMonth) return null;
    
    return {
      labels: stats.byMonth.map((item: any) => item.month),
      datasets: [
        {
          label: 'Cambios por Mes',
          data: stats.byMonth.map((item: any) => item.count),
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30, 58, 138, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [stats]);

  // Preparar datos para gráfica de distribución por tipo
  const typeChartData = useMemo(() => {
    if (!stats?.byType) return null;
    
    const typeLabels: Record<string, string> = {
      created: 'Creados',
      updated: 'Actualizados',
      deleted: 'Eliminados',
    };
    
    const typeColors: Record<string, string> = {
      created: '#16a34a',
      updated: '#0891b2',
      deleted: '#dc2626',
    };
    
    return {
      labels: stats.byType.map((item: any) => typeLabels[item.changeType] || item.changeType),
      datasets: [
        {
          label: 'Cantidad de Cambios',
          data: stats.byType.map((item: any) => item.count),
          backgroundColor: stats.byType.map((item: any) => typeColors[item.changeType] || '#6b7280'),
        },
      ],
    };
  }, [stats]);

  // Función para exportar comparación temporal
  const handleExportComparison = () => {
    if (!compareStartDate || !compareEndDate) {
      alert('Por favor selecciona ambas fechas para la comparación');
      return;
    }
    
    if (!changes) return;
    
    // Filtrar cambios en el rango de comparación
    const comparisonChanges = changes.filter((change: any) => {
      const changeDate = new Date(change.changedAt).toISOString().split('T')[0];
      return changeDate >= compareStartDate && changeDate <= compareEndDate;
    });
    
    // Separar por tipo
    const created = comparisonChanges.filter((c: any) => c.changeType === 'created');
    const updated = comparisonChanges.filter((c: any) => c.changeType === 'updated');
    const deleted = comparisonChanges.filter((c: any) => c.changeType === 'deleted');
    
    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Hoja de creados
    const createdData = created.map((c: any) => ({
      'ID': c.departmentId,
      'Nombre': c.name,
      'Código': c.code,
      'Fecha': new Date(c.changedAt).toLocaleString('es-MX'),
    }));
    const wsCreated = XLSX.utils.json_to_sheet(createdData);
    XLSX.utils.book_append_sheet(wb, wsCreated, 'Departamentos Creados');
    
    // Hoja de eliminados
    const deletedData = deleted.map((c: any) => ({
      'ID': c.departmentId,
      'Nombre': c.name,
      'Código': c.code,
      'Fecha': new Date(c.changedAt).toLocaleString('es-MX'),
    }));
    const wsDeleted = XLSX.utils.json_to_sheet(deletedData);
    XLSX.utils.book_append_sheet(wb, wsDeleted, 'Departamentos Eliminados');
    
    // Hoja de movidos/actualizados
    const updatedData = updated.map((c: any) => ({
      'ID': c.departmentId,
      'Nombre': c.name,
      'Código': c.code,
      'Parent ID Actual': c.parentId,
      'Fecha': new Date(c.changedAt).toLocaleString('es-MX'),
    }));
    const wsUpdated = XLSX.utils.json_to_sheet(updatedData);
    XLSX.utils.book_append_sheet(wb, wsUpdated, 'Departamentos Movidos');
    
    // Descargar archivo
    const fileName = `comparacion-organizacional-${compareStartDate}-a-${compareEndDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Función para generar reporte PDF
  const handleGeneratePDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // Encabezado institucional
    pdf.setFillColor(30, 58, 138); // #1e3a8a
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Reporte de Evolución Organizacional', pageWidth / 2, 15, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Plataforma de Capacitación NOM-035 STPS 2018', pageWidth / 2, 25, { align: 'center' });
    pdf.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth / 2, 32, { align: 'center' });
    
    yPosition = 50;
    
    // Estadísticas de resumen
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumen Ejecutivo', 15, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de Cambios: ${summaryStats.total}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Creaciones: ${summaryStats.created}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Actualizaciones: ${summaryStats.updated}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Eliminaciones: ${summaryStats.deleted}`, 15, yPosition);
    yPosition += 15;
    
    // Capturar gráficas
    try {
      // Gráfica de evolución
      const evolutionChart = document.getElementById('evolution-chart');
      if (evolutionChart) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Gráfica de Evolución Mensual', 15, yPosition);
        yPosition += 5;
        
        const canvas = await html2canvas(evolutionChart, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }
      
      // Gráfica de distribución
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = 20;
      }
      
      const distributionChart = document.getElementById('distribution-chart');
      if (distributionChart) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Distribución por Tipo de Cambio', 15, yPosition);
        yPosition += 5;
        
        const canvas = await html2canvas(distributionChart, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }
    } catch (error) {
      console.error('Error al capturar gráficas:', error);
    }
    
    // Línea de tiempo de cambios recientes
    if (changes && changes.length > 0) {
      pdf.addPage();
      yPosition = 20;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Línea de Tiempo de Cambios Recientes', 15, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const recentChanges = changes.slice(0, 15); // Últimos 15 cambios
      
      recentChanges.forEach((change: any) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        const date = new Date(change.changedAt).toLocaleString('es-MX');
        const type = getChangeText(change.changeType);
        
        // Color según tipo
        if (change.changeType === 'created') {
          pdf.setTextColor(22, 163, 74); // green
        } else if (change.changeType === 'updated') {
          pdf.setTextColor(8, 145, 178); // cyan
        } else {
          pdf.setTextColor(220, 38, 38); // red
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`• ${type}`, 15, yPosition);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${change.name} (${change.code}) - ${date}`, 25, yPosition);
        
        yPosition += 6;
      });
    }
    
    // Pie de página en todas las páginas
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Página ${i} de ${totalPages} | Confidencial - Uso Interno`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    // Descargar PDF
    const fileName = `reporte-evolucion-organizacional-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  // Función para obtener icono según tipo de cambio
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-cyan-600" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  // Función para obtener texto según tipo de cambio
  const getChangeText = (type: string) => {
    switch (type) {
      case 'created':
        return 'Creado';
      case 'updated':
        return 'Actualizado';
      case 'deleted':
        return 'Eliminado';
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a]">Cambios Organizacionales</h1>
          <p className="text-muted-foreground mt-1">
            Historial completo de cambios en la estructura organizacional
          </p>
        </div>
        <Button
          onClick={handleGeneratePDF}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <FileText className="mr-2 h-4 w-4" />
          Generar Reporte PDF
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cambios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1e3a8a]">{summaryStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-600" />
              Creados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.created}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Edit className="h-4 w-4 text-cyan-600" />
              Actualizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{summaryStats.updated}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              Eliminados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.deleted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolución de Cambios por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Cargando gráfica...</p>
              </div>
            ) : monthlyChartData ? (
              <div className="h-[300px]" id="evolution-chart">
                <Line
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Distribución por Tipo de Cambio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Cargando gráfica...</p>
              </div>
            ) : typeChartData ? (
              <div className="h-[300px]" id="distribution-chart">
                <Bar
                  data={typeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros y exportación */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Exportación</CardTitle>
          <CardDescription>
            Filtra el historial de cambios y exporta comparaciones temporales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros de historial */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Filtros de Historial</h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="change-type">Tipo de Cambio:</Label>
                <Select value={changeType} onValueChange={(value: any) => setChangeType(value)}>
                  <SelectTrigger id="change-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="created">Creados</SelectItem>
                    <SelectItem value="updated">Actualizados</SelectItem>
                    <SelectItem value="deleted">Eliminados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start-date">Fecha Inicio:</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date">Fecha Fin:</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search">Buscar:</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Exportación de comparación temporal */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Exportación de Comparación Temporal</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="compare-start">Fecha Inicio Comparación:</Label>
                <Input
                  id="compare-start"
                  type="date"
                  value={compareStartDate}
                  onChange={(e) => setCompareStartDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="compare-end">Fecha Fin Comparación:</Label>
                <Input
                  id="compare-end"
                  type="date"
                  value={compareEndDate}
                  onChange={(e) => setCompareEndDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  onClick={handleExportComparison}
                  className="w-full bg-[#1e3a8a] hover:bg-[#16a34a]"
                  disabled={!compareStartDate || !compareEndDate}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar Comparación
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Exporta un archivo Excel con tres hojas: departamentos creados, eliminados y movidos en el periodo seleccionado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Línea de tiempo de cambios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Línea de Tiempo de Cambios
          </CardTitle>
          <CardDescription>
            Historial completo de cambios organizacionales (últimos 500 registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingChanges ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Cargando historial...</p>
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No hay cambios para mostrar</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredChanges.map((change: any, index: number) => (
                <div
                  key={change.id}
                  className="flex gap-4 pb-4 border-b last:border-b-0"
                >
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-muted p-2">
                      {getChangeIcon(change.changeType)}
                    </div>
                    {index < filteredChanges.length - 1 && (
                      <div className="w-px h-full bg-border mt-2" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1e3a8a]">
                          {change.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({change.code})
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          change.changeType === 'created' ? 'bg-green-100 text-green-700' :
                          change.changeType === 'updated' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {getChangeText(change.changeType)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(change.changedAt).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    
                    {change.description && (
                      <p className="text-sm text-muted-foreground">
                        {change.description}
                      </p>
                    )}
                    
                    {change.parentId !== null && (
                      <p className="text-xs text-muted-foreground">
                        Parent ID: {change.parentId}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
