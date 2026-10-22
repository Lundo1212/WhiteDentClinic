"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

type Booking = {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  service_description?: string;
  service_price: number | string;
  deposit_amount: number | string;
  balance_amount?: number | string;
  booking_notes?: string | null;
  appointment_date: string;
  appointment_time: string;
  payment_status: string;
  booking_status: string;
  ticket_number: string;
  paypal_order_id?: string | null;
  created_at?: string;
};

type BookingDraft = {
  name: string;
  email: string;
  phone: string;
  serviceId: string;
  date: string;
  time: string;
  notes: string;
};

type VisitorQuestion = {
  id: number | string;
  customer_name?: string | null;
  customer_email: string;
  question_text: string;
  response?: string | null;
  answered_at?: string | null;
  created_at?: string;
  source?: "local" | "database";
};

type QuestionDraft = {
  name: string;
  email: string;
  question: string;
  response: string;
};

type GalleryItem = {
  id: number | string;
  title: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  media_type: string;
  image_url?: string | null;
  video_url?: string | null;
  source?: "local" | "database";
};

const platforms = ["Instagram", "Facebook", "TikTok", "YouTube", "X", "WhatsApp"] as const;
type Platform = (typeof platforms)[number];
type SocialLinks = Record<Platform, string>;

const emptyLinks: SocialLinks = {
  Instagram: "",
  Facebook: "",
  TikTok: "",
  YouTube: "",
  X: "",
  WhatsApp: "",
};

const categories = [
  "Preventive dentistry",
  "Family dentistry",
  "Cosmetic dentistry",
  "Restorative dentistry",
  "Orthodontics",
  "Emergency care",
  "Other",
];

const blankMedia = {
  title: "",
  category: "Preventive dentistry",
  description: "",
  price: "150",
  duration: "1-2 hours",
  image_url: "",
  video_url: "",
  media_type: "image",
};

const appointmentTimes = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const minBookingDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-3 text-white outline-none focus:border-[#58b4a7]";
const cardClass = "rounded-3xl border border-white/10 bg-[#151515] p-5 sm:p-6";
const buttonClass =
  "rounded-full bg-[#58b4a7] px-5 py-3 font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60";

function formatDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function SocialIcon({ platform }: { platform: Platform }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (platform === "Instagram") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="5" {...common} /><circle cx="12" cy="12" r="4" {...common} /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" /></svg>;
  }
  if (platform === "Facebook") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" {...common} /></svg>;
  }
  if (platform === "TikTok") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M14 4v10.2a4 4 0 1 1-4-4" {...common} /><path d="M14 4c.4 2.4 2 4 4.5 4.5" {...common} /></svg>;
  }
  if (platform === "YouTube") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><rect x="3" y="5" width="18" height="14" rx="4" {...common} /><path d="m10 9 5 3-5 3z" {...common} /></svg>;
  }
  if (platform === "X") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="m4 4 16 16M20 4 4 20" {...common} /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5Z" {...common} /><path d="M9 9c.7 2 2 3.3 4 4l1-1 2 1c-.4 1.5-1.4 2-2.7 1.8-3-.7-5.1-2.8-5.8-5.8C7.3 7.7 7.8 6.7 9.3 6.3l1 2z" {...common} /></svg>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [questions, setQuestions] = useState<VisitorQuestion[]>([]);
  const [mediaItems, setMediaItems] = useState<GalleryItem[]>([]);
  const [links, setLinks] = useState<SocialLinks>(emptyLinks);
  const [media, setMedia] = useState({ ...blankMedia });
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [replyId, setReplyId] = useState<number | string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyNotice, setReplyNotice] = useState("");
  const [linkNotice, setLinkNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [actionId, setActionId] = useState<string | number | null>(null);

  const tokenOrRedirect = useCallback(() => {
    const token = sessionStorage.getItem("white-dental-admin-token");
    if (!token) router.replace("/admin/login");
    return token;
  }, [router]);

  const adminFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const token = tokenOrRedirect();
      if (!token) throw new Error("Your admin session ended. Sign in again.");

      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(url, { ...init, headers, cache: "no-store" });

      if (response.status === 401) {
        sessionStorage.removeItem("white-dental-admin-token");
        router.replace("/admin/login");
        throw new Error("Your admin session is invalid or expired. Sign in again.");
      }

      return response;
    },
    [router, tokenOrRedirect],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    const warningsFound: string[] = [];
    try {
      const response = await adminFetch("/api/admin/dashboard");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load dashboard data.");
      setBookings(Array.isArray(result.bookings) ? result.bookings : []);
      setQuestions(Array.isArray(result.questions) ? result.questions : []);
      setMediaItems(Array.isArray(result.media) ? result.media : []);
      warningsFound.push(...(Array.isArray(result.warnings) ? result.warnings : []));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load dashboard data.");
    }

    try {
      const response = await adminFetch("/api/admin/social-links");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load social links.");
      setLinks({ ...emptyLinks, ...(result.links ?? {}) });
    } catch (cause) {
      warningsFound.push(cause instanceof Error ? cause.message : "Unable to load social links.");
    } finally {
      setWarnings(warningsFound);
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (!tokenOrRedirect()) return;
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard, tokenOrRedirect]);

  async function updateBooking(booking: Booking, status: string) {
    setActionId(booking.id);
    setError("");
    try {
      const response = await adminFetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update booking.");
      setBookings((current) =>
        result.removed
          ? current.filter((item) => item.id !== booking.id)
          : current.map((item) =>
              item.id === booking.id ? { ...item, booking_status: status } : item,
            ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update booking.");
    } finally {
      setActionId(null);
    }
  }

  function startEditBooking(booking: Booking) {
    setEditingBookingId(booking.id);
    setBookingDraft({
      name: booking.customer_name,
      email: booking.customer_email,
      phone: booking.customer_phone,
      serviceId: "",
      date: booking.appointment_date,
      time: booking.appointment_time.slice(0, 5),
      notes: booking.booking_notes ?? "",
    });
    setError("");
  }

  async function saveBooking(event: React.FormEvent<HTMLFormElement>, booking: Booking) {
    event.preventDefault();
    if (!bookingDraft) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, ...bookingDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save booking changes.");
      setBookings((current) =>
        current.map((item) => item.id === booking.id ? result.booking as Booking : item),
      );
      setEditingBookingId(null);
      setBookingDraft(null);
      setNotice("Booking updated. No email was sent; contact the patient if they need to know about the change.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save booking changes.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBooking(booking: Booking) {
    if (!window.confirm(`Permanently delete unpaid booking ${booking.ticket_number}?`)) return;
    setActionId(booking.id);
    setError("");
    try {
      const response = await adminFetch("/api/admin/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete booking.");
      setBookings((current) => current.filter((item) => item.id !== booking.id));
      if (editingBookingId === booking.id) {
        setEditingBookingId(null);
        setBookingDraft(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete booking.");
    } finally {
      setActionId(null);
    }
  }

  function resetMedia() {
    setMedia({ ...blankMedia });
    setFile(null);
    setFileInputKey((current) => current + 1);
    setEditing(null);
  }

  function startEdit(item: GalleryItem) {
    setEditing(item);
    setMedia({
      title: item.title,
      category: item.category,
      description: item.description,
      price: String(item.price),
      duration: item.duration,
      image_url: item.image_url ?? "",
      video_url: item.video_url ?? "",
      media_type: item.media_type,
    });
    setFile(null);
    setFileInputKey((current) => current + 1);
    document.getElementById("gallery-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  async function saveMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    let uploadedPath: string | null = null;

    try {
      const form = new FormData();
      form.set("title", media.title.trim());
      form.set("category", media.category);
      form.set("description", media.description.trim());
      form.set("price", String(Number(media.price)));
      form.set("duration", media.duration.trim());
      form.set("media_type", media.media_type);
      if (media.image_url) form.set("image_url", media.image_url);
      if (media.video_url) form.set("video_url", media.video_url);

      if (file) {
        const preflight = await adminFetch("/api/admin/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });
        const uploadInfo = await preflight.json();
        if (!preflight.ok) {
          throw new Error(uploadInfo.error ?? "Unable to prepare the file upload.");
        }

        if (uploadInfo.localFallback) {
          form.set("file", file);
        } else {
          const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
          if (!publicUrl || !publishableKey || !uploadInfo.bucket || !uploadInfo.path || !uploadInfo.token) {
            throw new Error("The gallery upload is not configured. Check the public Supabase settings.");
          }
          const browserClient = createClient(publicUrl, publishableKey);
          const { error: storageError } = await browserClient.storage
            .from(uploadInfo.bucket)
            .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, file, {
              contentType: file.type,
            });
          if (storageError) throw new Error(`File upload failed: ${storageError.message}`);

          uploadedPath = uploadInfo.path;
          const url = browserClient.storage.from(uploadInfo.bucket).getPublicUrl(uploadInfo.path).data.publicUrl;
          const video = file.type.startsWith("video/");
          form.set("media_type", video ? "video" : "image");
          form.set(video ? "video_url" : "image_url", url);
          form.set(video ? "image_url" : "video_url", "");
        }
      }

      const method = editing ? "PATCH" : "POST";
      if (editing) {
        form.set("id", String(editing.id));
        form.set("source", editing.source ?? "local");
      }
      const response = await adminFetch("/api/admin/media", { method, body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save gallery item.");

      setMediaItems((current) =>
        editing
          ? current.map((item) => (String(item.id) === String(editing.id) ? result.item : item))
          : [result.item, ...current],
      );
      resetMedia();
      setNotice(editing ? "Gallery item updated." : "Gallery item added.");
    } catch (cause) {
      if (uploadedPath) {
        try {
          await adminFetch("/api/admin/media/upload", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: uploadedPath }),
          });
        } catch (cleanupError) {
          console.error("Unable to clean up a failed gallery upload:", cleanupError);
        }
      }
      setError(cause instanceof Error ? cause.message : "Unable to save gallery item.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMedia(item: GalleryItem) {
    if (!window.confirm(`Delete "${item.title}" from the gallery?`)) return;
    setActionId(item.id);
    setError("");
    try {
      const response = await adminFetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, source: item.source ?? "local" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete gallery item.");
      setMediaItems((current) => current.filter((entry) => String(entry.id) !== String(item.id)));
      if (String(editing?.id) === String(item.id)) resetMedia();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete gallery item.");
    } finally {
      setActionId(null);
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>, question: VisitorQuestion) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setReplyNotice("");
    try {
      const response = await adminFetch("/api/admin/questions/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question.id,
          source: question.source ?? "database",
          name: question.customer_name ?? "",
          email: question.customer_email,
          question: question.question_text,
          response: replyText,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to send email reply.");
      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? { ...item, response: replyText.trim(), answered_at: new Date().toISOString() }
            : item,
        ),
      );
      setReplyText("");
      setReplyId(null);
      setReplyNotice(result.message ?? "Reply sent by email.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send email reply.");
    } finally {
      setBusy(false);
    }
  }

  function startEditQuestion(question: VisitorQuestion) {
    setEditingQuestionId(question.id);
    setQuestionDraft({
      name: question.customer_name ?? "",
      email: question.customer_email,
      question: question.question_text,
      response: question.response ?? "",
    });
    setError("");
  }

  async function saveQuestion(event: React.FormEvent<HTMLFormElement>, question: VisitorQuestion) {
    event.preventDefault();
    if (!questionDraft) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question.id,
          source: question.source ?? "database",
          ...questionDraft,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update question.");
      setQuestions((current) => current.map((item) => item.id === question.id
        ? {
            ...item,
            customer_name: questionDraft.name.trim() || null,
            customer_email: questionDraft.email.trim(),
            question_text: questionDraft.question.trim(),
            response: questionDraft.response.trim() || null,
          }
        : item));
      setEditingQuestionId(null);
      setQuestionDraft(null);
      setNotice("Question updated. Editing the saved reply does not send another email.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update question.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(question: VisitorQuestion) {
    if (!window.confirm("Permanently delete this client question and its saved reply? This cannot be undone.")) return;
    setActionId(question.id);
    setError("");
    try {
      const response = await adminFetch("/api/admin/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: question.id, source: question.source ?? "database" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete question.");
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      if (editingQuestionId === question.id) {
        setEditingQuestionId(null);
        setQuestionDraft(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete question.");
    } finally {
      setActionId(null);
    }
  }

  async function saveSocialLinks(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLinkNotice("");
    setError("");
    try {
      const response = await adminFetch("/api/admin/social-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save social links.");
      setLinks({ ...emptyLinks, ...result.links });
      setLinkNotice("Social links saved. They are now shown in the public footer.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save social links.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("white-dental-admin-token");
    router.replace("/admin/login");
  }

  const unanswered = questions.filter((question) => !question.answered_at).length;
  const activeBookingRecords = bookings.filter((booking) => booking.booking_status !== "attended");
  const archivedBookings = bookings.filter((booking) => booking.booking_status === "attended");
  const activeBookings = activeBookingRecords.length;

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#58b4a7]">White Dental Clinic · Admin</p>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-400">Manage appointments, clinic services, patient questions, media, and social links.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-[#58b4a7] disabled:opacity-50">
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" onClick={logout} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-[#58b4a7]">
              Log out
            </button>
          </div>
        </header>

        <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-2">
          {[
            ["overview", "Overview"],
            ["bookings", `Bookings (${activeBookings})`],
            ["questions", `Questions (${unanswered})`],
            ["gallery", "Services & media"],
            ["social", "Social links"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-[#58b4a7] hover:text-[#58b4a7]">
              {label}
            </a>
          ))}
        </nav>

        {error && <div role="alert" className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {warnings.length > 0 && (
          <div role="status" className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Some dashboard data could not be loaded.</p>
            <ul className="mt-2 list-inside list-disc space-y-1">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
        )}
        {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{notice}</p>}

        {loading ? (
          <div className={`${cardClass} text-gray-300`}>Loading admin data...</div>
        ) : (
          <div className="space-y-8">
            <section id="overview" className="grid gap-4 sm:grid-cols-3">
              {[
                ["Active bookings", activeBookings],
                ["Waiting for reply", unanswered],
                ["Published services", mediaItems.length],
              ].map(([label, count]) => (
                <div key={label} className={cardClass}>
                  <p className="text-sm text-gray-400">{label}</p>
                  <p className="mt-2 text-3xl font-black text-[#58b4a7]">{count}</p>
                </div>
              ))}
            </section>

            <section id="bookings" className={cardClass}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#58b4a7]">Bookings and tickets</h2>
                  <p className="mt-1 text-sm text-gray-400">Edit patient details or appointment information. Paid bookings are retained as history.</p>
                </div>
              </div>
              {activeBookingRecords.length === 0 ? <p className="text-sm text-gray-400">No active bookings found.</p> : (
                <div className="space-y-4">
                  {activeBookingRecords.map((booking) => (
                    <article key={booking.id} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <h3 className="font-bold">{booking.customer_name}</h3>
                          <p className="text-sm text-gray-400">{booking.customer_email} · {booking.customer_phone}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-sm font-semibold text-[#58b4a7]">{booking.ticket_number}</p>
                          <p className="text-xs capitalize text-gray-400">{booking.booking_status}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-3">
                        <p><span className="text-gray-500">Service:</span> {booking.service_name}</p>
                        <p><span className="text-gray-500">Full service cost:</span> ${Number(booking.service_price).toFixed(2)}</p>
                        <p><span className="text-gray-500">30% appointment booking fee:</span> ${Number(booking.deposit_amount).toFixed(2)}</p>
                        <p><span className="text-gray-500">Appointment date:</span> {formatDate(booking.appointment_date)}</p>
                        <p><span className="text-gray-500">Appointment time:</span> {booking.appointment_time}</p>
                        <p><span className="text-gray-500">Patient notes:</span> {booking.booking_notes || "None"}</p>
                        <p><span className="text-gray-500">Payment:</span> <span className="capitalize">{booking.payment_status}</span></p>
                        <p><span className="text-gray-500">Booking status:</span> <span className="capitalize">{booking.booking_status}</span></p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(booking.payment_status === "paid" ? ["pending", "confirmed", "attended"] : ["pending"]).map((status) => (
                          <button key={status} type="button" onClick={() => void updateBooking(booking, status)} disabled={actionId === booking.id || booking.booking_status === status} className="rounded-full border border-white/15 px-3 py-2 text-xs capitalize transition hover:border-[#58b4a7] disabled:cursor-not-allowed disabled:opacity-40">
                            {actionId === booking.id ? "Updating..." : status === "attended" ? "Mark attended / archive" : `Mark ${status}`}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => startEditBooking(booking)}
                          disabled={busy || actionId !== null}
                          className="rounded-full border border-[#58b4a7]/40 px-3 py-2 text-xs text-[#bce9e4] disabled:opacity-50"
                        >
                          Edit booking
                        </button>
                        {booking.payment_status !== "paid" && !booking.paypal_order_id && (
                          <button
                            type="button"
                            onClick={() => void deleteBooking(booking)}
                            disabled={actionId === booking.id}
                            className="rounded-full border border-red-400/30 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
                          >
                            {actionId === booking.id ? "Deleting..." : "Delete unpaid booking"}
                          </button>
                        )}
                      </div>
                      {editingBookingId === booking.id && bookingDraft && (
                        <form onSubmit={(event) => void saveBooking(event, booking)} className="mt-5 grid gap-4 rounded-xl border border-white/10 bg-[#151515] p-4 sm:grid-cols-2">
                          <label className="text-sm text-gray-300">Patient name
                            <input required maxLength={120} value={bookingDraft.name} onChange={(event) => setBookingDraft((current) => current ? { ...current, name: event.target.value } : current)} className={inputClass} />
                          </label>
                          <label className="text-sm text-gray-300">Email address
                            <input required type="email" maxLength={254} autoComplete="email" value={bookingDraft.email} onChange={(event) => setBookingDraft((current) => current ? { ...current, email: event.target.value } : current)} className={inputClass} />
                          </label>
                          <label className="text-sm text-gray-300">Phone number
                            <input required type="tel" maxLength={40} autoComplete="tel" value={bookingDraft.phone} onChange={(event) => setBookingDraft((current) => current ? { ...current, phone: event.target.value } : current)} className={inputClass} />
                          </label>
                          <label className="text-sm text-gray-300">Appointment date
                            <input required type="date" min={minBookingDate} value={bookingDraft.date} onChange={(event) => setBookingDraft((current) => current ? { ...current, date: event.target.value } : current)} className={inputClass} />
                          </label>
                          <label className="text-sm text-gray-300">Appointment time
                            <select required value={bookingDraft.time} onChange={(event) => setBookingDraft((current) => current ? { ...current, time: event.target.value } : current)} className={inputClass}>
                              {appointmentTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                            </select>
                          </label>
                          <label className="text-sm text-gray-300">Change service
                            <select
                              value={bookingDraft.serviceId}
                              disabled={booking.payment_status === "paid" || Boolean(booking.paypal_order_id)}
                              onChange={(event) => setBookingDraft((current) => current ? { ...current, serviceId: event.target.value } : current)}
                              className={inputClass}
                            >
                              <option value="">Keep current service</option>
                              {mediaItems.map((item) => <option key={item.id} value={String(item.id)}>{item.title} · ${Number(item.price).toFixed(2)}</option>)}
                            </select>
                            {(booking.payment_status === "paid" || booking.paypal_order_id) && <span className="mt-1 block text-xs text-gray-500">Service changes are disabled after payment or checkout starts.</span>}
                          </label>
                          <label className="text-sm text-gray-300 sm:col-span-2">Patient notes
                            <textarea maxLength={2000} rows={3} value={bookingDraft.notes} onChange={(event) => setBookingDraft((current) => current ? { ...current, notes: event.target.value } : current)} className={inputClass} />
                          </label>
                          <p className="text-xs leading-5 text-gray-500 sm:col-span-2">Ticket number and payment status cannot be edited. Saving changes does not send an email. A changed service recalculates the unpaid booking fee.</p>
                          <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <button type="submit" disabled={busy} className={buttonClass}>{busy ? "Saving..." : "Save booking"}</button>
                            <button type="button" disabled={busy} onClick={() => { setEditingBookingId(null); setBookingDraft(null); }} className="rounded-full border border-white/15 px-5 py-3 text-sm">Cancel</button>
                          </div>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {archivedBookings.length > 0 && (
                <details className="mt-6 rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                  <summary className="cursor-pointer font-semibold text-gray-300">Archived attended bookings ({archivedBookings.length})</summary>
                  <div className="mt-4 space-y-3">
                    {archivedBookings.map((booking) => (
                      <article key={booking.id} className="rounded-xl border border-white/10 p-4 text-sm">
                        <div className="flex flex-wrap justify-between gap-2">
                          <p className="font-semibold">{booking.customer_name} · {booking.service_name}</p>
                          <p className="text-[#58b4a7]">{booking.ticket_number}</p>
                        </div>
                        <p className="mt-2 text-gray-400">{booking.customer_email} · {formatDate(booking.appointment_date)} · {booking.appointment_time}</p>
                        <p className="mt-1 text-gray-400">Payment: <span className="capitalize">{booking.payment_status}</span> · Booking: attended</p>
                      </article>
                    ))}
                  </div>
                </details>
              )}
            </section>

            <section id="questions" className={cardClass}>
              <h2 className="text-xl font-bold text-[#58b4a7]">Visitor questions</h2>
              <p className="mb-5 mt-1 text-sm text-gray-400">Only authenticated admins can view questions. Replies are emailed to the visitor.</p>
              {questions.length === 0 ? <p className="text-sm text-gray-400">No visitor questions received yet.</p> : (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <article key={`${question.source ?? "database"}-${question.id}`} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <p className="font-semibold">{question.customer_name || "Visitor"}</p>
                      <p className="text-sm text-gray-400">{question.customer_email}{question.created_at ? ` · ${formatDate(question.created_at)}` : ""}</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-200">{question.question_text}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEditQuestion(question)} disabled={busy || actionId !== null} className="rounded-full border border-[#58b4a7]/40 px-3 py-2 text-xs text-[#bce9e4] disabled:opacity-50">
                          Edit question
                        </button>
                        <button type="button" onClick={() => void deleteQuestion(question)} disabled={actionId === question.id} className="rounded-full border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                          {actionId === question.id ? "Deleting..." : "Delete question"}
                        </button>
                      </div>
                      {editingQuestionId === question.id && questionDraft ? (
                        <form onSubmit={(event) => void saveQuestion(event, question)} className="mt-4 grid gap-4 rounded-xl border border-white/10 bg-[#151515] p-4">
                          <label className="text-sm text-gray-300">Client name
                            <input maxLength={120} value={questionDraft.name} onChange={(event) => setQuestionDraft((current) => current ? { ...current, name: event.target.value } : current)} className={inputClass} />
                          </label>
                          <label className="text-sm text-gray-300">Email address
                            <input required type="email" maxLength={254} autoComplete="email" value={questionDraft.email} onChange={(event) => setQuestionDraft((current) => current ? { ...current, email: event.target.value } : current)} className={inputClass} />
                          </label>
                          <label className="text-sm text-gray-300">Client question
                            <textarea required maxLength={5000} rows={4} value={questionDraft.question} onChange={(event) => setQuestionDraft((current) => current ? { ...current, question: event.target.value } : current)} className={inputClass} />
                          </label>
                          <label className="text-sm text-gray-300">Saved reply
                            <textarea maxLength={5000} rows={4} value={questionDraft.response} onChange={(event) => setQuestionDraft((current) => current ? { ...current, response: event.target.value } : current)} className={inputClass} />
                          </label>
                          <p className="text-xs text-gray-500">Saving edits to a saved reply does not send another email. Use “Reply by email” for unanswered questions.</p>
                          <div className="flex flex-wrap gap-2">
                            <button type="submit" disabled={busy} className={buttonClass}>{busy ? "Saving..." : "Save question"}</button>
                            <button type="button" disabled={busy} onClick={() => { setEditingQuestionId(null); setQuestionDraft(null); }} className="rounded-full border border-white/15 px-4 py-2 text-sm">Cancel</button>
                          </div>
                        </form>
                      ) : question.answered_at ? (
                        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                          <p className="text-xs font-semibold uppercase text-emerald-300">Answered · {formatDate(question.answered_at)}</p>
                          {question.response && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{question.response}</p>}
                        </div>
                      ) : replyId === question.id ? (
                        <form onSubmit={(event) => void sendReply(event, question)} className="mt-4 space-y-3">
                          <label className="block text-sm text-gray-300">
                            Your email reply
                            <textarea required maxLength={5000} rows={4} value={replyText} onChange={(event) => setReplyText(event.target.value)} className={inputClass} />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button type="submit" disabled={busy || !replyText.trim()} className={buttonClass}>{busy ? "Sending email..." : "Send reply by email"}</button>
                            <button type="button" disabled={busy} onClick={() => { setReplyId(null); setReplyText(""); }} className="rounded-full border border-white/15 px-4 py-2 text-sm">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button type="button" onClick={() => { setReplyId(question.id); setReplyText(""); setError(""); }} className="mt-4 rounded-full border border-[#58b4a7]/40 px-4 py-2 text-xs font-semibold text-[#bce9e4] hover:bg-[#58b4a7]/10">
                          Reply by email
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {replyNotice && <p role="status" className="mt-4 text-sm text-emerald-300">{replyNotice}</p>}
            </section>

            <section id="gallery" className={cardClass}>
              <h2 id="gallery-editor" className="text-xl font-bold text-[#58b4a7]">{editing ? "Edit clinic service" : "Add a clinic service"}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">Services saved here appear on the public website and booking form. Add a clear description, full service cost, and an image or video; the 30% booking fee is calculated automatically.</p>
              <form onSubmit={(event) => void saveMedia(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-gray-300">Service name
                  <input required maxLength={160} value={media.title} onChange={(event) => setMedia((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="e.g. Comprehensive dental exam" />
                </label>
                <label className="text-sm text-gray-300">Care category
                  <select value={media.category} onChange={(event) => setMedia((current) => ({ ...current, category: event.target.value }))} className={inputClass}>
                    {[...new Set([...categories, ...(editing ? [editing.category] : [])])].map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="text-sm text-gray-300">Full service cost (USD)
                  <input required type="number" min="0.01" step="0.01" value={media.price} onChange={(event) => setMedia((current) => ({ ...current, price: event.target.value }))} className={inputClass} />
                </label>
                <label className="text-sm text-gray-300">Typical appointment length
                  <input maxLength={100} value={media.duration} onChange={(event) => setMedia((current) => ({ ...current, duration: event.target.value }))} className={inputClass} placeholder="e.g. 45 minutes" />
                </label>
                <label className="text-sm text-gray-300 sm:col-span-2">Patient-friendly service description
                  <textarea required maxLength={3000} rows={3} value={media.description} onChange={(event) => setMedia((current) => ({ ...current, description: event.target.value }))} className={inputClass} placeholder="Explain what the visit includes and what patients can expect." />
                </label>
                <label className="text-sm text-gray-300 sm:col-span-2">Upload service image or video
                  <input key={fileInputKey} type="file" accept="image/*,video/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${inputClass} file:mr-4 file:rounded-full file:border-0 file:bg-[#58b4a7] file:px-4 file:py-2 file:font-semibold file:text-black`} />
                </label>
                <p className="text-xs text-gray-500 sm:col-span-2">Or provide an existing HTTPS image or video URL:</p>
                <label className="text-sm text-gray-300">Image URL
                  <input type="url" value={media.image_url} onChange={(event) => setMedia((current) => ({ ...current, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
                </label>
                <label className="text-sm text-gray-300">Video URL
                  <input type="url" value={media.video_url} onChange={(event) => setMedia((current) => ({ ...current, video_url: event.target.value }))} className={inputClass} placeholder="https://..." />
                </label>
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button type="submit" disabled={busy} className={buttonClass}>{busy ? "Saving..." : editing ? "Save service" : "Publish service"}</button>
                  {editing && <button type="button" disabled={busy} onClick={resetMedia} className="rounded-full border border-white/15 px-5 py-3 text-sm">Cancel edit</button>}
                </div>
              </form>
              {mediaItems.length === 0 ? <p className="mt-6 text-sm text-gray-400">No clinic services published yet.</p> : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mediaItems.map((item) => (
                    <article key={`${item.source ?? "database"}-${item.id}`} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]">
                      {item.video_url ? <video controls src={item.video_url} className="h-44 w-full bg-black object-cover" /> : item.image_url ? <div className="relative h-44 w-full bg-black"><Image unoptimized fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" src={item.image_url} alt={item.title} className="object-cover" /></div> : null}
                      <div className="p-4">
                        <h3 className="font-bold">{item.title}</h3>
                        <p className="mt-1 text-xs text-gray-400">{item.category} · ${item.price.toFixed(2)} total · 30% booking fee ${((item.price * 30) / 100).toFixed(2)} · {item.duration}</p>
                        <p className="mt-3 line-clamp-3 text-sm text-gray-300">{item.description}</p>
                        <div className="mt-4 flex gap-2">
                          <button type="button" disabled={busy || actionId !== null} onClick={() => startEdit(item)} className="rounded-full border border-[#58b4a7]/40 px-3 py-2 text-xs text-[#bce9e4] disabled:opacity-50">Edit</button>
                          <button type="button" disabled={busy || actionId === item.id} onClick={() => void deleteMedia(item)} className="rounded-full border border-red-400/30 px-3 py-2 text-xs text-red-300 disabled:opacity-50">{actionId === item.id ? "Deleting..." : "Delete"}</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="social" className={cardClass}>
              <h2 className="text-xl font-bold text-[#58b4a7]">Social media links</h2>
              <p className="mt-1 text-sm text-gray-400">Saved URLs appear as clickable icons in the website footer. Clear a field to remove its icon.</p>
              <form onSubmit={(event) => void saveSocialLinks(event)} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {platforms.map((platform) => (
                    <label key={platform} className="text-sm text-gray-300">{platform}
                      <div className="flex items-center gap-2">
                        <input type="url" inputMode="url" value={links[platform]} onChange={(event) => setLinks((current) => ({ ...current, [platform]: event.target.value }))} className={inputClass} placeholder="https://..." />
                        {links[platform] && <button type="button" aria-label={`Remove ${platform}`} onClick={() => setLinks((current) => ({ ...current, [platform]: "" }))} className="mt-2 h-11 w-11 rounded-full border border-white/15 text-xl hover:border-red-400">×</button>}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={busy} className={buttonClass}>{busy ? "Saving..." : "Save social links"}</button>
                  {linkNotice && <p role="status" className="text-sm text-emerald-300">{linkNotice}</p>}
                </div>
              </form>
              <nav aria-label="Social link preview" className="mt-5 flex gap-2">
                {platforms.filter((platform) => links[platform]).map((platform) => (
                  <a key={platform} href={links[platform]} target="_blank" rel="noopener noreferrer" aria-label={platform} title={platform} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-gray-300 hover:border-[#58b4a7] hover:text-[#58b4a7]">
                    <SocialIcon platform={platform} />
                  </a>
                ))}
              </nav>
            </section>
          </div>
        )}

        <footer className="mt-10 border-t border-white/10 pt-5 text-xs text-gray-500">
          Admin routes: <code>/api/admin/dashboard</code>, <code>/api/admin/bookings</code>, <code>/api/admin/questions</code>, <code>/api/admin/questions/respond</code>, <code>/api/admin/media</code>, <code>/api/admin/media/upload</code>, and <code>/api/admin/social-links</code>.
        </footer>
      </div>
    </main>
  );
}
