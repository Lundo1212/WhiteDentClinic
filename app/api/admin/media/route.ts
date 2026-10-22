import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import { supabase } from "../../../../lib/supabase";

const GALLERY_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "gallery-media";

type GalleryItem = {
  id: number | string;
  title: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  media_type: string;
  image_url: string | null;
  video_url: string | null;
  created_at?: string;
};

function readLocalGalleryItems(): GalleryItem[] {
  try {
    const dataPath = path.join(process.cwd(), "data", "gallery-items.json");
    const raw = readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalGalleryItems(items: GalleryItem[]) {
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path.join(dataDir, "gallery-items.json"), JSON.stringify(items, null, 2));
}

const READ_ONLY_STORAGE_ERROR =
  "This gallery item is stored in local files, which cannot be changed on this deployment. Re-add it using the database-backed gallery.";

function isAuthorized(request: Request) {
  return isAdminRequest(request);
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value !== "string");
}

function removeUploadedFile(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/")) return;

  const uploadsDirectory = path.resolve(process.cwd(), "public", "uploads");
  const filePath = path.resolve(uploadsDirectory, path.basename(url));
  if (path.dirname(filePath) === uploadsDirectory && existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

function getStoredMediaPath(url: string | null | undefined) {
  if (!url || !supabase) return null;

  try {
    const parsedUrl = new URL(url);
    const bucketUrl = new URL(
      supabase.storage.from(GALLERY_BUCKET).getPublicUrl("").data.publicUrl,
    );
    const objectPrefix = bucketUrl.pathname.endsWith("/")
      ? bucketUrl.pathname
      : `${bucketUrl.pathname}/`;
    if (parsedUrl.origin !== bucketUrl.origin || !parsedUrl.pathname.startsWith(objectPrefix)) return null;

    const objectPath = decodeURIComponent(parsedUrl.pathname.slice(objectPrefix.length));
    return objectPath && !objectPath.split("/").some((segment) => segment === "." || segment === "..")
      ? objectPath
      : null;
  } catch {
    return null;
  }
}

async function removeStoredMedia(url: string | null | undefined) {
  if (url?.startsWith("/uploads/")) {
    removeUploadedFile(url);
    return;
  }

  const objectPath = getStoredMediaPath(url);
  if (!objectPath || !supabase) return;

  const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([objectPath]);
  if (error) console.error("Gallery storage cleanup failed:", error);
}

async function readMediaFields(formData: FormData, previous?: GalleryItem) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "Custom").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const duration = String(formData.get("duration") ?? "Custom session").trim();
  let mediaType = String(formData.get("media_type") ?? "image").trim();
  let imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  let videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const uploadedFile = formData.get("file");

  if (previous && !formData.has("image_url")) imageUrl = previous.image_url;
  if (previous && !formData.has("video_url")) videoUrl = previous.video_url;

  let uploadedUrl: string | null = null;
  if (uploadedFile && typeof uploadedFile !== "string") {
    const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const uniqueName = `${Date.now()}-${safeName}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(path.join(uploadDir, uniqueName), Buffer.from(await uploadedFile.arrayBuffer()));

    uploadedUrl = `/uploads/${uniqueName}`;
    if (uploadedFile.type.startsWith("video/")) {
      mediaType = "video";
      videoUrl = uploadedUrl;
      imageUrl = null;
    } else {
      mediaType = "image";
      imageUrl = uploadedUrl;
      videoUrl = null;
    }
  }

  if (mediaType === "video") {
    if (!videoUrl && imageUrl) videoUrl = imageUrl;
    imageUrl = null;
  } else {
    if (!imageUrl && videoUrl) imageUrl = videoUrl;
    videoUrl = null;
  }

  if (!title || !description || Number.isNaN(price) || price < 0) {
    if (uploadedUrl) removeUploadedFile(uploadedUrl);
    throw new Error("Please provide the media title, description, and a valid price.");
  }
  if (!imageUrl && !videoUrl) {
    if (uploadedUrl) removeUploadedFile(uploadedUrl);
    throw new Error("Please upload a media file or provide an image/video URL.");
  }

  return {
    fields: {
      title,
      category: category || "Custom",
      description,
      price,
      duration: duration || "Custom session",
      media_type: mediaType || "image",
      image_url: imageUrl,
      video_url: videoUrl,
    },
    uploadedUrl,
  };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    if (process.env.VERCEL === "1" && !supabase) {
      return NextResponse.json(
        { error: "Persistent gallery storage is not configured. Set the Supabase URL, gallery_items table, and server-side service role key." },
        { status: 503 },
      );
    }

    const { fields } = await readMediaFields(formData);
    if (supabase) {
      const { data, error } = await supabase
        .from("gallery_items")
        .insert(fields)
        .select("id, title, category, description, price, duration, media_type, image_url, video_url, created_at")
        .single();

      if (data) return NextResponse.json({ ok: true, item: { ...data, source: "database" } });
      if (error) console.error("Gallery insert failed:", error);
      if (process.env.VERCEL === "1") {
        return NextResponse.json(
          { error: "Unable to save this gallery item to the database. Check the Supabase gallery_items table and try again." },
          { status: 500 },
        );
      }
    }

    const itemRecord: GalleryItem = {
      id: Date.now(),
      ...fields,
      created_at: new Date().toISOString(),
    };
    const localItems = readLocalGalleryItems();
    saveLocalGalleryItems([itemRecord, ...localItems]);
    return NextResponse.json({ ok: true, item: { ...itemRecord, source: "local" } });
  } catch (error) {
    console.error("Invalid media submission:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid media submission." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uploadedUrl: string | null = null;
  const database = supabase;
  try {
    const formData = await request.formData();
    const id = String(formData.get("id") ?? "");
    const source = String(formData.get("source") ?? "local");
    if (!id) return NextResponse.json({ error: "Media item ID is required." }, { status: 400 });
    if (source !== "local" && source !== "database") {
      return NextResponse.json({ error: "Invalid media storage source." }, { status: 400 });
    }
    if (process.env.VERCEL === "1" && source === "local") {
      return NextResponse.json({ error: READ_ONLY_STORAGE_ERROR }, { status: 503 });
    }
    if (process.env.VERCEL === "1" && isUploadedFile(formData.get("file"))) {
      return NextResponse.json({ error: READ_ONLY_STORAGE_ERROR }, { status: 503 });
    }

    let previous: GalleryItem | undefined;
    if (source === "local") {
      previous = readLocalGalleryItems().find((item) => String(item.id) === id);
      if (!previous) return NextResponse.json({ error: "Media item not found." }, { status: 404 });
    } else if (source === "database") {
      if (!database) return NextResponse.json({ error: "Database storage is unavailable." }, { status: 503 });
      const { data, error } = await database
        .from("gallery_items")
        .select("id, title, category, description, price, duration, media_type, image_url, video_url, created_at")
        .eq("id", id)
        .single();
      if (error || !data) return NextResponse.json({ error: "Media item not found." }, { status: 404 });
      previous = data as GalleryItem;
    }

    const existing = previous;
    if (!existing) return NextResponse.json({ error: "Media item not found." }, { status: 404 });

    const { fields, uploadedUrl: newUpload } = await readMediaFields(formData, existing);
    uploadedUrl = newUpload;

    if (source === "database") {
      const { data, error } = await database!
        .from("gallery_items")
        .update(fields)
        .eq("id", id)
        .select("id, title, category, description, price, duration, media_type, image_url, video_url, created_at")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Unable to update media item.");
      removeLocalDuplicates([existing.image_url, existing.video_url]);
      if (existing.image_url !== fields.image_url) await removeStoredMedia(existing.image_url);
      if (existing.video_url !== fields.video_url) await removeStoredMedia(existing.video_url);
      return NextResponse.json({ ok: true, item: { ...data, source: "database" } });
    }

    const localItems = readLocalGalleryItems();
    const updatedItem: GalleryItem = { ...existing, ...fields };
    saveLocalGalleryItems(localItems.map((item) => String(item.id) === id ? updatedItem : item));
    if (existing.image_url !== fields.image_url) removeUploadedFile(existing.image_url);
    if (existing.video_url !== fields.video_url) removeUploadedFile(existing.video_url);
    return NextResponse.json({ ok: true, item: { ...updatedItem, source: "local" } });
  } catch (error) {
    if (uploadedUrl) removeUploadedFile(uploadedUrl);
    console.error("Media update failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update media item." },
      { status: 400 },
    );
  }
}

function removeLocalDuplicates(urls: Array<string | null | undefined>) {
  const knownUrls = new Set(urls.filter((url): url is string => Boolean(url)));
  if (knownUrls.size === 0) return;
  if (process.env.VERCEL === "1") return;

  const localItems = readLocalGalleryItems();
  const remainingItems = localItems.filter(
    (item) => ![item.image_url, item.video_url].some((url) => url && knownUrls.has(url)),
  );
  if (remainingItems.length !== localItems.length) saveLocalGalleryItems(remainingItems);
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: rawId, source: rawSource } = await request.json();
    const id = String(rawId ?? "");
    const source = String(rawSource ?? "local");
    if (!id) return NextResponse.json({ error: "Media item ID is required." }, { status: 400 });
    if (process.env.VERCEL === "1" && source === "local") {
      return NextResponse.json({ error: READ_ONLY_STORAGE_ERROR }, { status: 503 });
    }

    if (source === "database") {
      if (!supabase) return NextResponse.json({ error: "Database storage is unavailable." }, { status: 503 });
      const { data, error } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", id)
        .select("image_url, video_url")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Unable to delete media item.");
      await removeStoredMedia(data.image_url);
      await removeStoredMedia(data.video_url);
    } else {
      const localItems = readLocalGalleryItems();
      const item = localItems.find((entry) => String(entry.id) === id);
      if (!item) return NextResponse.json({ error: "Media item not found." }, { status: 404 });
      saveLocalGalleryItems(localItems.filter((entry) => String(entry.id) !== id));
      removeUploadedFile(item.image_url);
      removeUploadedFile(item.video_url);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Media deletion failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete media item." },
      { status: 400 },
    );
  }
}
