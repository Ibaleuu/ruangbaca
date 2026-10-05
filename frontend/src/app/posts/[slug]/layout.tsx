import type { Metadata } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type SeoPost = { title: string; description: string; image?: string | null; slug: string };

export async function generateMetadata({ params }: LayoutProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!apiUrl) return { title: "Artikel — RuangBaca" };
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/seo/posts/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!response.ok) return { title: "Artikel — RuangBaca" };
    const { data }: { data: SeoPost } = await response.json();
    const canonical = new URL(`/posts/${encodeURIComponent(data.slug)}`, siteUrl).toString();
    return {
      title: data.title,
      description: data.description,
      alternates: { canonical },
      openGraph: { type: "article", url: canonical, title: data.title, description: data.description, images: data.image ? [{ url: data.image, alt: data.title }] : [] },
      twitter: { card: data.image ? "summary_large_image" : "summary", title: data.title, description: data.description, images: data.image ? [data.image] : [] },
    };
  } catch {
    return { title: "Artikel — RuangBaca" };
  }
}

export default function PostLayout({ children }: LayoutProps<"/posts/[slug]">) {
  return children;
}
