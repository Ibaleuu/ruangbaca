"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Application = {
  id: number;
  pen_name: string;
  phone: string;
  bio: string;
  created_at: string;
  user: { name: string; email: string };
};
type PendingPost = {
  id: number;
  title: string;
  excerpt: string | null;
  content: string;
  created_at: string;
  user: { name: string };
  category: { name: string } | null;
};
type PendingComment = {
  id: number;
  body: string;
  created_at: string;
  user: { name: string };
  post: { title: string; slug: string };
};
type Report = {
  id: number;
  reason: string;
  details: string | null;
  reportable_type: string;
  reportable_id: number;
  reportable: { id: number; title?: string; body?: string; slug?: string } | null;
  reporter: { name: string };
};
type Queue = {
  applications: Application[];
  posts: PendingPost[];
  comments: PendingComment[];
  reports: Report[];
  counts: { applications: number; posts: number; comments: number; reports: number };
};
type ModerationEvent = { id: number; action: string; subject_label: string; note: string | null; created_at: string; admin: { name: string } | null };
type IconName = "users" | "article" | "comment" | "flag" | "refresh" | "check" | "close" | "book" | "empty";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    "aria-hidden": true as const,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  const paths: Record<IconName, ReactNode> = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    article: <><path d="M5 3h11l4 4v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M15 3v5h5M8 12h8M8 16h8" /></>,
    comment: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.5-.8L4 20l1.3-4A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h8M8 14h5" /></>,
    flag: <><path d="M5 21V4" /><path d="M5 4c6-4 8 4 14 0v11c-6 4-8-4-14 0" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></>,
    empty: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const card = "rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-[0_14px_40px_-30px_rgba(41,37,36,.32)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg";
const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export default function ModerationPage() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [message, setMessage] = useState("Memuat antrean moderasi...");
  const [busy, setBusy] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState<ModerationEvent[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);

  const loadQueue = useCallback(async () => {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) return;
    try {
      const params = new URLSearchParams();
      if (queueSearch.trim()) params.set("search", queueSearch.trim());
      const response = await fetch(`${API_URL}/admin/moderation?${params.toString()}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Antrean moderasi gagal dimuat.");
      setQueue(result);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Antrean moderasi gagal dimuat.");
    }
  }, [queueSearch]);

  const loadHistory = useCallback(async () => {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) return;
    try {
      const params = new URLSearchParams();
      if (historySearch.trim()) params.set("search", historySearch.trim());
      params.set("page", String(historyPage));
      const response = await fetch(`${API_URL}/admin/moderation/history?${params}`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      setHistory(result.data ?? []);
      setHistoryLastPage(result.last_page ?? 1);
    } catch { /* History should not block current moderation queues. */ }
  }, [historySearch, historyPage]);

  useEffect(() => { void loadQueue(); }, [loadQueue]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function action(key: string, path: string, method = "POST", body?: object) {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) return;
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Tindakan gagal.");
      setMessage(result.message || "Perubahan disimpan.");
      await Promise.all([loadQueue(), loadHistory()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tindakan gagal.");
    } finally {
      setBusy("");
    }
  }

  function rejectReason() {
    const reason = window.prompt("Alasan penolakan (minimal 5 karakter):");
    if (reason === null) return null;
    if (reason.trim().length < 5) { window.alert("Tuliskan alasan yang jelas, minimal 5 karakter."); return null; }
    return reason.trim();
  }

  const summaries: { label: string; count: number; icon: IconName; tint: string }[] = queue ? [
    { label: "Pengajuan penulis", count: queue.counts.applications, icon: "users", tint: "bg-violet-100 text-violet-700" },
    { label: "Artikel menunggu", count: queue.counts.posts, icon: "article", tint: "bg-amber-100 text-amber-800" },
    { label: "Komentar menunggu", count: queue.counts.comments, icon: "comment", tint: "bg-sky-100 text-sky-700" },
    { label: "Laporan terbuka", count: queue.counts.reports, icon: "flag", tint: "bg-rose-100 text-rose-700" },
  ] : [];

  return (
    <main className="moderation-page relative isolate min-h-screen overflow-hidden bg-[#fffaf4] px-5 py-10 text-stone-900 sm:px-8">
      <style>{`
        @keyframes moderation-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes moderation-drift { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(24px,-20px,0) scale(1.07); } }
        @keyframes moderation-pulse { 0%, 100% { opacity: .45; } 50% { opacity: .8; } }
        .moderation-rise { animation: moderation-rise .55s cubic-bezier(.2,.7,.2,1) both; }
        .moderation-card { animation: moderation-rise .5s cubic-bezier(.2,.7,.2,1) both; }
        .moderation-drift { animation: moderation-drift 17s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .moderation-rise, .moderation-card, .moderation-drift, .moderation-page * { animation: none !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
        }
      `}</style>
      <div aria-hidden="true" className="moderation-drift pointer-events-none absolute -right-36 -top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-amber-200/50 blur-3xl" />
      <div aria-hidden="true" className="moderation-drift pointer-events-none absolute -bottom-44 -left-32 -z-10 h-[30rem] w-[30rem] rounded-full bg-orange-200/40 blur-3xl" style={{ animationDelay: "-7s" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.85),transparent_65%)]" />

      <div className="mx-auto max-w-6xl">
        <header className="moderation-rise mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <Link href="/" className="group inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:-translate-x-1">
              <span aria-hidden="true" className="transition-transform group-hover:-translate-x-1">←</span> Lihat RuangBaca
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-lg shadow-amber-900/15"><Icon name="book" className="h-6 w-6" /></span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pusat moderasi</h1>
                <p className="mt-1 text-stone-600">Tinjau pengajuan penulis, artikel, komentar, dan laporan.</p>
              </div>
              <span aria-hidden="true" className="hidden text-amber-500 sm:block"><Icon name="check" className="h-6 w-6 animate-pulse" /></span>
            </div>
          </div>
          <button onClick={() => void loadQueue()} className={`${button} border border-stone-300 bg-white/90 text-stone-700 shadow-sm hover:border-amber-300 hover:bg-amber-50`}>
            <Icon name="refresh" className="h-4 w-4 transition-transform duration-500 hover:rotate-180" /> Muat ulang
          </button>
        </header>

        <div className="moderation-rise mb-6 flex flex-wrap gap-3" style={{ animationDelay: "70ms" }}>
          <input aria-label="Cari antrean moderasi" type="search" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Cari penulis, artikel, komentar, atau laporan..." className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white/90 px-4 py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
          <button type="button" onClick={() => void loadQueue()} className={`${button} border border-stone-300 bg-white text-stone-700 hover:bg-amber-50`}><Icon name="refresh" className="h-4 w-4" />Cari antrean</button>
        </div>

        {message && <p role="status" className="moderation-rise mb-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm">{message}</p>}

        {queue && <>
          <div className="mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaries.map((item, index) => (
              <article key={item.label} style={{ animationDelay: `${index * 90}ms` }} className={`${card} moderation-card group flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tint} transition duration-300 group-hover:rotate-6 group-hover:scale-110`}><Icon name={item.icon} /></span>
                  <span className="text-sm font-medium text-stone-600">{item.label}</span>
                </div>
                <strong className="text-3xl font-bold tabular-nums text-amber-800">{item.count}</strong>
              </article>
            ))}
          </div>

          <section className="moderation-rise mb-9" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><span className="text-violet-700"><Icon name="users" /></span> Pengajuan penulis <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800">{queue.applications.length}</span></h2>
            {queue.applications.length ? <div className="grid gap-4 md:grid-cols-2">{queue.applications.map((app, index) => <article style={{ animationDelay: `${index * 70}ms` }} className={`moderation-card ${card}`} key={app.id}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{app.pen_name}</h3><p className="text-sm text-stone-500">{app.user?.name} · {app.user?.email}</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />Menunggu</span></div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-700">{app.bio}</p><p className="mt-3 text-sm text-stone-500">Kontak: {app.phone}</p>
              <div className="mt-5 flex gap-2"><button disabled={!!busy} onClick={() => void action(`author-${app.id}`, `/admin/author-applications/${app.id}/approve`)} className={`${button} bg-green-700 text-white shadow-sm hover:bg-green-800`}><Icon name="check" className="h-4 w-4" />Setujui</button><button disabled={!!busy} onClick={() => { const reason = rejectReason(); if (reason !== null) void action(`author-${app.id}`, `/admin/author-applications/${app.id}/reject`, "POST", { reason }); }} className={`${button} bg-red-50 text-red-800 hover:bg-red-100`}><Icon name="close" className="h-4 w-4" />Tolak</button></div>
            </article>)}</div> : <p className={`${card} flex items-center gap-3 text-sm text-stone-500`}><Icon name="empty" className="h-5 w-5 text-stone-400" />Tidak ada pengajuan baru.</p>}
          </section>

          <section className="moderation-rise mb-9" style={{ animationDelay: "200ms" }}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><span className="text-amber-700"><Icon name="article" /></span> Artikel untuk diperiksa <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">{queue.posts.length}</span></h2>
            {queue.posts.length ? <div className="space-y-3">{queue.posts.map((post, index) => <article style={{ animationDelay: `${index * 70}ms` }} className={`moderation-card ${card} flex flex-wrap items-start justify-between gap-4`} key={post.id}><div className="min-w-0 flex-1"><h3 className="text-lg font-bold">{post.title}</h3><p className="mt-1 text-sm text-stone-500">Oleh {post.user?.name}{post.category ? ` · ${post.category.name}` : ""}</p><p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-stone-700">{post.content}</p></div><div className="flex shrink-0 gap-2"><button disabled={!!busy} onClick={() => void action(`post-${post.id}`, `/admin/posts/${post.id}/review`, "POST", { decision: "approve" })} className={`${button} bg-green-700 text-white hover:bg-green-800`}><Icon name="check" className="h-4 w-4" />Terbitkan</button><button disabled={!!busy} onClick={() => { const reason = rejectReason(); if (reason !== null) void action(`post-${post.id}`, `/admin/posts/${post.id}/review`, "POST", { decision: "reject", reason }); }} className={`${button} bg-red-50 text-red-800 hover:bg-red-100`}><Icon name="close" className="h-4 w-4" />Kembalikan</button></div></article>)}</div> : <p className={`${card} flex items-center gap-3 text-sm text-stone-500`}><Icon name="empty" className="h-5 w-5 text-stone-400" />Tidak ada artikel menunggu moderasi.</p>}
          </section>

          <section className="moderation-rise mb-9" style={{ animationDelay: "280ms" }}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><span className="text-sky-700"><Icon name="comment" /></span> Komentar untuk diperiksa <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">{queue.comments.length}</span></h2>
            {queue.comments.length ? <div className="space-y-3">{queue.comments.map((comment, index) => <article style={{ animationDelay: `${index * 70}ms` }} key={comment.id} className={`moderation-card ${card} flex flex-wrap items-start justify-between gap-4`}><div><p className="text-sm text-stone-500">{comment.user?.name} pada artikel <strong className="text-stone-800">{comment.post?.title}</strong></p><p className="mt-3 whitespace-pre-wrap text-stone-700">{comment.body}</p></div><div className="flex gap-2"><button disabled={!!busy} onClick={() => void action(`comment-${comment.id}`, `/admin/comments/${comment.id}/review`, "POST", { decision: "approve" })} className={`${button} bg-green-700 text-white hover:bg-green-800`}><Icon name="check" className="h-4 w-4" />Setujui</button><button disabled={!!busy} onClick={() => void action(`comment-${comment.id}`, `/admin/comments/${comment.id}/review`, "POST", { decision: "reject" })} className={`${button} bg-red-50 text-red-800 hover:bg-red-100`}><Icon name="close" className="h-4 w-4" />Tolak</button></div></article>)}</div> : <p className={`${card} flex items-center gap-3 text-sm text-stone-500`}><Icon name="empty" className="h-5 w-5 text-stone-400" />Tidak ada komentar menunggu.</p>}
          </section>

          <section className="moderation-rise" style={{ animationDelay: "360ms" }}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><span className="text-rose-700"><Icon name="flag" /></span> Laporan konten <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">{queue.reports.length}</span></h2>
            {queue.reports.length ? <div className="space-y-3">{queue.reports.map((report, index) => {
              const isComment = report.reportable_type?.endsWith("Comment");
              const targetText = report.reportable?.title || report.reportable?.body || "Konten sudah tidak tersedia";
              return <article style={{ animationDelay: `${index * 70}ms` }} className={`moderation-card ${card} flex flex-wrap items-center justify-between gap-4`} key={report.id}>
                <div><p className="text-sm font-semibold">{isComment ? "Komentar" : "Artikel"} dilaporkan oleh {report.reporter?.name}</p><p className="mt-1 font-medium">{targetText}</p><p className="mt-1 text-sm text-stone-500">Alasan: {report.reason}{report.details ? ` — ${report.details}` : ""}</p></div>
                <div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={() => void action(`report-${report.id}`, `/admin/reports/${report.id}/resolve`, "POST", { status: "dismissed" })} className={`${button} border border-stone-300 text-stone-700 hover:bg-stone-100`}>Tutup laporan</button>{isComment && report.reportable && <button disabled={!!busy} onClick={() => { if (window.confirm("Hapus komentar yang dilaporkan?")) void action(`report-${report.id}`, `/admin/comments/${report.reportable!.id}`, "DELETE"); }} className={`${button} bg-red-50 text-red-800 hover:bg-red-100`}><Icon name="close" className="h-4 w-4" />Hapus komentar</button>}{!isComment && report.reportable && <button disabled={!!busy} onClick={() => { if (window.confirm("Tarik artikel ini dari halaman publik?")) void action(`report-${report.id}`, `/admin/posts/${report.reportable!.id}/review`, "POST", { decision: "reject", reason: "Ditinjau setelah laporan konten." }); }} className={`${button} bg-red-50 text-red-800 hover:bg-red-100`}><Icon name="close" className="h-4 w-4" />Tarik artikel</button>}<button disabled={!!busy} onClick={() => void action(`report-${report.id}`, `/admin/reports/${report.id}/resolve`, "POST", { status: "resolved" })} className={`${button} bg-green-50 text-green-800 hover:bg-green-100`}><Icon name="check" className="h-4 w-4" />Tandai selesai</button></div>
              </article>;
            })}</div> : <p className={`${card} flex items-center gap-3 text-sm text-stone-500`}><Icon name="empty" className="h-5 w-5 text-stone-400" />Tidak ada laporan terbuka.</p>}
          </section>

          <section className="moderation-rise mt-10" style={{ animationDelay: "430ms" }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><span className="text-stone-700"><Icon name="book" /></span> Riwayat moderasi</h2><input aria-label="Cari riwayat moderasi" type="search" value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setHistoryPage(1); }} placeholder="Cari riwayat..." className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100" /></div>
            <div className="space-y-2">{history.length ? history.map((event) => <article key={event.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}><div><p className="font-semibold">{event.subject_label}</p><p className="mt-1 text-sm text-stone-600">{event.action.replaceAll("_", " ")} · oleh {event.admin?.name || "Admin"}</p>{event.note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">Catatan: {event.note}</p>}</div><time className="text-xs text-stone-500">{new Date(event.created_at).toLocaleString("id-ID")}</time></article>) : <p className={`${card} text-sm text-stone-500`}>Belum ada riwayat yang cocok.</p>}</div>
            {historyLastPage > 1 && <div className="mt-4 flex items-center justify-center gap-3"><button disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => page - 1)} className={`${button} border border-stone-300 bg-white disabled:opacity-40`}>← Sebelumnya</button><span className="text-sm text-stone-600">Halaman {historyPage} dari {historyLastPage}</span><button disabled={historyPage >= historyLastPage} onClick={() => setHistoryPage((page) => page + 1)} className={`${button} border border-stone-300 bg-white disabled:opacity-40`}>Berikutnya →</button></div>}
          </section>
        </>}
      </div>
    </main>
  );
}
