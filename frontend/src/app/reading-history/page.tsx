"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCoverImageUrl, type Post } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
type HistoryEntry = { id: number; last_read_at: string; post: Post };

export default function ReadingHistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [message, setMessage] = useState("Memuat riwayat bacaan...");

  useEffect(() => {
    let active = true;
    async function loadOnMount() {
      const token = sessionStorage.getItem("blog_token");
      if (!token || !API_URL) { router.replace("/login"); return; }
      try {
        const response = await fetch(`${API_URL}/my/reading-history`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!response.ok) throw new Error("Riwayat bacaan gagal dimuat.");
        const result = await response.json();
        if (!active) return;
        setEntries(result.data ?? []);
        setMessage(result.total ? "" : "Artikel yang kamu baca akan tersimpan di sini.");
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Riwayat bacaan gagal dimuat.");
      }
    }
    void loadOnMount();
    return () => { active = false; };
  }, [router]);

  async function clearHistory() {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL || !window.confirm("Hapus seluruh riwayat bacaan?")) return;
    const response = await fetch(`${API_URL}/my/reading-history`, { method: "DELETE", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    if (response.ok) { setEntries([]); setMessage("Riwayat bacaan berhasil dihapus."); }
  }

  return <main className="edit-page-bg relative min-h-screen overflow-hidden px-5 py-10 text-stone-900 sm:px-8"><div aria-hidden="true" className="edit-orb edit-orb-one"/><div className="page-enter relative mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/" className="inline-flex transition hover:-translate-x-1">← Kembali ke RuangBaca</Link><header className="mt-6 flex items-center gap-4"><span className="reader-book-float rounded-2xl bg-sky-100 p-3 text-sky-800"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 5.5v16M8 7h8M8 11h8"/></svg></span><div><p className="text-xs font-bold uppercase tracking-[.2em] text-sky-800">Lanjutkan membaca</p><h1 className="mt-1 text-3xl font-bold">Bacaan terakhir</h1></div></header></div>{entries.length > 0 && <button onClick={() => void clearHistory()} className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-red-300 hover:text-red-700">Hapus riwayat</button>}</div>
    {entries.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2">{entries.map(({ id, last_read_at, post }) => <article key={id} className="page-card overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">{post.cover_image && <Link href={`/posts/${post.slug}`}><img src={getCoverImageUrl(post.cover_image_url ?? post.cover_image) ?? ""} alt={`Sampul ${post.title}`} className="h-40 w-full object-cover"/></Link>}<div className="p-5"><div className="flex flex-wrap gap-2">{post.category && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{post.category.name}</span>}{post.tags?.map((tag) => <span key={tag.id} className="rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-800">#{tag.name}</span>)}</div><h2 className="mt-3 text-lg font-bold"><Link href={`/posts/${post.slug}`} className="hover:text-amber-800">{post.title}</Link></h2><p className="mt-2 text-sm text-stone-500">Dibaca {new Date(last_read_at).toLocaleString("id-ID")}</p></div></article>)}</div> : <p className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white/80 p-8 text-center text-stone-600">{message}</p>}</div></main>;
}
