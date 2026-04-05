"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { MapPin, TrendingUp, Star, Clock } from "lucide-react";

export interface Restaurant {
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


export function RestaurantsTable({ restaurants }: { restaurants: Restaurant[] }) {
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = restaurants.filter((r) => {
    const matchesName = !nameFilter || r.name.toLowerCase().includes(nameFilter.toLowerCase());
    const closed =
      isRestaurantClosed(r.closing_time) || !r.closing_time || r.closing_time === "Unknown";
    const statusLabel = closed ? "closed" : "open";
    const matchesStatus =
      !statusFilter || statusLabel.includes(statusFilter.toLowerCase());
    return matchesName && matchesStatus;
  });

  return (
    <div className="container my-10 space-y-4 overflow-x-auto rounded-lg border border-border p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Filter by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Restaurant</TableHead>
            <TableHead className="w-[260px]">Address</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[180px]">Hours</TableHead>
            <TableHead className="w-[160px]">Peak Surplus</TableHead>
            <TableHead className="w-[100px]">Rating</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length ? (
            filtered.map((r) => {
              const closed =
                isRestaurantClosed(r.closing_time) ||
                !r.closing_time ||
                r.closing_time === "Unknown";
              return (
                <TableRow key={r.id}>
                  {/* Restaurant name */}
                  <TableCell className="whitespace-nowrap font-medium">
                    {r.name}
                  </TableCell>

                  {/* Address */}
                  <TableCell className="text-muted-foreground">
                    <span className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {r.address}
                    </span>
                  </TableCell>

                  {/* Open/Closed badge */}
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      className={cn(
                        "whitespace-nowrap",
                        closed
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700",
                      )}
                    >
                      {closed ? "Closed" : "Open"}
                    </Badge>
                  </TableCell>

                  {/* Closing time */}
                  <TableCell className="w-[140px] text-sm text-muted-foreground">
                    {r.closing_time && r.closing_time !== "Unknown" ? (
                      <span className="flex items-start gap-1">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{r.closing_time}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Peak surplus */}
                  <TableCell className="whitespace-nowrap">
                    {r.peak_surplus_day ? (
                      <span className="flex items-center gap-1 text-amber-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {r.peak_surplus_day}
                        {r.peak_surplus_kg != null && (
                          <span className="text-muted-foreground">
                            (~{r.peak_surplus_kg.toFixed(1)} kg)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Rating */}
                  <TableCell className="whitespace-nowrap">
                    {r.rating > 0 ? (
                      <span
                        className={cn(
                          "flex items-center gap-1 font-medium",
                          r.rating >= 4 ? "text-green-600" : "text-muted-foreground",
                        )}
                      >
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {r.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No rating</span>
                    )}
                  </TableCell>

                  {/* Directions */}
                  <TableCell>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Directions
                    </a>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No restaurants found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
