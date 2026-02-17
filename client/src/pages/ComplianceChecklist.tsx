import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2, Circle, FileText } from "lucide-react";

export default function ComplianceChecklist() {
  const { data: checklist, isLoading, refetch } = trpc.compliance.getChecklist.useQuery();
  const { data: stats } = trpc.compliance.getComplianceStats.useQuery();
  const updateCompliance = trpc.compliance.updateCompliance.useMutation({
    onSuccess: () => {
      toast.success("Estado de cumplimiento actualizado");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const [notes, setNotes] = useState<Record<number, string>>({});

  const handleCheckboxChange = (itemId: number, isCompliant: boolean) => {
    updateCompliance.mutate({
      checklistItemId: itemId,
      isCompliant,
      notes: notes[itemId] || "",
    });
  };

  const handleNotesChange = (itemId: number, value: string) => {
    setNotes((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSaveNotes = (itemId: number) => {
    const item = checklist?.find((i) => i.id === itemId);
    if (!item) return;

    updateCompliance.mutate({
      checklistItemId: itemId,
      isCompliant: item.isCompliant || false,
      notes: notes[itemId] || "",
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const sections = ["A", "B", "C", "D", "E", "F", "G"];
  const sectionTitles: Record<string, string> = {
    A: "Política de Prevención",
    B: "Medidas de Prevención",
    C: "Identificación y Análisis",
    D: "Evaluación del Entorno Organizacional",
    E: "Medidas y Acciones de Control",
    F: "Exámenes Médicos",
    G: "Registros y Difusión",
  };

  const groupedChecklist = sections.map((section) => ({
    section,
    title: sectionTitles[section],
    items: checklist?.filter((item) => item.section === section) || [],
  }));

  const getSectionProgress = (section: string) => {
    const sectionItems = checklist?.filter((item) => item.section === section) || [];
    if (sectionItems.length === 0) return 0;
    const compliantCount = sectionItems.filter((item) => item.isCompliant).length;
    return Math.round((compliantCount / sectionItems.length) * 100);
  };

  const totalProgress = stats?.overall.percentage || 0;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Checklist de Cumplimiento NOM-035-STPS-2018</h1>
        <p className="text-muted-foreground">
          Verifica el cumplimiento de los requisitos normativos para la identificación, análisis y prevención de
          factores de riesgo psicosocial
        </p>
      </div>

      {/* Resumen General */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Progreso General de Cumplimiento</CardTitle>
          <CardDescription>
            {stats?.overall.compliant || 0} de {stats?.overall.total || 0} items cumplidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cumplimiento: {totalProgress}%</span>
              <span className="text-sm text-muted-foreground">
                {(stats?.overall.total || 0) - (stats?.overall.compliant || 0)} pendientes
              </span>
            </div>
            <Progress value={totalProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Checklist por Secciones */}
      <Accordion type="multiple" className="space-y-4">
        {groupedChecklist.map(({ section, title, items }) => {
          const sectionProgress = getSectionProgress(section);
          const compliantCount = items.filter((item) => item.isCompliant).length;

          return (
            <AccordionItem key={section} value={section} className="border rounded-lg">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Sección {section}:</span>
                      <span>{title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {compliantCount}/{items.length} cumplidos
                    </span>
                    <div className="w-24">
                      <Progress value={sectionProgress} className="h-2" />
                    </div>
                    <span className="text-sm font-medium">{sectionProgress}%</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4 mt-4">
                  {items.map((item) => (
                    <Card key={item.id} className={item.isCompliant ? "border-green-200 bg-green-50/50" : ""}>
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 pt-1">
                            <Checkbox
                              checked={item.isCompliant || false}
                              onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
                              className="h-5 w-5"
                            />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.isCompliant ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {item.itemCode}
                                  </span>
                                </div>
                                <p className="text-sm font-medium mb-2">{item.requirement}</p>
                                {item.evidence && (
                                  <p className="text-sm text-muted-foreground"><strong>Evidencia:</strong> {item.evidence}</p>
                                )}
                              </div>
                            </div>

                            {/* Campo de Notas */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Notas / Evidencias</label>
                              <Textarea
                                value={notes[item.id] ?? item.notes ?? ""}
                                onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                placeholder="Agregar notas, evidencias o comentarios sobre el cumplimiento..."
                                className="min-h-[80px]"
                              />
                              {notes[item.id] !== undefined && notes[item.id] !== (item.notes || "") && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveNotes(item.id)}
                                  disabled={updateCompliance.isPending}
                                >
                                  Guardar Notas
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
