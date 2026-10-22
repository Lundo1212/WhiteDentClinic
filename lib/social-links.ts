import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const socialPlatforms = [
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
  "X",
  "WhatsApp",
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

const socialLinksPath = () => path.join(process.cwd(), "data", "social-links.json");

export function readSocialLinks(): SocialLinks {
  try {
    const parsed: unknown = JSON.parse(readFileSync(socialLinksPath(), "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      socialPlatforms.flatMap((platform) => {
        const value = (parsed as Record<string, unknown>)[platform];
        if (typeof value !== "string") return [];
        try {
          const url = new URL(value);
          return url.protocol === "https:" ? [[platform, url.toString()]] : [];
        } catch {
          return [];
        }
      }),
    );
  } catch {
    return {};
  }
}

export function saveSocialLinks(links: SocialLinks) {
  const dataDirectory = path.dirname(socialLinksPath());
  mkdirSync(dataDirectory, { recursive: true });
  writeFileSync(socialLinksPath(), JSON.stringify(links, null, 2));
}

export function parseSocialLinks(value: unknown): SocialLinks | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !socialPlatforms.includes(key as SocialPlatform))) return null;

  const links: SocialLinks = {};
  for (const platform of socialPlatforms) {
    const rawUrl = input[platform];
    if (rawUrl === undefined || rawUrl === "") continue;
    if (typeof rawUrl !== "string" || rawUrl.length > 500) return null;

    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
      links[platform] = url.toString();
    } catch {
      return null;
    }
  }

  return links;
}

export function validateSocialLinks(value: unknown): SocialLinks | null {
  return parseSocialLinks(value);
}