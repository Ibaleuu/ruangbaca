"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getCoverImageUrl, type Comment, type Post } from "@/services/api";
import { renderMarkdown } from "@/services/markdown";
import TurnstileWidget from "@/components/TurnstileWidget";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function ReaderIcon({ name }: { name: "back" | "book" | "tag" | "calendar" | "sparkle" | "heart" | "send" | "user" }) {
  const shapes = {
    back: <><path d="m15 18-6-6 6-6" /><path d="M20 12H9" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></>,
    tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9Z" /></>,
    heart: <path d="M20.8 8.7c0 4.2-8.8 10.2-8.8 10.2S3.2 12.9 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{shapes[name]}</svg>;
}

function displayName(comment: Comment): string {
  return comment.user.author_profile?.pen_name || comment.user.name;
}

export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [authorPosts, setAuthorPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("Memuat artikel...");

  useEffect(() => {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) {
      router.replace("/login");
      return;
    }
    const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/posts/${encodeURIComponent(slug)}`, { headers, cache: "no-store" }),
      fetch(`${API_URL}/posts/${encodeURIComponent(slug)}/comments`, { headers, cache: "no-store" }),
      fetch(`${API_URL}/me`, { headers, cache: "no-store" }),
    ])
      .then(async ([postResponse, commentsResponse, meResponse]) => {
        if ([postResponse, commentsResponse, meResponse].some((response) => response.status === 401)) {
          sessionStorage.removeItem("blog_token");
          router.replace("/login");
          return;
        }
        if (!postResponse.ok) throw new Error("Artikel tidak ditemukan.");
        const result = await postResponse.json();
        setPost(result.data);
        setAuthorPosts(result.author_posts ?? []);
        setIsFavorited(Boolean(result.data.is_favorited));
        setFavoriteCount(result.data.favorites_count ?? 0);
        if (commentsResponse.ok) {
          const commentResult = await commentsResponse.json();
          setComments(commentResult.data ?? []);
        }
        if (meResponse.ok) {
          const me = await meResponse.json();
          setCurrentUserId(me.user?.id ?? null);
        }
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Artikel gagal dimuat."));
  }, [slug, router]);

  async function handleFavorite() {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      const response = await fetch(`${API_URL}/posts/${encodeURIComponent(slug)}/favorite`, {
        method: isFavorited ? "DELETE" : "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Artikel gagal disimpan ke favorit.");
      const result = await response.json();
      setIsFavorited(result.favorited);
      setFavoriteCount(result.favorites_count);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Favorit gagal diperbarui.");
    } finally {
      setFavoriteBusy(false);
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL || !commentText.trim()) return;
    setCommentBusy(true);
    try {
      const response = await fetch(`${API_URL}/posts/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: commentText.trim(), ...(replyTo ? { parent_id: replyTo } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Komentar gagal dikirim.");
      setCommentText("");
      setReplyTo(null);
      setMessage(result.message || "Komentar dikirim untuk ditinjau moderator.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Komentar gagal dikirim.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function shareArticle() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: post?.title, url });
      else { await navigator.clipboard.writeText(url); setShareMessage("Tautan artikel disalin."); }
    } catch { setShareMessage("Tautan belum berhasil dibagikan."); }
  }

  async function handleDeleteComment(commentId: number) {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) return;
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const refreshed = await fetch(`${API_URL}/posts/${encodeURIComponent(slug)}/comments`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      if (refreshed.ok) setComments((await refreshed.json()).data ?? []);
    }
  }

  async function handleReport(path: string) {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) return;
    const reason = window.prompt("Pilih alasan: spam, harassment, misinformation, atau other", "other");
    if (reason === null) return;
    if (!["spam", "harassment", "misinformation", "other"].includes(reason.trim().toLowerCase())) {
      setMessage("Alasan laporan harus spam, harassment, misinformation, atau other.");
      return;
    }
    const details = window.prompt("Jelaskan secara singkat alasan laporan (opsional):");
    if (details === null) return;
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason.trim().toLowerCase(), details, turnstile_token: turnstileToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Laporan gagal dikirim.");
      setMessage(result.message || "Laporan terkirim untuk ditinjau.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Laporan gagal dikirim.");
    }
  }

  if (!post) {
    return (
      <main className="edit-page-bg min-h-screen p-10 text-stone-700">
        <div className="reader-enter mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-white/80 bg-white/85 p-6 shadow-lg backdrop-blur">
          <span className="reader-book-float rounded-xl bg-amber-100 p-3 text-amber-800"><ReaderIcon name="book" /></span>
          <span>{message}</span>
        </div>
      </main>
    );
  }

  const author = post.user;
  const authorProfile = author?.author_profile;

  return (
    <main className="edit-page-bg relative min-h-screen overflow-hidden text-stone-900">
      <div aria-hidden="true" className="edit-orb edit-orb-one" />
      <div aria-hidden="true" className="edit-orb edit-orb-two" />
      <header className="relative z-10 border-b border-stone-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold tracking-tight transition hover:scale-[1.03]">Ruang<span className="text-amber-600">Baca</span></Link>
          <Link href="/favorites" className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-700"><ReaderIcon name="heart" /> Favorit</Link>
        </div>
      </header>
      <article className="reader-enter relative z-10 mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link href="/" className="group inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/70 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm transition duration-200 hover:-translate-x-1 hover:border-amber-300 hover:bg-white hover:shadow-md">
          <ReaderIcon name="back" /> Kembali ke semua artikel
        </Link>
        {post.cover_image && <div className="reader-cover mt-8 overflow-hidden rounded-3xl border border-white/80 bg-stone-200 shadow-xl shadow-stone-900/10"><img src={getCoverImageUrl(post.cover_image_url ?? post.cover_image) ?? ""} alt={`Sampul artikel ${post.title}`} className="max-h-[440px] w-full object-cover transition duration-700 hover:scale-[1.02]" /></div>}
        <div className="reader-heading mt-10">
          {post.category && <p className="mb-5"><span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1.5 text-sm font-semibold text-amber-900 shadow-sm"><ReaderIcon name="tag" />{post.category.name}</span></p>}
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800"><ReaderIcon name="sparkle" /> Cerita, ide, dan wawasan</div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
          {post.published_at && <time className="mt-6 inline-flex items-center gap-2 text-sm text-stone-500"><ReaderIcon name="calendar" />{new Date(post.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</time>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {author && <Link href={`/authors/${author.id}`} className="inline-flex items-center gap-3 rounded-full border border-stone-200 bg-white/80 py-1.5 pl-2 pr-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-700 text-white"><ReaderIcon name="user" /></span>
              <span className="text-left"><span className="block text-xs text-stone-500">Ditulis oleh</span><span className="block text-sm font-bold text-stone-900">{authorProfile?.pen_name || author.name}</span></span>
            </Link>}
            <button type="button" onClick={handleFavorite} disabled={favoriteBusy} aria-pressed={isFavorited} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-60 ${isFavorited ? "border-rose-200 bg-rose-50 text-rose-700" : "border-stone-200 bg-white text-stone-700 hover:border-rose-200 hover:text-rose-700"}`}>
              <ReaderIcon name="heart" /> {isFavorited ? "Tersimpan" : "Simpan artikel"} · {favoriteCount}
            </button>
            <button type="button" onClick={() => void shareArticle()} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-800"><ReaderIcon name="send"/>Bagikan</button>
            <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${PUBLIC_SITE_URL}/posts/${post.slug}`)}`} className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 transition hover:-translate-y-0.5 hover:bg-green-100">WhatsApp</a>
            {currentUserId !== author?.id && <button type="button" onClick={() => void handleReport(`/posts/${encodeURIComponent(slug)}/reports`)} className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-red-200 hover:text-red-700">Laporkan artikel</button>}
          </div>
          {shareMessage && <p role="status" className="mt-3 text-xs text-sky-800">{shareMessage}</p>}
          <TurnstileWidget onToken={setTurnstileToken} />
        </div>
        {post.excerpt && <p className="reader-excerpt mt-8 rounded-r-2xl border-l-4 border-amber-500 bg-white/65 py-3 pl-5 pr-4 text-xl leading-8 text-stone-600 shadow-sm">{post.excerpt}</p>}
        <div className="reader-content article-markdown mt-10 text-lg leading-9 text-stone-800" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        <div className="reader-end-mark mt-14 flex items-center gap-3 text-amber-700"><span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" /><ReaderIcon name="sparkle" /><span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" /></div>

        {author && authorProfile && <section className="reader-enter mt-12 rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4"><span className="reader-book-float flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><ReaderIcon name="user" /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Tentang penulis</p><h2 className="mt-1 text-xl font-bold">{authorProfile.pen_name}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-stone-600">{authorProfile.bio}</p><Link href={`/authors/${author.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:translate-x-1">Lihat semua artikel penulis <ReaderIcon name="back" /></Link></div></div>
        </section>}

        {authorPosts.length > 0 && <section className="reader-enter mt-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Dari penulis yang sama</p><h2 className="mt-2 text-2xl font-bold">Artikel lainnya</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">{authorPosts.map((item) => <Link key={item.id} href={`/posts/${item.slug}`} className="group rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg"><span className="text-xs font-semibold text-amber-800">{item.category?.name || "Artikel"}</span><h3 className="mt-2 text-lg font-bold leading-snug group-hover:text-amber-800">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{item.excerpt || item.content.slice(0, 120)}</p></Link>)}</div>
        </section>}

        <section className="reader-enter mt-14 border-t border-stone-200 pt-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Diskusi</p><h2 className="mt-2 text-2xl font-bold">Komentar <span className="text-stone-400">({comments.reduce((count, item) => count + 1 + (item.replies?.length ?? 0), 0)})</span></h2>
          <form onSubmit={handleComment} className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            {replyTo && <div className="mb-3 flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900"><span>Membalas komentar</span><button type="button" onClick={() => setReplyTo(null)} className="font-semibold">Batal</button></div>}
            <label htmlFor="comment" className="mb-2 block text-sm font-semibold text-stone-800">{replyTo ? "Tulis balasan" : "Tulis komentar"}</label>
            <textarea id="comment" required minLength={2} maxLength={3000} rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Bagikan pendapatmu dengan sopan..." className="w-full resize-y rounded-xl border border-stone-300 px-4 py-3 leading-6 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100" />
            <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-stone-500">Maksimal 3.000 karakter</span><button disabled={commentBusy || !commentText.trim()} className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-amber-800 disabled:opacity-50"><ReaderIcon name="send" />{commentBusy ? "Mengirim..." : "Kirim komentar"}</button></div>
          </form>
          {message && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
          <div className="mt-6 space-y-4">{comments.length ? comments.map((comment) => <article key={comment.id} className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600"><ReaderIcon name="user" /></span><div><p className="text-sm font-bold">{displayName(comment)}</p><time className="text-xs text-stone-500">{new Date(comment.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</time></div></div><div className="flex items-center gap-3">{currentUserId === comment.user_id ? <button type="button" onClick={() => void handleDeleteComment(comment.id)} className="text-xs font-semibold text-red-700 hover:text-red-900">Hapus</button> : <button type="button" onClick={() => void handleReport(`/comments/${comment.id}/reports`)} className="text-xs font-semibold text-stone-500 hover:text-red-700">Laporkan</button>}<button type="button" onClick={() => { setReplyTo(comment.id); document.getElementById("comment")?.focus(); }} className="text-xs font-semibold text-sky-800 hover:text-sky-950">Balas</button></div></div><p className="mt-4 whitespace-pre-wrap leading-7 text-stone-700">{comment.body}</p>{comment.replies?.map((reply) => <div key={reply.id} className="ml-5 mt-4 border-l-2 border-sky-200 pl-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{displayName(reply)}</p><time className="text-xs text-stone-500">{new Date(reply.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</time></div>{currentUserId === reply.user_id ? <button type="button" onClick={() => void handleDeleteComment(reply.id)} className="text-xs font-semibold text-red-700">Hapus</button> : <button type="button" onClick={() => void handleReport(`/comments/${reply.id}/reports`)} className="text-xs font-semibold text-stone-500">Laporkan</button>}</div><p className="mt-2 whitespace-pre-wrap leading-7 text-stone-700">{reply.body}</p></div>)}</article>) : <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">Belum ada komentar. Jadilah yang pertama berdiskusi.</p>}</div>
        </section>
      </article>
      <footer className="relative z-10 border-t border-stone-200/80 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-8 text-sm text-stone-500"><ReaderIcon name="book" /> © {new Date().getFullYear()} RuangBaca</div></footer>
    </main>
  );
}
