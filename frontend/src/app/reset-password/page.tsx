"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    setEmail(params.get("email") || "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!API_URL || !token) { setMessage("Tautan reset tidak valid. Minta tautan reset baru."); return; }
    if (password !== confirmation) { setMessage("Konfirmasi password tidak sama."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ token, email, password, password_confirmation: confirmation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || (result.errors ? Object.values(result.errors).flat().join(" ") : "Password gagal diubah."));
      setMessage(result.message || "Password berhasil diubah. Silakan masuk.");
      setPassword(""); setConfirmation("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Password gagal diubah."); }
    finally { setBusy(false); }
  }

  return <main className="edit-page-bg relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-stone-900"><div aria-hidden="true" className="edit-orb edit-orb-one"/><div aria-hidden="true" className="edit-orb edit-orb-two"/><section className="page-enter page-card relative w-full max-w-md rounded-3xl border border-white bg-white/90 p-8 shadow-xl"><div className="flex items-center gap-4"><span className="edit-icon-float rounded-2xl bg-amber-100 p-3 text-amber-800"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/></svg></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">Perbarui keamanan</p><h1 className="mt-1 text-3xl font-bold">Buat password baru</h1></div></div><p className="mt-3 text-stone-600">Masukkan password baru untuk akun {email || "email kamu"}.</p><form onSubmit={submit} className="mt-7 space-y-4"><label htmlFor="password" className="block text-sm font-medium">Password baru</label><input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" placeholder="Minimal 8 karakter"/><label htmlFor="confirmation" className="block text-sm font-medium">Ulangi password</label><input id="confirmation" type="password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" placeholder="Ulangi password"/>{message && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}<button disabled={busy} className="w-full rounded-xl bg-amber-700 px-5 py-3 font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan password baru"}</button></form><Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:translate-x-1">← Ke halaman login</Link></section></main>;
}
