import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Calendar, Users, FileCheck } from "lucide-react";

export default function CommitteeTraining() {
  const [newProgram, setNewProgram] = useState({
    title: "",
    description: "",
    type: "protocolo_violencia" as "protocolo_violencia" | "factores_riesgo" | "medidas_prevencion" | "otro",
    duration: 0,
    instructor: "",
  });

  const [newSession, setNewSession] = useState({
    programId: 0,
    sessionDate: "",
    sessionTime: "",
    location: "",
    type: "presencial" as "presencial" | "en_linea",
    meetingLink: "",
  });

  const { data: programs, refetch: refetchPrograms } = trpc.committeeTraining.listPrograms.useQuery({});
  const { data: sessions, refetch: refetchSessions } = trpc.committeeTraining.listSessions.useQuery({});
  
  const createProgramMutation = trpc.committeeTraining.createProgram.useMutation({
    onSuccess: () => {
      toast.success("Programa creado exitosamente");
      refetchPrograms();
      setNewProgram({ title: "", description: "", type: "protocolo_violencia", duration: 0, instructor: "" });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const createSessionMutation = trpc.committeeTraining.createSession.useMutation({
    onSuccess: () => {
      toast.success("Sesión programada exitosamente");
      refetchSessions();
      setNewSession({ programId: 0, sessionDate: "", sessionTime: "", location: "", type: "presencial", meetingLink: "" });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreateProgram = () => {
    if (!newProgram.title || newProgram.duration <= 0) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    createProgramMutation.mutate(newProgram);
  };

  const handleCreateSession = () => {
    if (!newSession.programId || !newSession.sessionDate || !newSession.sessionTime) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    createSessionMutation.mutate(newSession);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Programa de Capacitación del Comité</h1>
          <p className="text-muted-foreground">Gestión de programas de capacitación según NOM-035-STPS-2018</p>
        </div>
      </div>

      <Tabs defaultValue="programs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="programs">Programas</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
        </TabsList>

        {/* TAB: Programas */}
        <TabsContent value="programs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Crear Programa de Capacitación</CardTitle>
              <CardDescription>Registra un nuevo programa de capacitación para el comité</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título del Programa *</Label>
                  <Input
                    id="title"
                    value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                    placeholder="Ej: Protocolo de Violencia Laboral"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Programa *</Label>
                  <Select value={newProgram.type} onValueChange={(value: any) => setNewProgram({ ...newProgram, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="protocolo_violencia">Protocolo de Violencia Laboral</SelectItem>
                      <SelectItem value="factores_riesgo">Identificación de Factores de Riesgo</SelectItem>
                      <SelectItem value="medidas_prevencion">Medidas de Prevención</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (horas) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={newProgram.duration || ""}
                    onChange={(e) => setNewProgram({ ...newProgram, duration: parseInt(e.target.value) || 0 })}
                    placeholder="Ej: 8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    value={newProgram.instructor}
                    onChange={(e) => setNewProgram({ ...newProgram, instructor: e.target.value })}
                    placeholder="Ej: Lic. Juan Pérez"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  placeholder="Descripción detallada del programa..."
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateProgram} disabled={createProgramMutation.isPending}>
                {createProgramMutation.isPending ? "Creando..." : "Crear Programa"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Programas Activos</CardTitle>
              <CardDescription>Listado de programas de capacitación registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs && programs.length > 0 ? (
                    programs.map((program: any) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {program.type === "protocolo_violencia" && "Protocolo Violencia"}
                            {program.type === "factores_riesgo" && "Factores de Riesgo"}
                            {program.type === "medidas_prevencion" && "Medidas de Prevención"}
                            {program.type === "otro" && "Otro"}
                          </Badge>
                        </TableCell>
                        <TableCell>{program.duration}h</TableCell>
                        <TableCell>{program.instructor || "No asignado"}</TableCell>
                        <TableCell>
                          <Badge variant={program.status === "activo" ? "default" : "secondary"}>
                            {program.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay programas registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Sesiones */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Programar Sesión de Capacitación</CardTitle>
              <CardDescription>Agenda una nueva sesión presencial o en línea</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="programId">Programa *</Label>
                  <Select value={newSession.programId.toString()} onValueChange={(value) => setNewSession({ ...newSession, programId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un programa" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.map((program: any) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionType">Tipo de Sesión *</Label>
                  <Select value={newSession.type} onValueChange={(value: any) => setNewSession({ ...newSession, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="en_linea">En Línea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">Fecha *</Label>
                  <Input
                    id="sessionDate"
                    type="date"
                    value={newSession.sessionDate}
                    onChange={(e) => setNewSession({ ...newSession, sessionDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTime">Hora *</Label>
                  <Input
                    id="sessionTime"
                    type="time"
                    value={newSession.sessionTime}
                    onChange={(e) => setNewSession({ ...newSession, sessionTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={newSession.location}
                    onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                    placeholder="Ej: Sala de Juntas A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingLink">Enlace de Reunión (Zoom/Meet)</Label>
                  <Input
                    id="meetingLink"
                    value={newSession.meetingLink}
                    onChange={(e) => setNewSession({ ...newSession, meetingLink: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              </div>

              <Button onClick={handleCreateSession} disabled={createSessionMutation.isPending}>
                {createSessionMutation.isPending ? "Programando..." : "Programar Sesión"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sesiones Programadas</CardTitle>
              <CardDescription>Calendario de sesiones de capacitación</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ubicación/Enlace</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions && sessions.length > 0 ? (
                    sessions.map((session: any) => (
                      <TableRow key={session.id}>
                        <TableCell>{new Date(session.sessionDate).toLocaleDateString()}</TableCell>
                        <TableCell>{session.sessionTime}</TableCell>
                        <TableCell>
                          <Badge variant={session.type === "presencial" ? "default" : "secondary"}>
                            {session.type === "presencial" ? "Presencial" : "En Línea"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {session.type === "presencial" ? session.location : session.meetingLink}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{session.status || "programada"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay sesiones programadas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Asistencia */}
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Asistencia</CardTitle>
              <CardDescription>Funcionalidad de registro de asistencia (próximamente)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">El registro de asistencia estará disponible próximamente</p>
                <p className="text-sm mt-2">Incluirá lista de miembros del comité con checkboxes y generación de certificados PDF</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
