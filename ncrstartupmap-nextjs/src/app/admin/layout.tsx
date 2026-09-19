import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin/auth";
import { AdminProvider } from "@/contexts/AdminContext";

/**
 * P1-1 (audit H6): server-side admin gate. Previously the only protection was
 * the prod middleware kill-switch plus a client-side useEffect redirect;
 * nothing verified the session before rendering.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;
  if (!token) redirect("/admin/login");

  const user = await verifyAdminToken(token);
  if (!user) redirect("/admin/login");

  return <AdminProvider>{children}</AdminProvider>;
}