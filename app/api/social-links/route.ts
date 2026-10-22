import { connection, NextResponse } from "next/server";
import { parseSocialLinks, readSocialLinks } from "../../../lib/social-links";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  await connection();

  if (supabase) {
    const { data, error } = await supabase
      .from("social_links")
      .select("links")
      .eq("singleton", true)
      .maybeSingle();

    if (error) {
      console.error("Public social links could not be loaded:", error.message);
      return NextResponse.json({ error: "Social links are temporarily unavailable." }, { status: 503 });
    }

    if (data) {
      const links = parseSocialLinks(data.links);
      if (!links) {
        console.error("Stored social links are invalid.");
        return NextResponse.json({ error: "Social links are temporarily unavailable." }, { status: 500 });
      }
      return NextResponse.json(
        { links },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } else if (process.env.VERCEL === "1") {
    return NextResponse.json({ error: "Social links are not configured." }, { status: 503 });
  }

  return NextResponse.json(
    { links: readSocialLinks() },
    { headers: { "Cache-Control": "no-store" } },
  );
}