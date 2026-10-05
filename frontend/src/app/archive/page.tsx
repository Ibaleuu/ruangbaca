"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCoverImageUrl, type PaginatedPosts } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
type Period = { year: number; month: number; count: number };
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function ArchivePage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selected, setSelected] = useState<Period | null>(null);
  const [posts, setPosts] = useState<PaginatedPosts | null>(null);
  const [message, setMessage] = useState("Memuat arsip...");

  useEffect(() => {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) { window.location.assign("/login"); return; }
    fetch(`${API_URL}/archives`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Arsip gagal dimuat."); const result = await response.json(); setPeriods(result.data ?? []); setMessage(result.data?.length ? "Pilih bulan untuk melihat artikel." : "Belum ada artikel terbit."); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Arsip gagal dimuat."));
  }, []);

  useEffect(() => {
    if (!selected || !API_URL) return;
    const token = sessionStorage.getItem("blog_token");
    if (!token) return;
    fetch(`${API_URL}/archives/${selected.year}/${selected.month}`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Artikel arsip gagal dimuat."); setPosts(await response.json()); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Artikel arsip gagal dimuat."));
  }, [selected]);

  return <main className="edit-page-bg relative min-h-screen overflow-hidden px-5 py-10 text-stone-900 sm:px-8"><div aria-hidden="true" className="edit-orb edit-orb-one"/><div className="page-enter relative mx-auto max-w-5xl"><Link href="/" className="inline-flex transition hover:-translate-x-1">← Kembali ke RuangBaca</Link><header className="mt-7 flex items-center gap-4"><span className="edit-icon-float rounded-2xl bg-violet-100 p-3 text-violet-800"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18M8 13h3m-3 4h8"/></svg></span><div><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-800">Jelajahi kembali</p><h1 className="mt-1 text-3xl font-bold">Arsip artikel</h1></div></header><p className="mt-3 text-stone-600">Telusuri tulisan berdasarkan bulan dan tahun diterbitkan.</p><div className="mt-7 flex flex-wrap gap-2">{periods.map((period) => <button key={`${period.year}-${period.month}`} onClick={() => { setSelected(period); setMessage(""); }} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${selected?.year === period.year && selected.month === period.month ? "border-violet-700 bg-violet-700 text-white" : "border-stone-200 bg-white text-stone-700 hover:border-violet-300"}`}>{monthNames[period.month - 1]} {period.year}<span className="ml-2 text-xs opacity-70">{period.count}</span></button>)}</div>{selected && <h2 className="mt-9 text-xl font-bold">{monthNames[selected.month - 1]} {selected.year}</h2>}{posts?.data.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{posts.data.map((post) => <article key={post.id} className="page-card flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">{post.cover_image && <img src={getCoverImageUrl(post.cover_image_url ?? post.cover_image) ?? ""} alt="" className="h-24 w-28 shrink-0 rounded-xl object-cover"/>}<div><time className="text-xs text-stone-500">{post.published_at ? new Date(post.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}</time><h3 className="mt-1 font-bold"><Link href={`/posts/${post.slug}`} className="hover:text-amber-800">{post.title}</Link></h3><p className="mt-1 text-sm text-stone-600">{post.user?.author_profile?.pen_name || post.user?.name}</p></div></article>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white/80 p-7 text-center text-stone-600">{selected ? "Tidak ada artikel di bulan ini." : message}</p>}</div></main>;
}
