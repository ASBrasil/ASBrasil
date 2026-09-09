export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

/**
 * O conteúdo de uma GamePhase é um Json livre. A primeira versão do editor
 * de admin guardava uma pergunta só ({question, options, correctIndex}); a
 * versão atual guarda várias ({questions: [...]}), pra dar pra medir
 * "aproveitamento" em porcentagem de verdade. Qualquer fase criada antes
 * dessa mudança continua funcionando - vira só um questionário de uma
 * pergunta.
 */
export function normalizeQuizQuestions(content: unknown): QuizQuestion[] {
  if (!content || typeof content !== "object") return [];
  const c = content as Record<string, unknown>;

  if (Array.isArray(c.questions)) {
    return (c.questions as unknown[])
      .map((q) => {
        if (!q || typeof q !== "object") return null;
        const qq = q as Record<string, unknown>;
        if (typeof qq.question !== "string" || !Array.isArray(qq.options)) return null;
        return {
          question: qq.question,
          options: (qq.options as unknown[]).map((o) => String(o)),
          correctIndex: typeof qq.correctIndex === "number" ? qq.correctIndex : 0,
        };
      })
      .filter((q): q is QuizQuestion => q !== null);
  }

  // Formato antigo: pergunta única direto na raiz do content.
  if (typeof c.question === "string" && Array.isArray(c.options)) {
    return [
      {
        question: c.question,
        options: (c.options as unknown[]).map((o) => String(o)),
        correctIndex: typeof c.correctIndex === "number" ? c.correctIndex : 0,
      },
    ];
  }

  return [];
}

/** Remove a resposta certa antes de mandar a fase pro navegador do participante. */
export function stripCorrectAnswers(questions: QuizQuestion[]) {
  return questions.map((q) => ({ question: q.question, options: q.options }));
}
