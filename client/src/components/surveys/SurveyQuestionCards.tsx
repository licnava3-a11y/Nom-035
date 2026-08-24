import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface SurveyQuestionCardData {
  id: number;
  questionText: string;
  options: string | string[] | null;
  category?: string | null;
}

export function parseSurveyOptions(options: SurveyQuestionCardData["options"]): string[] {
  if (Array.isArray(options)) return options.filter((option): option is string => typeof option === "string");
  if (typeof options !== "string") return [];

  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed.filter((option): option is string => typeof option === "string") : [];
  } catch {
    return [];
  }
}

interface SurveyQuestionCardsProps {
  questions: SurveyQuestionCardData[];
  answers: Record<number, string>;
  onAnswerChange: (questionId: number, value: string) => void;
}

export function SurveyQuestionCards({ questions, answers, onAnswerChange }: SurveyQuestionCardsProps) {
  return questions.map((question, index) => {
    const options = parseSurveyOptions(question.options);

    return (
      <div key={question.id} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {index + 1}
          </div>
          <div className="flex-1">
            <Label className="text-base font-medium leading-relaxed">{question.questionText}</Label>
            {question.category && <p className="mt-1 text-xs text-muted-foreground">Categoría: {question.category}</p>}
          </div>
        </div>

        <RadioGroup
          value={answers[question.id]}
          onValueChange={(value) => onAnswerChange(question.id, value)}
          className="ml-11 space-y-2"
        >
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-3 rounded-md p-3 hover:bg-accent">
              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
              <Label htmlFor={`${question.id}-${option}`} className="flex-1 cursor-pointer font-normal">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {!answers[question.id] && <p className="ml-11 text-sm text-destructive">* Campo requerido</p>}
      </div>
    );
  });
}
