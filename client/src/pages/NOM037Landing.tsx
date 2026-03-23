import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsAppDemoButton } from "@/components/WhatsAppButton";
import { CheckCircle2, Shield, Briefcase, FileCheck, AlertTriangle, Clock } from "lucide-react";

export default function NOM037Landing() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    empresa: "",
    telefono: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const benefits = [
    {
      icon: Shield,
      title: "Protección Laboral",
      description: "Garantiza condiciones seguras para el teletrabajo y protege los derechos de tus colaboradores.",
    },
    {
      icon: Briefcase,
      title: "Trabajo Remoto Regulado",
      description: "Establece políticas claras para el teletrabajo cumpliendo con la legislación mexicana.",
    },
    {
      icon: Clock,
      title: "Flexibilidad Controlada",
      description: "Implementa esquemas de teletrabajo que respeten los derechos de desconexión y horarios.",
    },
    {
      icon: FileCheck,
      title: "Documentación Legal",
      description: "Genera contratos, políticas y acuerdos de teletrabajo conforme a la NOM-037.",
    },
  ];

  const features = [
    "Políticas de teletrabajo personalizadas para tu organización",
    "Contratos y convenios de teletrabajo conformes a la ley",
    "Registro y control de jornadas de trabajo remoto",
    "Evaluación de condiciones de seguridad en el domicilio",
    "Capacitación en derechos y obligaciones del teletrabajo",
    "Soporte legal especializado en modalidades híbridas",
  ];

  const requirements = [
    {
      title: "Condiciones de Seguridad y Salud",
      description: "Verificar que el lugar de teletrabajo cumpla con condiciones mínimas de seguridad e higiene.",
    },
    {
      title: "Derecho a la Desconexión",
      description: "Respetar el derecho de los trabajadores a desconectarse fuera de su jornada laboral.",
    },
    {
      title: "Reversibilidad",
      description: "Establecer mecanismos para que el trabajador pueda regresar a modalidad presencial.",
    },
    {
      title: "Equipo y Herramientas",
      description: "Proporcionar o compensar los equipos, mobiliario y servicios necesarios para el teletrabajo.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Cumplimiento NOM-037-STPS-2023
            </h1>
            <p className="text-xl mb-8 text-purple-100">
              Teletrabajo: Condiciones de Seguridad y Salud en el Trabajo
            </p>
            <p className="text-lg mb-10 text-purple-200">
              Implementa esquemas de teletrabajo seguros, legales y productivos con nuestra
              plataforma especializada en cumplimiento normativo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <WhatsAppDemoButton
                nombre={formData.nombre}
                email={formData.email}
                empresa={formData.empresa}
                telefono={formData.telefono}
                normativas={["NOM-037"]}
                origen="landing_nom037"
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white"
              />
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-purple-900 hover:bg-purple-50"
                onClick={() => {
                  document.getElementById("solicitar-demo")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Solicitar Demo Gratuita
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">¿Por qué implementar la NOM-037?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              La NOM-037 regula el teletrabajo en México. Cumple con la normativa y
              aprovecha los beneficios del trabajo remoto.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <benefit.icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Requisitos */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Requisitos de la NOM-037</h2>
              <p className="text-lg text-muted-foreground">
                Cumple con todos los requisitos legales del teletrabajo
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {requirements.map((req, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      {req.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Nuestra Solución Integral</h2>
              <p className="text-lg text-muted-foreground">
                Todo lo que necesitas para implementar teletrabajo conforme a la NOM-037
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="solicitar-demo" className="py-16 bg-purple-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white text-foreground">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Solicita una Demo Gratuita
                </CardTitle>
                <CardDescription className="text-center">
                  Descubre cómo implementar teletrabajo conforme a la NOM-037
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo</Label>
                      <Input
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        placeholder="Juan Pérez"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <InputWithValidation id="email" type="email" value={formData.email} onValueChange={(value: any) => handleChange("email", value)} placeholder="juan@empresa.com" validationRules={{ email: true }} showValidationIcon={true} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
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
                      <InputWithValidation id="telefono" type="tel" value={formData.telefono} onValueChange={(value: any) => handleChange("telefono", value)} placeholder="+52 55 1234 5678" validationRules={{ phone: true }} showValidationIcon={true} />
                    </div>
                  </div>

                  <div className="pt-4">
                    <WhatsAppDemoButton
                      nombre={formData.nombre}
                      email={formData.email}
                      empresa={formData.empresa}
                      telefono={formData.telefono}
                      normativas={["NOM-037"]}
                      origen="landing_nom037_form"
                      className="w-full"
                      size="lg"
                    />
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Al solicitar la demo, aceptas nuestros términos y condiciones y política de privacidad.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Advertencia Legal */}
      <section className="py-8 bg-amber-50 border-t border-amber-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Importante: Cumplimiento Obligatorio</h3>
              <p className="text-sm text-amber-800">
                La NOM-037-STPS-2023 es de cumplimiento obligatorio para todos los centros de trabajo que
                implementen modalidades de teletrabajo en México. Asegura el cumplimiento legal y protege
                los derechos de tus colaboradores remotos.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
