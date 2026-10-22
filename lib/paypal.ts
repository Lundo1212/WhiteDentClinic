const apiBase =
  process.env.PAYPAL_BASE_URL ||
  process.env.PAYPAL_API_BASE ||
  "https://api-m.sandbox.paypal.com";

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured.");
  }

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== "object" || !("access_token" in result) || typeof result.access_token !== "string") {
    console.error("PayPal access token request failed:", response.status);
    throw new Error("PayPal could not authorize the payment request.");
  }
  return { accessToken: result.access_token, apiBase };
}
