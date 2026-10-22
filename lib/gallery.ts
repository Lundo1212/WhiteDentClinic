import { readFileSync } from "node:fs";
import path from "node:path";
import { supabase } from "./supabase";

type MediaRecord = {
  id: number | string;
  title?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  price?: number | string | null;
  duration?: string | null;
  media_type?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  image?: string | null;
};

export type GalleryItem = {
  id: number | string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  media_type: string;
  image_url: string;
  video_url: string;
};

function readLocalGalleryItems(): MediaRecord[] {
  try {
    const dataPath = path.join(process.cwd(), "data", "gallery-items.json");
    const parsed: unknown = JSON.parse(readFileSync(dataPath, "utf8"));
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is MediaRecord => Boolean(item) && typeof item === "object",
        )
      : [];
  } catch {
    return [];
  }
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  let databaseItems: MediaRecord[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("gallery_items")
      .select("id, title, category, description, price, duration, media_type, image_url, video_url")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gallery fetch failed:", error);
    } else {
      databaseItems = data ?? [];
    }
  }

  const seenMediaUrls = new Set<string>();

  return [...databaseItems, ...readLocalGalleryItems()]
    .filter((item) => {
      if (!item.image_url && !item.video_url && !item.image) return false;

      const urls = [item.image_url, item.video_url, item.image].filter(
        (url): url is string => typeof url === "string" && Boolean(url),
      );
      if (urls.some((url) => seenMediaUrls.has(url))) return false;
      urls.forEach((url) => seenMediaUrls.add(url));
      return true;
    })
    .map((item) => ({
      id: item.id,
      name: item.title ?? item.name ?? "",
      category: item.category ?? "Custom",
      description: item.description ?? "Personalized dental care from the White Dental Clinic team.",
      price: Number(item.price ?? 0),
      duration: item.duration ?? "Custom session",
      media_type: item.media_type ?? (item.video_url ? "video" : "image"),
      image_url: item.image_url ?? item.image ?? "",
      video_url: item.video_url ?? "",
    }));
}
