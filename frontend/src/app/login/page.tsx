"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) {
        const msg = signInError.message;
        if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("fetch")) {
          setError(
            "Cannot reach Supabase. Try: (1) Use the anon key (long JWT starting with eyJ) from API settings, not the publishable key. (2) Check if your Supabase project is paused — restore it in the dashboard. (3) Restart the dev server after changing .env.local. (4) Try in incognito to rule out browser extensions."
          );
        } else if (msg.toLowerCase().includes("email not confirmed")) {
          setError(
            "Please check your email and click the confirmation link before signing in."
          );
        } else if (msg.toLowerCase().includes("invalid login")) {
          setError("Invalid email or password. Make sure you've registered first.");
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Sign in failed. Please try again.");
        setLoading(false);
        return;
      }

      const role =
        (data.user.user_metadata?.role as string) ?? "consumer";
      const name =
        (data.user.user_metadata?.full_name as string) ??
        data.user.email?.split("@")[0] ??
        "User";

      login(
        {
          id: data.user.id,
          name,
          email: data.user.email ?? "",
          role,
        },
        data.session?.access_token ?? ""
      );

      setLoading(false);
      const redirect = searchParams.get("redirect");
      if (redirect && (redirect.startsWith("/map") || redirect.startsWith("/listings"))) {
        router.push(redirect);
      } else {
        router.push(role === "business" ? "/dashboard" : "/map");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
          <Leaf className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">SecondServing</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Find Food Near You</h1>
      <p className="mt-2 text-gray-600">
        Sign in to browse surplus food and claim listings in your area.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" isLoading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Create account
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-gray-500">
        Have a business?{" "}
        <Link
          href="/login/business"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign in as business
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-gray-400">
        Can&apos;t sign in? Check your email for a confirmation link after registering.
        In Supabase Dashboard → Auth → Providers, you can disable &quot;Confirm email&quot; for development.
      </p>
    </div>
  );
}
