import { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  MarkerType,
  useReactFlow,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { trpc } from '@/lib/trpc';
import { Download, Users, Building2, Loader2, Search, ChevronLeft, ChevronRight, X, Minimize2, Maximize2, ArrowDown, ArrowRight, Maximize, Printer, FileSpreadsheet, Calendar, History } from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

// Nodo personalizado para departamentos (vista completa)
function DepartmentNode({ data }: NodeProps<{ name: string; code: string; employeeCount: number; manager?: string; level: number; isHighlighted?: boolean }>) {
  // Colores según nivel jerárquico
  const levelColors = [
    { from: '#1e3a8a', to: '#16a34a' }, // Nivel 0: Azul marino a verde
    { from: '#16a34a', to: '#0891b2' }, // Nivel 1: Verde a cyan
    { from: '#0891b2', to: '#7c3aed' }, // Nivel 2: Cyan a violeta
    { from: '#7c3aed', to: '#dc2626' }, // Nivel 3+: Violeta a rojo
  ];
  
  const colorIndex = Math.min(data.level, levelColors.length - 1);
  const colors = levelColors[colorIndex];

  return (
    <Card 
      className={`min-w-[280px] border-2 shadow-lg transition-all duration-300 ${
        data.isHighlighted 
          ? 'border-yellow-500 ring-4 ring-yellow-300 scale-110' 
          : 'border-[#1e3a8a]'
      }`}
    >
      <CardHeader 
        className="pb-3 text-white"
        style={{
          background: data.isHighlighted 
            ? 'linear-gradient(to right, #eab308, #f59e0b)' 
            : `linear-gradient(to right, ${colors.from}, ${colors.to})`
        }}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <CardTitle className="text-sm font-bold">{data.name}</CardTitle>
        </div>
        <p className="text-xs opacity-90">Código: {data.code}</p>
      </CardHeader>
      <CardContent className="pt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            Empleados:
          </span>
          <span className="font-bold text-[#1e3a8a]">{data.employeeCount}</span>
        </div>
        {data.manager && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <strong>Jefe:</strong> {data.manager}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          <strong>Nivel:</strong> {data.level}
        </div>
      </CardContent>
    </Card>
  );
}

// Nodo compacto para departamentos con tooltip
function CompactDepartmentNode({ data }: NodeProps<{ name: string; code: string; employeeCount: number; manager?: string; level: number; isHighlighted?: boolean }>) {
  // Colores según nivel jerárquico
  const levelColors = [
    { from: '#1e3a8a', to: '#16a34a' },
    { from: '#16a34a', to: '#0891b2' },
    { from: '#0891b2', to: '#7c3aed' },
    { from: '#7c3aed', to: '#dc2626' },
  ];
  
  const colorIndex = Math.min(data.level, levelColors.length - 1);
  const colors = levelColors[colorIndex];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`px-4 py-2 rounded-lg border-2 shadow-md transition-all duration-300 cursor-pointer ${
              data.isHighlighted 
                ? 'border-yellow-500 ring-4 ring-yellow-300 scale-110' 
                : 'border-[#1e3a8a]'
            }`}
            style={{
              background: data.isHighlighted 
                ? 'linear-gradient(to right, #eab308, #f59e0b)' 
                : `linear-gradient(to right, ${colors.from}, ${colors.to})`,
              minWidth: '180px',
            }}
          >
            <div className="flex items-center gap-2 text-white">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{data.name}</p>
                <p className="text-xs opacity-90 truncate">{data.code}</p>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div>
              <p className="font-bold text-sm">{data.name}</p>
              <p className="text-xs text-muted-foreground">Código: {data.code}</p>
            </div>
            <div className="border-t pt-2 space-y-1">
              <p className="text-xs">
                <strong>Empleados:</strong> {data.employeeCount}
              </p>
              {data.manager && (
                <p className="text-xs">
                  <strong>Jefe:</strong> {data.manager}
                </p>
              )}
              <p className="text-xs">
                <strong>Nivel jerárquico:</strong> {data.level}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const nodeTypes = {
  department: DepartmentNode,
  compactDepartment: CompactDepartmentNode,
};

type DepartmentNode = {
  id: number;
  name: string;
  code: string;
  employeeCount: number;
  managerId?: number | null;
  parentId?: number | null;
  children?: DepartmentNode[];
};

type Orientation = 'DOWN' | 'RIGHT';

// Función para calcular layout con ELK
async function getLayoutedElements(
  departments: DepartmentNode[],
  isCompactMode: boolean,
  orientation: Orientation
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Configuración de layout ELK según modo y orientación
  const elkOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': orientation,
    'elk.spacing.nodeNode': isCompactMode ? '50' : '80',
    'elk.layered.spacing.nodeNodeBetweenLayers': isCompactMode ? '60' : '100',
    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
  };

  // Función recursiva para construir nodos y edges
  function buildGraph(depts: DepartmentNode[], parentId: string | null = null, currentLevel = 0) {
    depts.forEach((dept: any) => {
      const nodeId = dept.id.toString();
      
      nodes.push({
        id: nodeId,
        type: isCompactMode ? 'compactDepartment' : 'department',
        position: { x: 0, y: 0 }, // ELK calculará las posiciones
        data: {
          name: dept.name,
          code: dept.code,
          employeeCount: dept.employeeCount,
          level: currentLevel,
          isHighlighted: false,
        },
      });

      // Si tiene padre, crear edge
      if (parentId) {
        edges.push({
          id: `e${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#1e3a8a', strokeWidth: isCompactMode ? 1.5 : 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#1e3a8a',
          },
        });
      }

      // Procesar hijos recursivamente
      if (dept.children && dept.children.length > 0) {
        buildGraph(dept.children, nodeId, currentLevel + 1);
      }
    });
  }

  buildGraph(departments);

  // Si no hay nodos, retornar vacío
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Preparar grafo para ELK
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node: any) => ({
      id: node.id,
      width: isCompactMode ? 200 : 300,
      height: isCompactMode ? 60 : 150,
    })),
    edges: edges.map((edge: any) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  // ELK es un motor pesado; se carga únicamente cuando el usuario abre/calcula el organigrama.
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
  const elk = new ELK();

  // Calcular layout con ELK
  const layoutedGraph = await elk.layout(graph);

  // Actualizar posiciones de nodos
  const layoutedNodes = nodes.map((node: any) => {
    const layoutedNode = layoutedGraph.children?.find((n: any) => n.id === node.id);
    return {
      ...node,
      position: {
        x: layoutedNode?.x ?? 0,
        y: layoutedNode?.y ?? 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export default function OrganizationChart() {
  const { data: hierarchy, isLoading } = trpc.departments.getHierarchy.useQuery();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isCalculatingLayout, setIsCalculatingLayout] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  
  // Estados de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [matchedNodeIds, setMatchedNodeIds] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  // Estado de modo compacto
  const [isCompactMode, setIsCompactMode] = useState(() => {
    const saved = localStorage.getItem('orgchart-compact-mode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Estado de orientación
  const [orientation, setOrientation] = useState<Orientation>(() => {
    const saved = localStorage.getItem('orgchart-orientation');
    return (saved as Orientation) || 'DOWN';
  });
  
  // Estados de comparación temporal
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  

  
  const { data: historicalHierarchy, isLoading: isLoadingHistorical } = trpc.departments.getHierarchyAtDate.useQuery(
    { date: selectedDate },
    { enabled: isHistoricalView && selectedDate !== '' }
  );
  

  
  const { fitView, setCenter } = useReactFlow();

  // Persistir preferencia de modo compacto
  useEffect(() => {
    localStorage.setItem('orgchart-compact-mode', JSON.stringify(isCompactMode));
  }, [isCompactMode]);

  // Persistir preferencia de orientación
  useEffect(() => {
    localStorage.setItem('orgchart-orientation', orientation);
  }, [orientation]);

  // Generar layout jerárquico con ELK
  useEffect(() => {
    const activeHierarchy = isHistoricalView ? historicalHierarchy : hierarchy;
    if (!activeHierarchy) return;

    setIsCalculatingLayout(true);
    
    getLayoutedElements(activeHierarchy as DepartmentNode[], isCompactMode, orientation)
      .then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsCalculatingLayout(false);
      })
      .catch((error) => {
        setIsCalculatingLayout(false);
      });
  }, [hierarchy, historicalHierarchy, isHistoricalView, isCompactMode, orientation, setNodes, setEdges]);

  // Búsqueda y resaltado de nodos
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Limpiar resaltado
      setNodes((nds) =>
        nds.map((node: any) => ({
          ...node,
          data: { ...node.data, isHighlighted: false },
        }))
      );
      setMatchedNodeIds([]);
      setCurrentMatchIndex(0);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matches: string[] = [];

    setNodes((nds) =>
      nds.map((node: any) => {
        const isMatch =
          node.data.name.toLowerCase().includes(term) ||
          node.data.code.toLowerCase().includes(term);
        
        if (isMatch) {
          matches.push(node.id);
        }

        return {
          ...node,
          data: { ...node.data, isHighlighted: false },
        };
      })
    );

    setMatchedNodeIds(matches);
    setCurrentMatchIndex(0);
  }, [searchTerm, setNodes]);

  // Resaltar nodo actual y centrar
  useEffect(() => {
    if (matchedNodeIds.length === 0) return;

    const currentNodeId = matchedNodeIds[currentMatchIndex];

    setNodes((nds) =>
      nds.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: node.id === currentNodeId,
        },
      }))
    );

    // Centrar en el nodo resaltado
    const currentNode = nodes.find((n: any) => n.id === currentNodeId);
    if (currentNode) {
      const nodeWidth = isCompactMode ? 200 : 300;
      const nodeHeight = isCompactMode ? 60 : 150;
      
      setCenter(
        currentNode.position.x + nodeWidth / 2,
        currentNode.position.y + nodeHeight / 2,
        { zoom: 1.2, duration: 800 }
      );
    }
  }, [currentMatchIndex, matchedNodeIds, setNodes, nodes, setCenter, isCompactMode]);

  // Navegación entre resultados
  const goToNextMatch = () => {
    if (matchedNodeIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchedNodeIds.length);
  };

  const goToPreviousMatch = () => {
    if (matchedNodeIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchedNodeIds.length) % matchedNodeIds.length);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setMatchedNodeIds([]);
    setCurrentMatchIndex(0);
  };

  // Ajustar a pantalla (reset zoom y centrar)
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 800 });
  }, [fitView]);

  // Exportar organigrama a PNG
  const handleExport = useCallback(() => {
    setIsExporting(true);
    const flowElement = document.querySelector('.react-flow') as HTMLElement;
    
    if (flowElement) {
      toPng(flowElement, {
        backgroundColor: '#ffffff',
        width: flowElement.offsetWidth,
        height: flowElement.offsetHeight,
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          const orientationLabel = orientation === 'DOWN' ? 'vertical' : 'horizontal';
          const modeLabel = isCompactMode ? 'compacto' : 'completo';
          link.download = `organigrama-${orientationLabel}-${modeLabel}-${new Date().toISOString().split('T')[0]}.png`;
          link.href = dataUrl;
          link.click();
          setIsExporting(false);
        })
        .catch((err) => {
          setIsExporting(false);
        });
    }
  }, [isCompactMode, orientation]);

  // Exportar estructura jerárquica a Excel
  const handleExportExcel = useCallback(() => {
    if (!hierarchy) return;

    // Función para aplanar el árbol jerárquico
    const flattenHierarchy = (depts: DepartmentNode[], parentName = '', level = 0): any[] => {
      const result: any[] = [];
      
      depts.forEach((dept: any) => {
        result.push({
          'Nivel': level,
          'Código': dept.code,
          'Nombre del Departamento': dept.name,
          'Departamento Padre': parentName || 'Ninguno (Raíz)',
          'Número de Empleados': dept.employeeCount,
          'Jefe del Departamento': dept.managerId ? `ID: ${dept.managerId}` : 'Sin asignar',
        });
        
        if (dept.children && dept.children.length > 0) {
          result.push(...flattenHierarchy(dept.children, dept.name, level + 1));
        }
      });
      
      return result;
    };

    const flatData = flattenHierarchy(hierarchy as DepartmentNode[]);
    
    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estructura Organizacional');
    
    // Ajustar anchos de columnas
    const colWidths = [
      { wch: 8 },  // Nivel
      { wch: 12 }, // Código
      { wch: 35 }, // Nombre del Departamento
      { wch: 30 }, // Departamento Padre
      { wch: 20 }, // Número de Empleados
      { wch: 25 }, // Jefe del Departamento
    ];
    ws['!cols'] = colWidths;
    
    // Descargar archivo
    const fileName = `estructura-organizacional-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [hierarchy]);



  // Activar modo impresión
  const handlePrintMode = useCallback(() => {
    setIsPrintMode(true);
    // Ajustar vista para impresión
    setTimeout(() => {
      fitView({ padding: 0.1, duration: 500 });
      setTimeout(() => {
        window.print();
        setIsPrintMode(false);
      }, 600);
    }, 100);
  }, [fitView]);

  if (isLoading || isLoadingHistorical || isCalculatingLayout) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center h-[600px] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a]" />
          <p className="text-muted-foreground">
            {isLoading ? 'Cargando jerarquía...' : 'Calculando layout...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`container py-8 space-y-6 ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Organigrama Organizacional</h1>
          <p className="text-muted-foreground mt-2">
            Visualización interactiva de la estructura jerárquica de departamentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botón ajustar a pantalla */}
          <Button
            onClick={handleFitView}
            variant="outline"
            size="icon"
            title="Ajustar a pantalla"
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          
          {/* Selector de orientación */}
          <div className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-background">
            {orientation === 'DOWN' ? (
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="orientation" className="text-sm">
              Orientación:
            </Label>
            <Select
              value={orientation}
              onValueChange={(value) => setOrientation(value as Orientation)}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOWN">Vertical</SelectItem>
                <SelectItem value="RIGHT">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Toggle de modo compacto */}
          <div className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-background">
            {isCompactMode ? (
              <Minimize2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="compact-mode" className="text-sm cursor-pointer">
              Vista compacta
            </Label>
            <Switch
              id="compact-mode"
              checked={isCompactMode}
              onCheckedChange={setIsCompactMode}
            />
          </div>
          
          {/* Selector de vista histórica */}
          <div className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-background">
            <History className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="historical-view" className="text-sm cursor-pointer">
              Vista histórica
            </Label>
            <Switch
              id="historical-view"
              checked={isHistoricalView}
              onCheckedChange={(checked) => {
                setIsHistoricalView(checked);
                if (!checked) {
                  setSelectedDate('');
                }
              }}
            />
          </div>
          
          {/* Selector de fecha (solo visible en vista histórica) */}
          {isHistoricalView && (
            <div className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-background">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="historical-date" className="text-sm">
                Fecha:
              </Label>
              <Input
                id="historical-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-[150px] h-8"
              />
            </div>
          )}
          
          <Button
            onClick={handlePrintMode}
            variant="outline"
            disabled={nodes.length === 0}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          
          <Button
            onClick={handleExportExcel}
            variant="outline"
            disabled={nodes.length === 0}
            className="border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          
          <Button
            onClick={handleExport}
            disabled={isExporting || nodes.length === 0}
            className="bg-[#1e3a8a] hover:bg-[#16a34a]"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar PNG'}
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar departamento por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {matchedNodeIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {currentMatchIndex + 1} de {matchedNodeIds.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPreviousMatch}
                    disabled={matchedNodeIds.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextMatch}
                    disabled={matchedNodeIds.length <= 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {searchTerm && matchedNodeIds.length === 0 && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Sin resultados
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Encabezado de impresión */}
      {isPrintMode && (
        <div className="hidden print:block border-b-2 border-[#1e3a8a] pb-4 mb-4">
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Organigrama Organizacional</h1>
          <p className="text-sm text-muted-foreground">
            Plataforma de Capacitación NOM-035 STPS 2018
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Generado el: {new Date().toLocaleDateString('es-MX', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      )}

      {/* React Flow Canvas */}
      <Card className="h-[700px] print:h-auto print:border-0">
        <CardContent className="p-0 h-full print:p-4">
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                No hay departamentos para mostrar. Crea departamentos en la sección de Gestión de Talento.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
              <Controls className="print:hidden" />
              <MiniMap
                nodeColor={(node) => {
                  if (node.data.isHighlighted) return '#eab308';
                  const levelColors = ['#1e3a8a', '#16a34a', '#0891b2', '#7c3aed'];
                  const level = Math.min(node.data.level || 0, levelColors.length - 1);
                  return levelColors[level];
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
                position="bottom-right"
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #1e3a8a',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                pannable
                zoomable
                className="print:hidden"
              />
              <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-md border print:hidden">
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-[#1e3a8a]">Controles:</p>
                  <p className="text-xs text-muted-foreground">• Arrastrar para mover nodos</p>
                  <p className="text-xs text-muted-foreground">• Rueda del ratón para zoom</p>
                  <p className="text-xs text-muted-foreground">• Click en nodo para detalles</p>
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      <strong>Modo:</strong> {isCompactMode ? 'Compacto' : 'Completo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Orientación:</strong> {orientation === 'DOWN' ? 'Vertical' : 'Horizontal'}
                    </p>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </CardContent>
      </Card>

      {/* Pie de página de impresión */}
      {isPrintMode && (
        <div className="hidden print:block border-t-2 border-[#1e3a8a] pt-4 mt-4 text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <div>
              <p>© 2026 Plataforma de Capacitación NOM-035 STPS 2018</p>
              <p>Todos los derechos reservados</p>
            </div>
            <div className="text-right">
              <p>Documento confidencial</p>
              <p>Página 1 de 1</p>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Leyenda de Niveles Jerárquicos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded" style={{ background: 'linear-gradient(to right, #1e3a8a, #16a34a)' }}></div>
            <span className="text-sm">Nivel 0: Departamentos raíz</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded" style={{ background: 'linear-gradient(to right, #16a34a, #0891b2)' }}></div>
            <span className="text-sm">Nivel 1: Subdepartamentos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded" style={{ background: 'linear-gradient(to right, #0891b2, #7c3aed)' }}></div>
            <span className="text-sm">Nivel 2: Sub-subdepartamentos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded" style={{ background: 'linear-gradient(to right, #7c3aed, #dc2626)' }}></div>
            <span className="text-sm">Nivel 3+: Niveles inferiores</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded" style={{ background: 'linear-gradient(to right, #eab308, #f59e0b)' }}></div>
            <span className="text-sm">🔍 Resultado de búsqueda</span>
          </div>
        </CardContent>
      </Card>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print-mode {
            max-width: 100% !important;
            padding: 0 !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .react-flow {
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
