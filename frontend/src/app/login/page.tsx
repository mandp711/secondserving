"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { SignInPage } from "@/components/ui/sign-in";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        const msg = signInError.message;
        if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("fetch")) {
          setError("Cannot reach Supabase. Check your .env config or whether the project is paused.");
        } else if (msg.toLowerCase().includes("email not confirmed")) {
          setError("Please confirm your email before signing in.");
        } else if (msg.toLowerCase().includes("invalid login")) {
          setError("Invalid email or password.");
        } else {
          setError(msg);
        }
        return;
      }

      if (!data.user) {
        setError("Sign in failed. Please try again.");
        return;
      }

      const role = (data.user.user_metadata?.role as string) ?? "consumer";
      const name =
        (data.user.user_metadata?.full_name as string) ??
        data.user.email?.split("@")[0] ??
        "User";

      login({ id: data.user.id, name, email: data.user.email ?? "", role }, data.session?.access_token ?? "");

      const redirect = searchParams.get("redirect");
      if (redirect && (redirect.startsWith("/map") || redirect.startsWith("/listings"))) {
        router.push(redirect);
      } else {
        router.push(role === "business" ? "/dashboard" : "/map");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong...");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SignInPage
        title={<span className="text-brand-600">Welcome</span>}
        description="Sign in to browse surplus food"
onSignIn={handleSignIn}
        onCreateAccount={() => setShowRegisterModal(true)}
        onResetPassword={() => router.push("/login")}
        error={error}
        loading={loading}
      />

      {/* Register type modal */}
      {showRegisterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Create an account</h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Link
                href="/register"
                className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 hover:bg-brand-50 hover:border-brand-200 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">Food Bank / Consumer</p>
                  <p className="text-sm text-gray-500">Browse and claim surplus food near you</p>
                </div>
                <span className="text-brand-600 text-lg">→</span>
              </Link>
              <Link
                href="/register/business"
                className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 hover:bg-brand-50 hover:border-brand-200 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">Restaurant Owner</p>
                  <p className="text-sm text-gray-500">List your surplus food for the community</p>
                </div>
                <span className="text-brand-600 text-lg">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
