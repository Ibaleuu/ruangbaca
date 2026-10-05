"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getCoverImageUrl, type Category, type Post } from "@/services/api";
import MarkdownEditor from "@/components/MarkdownEditor";

type EditIconName = "back" | "edit" | "title" | "summary" | "content" | "category" | "status" | "save";

function EditIcon({ name }: { name: EditIconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes: Record<EditIconName, ReactNode> = {
    back: <><path d="m15 18-6-6 6-6" /><path d="M20 12H9" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    title: <><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></>,
    summary: <><path d="M4 6h16M4 12h11M4 18h16" /></>,
    content: <><path d="M4 5h16M4 10h16M4 15h10" /><path d="m17 15 3 3-3 3" /></>,
    category: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    status: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" {...common}>{shapes[name]}</svg>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const NEW_CATEGORY_OPTION = "__new_category__";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [currentCover, setCurrentCover] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [removeCover, setRemoveCover] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [message, setMessage] = useState("Memuat artikel...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const draftKey = `ruangbaca_edit_draft_${slug}`;

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
    async function loadData() {
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
        const headers = {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [postResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_URL}/my/posts/${encodeURIComponent(slug)}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${API_URL}/categories`, {
            headers,
            cache: "no-store",
          }),
        ]);

        if (postResponse.status === 401) {
          sessionStorage.removeItem("blog_token");
          router.replace("/login");
          return;
        }

        if (!postResponse.ok || !categoriesResponse.ok) {
          throw new Error("Data artikel gagal dimuat.");
        }

        const postResult = await postResponse.json();
        const categoriesResult = await categoriesResponse.json();
        const post: Post = postResult.data;

        setTitle(post.title);
        setExcerpt(post.excerpt ?? "");
        setMetaDescription(post.meta_description ?? "");
        setTagsInput(post.tags?.map((tag) => tag.name).join(", ") ?? "");
        setContent(post.content);
        setCurrentCover(post.cover_image_url ?? post.cover_image);
        setCategoryId(post.category ? String(post.category.id) : "");
        setStatus(post.status);
        setCategories(categoriesResult.data);
        setMessage("");
      } catch {
        setMessage("Artikel tidak ditemukan atau gagal dimuat.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router, slug]);

  useEffect(() => {
    if (isLoading) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved) as { title?: string; excerpt?: string; metaDescription?: string; tagsInput?: string; content?: string; categoryId?: string; status?: "draft" | "published"; savedAt?: string };
        if (draft.title || draft.content || draft.excerpt) {
          setTitle(draft.title ?? ""); setExcerpt(draft.excerpt ?? ""); setMetaDescription(draft.metaDescription ?? ""); setTagsInput(draft.tagsInput ?? ""); setContent(draft.content ?? "");
          setCategoryId(draft.categoryId ?? ""); setStatus(draft.status === "published" ? "published" : "draft");
          setDraftSavedAt(draft.savedAt ?? "");
        }
      }
    } catch { localStorage.removeItem(draftKey); }
    setDraftReady(true);
  }, [draftKey, isLoading]);

  useEffect(() => {
    if (!draftReady || isLoading || isSaving) return;
    if (!title.trim() && !excerpt.trim() && !content.trim()) { localStorage.removeItem(draftKey); setDraftSavedAt(""); return; }
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      localStorage.setItem(draftKey, JSON.stringify({ title, excerpt, metaDescription, tagsInput, content, categoryId, status, savedAt }));
      setDraftSavedAt(savedAt);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draftKey, draftReady, isLoading, isSaving, title, excerpt, metaDescription, tagsInput, content, categoryId, status]);

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

    setIsSaving(true);

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

      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("title", title);
      formData.append("excerpt", excerpt);
      formData.append("meta_description", metaDescription);
      formData.append("tags", tagsInput);
      formData.append("content", content);
      formData.append("status", status);
      formData.append("category_id", selectedCategoryId ? String(selectedCategoryId) : "");
      if (coverFile) formData.append("cover_image", coverFile);
      if (removeCover) formData.append("remove_cover_image", "1");

      const response = await fetch(
        `${API_URL}/posts/${encodeURIComponent(slug)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const result = await response.json();

      if (response.status === 401) {
        sessionStorage.removeItem("blog_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const validationMessage = result.errors
          ? Object.values(result.errors).flat().join(" ")
          : result.message;

        setMessage(validationMessage || "Artikel gagal diperbarui.");
        return;
      }

      localStorage.removeItem(draftKey);
      router.push("/admin");
      router.refresh();
    } catch {
      setMessage("Tidak bisa terhubung ke server Laravel.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="edit-page-bg min-h-screen overflow-hidden px-6 py-12 text-stone-900">
        <div className="edit-panel-enter mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-amber-950/5 backdrop-blur">
          <span className="edit-icon-pulse rounded-xl bg-amber-100 p-3 text-amber-800"><EditIcon name="edit" /></span>
          <span>{message}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="edit-page-bg relative min-h-screen overflow-hidden px-6 py-12 text-stone-900">
      <div aria-hidden="true" className="edit-orb edit-orb-one" />
      <div aria-hidden="true" className="edit-orb edit-orb-two" />
      <div className="relative mx-auto max-w-3xl">
        <header className="edit-panel-enter mb-8">
          <Link href="/admin" className="group inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:-translate-x-1 hover:text-amber-950">
            <EditIcon name="back" /> Kembali ke dashboard
          </Link>
          <div className="mt-5 flex items-center gap-4">
            <span className="edit-icon-float rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 p-3 text-white shadow-lg shadow-amber-700/20"><EditIcon name="edit" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-800">RuangBaca · Studio penulis</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Edit artikel</h1>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-stone-600">Perbarui judul, cerita, dan kategori. Perubahanmu akan tersimpan setelah menekan tombol simpan.</p>
          {draftSavedAt && <p className="mt-2 text-xs font-medium text-green-700">Perubahan juga tersimpan otomatis di browser ini · {new Date(draftSavedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>}
        </header>

        {message ? (
          <div className="edit-panel-enter flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
            <span className="rounded-lg bg-red-100 p-2"><EditIcon name="status" /></span>
            {message}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="edit-panel-enter edit-form-card space-y-6 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-stone-900/5 backdrop-blur sm:p-8"
          >
            <div>
              <label htmlFor="title" className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800">
                <span className="text-amber-700"><EditIcon name="title" /></span>
                Judul
              </label>
              <input
                id="title"
                required
                maxLength={255}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white/90 px-4 py-3 transition duration-200 placeholder:text-stone-400 hover:border-amber-400 focus:-translate-y-0.5 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="metaDescription" className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"><span className="text-amber-700"><EditIcon name="summary" /></span>Deskripsi pencarian (SEO)</label><textarea id="metaDescription" rows={3} maxLength={300} value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} className="w-full rounded-xl border border-stone-300 bg-white/90 px-4 py-3 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100" placeholder="Deskripsi yang muncul di mesin pencari (opsional)"/><p className="mt-1 text-xs text-stone-500">{metaDescription.length}/300 karakter</p></div>
              <div><label htmlFor="tags" className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"><span className="text-amber-700"><EditIcon name="category" /></span>Tag artikel</label><input id="tags" maxLength={600} value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} className="w-full rounded-xl border border-stone-300 bg-white/90 px-4 py-3 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100" placeholder="laravel, pemrograman, tutorial"/><p className="mt-1 text-xs text-stone-500">Pisahkan dengan koma, maksimal 10 tag.</p></div>
            </div>

            <div>
              <label
                htmlFor="excerpt"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"
              >
                <span className="text-amber-700"><EditIcon name="summary" /></span>
                Ringkasan
              </label>
              <textarea
                id="excerpt"
                rows={3}
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white/90 px-4 py-3 transition duration-200 placeholder:text-stone-400 hover:border-amber-400 focus:-translate-y-0.5 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div>
              <label
                htmlFor="content"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"
              >
                <span className="text-amber-700"><EditIcon name="content" /></span>
                Isi artikel
              </label>
              <MarkdownEditor id="content" required rows={12} value={content} onChange={setContent} placeholder="Tulis isi artikel di sini" />
            </div>

            <div>
              <label htmlFor="coverImage" className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800">
                <span className="text-amber-700"><EditIcon name="content" /></span>
                Foto sampul <span className="text-xs font-normal text-stone-500">(opsional, maks. 5 MB)</span>
              </label>
              <input id="coverImage" type="file" accept="image/*" onChange={(event) => { setCoverFile(event.target.files?.[0] ?? null); setRemoveCover(false); }} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm transition file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-semibold file:text-amber-900 hover:border-amber-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100" />
              {(coverPreview || (!removeCover && currentCover)) && <div className="mt-4">
                <img src={coverPreview || getCoverImageUrl(currentCover) || ""} alt="Pratinjau foto sampul artikel" className="max-h-64 w-full rounded-2xl border border-stone-200 object-cover shadow-sm" />
                {currentCover && !removeCover && !coverFile && <button type="button" onClick={() => setRemoveCover(true)} className="mt-2 text-sm font-medium text-red-700 transition hover:text-red-900">Hapus foto sampul</button>}
              </div>}
              {removeCover && <p className="mt-2 text-sm text-stone-600">Foto sampul akan dihapus setelah menyimpan perubahan.</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"
                >
                  <span className="text-amber-700"><EditIcon name="category" /></span>
                  Kategori
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 transition duration-200 hover:border-amber-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
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
                    className="mt-3 w-full rounded-xl border border-stone-300 px-4 py-3 transition duration-200 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
                    placeholder="Ketik nama kategori baru"
                  />
                )}
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"
                >
                  <span className="text-amber-700"><EditIcon name="status" /></span>
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as "draft" | "published")
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 transition duration-200 hover:border-amber-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publikasikan</option>
                </select>
              </div>
            </div>

            {message && (
              <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <EditIcon name="status" />
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 px-6 py-3 font-semibold text-white shadow-md shadow-amber-800/20 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-800/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <EditIcon name="save" />
              {isSaving ? "Menyimpan..." : "Simpan perubahan"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
