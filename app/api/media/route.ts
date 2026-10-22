import { NextResponse } from "next/server";
import { getGalleryItems } from "../../../lib/gallery";

export async function GET() {
  const items = await getGalleryItems();

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      title: item.name,
      image: item.image_url,
    })),
  });
}
