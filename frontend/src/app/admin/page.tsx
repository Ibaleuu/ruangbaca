"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Post } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type MyPostsResponse = {
  data: Post[];
  total: number;
};
type WriterStats = { articles: number; published: number; pending: number; views: number; comments: number; favorites: number };

function DashboardIcon({ name, className = "h-4 w-4" }: { name: "book" | "write" | "logout" | "tag" | "eye" | "edit" | "trash" | "spark"; className?: string }) {
  const props = { "aria-hidden": true as const, viewBox: "0 0 24 24", fill: "none", className, stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "book") return <svg {...props}><path d="M5 4h13a2 2 0 0 1 2 2v14H7a3 3 0 0 0-3 2V6a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8"/></svg>;
  if (name === "write") return <svg {...props}><path d="m14.5 5.5 4 4M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z"/><path d="M13 20h7"/></svg>;
  if (name === "logout") return <svg {...props}><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M16 16l4-4-4-4M20 12H9"/></svg>;
  if (name === "tag") return <svg {...props}><path d="M20 13 13 20l-9-9V4h7l9 9Z"/><circle cx="8" cy="8" r="1"/></svg>;
  if (name === "eye") return <svg {...props}><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
  if (name === "edit") return <svg {...props}><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z"/></svg>;
  if (name === "trash") return <svg {...props}><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>;
  return <svg {...props}><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg>;
}

export default function AdminPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<WriterStats | null>(null);
  const [message, setMessage] = useState("Memuat artikel...");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "pending" | "published" | "rejected">("all");

  useEffect(() => {
    async function loadPosts() {
      setIsLoading(true);
      const token = sessionStorage.getItem("blog_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!API_URL) {
        setMessage("Alamat API belum dikonfigurasi.");
        setIsLoading(false);
        return;
      }

      try {
        const accountResponse = await fetch(`${API_URL}/me`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!accountResponse.ok) {
          sessionStorage.removeItem("blog_token");
          router.replace("/login");
          return;
        }

        const account = await accountResponse.json();
        if (account.user?.role === "admin") {
          router.replace("/admin/moderation");
          return;
        }
        if (account.user?.role !== "writer") {
          router.replace("/author/profile");
          return;
        }

        const postsUrl = new URL(`${API_URL}/my/posts`);
        if (statusFilter !== "all") postsUrl.searchParams.set("status", statusFilter);
        const [response, statisticsResponse] = await Promise.all([
          fetch(postsUrl, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          }),
          fetch(`${API_URL}/my/statistics`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ]);

        if (response.status === 401) {
          sessionStorage.removeItem("blog_token");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Daftar artikel gagal dimuat.");
        }

        const result: MyPostsResponse = await response.json();

        setPosts(result.data);
        if (statisticsResponse.ok) setStats(await statisticsResponse.json());
        setMessage(
          result.total === 0
            ? "Kamu belum membuat artikel."
            : `${result.total} artikel milikmu`,
        );
      } catch {
        setMessage("Tidak bisa mengambil artikel dari Laravel.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPosts();
  }, [router, statusFilter]);

  async function handleDelete(post: Post) {
    const confirmed = window.confirm(
      `Hapus artikel "${post.title}"? Tindakan ini tidak bisa dibatalkan.`,
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("blog_token");

    if (!token || !API_URL) {
      router.replace("/login");
      return;
    }

    setDeletingSlug(post.slug);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/posts/${encodeURIComponent(post.slug)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401) {
        sessionStorage.removeItem("blog_token");
        router.replace("/login");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Artikel gagal dihapus.");
      }

      setPosts((currentPosts) =>
        currentPosts.filter((item) => item.id !== post.id),
      );
      setMessage("Artikel berhasil dihapus.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Artikel gagal dihapus.",
      );
    } finally {
      setDeletingSlug(null);
    }
  }

  async function handleLogout() {
    const token = sessionStorage.getItem("blog_token");

    try {
      if (token && API_URL) {
        await fetch(`${API_URL}/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      sessionStorage.removeItem("blog_token");
      router.replace("/login");
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#fffaf4] px-6 py-12 text-stone-900">
      <style>{`
        @keyframes dashboard-enter { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dashboard-drift { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(18px,-16px,0); } }
        .dashboard-enter { animation: dashboard-enter .55s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .dashboard-enter, .dashboard-drift, .animate-pulse { animation: none !important; } }
      `}</style>
      <div aria-hidden="true" className="dashboard-drift pointer-events-none absolute -right-28 -top-28 -z-10 h-96 w-96 rounded-full bg-amber-200/45 blur-3xl" style={{ animation: "dashboard-drift 14s ease-in-out infinite" }} />
      <div aria-hidden="true" className="dashboard-drift pointer-events-none absolute -bottom-40 -left-28 -z-10 h-96 w-96 rounded-full bg-orange-200/35 blur-3xl" style={{ animation: "dashboard-drift 18s ease-in-out infinite reverse" }} />
      <div className="dashboard-enter mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 transition hover:-translate-x-1 hover:text-amber-900">
              <span aria-hidden="true">←</span> Lihat blog
            </Link>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-sm"><DashboardIcon name="book" className="h-6 w-6" /></span>
              Dashboard penulis
              <DashboardIcon name="spark" className="h-5 w-5 animate-pulse text-amber-500" />
            </h1>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/posts"
              className="group flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:bg-amber-800 hover:shadow-lg"
            >
              <DashboardIcon name="write" className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
              Tulis artikel
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="group flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-1 hover:border-stone-500 hover:shadow-md"
            >
              <DashboardIcon name="logout" className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
              Keluar
            </button>
          </div>
        </header>

        {stats && <section aria-label="Statistik penulis" className="mb-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Pembaca unik", stats.views], ["Komentar disetujui", stats.comments], ["Favorit", stats.favorites], ["Artikel terbit", stats.published],
        ].map(([label, value]) => <article key={label} title={label === "Pembaca unik" ? "Pembaca yang login dihitung satu kali per artikel." : label === "Favorit" ? "Jumlah favorit saat ini untuk seluruh artikelmu." : label === "Komentar disetujui" ? "Jumlah komentar yang sudah disetujui moderator." : "Artikel yang sudah disetujui dan diterbitkan."} className="page-card rounded-2xl border border-amber-100 bg-white/90 p-5 shadow-sm"><p className="text-sm text-stone-600">{label}</p><p className="mt-2 text-3xl font-bold text-amber-800">{value}</p></article>)}</div><p className="mt-2 text-xs text-stone-500">Pembaca dihitung unik per artikel untuk pengguna yang login; statistik merupakan total sepanjang waktu.</p></section>}

        <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_-35px_rgba(120,53,15,0.35)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700"><DashboardIcon name="book" /></span>
            <h2 className="text-xl font-bold">Artikel saya</h2>
          </div>
          <p className="mt-2 text-sm text-stone-600">{message}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3"><label htmlFor="postStatusFilter" className="flex items-center gap-2 text-sm font-medium text-stone-700"><DashboardIcon name="tag" />Filter status</label><select id="postStatusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"><option value="all">Semua artikel</option><option value="draft">Draf</option><option value="pending">Menunggu moderasi</option><option value="published">Terbit</option><option value="rejected">Ditolak / perlu diperbaiki</option></select></div>

          {isLoading ? (
            <p className="mt-6 flex items-center gap-3 text-stone-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-700" />Memuat artikel...</p>
          ) : posts.length > 0 ? (
            <div className="mt-6 divide-y divide-stone-200">
              {posts.map((post) => (
                <article
                  key={post.id}
                  style={{ animationDelay: `${Math.min(posts.indexOf(post), 8) * 90}ms` }}
                  className="dashboard-enter group flex flex-wrap items-center justify-between gap-4 rounded-2xl px-3 py-5 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-50/70"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
                      <DashboardIcon name="tag" className="h-3.5 w-3.5" />
                      {post.category?.name ?? "Tanpa kategori"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        post.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${post.status === "published" ? "animate-pulse bg-green-600" : "bg-stone-500"}`} />
                      {post.status === "published" ? "Terbit" : "Draft"}
                    </span>
                    {post.review_status === "pending" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Menunggu moderasi</span>}
                    {post.review_status === "rejected" && <div className="basis-full rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><p className="font-semibold">Artikel perlu diperbaiki</p><p className="mt-1">{post.review_note || "Moderator belum menambahkan catatan."}</p></div>}

                    {post.status === "published" && (
                      <Link
                        href={`/posts/${post.slug}`}
                        className="group/action inline-flex items-center gap-1 text-sm font-semibold text-stone-600 transition hover:text-stone-900"
                      >
                        <DashboardIcon name="eye" className="h-4 w-4 transition-transform group-hover/action:scale-110" />
                        Lihat
                      </Link>
                    )}

                    <Link
                      href={`/admin/posts/${encodeURIComponent(post.slug)}/edit`}
                      className="group/action inline-flex items-center gap-1 text-sm font-semibold text-amber-700 transition hover:text-amber-900"
                    >
                      <DashboardIcon name="edit" className="h-4 w-4 transition-transform group-hover/action:-rotate-12" />
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={deletingSlug === post.slug}
                      className="group/action inline-flex items-center gap-1 text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <DashboardIcon name="trash" className="h-4 w-4 transition-transform group-hover/action:scale-110" />
                      {deletingSlug === post.slug ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
