import { useEffect, useState } from "react";
import SurveyForm from "@/components/SurveyForm";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function GuideII() {
  const [anonymousToken, setAnonymousToken] = useState<string | undefined>();

  useEffect(() => {
    const token = sessionStorage.getItem('anonymousToken');
    if (token) {
      setAnonymousToken(token);
    }
  }, []);
  return (
    <div>
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/surveys">Encuestas NOM-035</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Guía II - Factores de Riesgo</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <SurveyForm
        surveyId={2}
        title="Guía de Referencia II"
        description="Cuestionario para identificar y analizar los factores de riesgo psicosocial (Empresas de 16 a 50 trabajadores)"
        instructions="Las siguientes preguntas están relacionadas con tu experiencia laboral. Por favor responde con honestidad seleccionando la opción que mejor describa tu situación. Recuerda que tus respuestas son confidenciales y ayudarán a mejorar las condiciones de trabajo."
        icon="building"
        anonymousToken={anonymousToken}
      />
    </div>
  );
}
