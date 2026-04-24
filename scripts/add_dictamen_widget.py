#!/usr/bin/env python3
"""Agrega el widget de vigencia del Dictamen NOM-035 en Home.tsx"""

with open("client/src/pages/Home.tsx", "r") as f:
    content = f.read()

# 1. Agregar la query del widget de dictamen despues de la query comparison
old_query = "  const { data: comparison, isLoading: comparisonLoading } = trpc.executiveDashboard.getHistoricalComparison.useQuery();"
new_query = (
    "  const { data: comparison, isLoading: comparisonLoading } = trpc.executiveDashboard.getHistoricalComparison.useQuery();\n"
    "  // Widget de vigencia del Dictamen NOM-035\n"
    "  const { data: dictamenVigencia } = trpc.dictamenDocs.getVigencia.useQuery(undefined, { retry: false });"
)
if old_query in content:
    content = content.replace(old_query, new_query, 1)
    print("OK - query added")
else:
    print("ERROR - query anchor not found")

# 2. Agregar el widget de dictamen en el JSX justo antes del widget de vacaciones
# Buscar el comentario del widget de vacaciones
anchor = '      {/* \u2500\u2500 Widget de Vacaciones'
if anchor in content:
    widget_html = '''      {/* Widget de Vigencia del Dictamen NOM-035 */}
      {dictamenVigencia ? (
        <Card className={`border-l-4 ${
          dictamenVigencia.vencido ? "border-l-red-600 bg-red-50" :
          dictamenVigencia.semaforo === "rojo" ? "border-l-red-500 bg-red-50" :
          dictamenVigencia.semaforo === "amarillo" ? "border-l-amber-500 bg-amber-50" :
          "border-l-emerald-500 bg-emerald-50"
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Vigencia Dictamen NOM-035
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                dictamenVigencia.vencido ? "bg-red-200 text-red-800" :
                dictamenVigencia.semaforo === "rojo" ? "bg-red-100 text-red-700" :
                dictamenVigencia.semaforo === "amarillo" ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              }`}>
                {dictamenVigencia.vencido ? "VENCIDO" :
                 dictamenVigencia.semaforo === "rojo" ? "CRITICO" :
                 dictamenVigencia.semaforo === "amarillo" ? "PROXIMO A VENCER" : "VIGENTE"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">{dictamenVigencia.folio}</p>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">{dictamenVigencia.titulo}</p>
                {dictamenVigencia.responsableTecnico && (
                  <p className="text-xs text-slate-400 mt-0.5">Resp: {dictamenVigencia.responsableTecnico}</p>
                )}
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  dictamenVigencia.vencido ? "text-red-700" :
                  dictamenVigencia.semaforo === "rojo" ? "text-red-600" :
                  dictamenVigencia.semaforo === "amarillo" ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {dictamenVigencia.vencido ? "0" : dictamenVigencia.daysLeft}
                </p>
                <p className="text-xs text-slate-500">dias restantes</p>
                <p className="text-xs text-slate-400">
                  Vence: {new Date(dictamenVigencia.fechaVencimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    dictamenVigencia.vencido ? "bg-red-600" :
                    dictamenVigencia.semaforo === "rojo" ? "bg-red-500" :
                    dictamenVigencia.semaforo === "amarillo" ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (dictamenVigencia.daysLeft / 365) * 100))}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
'''
    content = content.replace(anchor, widget_html + "      " + anchor[6:], 1)
    print("OK - widget JSX added")
else:
    print("ERROR - widget anchor not found, searching for alternatives...")
    # Buscar cualquier comentario de widget
    import re
    widgets = re.findall(r'\{/\* .{5,50} \*/\}', content)
    print("Found comment anchors:", widgets[:5])

with open("client/src/pages/Home.tsx", "w") as f:
    f.write(content)

print("File saved.")
