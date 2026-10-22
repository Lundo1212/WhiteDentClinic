import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { sendBookingConfirmationEmail } from "../../../lib/email";
import { getGalleryItems } from "../../../lib/gallery";
import { supabase } from "../../../lib/supabase";

const appointmentTimes = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export async function GET(request: Request) {
  const ticketNumber = new URL(request.url).searchParams.get("ticketNumber")?.trim();

  if (!ticketNumber || ticketNumber.length > 64) {
    return NextResponse.json({ error: "Enter a valid ticket number." }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Booking service is not configured." },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("ticket_number, customer_name, service_name, service_description, service_price, deposit_amount, balance_amount, appointment_date, appointment_time, booking_status, payment_status, paid_at")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (error) {
      console.error("Booking lookup failed:", error.message);
      return NextResponse.json(
        { error: "We could not look up this ticket. Please try again." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Ticket not found. Check the number and try again." },
        { status: 404 },
      );
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
        paidAt: data.paid_at,
      },
    });
  } catch (error) {
    console.error("Booking lookup exception:", error);
    return NextResponse.json(
      { error: "We could not look up this ticket. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Booking service is not configured." },
        { status: 500 },
      );
    }

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const serviceId = typeof body.serviceId === "string" || typeof body.serviceId === "number"
      ? String(body.serviceId)
      : "";
    const date = typeof body.date === "string" ? body.date : "";
    const time = typeof body.time === "string" ? body.time : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (
      !name ||
      name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !phone ||
      phone.length > 40 ||
      !serviceId ||
      serviceId.length > 64 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !appointmentTimes.includes(time) ||
      notes.length > 2000
    ) {
      return NextResponse.json(
        { error: "Please check your booking details and try again." },
        { status: 400 },
      );
    }

    const appointmentDate = new Date(`${date}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (
      Number.isNaN(appointmentDate.getTime()) ||
      appointmentDate.toISOString().slice(0, 10) !== date ||
      appointmentDate < today
    ) {
      return NextResponse.json(
        { error: "Please choose a valid future appointment date." },
        { status: 400 },
      );
    }

    const galleryService = (await getGalleryItems()).find(
      (item) => String(item.id) === serviceId,
    );
    const servicePrice = galleryService?.price ?? NaN;

    if (!galleryService || !Number.isFinite(servicePrice) || servicePrice <= 0) {
      return NextResponse.json(
        { error: "Choose an available dental service from the current service list." },
        { status: 400 },
      );
    }

    const depositAmount = Math.round(servicePrice * 30) / 100;
    const balanceAmount = servicePrice - depositAmount;
    const generatedTicketNumber = `WDC-${date.replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        service_name: galleryService.name,
        service_description: galleryService.description,
        service_price: servicePrice,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        appointment_date: date,
        appointment_time: time,
        payment_method: "paypal",
        booking_notes: notes || null,
        ticket_number: generatedTicketNumber,
        booking_status: "pending",
        payment_status: "unpaid",
      })
      .select("id, ticket_number")
      .single();

    if (error) {
      console.error("Booking insert failed:", error.message);
      return NextResponse.json(
        { error: "We could not save your request. Please try again." },
        { status: 500 },
      );
    }

    let emailSent = true;
    try {
      await sendBookingConfirmationEmail({
        name,
        email,
        phone,
        ticketNumber: data?.ticket_number ?? generatedTicketNumber,
        service: galleryService.name,
        description: galleryService.description,
        totalCost: servicePrice,
        depositAmount,
        date,
        time,
        paymentStatus: "unpaid",
      });
    } catch (emailError) {
      emailSent = false;
      console.error("Booking confirmation email failed:", emailError);
    }

    return NextResponse.json(
      {
        message: emailSent
          ? "Your booking is pending payment. Check your email for the booking number and secure payment link."
          : "Your booking is saved, but its email could not be delivered. You can continue to payment now; please check your spam folder and contact the clinic if the email is still missing.",
        emailSent,
        ticketNumber: data?.ticket_number ?? generatedTicketNumber,
        bookingId: data?.id ?? null,
        bookingStatus: "pending",
        paymentStatus: "unpaid",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 },
    );
  }
}
