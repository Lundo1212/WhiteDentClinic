"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type ClinicService = {
  id: number | string;
  name: string;
  description: string;
  cost: number;
  bookingFee: number;
  duration: string;
};

const appointmentTimes = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const minBookingDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [services, setServices] = useState<ClinicService[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(appointmentTimes[0]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      try {
        const response = await fetch("/api/services", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Services are temporarily unavailable.");
        const items: ClinicService[] = Array.isArray(result.services) ? result.services : [];
        if (cancelled) return;
        setServices(items);
        const requested = searchParams.get("service");
        const selected = items.find((item) => String(item.id) === requested || item.name === requested);
        setServiceId(String(selected?.id ?? items[0]?.id ?? ""));
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load services.");
      } finally {
        if (!cancelled) setIsLoadingServices(false);
      }
    }
    void loadServices();
    return () => { cancelled = true; };
  }, [searchParams]);

  const selectedService = services.find((service) => String(service.id) === serviceId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) {
      setMessage("Please choose an available service.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          serviceId,
          date,
          time,
          notes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We could not create your appointment booking.");
      router.push(
        `/pay?ticketNumber=${encodeURIComponent(result.ticketNumber)}${result.emailSent ? "" : "&emailStatus=failed"}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not send your booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6f5] px-4 py-10 text-slate-900 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black tracking-[0.12em] text-[#12343a]">
          <span aria-hidden="true" className="text-teal-700">←</span> WHITE DENTAL CLINIC
        </Link>
        <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:mt-12 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">A thoughtful first step</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#12343a] sm:text-5xl">Book your dental visit</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Choose a clinic service and a preferred appointment time. Your booking stays pending until the 30% fee is confirmed. We’ll email your payment link and issue your downloadable ticket after successful payment.
          </p>

          {isLoadingServices ? (
            <p role="status" className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Loading available clinic services…</p>
          ) : services.length === 0 ? (
            <div role="status" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              No services are available for online booking yet. Please contact the clinic or check back soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">Dental service
                <select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} className={fieldClass}>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name} · ${service.cost.toFixed(2)}</option>)}
                </select>
              </label>
              {selectedService && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
                  <p className="font-semibold text-[#12343a]">{selectedService.name}{selectedService.duration ? ` · ${selectedService.duration}` : ""}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{selectedService.description}</p>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-slate-600">Service cost: <strong className="text-slate-900">${selectedService.cost.toFixed(2)}</strong></span>
                    <span className="text-teal-800">30% booking fee: <strong>${selectedService.bookingFee.toFixed(2)}</strong></span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">The remaining balance is due at your visit. No full-service charge is taken now.</p>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">Your full name
                  <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="Full name" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Email address
                  <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} placeholder="you@example.com" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Phone number
                  <input required type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} placeholder="(555) 555-0123" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Preferred date
                  <input required type="date" min={minBookingDate} value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">Preferred appointment time
                <select required value={time} onChange={(event) => setTime(event.target.value)} className={fieldClass}>
                  {appointmentTimes.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Anything you’d like us to know? <span className="font-normal text-slate-500">(optional)</span>
                <textarea maxLength={2000} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Please don’t include sensitive medical information." className={`${fieldClass} resize-y`} />
              </label>
              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-teal-800 px-6 py-4 font-bold text-white transition hover:bg-[#12343a] disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? "Creating your booking…" : `Book visit · pay $${selectedService?.bookingFee.toFixed(2) ?? "0.00"} fee`}
              </button>
              {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{message}</p>}
              <p className="text-center text-xs leading-5 text-slate-500">Payments are securely handled by PayPal. Card availability depends on your region and PayPal checkout eligibility. For urgent dental concerns, contact emergency services.</p>
            </form>
          )}
        </section>
        <p className="mt-6 text-center text-xs text-slate-500">White Dental Clinic · 2717 Main Street, Dallas, TX 75226</p>
      </div>
    </main>
  );
}

export default function BookPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f3f6f5]" />}><BookingForm /></Suspense>;
}
