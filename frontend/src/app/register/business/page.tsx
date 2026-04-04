"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function RegisterBusinessPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    restaurantName: "",
    address: "",
    phone: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            role: "business",
            restaurant_name: form.restaurantName,
            address: form.address,
            phone: form.phone,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("restaurants").insert({
        owner_id: authData.user.id,
        name: form.restaurantName,
        address: form.address || null,
        phone: form.phone || null,
        is_verified: false,
      });

      if (insertError) {
        console.error("Restaurant insert error:", insertError);
        setError(
          "Account created but restaurant profile failed. You can add it later from your dashboard."
        );
      }

      login(
        {
          id: authData.user.id,
          name: form.fullName,
          email: form.email,
          role: "business",
        },
        authData.session?.access_token ?? ""
      );

      router.push("/dashboard");
      router.refresh();
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

      <h1 className="text-2xl font-bold text-gray-900">
        Register Your Restaurant
      </h1>
      <p className="mt-2 text-gray-600">
        Create an account to list surplus food and connect with your community.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700"
          >
            Your full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Jane Smith"
          />
        </div>

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
            placeholder="you@restaurant.com"
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
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
        </div>

        <div className="border-t border-gray-200 pt-5">
          <h2 className="text-sm font-semibold text-gray-900">
            Restaurant details
          </h2>
        </div>

        <div>
          <label
            htmlFor="restaurantName"
            className="block text-sm font-medium text-gray-700"
          >
            Restaurant name
          </label>
          <input
            id="restaurantName"
            type="text"
            required
            value={form.restaurantName}
            onChange={(e) =>
              setForm({ ...form, restaurantName: e.target.value })
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Joe's Kitchen"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
          >
            Address
          </label>
          <input
            id="address"
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="123 Main St, Santa Barbara, CA"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="(805) 555-0123"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" isLoading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login/business" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-gray-500">
        Looking to find food?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Register to find food
        </Link>
      </p>
    </div>
  );
}
