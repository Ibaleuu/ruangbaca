"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import TurnstileWidget from "@/components/TurnstileWidget";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function MailIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>;
}

function LockIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></svg>;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("verified") === "1") {
      setNotice("Email berhasil diverifikasi. Silakan masuk.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!API_URL) {
      setMessage("Alamat API belum dikonfigurasi.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, turnstile_token: turnstileToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Email atau password salah.");
        return;
      }

      if (!result.token || !result.user?.role) {
        setMessage("Data akun dari server tidak lengkap.");
        return;
      }

      sessionStorage.setItem("blog_token", result.token);
      if (result.user.role === "admin") {
        router.push("/admin/moderation");
      } else {
        router.push(result.user.role === "writer" ? "/admin" : "/");
      }
    } catch {
      setMessage("Tidak bisa terhubung ke server Laravel.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8ef] px-6 py-12 text-stone-900">
      <style>{`
        @keyframes login-float-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(34px, -26px, 0) scale(1.07); }
        }
        @keyframes login-float-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-30px, 28px, 0) scale(1.08); }
        }
        @keyframes login-shimmer {
          0%, 100% { opacity: .4; }
          50% { opacity: .8; }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-motion { animation: none !important; }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="login-motion absolute -left-32 -top-36 h-[28rem] w-[28rem] rounded-full bg-amber-300/45 blur-3xl"
          style={{ animation: "login-float-a 18s ease-in-out infinite" }}
        />
        <div
          className="login-motion absolute -bottom-40 -right-28 h-[32rem] w-[32rem] rounded-full bg-orange-300/40 blur-3xl"
          style={{ animation: "login-float-b 22s ease-in-out infinite" }}
        />
        <div
          className="login-motion absolute left-[68%] top-[12%] h-40 w-40 rounded-full bg-rose-200/45 blur-3xl"
          style={{ animation: "login-shimmer 9s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(255,248,239,.7)_78%)]" />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-8 shadow-[0_24px_80px_-28px_rgba(120,53,15,0.28)] backdrop-blur-xl sm:p-10">
        <div aria-hidden="true" className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-gradient-to-bl from-amber-100/80 to-transparent" />
        <a href="/" className="text-2xl font-bold tracking-tight">
          Ruang<span className="text-amber-600">Baca</span>
        </a>

        <div className="mt-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z" /><path d="M5 5h12M9 8h7m-7 3h7" /></svg>
          </span>
          <h1 className="text-3xl font-bold">Masuk ke RuangBaca</h1>
        </div>
        <p className="mt-2 text-stone-600">
          Masuk sebagai pembaca atau penulis untuk melanjutkan.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
          <div>
            <label htmlFor="email" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
              <MailIcon />
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

          <div className="-mt-2 text-right">
            <a href="/forgot-password" className="text-sm font-medium text-amber-700 hover:text-amber-900">Lupa password?</a>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"
            >
              <LockIcon />
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              placeholder="Masukkan password"
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
            {isLoading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          Belum punya akun?{" "}
          <a href="/register" className="font-medium text-amber-700 hover:text-amber-900">
            Daftar sebagai pembaca
          </a>
        </p>

        <a
          href="/"
          className="mt-6 inline-block text-sm font-medium text-stone-600 hover:text-amber-700"
        >
          ← Kembali ke halaman utama
        </a>
      </div>
    </main>
  );
}
