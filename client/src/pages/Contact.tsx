import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WhatsAppDemoButton } from "@/components/WhatsAppButton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    empresa: "",
    telefono: "",
    mensaje: "",
  });

  const contactMutation = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      toast.success(
        "Mensaje enviado correctamente. Nos pondremos en contacto pronto."
      );
      setFormData({
        nombre: "",
        email: "",
        empresa: "",
        telefono: "",
        mensaje: "",
      });
    },
    onError: (error: any) => {
      toast.error(`Error al enviar mensaje: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate({
      title: `Contacto: ${formData.mensaje ?? "Consulta"}`,
      content: JSON.stringify(formData),
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Contáctanos
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Estamos aquí para ayudarte con tus necesidades de capacitación y
            cumplimiento normativo. Elige tu canal preferido de comunicación.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulario de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Formulario de Contacto
              </CardTitle>
              <CardDescription>
                Completa el formulario y nos pondremos en contacto contigo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre completo *</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="juan@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input
                    id="empresa"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    placeholder="Mi Empresa S.A. de C.V."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="+52 55 1234 5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensaje">Mensaje *</Label>
                  <Textarea
                    id="mensaje"
                    name="mensaje"
                    value={formData.mensaje}
                    onChange={handleChange}
                    required
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                    rows={5}
                  />
                </div>

                <LoadingButton
                  type="submit"
                  className="w-full"
                  loading={contactMutation.isPending}
                  loadingText="Enviando mensaje..."
                >
                  Enviar Mensaje
                </LoadingButton>
              </form>
            </CardContent>
          </Card>

          {/* Contacto Directo por WhatsApp */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contacto Directo por WhatsApp
                </CardTitle>
                <CardDescription>
                  Chatea con nosotros ahora mismo y obtén respuesta inmediata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  ¿Prefieres una respuesta rápida? Contáctanos por WhatsApp y
                  uno de nuestros asesores te atenderá de inmediato.
                </p>
                <WhatsAppDemoButton
                  nombre={formData.nombre}
                  email={formData.email}
                  empresa={formData.empresa}
                  normativasSeleccionadas={["NOM-035", "NOM-037"]}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Información de Contacto */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <p className="text-sm text-muted-foreground">
                      +52 55 1234 5678
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      contacto@capacitacion.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Dirección</p>
                    <p className="text-sm text-muted-foreground">
                      Ciudad de México, México
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Horarios */}
            <Card>
              <CardHeader>
                <CardTitle>Horarios de Atención</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Lunes a Viernes:
                    </span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sábados:</span>
                    <span className="font-medium">10:00 AM - 2:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domingos:</span>
                    <span className="font-medium">Cerrado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
