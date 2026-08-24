/**
 * Página pública de respuesta de encuesta post-caso
 * Accesible sin login mediante token único enviado por correo
 * Ruta: /survey/:token
 */

import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, AlertTriangle, Loader2, Star } from "lucide-react";

// ─── Tipos de caso en español ─────────────────────────────────────────────────

const CASE_TYPE_LABELS: Record<string, string> = {
  mobbing: "Acoso Laboral (Mobbing)",
  burnout: "Síndrome de Burnout",
  violence: "Violencia en el Trabajo",
  stress: "Estrés Laboral",
  other: "Otro",
};

// ─── Componente de calificación por estrellas ─────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}

function StarRating({ value, onChange, labels }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] rounded"
            aria-label={`${star} de 5`}
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hovered || value)
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <p className="text-sm text-[#1e3a5f] font-medium">
          {labels[(hovered || value) - 1]}
        </p>
      )}
    </div>
  );
}

// ─── Preguntas de la encuesta ─────────────────────────────────────────────────

const QUESTIONS = [
  {
    key: "improvementRating" as const,
    title: "¿Ha mejorado su situación laboral desde el cierre del caso?",
    description:
      "Evalúe en qué medida las acciones tomadas han tenido un impacto positivo en su bienestar.",
    labels: [
      "Sin mejora",
      "Mejora mínima",
      "Mejora moderada",
      "Buena mejora",
      "Mejora significativa",
    ],
  },
  {
    key: "satisfactionRating" as const,
    title: "¿Qué tan satisfecho/a está con la resolución del caso?",
    description:
      "Considere la atención recibida, los tiempos de respuesta y los resultados obtenidos.",
    labels: [
      "Muy insatisfecho/a",
      "Insatisfecho/a",
      "Neutral",
      "Satisfecho/a",
      "Muy satisfecho/a",
    ],
  },
  {
    key: "supportRating" as const,
    title: "¿Recibió el apoyo necesario durante el proceso?",
    description:
      "Evalúe el acompañamiento, la comunicación y el soporte brindado por el comité NOM-035.",
    labels: [
      "Sin apoyo",
      "Apoyo insuficiente",
      "Apoyo aceptable",
      "Buen apoyo",
      "Apoyo excelente",
    ],
  },
  {
    key: "recommendationRating" as const,
    title:
      "¿Recomendaría este proceso a un compañero/a en una situación similar?",
    description:
      "Su respuesta nos ayuda a entender la confianza que genera el sistema de atención.",
    labels: [
      "Definitivamente no",
      "Probablemente no",
      "Tal vez",
      "Probablemente sí",
      "Definitivamente sí",
    ],
  },
];

// ─── Estados de la página ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#1e3a5f] animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Cargando encuesta...</p>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Encuesta no encontrada
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          El enlace que utilizó no es válido o ya no está disponible. Si cree
          que esto es un error, contacte al área de Recursos Humanos.
        </p>
      </div>
    </div>
  );
}

function ExpiredState({ caseNumber }: { caseNumber?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Encuesta expirada
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          El período de respuesta para
          {caseNumber ? ` el caso ${caseNumber}` : " esta encuesta"} ha
          concluido. Las encuestas tienen una vigencia de 7 días desde su envío.
        </p>
      </div>
    </div>
  );
}

function CompletedState({ caseNumber }: { caseNumber?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          ¡Gracias por su respuesta!
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Su opinión sobre{caseNumber ? ` el caso ${caseNumber}` : " el caso"}{" "}
          ha sido registrada exitosamente. Sus respuestas contribuyen a mejorar
          continuamente nuestros procesos de atención y cumplimiento con la
          NOM-035 STPS 2018.
        </p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SurveyPublicResponse() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [ratings, setRatings] = useState({
    improvementRating: 0,
    satisfactionRating: 0,
    supportRating: 0,
    recommendationRating: 0,
  });
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState("");

  const { data, isLoading } = trpc.postCaseSurveys.getSurveyByToken.useQuery(
    { token },
    { enabled: token.length > 0, retry: false }
  );

  const submitMutation = trpc.postCaseSurveys.submitSurveyResponse.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: err => setValidationError(err.message),
  });

  // ── Estados de carga y error ──
  if (!token) return <NotFoundState />;
  if (isLoading) return <LoadingState />;
  if (!data || !data.found) return <NotFoundState />;
  if (data.status === "expired")
    return <ExpiredState caseNumber={data.survey?.caseNumber} />;
  if (data.status === "completed" || submitted)
    return <CompletedState caseNumber={data.survey?.caseNumber} />;

  const survey = data.survey!;
  const allRated = Object.values(ratings).every(v => v > 0);

  const handleSubmit = () => {
    if (!allRated) {
      setValidationError(
        "Por favor responda todas las preguntas antes de enviar."
      );
      return;
    }
    setValidationError("");
    submitMutation.mutate({
      token,
      ...ratings,
      comments: comments || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white py-5 px-4 shadow-md">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-1">
            Sistema NOM-035 STPS 2018
          </p>
          <h1 className="text-xl font-bold">
            Encuesta de Seguimiento Post-Caso
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Info del caso */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">
                Caso
              </span>
              <p className="font-semibold text-gray-800">{survey.caseNumber}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">
                Tipo
              </span>
              <p className="font-semibold text-gray-800">
                {CASE_TYPE_LABELS[survey.caseType] ?? survey.caseType}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">
                Período de seguimiento
              </span>
              <p className="font-semibold text-gray-800">
                {survey.daysSinceClosure} días post-cierre
              </p>
            </div>
            {survey.expiresAt && (
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">
                  Válida hasta
                </span>
                <p className="font-semibold text-gray-800">
                  {new Date(survey.expiresAt).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-5 py-4 mb-6">
          <p className="text-sm text-blue-800 leading-relaxed">
            {survey.reporterName
              ? `Estimado/a ${survey.reporterName}, su`
              : "Su"}{" "}
            opinión es fundamental para mejorar nuestros procesos. Por favor
            califique cada aspecto del <strong>1 (peor) a 5 (mejor)</strong>{" "}
            según su experiencia.
          </p>
        </div>

        {/* Preguntas */}
        <div className="space-y-5">
          {QUESTIONS.map((q, idx) => (
            <div
              key={q.key}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex gap-3 mb-3">
                <span className="flex-shrink-0 w-7 h-7 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm leading-snug">
                    {q.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {q.description}
                  </p>
                </div>
              </div>
              <div className="pl-10">
                <StarRating
                  value={ratings[q.key]}
                  onChange={v => setRatings(prev => ({ ...prev, [q.key]: v }))}
                  labels={q.labels}
                />
              </div>
            </div>
          ))}

          {/* Comentarios opcionales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-1">
              Comentarios adicionales{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Comparta cualquier observación, sugerencia o comentario que
              considere relevante.
            </p>
            <Textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Escriba aquí sus comentarios..."
              className="resize-none text-sm"
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {comments.length}/1000
            </p>
          </div>
        </div>

        {/* Error de validación */}
        {validationError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        {/* Botón de envío */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full max-w-xs bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold py-3 text-base"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              "Enviar respuesta"
            )}
          </Button>
          {!allRated && (
            <p className="text-xs text-gray-400">
              Responda las {QUESTIONS.length} preguntas para poder enviar.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 pb-4">
          Sus respuestas son confidenciales y se utilizarán únicamente para
          mejorar los procesos de atención NOM-035 STPS 2018.
        </p>
      </main>
    </div>
  );
}
