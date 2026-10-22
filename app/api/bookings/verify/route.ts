import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your booking number and email address." }, { status: 400 });
  }

  const ticketNumber =
    body && typeof body === "object" && "ticketNumber" in body && typeof body.ticketNumber === "string"
      ? body.ticketNumber.trim()
      : "";
  const email =
    body && typeof body === "object" && "email" in body && typeof body.email === "string"
      ? body.email.trim()
      : "";

  if (!ticketNumber || ticketNumber.length > 64 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid booking number and email address." }, { status: 400 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Booking service is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("ticket_number, customer_name, customer_email, service_name, service_description, service_price, deposit_amount, balance_amount, appointment_date, appointment_time, booking_status, payment_status")
    .eq("ticket_number", ticketNumber)
    .maybeSingle();

  if (error) {
    console.error("Booking email verification failed:", error.message);
    return NextResponse.json({ error: "We could not verify this booking. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "The booking number or email address does not match our records." }, { status: 404 });
  }

  if (data.customer_email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "The booking number or email address does not match our records." }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      ticketNumber: data.ticket_number,
      name: data.customer_name,
      serviceName: data.service_name,
      serviceDescription: data.service_description,
      servicePrice: Number(data.service_price),
      depositAmount: Number(data.deposit_amount),
      balanceAmount: Number(data.balance_amount),
      appointmentDate: data.appointment_date,
      appointmentTime: data.appointment_time,
      bookingStatus: data.booking_status,
      paymentStatus: data.payment_status,
    },
  });
}
