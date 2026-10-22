"use client";

import { useEffect, useState } from "react";

type PayPalCaptureData = { orderID: string };
type PayPalButtonOptions = {
  fundingSource: string;
  style: { layout: "horizontal"; shape: "pill"; label: "pay" };
  createOrder: () => Promise<string>;
  onApprove: (data: PayPalCaptureData) => Promise<void>;
  onError: (error: unknown) => void;
};
type PayPalNamespace = {
  FUNDING: { PAYPAL: string; CARD: string };
  Buttons: (options: PayPalButtonOptions) => {
    isEligible: () => boolean;
    render: (target: HTMLElement) => Promise<void>;
  };
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

export function PayPalCheckout({
  ticketNumber,
  email,
  onPaid,
}: {
  ticketNumber: string;
  email: string;
  onPaid: (message: string) => void;
}) {
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !ticketNumber || !email) return;
    let cancelled = false;

    async function setupButtons(paypal: PayPalNamespace) {
      const renderButton = (fundingSource: string, selector: string, paymentMethod: "paypal" | "card") => {
        const target = document.querySelector<HTMLElement>(selector);
        if (!target) return;
        const button = paypal.Buttons({
          fundingSource,
          style: { layout: "horizontal", shape: "pill", label: "pay" },
          createOrder: async () => {
            const response = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ticketNumber, email, paymentMethod }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? "Unable to start checkout.");
            if (typeof result.orderId !== "string") throw new Error("PayPal returned an invalid checkout.");
            return result.orderId;
          },
          onApprove: async (data) => {
            const response = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderID: data.orderID, ticketNumber, email }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? "Payment confirmation failed.");
            onPaid(result.message ?? "Payment confirmed.");
          },
          onError: (cause) => {
            console.error("PayPal checkout failed:", cause);
            setError(cause instanceof Error ? cause.message : "PayPal checkout failed. Please try again.");
          },
        });
        if (button.isEligible()) void button.render(target);
      };

      renderButton(paypal.FUNDING.PAYPAL, "#paypal-wallet-button", "paypal");
      renderButton(paypal.FUNDING.CARD, "#paypal-card-button", "card");
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-white-dental-paypal]");
    if (window.paypal) {
      void setupButtons(window.paypal);
    } else if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (!cancelled && window.paypal) void setupButtons(window.paypal);
      }, { once: true });
    } else {
      const script = document.createElement("script");
      script.dataset.whiteDentalPaypal = "true";
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons&enable-funding=card`;
      script.async = true;
      script.onload = () => {
        if (!cancelled && window.paypal) void setupButtons(window.paypal);
        else if (!window.paypal) setError("PayPal checkout did not load. Please refresh and try again.");
      };
      script.onerror = () => setError("PayPal checkout is unavailable. Please try again later.");
      document.body.appendChild(script);
    }
    return () => { cancelled = true; };
  }, [clientId, email, onPaid, ticketNumber]);

  if (!clientId) {
    return <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      Secure checkout is not configured yet. The clinic needs to set its PayPal client ID and secret before payments can be accepted.
    </p>;
  }

  return (
    <div className="mt-6 space-y-3">
      <div id="paypal-wallet-button" />
      <div id="paypal-card-button" />
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <p className="text-xs leading-5 text-slate-500">PayPal or eligible debit and credit cards are processed securely by PayPal.</p>
    </div>
  );
}
