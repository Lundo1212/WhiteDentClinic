"use client";

import { Suspense, useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PayPalCheckout } from "../../components/paypal-checkout";

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
};

const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

function PaymentPage() {
  const searchParams = useSearchParams();
  const emailDeliveryFailed = searchParams.get("emailStatus") === "failed";
  const [ticketNumber, setTicketNumber] = useState(searchParams.get("ticketNumber")?.trim() ?? "");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  async function verifyBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVerifying(true);
    setError("");
    setNotice("");
    setBooking(null);
    try {
      const response = await fetch("/api/bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber: ticketNumber.trim(), email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We could not verify your booking.");
      setBooking(result.booking as Booking);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not verify your booking. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  const handlePaymentConfirmed = useCallback((message: string) => {
    setBooking((current) => current ? { ...current, paymentStatus: "paid", bookingStatus: "confirmed" } : current);
    setNotice(message);
  }, []);

  return (
    <main className="min-h-screen bg-[#f3f6f5] px-4 py-10 text-slate-900 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-teal-800 transition hover:text-[#12343a]">← White Dental Clinic</Link>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Secure checkout</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#12343a] sm:text-4xl">Pay your booking fee</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter the booking number and the email address used when booking. We verify both before showing your appointment details or opening checkout.
          </p>
          {emailDeliveryFailed && (
            <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Your booking was saved, but we could not send the email. Please check your spam folder; you can continue payment here and contact the clinic if you need help.
            </p>
          )}

          <form onSubmit={verifyBooking} className="mt-6 space-y-5">
            <label className="block text-sm font-semibold text-slate-700">Booking number
              <input required maxLength={64} autoComplete="off" value={ticketNumber} onChange={(event) => setTicketNumber(event.target.value)} placeholder="WDC-…" className={fieldClass} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Email address used for booking
              <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={fieldClass} />
            </label>
            <button disabled={isVerifying} className="min-h-12 w-full rounded-full bg-[#12343a] px-6 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
              {isVerifying ? "Verifying booking…" : "Verify booking"}
            </button>
          </form>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">{notice}</p>}

          {booking && (
            <article className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Booking {booking.ticketNumber}</p>
              <h2 className="mt-2 text-xl font-black text-[#12343a]">Hello, {booking.name}</h2>
              <p className="mt-2 font-semibold text-slate-800">{booking.serviceName}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{booking.serviceDescription}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Appointment</dt><dd className="mt-1 font-semibold">{booking.appointmentDate} · {booking.appointmentTime}</dd></div>
                <div><dt className="text-slate-500">Service cost</dt><dd className="mt-1 font-semibold">${booking.servicePrice.toFixed(2)}</dd></div>
                <div><dt className="text-slate-500">Booking fee (30%)</dt><dd className="mt-1 font-semibold">${booking.depositAmount.toFixed(2)}</dd></div>
                <div><dt className="text-slate-500">Balance due at visit</dt><dd className="mt-1 font-semibold">${booking.balanceAmount.toFixed(2)}</dd></div>
              </dl>
              {booking.paymentStatus === "paid" ? (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-900">Payment confirmed. Your booking is confirmed and your ticket is ready.</p>
                  <a href={`/api/bookings/${encodeURIComponent(booking.ticketNumber)}/ticket`} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900">Download booking ticket</a>
                  <a href={`/api/bookings/${encodeURIComponent(booking.ticketNumber)}/receipt`} className="ml-3 mt-3 inline-flex min-h-11 items-center rounded-full border border-emerald-800 px-5 text-sm font-bold text-emerald-900 hover:bg-emerald-100">Download receipt</a>
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-xl border border-teal-200 bg-white p-4 sm:p-5">
                    <h3 className="font-bold text-[#12343a]">Why pay the booking fee?</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      The 30% fee reserves your requested appointment time and helps the clinic prepare the right team and service for your visit. It is credited toward your service cost; the remaining balance is due at the clinic. Once PayPal confirms the payment, we confirm your booking and issue your downloadable ticket.
                    </p>
                  </div>
                  <p className="mt-6 text-sm font-semibold text-slate-800">Pay ${booking.depositAmount.toFixed(2)} securely</p>
                  <PayPalCheckout ticketNumber={booking.ticketNumber} email={email.trim()} onPaid={handlePaymentConfirmed} />
                </>
              )}
              <p className="mt-5 text-sm text-slate-600">
                <Link href={`/track?ticketNumber=${encodeURIComponent(booking.ticketNumber)}`} className="font-bold text-teal-800 underline">Track booking status</Link>
              </p>
            </article>
          )}
        </section>
        <p className="mt-6 text-center text-xs text-slate-500">Questions? Contact White Dental Clinic · 2717 Main Street, Dallas, TX 75226</p>
      </div>
    </main>
  );
}

export default function PayPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f3f6f5]" />}><PaymentPage /></Suspense>;
}
