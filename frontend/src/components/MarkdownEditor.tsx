"use client";

import { useRef, useState } from "react";
import { renderMarkdown } from "@/services/markdown";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  placeholder?: string;
};

export default function MarkdownEditor({ id, value, onChange, required, rows = 12, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState("");

  function wrapSelection(before: string, after = before) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "teks";
    const updated = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(updated);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLine(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    onChange(`${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }

  function insertLink() {
    const url = window.prompt("Masukkan tautan HTTPS untuk artikel:", "https://");
    if (!url || !/^https?:\/\//i.test(url.trim())) return;
    wrapSelection("[", `](${url.trim()})`);
  }

  function insertImage() {
    const url = window.prompt("Masukkan URL gambar HTTPS:", "https://");
    if (!url || !/^https?:\/\//i.test(url.trim())) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.slice(start, end).replace(/[\[\]]/g, "");
    const alt = window.prompt("Deskripsi singkat gambar:", selected || "Gambar artikel") || "Gambar artikel";
    const markdown = `![${alt.replace(/[\[\]]/g, "")}](${url.trim()})`;
    onChange(`${current.slice(0, start)}${markdown}${current.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + markdown.length, start + markdown.length);
    });
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) { setImageMessage("Sesi penulis tidak ditemukan."); return; }
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setUploadingImage(true);
    setImageMessage("");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch(`${API_URL}/media/article-image`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errors ? Object.values(result.errors).flat().join(" ") : result.message || "Gambar gagal diunggah.");
      const alt = window.prompt("Deskripsi singkat gambar:", file.name.replace(/\.[^.]+$/, "")) || "Gambar artikel";
      const markdown = `![${alt.replace(/[\[\]]/g, "")}](${result.url})`;
      const current = textarea.value;
      onChange(`${current.slice(0, start)}${markdown}${current.slice(end)}`);
      setImageMessage("Gambar diunggah dan ditambahkan ke artikel.");
      requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + markdown.length, start + markdown.length); });
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : "Gambar gagal diunggah.");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-300 bg-white transition focus-within:border-amber-600 focus-within:ring-4 focus-within:ring-amber-100">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 p-2">
        <button type="button" onClick={() => prefixLine("## ")} className="rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 hover:bg-amber-100" aria-label="Tambahkan judul bagian">H2</button>
        <button type="button" onClick={() => wrapSelection("**")} className="rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 hover:bg-amber-100" aria-label="Tebalkan teks">B</button>
        <button type="button" onClick={() => wrapSelection("*")} className="rounded-lg px-3 py-1.5 text-sm italic text-stone-700 hover:bg-amber-100" aria-label="Miringkan teks">I</button>
        <button type="button" onClick={() => prefixLine("> ")} className="rounded-lg px-3 py-1.5 text-sm text-stone-700 hover:bg-amber-100" aria-label="Tambahkan kutipan">❞</button>
        <button type="button" onClick={() => prefixLine("- ")} className="rounded-lg px-3 py-1.5 text-sm text-stone-700 hover:bg-amber-100" aria-label="Tambahkan daftar">• Daftar</button>
        <button type="button" onClick={insertLink} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-amber-100" aria-label="Sisipkan tautan">↗ Tautan</button>
        <button type="button" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-amber-100 disabled:opacity-50" aria-label="Unggah gambar ke artikel">▧ {uploadingImage ? "Mengunggah..." : "Unggah gambar"}</button>
        <button type="button" onClick={insertImage} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-amber-100" aria-label="Sisipkan gambar dari URL">URL gambar</button>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
        <span className="flex-1" />
        <button type="button" onClick={() => setPreview((current) => !current)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100" aria-pressed={preview}>{preview ? "Tulis" : "Pratinjau"}</button>
      </div>
      {preview ? (
        <div className="article-markdown min-h-72 p-4 text-stone-800" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p>Pratinjau artikel akan tampil di sini.</p>" }} />
      ) : (
        <textarea ref={textareaRef} id={id} required={required} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="w-full resize-y border-0 bg-transparent px-4 py-3 leading-7 outline-none placeholder:text-stone-400 focus:ring-0" placeholder={placeholder} />
      )}
      {imageMessage && <p role="status" className="border-t border-stone-100 px-4 py-2 text-xs text-amber-800">{imageMessage}</p>}
      <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">Pemformatan: ## judul, **tebal**, *miring*, tautan, gambar HTTPS, &gt; kutipan, - daftar.</p>
    </div>
  );
}
