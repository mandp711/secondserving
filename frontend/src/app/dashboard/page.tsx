"use client";

import { BarChart3, TrendingUp, Package, Users } from "lucide-react";

const summaryCards = [
  { label: "Items Saved", value: "156", icon: Package, color: "text-brand-600 bg-brand-50" },
  { label: "Claims Made", value: "89", icon: Users, color: "text-blue-600 bg-blue-50" },
  { label: "Waste Reduced", value: "240 lbs", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
  { label: "Active Listings", value: "12", icon: BarChart3, color: "text-purple-600 bg-purple-50" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Overview of your food rescue activity
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <p className="mt-2 text-sm text-gray-500">
          Dashboard data is placeholder — connect to the backend API to show real activity.
        </p>
      </div>
    </div>
  );
}
