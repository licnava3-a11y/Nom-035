import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Eye, Building2, Clock } from "lucide-react";

export default function CompanyVisits() {
  const [days, setDays] = useState(30);
  const { data: stats, isLoading } = trpc.companyVisits.getStats.useQuery({
    days,
  });

  if (isLoading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cargando estadísticas...
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Contador de Visitas por Empresa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoreo de acceso y uso del sistema por empresa
          </p>
        </div>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
            <SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  Total de visitas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.byCompany?.filter(c => c.companyName).length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Empresas distintas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <BarChart2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.byPage?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Páginas visitadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top páginas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top páginas visitadas</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.byPage?.length ? (
              <p className="text-sm text-muted-foreground italic">
                Sin datos aún.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.byPage.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-[200px]">
                      {p.page}
                    </span>
                    <Badge variant="secondary">{p.visits}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top empresas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top empresas</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.byCompany?.length ? (
              <p className="text-sm text-muted-foreground italic">
                Sin datos aún.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.byCompany.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">
                      {c.companyName ?? "(Sin empresa)"}
                    </span>
                    <Badge variant="secondary">{c.visits}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visitas recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Visitas recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.recent?.length ? (
            <p className="text-sm text-muted-foreground italic">
              Sin visitas registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                      Página
                    </th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                      Empresa
                    </th>
                    <th className="text-left py-2 font-medium text-muted-foreground">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map(v => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-4 truncate max-w-[200px]">
                        {v.page}
                      </td>
                      <td className="py-1.5 pr-4">{v.companyName ?? "—"}</td>
                      <td className="py-1.5 text-muted-foreground">
                        {new Date(v.visitedAt).toLocaleString("es-MX")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
