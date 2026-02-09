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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Download, Users, Building2, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import ELK from 'elkjs/lib/elk.bundled.js';

// Nodo personalizado para departamentos
function DepartmentNode({ data }: { data: { name: string; code: string; employeeCount: number; manager?: string; level: number } }) {
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
    <Card className="min-w-[280px] border-2 border-[#1e3a8a] shadow-lg">
      <CardHeader 
        className="pb-3 text-white"
        style={{
          background: `linear-gradient(to right, ${colors.from}, ${colors.to})`
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

const nodeTypes = {
  department: DepartmentNode,
};

// Inicializar ELK para layout automático
const elk = new ELK();

// Configuración de layout ELK
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.padding': '[top=50,left=50,bottom=50,right=50]',
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

// Función para calcular layout con ELK
async function getLayoutedElements(
  departments: DepartmentNode[],
  level = 0
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Función recursiva para construir nodos y edges
  function buildGraph(depts: DepartmentNode[], parentId: string | null = null, currentLevel = 0) {
    depts.forEach((dept) => {
      const nodeId = dept.id.toString();
      
      nodes.push({
        id: nodeId,
        type: 'department',
        position: { x: 0, y: 0 }, // ELK calculará las posiciones
        data: {
          name: dept.name,
          code: dept.code,
          employeeCount: dept.employeeCount,
          level: currentLevel,
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
          style: { stroke: '#1e3a8a', strokeWidth: 2 },
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
      width: 300,
      height: 150,
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

  // Generar layout jerárquico con ELK
  useEffect(() => {
    if (!hierarchy) return;

    setIsCalculatingLayout(true);
    
    getLayoutedElements(hierarchy as DepartmentNode[])
      .then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsCalculatingLayout(false);
      })
      .catch((error) => {
        console.error('Error al calcular layout:', error);
        setIsCalculatingLayout(false);
      });
  }, [hierarchy, setNodes, setEdges]);

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
          link.download = `organigrama-${new Date().toISOString().split('T')[0]}.png`;
          link.href = dataUrl;
          link.click();
          setIsExporting(false);
        })
        .catch((err) => {
          console.error('Error al exportar:', err);
          setIsExporting(false);
        });
    }
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organigrama Organizacional</h1>
          <p className="text-muted-foreground mt-2">
            Visualización interactiva de la estructura jerárquica de departamentos
          </p>
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
        <CardContent className="grid gap-4 md:grid-cols-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
