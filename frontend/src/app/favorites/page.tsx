"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCoverImageUrl, type PaginatedPosts } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function FavoritesPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PaginatedPosts | null>(null);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("Memuat artikel favorit...");

  useEffect(() => {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) {
      router.replace("/login");
      return;
    }
    fetch(`${API_URL}/my/favorites?page=${page}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          sessionStorage.removeItem("blog_token");
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Artikel favorit gagal dimuat.");
        const result: PaginatedPosts = await response.json();
        setPosts(result);
        setMessage(result.total ? "" : "Artikel yang kamu simpan akan tampil di sini.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Artikel favorit gagal dimuat."));
  }, [page, router]);

  return <main className="edit-page-bg relative min-h-screen overflow-hidden px-6 py-10 text-stone-900">
    <div aria-hidden="true" className="edit-orb edit-orb-one" />
    <section className="reader-enter relative mx-auto max-w-5xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:-translate-x-1">← Kembali ke bacaan</Link>
      <header className="mt-7 flex items-center gap-4"><span className="reader-book-float rounded-2xl bg-rose-100 p-3 text-rose-700"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path d="M20.8 8.7c0 4.2-8.8 10.2-8.8 10.2S3.2 12.9 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"/></svg></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Koleksi pribadimu</p><h1 className="mt-1 text-3xl font-bold">Artikel favorit</h1></div></header>
      {posts?.data.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{posts.data.map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
        <Link href={`/posts/${post.slug}`}>
          {post.cover_image && <img src={getCoverImageUrl(post.cover_image_url ?? post.cover_image) ?? ""} alt={`Sampul ${post.title}`} className="h-44 w-full object-cover" />}
          <div className="p-5"><span className="text-xs font-semibold text-amber-800">{post.category?.name || "Artikel"}</span><h2 className="mt-2 text-lg font-bold leading-snug">{post.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{post.excerpt || post.content.slice(0, 140)}</p></div>
        </Link>
        <div className="flex justify-between border-t border-stone-100 px-5 py-3 text-xs text-stone-500"><span>{post.user?.author_profile?.pen_name || post.user?.name || "Penulis"}</span><span>{post.favorites_count ?? 0} menyukai</span></div>
      </article>)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white/75 p-10 text-center text-stone-600">{message}</div>}
      {posts && posts.last_page > 1 && <div className="mt-8 flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-stone-300 bg-white px-4 py-2 disabled:opacity-40">← Sebelumnya</button><span className="text-sm text-stone-600">Halaman {posts.current_page} dari {posts.last_page}</span><button disabled={page >= posts.last_page} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-stone-300 bg-white px-4 py-2 disabled:opacity-40">Berikutnya →</button></div>}
    </section>
  </main>;
}
