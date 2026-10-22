import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import {
  deleteLocalVisitorQuestion,
  updateLocalVisitorQuestion,
} from "../../../../lib/local-questions";
import { supabase } from "../../../../lib/supabase";

function isValidQuestionUpdate(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const question = typeof input.question === "string" ? input.question.trim() : "";
  const response = typeof input.response === "string" ? input.response.trim() : "";

  if (
    name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !question ||
    question.length > 5000 ||
    response.length > 5000
  ) {
    return null;
  }

  return {
    customer_name: name || null,
    customer_email: email,
    question_text: question,
    response: response || null,
  };
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid question update." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid question update." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const source = input.source;
  const id = input.id;
  const updates = isValidQuestionUpdate(input);
  if (
    (source !== "local" && source !== "database") ||
    (typeof id !== "string" && typeof id !== "number") ||
    !String(id).trim() ||
    !updates
  ) {
    return NextResponse.json({ error: "Enter a valid question, name, and email address." }, { status: 400 });
  }

  if (source === "local") {
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { error: "Local questions cannot be updated on the live site." },
        { status: 503 },
      );
    }

    if (!updateLocalVisitorQuestion(String(id), updates)) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, question: { id, ...updates, source: "local" } });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Question storage is not configured." },
      { status: 503 },
    );
  }

  const questionId = Number(id);
  if (!Number.isSafeInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "A valid question ID is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("visitor_questions")
    .update(updates)
    .eq("id", questionId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Visitor question update failed:", error.message);
    return NextResponse.json({ error: "Unable to update this question." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, question: { id: questionId, ...updates } });
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid delete request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid delete request." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const source = input.source;
  const id = input.id;
  if (
    (source !== "local" && source !== "database") ||
    (typeof id !== "string" && typeof id !== "number") ||
    !String(id).trim()
  ) {
    return NextResponse.json({ error: "A valid question is required." }, { status: 400 });
  }

  if (source === "local") {
    if (process.env.VERCEL === "1") {
      return NextResponse.json({ error: "Local questions cannot be deleted on the live site." }, { status: 503 });
    }
    if (!deleteLocalVisitorQuestion(String(id))) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Question storage is not configured." }, { status: 503 });
  }

  const questionId = Number(id);
  if (!Number.isSafeInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "A valid question ID is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("visitor_questions")
    .delete()
    .eq("id", questionId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Visitor question deletion failed:", error.message);
    return NextResponse.json({ error: "Unable to delete this question." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
