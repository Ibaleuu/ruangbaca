"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!API_URL) { setMessage("Alamat API belum dikonfigurasi."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/forgot-password`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      setMessage(result.message || "Jika email terdaftar, tautan reset akan dikirim.");
    } catch { setMessage("Tidak bisa menghubungi server Laravel."); }
    finally { setBusy(false); }
  }

  return <main className="edit-page-bg relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-stone-900"><div aria-hidden="true" className="edit-orb edit-orb-one"/><div aria-hidden="true" className="edit-orb edit-orb-two"/><section className="page-enter page-card relative w-full max-w-md rounded-3xl border border-white bg-white/90 p-8 shadow-xl"><Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:-translate-x-1">← Kembali ke login</Link><div className="mt-7 flex items-center gap-4"><span className="edit-icon-float rounded-2xl bg-amber-100 p-3 text-amber-800"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4M11 7v4l2 1"/></svg></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">Pemulihan akun</p><h1 className="mt-1 text-3xl font-bold">Lupa password?</h1></div></div><p className="mt-3 text-stone-600">Masukkan email akun. Kami akan mengirim tautan untuk membuat password baru.</p><form onSubmit={submit} className="mt-7 space-y-4"><label htmlFor="email" className="block text-sm font-medium">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" placeholder="nama@email.com"/>{message && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}<button disabled={busy} className="w-full rounded-xl bg-amber-700 px-5 py-3 font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50">{busy ? "Mengirim..." : "Kirim tautan reset"}</button></form></section></main>;
}
