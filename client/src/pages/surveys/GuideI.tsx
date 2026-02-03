import SurveyForm from "@/components/SurveyForm";

export default function GuideI() {
  return (
    <SurveyForm
      surveyId={1}
      title="Guía de Referencia I"
      description="Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos"
      instructions="Las siguientes preguntas están relacionadas con acontecimientos que han ocurrido en tu centro de trabajo. Por favor responde con honestidad. La información es confidencial y será utilizada únicamente para identificar situaciones que requieran atención del comité de seguridad y salud."
      icon="shield"
    />
  );
}
