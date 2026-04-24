#!/usr/bin/env python3
"""Agrega la tabla comparativa de departamentos en KPIDashboard.tsx"""

with open("client/src/pages/KPIDashboard.tsx", "r") as f:
    content = f.read()

# 1. Agregar la query getComparativaDepts
old_query = (
    "  const { data: trends, isLoading: loadingTrends } =\n"
    "    trpc.executiveReport.getTrends.useQuery({ months: trendMonths }, { retry: false });\n\n"
    "  const isLoading = loadingKPIs || loadingTrends;"
)
new_query = (
    "  const { data: trends, isLoading: loadingTrends } =\n"
    "    trpc.executiveReport.getTrends.useQuery({ months: trendMonths }, { retry: false });\n\n"
    "  const { data: comparativaDepts, isLoading: loadingComparativa } =\n"
    "    trpc.executiveReport.getComparativaDepts.useQuery(undefined, { retry: false });\n\n"
    "  const isLoading = loadingKPIs || loadingTrends;"
)

if old_query in content:
    content = content.replace(old_query, new_query, 1)
    print("OK - query added")
else:
    print("ERROR - query anchor not found")

# 2. Agregar la tabla comparativa antes del pie de pagina
old_footer = "        {/* \u2500\u2500 Pie de p\u00e1gina \u2500\u2500 */}"
new_section = """\
        {/* Tabla Comparativa de Departamentos */}
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Comparativa de Departamentos
          </h2>
          {loadingComparativa ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : comparativaDepts && comparativaDepts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-4 py-2.5 text-left font-medium">Departamento</th>
                    <th className="px-4 py-2.5 text-center font-medium">Empleados</th>
                    <th className="px-4 py-2.5 text-center font-medium">Rotacion %</th>
                    <th className="px-4 py-2.5 text-center font-medium">% Capacitado</th>
                    <th className="px-4 py-2.5 text-center font-medium">Puntaje NOM-035</th>
                    <th className="px-4 py-2.5 text-center font-medium">Vac. Pendientes</th>
                    <th className="px-4 py-2.5 text-center font-medium">Riesgo Psico.</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativaDepts.map((dept, idx) => {
                    const rotCls = dept.turnoverRate >= 20 ? "text-red-600 font-bold" : dept.turnoverRate >= 10 ? "text-amber-600 font-semibold" : "text-emerald-600";
                    const capCls = dept.trainingRate >= 80 ? "text-emerald-600 font-bold" : dept.trainingRate >= 50 ? "text-amber-600 font-semibold" : "text-red-600";
                    const nomCls = dept.nom035Score >= 80 ? "text-emerald-600 font-bold" : dept.nom035Score >= 60 ? "text-amber-600 font-semibold" : "text-red-600";
                    return (
                      <tr key={dept.deptId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{dept.deptName}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{dept.totalEmployees}</td>
                        <td className={`px-4 py-2.5 text-center ${rotCls}`}>{dept.turnoverRate}%</td>
                        <td className={`px-4 py-2.5 text-center ${capCls}`}>{dept.trainingRate}%</td>
                        <td className={`px-4 py-2.5 text-center ${nomCls}`}>{dept.nom035Score}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{dept.pendingVacations}</td>
                        <td className="px-4 py-2.5 text-center">
                          {dept.highRiskPsycho > 0
                            ? <span className="text-red-600 font-semibold">{dept.highRiskPsycho}</span>
                            : <span className="text-emerald-600">0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t border-slate-200 font-semibold">
                    <td className="px-4 py-2 text-slate-700">Promedio general</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.totalEmployees, 0) / comparativaDepts.length)}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.turnoverRate, 0) / comparativaDepts.length)}%</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.trainingRate, 0) / comparativaDepts.length)}%</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.nom035Score, 0) / comparativaDepts.length)}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{comparativaDepts.reduce((s, d) => s + d.pendingVacations, 0)}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{comparativaDepts.reduce((s, d) => s + d.highRiskPsycho, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8 border border-dashed border-slate-300 rounded-lg">
              <p className="text-sm">No hay departamentos con empleados registrados.</p>
            </div>
          )}
        </div>

        {/* \u2500\u2500 Pie de p\u00e1gina \u2500\u2500 */}"""

if old_footer in content:
    content = content.replace(old_footer, new_section, 1)
    print("OK - comparativa JSX added")
else:
    print("ERROR - footer anchor not found")

with open("client/src/pages/KPIDashboard.tsx", "w") as f:
    f.write(content)

print("File saved.")
