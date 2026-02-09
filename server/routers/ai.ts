import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

export const aiRouter = router({
  generateCompanyDescription: protectedProcedure
    .input(
      z.object({
        fieldType: z.enum(["mision", "vision", "valores", "historia", "politica", "descripcion"]),
        companyName: z.string().optional(),
        industry: z.string().optional(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { fieldType, companyName, industry, context } = input;

      // Prompts específicos por tipo de campo
      const prompts: Record<string, string> = {
        mision: `Genera una misión empresarial profesional y concisa (máximo 150 palabras) para una empresa${companyName ? ` llamada "${companyName}"` : ""}${industry ? ` del sector ${industry}` : ""}. ${context ? `Contexto adicional: ${context}` : ""} La misión debe describir el propósito fundamental de la organización y su razón de ser.`,
        
        vision: `Genera una visión empresarial inspiradora y ambiciosa (máximo 100 palabras) para una empresa${companyName ? ` llamada "${companyName}"` : ""}${industry ? ` del sector ${industry}` : ""}. ${context ? `Contexto adicional: ${context}` : ""} La visión debe describir dónde quiere estar la empresa en el futuro.`,
        
        valores: `Genera una lista de 5-7 valores corporativos fundamentales para una empresa${companyName ? ` llamada "${companyName}"` : ""}${industry ? ` del sector ${industry}` : ""}. ${context ? `Contexto adicional: ${context}` : ""} Cada valor debe incluir su nombre y una breve descripción (2-3 líneas). Formato: "**Valor**: Descripción"`,
        
        historia: `Genera una historia empresarial profesional y narrativa (máximo 300 palabras) para una empresa${companyName ? ` llamada "${companyName}"` : ""}${industry ? ` del sector ${industry}` : ""}. ${context ? `Contexto adicional: ${context}` : ""} La historia debe incluir fundación, evolución y logros principales.`,
        
        politica: `Genera una política de prevención de riesgos psicosociales conforme a la NOM-035-STPS-2018 (máximo 400 palabras) para una empresa${companyName ? ` llamada "${companyName}"` : ""}${industry ? ` del sector ${industry}` : ""}. ${context ? `Contexto adicional: ${context}` : ""} Debe incluir compromiso de la dirección, alcance, objetivos y responsabilidades.`,
        
        descripcion: `Genera una descripción empresarial completa y profesional (máximo 200 palabras) para una empresa${companyName ? ` llamada "${companyName}"` : ""}${industry ? ` del sector ${industry}` : ""}. ${context ? `Contexto adicional: ${context}` : ""} Incluye actividades principales, productos/servicios y propuesta de valor.`,
      };

      const prompt = prompts[fieldType];

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Eres un consultor empresarial experto en redacción corporativa. Genera textos profesionales, concisos y alineados con estándares mexicanos de gestión empresarial y normatividad laboral.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;
        
        // Extraer texto del content (puede ser string o array)
        let generatedText = "";
        if (typeof content === "string") {
          generatedText = content;
        } else if (Array.isArray(content)) {
          // Si es array, buscar el primer TextContent
          const textContent = content.find((c) => c.type === "text");
          if (textContent && "text" in textContent) {
            generatedText = textContent.text;
          }
        }

        if (!generatedText) {
          throw new Error("No se pudo generar el texto con IA");
        }

        return {
          success: true,
          text: generatedText.trim(),
        };
      } catch (error) {
        console.error("Error al generar texto con IA:", error);
        throw new Error("Error al generar texto con IA. Por favor, intenta nuevamente.");
      }
    }),
});
