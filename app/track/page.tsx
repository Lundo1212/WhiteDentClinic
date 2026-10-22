"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Booking = {
  ticketNumber: string;
  name: string;
  serviceName: string;
  serviceDescription: string;
  servicePrice: number;
  depositAmount: number;
  balanceAmount: number;
  appointmentDate: string;
  appointmentTime: string;
  bookingStatus: string;
  paymentStatus: string;
  paidAt: string | null;
};

function BookingTracker() {
  const searchParams = useSearchParams();
  const ticketNumber = searchParams.get("ticketNumber")?.trim() ?? "";
  const [input, setInput] = useState(ticketNumber);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadBooking = useCallback(async (number: string) => {
    if (!number) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings?ticketNumber=${encodeURIComponent(number)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to find this booking.");
      setBooking(result.booking as Booking);
      setInput(number);
    } catch (cause) {
      setBooking(null);
      setError(cause instanceof Error ? cause.message : "Unable to find this booking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ticketNumber) return;
    const timer = window.setTimeout(() => void loadBooking(ticketNumber), 0);
    return () => window.clearTimeout(timer);
  }, [loadBooking, ticketNumber]);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadBooking(input.trim());
  }

  return (
    <main className="min-h-screen bg-[#f3f6f5] px-4 py-10 text-slate-900 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-teal-800 transition hover:text-[#12343a]">← White Dental Clinic</Link>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Your visit, made simple</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#12343a] sm:text-4xl">Track your booking</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Enter your booking number to check your appointment and payment status. The booking number is included in your booking email.</p>

          <form onSubmit={lookup} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="ticket-number">Booking number</label>
            <input id="ticket-number" required maxLength={64} value={input} onChange={(event) => setInput(event.target.value)} placeholder="WDC-…" className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 outline-none focus:border-teal-700" />
            <button disabled={loading} className="min-h-12 rounded-full bg-[#12343a] px-6 font-bold text-white transition hover:bg-teal-800 disabled:opacity-60">{loading ? "Looking up…" : "Find booking"}</button>
          </form>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {booking && (
            <article className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Booking number</p><h2 className="mt-1 text-xl font-black text-[#12343a]">{booking.ticketNumber}</h2></div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${booking.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{booking.paymentStatus === "paid" ? "Fee paid" : "Fee due"}</span>
              </div>
              <p className="mt-5 font-bold text-slate-900">{booking.name}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{booking.serviceName}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{booking.serviceDescription}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Appointment</dt><dd className="mt-1 font-semibold">{booking.appointmentDate} · {booking.appointmentTime}</dd></div>
                <div><dt className="text-slate-500">Service cost</dt><dd className="mt-1 font-semibold">${booking.servicePrice.toFixed(2)}</dd></div>
                <div><dt className="text-slate-500">30% booking fee</dt><dd className="mt-1 font-semibold">${booking.depositAmount.toFixed(2)}</dd></div>
                <div><dt className="text-slate-500">Remaining balance</dt><dd className="mt-1 font-semibold">${booking.balanceAmount.toFixed(2)}</dd></div>
              </dl>
              {booking.paymentStatus === "paid" ? (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-900">Your booking fee is confirmed.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a href={`/api/bookings/${encodeURIComponent(booking.ticketNumber)}/ticket`} className="inline-flex min-h-11 items-center rounded-full bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900">Download booking ticket</a>
                    <a href={`/api/bookings/${encodeURIComponent(booking.ticketNumber)}/receipt`} className="inline-flex min-h-11 items-center rounded-full border border-emerald-800 px-5 text-sm font-bold text-emerald-900 hover:bg-emerald-100">Download payment receipt</a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-teal-200 bg-white p-4 sm:p-5">
                  <h3 className="font-bold text-[#12343a]">Booking fee pending</h3>
                  <p className="mt-1 text-sm text-slate-600">Your appointment will be confirmed after the 30% booking fee is verified.</p>
                  <Link href={`/pay?ticketNumber=${encodeURIComponent(booking.ticketNumber)}`} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-teal-800 px-5 text-sm font-bold text-white hover:bg-[#12343a]">Verify email and pay ${booking.depositAmount.toFixed(2)}</Link>
                </div>
              )}
            </article>
          )}
        </section>
        <p className="mt-6 text-center text-xs text-slate-500">Questions? Contact White Dental Clinic · 2717 Main Street, Dallas, TX 75226</p>
      </div>
    </main>
  );
}

export default function TrackPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f3f6f5]" />}><BookingTracker /></Suspense>;
}
