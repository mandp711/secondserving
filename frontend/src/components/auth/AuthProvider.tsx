"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setAuthInitialized } = useAuthStore();

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setAuthInitialized(true);
      return;
    }

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role =
          (session.user.user_metadata?.role as string) ?? "consumer";
        const name =
          (session.user.user_metadata?.full_name as string) ??
          session.user.email?.split("@")[0] ??
          "User";
        login(
          {
            id: session.user.id,
            name,
            email: session.user.email ?? "",
            role,
          },
          session.access_token
        );
      } else {
        logout();
      }
      setAuthInitialized(true);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role =
          (session.user.user_metadata?.role as string) ?? "consumer";
        const name =
          (session.user.user_metadata?.full_name as string) ??
          session.user.email?.split("@")[0] ??
          "User";
        login(
          {
            id: session.user.id,
            name,
            email: session.user.email ?? "",
            role,
          },
          session.access_token
        );
      } else {
        logout();
      }
    });

    return () => subscription.unsubscribe();
  }, [login, logout, setAuthInitialized]);

  return <>{children}</>;
}
