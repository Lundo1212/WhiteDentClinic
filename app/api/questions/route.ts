import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !question ||
      question.length > 5000 ||
      name.length > 120
    ) {
      return NextResponse.json(
        { error: "Enter a valid email and a question under 5,000 characters." },
        { status: 400 },
      );
    }

    if (!supabase) {
      console.error("Visitor question could not be saved because Supabase is not configured.");
      return NextResponse.json(
        { error: "Question storage is unavailable. Please try again later." },
        { status: 503 },
      );
    }

    const { error } = await supabase.from("visitor_questions").insert({
      customer_name: name || null,
      customer_email: email,
      question_text: question,
    });

    if (error) {
      console.error("Visitor question insert failed:", error.message);
      return NextResponse.json(
        { error: "We could not save your question right now. Please try again later." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: true, message: "Your question has been saved. The studio will reply by email." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Visitor question submission failed:", error);
    return NextResponse.json(
      { error: "We could not save your question right now. Please try again later." },
      { status: 500 },
    );
  }
}
