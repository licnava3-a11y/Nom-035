import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsAppDemoButton } from "@/components/WhatsAppButton";
import { CheckCircle2, Shield, Users, FileCheck, AlertTriangle, TrendingUp } from "lucide-react";

export default function NOM035Landing() {
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
      title: "Cumplimiento Normativo",
      description: "Asegura el cumplimiento total de la NOM-035-STPS-2018 y evita sanciones de hasta 5,000 veces la UMA.",
    },
    {
      icon: Users,
      title: "Ambiente Laboral Saludable",
      description: "Identifica y previene factores de riesgo psicosocial, mejorando el bienestar de tus colaboradores.",
    },
    {
      icon: TrendingUp,
      title: "Productividad Mejorada",
      description: "Reduce el ausentismo y aumenta la productividad al crear un entorno de trabajo favorable.",
    },
    {
      icon: FileCheck,
      title: "Documentación Completa",
      description: "Genera toda la documentación requerida: políticas, cuestionarios, informes y planes de acción.",
    },
  ];

  const features = [
    "Cuestionarios digitales para identificación de factores de riesgo",
    "Análisis automático de resultados con gráficos y reportes",
    "Generación de políticas de prevención personalizadas",
    "Seguimiento de casos y medidas correctivas",
    "Capacitación en línea para trabajadores y directivos",
    "Soporte técnico especializado durante todo el proceso",
  ];

  const steps = [
    {
      number: "1",
      title: "Diagnóstico Inicial",
      description: "Evaluamos el estado actual de tu organización y definimos el alcance del proyecto.",
    },
    {
      number: "2",
      title: "Aplicación de Cuestionarios",
      description: "Implementamos los cuestionarios digitales a todos los trabajadores de manera confidencial.",
    },
    {
      number: "3",
      title: "Análisis de Resultados",
      description: "Procesamos los datos y generamos reportes detallados con identificación de riesgos.",
    },
    {
      number: "4",
      title: "Plan de Acción",
      description: "Desarrollamos e implementamos medidas preventivas y correctivas personalizadas.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Cumplimiento NOM-035-STPS-2018
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Prevención de Factores de Riesgo Psicosocial en el Trabajo
            </p>
            <p className="text-lg mb-10 text-blue-200">
              Protege a tus colaboradores, cumple con la normativa y mejora el ambiente laboral
              con nuestra plataforma integral de gestión.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <WhatsAppDemoButton
                nombre={formData.nombre}
                email={formData.email}
                empresa={formData.empresa}
                telefono={formData.telefono}
                normativas={["NOM-035"]}
                origen="landing_nom035"
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white"
              />
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-blue-900 hover:bg-blue-50"
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
            <h2 className="text-3xl font-bold mb-4">¿Por qué implementar la NOM-035?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              La NOM-035 es obligatoria para todos los centros de trabajo en México.
              Descubre los beneficios de cumplirla correctamente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <benefit.icon className="h-6 w-6 text-blue-600" />
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

      {/* Características */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Nuestra Solución Integral</h2>
              <p className="text-lg text-muted-foreground">
                Todo lo que necesitas para cumplir con la NOM-035 en una sola plataforma
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

      {/* Proceso */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Proceso de Implementación</h2>
            <p className="text-lg text-muted-foreground">
              Te acompañamos en cada paso del cumplimiento normativo
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">
                    {step.number}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="solicitar-demo" className="py-16 bg-blue-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white text-foreground">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Solicita una Demo Gratuita
                </CardTitle>
                <CardDescription className="text-center">
                  Descubre cómo nuestra plataforma puede ayudarte a cumplir con la NOM-035
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
                      <InputWithValidation id="email" type="email" value={formData.email} onValueChange={(value) => handleChange("email", value)} placeholder="juan@empresa.com" validationRules={{ email: true }} showValidationIcon={true} />
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
                      <InputWithValidation id="telefono" type="tel" value={formData.telefono} onValueChange={(value) => handleChange("telefono", value)} placeholder="+52 55 1234 5678" validationRules={{ phone: true }} showValidationIcon={true} />
                    </div>
                  </div>

                  <div className="pt-4">
                    <WhatsAppDemoButton
                      nombre={formData.nombre}
                      email={formData.email}
                      empresa={formData.empresa}
                      telefono={formData.telefono}
                      normativas={["NOM-035"]}
                      origen="landing_nom035_form"
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
                La NOM-035-STPS-2018 es de cumplimiento obligatorio para todos los centros de trabajo en México.
                El incumplimiento puede resultar en multas de hasta 5,000 veces la Unidad de Medida y Actualización (UMA).
                Protege a tu empresa y a tus colaboradores implementando las medidas necesarias hoy mismo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
