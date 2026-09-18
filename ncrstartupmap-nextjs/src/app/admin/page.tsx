// Server component - exports metadata for admin dashboard
import { Metadata } from "next";
import AdminPage from "./admin-client";

export const metadata: Metadata = {
  title: "Admin Dashboard — StartupsMap.in",
  description: "Admin dashboard for managing startup submissions.",
  robots: { index: false, follow: false },
};

// Re-export the client component
export default AdminPage;
