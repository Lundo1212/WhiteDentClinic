import type { MetadataRoute } from "next";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/", siteUrl).toString(),
    },
    {
      url: new URL("/book", siteUrl).toString(),
    },
    {
      url: new URL("/track", siteUrl).toString(),
    },
  ];
}