"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "moderator";
  createdAt: Date;
}

interface AdminContextType {
  user: AdminUser | null;
  isLoading: boolean;
  /** True when the verify endpoint returned 401 — a session existed and is
   * now invalid/expired (H4). Distinguished from "never signed in" so the
   * login page can say why the user was bounced. */
  isExpired: boolean;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  isLoading: true,
  isExpired: false,
  logout: async () => {},
});

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/admin/verify", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUser(data.user);
          }
        } else if (res.status === 401 && isMounted) {
          // H4: verify returns 401 when the admin-token cookie is missing or
          // no longer valid — i.e. the session expired. Distinguished from a
          // 500 (auth system failure), which must NOT claim "expired".
          setIsExpired(true);
        }
      } catch (error) {
        // Only log full error details in development; in production, avoid
        // leaking auth system details to the browser console.
        if (process.env.NODE_ENV !== "production") {
          console.error("Admin auth check failed:", error);
        } else {
          console.error("Admin auth check failed");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AdminContext.Provider value={{ user, isLoading, isExpired, logout }}>
      {children}
    </AdminContext.Provider>
  );
}