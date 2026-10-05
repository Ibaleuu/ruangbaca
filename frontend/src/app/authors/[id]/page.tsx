"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCoverImageUrl, type Author, type PaginatedPosts } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AuthorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [author, setAuthor] = useState<Author | null>(null);
  const [posts, setPosts] = useState<PaginatedPosts | null>(null);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("Memuat profil penulis...");

  useEffect(() => {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) {
      router.replace("/login");
      return;
    }
    fetch(`${API_URL}/authors/${encodeURIComponent(id)}?page=${page}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          sessionStorage.removeItem("blog_token");
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Profil penulis tidak ditemukan.");
        const result = await response.json();
        setAuthor(result.author);
        setPosts(result.posts);
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Profil gagal dimuat."));
  }, [id, page, router]);

  if (!author) return <main className="edit-page-bg min-h-screen p-10 text-stone-700">{message}</main>;
  const profile = author.author_profile;

  return <main className="edit-page-bg relative min-h-screen overflow-hidden px-6 py-10 text-stone-900">
    <div aria-hidden="true" className="edit-orb edit-orb-one" />
    <div className="reader-enter relative mx-auto max-w-5xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:-translate-x-1">← Kembali ke artikel</Link>
      <section className="mt-6 rounded-3xl border border-white/80 bg-white/90 p-7 shadow-xl shadow-stone-900/5 backdrop-blur sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">{profile?.avatar_url ? <img src={profile.avatar_url} alt={`Foto ${profile.pen_name || author.name}`} className="h-20 w-20 shrink-0 rounded-3xl object-cover shadow-lg" /> : <span className="reader-book-float flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-lg"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-9 w-9"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>}<div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Profil penulis</p><h1 className="mt-2 text-3xl font-bold">{profile?.pen_name || author.name}</h1><p className="mt-2 text-sm text-stone-500">{posts?.total ?? 0} artikel diterbitkan</p></div></div>
        {profile?.bio && <p className="mt-7 max-w-3xl whitespace-pre-wrap text-lg leading-8 text-stone-700">{profile.bio}</p>}
      </section>
      <section className="mt-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Kumpulan tulisan</p><h2 className="mt-2 text-2xl font-bold">Artikel dari {profile?.pen_name || author.name}</h2>
        {posts?.data.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{posts.data.map((post) => <Link key={post.id} href={`/posts/${post.slug}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
          {post.cover_image && <img src={getCoverImageUrl(post.cover_image_url ?? post.cover_image) ?? ""} alt={`Sampul ${post.title}`} className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
          <div className="p-5"><span className="text-xs font-semibold text-amber-800">{post.category?.name || "Artikel"}</span><h3 className="mt-2 text-lg font-bold leading-snug group-hover:text-amber-800">{post.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{post.excerpt || post.content.slice(0, 160)}</p></div>
        </Link>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center text-stone-600">Penulis ini belum menerbitkan artikel.</p>}
        {posts && posts.last_page > 1 && <div className="mt-8 flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-stone-300 bg-white px-4 py-2 disabled:opacity-40">← Sebelumnya</button><span className="text-sm text-stone-600">Halaman {posts.current_page} dari {posts.last_page}</span><button disabled={page >= posts.last_page} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-stone-300 bg-white px-4 py-2 disabled:opacity-40">Berikutnya →</button></div>}
      </section>
    </div>
  </main>;
}
