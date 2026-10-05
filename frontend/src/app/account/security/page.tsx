"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AccountSecurityPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("blog_token");
    if (!savedToken || !API_URL) { router.replace("/login"); return; }
    setToken(savedToken);
  }, [router]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password !== confirmation) { setMessage("Konfirmasi password baru tidak sama."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/account/password`, { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ current_password: currentPassword, password, password_confirmation: confirmation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errors ? Object.values(result.errors).flat().join(" ") : result.message || "Password gagal diubah.");
      setMessage(result.message);
      setCurrentPassword(""); setPassword(""); setConfirmation("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Password gagal diubah."); }
    finally { setBusy(false); }
  }

  async function logoutAll() {
    if (!window.confirm("Keluarkan akun dari semua perangkat lain? Sesi di browser ini juga akan berakhir.")) return;
    try { await fetch(`${API_URL}/account/logout-all`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }); }
    finally { sessionStorage.removeItem("blog_token"); router.replace("/login"); }
  }

  async function deleteAccount() {
    if (!window.confirm("Hapus akun dan data akun ini secara permanen? Artikel serta profil yang terkait juga dapat terhapus.")) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/account`, { method: "DELETE", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Akun gagal dihapus.");
      sessionStorage.removeItem("blog_token");
      router.replace("/register");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Akun gagal dihapus."); }
    finally { setBusy(false); }
  }

  return <main className="edit-page-bg relative min-h-screen overflow-hidden px-5 py-12 text-stone-900 sm:px-8"><div aria-hidden="true" className="edit-orb edit-orb-one" /><div aria-hidden="true" className="edit-orb edit-orb-two" /><div className="page-enter relative mx-auto max-w-3xl">
    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:-translate-x-1">← Kembali ke RuangBaca</Link>
    <header className="mt-6 flex items-center gap-4"><span className="edit-icon-float rounded-2xl bg-amber-100 p-3 text-amber-800"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Perlindungan akun</p><h1 className="mt-1 text-3xl font-bold">Keamanan akun</h1></div></header>
    <p className="mt-2 text-stone-600">Kelola password, sesi masuk, dan akun RuangBaca.</p>
    {message && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
    <section className="page-card mt-7 rounded-3xl border border-stone-200 bg-white/95 p-6 shadow-sm sm:p-8"><h2 className="flex items-center gap-2 text-xl font-bold"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-amber-700"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>Ubah password</h2><form onSubmit={changePassword} className="mt-5 space-y-4">
      <label className="block text-sm font-medium">Password saat ini<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
      <label className="block text-sm font-medium">Password baru<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
      <label className="block text-sm font-medium">Ulangi password baru<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
      <button disabled={busy} className="rounded-xl bg-amber-700 px-5 py-3 font-semibold text-white disabled:opacity-50">Simpan password</button>
    </form></section>
    <section className="page-card mt-5 rounded-3xl border border-stone-200 bg-white/95 p-6 shadow-sm sm:p-8"><h2 className="flex items-center gap-2 text-xl font-bold"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-amber-700"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 9h8M8 13h5"/></svg>Sesi perangkat</h2><p className="mt-2 text-sm leading-6 text-stone-600">Keluarkan semua sesi lain jika kamu masuk di perangkat bersama atau mencurigai akun digunakan orang lain.</p><button onClick={() => void logoutAll()} className="mt-4 rounded-xl border border-stone-300 px-5 py-3 font-semibold transition hover:bg-stone-50">Keluar dari semua perangkat</button></section>
    <section className="page-card mt-5 rounded-3xl border border-red-200 bg-white/95 p-6 shadow-sm sm:p-8"><h2 className="flex items-center gap-2 text-xl font-bold text-red-800"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>Hapus akun</h2><p className="mt-2 text-sm leading-6 text-stone-600">Penghapusan akun tidak dapat dibatalkan. Akun admin terakhir dilindungi agar akses moderasi tidak hilang.</p><button disabled={busy} onClick={() => void deleteAccount()} className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:opacity-50">Hapus akun permanen</button></section>
  </div></main>;
}
