import SurveyForm from "@/components/SurveyForm";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function GuideIII() {
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
            <BreadcrumbPage>Guía III - Entorno Organizacional</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <SurveyForm
      surveyId={3}
      title="Guía de Referencia III"
      description="Cuestionario para identificar y analizar los factores de riesgo psicosocial y evaluar el entorno organizacional (Empresas de más de 50 trabajadores)"
      instructions="Las siguientes preguntas están relacionadas con tu experiencia laboral y el entorno organizacional. Por favor responde con honestidad seleccionando la opción que mejor describa tu situación. Tus respuestas son confidenciales y contribuirán a crear un mejor ambiente de trabajo."
      icon="file"
      />
    </div>
  );
}
