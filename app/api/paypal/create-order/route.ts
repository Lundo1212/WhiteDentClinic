import { NextResponse } from "next/server";
import { getPayPalAccessToken } from "../../../../lib/paypal";
import { supabase } from "../../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const ticketNumber =
      body && typeof body === "object" && "ticketNumber" in body && typeof body.ticketNumber === "string"
        ? body.ticketNumber.trim()
        : "";
    const email =
      body && typeof body === "object" && "email" in body && typeof body.email === "string"
        ? body.email.trim()
        : "";
    const paymentMethod =
      body && typeof body === "object" && "paymentMethod" in body && body.paymentMethod === "card"
        ? "card"
        : "paypal";

    if (!ticketNumber || ticketNumber.length > 64 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid booking number and email address." }, { status: 400 });
    }
    if (!supabase) {
      return NextResponse.json({ error: "Booking payment storage is not configured." }, { status: 503 });
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("ticket_number, customer_email, service_name, deposit_amount, payment_status")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();
    if (error) {
      console.error("PayPal booking lookup failed:", error.message);
      return NextResponse.json({ error: "Unable to verify this booking for payment." }, { status: 500 });
    }
    if (!booking) return NextResponse.json({ error: "Booking not found. Check your booking number." }, { status: 404 });
    if (booking.customer_email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "The booking number or email address does not match our records." }, { status: 404 });
    }
    if (booking.payment_status === "paid") {
      return NextResponse.json({ error: "This booking fee has already been paid." }, { status: 409 });
    }

    const amount = Number(booking.deposit_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      console.error("Invalid booking fee amount for:", booking.ticket_number);
      return NextResponse.json({ error: "This booking has an invalid fee amount." }, { status: 500 });
    }

    const { accessToken, apiBase } = await getPayPalAccessToken();
    const response = await fetch(`${apiBase}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: booking.ticket_number,
          description: `White Dental Clinic appointment booking fee for ${booking.service_name}`,
          amount: { currency_code: "USD", value: amount.toFixed(2) },
        }],
        application_context: {
          brand_name: "White Dental Clinic",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
      cache: "no-store",
    });
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string") {
      console.error("PayPal order creation failed:", response.status);
      return NextResponse.json({ error: "PayPal could not start checkout. Please try again." }, { status: 502 });
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ paypal_order_id: result.id, payment_method: paymentMethod })
      .eq("ticket_number", booking.ticket_number)
      .eq("payment_status", "unpaid");
    if (updateError) {
      console.error("PayPal order could not be linked to booking:", updateError.message);
      return NextResponse.json({ error: "Unable to link checkout to this booking." }, { status: 500 });
    }

    return NextResponse.json({ orderId: result.id });
  } catch (error) {
    console.error("PayPal order creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start secure checkout." },
      { status: 503 },
    );
  }
}
