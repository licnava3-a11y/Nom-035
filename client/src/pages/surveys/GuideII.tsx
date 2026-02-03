import SurveyForm from "@/components/SurveyForm";

export default function GuideII() {
  return (
    <SurveyForm
      surveyId={2}
      title="Guía de Referencia II"
      description="Cuestionario para identificar y analizar los factores de riesgo psicosocial (Empresas de 16 a 50 trabajadores)"
      instructions="Las siguientes preguntas están relacionadas con tu experiencia laboral. Por favor responde con honestidad seleccionando la opción que mejor describa tu situación. Recuerda que tus respuestas son confidenciales y ayudarán a mejorar las condiciones de trabajo."
      icon="building"
    />
  );
}
