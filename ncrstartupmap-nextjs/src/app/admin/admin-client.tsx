"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/contexts/AdminContext";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading, isExpired, logout } = useAdmin();

  useEffect(() => {
    if (!isLoading && !user) {
      // H4: an expired session gets an explicit reason on the login page;
      // a plain logged-out visit stays silent (no scary message).
      router.push(isExpired ? "/admin/login?reason=expired" : "/admin/login");
    }
  }, [user, isLoading, isExpired, router]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {/* L6: logout() existed in AdminContext but no UI called it. */}
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push("/admin/login");
          }}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Sign out
        </button>
      </div>
      <p className="text-muted-foreground">
        Welcome, {user.email}! Admin functionality coming soon.
      </p>
    </main>
  );
}