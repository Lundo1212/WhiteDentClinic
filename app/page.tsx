"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { FormEvent } from "react";

type SocialPlatform = "Instagram" | "Facebook" | "TikTok" | "YouTube" | "X" | "WhatsApp";
type SocialLink = { platform: SocialPlatform; url: string };
type ClinicService = {
  id: number | string;
  name: string;
  category: string;
  description: string;
  cost: number;
  bookingFee: number;
  duration: string;
  imageUrl: string;
  videoUrl: string;
};

const socialPlatforms: SocialPlatform[] = ["Instagram", "Facebook", "TikTok", "YouTube", "X", "WhatsApp"];

const faqs = [
  {
    question: "How do I request an appointment?",
    answer: "Send us an appointment request with your preferred service and a few details. Our team will follow up to discuss availability and confirm a time.",
  },
  {
    question: "What should I bring to my first visit?",
    answer: "Bring a photo ID, your insurance information if applicable, and a list of any medications or questions you would like to discuss with the care team.",
  },
  {
    question: "Do you accept dental insurance?",
    answer: "Coverage varies by plan. Contact the clinic before your visit and we can help you understand what information to bring and what to ask your insurer.",
  },
  {
    question: "I feel nervous about dental visits. Can you help?",
    answer: "Let us know when you get in touch. We can talk through your concerns, explain each step, and discuss ways to make your visit feel more comfortable.",
  },
];

function ToothMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className} fill="none">
      <path d="M9.2 4.5c2.7 0 4.1 1.5 6.8 1.5s4.1-1.5 6.8-1.5c3.4 0 5.5 2.8 5.5 6.7 0 5-3.2 8.3-4.1 13.1-.5 2.6-1.2 4.2-2.8 4.2-2.2 0-2.3-7.1-5.4-7.1s-3.2 7.1-5.4 7.1c-1.6 0-2.3-1.6-2.8-4.2C6.9 19.5 3.7 16.2 3.7 11.2c0-3.9 2.1-6.7 5.5-6.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10.2 11.4c1.5-1 3.1-1 4.6 0m2.4 0c1.5-1 3.1-1 4.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (platform === "Instagram") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="5" {...common} /><circle cx="12" cy="12" r="4" {...common} /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" /></svg>;
  if (platform === "Facebook") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" {...common} /></svg>;
  if (platform === "TikTok") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M14 4v10.2a4 4 0 1 1-4-4" {...common} /><path d="M14 4c.4 2.4 2 4 4.5 4.5" {...common} /></svg>;
  if (platform === "YouTube") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><rect x="3" y="5" width="18" height="14" rx="4" {...common} /><path d="m10 9 5 3-5 3z" {...common} /></svg>;
  if (platform === "X") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="m4 4 16 16M20 4 4 20" {...common} /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5Z" {...common} /><path d="M9 9c.7 2 2 3.3 4 4l1-1 2 1c-.4 1.5-1.4 2-2.7 1.8-3-.7-5.1-2.8-5.8-5.8C7.3 7.7 7.8 6.7 9.3 6.3l1 2z" {...common} /></svg>;
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [treatments, setTreatments] = useState<ClinicService[]>([]);

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch("/api/services", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load clinic services.");
        setTreatments(Array.isArray(result.services) ? result.services : []);
      } catch (error) {
        console.error("Unable to load clinic services:", error);
      }
    }
    void loadServices();
  }, []);

  useEffect(() => {
    async function loadSocialLinks() {
      try {
        const response = await fetch("/api/social-links");
        if (!response.ok) throw new Error("Unable to load clinic social links.");
        const result = await response.json();
        const links = result.links as Partial<Record<SocialPlatform, string>>;
        setSocialLinks(socialPlatforms.flatMap((platform) => {
          const url = links[platform];
          return url ? [{ platform, url }] : [];
        }));
      } catch (error) {
        console.error("Unable to load clinic social links:", error);
      }
    }
    void loadSocialLinks();
  }, []);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");
    setStatusIsError(false);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, question }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to send your message.");
      setStatus("Thanks for reaching out. The White Dental Clinic team will be in touch.");
      setQuestion("");
      setName("");
      setEmail("");
    } catch (error) {
      setStatusIsError(true);
      setStatus(error instanceof Error ? error.message : "We could not send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const navLinks = [
    ["Treatments", "#treatments"],
    ["Our practice", "#practice"],
    ["Appointments", "#booking"],
    ["Location", "#location"],
    ["FAQs", "#faq"],
  ];

  return (
    <main className="min-h-screen bg-[#101010] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#101010]/95 backdrop-blur-xl">
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-5 lg:px-8">
          <a href="#" aria-label="White Dental Clinic home" className="flex items-center gap-2 text-sm font-black tracking-[0.08em] sm:text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#58b4a7]/60 text-[#58b4a7]"><ToothMark className="h-5 w-5" /></span>
            WHITE <span className="text-[#58b4a7]">DENTAL CLINIC</span>
          </a>

          <div className="hidden items-center gap-5 text-xs text-gray-300 md:flex lg:gap-7 lg:text-sm">
            {navLinks.map(([label, href]) => <a key={href} href={href} className="transition hover:text-[#58b4a7]">{label}</a>)}
          </div>

          <a href="/book" className="rounded-full bg-[#58b4a7] px-3 py-2 text-[10px] font-bold text-black transition hover:bg-white sm:px-4 sm:text-xs lg:px-5 lg:text-sm">
            <span className="sm:hidden">BOOK</span>
            <span className="hidden sm:inline">REQUEST A VISIT</span>
          </a>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-[#58b4a7] hover:text-[#58b4a7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b4a7] md:hidden"
          >
            {mobileMenuOpen ? <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>}
          </button>

          {mobileMenuOpen && (
            <div id="mobile-navigation" className="absolute inset-x-4 top-full z-50 mt-2 rounded-xl border border-white/10 bg-[#101010] p-2 shadow-2xl md:hidden">
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block min-h-11 rounded-lg px-4 py-3 text-sm text-gray-200 transition hover:bg-white/5 hover:text-[#58b4a7] focus-visible:outline-2 focus-visible:outline-[#58b4a7]">{label}</a>
              ))}
            </div>
          )}
        </nav>
      </header>

      <section className="relative flex min-h-[90vh] items-center overflow-hidden pt-20 sm:pt-24">
        <div
          className="absolute inset-0 bg-cover bg-[center_42%]"
          style={{ backgroundImage: "linear-gradient(90deg, rgba(12,12,12,.97) 0%, rgba(12,12,12,.84) 46%, rgba(12,12,12,.25) 100%), url('https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=2000&q=90')" }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-5 sm:py-24 lg:px-8">
          <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.28em] text-[#58b4a7] sm:text-xs lg:text-sm">Dallas, Texas · Thoughtful dental care</p>
          <h1 className="max-w-5xl text-4xl font-black uppercase leading-[0.94] tracking-tight sm:text-6xl lg:text-8xl">
            A brighter smile.
            <br />
            <span className="text-[#58b4a7]">A better</span>
            <br />
            dental visit.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-6 text-gray-300 sm:mt-7 sm:text-base sm:leading-7">
            Your comfort comes first. Meet a dental team that listens, explains your options, and makes space for care that feels like you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
            <a href="/book" className="rounded-full bg-[#58b4a7] px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white sm:px-7 sm:py-4">Request a visit ↗</a>
            <a href="#practice" className="rounded-full border border-white/40 px-5 py-3 text-center text-sm font-bold uppercase tracking-wider transition hover:border-[#58b4a7] hover:text-[#58b4a7] sm:px-7 sm:py-4">Discover our clinic</a>
          </div>
          <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-white/20 pt-7 sm:mt-16 sm:gap-10">
            {[
              ["01", "We listen first"],
              ["02", "Care, clearly explained"],
              ["03", "Your smile, your pace"],
            ].map(([number, text]) => (
              <div key={number}>
                <p className="text-2xl font-black text-[#58b4a7]">{number}</p>
                <p className="mt-1 max-w-28 text-[10px] uppercase tracking-widest text-gray-400 sm:text-xs">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="treatments" className="scroll-mt-24 px-4 py-16 sm:px-5 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#58b4a7] sm:text-xs">Care for every smile</p>
              <h2 className="mt-3 text-3xl font-black uppercase sm:text-5xl">Feel good about <span className="text-[#58b4a7]">your care.</span></h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">Explore services from our team, review transparent pricing, and choose the care that feels right for you.</p>
            </div>
            <a href="/book" className="text-sm font-semibold text-[#58b4a7] transition hover:text-white">Ask us about a treatment ↗</a>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {treatments.length === 0 && <p className="rounded-2xl border border-white/10 bg-[#181818] p-6 text-sm leading-6 text-gray-400 sm:col-span-2 lg:col-span-4">Our team is preparing the online service list. Please contact the clinic and we’ll be happy to help.</p>}
            {treatments.map((treatment) => (
              <article key={treatment.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#181818] transition hover:-translate-y-1 hover:border-[#58b4a7]/60">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#102c35]">
                  {treatment.videoUrl ? <video src={treatment.videoUrl} controls className="h-full w-full object-cover" aria-label={`${treatment.name} service video`} /> : treatment.imageUrl ? <Image src={treatment.imageUrl} alt={`${treatment.name} at White Dental Clinic`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized className="object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/70">White Dental Clinic</div>}
                </div>
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#58b4a7]">{treatment.category}{treatment.duration ? ` · ${treatment.duration}` : ""}</p>
                  <h3 className="mt-2 text-lg font-bold">{treatment.name}</h3>
                  <p className="mt-2 min-h-20 text-sm leading-6 text-gray-400">{treatment.description}</p>
                  <p className="mt-4 text-sm text-gray-300">Service cost <strong className="text-white">${treatment.cost.toFixed(2)}</strong></p>
                  <p className="mt-1 text-sm text-[#bce9e4]">30% booking fee <strong>${treatment.bookingFee.toFixed(2)}</strong></p>
                  <a href={`/book?service=${encodeURIComponent(String(treatment.id))}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-white transition hover:text-[#58b4a7]">Book this service ↗</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="practice" className="scroll-mt-24 bg-[#191919] px-4 py-16 sm:px-5 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#58b4a7] sm:text-xs">A different kind of dental visit</p>
            <h2 className="mt-4 text-3xl font-black uppercase leading-tight sm:text-5xl">Care that starts <span className="text-[#58b4a7]">with you.</span></h2>
            <p className="mt-6 text-sm leading-7 text-gray-400 sm:text-base">At White Dental Clinic, your visit is a conversation, not a checklist. We take the time to understand what matters to you and explain your care in clear, everyday language.</p>
            <p className="mt-4 text-sm leading-7 text-gray-400 sm:text-base">Whether you’re here for a routine cleaning or exploring a new treatment, we’ll help you feel informed and comfortable at every step.</p>
            <a href="/book" className="mt-8 inline-flex rounded-full bg-[#58b4a7] px-6 py-3 text-sm font-bold uppercase text-black transition hover:bg-white sm:px-7 sm:py-4">Meet us at White Dental Clinic ↗</a>
          </div>
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl">
              <Image src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=85" alt="Bright, modern dental treatment room" width={1200} height={800} unoptimized className="h-64 w-full object-cover sm:h-96" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#58b4a7] sm:text-xs">The White Dental Clinic difference</p>
              <h3 className="mt-2 text-xl font-bold">Clear answers. Considerate care.</h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">No rushed conversations. Just thoughtful attention and a plan that makes sense to you.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="booking" className="scroll-mt-24 px-4 py-16 sm:px-5 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[#58b4a7]/30 bg-gradient-to-br from-[#252019] to-[#141414] px-5 py-10 text-center sm:px-12 sm:py-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#58b4a7] sm:text-xs">Your next visit starts here</p>
          <h2 className="mt-5 text-3xl font-black uppercase sm:text-6xl">Ready for a <span className="text-[#58b4a7]">fresh start?</span></h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base sm:leading-7">Choose a clinic service, then securely pay the 30% booking fee to reserve your appointment. Your remaining balance is due at your visit.</p>
          <a href="/book" className="mt-8 inline-flex w-full justify-center rounded-full bg-[#58b4a7] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white sm:w-auto sm:px-8 sm:py-4">Explore services & book ↗</a>
          <p className="mt-4 text-xs text-gray-500">Your booking and payment details will be emailed to you.</p>
        </div>
      </section>

      <section id="location" className="scroll-mt-24 bg-[#191919] px-4 py-16 sm:px-5 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#58b4a7] sm:text-xs">Easy to find, easy to reach</p>
          <h2 className="mt-3 text-3xl font-black uppercase sm:text-5xl">Visit <span className="text-[#58b4a7]">White Dental Clinic.</span></h2>
          <div className="mt-10 grid overflow-hidden rounded-2xl border border-white/10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col justify-center bg-[#111111] p-6 sm:p-10">
              <p className="text-[10px] uppercase tracking-widest text-[#58b4a7] sm:text-xs">White Dental Clinic · Dallas</p>
              <h3 className="mt-4 text-2xl font-bold">We’re here for your smile.</h3>
              <address className="mt-4 text-sm leading-7 text-gray-400 not-italic sm:text-base">2717 Main Street<br />Dallas, TX 75226<br />United States</address>
              <a href="https://www.google.com/maps/search/?api=1&query=2717+Main+Street%2C+Dallas%2C+TX+75226" target="_blank" rel="noreferrer" className="mt-7 inline-flex w-fit rounded-full bg-[#58b4a7] px-6 py-3 text-sm font-bold text-black transition hover:bg-white">Get directions ↗</a>
              <p className="mt-4 text-xs leading-5 text-gray-500">Please contact us to confirm clinic hours and appointment availability.</p>
            </div>
            <iframe title="Map to White Dental Clinic in Dallas, Texas" src="https://maps.google.com/maps?q=2717%20Main%20Street%2C%20Dallas%2C%20TX%2075226&t=&z=15&ie=UTF8&iwloc=&output=embed" className="h-[290px] w-full border-0 sm:h-[430px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-4 py-16 sm:px-5 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#58b4a7] sm:text-xs">Good to know</p>
            <h2 className="mt-3 text-3xl font-black uppercase sm:text-5xl">Frequently asked <span className="text-[#58b4a7]">questions.</span></h2>
            <p className="mt-5 text-sm leading-7 text-gray-400 sm:text-base">A little more about your first visit, insurance, and feeling comfortable in the chair.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={faq.question} className="rounded-xl border border-white/10 bg-[#181818]">
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex min-h-14 w-full items-center justify-between gap-4 p-5 text-left font-bold" aria-expanded={openFaq === index}>
                  {faq.question}<span className="text-xl text-[#58b4a7]">{openFaq === index ? "−" : "+"}</span>
                </button>
                {openFaq === index && <p className="px-5 pb-5 text-sm leading-7 text-gray-400">{faq.answer}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 bg-[#191919] px-4 py-16 sm:px-5 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 md:gap-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#58b4a7] sm:text-xs">We’re happy to help</p>
            <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">Let’s talk about <span className="text-[#58b4a7]">your smile.</span></h2>
            <p className="mt-5 text-sm leading-7 text-gray-400 sm:text-base">Have a question before booking? Send us a note and a member of our team will get back to you.</p>
          </div>
          <form className="space-y-4" onSubmit={submitQuestion}>
            <label className="block text-sm text-gray-300">Your name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" className="mt-2 w-full rounded-xl border border-white/15 bg-[#101010] px-4 py-3 outline-none focus:border-[#58b4a7]" /></label>
            <label className="block text-sm text-gray-300">Your email<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/15 bg-[#101010] px-4 py-3 outline-none focus:border-[#58b4a7]" /></label>
            <label className="block text-sm text-gray-300">How can we help?<textarea required maxLength={5000} rows={4} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Tell us what you would like to know..." className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-[#101010] px-4 py-3 outline-none focus:border-[#58b4a7]" /></label>
            <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-[#58b4a7] px-6 py-4 font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Sending..." : "Send your message ↗"}</button>
            {status && <p role="status" className={`rounded-xl border p-3 text-sm ${statusIsError ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-[#58b4a7]/30 bg-[#58b4a7]/10 text-[#c4e9e5]"}`}>{status}</p>}
          </form>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0b0b0b] px-4 py-12 sm:px-5 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="#" className="flex items-center gap-2 text-lg font-black tracking-wider"><ToothMark className="h-6 w-6 text-[#58b4a7]" />WHITE <span className="text-[#58b4a7]">DENTAL CLINIC</span></a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">Considerate dental care, clear answers, and a little more reason to smile.</p>
            {socialLinks.length > 0 && <nav aria-label="Social media" className="mt-5 flex flex-wrap gap-2">{socialLinks.map(({ platform, url }) => <a key={platform} href={url} target="_blank" rel="noopener noreferrer" aria-label={`White Dental Clinic on ${platform}`} title={platform} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-gray-300 transition hover:border-[#58b4a7] hover:text-[#58b4a7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b4a7]"><SocialIcon platform={platform} /></a>)}</nav>}
          </div>
          <div><h3 className="font-bold">Explore</h3><div className="mt-4 flex flex-col gap-3 text-sm text-gray-400"><a href="#treatments" className="hover:text-[#58b4a7]">Dental treatments</a><a href="#practice" className="hover:text-[#58b4a7]">Our practice</a><a href="/book" className="hover:text-[#58b4a7]">Request a visit</a><a href="#faq" className="hover:text-[#58b4a7]">FAQs</a></div></div>
          <div><h3 className="font-bold">Visit us</h3><address className="mt-4 text-sm leading-6 text-gray-400 not-italic">2717 Main Street<br />Dallas, TX 75226<br />United States</address><a href="https://www.google.com/maps/search/?api=1&query=2717+Main+Street%2C+Dallas%2C+TX+75226" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-[#58b4a7]">Get directions ↗</a></div>
          <div><h3 className="font-bold">Patient information</h3><div className="mt-4 flex flex-col gap-3 text-sm text-gray-400"><a href="#location" className="hover:text-[#58b4a7]">Location & map</a><a href="#faq" className="hover:text-[#58b4a7]">First-visit FAQs</a><a href="#contact" className="hover:text-[#58b4a7]">Contact the clinic</a></div></div>
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-[11px] text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <p>White Dental Clinic. All rights reserved.</p>
          <p>Dallas, Texas · Care that starts with you.</p>
        </div>
      </footer>
    </main>
  );
}
