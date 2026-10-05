import { redirect } from "next/navigation";

// Compatibility for old bookmarks; registration no longer requires email verification.
export default function VerifyEmailPage() {
  redirect("/login");
}
