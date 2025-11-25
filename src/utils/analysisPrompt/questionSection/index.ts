export function formatUserQuestionSection(
  additionalQuestions?: string,
): string {
  if (!additionalQuestions) {
    return '';
  }

  const escapedQuestion = additionalQuestions.replace(/"/g, '\\"');

  return `,
  "userQuestionResponse": {
    "question": "${escapedQuestion}",
    "answer": "Detailed answer here"
  }`;
}
