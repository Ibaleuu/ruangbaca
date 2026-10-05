"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("blog_token");
    if (!token || !API_URL) {
      router.replace("/login");
      return;
    }

    fetch(`${API_URL}/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sesi berakhir.");
        const result = await response.json();
        const isModeration = pathname.startsWith("/admin/moderation");
        if (result.user?.role === "admin") {
          if (!isModeration) router.replace("/admin/moderation");
          else setAuthorized(true);
          return;
        }
        if (result.user?.role !== "writer") {
          router.replace("/author/profile");
          return;
        }
        if (isModeration) {
          router.replace("/admin");
          return;
        }
        setAuthorized(true);
      })
      .catch(() => {
        sessionStorage.removeItem("blog_token");
        router.replace("/login");
      });
  }, [router, pathname]);

  if (!authorized) {
    return <main className="min-h-screen bg-stone-50 p-10 text-stone-700">Memeriksa akses penulis...</main>;
  }

  return children;
}
