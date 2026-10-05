"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getCoverImageUrl, type Category, type PaginatedPosts, type Tag } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Account = { name: string; email: string; role: "reader" | "writer" | "admin" };
type AuthorApplicationStatus = "pending" | "rejected" | "approved" | null;
type UserNotice = { id: string; read_at: string | null; data: { title: string; message: string; url?: string } };

function NavIcon({ name }: { name: "article" | "category" | "write" | "profile" | "logout" | "favorite" | "bell" }) {
  const common = { "aria-hidden": true as const, viewBox: "0 0 24 24", fill: "none", className: "h-[18px] w-[18px]", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "article") return <svg {...common}><path d="M6 3.75h8l4 4v12.5H6a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"/><path d="M14 3.75v4h4M8 12h8M8 16h8"/></svg>;
  if (name === "category") return <svg {...common}><path d="M4 4h7v7H4zM15 4h5v5h-5zM15 13h5v7h-5zM4 15h7v5H4z"/></svg>;
  if (name === "write") return <svg {...common}><path d="m14.5 5.5 4 4M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z"/><path d="M13 20h7"/></svg>;
  if (name === "logout") return <svg {...common}><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M16 16l4-4-4-4M20 12H9"/></svg>;
  if (name === "favorite") return <svg {...common}><path d="M20.8 8.7c0 4.2-8.8 10.2-8.8 10.2S3.2 12.9 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"/></svg>;
  if (name === "bell") return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>;
}

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [authorApplicationStatus, setAuthorApplicationStatus] = useState<AuthorApplicationStatus>(null);
  const [notifications, setNotifications] = useState<UserNotice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [posts, setPosts] = useState<PaginatedPosts | null>(null);
  const [category, setCategory] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("Memeriksa akun...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("blog_token");
    if (!savedToken || !API_URL) {
      router.replace("/login");
      return;
    }

    fetch(`${API_URL}/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${savedToken}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sesi login sudah berakhir.");
        const accountResult = await response.json();
        setAccount(accountResult.user);
        setToken(savedToken);
        const headers = { Accept: "application/json", Authorization: `Bearer ${savedToken}` };
        const [categoryResponse, profileResponse, notificationResponse, tagsResponse] = await Promise.all([
          fetch(`${API_URL}/categories`, { headers, cache: "no-store" }),
          fetch(`${API_URL}/author-profile`, { headers, cache: "no-store" }),
          fetch(`${API_URL}/notifications`, { headers, cache: "no-store" }),
          fetch(`${API_URL}/tags`, { headers, cache: "no-store" }),
        ]);
        if (categoryResponse.ok) {
          const result = await categoryResponse.json();
          setCategories(result.data ?? []);
        }
        if (profileResponse.ok) {
          const result = await profileResponse.json();
          setAuthorApplicationStatus(result.data?.status ?? null);
        }
        if (notificationResponse.ok) {
          const notificationResult = await notificationResponse.json();
          setNotifications(notificationResult.data ?? []);
          setUnreadCount(notificationResult.unread_count ?? 0);
        }
        if (tagsResponse.ok) setTags((await tagsResponse.json()).data ?? []);
      })
      .catch(() => {
        sessionStorage.removeItem("blog_token");
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const loadPosts = useCallback(async () => {
    if (!token || !API_URL) return;
    setMessage("Memuat artikel...");
    const params = new URLSearchParams({ per_page: "6", page: String(page), sort });
    if (category) params.set("category", category);
    if (tagSlug) params.set("tag", tagSlug);
    if (search) params.set("search", search);
    if (authorSearch) params.set("author", authorSearch);

    try {
      const response = await fetch(`${API_URL}/posts?${params}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 401) {
        sessionStorage.removeItem("blog_token");
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error("Artikel gagal dimuat.");
      const result: PaginatedPosts = await response.json();
      setPosts(result);
      setMessage(result.total ? `${result.total} artikel` : "Belum ada artikel.");
    } catch {
      setMessage("Tidak bisa mengambil artikel dari server.");
    }
  }, [token, category, tagSlug, page, search, authorSearch, sort, router]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!token || !API_URL) return;
    const refresh = async () => {
      const response = await fetch(`${API_URL}/notifications`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const result = await response.json();
      setNotifications(result.data ?? []);
      setUnreadCount(result.unread_count ?? 0);
    };
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [token]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setAuthorSearch(authorInput.trim());
  }

  async function markNotificationRead(notification: UserNotice) {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) return;
    await fetch(`${API_URL}/notifications/${notification.id}/read`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - (notification.read_at ? 0 : 1)));
    setNotificationsOpen(false);
    router.push(notification.data.url || "/");
  }

  async function markAllNotificationsRead() {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) return;
    await fetch(`${API_URL}/notifications/read-all`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  async function handleLogout() {
    if (token && API_URL) {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    sessionStorage.removeItem("blog_token");
    router.replace("/login");
  }

  if (loading || !token) {
    return <main className="min-h-screen bg-stone-50 p-10 text-stone-700">{message}</main>;
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <style>{`
        @keyframes editorial-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes editorial-glow { 0%, 100% { opacity: .35; } 50% { opacity: .65; } }
        .editorial-rise { animation: editorial-rise .7s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .editorial-rise { animation: none !important; } }
      `}</style>
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <style>{`
          @keyframes nav-enter { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes profile-enter { from { opacity: 0; transform: translateY(-5px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .nav-enter { animation: nav-enter .45s ease-out both; }
          .profile-enter { animation: profile-enter .18s ease-out both; }
          @media (prefers-reduced-motion: reduce) { .nav-enter, .profile-enter { animation: none !important; } }
        `}</style>
        <div className="nav-enter mx-auto flex min-h-[72px] max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-3 sm:px-6">
          <Link href="/" className="shrink-0 text-2xl font-bold tracking-tight transition-transform duration-200 hover:scale-[1.03]">Ruang<span className="text-amber-600">Baca</span></Link>
          <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-1.5 text-sm font-medium sm:gap-2">
            <a href="#artikel" className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-50 hover:text-amber-800"><NavIcon name="article" />Artikel</a>
            <a href="#kategori" className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-50 hover:text-amber-800"><NavIcon name="category" />Kategori</a>
            <Link href="/favorites" className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-50 hover:text-rose-700"><NavIcon name="favorite" />Favorit</Link>
            <Link href="/reading-history" className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-800"><NavIcon name="article" />Bacaan terakhir</Link>
            {account?.role === "admin" ? <Link href="/admin/moderation" className="group flex items-center gap-2 rounded-xl bg-stone-800 px-3 py-2.5 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-900"><NavIcon name="profile" />Moderasi</Link> : account?.role === "writer" ? <Link href="/admin" className="group flex items-center gap-2 rounded-xl bg-amber-700 px-3 py-2.5 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-800"><NavIcon name="write" />Dashboard</Link> : <Link href="/author/profile" className="group flex items-center gap-2 rounded-xl bg-amber-700 px-3 py-2.5 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-800 hover:shadow-md"><NavIcon name={authorApplicationStatus === "pending" ? "article" : "write"} />{authorApplicationStatus === "pending" ? "Pengajuan ditinjau" : authorApplicationStatus === "rejected" ? "Perbaiki biodata" : "Jadi penulis"}</Link>}
            <div className="relative">
              <button type="button" aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-xl p-2.5 text-stone-600 transition hover:bg-amber-50 hover:text-amber-800"><NavIcon name="bell" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
              {notificationsOpen && <div className="profile-enter absolute right-0 top-full z-50 mt-3 w-[min(22rem,90vw)] rounded-2xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-900/10">
                <div className="flex items-center justify-between px-2 py-1"><h2 className="font-bold">Notifikasi</h2><button type="button" disabled={!unreadCount} onClick={() => void markAllNotificationsRead()} className="text-xs font-semibold text-amber-800 disabled:text-stone-400">Tandai dibaca</button></div>
                <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">{notifications.length ? notifications.map((notification) => <button key={notification.id} type="button" onClick={() => void markNotificationRead(notification)} className={`block w-full rounded-xl p-3 text-left transition hover:bg-amber-50 ${notification.read_at ? "" : "bg-amber-50/70"}`}><span className="block text-sm font-semibold">{notification.data.title}</span><span className="mt-1 block text-xs leading-5 text-stone-600">{notification.data.message}</span></button>) : <p className="p-4 text-center text-sm text-stone-500">Belum ada notifikasi.</p>}</div>
              </div>}
            </div>
            <div className="relative ml-1">
              <button type="button" aria-expanded={profileOpen} aria-label="Buka profil akun" onClick={() => setProfileOpen((open) => !open)} className="flex max-w-[190px] items-center gap-2 rounded-full border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-700 text-white"><NavIcon name="profile" /></span>
                <span className="min-w-0"><span className="block truncate text-xs font-semibold text-stone-800">{account?.name ?? "Akun"}</span><span className="block text-[10px] text-stone-500">{account?.role === "admin" ? "Admin" : account?.role === "writer" ? "Penulis" : "Pembaca"}</span></span>
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
              </button>
              {profileOpen && <div className="profile-enter absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl shadow-stone-900/10">
                <p className="truncate font-semibold text-stone-900">{account?.name}</p>
                <p className="mt-1 break-all text-xs text-stone-500">{account?.email}</p>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"><NavIcon name="profile" />{account?.role === "admin" ? "Administrator" : account?.role === "writer" ? "Akun penulis" : "Akun pembaca"}</div>
                <Link href="/account/security" onClick={() => setProfileOpen(false)} className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 hover:text-amber-800">Keamanan akun</Link>
              </div>}
            </div>
            <button onClick={handleLogout} className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-stone-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-700"><NavIcon name="logout" /><span className="hidden sm:inline">Keluar</span></button>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl overflow-hidden px-6 py-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" style={{ animation: "editorial-glow 8s ease-in-out infinite" }} />
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Cerita, ide, dan wawasan</p>
        <h1 className="relative max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Temukan bacaan yang membuatmu <span className="text-amber-700">terus berkembang.</span></h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Selamat datang di RuangBaca. Pilih kategori atau cari artikel yang ingin kamu baca.</p>
        <form onSubmit={handleSearch} className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari judul atau isi artikel..." className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" />
          <input type="search" value={authorInput} onChange={(event) => setAuthorInput(event.target.value)} placeholder="Nama penulis" className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" />
          <button className="rounded-xl bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800">Cari</button>
          <select aria-label="Urutkan artikel" value={sort} onChange={(event) => { setSort(event.target.value as "latest" | "popular"); setPage(1); }} className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"><option value="latest">Terbaru</option><option value="popular">Populer</option></select>
        </form>
      </section>

      {posts && posts.data.length > 0 && <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="mb-5 flex items-end justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Pilihan untukmu</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Cerita yang sedang menarik</h2></div>
          <a href="#artikel" className="hidden text-sm font-semibold text-amber-700 transition hover:translate-x-1 sm:inline-block">Semua artikel →</a>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr] lg:grid-rows-2">
          {posts.data.slice(0, 3).map((post, index) => <Link
            key={`featured-${post.id}`}
            href={`/posts/${post.slug}`}
            style={{ animationDelay: `${index * 110}ms` }}
            className={`editorial-rise group relative isolate min-h-[210px] overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-800 via-amber-950 to-stone-950 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-[430px]" : "lg:min-h-[208px]"}`}
          >
            {post.cover_image ? <img src={getCoverImageUrl(post.cover_image_url ?? post.cover_image) ?? ""} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div aria-hidden="true" className={`absolute inset-0 -z-10 bg-gradient-to-br ${index === 0 ? "from-orange-300 via-rose-950 to-slate-950" : index === 1 ? "from-sky-300 via-indigo-900 to-slate-950" : "from-emerald-300 via-teal-900 to-slate-950"}`}>
              <div className="absolute -right-8 -top-14 h-56 w-56 rounded-full border border-white/20 transition duration-700 group-hover:scale-110" />
              <div className="absolute -right-2 top-8 h-40 w-40 rounded-full border border-white/15" />
              <svg viewBox="0 0 200 140" className="absolute bottom-5 right-8 h-32 w-44 text-white/25 transition duration-500 group-hover:-translate-y-2" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 115 78 34l32 40 22-26 53 67H15Z"/><circle cx="148" cy="30" r="12" fill="currentColor" stroke="none"/><path d="M25 126h150"/></svg>
              <span className="absolute right-8 top-8 text-7xl font-black tracking-tighter text-white/10 sm:text-8xl">RB</span>
            </div>}
            <div className="absolute inset-0 -z-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7">
              {post.category && <span className="mb-3 inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{post.category.name}</span>}
              <h3 className={`max-w-2xl font-bold leading-tight text-white transition-colors group-hover:text-amber-200 ${index === 0 ? "text-2xl sm:text-4xl" : "text-xl"}`}>{post.title}</h3>
              <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-white/75">{post.excerpt || post.content.slice(0, 120)}</p>
            </div>
          </Link>)}
        </div>
        <div className="mt-5 flex items-center gap-3 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-700">
          <span className="shrink-0 rounded-md bg-amber-700 px-3 py-1 font-bold text-white">RUANG BACA</span>
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-600" />
          <span className="truncate">Temukan ide baru dari artikel pilihan para penulis.</span>
        </div>
      </section>}

      <section id="kategori" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Jelajahi</p>
        <h2 className="mt-2 text-2xl font-bold">Kategori</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => { setCategory(""); setTagSlug(""); setPage(1); }} className={`rounded-full border px-4 py-2 text-sm font-medium ${!category && !tagSlug ? "border-amber-700 bg-amber-700 text-white" : "border-stone-300 bg-white text-stone-700"}`}>Semua</button>
          {categories.map((item) => <button key={item.id} onClick={() => { setCategory(item.slug); setTagSlug(""); setPage(1); }} className={`rounded-full border px-4 py-2 text-sm font-medium ${category === item.slug ? "border-amber-700 bg-amber-700 text-white" : "border-stone-300 bg-white text-stone-700"}`}>{item.name}</button>)}
        </div>
        {tags.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Tag</span>{tags.map((item) => <button key={item.id} onClick={() => { setCategory(""); setTagSlug(tagSlug === item.slug ? "" : item.slug); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${tagSlug === item.slug ? "border-sky-700 bg-sky-700 text-white" : "border-sky-200 bg-white text-sky-800 hover:-translate-y-0.5 hover:bg-sky-50"}`}>#{item.name}</button>)}</div>}
      </section>

      <section id="artikel" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-20">
        <div className="mb-7 flex items-end justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Bacaan terbaru</p><h2 className="mt-2 text-2xl font-bold">Artikel</h2></div>
          <span className="text-sm text-stone-500">{posts ? `${posts.total} artikel` : message}</span>
        </div>
        {posts && posts.data.length > 0 ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.data.map((post) => <article key={post.id} className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            {post.cover_image && <Link href={`/posts/${post.slug}`} className="overflow-hidden"><img src={getCoverImageUrl(post.cover_image_url ?? post.cover_image) ?? ""} alt={`Sampul ${post.title}`} className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></Link>}
            <div className="flex flex-1 flex-col p-6"><div className="mb-4">{post.category && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{post.category.name}</span>}</div>
            <h3 className="text-xl font-bold leading-snug">{post.title}</h3>
            <p className="mt-3 flex-1 leading-7 text-stone-600">{post.excerpt || post.content.slice(0, 140)}</p>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
              {post.user ? <Link href={`/authors/${post.user.id}`} className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-amber-800"><span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-100 text-xs font-bold text-amber-800">{post.user.author_profile?.avatar_url ? <img src={post.user.author_profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (post.user.author_profile?.pen_name || post.user.name).slice(0, 1).toUpperCase()}</span><span className="truncate">{post.user.author_profile?.pen_name || post.user.name}</span></Link> : <span />}
              <time className="shrink-0 text-xs text-stone-500">{post.published_at ? new Date(post.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}</time>
              <Link href={`/posts/${post.slug}`} className="text-sm font-semibold text-amber-700 hover:text-amber-900">Baca artikel →</Link>
            </div></div>
          </article>)}
        </div> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-600">{message}</div>}
        {posts && posts.last_page > 1 && <div className="mt-8 flex items-center justify-center gap-4">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-stone-300 bg-white px-4 py-2 disabled:opacity-40">← Sebelumnya</button>
          <span className="text-sm text-stone-600">Halaman {posts.current_page} dari {posts.last_page}</span>
          <button disabled={page >= posts.last_page} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-stone-300 bg-white px-4 py-2 disabled:opacity-40">Berikutnya →</button>
        </div>}
      </section>

      <footer className="border-t border-stone-200 bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-stone-500"><span>© {new Date().getFullYear()} RuangBaca</span><nav aria-label="Informasi RuangBaca" className="flex flex-wrap gap-4"><Link className="transition hover:text-amber-800" href="/archive">Arsip</Link><Link className="transition hover:text-amber-800" href="/community-guidelines">Panduan komunitas</Link><Link className="transition hover:text-amber-800" href="/privacy">Privasi</Link><Link className="transition hover:text-amber-800" href="/contact">Hubungi pengelola</Link></nav></div></footer>
    </main>
  );
}
