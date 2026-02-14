import { useEffect, useState } from "react";
import SurveyForm from "@/components/SurveyForm";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function GuideI() {
  const [anonymousToken, setAnonymousToken] = useState<string | undefined>();

  useEffect(() => {
    // Detectar si hay un token anónimo en sessionStorage (viene de AnonymousSurveyAccess)
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
            <BreadcrumbPage>Guía I - ATS</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <SurveyForm
        surveyId={1}
        title="Guía de Referencia I"
        description="Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos"
        instructions="Las siguientes preguntas están relacionadas con acontecimientos que han ocurrido en tu centro de trabajo. Por favor responde con honestidad. La información es confidencial y será utilizada únicamente para identificar situaciones que requieran atención del comité de seguridad y salud."
        icon="shield"
        anonymousToken={anonymousToken}
      />
    </div>
  );
}
