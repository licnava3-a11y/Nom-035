import { useEffect, useState } from "react";
import SurveyForm from "@/components/SurveyForm";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function GuideII() {
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
          { label: "Guía II - Factores de Riesgo" },
        ]}
      />
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
