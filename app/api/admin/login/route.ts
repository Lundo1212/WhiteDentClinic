import { NextResponse } from "next/server";
import { isValidAdminAccessKey } from "../../../../lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secret = typeof body.secret === "string" ? body.secret.trim() : "";
    const expectedSecret = process.env.ADMIN_ACCESS_KEY;

    if (!expectedSecret) {
      console.error("Admin login is unavailable because ADMIN_ACCESS_KEY is not configured.");
      return NextResponse.json(
        { error: "Admin login is not configured. Set ADMIN_ACCESS_KEY in the deployment environment." },
        { status: 503 },
      );
    }

    if (!secret || !isValidAdminAccessKey(secret)) {
      return NextResponse.json(
        { error: "Invalid admin secret. Please use the studio admin key." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      token: expectedSecret,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to validate admin access." },
      { status: 400 },
    );
  }
}
