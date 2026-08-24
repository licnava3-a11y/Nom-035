import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowLeft, Check, X } from "lucide-react";
import { useRoute, useLocation } from "wouter";

export default function QuestionBank() {
  const [, params] = useRoute("/assessments/:id/questions");
  const [, setLocation] = useLocation();
  const assessmentId = params?.id ? parseInt(params.id) : 0;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [formData, setFormData] = useState({
    questionText: "",
    questionType: "multiple_choice" as
      | "multiple_choice"
      | "true_false"
      | "short_answer",
    points: 1,
    explanation: "",
    options: [
      { optionText: "", isCorrect: false, orderIndex: 0 },
      { optionText: "", isCorrect: false, orderIndex: 1 },
      { optionText: "", isCorrect: false, orderIndex: 2 },
      { optionText: "", isCorrect: false, orderIndex: 3 },
    ],
  });

  // Queries
  const { data: assessment, isLoading } = trpc.assessments.getById.useQuery({
    id: assessmentId,
  });

  // Mutations
  const addQuestionMutation = trpc.assessments.addQuestion.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const updateQuestionMutation = trpc.assessments.updateQuestion.useMutation({
    onSuccess: () => {
      refetch();
      setEditingQuestion(null);
      resetForm();
    },
  });

  const deleteQuestionMutation = trpc.assessments.deleteQuestion.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const refetch = () => {
    // Refetch assessment data
    window.location.reload();
  };

  const resetForm = () => {
    setFormData({
      questionText: "",
      questionType: "multiple_choice",
      points: 1,
      explanation: "",
      options: [
        { optionText: "", isCorrect: false, orderIndex: 0 },
        { optionText: "", isCorrect: false, orderIndex: 1 },
        { optionText: "", isCorrect: false, orderIndex: 2 },
        { optionText: "", isCorrect: false, orderIndex: 3 },
      ],
    });
  };

  const handleAddQuestion = () => {
    const orderIndex = assessment?.questions?.length || 0;
    addQuestionMutation.mutate({
      assessmentId,
      ...formData,
      orderIndex,
    });
  };

  const handleUpdateQuestion = () => {
    if (!editingQuestion) return;
    updateQuestionMutation.mutate({
      questionId: editingQuestion.id,
      ...formData,
    });
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (confirm("¿Está seguro de eliminar esta pregunta?")) {
      deleteQuestionMutation.mutate({ questionId });
    }
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setFormData({
      questionText: question.questionText,
      questionType: question.questionType,
      points: question.points,
      explanation: question.explanation || "",
      options: question.options || [
        { optionText: "", isCorrect: false, orderIndex: 0 },
        { optionText: "", isCorrect: false, orderIndex: 1 },
        { optionText: "", isCorrect: false, orderIndex: 2 },
        { optionText: "", isCorrect: false, orderIndex: 3 },
      ],
    });
    setIsAddDialogOpen(true);
  };

  const updateOption = (
    index: number,
    field: "optionText" | "isCorrect",
    value: string | boolean
  ) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        {
          optionText: "",
          isCorrect: false,
          orderIndex: formData.options.length,
        },
      ],
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      alert("Debe haber al menos 2 opciones");
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Cargando preguntas...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container py-8">
        <p>Evaluación no encontrada</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/assessments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a evaluaciones
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{assessment.title}</h1>
          <p className="text-muted-foreground">Banco de preguntas</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Pregunta
        </Button>
      </div>

      {/* Lista de preguntas */}
      <div className="grid gap-4">
        {assessment.questions && assessment.questions.length > 0 ? (
          assessment.questions.map((question: any, index: number) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Pregunta {index + 1}</Badge>
                      <Badge>
                        {question.points}{" "}
                        {question.points === 1 ? "punto" : "puntos"}
                      </Badge>
                      {question.questionType === "multiple_choice" && (
                        <Badge variant="secondary">Opción múltiple</Badge>
                      )}
                      {question.questionType === "true_false" && (
                        <Badge variant="secondary">Verdadero/Falso</Badge>
                      )}
                      {question.questionType === "short_answer" && (
                        <Badge variant="secondary">Respuesta corta</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">
                      {question.questionText}
                    </CardTitle>
                    {question.explanation && (
                      <CardDescription className="mt-2">
                        <strong>Explicación:</strong> {question.explanation}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQuestion(question)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {question.options && question.options.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Opciones:</p>
                    {question.options.map((option: any, optIndex: number) => (
                      <div key={option.id} className="flex items-center gap-2">
                        {option.isCorrect ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={
                            option.isCorrect ? "font-medium text-green-700" : ""
                          }
                        >
                          {String.fromCharCode(65 + optIndex)}.{" "}
                          {option.optionText}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No hay preguntas en esta evaluación
              </p>
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar primera pregunta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de agregar/editar pregunta */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={open => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingQuestion(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Editar Pregunta" : "Nueva Pregunta"}
            </DialogTitle>
            <DialogDescription>
              Configure la pregunta y sus opciones de respuesta
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="questionText">Texto de la pregunta *</Label>
              <Textarea
                id="questionText"
                value={formData.questionText}
                onChange={e =>
                  setFormData({ ...formData, questionText: e.target.value })
                }
                placeholder="Escriba la pregunta aquí"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="questionType">Tipo de pregunta</Label>
                <Select
                  value={formData.questionType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, questionType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">
                      Opción múltiple
                    </SelectItem>
                    <SelectItem value="true_false">Verdadero/Falso</SelectItem>
                    <SelectItem value="short_answer">
                      Respuesta corta
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="points">Puntos</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  value={formData.points}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      points: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="explanation">Explicación (opcional)</Label>
              <Textarea
                id="explanation"
                value={formData.explanation}
                onChange={e =>
                  setFormData({ ...formData, explanation: e.target.value })
                }
                placeholder="Explicación de la respuesta correcta"
                rows={2}
              />
            </div>

            {/* Opciones de respuesta */}
            {(formData.questionType === "multiple_choice" ||
              formData.questionType === "true_false") && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Opciones de respuesta *</Label>
                  {formData.questionType === "multiple_choice" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar opción
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={e =>
                          updateOption(index, "isCorrect", e.target.checked)
                        }
                        className="rounded"
                      />
                      <Input
                        value={option.optionText}
                        onChange={e =>
                          updateOption(index, "optionText", e.target.value)
                        }
                        placeholder={`Opción ${String.fromCharCode(65 + index)}`}
                      />
                      {formData.questionType === "multiple_choice" &&
                        formData.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Marque la(s) opción(es) correcta(s)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingQuestion(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={
                editingQuestion ? handleUpdateQuestion : handleAddQuestion
              }
              disabled={
                !formData.questionText ||
                (formData.questionType !== "short_answer" &&
                  !formData.options.some(o => o.isCorrect)) ||
                addQuestionMutation.isPending ||
                updateQuestionMutation.isPending
              }
            >
              {editingQuestion
                ? updateQuestionMutation.isPending
                  ? "Actualizando..."
                  : "Actualizar Pregunta"
                : addQuestionMutation.isPending
                  ? "Agregando..."
                  : "Agregar Pregunta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
