import { NextResponse } from "next/server";
import {
  answerLocalVisitorQuestion,
  readLocalVisitorQuestions,
} from "../../../../../lib/local-questions";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import { sendVisitorQuestionResponseEmail } from "../../../../../lib/email";
import { supabase } from "../../../../../lib/supabase";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    let name = typeof body.name === "string" ? body.name.trim() : "";
    let email = typeof body.email === "string" ? body.email.trim() : "";
    let question = typeof body.question === "string" ? body.question.trim() : "";
    const response = typeof body.response === "string" ? body.response.trim() : "";
    const id = typeof body.id === "string" || typeof body.id === "number" ? String(body.id) : "";
    const source = body.source;

    if (
      !id ||
      (source !== "local" && source !== "database") ||
      !response ||
      response.length > 5000
    ) {
      return NextResponse.json(
        { error: "A valid question and reply under 5,000 characters are required." },
        { status: 400 },
      );
    }

    let questionId: number | null = null;
    if (source === "local") {
      if (process.env.VERCEL === "1") {
        return NextResponse.json(
          { error: "Local questions cannot be updated on the live site. Use a question saved in Supabase." },
          { status: 503 },
        );
      }

      const record = readLocalVisitorQuestions().find(
        (item) => String(item.id) === id,
      );
      if (!record) {
        return NextResponse.json({ error: "Question not found." }, { status: 404 });
      }
      if (record.answered_at) {
        return NextResponse.json({ error: "This question has already been answered." }, { status: 409 });
      }
      name = record.customer_name ?? "";
      email = record.customer_email;
      question = record.question_text;
    } else {
      const database = supabase;
      if (!database) {
        return NextResponse.json({ error: "Question storage is not configured." }, { status: 503 });
      }
      questionId = Number(id);
      if (!Number.isSafeInteger(questionId) || questionId <= 0) {
        return NextResponse.json({ error: "A valid question ID is required." }, { status: 400 });
      }
      const { data, error } = await database
        .from("visitor_questions")
        .select("customer_name, customer_email, question_text, answered_at")
        .eq("id", questionId)
        .maybeSingle();
      if (error) {
        console.error("Visitor question lookup failed:", error.message);
        return NextResponse.json({ error: "Unable to verify this question." }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Question not found." }, { status: 404 });
      }
      if (data.answered_at) {
        return NextResponse.json({ error: "This question has already been answered." }, { status: 409 });
      }
      name = data.customer_name ?? "";
      email = data.customer_email;
      question = data.question_text;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !question) {
      return NextResponse.json({ error: "The question record has invalid recipient details." }, { status: 400 });
    }

    await sendVisitorQuestionResponseEmail({ name, email, question, response });

    if (source === "local") {
      if (!answerLocalVisitorQuestion(id, response)) {
        return NextResponse.json(
          { error: "The reply email was sent, but the local question could not be marked answered." },
          { status: 500 },
        );
      }
    } else {
      const database = supabase;
      if (!database) {
        return NextResponse.json(
          { error: "The reply email was sent, but question storage is not configured." },
          { status: 503 },
        );
      }

      const { data, error } = await database
        .from("visitor_questions")
        .update({ response, answered_at: new Date().toISOString() })
        .eq("id", questionId)
        .is("answered_at", null)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        console.error("Visitor question answer status update failed:", error?.message ?? "Question was already answered or not found.");
        return NextResponse.json(
          { error: "The reply email was sent, but the question could not be marked answered." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true, message: `Reply emailed to ${email}.` });
  } catch (error) {
    console.error("Visitor question reply failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send the email reply." },
      { status: 500 },
    );
  }
}