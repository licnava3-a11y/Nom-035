import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApplicationSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-20 w-20 text-green-600" />
          </div>
          <CardTitle className="text-3xl">¡Postulación Enviada Exitosamente!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Hemos recibido tu solicitud de empleo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-gray-700 leading-relaxed">
            Gracias por tu interés en formar parte de nuestro equipo. Tu postulación ha sido
            recibida y será revisada por nuestro departamento de Recursos Humanos.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Si tu perfil cumple con los requisitos de la vacante, nos pondremos en contacto
            contigo en los próximos días para continuar con el proceso de selección.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Importante:</strong> Conserva el correo de confirmación que te enviaremos
              con el número de folio de tu postulación para futuras referencias.
            </p>
          </div>
          <Button
            onClick={() => window.location.href = "/"}
            className="mt-6"
          >
            Volver al Inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
