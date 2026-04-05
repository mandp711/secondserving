"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RestaurantsTable, type Restaurant } from "@/components/ui/restaurants-table";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function ListingsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/v1/restaurants`)
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data.restaurants || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-aqua px-3 py-1 text-xs font-medium text-teal">
                {restaurants.length} restaurants available
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900">Browse Listings</h1>
              <p className="mt-1 text-lg text-gray-500">Fresh surplus food available near you</p>
            </div>
            <Link href="/map">
              <Button size="sm" className="gap-1.5 shadow-md">
                <MapPin className="h-4 w-4" /> Map View
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="mt-20 flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="text-gray-500">Loading restaurants...</p>
            </div>
          ) : (
            <RestaurantsTable restaurants={restaurants} />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
