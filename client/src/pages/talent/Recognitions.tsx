import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Award, Heart, ThumbsUp, Sparkles, Star, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ReactionType = "like" | "applause" | "heart" | "star";

const reactionIcons: Record<ReactionType, { icon: React.ReactNode; label: string }> = {
  like: { icon: <ThumbsUp className="h-4 w-4" />, label: "Me gusta" },
  applause: { icon: <Sparkles className="h-4 w-4" />, label: "Aplauso" },
  heart: { icon: <Heart className="h-4 w-4" />, label: "Corazón" },
  star: { icon: <Star className="h-4 w-4" />, label: "Estrella" },
};

export default function Recognitions() {
  // Using toast from sonner
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"received" | "sent" | "public" | "all">("received");
  
  // Form state
  const [toUserId, setToUserId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Queries
  const categoriesQuery = trpc.recognitions.getCategories.useQuery();
  const employeesQuery = trpc.employees.list.useQuery();
  const recognitionsQuery = trpc.recognitions.list.useQuery({
    filter: selectedTab,
    limit: 50,
    offset: 0,
  });

  // Mutations
  const createMutation = trpc.recognitions.create.useMutation({
    onSuccess: () => {
      toast.success("¡Reconocimiento enviado!", {
        description: "Tu reconocimiento ha sido enviado exitosamente.",
      });
      setIsDialogOpen(false);
      resetForm();
      recognitionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const addReactionMutation = trpc.recognitions.addReaction.useMutation({
    onSuccess: () => {
      recognitionsQuery.refetch();
    },
  });

  const removeReactionMutation = trpc.recognitions.removeReaction.useMutation({
    onSuccess: () => {
      recognitionsQuery.refetch();
    },
  });

  const resetForm = () => {
    setToUserId("");
    setCategoryId("");
    setMessage("");
    setIsPublic(false);
  };

  const handleSubmit = () => {
    if (!toUserId || !categoryId || !message) {
      toast.error("Campos incompletos", {
        description: "Por favor completa todos los campos obligatorios.",
      });
      return;
    }

    createMutation.mutate({
      toUserId: Number(toUserId),
      categoryId: Number(categoryId),
      type: "reconocimiento",
      message,
      isPublic,
    });
  };

  const handleReaction = (recognitionId: number, reactionType: ReactionType, hasReacted: boolean) => {
    if (hasReacted) {
      removeReactionMutation.mutate({ recognitionId });
    } else {
      addReactionMutation.mutate({ recognitionId, reactionType });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reconocimientos y Felicitaciones</h1>
          <p className="text-muted-foreground mt-2">
            Reconoce el esfuerzo y logros de tus compañeros
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Award className="mr-2 h-5 w-5" />
              Enviar Reconocimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Enviar Reconocimiento</DialogTitle>
              <DialogDescription>
                Reconoce el esfuerzo y logros de tus compañeros de trabajo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Selector de empleado */}
              <div className="grid gap-2">
                <Label htmlFor="employee">Empleado *</Label>
                <Select value={toUserId} onValueChange={setToUserId}>
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesQuery.data?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.firstName} {emp.lastName} - {emp.position || "Sin puesto"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de categoría */}
              <div className="grid gap-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesQuery.data?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mensaje */}
              <div className="grid gap-2">
                <Label htmlFor="message">Mensaje *</Label>
                <Textarea
                  id="message"
                  placeholder="Escribe un mensaje de reconocimiento (mínimo 10 caracteres)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  {message.length}/500 caracteres
                </p>
              </div>

              {/* Visibilidad */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isPublic" className="font-normal">
                  Hacer público este reconocimiento (visible para todos)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Enviando..." : "Enviar Reconocimiento"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="received">Recibidos</TabsTrigger>
          <TabsTrigger value="sent">Enviados</TabsTrigger>
          <TabsTrigger value="public">Muro Público</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4 mt-6">
          {recognitionsQuery.isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando reconocimientos...</p>
            </div>
          ) : recognitionsQuery.data && recognitionsQuery.data.length > 0 ? (
            <div className="grid gap-4">
              {recognitionsQuery.data.map((recognition) => (
                <Card key={recognition.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>{getInitials(recognition.fromUserName || "")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {recognition.fromUserName}
                            {selectedTab !== "sent" && (
                              <>
                                {" "}
                                <span className="text-muted-foreground font-normal">reconoció a</span>{" "}
                                {recognition.toUserName}
                              </>
                            )}
                            {selectedTab === "sent" && (
                              <>
                                {" "}
                                <span className="text-muted-foreground font-normal">a</span>{" "}
                                {recognition.toUserName}
                              </>
                            )}
                          </CardTitle>
                          <CardDescription>{formatDate(recognition.createdAt)}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {recognition.categoryIcon} {recognition.categoryName}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base mb-4">{recognition.message}</p>
                    
                    {/* Reacciones */}
                    <div className="flex items-center space-x-2 pt-4 border-t">
                      {(Object.keys(reactionIcons) as ReactionType[]).map((type) => (
                        <Button
                          key={type}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(recognition.id, type, false)}
                          className="flex items-center space-x-1"
                        >
                          {reactionIcons[type].icon}
                          <span className="text-xs">{reactionIcons[type].label}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No hay reconocimientos</p>
                <p className="text-muted-foreground text-center mt-2">
                  {selectedTab === "received" && "Aún no has recibido reconocimientos"}
                  {selectedTab === "sent" && "Aún no has enviado reconocimientos"}
                  {selectedTab === "public" && "No hay reconocimientos públicos"}
                  {selectedTab === "all" && "No hay reconocimientos en el sistema"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
