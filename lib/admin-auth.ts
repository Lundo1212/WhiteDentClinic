import { timingSafeEqual } from "node:crypto";

export function isValidAdminAccessKey(token: string) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return false;

  const tokenBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  if (tokenBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(tokenBytes, expectedBytes);
}

export function isAdminRequest(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return Boolean(token && isValidAdminAccessKey(token));
}
