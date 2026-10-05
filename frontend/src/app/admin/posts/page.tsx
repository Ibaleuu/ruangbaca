"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { Category } from "@/services/api";
import MarkdownEditor from "@/components/MarkdownEditor";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const NEW_CATEGORY_OPTION = "__new_category__";

function FormIcon({ name, className = "h-4 w-4" }: { name: "title" | "summary" | "content" | "category" | "status" | "save"; className?: string }) {
  const props = { "aria-hidden": true as const, viewBox: "0 0 24 24", fill: "none", className, stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "title") return <svg {...props}><path d="M5 5h14M12 5v14M8 19h8"/><path d="M8 9h8"/></svg>;
  if (name === "summary") return <svg {...props}><path d="M5 5h14M5 10h14M5 15h9M5 20h7"/></svg>;
  if (name === "category") return <svg {...props}><path d="M20 13 13 20l-9-9V4h7l9 9Z"/><circle cx="8" cy="8" r="1"/></svg>;
  if (name === "status") return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>;
  if (name === "save") return <svg {...props}><path d="M5 3h12l4 4v14H3V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></svg>;
  return <svg {...props}><path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5"/></svg>;
}

export default function AdminPostsPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [coverFile]);

  useEffect(() => {
    async function loadCategories() {
      const token = sessionStorage.getItem("blog_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!API_URL) {
        setMessage("Alamat API belum dikonfigurasi.");
        return;
      }

      try {
        const [response, accountResponse] = await Promise.all([
          fetch(`${API_URL}/categories`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          }),
          fetch(`${API_URL}/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ]);

        if (!response.ok || !accountResponse.ok) {
          throw new Error("Kategori gagal dimuat.");
        }

        const result = await response.json();
        const account = await accountResponse.json();
        setCategories(result.data);
        setDraftKey(`ruangbaca_draft_${account.user.id}`);
      } catch {
        setMessage("Kategori gagal dimuat dari Laravel.");
      }
    }

    loadCategories();
  }, [router]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved) as { title?: string; excerpt?: string; metaDescription?: string; tagsInput?: string; content?: string; categoryId?: string; newCategoryName?: string; status?: "draft" | "published"; savedAt?: string };
        setTitle(draft.title ?? "");
        setExcerpt(draft.excerpt ?? "");
        setMetaDescription(draft.metaDescription ?? "");
        setTagsInput(draft.tagsInput ?? "");
        setContent(draft.content ?? "");
        setCategoryId(draft.categoryId ?? "");
        setNewCategoryName(draft.newCategoryName ?? "");
        setStatus(draft.status === "published" ? "published" : "draft");
        setDraftSavedAt(draft.savedAt ?? "");
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
    setDraftLoaded(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftLoaded) return;
    const timer = window.setTimeout(() => {
      if (!title.trim() && !excerpt.trim() && !content.trim()) {
        localStorage.removeItem(draftKey);
        setDraftSavedAt("");
        return;
      }
      const savedAt = new Date().toISOString();
      localStorage.setItem(draftKey, JSON.stringify({ title, excerpt, metaDescription, tagsInput, content, categoryId, newCategoryName, status, savedAt }));
      setDraftSavedAt(savedAt);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draftKey, draftLoaded, title, excerpt, metaDescription, tagsInput, content, categoryId, newCategoryName, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const token = sessionStorage.getItem("blog_token");

    if (!token || !API_URL) {
      router.replace("/login");
      return;
    }

    if (categoryId === NEW_CATEGORY_OPTION && newCategoryName.trim() === "") {
      setMessage("Isi nama kategori baru terlebih dahulu.");
      return;
    }

    setIsLoading(true);

    try {
      let selectedCategoryId: number | null =
        categoryId && categoryId !== NEW_CATEGORY_OPTION
          ? Number(categoryId)
          : null;

      if (categoryId === NEW_CATEGORY_OPTION) {
        const categoryResponse = await fetch(`${API_URL}/categories`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newCategoryName.trim(),
            description: null,
          }),
        });

        const categoryResult = await categoryResponse.json();

        if (!categoryResponse.ok) {
          const validationMessage = categoryResult.errors
            ? Object.values(categoryResult.errors).flat().join(" ")
            : categoryResult.message;

          setMessage(validationMessage || "Kategori baru gagal dibuat.");
          return;
        }

        selectedCategoryId = categoryResult.data.id;
      }

      const postResponse = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: (() => {
          const formData = new FormData();
          formData.append("title", title);
          formData.append("excerpt", excerpt);
          formData.append("meta_description", metaDescription);
          formData.append("tags", tagsInput);
          formData.append("content", content);
          formData.append("status", status);
          formData.append("category_id", selectedCategoryId ? String(selectedCategoryId) : "");
          if (coverFile) formData.append("cover_image", coverFile);
          return formData;
        })(),
      });

      const postResult = await postResponse.json();

      if (!postResponse.ok) {
        const validationMessage = postResult.errors
          ? Object.values(postResult.errors).flat().join(" ")
          : postResult.message;

        setMessage(validationMessage || "Artikel gagal dibuat.");
        return;
      }

      setMessage(status === "published"
        ? "Artikel terkirim dan menunggu pemeriksaan moderator sebelum tampil di blog."
        : `Draft artikel berhasil disimpan dengan slug: ${postResult.data.slug}`);
      setTitle("");
      setExcerpt("");
      setMetaDescription("");
      setTagsInput("");
      setContent("");
      setCoverFile(null);
      setCategoryId("");
      setNewCategoryName("");
      setStatus("draft");
      localStorage.removeItem(draftKey);
      setDraftSavedAt("");
    } catch {
      setMessage("Tidak bisa terhubung ke server Laravel.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#fffaf4] px-6 py-12 text-stone-900">
      <style>{`
        @keyframes compose-enter { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes compose-drift { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(22px,-18px,0) scale(1.06); } }
        .compose-enter { animation: compose-enter .6s cubic-bezier(.2,.7,.2,1) both; }
        .compose-field { animation: compose-enter .5s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .compose-enter, .compose-field, .compose-drift, .animate-pulse, .animate-spin { animation: none !important; } }
      `}</style>
      <div aria-hidden="true" className="compose-drift pointer-events-none absolute -right-28 -top-32 -z-10 h-96 w-96 rounded-full bg-amber-200/45 blur-3xl" style={{ animation: "compose-drift 16s ease-in-out infinite" }} />
      <div aria-hidden="true" className="compose-drift pointer-events-none absolute -bottom-40 -left-24 -z-10 h-96 w-96 rounded-full bg-orange-200/35 blur-3xl" style={{ animation: "compose-drift 19s ease-in-out infinite reverse" }} />
      <div className="compose-enter mx-auto max-w-3xl">
        <header className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 transition hover:-translate-x-1 hover:text-amber-900">
            <span aria-hidden="true">←</span> Kembali ke dashboard
          </Link>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-sm"><FormIcon name="content" className="h-6 w-6" /></span>
            Tulis artikel
            <span className="text-amber-600"><FormIcon name="save" className="h-5 w-5 animate-pulse" /></span>
          </h1>
          <p className="mt-2 text-stone-600">Tuangkan ide dan ceritamu untuk dibaca komunitas RuangBaca.</p>
          {draftSavedAt && <p role="status" className="mt-2 text-xs font-medium text-green-700">Draft tersimpan otomatis di browser ini · {new Date(draftSavedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>}
        </header>

        <form
          onSubmit={handleSubmit}
          className="relative space-y-6 overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_-38px_rgba(120,53,15,0.38)] backdrop-blur-sm sm:p-8"
        >
          <div className="compose-field" style={{ animationDelay: "80ms" }}>
            <label htmlFor="title" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
              <FormIcon name="title" />
              Judul
            </label>
            <input
              id="title"
              required
              maxLength={255}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition duration-200 placeholder:text-stone-400 focus:-translate-y-0.5 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              placeholder="Tulis judul artikel"
            />
          </div>

          <div className="compose-field" style={{ animationDelay: "150ms" }}>
            <label htmlFor="excerpt" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
              <FormIcon name="summary" />
              Ringkasan
            </label>
            <textarea
              id="excerpt"
              rows={3}
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition duration-200 placeholder:text-stone-400 focus:-translate-y-0.5 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              placeholder="Ringkasan singkat artikel (opsional)"
            />
          </div>

          <div className="compose-field grid gap-5 sm:grid-cols-2" style={{ animationDelay: "175ms" }}>
            <div><label htmlFor="metaDescription" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"><FormIcon name="summary" />Deskripsi pencarian (SEO)</label><textarea id="metaDescription" rows={3} maxLength={300} value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100" placeholder="Deskripsi singkat yang muncul di mesin pencari (opsional)"/><p className="mt-1 text-xs text-stone-500">{metaDescription.length}/300 karakter</p></div>
            <div><label htmlFor="tags" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"><FormIcon name="category" />Tag artikel</label><input id="tags" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} maxLength={600} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100" placeholder="laravel, pemrograman, tutorial"/><p className="mt-1 text-xs text-stone-500">Pisahkan dengan koma, maksimal 10 tag.</p></div>
          </div>

          <div className="compose-field" style={{ animationDelay: "190ms" }}>
            <label htmlFor="coverImage" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
              <FormIcon name="content" /> Foto sampul <span className="text-xs font-normal text-stone-500">(opsional, maks. 5 MB)</span>
            </label>
            <input id="coverImage" type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm transition file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-semibold file:text-amber-900 hover:border-amber-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100" />
            {coverPreview && <img src={coverPreview} alt="Pratinjau foto sampul" className="mt-4 max-h-64 w-full rounded-2xl border border-stone-200 object-cover shadow-sm" />}
          </div>

          <div className="compose-field" style={{ animationDelay: "220ms" }}>
            <label htmlFor="content" className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
              <FormIcon name="content" />
              Isi artikel
            </label>
            <MarkdownEditor id="content" required rows={12} value={content} onChange={setContent} placeholder="Tulis isi artikel di sini" />
          </div>

          <div className="compose-field grid gap-5 sm:grid-cols-2" style={{ animationDelay: "290ms" }}>
            <div>
              <label
                htmlFor="category"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"
              >
                <FormIcon name="category" />
                Kategori
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition duration-200 focus:-translate-y-0.5 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              >
                <option value="">Tanpa kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY_OPTION}>
                  + Buat kategori baru
                </option>
              </select>

              {categoryId === NEW_CATEGORY_OPTION && (
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  className="compose-field mt-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition duration-200 focus:-translate-y-0.5 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
                  placeholder="Ketik nama kategori baru"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"
              >
                <FormIcon name="status" />
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "draft" | "published")
                }
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition duration-200 focus:-translate-y-0.5 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              >
                <option value="draft">Draft</option>
                <option value="published">Publikasikan</option>
              </select>
            </div>
          </div>

          {message && (
            <p
              role="status"
              className="compose-field rounded-xl border border-stone-200 bg-stone-100 p-3 text-sm text-stone-700"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group inline-flex items-center gap-2 rounded-xl bg-amber-700 px-6 py-3 font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:bg-amber-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FormIcon name="save" className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110" />}
            {isLoading ? "Menyimpan..." : "Simpan artikel"}
          </button>
        </form>
      </div>
    </main>
  );
}
