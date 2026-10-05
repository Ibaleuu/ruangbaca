const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
};

export type Tag = { id: number; name: string; slug: string; articles_count?: number };

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  meta_description?: string | null;
  tags?: Tag[];
  content: string;
  cover_image: string | null;
  status: "draft" | "published";
  review_status?: "pending" | "approved" | "rejected";
  review_note?: string | null;
  cover_image_url?: string | null;
  published_at: string | null;
  category: Category | null;
  user?: Author;
  favorites_count?: number;
  comments_count?: number;
  is_favorited?: boolean;
};

export type Author = {
  id: number;
  name: string;
  author_profile: { pen_name: string; bio: string; avatar_url?: string | null } | null;
};

export type Comment = {
  id: number;
  body: string;
  user_id: number;
  created_at: string;
  parent_id?: number | null;
  replies?: Comment[];
  user: Author;
};

export function getCoverImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const apiUrl = API_URL?.replace(/\/api\/?$/, "");
  if (!apiUrl) return path;
  return `${apiUrl}/${path.replace(/^\/?(?:storage\/)?/, "storage/")}`;
}

export type PaginatedPosts = {
  current_page: number;
  data: Post[];
  last_page: number;
  per_page: number;
  total: number;
};

function getApiUrl(): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL belum diatur.");
  }

  return API_URL;
}

export async function getPosts(options?: {
  search?: string;
  category?: string;
  page?: number;
  perPage?: number;
}): Promise<PaginatedPosts> {
  const params = new URLSearchParams();

  if (options?.search) {
    params.set("search", options.search);
  }

  if (options?.category) {
    params.set("category", options.category);
  }

  if (options?.page) {
    params.set("page", String(options.page));
  }

  if (options?.perPage) {
    params.set("per_page", String(options.perPage));
  }

  const query = params.toString();
  const url = `${getApiUrl()}/posts${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil artikel dari Laravel API.");
  }

  return response.json();
}

export async function getPost(slug: string): Promise<{ data: Post }> {
  const response = await fetch(
    `${getApiUrl()}/posts/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Artikel tidak ditemukan atau gagal dimuat.");
  }

  return response.json();
}

export async function getCategories(): Promise<{ data: Category[] }> {
  const response = await fetch(`${getApiUrl()}/categories`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil kategori dari Laravel API.");
  }

  return response.json();
}
