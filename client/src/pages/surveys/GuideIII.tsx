import { useEffect, useState } from "react";
import SurveyForm from "@/components/SurveyForm";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function GuideIII() {
  const [anonymousToken, setAnonymousToken] = useState<string | undefined>();

  useEffect(() => {
    const token = sessionStorage.getItem("anonymousToken");
    if (token) {
      setAnonymousToken(token);
    }
  }, []);
  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Encuestas NOM-035", href: "/surveys" },
          { label: "Guía III - Entorno Organizacional" },
        ]}
      />
      <SurveyForm
        surveyId={3}
        title="Guía de Referencia III"
        description="Cuestionario para identificar y analizar los factores de riesgo psicosocial y evaluar el entorno organizacional (Empresas de más de 50 trabajadores)"
        instructions="Las siguientes preguntas están relacionadas con tu experiencia laboral y el entorno organizacional. Por favor responde con honestidad seleccionando la opción que mejor describa tu situación. Tus respuestas son confidenciales y contribuirán a crear un mejor ambiente de trabajo."
        icon="file"
        anonymousToken={anonymousToken}
      />
    </div>
  );
}
