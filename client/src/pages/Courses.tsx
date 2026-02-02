import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { BookOpen, Clock, Play, Plus, Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CourseDialog } from "@/components/CourseDialog";

export default function Courses() {
  const { user } = useAuth();
  const { data: courses, isLoading } = trpc.courses.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCourse(null);
    setDialogOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      fundamentos: "Fundamentos",
      categorias_dominios: "Categorías y Dominios",
      mobbing: "Mobbing",
      burnout: "Burnout",
      protocolos: "Protocolos",
      comite: "Comité",
      analisis_puestos: "Análisis de Puestos",
      otros: "Otros",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      fundamentos: "bg-blue-100 text-blue-800",
      categorias_dominios: "bg-purple-100 text-purple-800",
      mobbing: "bg-red-100 text-red-800",
      burnout: "bg-orange-100 text-orange-800",
      protocolos: "bg-green-100 text-green-800",
      comite: "bg-indigo-100 text-indigo-800",
      analisis_puestos: "bg-yellow-100 text-yellow-800",
      otros: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cursos</h1>
            <p className="text-muted-foreground mt-2">Programas de capacitación NOM-035</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground mt-2">
            Programas de capacitación sobre riesgos psicosociales
          </p>
        </div>
        {(user?.role === "admin" || user?.role === "instructor") && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Curso
          </Button>
        )}
      </div>

      {/* Courses Grid */}
      {courses && courses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  <Badge className={getCategoryColor(course.category)}>
                    {getCategoryLabel(course.category)}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-3">
                  {course.description || "Sin descripción disponible"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration ? `${course.duration} min` : "Variable"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Módulos</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Ver Curso
                </Button>
                {(user?.role === "admin" || user?.role === "instructor") && (
                  <Button variant="outline" onClick={() => handleEdit(course)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay cursos disponibles</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Aún no se han publicado cursos de capacitación.
            </p>
            {(user?.role === "admin" || user?.role === "instructor") && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Curso
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Course Dialog */}
      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={selectedCourse}
      />
    </div>
  );
}
