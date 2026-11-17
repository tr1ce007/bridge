/** One answered reflection question. */
export interface ReflectionAnswer {
  question: string;
  answer: string;
}

/**
 * Turns the written answers into the single `reflection` string that is stored in the completion:
 * each answered question as "question\nanswer", then the optional note under `noteLabel`,
 * blocks separated by a blank line. Empty answers are left out.
 */
export function composeReflection(answers: ReflectionAnswer[], note: string, noteLabel: string): string {
  const blocks = answers
    .map((a) => ({ question: a.question.trim(), answer: a.answer.trim() }))
    .filter((a) => a.answer)
    .map((a) => `${a.question}\n${a.answer}`);
  if (note.trim()) blocks.push(`${noteLabel}\n${note.trim()}`);
  return blocks.join("\n\n");
}
