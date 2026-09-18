import type { Metadata } from "next";
import AdminLoginPage from "./login-client";

export const metadata: Metadata = {
  title: "Admin Login — StartupsMap.in",
  description: "Secure login to the StartupsMap.in admin panel.",
  robots: { index: false, follow: false },
};

export default AdminLoginPage;
