import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import { supabase } from "../../../../../lib/supabase";

const GALLERY_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "gallery-media";
const ALLOWED_MEDIA_TYPES = ["image/*", "video/*"];

function isAuthorized(request: Request) {
  return isAdminRequest(request);
}

async function ensurePublicGalleryBucket() {
  if (!supabase) throw new Error("Supabase is not configured.");

  const storage = supabase.storage;
  const { data: buckets, error: listError } = await storage.listBuckets();
  if (listError) throw listError;

  let bucket = buckets.find((entry) => entry.name === GALLERY_BUCKET);
  if (!bucket) {
    const { error: createError } = await storage.createBucket(GALLERY_BUCKET, {
      public: true,
      allowedMimeTypes: ALLOWED_MEDIA_TYPES,
    });

    if (createError) {
      const { data: refreshedBuckets, error: refreshError } = await storage.listBuckets();
      if (refreshError) throw refreshError;
      bucket = refreshedBuckets.find((entry) => entry.name === GALLERY_BUCKET);
      if (!bucket) throw createError;
    } else {
      return;
    }
  }

  const hasRestrictiveMimeTypes =
    bucket.allowed_mime_types?.length &&
    !ALLOWED_MEDIA_TYPES.every((allowedType) => bucket.allowed_mime_types?.includes(allowedType));
  if (!bucket.public || hasRestrictiveMimeTypes) {
    const { error: updateError } = await storage.updateBucket(GALLERY_BUCKET, {
      public: true,
      allowedMimeTypes: ALLOWED_MEDIA_TYPES,
    });
    if (updateError) throw updateError;
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    if (process.env.VERCEL !== "1") {
      return NextResponse.json({ localFallback: true });
    }
    return NextResponse.json(
      { error: "Supabase Storage is not configured. Set the Supabase URL and server-side service role key." },
      { status: 503 },
    );
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    }

    const { fileName, contentType } = body as Record<string, unknown>;
    if (
      typeof fileName !== "string" ||
      fileName.length > 255 ||
      typeof contentType !== "string" ||
      !/^(image|video)\/[a-zA-Z0-9.+-]+$/.test(contentType)
    ) {
      return NextResponse.json(
        { error: "Choose a valid image or video file." },
        { status: 400 },
      );
    }

    await ensurePublicGalleryBucket();

    const extension = fileName.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1]?.toLowerCase();
    const objectPath = extension ? `${randomUUID()}.${extension}` : randomUUID();
    const { data, error } = await supabase.storage
      .from(GALLERY_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error) throw error;

    return NextResponse.json({
      bucket: GALLERY_BUCKET,
      path: data.path,
      token: data.token,
    });
  } catch (error) {
    console.error("Gallery upload authorization failed:", error);
    return NextResponse.json(
      { error: "Unable to prepare Supabase Storage for this upload. Check the server-side Supabase service role key and Storage settings." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });
  }

  try {
    const body: unknown = await request.json();
    const objectPath =
      body && typeof body === "object" && "path" in body && typeof body.path === "string"
        ? body.path
        : "";
    if (!/^[a-f0-9-]{36}(?:\.[a-zA-Z0-9]{1,10})?$/.test(objectPath)) {
      return NextResponse.json({ error: "Invalid uploaded media path." }, { status: 400 });
    }

    const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([objectPath]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Temporary gallery upload cleanup failed:", error);
    return NextResponse.json({ error: "Unable to remove the temporary gallery upload." }, { status: 500 });
  }
}
