import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, FileText, Code, Calendar, Eye, CheckCircle, AlertCircle, Loader2, Copy, History, Trash2, Clock } from "lucide-react";

export default function DC1Generator() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loadingDC1, setLoadingDC1] = useState(false);
  const [loadingSIRCE, setLoadingSIRCE] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [previewDC1, setPreviewDC1] = useState<string | null>(null);
  const [previewSIRCE, setPreviewSIRCE] = useState<string | null>(null);
  const [showPreviewDC1, setShowPreviewDC1] = useState(false);
  const [showPreviewSIRCE, setShowPreviewSIRCE] = useState(false);
  const [lastGeneratedDC1, setLastGeneratedDC1] = useState<any>(null);
  const [lastGeneratedSIRCE, setLastGeneratedSIRCE] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"dc1" | "sirce" | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [filterMinDownloads, setFilterMinDownloads] = useState<string>("");
  const [filterMaxDownloads, setFilterMaxDownloads] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewHistoryId, setPreviewHistoryId] = useState<number | null>(null);
  const [previewHistoryContent, setPreviewHistoryContent] = useState<string | null>(null);
  const [previewHistoryType, setPreviewHistoryType] = useState<"dc1" | "sirce" | null>(null);
  const [showHistoryPreview, setShowHistoryPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const employeesQuery = trpc.employees.list.useQuery({ pageSize: 100 });
  const coursesQuery = trpc.training.listCourses.useQuery();
  const generateDC1Mutation = trpc.dc1Generator.generateDC1.useMutation();
  const generateSIRCEMutation = trpc.dc1Generator.generateSIRCEXml.useMutation();
  const exportBatchMutation = trpc.dc1Generator.exportSIRCEByPeriod.useQuery(
    { startDate, endDate },
    { enabled: !!startDate && !!endDate }
  );
  const historyQuery = trpc.dc1Generator.listHistory.useQuery({
    fileType: historyFilter === "all" ? undefined : historyFilter,
    limit: 50,
  });

  // Filtrar resultados en cliente
  const filteredHistory = (historyQuery.data || []).filter((record: any) => {
    // Filtro por búsqueda
    if (searchQuery && !record.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filtro por fecha desde
    if (filterFromDate) {
      const recordDate = new Date(record.createdAt).getTime();
      const filterDate = new Date(filterFromDate).getTime();
      if (recordDate < filterDate) return false;
    }

    // Filtro por fecha hasta
    if (filterToDate) {
      const recordDate = new Date(record.createdAt).getTime();
      const filterDate = new Date(filterToDate).getTime();
      if (recordDate > filterDate) return false;
    }

    // Filtro por descargas mínimas
    if (filterMinDownloads) {
      const minDownloads = parseInt(filterMinDownloads);
      if ((record.downloadCount || 0) < minDownloads) return false;
    }

    // Filtro por descargas máximas
    if (filterMaxDownloads) {
      const maxDownloads = parseInt(filterMaxDownloads);
      if ((record.downloadCount || 0) > maxDownloads) return false;
    }

    return true;
  });
  const deleteHistoryMutation = trpc.dc1Generator.deleteHistory.useMutation();
  const getHistoryFileMutation = trpc.dc1Generator.getHistoryFile.useMutation();
  const saveToHistoryMutation = trpc.dc1Generator.saveToHistory.useMutation();

  const handleGenerateDC1 = async () => {
    if (!selectedEmployee || !selectedCourse) {
      toast.error("Selecciona empleado y curso");
      return;
    }

    setLoadingDC1(true);
    try {
      const result = await generateDC1Mutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        courseId: parseInt(selectedCourse),
      });

      setLastGeneratedDC1(result);
      setPreviewDC1(result.html);

      // Guardar en historial
      await saveToHistoryMutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        courseId: parseInt(selectedCourse),
        fileType: "dc1",
        filename: result.filename,
        fileContent: result.html,
        mimeType: "text/html",
      });

      const blob = new Blob([result.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("DC-1 generado y descargado exitosamente");
      historyQuery.refetch();
    } catch (err) {
      toast.error("Error al generar DC-1");
    } finally {
      setLoadingDC1(false);
    }
  };

  const handleGenerateSIRCE = async () => {
    if (!selectedEmployee || !selectedCourse) {
      toast.error("Selecciona empleado y curso");
      return;
    }

    setLoadingSIRCE(true);
    try {
      const result = await generateSIRCEMutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        courseId: parseInt(selectedCourse),
      });

      setLastGeneratedSIRCE(result);
      setPreviewSIRCE(result.xml);

      // Guardar en historial
      await saveToHistoryMutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        courseId: parseInt(selectedCourse),
        fileType: "sirce",
        filename: result.filename,
        fileContent: result.xml,
        mimeType: "application/xml",
      });

      const blob = new Blob([result.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("SIRCE XML generado y descargado exitosamente");
      historyQuery.refetch();
    } catch (err) {
      toast.error("Error al generar SIRCE XML");
    } finally {
      setLoadingSIRCE(false);
    }
  };

  const handleExportBatch = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecciona rango de fechas");
      return;
    }

    setLoadingBatch(true);
    try {
      const result = exportBatchMutation.data;
      if (result) {
        const blob = new Blob([result.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`${result.totalRecords} registros exportados`);
      }
    } catch (err) {
      toast.error("Error al exportar lote");
    } finally {
      setLoadingBatch(false);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} descargado`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const handleDownloadFromHistory = async (historyId: number) => {
    try {
      const file = await getHistoryFileMutation.mutateAsync({ historyId });
      downloadFile(file.content, file.filename, file.mimeType);
    } catch (err) {
      toast.error("Error al descargar archivo");
    }
  };

  const handleDeleteHistory = async (historyId: number) => {
    try {
      await deleteHistoryMutation.mutateAsync({ historyId });
      toast.success("Archivo eliminado del historial");
      historyQuery.refetch();
    } catch (err) {
      toast.error("Error al eliminar archivo");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterMinDownloads("");
    setFilterMaxDownloads("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterFromDate || filterToDate || filterMinDownloads || filterMaxDownloads;

  // Lógica de paginación
  const totalRecords = filteredHistory.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePreviewHistory = async (historyId: number, fileType: "dc1" | "sirce") => {
    setLoadingPreview(true);
    try {
      const result = await getHistoryFileMutation.mutateAsync({ historyId });
      setPreviewHistoryId(historyId);
      setPreviewHistoryContent(result.fileContent);
      setPreviewHistoryType(fileType);
      setShowHistoryPreview(true);
    } catch (err) {
      toast.error("Error al cargar vista previa");
    } finally {
      setLoadingPreview(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Generador DC-1 y SIRCE XML</h1>
          <p className="text-muted-foreground mt-2">
            Genera Constancias de Habilidades Laborales (DC-1) y registros SIRCE para carga al sistema STPS
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Historial ({historyQuery.data?.length || 0})
        </Button>
      </div>

      {/* Generador Individual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generador Individual
          </CardTitle>
          <CardDescription>Genera DC-1 o SIRCE XML para un empleado específico</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Empleado</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona empleado" />
                </SelectTrigger>
                <SelectContent>
                  {(employeesQuery.data?.data || []).map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Curso</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona curso" />
                </SelectTrigger>
                <SelectContent>
                  {(coursesQuery.data || []).map((course: any) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleGenerateDC1}
              disabled={loadingDC1 || !selectedEmployee || !selectedCourse}
              className="flex-1 min-w-[200px]"
            >
              {loadingDC1 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generar DC-1 (HTML)
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateSIRCE}
              disabled={loadingSIRCE || !selectedEmployee || !selectedCourse}
              variant="outline"
              className="flex-1 min-w-[200px]"
            >
              {loadingSIRCE ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4 mr-2" />
                  Generar SIRCE XML
                </>
              )}
            </Button>
          </div>

          {/* Botones de vista previa y descarga adicional */}
          {(lastGeneratedDC1 || lastGeneratedSIRCE) && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Archivos generados exitosamente</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {lastGeneratedDC1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreviewDC1(true)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver DC-1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(lastGeneratedDC1.html, lastGeneratedDC1.filename, "text/html")}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Descargar DC-1
                    </Button>
                  </>
                )}
                {lastGeneratedSIRCE && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreviewSIRCE(true)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver SIRCE XML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(lastGeneratedSIRCE.xml, lastGeneratedSIRCE.filename, "application/xml")}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Descargar SIRCE XML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(lastGeneratedSIRCE.xml)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar XML
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exportación Masiva */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exportación Masiva por Período
          </CardTitle>
          <CardDescription>Exporta todos los registros completados en un rango de fechas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {exportBatchMutation.data && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-900">
                  <strong>{exportBatchMutation.data.totalRecords}</strong> registros encontrados en el período
                </p>
              </div>
            </div>
          )}

          {exportBatchMutation.isLoading && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <p className="text-sm text-yellow-900">Buscando registros...</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleExportBatch}
            disabled={loadingBatch || !startDate || !endDate || !exportBatchMutation.data}
            className="w-full"
          >
            {loadingBatch ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar SIRCE XML Masivo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Panel de Historial */}
      {showHistory && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historial de Archivos Generados
                </CardTitle>
                <CardDescription>Últimos archivos DC-1 y SIRCE XML generados</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={historyFilter} onValueChange={(v: any) => setHistoryFilter(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="dc1">Solo DC-1</SelectItem>
                    <SelectItem value="sirce">Solo SIRCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barra de búsqueda y filtros */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
              <div>
                <label className="block text-sm font-medium mb-2">Buscar por nombre de archivo</label>
                <input
                  type="text"
                  placeholder="Ej: DC1_CURP_2026-05-30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Desde</label>
                  <input
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hasta</label>
                  <input
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Descargas mín.</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filterMinDownloads}
                    onChange={(e) => setFilterMinDownloads(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Descargas máx.</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Sin límite"
                    value={filterMaxDownloads}
                    onChange={(e) => setFilterMaxDownloads(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            {/* Resultados */}
            {historyQuery.isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Mostrando <strong>{startIndex + 1}-{Math.min(endIndex, totalRecords)}</strong> de <strong>{totalRecords}</strong> archivos
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Por página:</label>
                    <Select value={pageSize.toString()} onValueChange={(v) => handlePageSizeChange(parseInt(v))}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Tipo</th>
                      <th className="text-left py-2 px-2">Archivo</th>
                      <th className="text-left py-2 px-2">Tamaño</th>
                      <th className="text-left py-2 px-2">Descargas</th>
                      <th className="text-left py-2 px-2">Generado</th>
                      <th className="text-left py-2 px-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((record: any) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">
                          <Badge variant={record.fileType === "dc1" ? "default" : "secondary"}>
                            {record.fileType.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">{record.filename}</td>
                        <td className="py-2 px-2">{formatFileSize(record.fileSize || 0)}</td>
                        <td className="py-2 px-2">{record.downloadCount || 0}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">
                          {formatDate(record.createdAt)}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewHistory(record.id, record.fileType)}
                              className="h-8 w-8 p-0"
                              title="Vista previa"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadFromHistory(record.id)}
                              className="h-8 w-8 p-0"
                              title="Descargar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteHistory(record.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                
                {/* Controles de paginación */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay archivos en el historial</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información */}
      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">DC-1</Badge>
              Constancia de Habilidades Laborales
            </h4>
            <p className="text-sm text-muted-foreground">
              Documento HTML que certifica la participación del empleado en el curso y su porcentaje de avance.
              Incluye datos del trabajador, curso, instructor y fecha de conclusión. Descargable directamente desde la interfaz.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">SIRCE</Badge>
              XML para Sistema STPS
            </h4>
            <p className="text-sm text-muted-foreground">
              Formato oficial STPS (Sistema de Información de Registros de Capacitación Empresarial) para carga
              al sistema. Contiene estructura XML validada para integración con sistemas gubernamentales. Soporta
              exportación individual y masiva por período.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de vista previa DC-1 */}
      <Dialog open={showPreviewDC1} onOpenChange={setShowPreviewDC1}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa DC-1</DialogTitle>
            <DialogDescription>
              {lastGeneratedDC1?.filename}
            </DialogDescription>
          </DialogHeader>
          {previewDC1 && (
            <div className="border rounded-lg overflow-auto bg-white p-4">
              <iframe
                srcDoc={previewDC1}
                className="w-full h-[600px] border rounded"
                title="Vista previa DC-1"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de vista previa SIRCE XML */}
      <Dialog open={showPreviewSIRCE} onOpenChange={setShowPreviewSIRCE}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa SIRCE XML</DialogTitle>
            <DialogDescription>
              {lastGeneratedSIRCE?.filename}
            </DialogDescription>
          </DialogHeader>
          {previewSIRCE && (
            <div className="border rounded-lg overflow-auto bg-gray-50 p-4">
              <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                {previewSIRCE}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de vista previa del historial */}
      <Dialog open={showHistoryPreview} onOpenChange={setShowHistoryPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Vista Previa {previewHistoryType === "dc1" ? "DC-1" : "SIRCE XML"}
            </DialogTitle>
            <DialogDescription>
              {previewHistoryType === "dc1" ? "Constancia de Habilidades Laborales" : "Registro de Capacitación SIRCE"}
            </DialogDescription>
          </DialogHeader>
          {loadingPreview ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewHistoryContent ? (
            <div className="space-y-3">
              {previewHistoryType === "dc1" ? (
                <div className="border rounded-lg overflow-auto bg-white p-4">
                  <iframe
                    srcDoc={previewHistoryContent}
                    className="w-full h-[600px] border rounded"
                    title="Vista previa DC-1"
                  />
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto bg-gray-50 p-4">
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                    {previewHistoryContent}
                  </pre>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => downloadFile(
                    previewHistoryContent,
                    `preview-${previewHistoryType}.${previewHistoryType === "dc1" ? "html" : "xml"}`,
                    previewHistoryType === "dc1" ? "text/html" : "application/xml"
                  )}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No se pudo cargar la vista previa</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
