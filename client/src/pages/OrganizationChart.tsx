import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import { Download, Users, Building2, Loader2, Search, ChevronLeft, ChevronRight, X, Minimize2, Maximize2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import ELK from 'elkjs/lib/elk.bundled.js';

// Nodo personalizado para departamentos (vista completa)
function DepartmentNode({ data }: { data: { name: string; code: string; employeeCount: number; manager?: string; level: number; isHighlighted?: boolean } }) {
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

// Nodo compacto para departamentos
function CompactDepartmentNode({ data }: { data: { name: string; code: string; level: number; isHighlighted?: boolean } }) {
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
    <div 
      className={`px-4 py-2 rounded-lg border-2 shadow-md transition-all duration-300 ${
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
  );
}

const nodeTypes = {
  department: DepartmentNode,
  compactDepartment: CompactDepartmentNode,
};

// Inicializar ELK para layout automático
const elk = new ELK();

type DepartmentNode = {
  id: number;
  name: string;
  code: string;
  employeeCount: number;
  managerId?: number | null;
  parentId?: number | null;
  children?: DepartmentNode[];
};

// Función para calcular layout con ELK
async function getLayoutedElements(
  departments: DepartmentNode[],
  isCompactMode: boolean
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Configuración de layout ELK según modo
  const elkOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': isCompactMode ? '50' : '80',
    'elk.layered.spacing.nodeNodeBetweenLayers': isCompactMode ? '60' : '100',
    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
  };

  // Función recursiva para construir nodos y edges
  function buildGraph(depts: DepartmentNode[], parentId: string | null = null, currentLevel = 0) {
    depts.forEach((dept) => {
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
    children: nodes.map((node) => ({
      id: node.id,
      width: isCompactMode ? 200 : 300,
      height: isCompactMode ? 60 : 150,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  // Calcular layout con ELK
  const layoutedGraph = await elk.layout(graph);

  // Actualizar posiciones de nodos
  const layoutedNodes = nodes.map((node) => {
    const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
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
  // @ts-expect-error - Router types will regenerate on server restart
  const { data: hierarchy, isLoading } = trpc.departments.getHierarchy.useQuery();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isCalculatingLayout, setIsCalculatingLayout] = useState(false);
  
  // Estados de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [matchedNodeIds, setMatchedNodeIds] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  // Estado de modo compacto
  const [isCompactMode, setIsCompactMode] = useState(() => {
    const saved = localStorage.getItem('orgchart-compact-mode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const { fitView, setCenter } = useReactFlow();

  // Persistir preferencia de modo compacto
  useEffect(() => {
    localStorage.setItem('orgchart-compact-mode', JSON.stringify(isCompactMode));
  }, [isCompactMode]);

  // Generar layout jerárquico con ELK
  useEffect(() => {
    if (!hierarchy) return;

    setIsCalculatingLayout(true);
    
    getLayoutedElements(hierarchy as DepartmentNode[], isCompactMode)
      .then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsCalculatingLayout(false);
      })
      .catch((error) => {
        console.error('Error al calcular layout:', error);
        setIsCalculatingLayout(false);
      });
  }, [hierarchy, isCompactMode, setNodes, setEdges]);

  // Búsqueda y resaltado de nodos
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Limpiar resaltado
      setNodes((nds) =>
        nds.map((node) => ({
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
      nds.map((node) => {
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
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: node.id === currentNodeId,
        },
      }))
    );

    // Centrar en el nodo resaltado
    const currentNode = nodes.find((n) => n.id === currentNodeId);
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
          link.download = `organigrama-${isCompactMode ? 'compacto' : 'completo'}-${new Date().toISOString().split('T')[0]}.png`;
          link.href = dataUrl;
          link.click();
          setIsExporting(false);
        })
        .catch((err) => {
          console.error('Error al exportar:', err);
          setIsExporting(false);
        });
    }
  }, [isCompactMode]);

  if (isLoading || isCalculatingLayout) {
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
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Organigrama Organizacional</h1>
          <p className="text-muted-foreground mt-2">
            Visualización interactiva de la estructura jerárquica de departamentos
          </p>
        </div>
        <div className="flex items-center gap-3">
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
      <Card>
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

      {/* React Flow Canvas */}
      <Card className="h-[700px]">
        <CardContent className="p-0 h-full">
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
              <Controls />
              <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-md border">
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-[#1e3a8a]">Controles:</p>
                  <p className="text-xs text-muted-foreground">• Arrastrar para mover nodos</p>
                  <p className="text-xs text-muted-foreground">• Rueda del ratón para zoom</p>
                  <p className="text-xs text-muted-foreground">• Click en nodo para detalles</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Modo: <strong>{isCompactMode ? 'Compacto' : 'Completo'}</strong>
                  </p>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </CardContent>
      </Card>

      {/* Leyenda */}
      <Card>
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
    </div>
  );
}
