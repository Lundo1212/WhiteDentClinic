"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Invalid admin access.");
      }

      sessionStorage.setItem("white-dental-admin-token", result.token);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-md rounded-3xl border border-[#58b4a7]/40 bg-[#151515] p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.12em] text-[#58b4a7]">White Dental Clinic</p>
        <h1 className="mt-4 text-3xl font-black uppercase">Admin Access</h1>
        <p className="mt-3 text-sm text-gray-400">
          Use your clinic admin key to manage appointments, services, media, and patient questions.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm text-gray-300">
            Clinic admin key
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Enter clinic admin key"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 outline-none focus:border-[#58b4a7]"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[#58b4a7] px-6 py-3.5 font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#9ed8d1]"
          >
            {isSubmitting ? "Checking access..." : "Open Admin Dashboard"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
