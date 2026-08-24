export type Nom035GuideRecommendation = {
  id: "guia_i" | "guia_ii" | "guia_iii";
  name: string;
  description: string;
  required: boolean;
  workerRange: string;
  questionCount: number;
};

export function getRecommendedNom035Guides(totalWorkers: number): Nom035GuideRecommendation[] {
  const guides: Nom035GuideRecommendation[] = [{
    id: "guia_i",
    name: "Guía de Referencia I",
    description: "Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos",
    required: true,
    workerRange: "Todos los centros de trabajo",
    questionCount: 4,
  }];

  if (totalWorkers >= 16) {
    guides.push({
      id: "guia_ii",
      name: "Guía de Referencia II",
      description: "Cuestionario para identificar factores de riesgo psicosocial en los centros de trabajo",
      required: totalWorkers <= 50,
      workerRange: "16 a 50 trabajadores",
      questionCount: 46,
    });
  }

  if (totalWorkers > 50) {
    guides.push({
      id: "guia_iii",
      name: "Guía de Referencia III",
      description: "Cuestionario para identificar y analizar factores de riesgo psicosocial y evaluar el entorno organizacional",
      required: true,
      workerRange: "Más de 50 trabajadores",
      questionCount: 72,
    });
  }

  return guides;
}

export function getNom035ComplianceLevel(totalWorkers: number): "basic" | "intermediate" | "complete" {
  return totalWorkers <= 15 ? "basic" : totalWorkers <= 50 ? "intermediate" : "complete";
}
