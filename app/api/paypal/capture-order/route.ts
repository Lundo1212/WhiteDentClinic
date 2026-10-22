import { NextResponse } from "next/server";
import { sendPaymentConfirmationEmail } from "../../../../lib/email";
import { getPayPalAccessToken } from "../../../../lib/paypal";
import { supabase } from "../../../../lib/supabase";

type PayPalCapture = {
  status?: string;
  amount?: { currency_code?: string; value?: string };
};

type PayPalOrder = {
  status?: string;
  purchase_units?: Array<{
    reference_id?: string;
    payments?: { captures?: PayPalCapture[] };
  }>;
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const orderID =
      body && typeof body === "object" && "orderID" in body && typeof body.orderID === "string"
        ? body.orderID.trim()
        : "";
    const ticketNumber =
      body && typeof body === "object" && "ticketNumber" in body && typeof body.ticketNumber === "string"
        ? body.ticketNumber.trim()
        : "";
    const email =
      body && typeof body === "object" && "email" in body && typeof body.email === "string"
        ? body.email.trim()
        : "";
    if (!orderID || !ticketNumber || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Missing or invalid PayPal booking details." }, { status: 400 });
    }
    if (!supabase) {
      return NextResponse.json({ error: "Booking payment storage is not configured." }, { status: 503 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("ticket_number, customer_name, customer_email, customer_phone, service_name, service_description, service_price, deposit_amount, appointment_date, appointment_time, payment_status, paypal_order_id")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();
    if (bookingError) {
      console.error("PayPal capture booking lookup failed:", bookingError.message);
      return NextResponse.json({ error: "Unable to verify this booking." }, { status: 500 });
    }
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.customer_email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "The booking number or email address does not match our records." }, { status: 404 });
    }
    if (booking.payment_status === "paid") {
      return NextResponse.json({ error: "This booking fee has already been paid." }, { status: 409 });
    }
    if (booking.paypal_order_id !== orderID) {
      return NextResponse.json({ error: "This checkout does not match the selected booking." }, { status: 409 });
    }

    const { accessToken, apiBase } = await getPayPalAccessToken();
    const response = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const result: PayPalOrder = await response.json();
    if (!response.ok) {
      console.error("PayPal capture failed:", response.status);
      return NextResponse.json({ error: "PayPal could not confirm this payment. Please retry or contact the clinic." }, { status: 502 });
    }

    const purchaseUnit = result.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.find((item) => item.status === "COMPLETED");
    const capturedAmount = Number(capture?.amount?.value);
    const expectedAmount = Number(booking.deposit_amount);
    if (
      result.status !== "COMPLETED" ||
      purchaseUnit?.reference_id !== booking.ticket_number ||
      capture?.amount?.currency_code !== "USD" ||
      !Number.isFinite(capturedAmount) ||
      capturedAmount !== expectedAmount
    ) {
      return NextResponse.json({ error: "PayPal did not confirm the expected 30% booking fee." }, { status: 409 });
    }

    const paidAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: "paid", booking_status: "confirmed", paid_at: paidAt })
      .eq("ticket_number", booking.ticket_number)
      .eq("paypal_order_id", orderID)
      .eq("payment_status", "unpaid")
      .select("ticket_number")
      .maybeSingle();
    if (updateError || !updated) {
      console.error("Confirmed PayPal payment could not be recorded:", updateError?.message ?? "Booking already updated.");
      return NextResponse.json({ error: "PayPal received the payment, but the booking status needs clinic assistance." }, { status: 500 });
    }

    let emailSent = true;
    try {
      await sendPaymentConfirmationEmail({
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        ticketNumber: booking.ticket_number,
        service: booking.service_name,
        description: booking.service_description,
        totalCost: Number(booking.service_price),
        depositAmount: expectedAmount,
        date: booking.appointment_date,
        time: booking.appointment_time,
        paymentStatus: "paid",
        paidAt,
      });
    } catch (emailError) {
      emailSent = false;
      console.error("Payment confirmation email failed:", emailError);
    }

    return NextResponse.json({
      ok: true,
      ticketNumber: booking.ticket_number,
      status: "COMPLETED",
      emailSent,
      message: emailSent
        ? "Payment confirmed. Your booking ticket and receipt have been emailed."
        : "Payment confirmed. Your booking ticket and receipt are available to download, but the confirmation email could not be delivered.",
    });
  } catch (error) {
    console.error("PayPal capture failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to confirm payment." },
      { status: 503 },
    );
  }
}
