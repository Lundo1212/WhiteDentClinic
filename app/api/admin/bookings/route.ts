import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import { getGalleryItems } from "../../../../lib/gallery";
import { supabase } from "../../../../lib/supabase";

const appointmentTimes = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Booking update service is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const bookingId = Number(body.bookingId);
    const status = typeof body.status === "string" ? body.status.trim() : "";

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
    }

    if (!["pending", "confirmed", "attended"].includes(status)) {
      return NextResponse.json({ error: "Invalid booking status." }, { status: 400 });
    }

    if (status !== "pending") {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("payment_status")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingError || !booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }
      if (booking.payment_status !== "paid") {
        return NextResponse.json(
          { error: "A booking must have its 30% appointment fee paid before it can be confirmed or archived." },
          { status: 409 },
        );
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ booking_status: status })
      .eq("id", bookingId)
      .select("id, booking_status")
      .single();

    if (error || !data) {
      console.error("Booking status update failed:", error);
      return NextResponse.json(
        { error: "Unable to update booking status." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      removed: false,
      booking: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid update request." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Booking update service is not configured." }, { status: 503 });
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid booking update." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const bookingId = Number(input.bookingId);
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim() : "";
    const phone = typeof input.phone === "string" ? input.phone.trim() : "";
    const date = typeof input.date === "string" ? input.date : "";
    const time = typeof input.time === "string" ? input.time : "";
    const notes = typeof input.notes === "string" ? input.notes.trim() : "";
    const serviceId = typeof input.serviceId === "string" ? input.serviceId.trim() : "";

    if (
      !Number.isSafeInteger(bookingId) ||
      bookingId <= 0 ||
      !name ||
      name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !phone ||
      phone.length > 40 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !appointmentTimes.includes(time) ||
      notes.length > 2000
    ) {
      return NextResponse.json({ error: "Please check the booking details and try again." }, { status: 400 });
    }

    const appointmentDate = new Date(`${date}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (
      Number.isNaN(appointmentDate.getTime()) ||
      appointmentDate.toISOString().slice(0, 10) !== date ||
      appointmentDate < today
    ) {
      return NextResponse.json({ error: "Choose a valid future appointment date." }, { status: 400 });
    }

    const updates: Record<string, string | number | null> = {
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      appointment_date: date,
      appointment_time: time,
      booking_notes: notes || null,
    };

    if (serviceId) {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("payment_status, paypal_order_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (bookingError) {
        console.error("Booking service update lookup failed:", bookingError.message);
        return NextResponse.json({ error: "Unable to verify this booking for a service change." }, { status: 500 });
      }
      if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      if (booking.payment_status === "paid" || booking.paypal_order_id) {
        return NextResponse.json(
          { error: "The service cannot be changed after payment or checkout has started." },
          { status: 409 },
        );
      }

      const service = (await getGalleryItems()).find((item) => String(item.id) === serviceId);
      if (!service || !Number.isFinite(service.price) || service.price <= 0) {
        return NextResponse.json({ error: "Choose a current clinic service." }, { status: 400 });
      }
      const depositAmount = Math.round(service.price * 30) / 100;
      updates.service_name = service.name;
      updates.service_description = service.description;
      updates.service_price = service.price;
      updates.deposit_amount = depositAmount;
      updates.balance_amount = service.price - depositAmount;
    }

    let updateQuery = supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId);
    if (serviceId) {
      updateQuery = updateQuery.eq("payment_status", "unpaid").is("paypal_order_id", null);
    }
    const { data, error } = await updateQuery
      .select("id, customer_name, customer_email, customer_phone, service_name, service_description, service_price, deposit_amount, balance_amount, booking_notes, appointment_date, appointment_time, payment_status, booking_status, ticket_number, paypal_order_id, created_at")
      .maybeSingle();

    if (error) {
      console.error("Booking details update failed:", error.message);
      return NextResponse.json({ error: "Unable to save booking changes." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: serviceId ? "The booking changed or checkout started. Refresh and try again." : "Booking not found." },
        { status: serviceId ? 409 : 404 },
      );
    }

    return NextResponse.json({ ok: true, booking: data });
  } catch (error) {
    console.error("Booking details update failed:", error);
    return NextResponse.json({ error: "Invalid booking update." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Booking storage is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid booking delete request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid booking delete request." }, { status: 400 });
  }
  const bookingId = Number((body as Record<string, unknown>).bookingId);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .eq("payment_status", "unpaid")
    .is("paypal_order_id", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Unpaid booking deletion failed:", error.message);
    return NextResponse.json({ error: "Unable to delete this booking." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Only unpaid bookings with no active checkout can be deleted. Keep paid bookings as history." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
