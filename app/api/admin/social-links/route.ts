import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import { parseSocialLinks, readSocialLinks, saveSocialLinks, validateSocialLinks } from "../../../../lib/social-links";
import { supabase } from "../../../../lib/supabase";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!supabase) {
    if (process.env.VERCEL === "1") {
      return NextResponse.json({ error: "Persistent social-link storage is not configured." }, { status: 503 });
    }
    return NextResponse.json({ links: readSocialLinks() });
  }

  const { data, error } = await supabase
    .from("social_links")
    .select("links")
    .eq("singleton", true)
    .maybeSingle();

  if (error) {
    console.error("Social links could not be loaded from Supabase:", error.message);
    return NextResponse.json(
      { error: `Social links could not be loaded: ${error.message}` },
      { status: 503 },
    );
  }

  if (!data) return NextResponse.json({ links: readSocialLinks() });
  const links = parseSocialLinks(data.links);
  if (!links) {
    console.error("Stored social links are invalid.");
    return NextResponse.json({ error: "Stored social links are invalid." }, { status: 500 });
  }
  return NextResponse.json({ links });
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const links = validateSocialLinks(body.links);
    if (!links) {
      return NextResponse.json(
        { error: "Enter valid HTTPS links for supported social platforms." },
        { status: 400 },
      );
    }

    if (!supabase) {
      if (process.env.VERCEL === "1") {
        return NextResponse.json({ error: "Persistent social-link storage is not configured." }, { status: 503 });
      }
      saveSocialLinks(links);
      return NextResponse.json({ ok: true, links });
    }

    const { data, error } = await supabase
      .from("social_links")
      .upsert({ singleton: true, links, updated_at: new Date().toISOString() })
      .select("links")
      .single();

    if (error || !data) {
      console.error("Social links could not be saved to Supabase:", error?.message ?? "No settings row returned.");
      return NextResponse.json(
        { error: `Unable to save social links: ${error?.message ?? "Supabase returned no settings row."}` },
        { status: 503 },
      );
    }

    const savedLinks = parseSocialLinks(data.links);
    if (!savedLinks) {
      console.error("Supabase returned invalid social links after saving.");
      return NextResponse.json({ error: "Social links were saved but could not be verified." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, links: savedLinks });
  } catch (error) {
    console.error("Social links update failed:", error);
    return NextResponse.json({ error: "Unable to save social links." }, { status: 400 });
  }
}