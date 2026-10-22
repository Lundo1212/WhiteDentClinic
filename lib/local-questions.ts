import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type VisitorQuestionRecord = {
  id: number | string;
  customer_name: string | null;
  customer_email: string;
  question_text: string;
  created_at: string;
  response?: string | null;
  answered_at?: string | null;
  source?: "local" | "database";
};

const questionsPath = () => path.join(process.cwd(), "data", "visitor-questions.json");

export function readLocalVisitorQuestions(): VisitorQuestionRecord[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(questionsPath(), "utf8"));
    return Array.isArray(parsed)
      ? (parsed as VisitorQuestionRecord[]).map((question) => ({ ...question, source: "local" }))
      : [];
  } catch {
    return [];
  }
}

export function saveLocalVisitorQuestion(
  question: Omit<VisitorQuestionRecord, "id" | "created_at" | "source">,
) {
  const record: VisitorQuestionRecord = {
    ...question,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  const dataDirectory = path.dirname(questionsPath());
  mkdirSync(dataDirectory, { recursive: true });
  writeFileSync(questionsPath(), JSON.stringify([record, ...readLocalVisitorQuestions()], null, 2));
  return { ...record, source: "local" as const };
}

export function answerLocalVisitorQuestion(id: string, response: string) {
  const questions = readLocalVisitorQuestions();
  const index = questions.findIndex(
    (question) => String(question.id) === id && !question.answered_at,
  );
  if (index === -1) return false;

  questions[index] = {
    ...questions[index],
    response,
    answered_at: new Date().toISOString(),
  };
  writeFileSync(questionsPath(), JSON.stringify(questions, null, 2));
  return true;
}

export function updateLocalVisitorQuestion(
  id: string,
  updates: Pick<VisitorQuestionRecord, "customer_name" | "customer_email" | "question_text" | "response">,
) {
  const questions = readLocalVisitorQuestions();
  const index = questions.findIndex((question) => String(question.id) === id);
  if (index === -1) return false;

  questions[index] = { ...questions[index], ...updates };
  writeFileSync(questionsPath(), JSON.stringify(questions, null, 2));
  return true;
}

export function deleteLocalVisitorQuestion(id: string) {
  const questions = readLocalVisitorQuestions();
  const remaining = questions.filter((question) => String(question.id) !== id);
  if (remaining.length === questions.length) return false;

  writeFileSync(questionsPath(), JSON.stringify(remaining, null, 2));
  return true;
}