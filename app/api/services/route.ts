import { NextResponse } from "next/server";
import { getGalleryItems } from "../../../lib/gallery";

export async function GET() {
  const items = await getGalleryItems();

  return NextResponse.json(
    {
      services: items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        cost: item.price,
        bookingFee: Math.round(item.price * 30) / 100,
        duration: item.duration,
        imageUrl: item.image_url,
        videoUrl: item.video_url,
        mediaType: item.media_type,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
