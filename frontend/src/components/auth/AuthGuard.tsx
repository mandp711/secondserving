"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authInitialized = useAuthStore((s) => s.authInitialized);

  useEffect(() => {
    if (authInitialized && !isAuthenticated) {
      const fullPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : pathname || "/map";
      const redirect = encodeURIComponent(fullPath);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [authInitialized, isAuthenticated, pathname, router]);

  if (!authInitialized || !isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
