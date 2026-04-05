"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, MapPin, LayoutGrid } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/lib/supabase";

const navLinks = [
  { href: "/map", label: "Find Food", icon: MapPin },
  { href: "/listings", label: "Browse", icon: LayoutGrid },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      logout();
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-800">SecondServing</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-aqua-dark text-teal"
                      : "text-teal hover:bg-aqua-dark hover:text-teal"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-teal">
                  Hi, {user?.name || "User"}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="border-teal text-teal hover:bg-aqua-dark">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="bg-aqua text-brand-800 border-aqua hover:bg-aqua-dark">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-brand-800 text-white hover:bg-brand-900">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="rounded-lg p-2 text-teal hover:bg-aqua-dark md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-aqua bg-aqua px-4 pb-4 pt-2 md:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-aqua-dark text-teal" : "text-teal hover:bg-aqua-dark"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-aqua-dark pt-3">
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-teal text-teal hover:bg-aqua-dark">Sign Out</Button>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full bg-aqua text-brand-800 border-aqua hover:bg-aqua-dark">Sign In</Button>
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full bg-brand-800 text-white hover:bg-brand-900">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
