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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Download, Users, Building2 } from 'lucide-react';
import { toPng } from 'html-to-image';

// Nodo personalizado para departamentos
function DepartmentNode({ data }: { data: { name: string; code: string; employeeCount: number; manager?: string } }) {
  return (
    <Card className="min-w-[250px] border-2 border-[#1e3a8a] shadow-lg">
      <CardHeader className="pb-3 bg-gradient-to-r from-[#1e3a8a] to-[#16a34a] text-white">
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
      </CardContent>
    </Card>
  );
}

const nodeTypes = {
  department: DepartmentNode,
};

export default function OrganizationChart() {
  // @ts-expect-error - Router types will regenerate on server restart
  const { data: deptStats, isLoading } = trpc.departments.getStats.useQuery();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Generar layout jerárquico
  useEffect(() => {
    if (!deptStats?.departments) return;

    const departments = deptStats.departments as Array<{
      id: number;
      name: string;
      code: string;
      employeeCount: number;
      manager?: string;
    }>;

    // Crear nodos
    const newNodes: Node[] = departments.map((dept, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      
      return {
        id: dept.id.toString(),
        type: 'department',
        position: { 
          x: col * 350 + 50, 
          y: row * 200 + 50 
        },
        data: {
          name: dept.name,
          code: dept.code,
          employeeCount: dept.employeeCount,
          manager: dept.manager,
        },
      };
    });

    // Crear conexiones (edges) - En este prototipo, conectamos secuencialmente
    // En producción, se usaría la jerarquía real de parentId
    const newEdges: Edge[] = [];
    for (let i = 1; i < departments.length; i++) {
      newEdges.push({
        id: `e${departments[i - 1].id}-${departments[i].id}`,
        source: departments[i - 1].id.toString(),
        target: departments[i].id.toString(),
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#1e3a8a', strokeWidth: 2 },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [deptStats, setNodes, setEdges]);

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

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-[600px] bg-muted rounded"></div>
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
            Visualización interactiva de la estructura de departamentos
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-[#1e3a8a] hover:bg-[#16a34a]"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exportando...' : 'Exportar PNG'}
        </Button>
      </div>

      {/* React Flow Canvas */}
      <Card className="h-[700px]">
        <CardContent className="p-0 h-full">
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
        </CardContent>
      </Card>

      {/* Leyenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leyenda</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-[#1e3a8a]"></div>
            <span className="text-sm">Azul marino: Encabezado de departamento</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-[#16a34a]"></div>
            <span className="text-sm">Verde: Gradiente de encabezado</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-1 bg-[#1e3a8a]"></div>
            <span className="text-sm">Líneas: Conexiones organizacionales</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
