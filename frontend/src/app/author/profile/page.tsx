"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Profile = { pen_name: string; phone: string; bio: string; avatar_url?: string | null; status: "pending" | "approved" | "rejected"; review_note?: string | null } | null;

export default function AuthorProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [penName, setPenName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [message, setMessage] = useState("Memeriksa akun...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [profileStatus, setProfileStatus] = useState<Profile>(null);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("blog_token");
    if (!savedToken || !API_URL) {
      router.replace("/login");
      return;
    }
    setToken(savedToken);

    Promise.all([
      fetch(`${API_URL}/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${savedToken}` } }),
      fetch(`${API_URL}/author-profile`, { headers: { Accept: "application/json", Authorization: `Bearer ${savedToken}` } }),
    ])
      .then(async ([accountResponse, profileResponse]) => {
        if (!accountResponse.ok || !profileResponse.ok) throw new Error("Sesi login sudah berakhir.");
        const account = await accountResponse.json();
        if (account.user?.role === "writer") {
          router.replace("/admin");
          return;
        }
        const profileResult: { data: Profile } = await profileResponse.json();
        if (profileResult.data) {
          setProfileStatus(profileResult.data);
          setPenName(profileResult.data.pen_name);
          setPhone(profileResult.data.phone);
          setBio(profileResult.data.bio);
          setCurrentAvatar(profileResult.data.avatar_url ?? null);
        }
        setMessage("");
      })
      .catch(() => {
        sessionStorage.removeItem("blog_token");
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(""); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!API_URL || !token) return;
    setSaving(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("pen_name", penName);
      formData.append("phone", phone);
      formData.append("bio", bio);
      if (avatarFile) formData.append("avatar", avatarFile);
      if (removeAvatar) formData.append("remove_avatar", "1");
      const response = await fetch(`${API_URL}/author-profile`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        const errors = result.errors ? Object.values(result.errors).flat().join(" ") : "";
        throw new Error(errors || result.message || "Biodata gagal disimpan.");
      }
      setSuccess(result.message || "Pengajuan terkirim. Tunggu pemeriksaan admin.");
      setProfileStatus(result.data);
      setCurrentAvatar(result.data.avatar_url ?? null);
      setAvatarFile(null);
      setRemoveAvatar(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Biodata gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-stone-50 p-10 text-stone-700">{message}</main>;

  return (
    <main className="edit-page-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 text-stone-900">
      <div aria-hidden="true" className="edit-orb edit-orb-one" /><div aria-hidden="true" className="edit-orb edit-orb-two" />
      <section className="page-enter page-card relative w-full max-w-2xl rounded-3xl border border-stone-200 bg-white/95 p-8 shadow-lg">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 transition hover:-translate-x-1">← Kembali ke bacaan</Link>
        <div className="mt-8 flex items-center gap-4"><span className="edit-icon-float rounded-2xl bg-amber-100 p-3 text-amber-800"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0M19 8h3m-1.5-1.5v3"/></svg></span><div><p className="text-sm font-semibold uppercase tracking-widest text-amber-700">Langkah sebelum menulis</p>
        <h1 className="mt-1 text-3xl font-bold">Lengkapi biodata penulis</h1></div></div>
        <p className="mt-3 text-stone-600">Biodata ini ditampilkan sebagai profil penulis. Isi nama pena, nomor kontak, dan perkenalan singkat.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="avatar" className="mb-2 block text-sm font-medium">Foto profil (opsional, maks. 2 MB)</label>
            <div className="flex flex-wrap items-center gap-4">
              {(avatarPreview || (!removeAvatar && currentAvatar)) ? <img src={avatarPreview || currentAvatar || ""} alt="Pratinjau foto profil" className="h-20 w-20 rounded-full border border-stone-200 object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-800">{penName.trim().slice(0, 1).toUpperCase() || "P"}</span>}
              <div><input id="avatar" type="file" accept="image/*" onChange={(event) => { setAvatarFile(event.target.files?.[0] ?? null); setRemoveAvatar(false); }} className="max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-semibold file:text-amber-900" />{currentAvatar && <button type="button" onClick={() => { setRemoveAvatar(true); setAvatarFile(null); }} className="mt-2 block text-sm font-medium text-red-700">Hapus foto</button>}</div>
            </div>
          </div>
          <div>
            <label htmlFor="penName" className="mb-2 block text-sm font-medium">Nama pena</label>
            <input id="penName" required maxLength={100} value={penName} onChange={(event) => setPenName(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" placeholder="Nama yang akan tampil di artikel" />
          </div>
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium">Nomor telepon</label>
            <input id="phone" type="tel" required maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" placeholder="Contoh: 081234567890" />
          </div>
          <div>
            <label htmlFor="bio" className="mb-2 block text-sm font-medium">Tentang penulis</label>
            <textarea id="bio" required minLength={20} maxLength={2000} rows={5} value={bio} onChange={(event) => setBio(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100" placeholder="Ceritakan minat dan pengalamanmu sebagai penulis (minimal 20 karakter)." />
          </div>
          {message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
          {profileStatus?.status === "pending" && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Pengajuan penulis sedang ditinjau admin. Kamu bisa memperbarui biodata sebelum disetujui.</p>}
          {profileStatus?.status === "rejected" && <p role="status" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">Pengajuan sebelumnya perlu diperbaiki.{profileStatus.review_note ? ` Catatan: ${profileStatus.review_note}` : ""}</p>}
          {success && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">{success}</p>}
          <button disabled={saving} className="rounded-xl bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-60">{saving ? "Mengirim..." : profileStatus?.status === "approved" ? "Perbarui biodata" : "Kirim pengajuan penulis"}</button>
        </form>
      </section>
    </main>
  );
}
