"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock, UtensilsCrossed, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AuthGuard } from "@/components/auth/AuthGuard";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  closing_time: string;
  peak_surplus_day?: string;
  peak_surplus_kg?: number;
}

const CARD_TOP_BG = "bg-brand-700";

function isRestaurantClosed(closing_time: string): boolean {
  if (!closing_time || closing_time === "Unknown") return false;
  const now = new Date();
  const closing = new Date();
  const parts = closing_time.split(" ");
  const [time, modifier] = parts.length >= 2 ? [parts[0], parts[1]] : [parts[0], ""];
  let [hours, minutes] = (time || "0:0").split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  closing.setHours(hours, minutes, 0, 0);
  return now > closing;
}

export default function ListingsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
              <UtensilsCrossed className="h-3 w-3" />
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
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-gray-500">Loading restaurants...</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r) => {
              const closed = isRestaurantClosed(r.closing_time);
              const showAsClosed = closed || !r.closing_time || r.closing_time === "Unknown";
              return (
                <div
                  key={r.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
                >
                  <div className={`${CARD_TOP_BG} p-5`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <UtensilsCrossed className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">
                        {r.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <p className="flex items-start gap-1.5 text-sm text-gray-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {r.address}
                    </p>

                    {showAsClosed ? (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5">
                        <Clock className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">Closed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">
                          Closes at {r.closing_time}
                        </span>
                      </div>
                    )}

                    {r.peak_surplus_day && (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">
                          Peak surplus: {r.peak_surplus_day}
                          {r.peak_surplus_kg != null && (
                            <span className="text-amber-600"> (~{r.peak_surplus_kg.toFixed(1)} kg)</span>
                          )}
                        </span>
                      </div>
                    )}

                    <Button
                      className="mt-auto w-full rounded-xl bg-gray-900 py-2.5 font-semibold text-white transition-colors hover:bg-gray-800"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      Directions
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}
