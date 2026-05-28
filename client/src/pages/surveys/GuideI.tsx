import { useEffect, useState } from "react";
import SurveyForm from "@/components/SurveyForm";
import { Breadcrumb } from "@/components/Breadcrumb";

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
      <Breadcrumb items={[
        { label: "Encuestas NOM-035", href: "/surveys" },
        { label: "Guía I - ATS" }
      ]} />
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
