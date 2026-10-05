"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TurnstileWidget from "@/components/TurnstileWidget";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type RegisterResponse = {
  message?: string;
  token?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  errors?: Record<string, string[]>;
};

function FieldIcon({ kind }: { kind: "user" | "mail" | "lock" }) {
  if (kind === "mail") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>;
  }
  if (kind === "lock") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!API_URL) {
      setMessage("Alamat API belum dikonfigurasi.");
      return;
    }

    if (password !== passwordConfirmation) {
      setMessage("Konfirmasi password tidak sama.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
          turnstile_token: turnstileToken,
        }),
      });

      const result: RegisterResponse = await response.json();

      if (!response.ok) {
        const validationMessage = result.errors
          ? Object.values(result.errors).flat().join(" ")
          : "";

        setMessage(
          validationMessage ||
            result.message ||
            "Pendaftaran gagal. Periksa data yang dimasukkan.",
        );
        return;
      }

      if (!result.token) {
        setMessage(
          "Pendaftaran berhasil, tetapi token login tidak diterima. Coba masuk lewat halaman login.",
        );
        return;
      }

      sessionStorage.setItem("blog_token", result.token);
      router.push("/");
      router.refresh();
    } catch {
      setMessage("Tidak bisa terhubung ke server Laravel.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8ef] px-6 py-12 text-stone-900">
      <style>{`
        @keyframes auth-float-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(36px, -24px, 0) scale(1.06); }
        }
        @keyframes auth-float-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-28px, 30px, 0) scale(1.08); }
        }
        @keyframes auth-shimmer {
          0%, 100% { opacity: .45; }
          50% { opacity: .8; }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-motion { animation: none !important; }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="auth-motion absolute -left-32 -top-36 h-[28rem] w-[28rem] rounded-full bg-amber-300/45 blur-3xl"
          style={{ animation: "auth-float-a 18s ease-in-out infinite" }}
        />
        <div
          className="auth-motion absolute -bottom-40 -right-28 h-[32rem] w-[32rem] rounded-full bg-orange-300/40 blur-3xl"
          style={{ animation: "auth-float-b 22s ease-in-out infinite" }}
        />
        <div
          className="auth-motion absolute left-[68%] top-[12%] h-40 w-40 rounded-full bg-rose-200/45 blur-3xl"
          style={{ animation: "auth-shimmer 9s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(255,248,239,.7)_78%)]" />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-8 text-stone-900 shadow-[0_24px_80px_-28px_rgba(120,53,15,0.28)] backdrop-blur-xl sm:p-10">
        <div aria-hidden="true" className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-gradient-to-bl from-amber-100/80 to-transparent" />
        <Link href="/" className="text-2xl font-bold tracking-tight">
          Ruang<span className="text-amber-600">Baca</span>
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.5a3.5 3.5 0 0 1 0 6.8m1.5 2.2a5.5 5.5 0 0 1 4 5.5" /></svg>
          </span>
          <h1 className="text-3xl font-bold">Daftar pembaca</h1>
        </div>
        <p className="mt-2 text-stone-600">
          Buat akun pembaca untuk masuk dan membaca artikel.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
              <FieldIcon kind="user" />
              Nama
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              placeholder="Nama lengkap"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
              <FieldIcon kind="mail" />
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"
            >
              <FieldIcon kind="lock" />
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              placeholder="Minimal 8 karakter"
            />
          </div>

          <div>
            <label
              htmlFor="passwordConfirmation"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"
            >
              <FieldIcon kind="lock" />
              Ulangi password
            </label>
            <input
              id="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              placeholder="Ulangi password"
            />
          </div>

          {message && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {message}
            </p>
          )}

          <TurnstileWidget onToken={setTurnstileToken} />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-amber-700 px-5 py-3 font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Mendaftarkan..." : "Daftar"}
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-700 hover:text-amber-800"
          >
            Masuk
          </Link>
        </p>

        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-stone-600 hover:text-amber-700"
        >
          ← Kembali ke halaman utama
        </Link>
      </div>
    </main>
  );
}
