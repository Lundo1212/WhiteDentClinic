import { NextResponse } from "next/server";
import { createBookingDocument } from "../../../../../lib/booking-documents";
import { supabase } from "../../../../../lib/supabase";

export async function GET(_request: Request, context: RouteContext<"/api/bookings/[ticketNumber]/receipt">) {
  const { ticketNumber } = await context.params;
  if (!supabase) {
    return NextResponse.json({ error: "Booking storage is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("ticket_number, customer_name, customer_email, customer_phone, service_name, service_description, service_price, deposit_amount, appointment_date, appointment_time, payment_status, paid_at")
    .eq("ticket_number", ticketNumber)
    .eq("payment_status", "paid")
    .maybeSingle();
  if (error) {
    console.error("Payment receipt lookup failed:", error.message);
    return NextResponse.json({ error: "Unable to load this payment receipt." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "A receipt is available after payment is confirmed." }, { status: 404 });

  const html = createBookingDocument({
    name: data.customer_name,
    email: data.customer_email,
    phone: data.customer_phone,
    ticketNumber: data.ticket_number,
    service: data.service_name,
    description: data.service_description,
    totalCost: Number(data.service_price),
    depositAmount: Number(data.deposit_amount),
    date: data.appointment_date,
    time: data.appointment_time,
    paymentStatus: data.payment_status,
    paidAt: data.paid_at,
  }, "receipt");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="White-Dental-Clinic-receipt-${data.ticket_number}.html"`,
      "Cache-Control": "private, no-store",
    },
  });
}
