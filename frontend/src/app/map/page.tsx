"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  MapPin,
  Search,
  Clock,
  Utensils,
  Loader2,
  Navigation,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { initGoogleMaps } from "@/lib/google-maps";
import { AuthGuard } from "@/components/auth/AuthGuard";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

function shouldShowAsClosed(closing_time: string): boolean {
  return !closing_time || closing_time === "Unknown" || isRestaurantClosed(closing_time);
}

interface Restaurant {
  restaurant_name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  closing_time: string;
  hours_of_operation: string[];
  menu_items?: string[];
  cuisine?: string;
  price_level?: string;
  score?: number;
  distance_miles: number;
  peak_surplus_day?: string;
  peak_surplus_kg?: number;
}

interface SearchResponse {
  user_location: { lat: number; lng: number; formatted_address: string };
  radius_miles: number;
  restaurants: Restaurant[];
  total_restaurants: number;
}

interface SemanticResponse {
  query: string;
  restaurants: Restaurant[];
  total: number;
}

type SearchMode = "location" | "food";

export default function MapPage() {
  const searchParams = useSearchParams();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerClassRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [foodQuery, setFoodQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("location");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [locLabel, setLocLabel] = useState("");

  useEffect(() => {
    if (!mapRef.current) return;
    initGoogleMaps()
      .then(({ Map, AdvancedMarkerElement }) => {
        const mapOptions: google.maps.MapOptions = {
          center: { lat: 32.7157, lng: -117.1611 },
          zoom: 13,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        };
        if (AdvancedMarkerElement) {
          mapOptions.mapId = "food-rescue-map";
        }
        const map = new Map(mapRef.current!, mapOptions);
        mapInstance.current = map;
        markerClassRef.current = AdvancedMarkerElement;
        infoRef.current = new google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch((err) => {
        console.error("Google Maps init failed:", err);
        setMapReady(false);
      });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserLoc(loc);
        if (mapInstance.current) mapInstance.current.panTo(loc);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  }, []);

  const placeMarkers = useCallback(
    (data: Restaurant[], center: { lat: number; lng: number }, skipFitBounds?: boolean) => {
      if (!mapInstance.current || !mapReady) return;
      clearMarkers();

      circleRef.current = new google.maps.Circle({
        map: mapInstance.current,
        center,
        radius: 5 * 1609.34, // 5 miles in meters
        fillColor: "#16a34a",
        fillOpacity: 0.06,
        strokeColor: "#16a34a",
        strokeOpacity: 0.3,
        strokeWeight: 2,
      });

      const MarkerClass = markerClassRef.current;
      const useAdvanced = !!MarkerClass;

      let userMarker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
      if (useAdvanced) {
        const userEl = document.createElement("div");
        userEl.innerHTML = `<div style="
          background:#3b82f6;color:#fff;border-radius:50%;
          width:16px;height:16px;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,.4);
        "></div>`;
        userMarker = new MarkerClass({
          map: mapInstance.current,
          position: center,
          title: "Your location",
          content: userEl,
        });
      } else {
        userMarker = new google.maps.Marker({
          map: mapInstance.current,
          position: center,
          title: "Your location",
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#3b82f6", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
        });
      }
      markersRef.current.push(userMarker);

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);

      data.forEach((rest, idx) => {
        let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
        if (useAdvanced) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="
            background:#16a34a;color:#fff;border-radius:50%;
            width:36px;height:36px;display:flex;align-items:center;
            justify-content:center;font-weight:700;font-size:14px;
            box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer;
          ">${idx + 1}</div>`;
          marker = new MarkerClass({
            map: mapInstance.current!,
            position: { lat: rest.lat, lng: rest.lng },
            title: rest.restaurant_name,
            content: el,
          });
        } else {
          marker = new google.maps.Marker({
            map: mapInstance.current!,
            position: { lat: rest.lat, lng: rest.lng },
            title: rest.restaurant_name,
            label: { text: `${idx + 1}`, color: "#fff", fontWeight: "bold" },
          });
        }

        marker.addListener("click", () => {
          setSelectedIdx(idx);
          const peakHtml = rest.peak_surplus_day
            ? `<p style="margin:4px 0;font-size:12px;color:#b45309;font-weight:600">Peak surplus: ${rest.peak_surplus_day}${rest.peak_surplus_kg != null ? ` (~${rest.peak_surplus_kg.toFixed(1)} kg)` : ""}</p>`
            : "";
          const menuHtml = rest.menu_items && rest.menu_items.length > 0
            ? `<div style="margin:6px 0 2px;padding:6px 8px;background:#ecfdf5;border-radius:6px">
                <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#059669">Menu Items</p>
                <div style="display:flex;flex-wrap:wrap;gap:3px">${rest.menu_items.map(i => `<span style="display:inline-block;padding:1px 6px;font-size:11px;background:#fff;border-radius:99px;color:#374151;border:1px solid #a7f3d0">${i}</span>`).join("")}</div>
              </div>`
            : "";
          const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${rest.lat},${rest.lng}`;
          const closed = shouldShowAsClosed(rest.closing_time);
          const closesHtml = closed
            ? '<p style="margin:4px 0;font-size:12px;color:#dc2626;font-weight:600">Closed</p>'
            : `<p style="margin:4px 0;font-size:12px;color:#16a34a;font-weight:600">Closes: ${rest.closing_time}</p>`;
          infoRef.current?.setContent(`
            <div style="padding:8px;max-width:280px">
              <strong style="font-size:14px">${rest.restaurant_name}</strong>
              <p style="margin:4px 0;font-size:12px;color:#666">
                <a href="${dirUrl}" target="_blank" rel="noopener noreferrer" style="color:#16a34a;text-decoration:underline;cursor:pointer">${rest.address}</a>
              </p>
              ${closesHtml}
              ${peakHtml}
              ${menuHtml}
              <p style="font-size:11px;color:#888;margin-top:4px">${rest.distance_miles} mi away</p>
            </div>
          `);
          infoRef.current?.open(mapInstance.current!, marker);
          document.getElementById(`rest-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });

        markersRef.current.push(marker);
        bounds.extend({ lat: rest.lat, lng: rest.lng });
      });

      if (data.length && !skipFitBounds) mapInstance.current.fitBounds(bounds, 60);
    },
    [mapReady, clearMarkers]
  );

  // When arriving from Directions link with lat/lng, search and zoom to restaurant
  const directionsLat = searchParams.get("lat");
  const directionsLng = searchParams.get("lng");
  const hasDirectionsParams = directionsLat && directionsLng;

  useEffect(() => {
    if (!hasDirectionsParams || !mapReady) return;
    const lat = parseFloat(directionsLat!);
    const lng = parseFloat(directionsLng!);
    if (isNaN(lat) || isNaN(lng)) return;

    const doSearchAndZoom = async () => {
      setLoading(true);
      setError(null);
      setRestaurants([]);
      setSearched(true);
      setSelectedIdx(null);

      try {
        const start = Date.now();
        const res = await fetch(`${BACKEND}/api/v1/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "restaurant", radius_miles: 5, lat, lng }),
        });
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResponse = await res.json();
        const elapsed = Date.now() - start;
        const minDelayMs = 2000;
        const remaining = Math.max(0, minDelayMs - elapsed);
        await new Promise((r) => setTimeout(r, remaining));
        setRestaurants(data.restaurants);
        setLocLabel(data.user_location.formatted_address);
        const center = { lat: data.user_location.lat, lng: data.user_location.lng };
        if (mapInstance.current) {
          placeMarkers(data.restaurants, center, true);
          const idx = data.restaurants.findIndex(
            (r) => Math.abs(r.lat - lat) < 0.0001 && Math.abs(r.lng - lng) < 0.0001
          );
          const map = mapInstance.current;
          const bounds = new google.maps.LatLngBounds(
            { lat: lat - 0.002, lng: lng - 0.002 },
            { lat: lat + 0.002, lng: lng + 0.002 }
          );
          map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
          if (idx >= 0) {
            setSelectedIdx(idx);
            const m = markersRef.current[idx + 1];
            if (m && infoRef.current) {
              const rest = data.restaurants[idx];
              const peakHtml = rest.peak_surplus_day
                ? `<p style="margin:4px 0;font-size:12px;color:#b45309;font-weight:600">Peak surplus: ${rest.peak_surplus_day}${rest.peak_surplus_kg != null ? ` (~${rest.peak_surplus_kg.toFixed(1)} kg)` : ""}</p>`
                : "";
              const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${rest.lat},${rest.lng}`;
              const closed = shouldShowAsClosed(rest.closing_time);
              const closesHtml = closed
                ? '<p style="margin:4px 0;font-size:12px;color:#dc2626;font-weight:600">Closed</p>'
                : `<p style="margin:4px 0;font-size:12px;color:#16a34a;font-weight:600">Closes: ${rest.closing_time}</p>`;
              infoRef.current.setContent(`
                <div style="padding:8px;max-width:260px">
                  <strong style="font-size:14px">${rest.restaurant_name}</strong>
                  <p style="margin:4px 0;font-size:12px;color:#666">
                    <a href="${dirUrl}" target="_blank" rel="noopener noreferrer" style="color:#16a34a;text-decoration:underline;cursor:pointer">${rest.address}</a>
                  </p>
                  ${closesHtml}
                  ${peakHtml}
                  <p style="font-size:11px;color:#888">${rest.distance_miles} mi away</p>
                </div>
              `);
              setTimeout(() => {
                infoRef.current?.open(map, m);
                document.getElementById(`rest-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }, 400);
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    doSearchAndZoom();
  }, [hasDirectionsParams, mapReady, directionsLat, directionsLng, placeMarkers]);

  const handleSearch = async (lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);
    setRestaurants([]);
    setSearched(true);
    setSelectedIdx(null);

    const body: Record<string, unknown> = { query: "restaurant", radius_miles: 5 };
    if (address.trim()) {
      body.address = address.trim();
    } else if (lat != null && lng != null) {
      body.lat = lat;
      body.lng = lng;
    } else if (userLoc) {
      body.lat = userLoc.lat;
      body.lng = userLoc.lng;
    } else {
      setError("Enter an address or allow location access.");
      setLoading(false);
      return;
    }

    try {
      const start = Date.now();
      const res = await fetch(`${BACKEND}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(e.detail || `Request failed (${res.status})`);
      }
      const data: SearchResponse = await res.json();
      const elapsed = Date.now() - start;
      const minDelayMs = 5000;
      const remaining = Math.max(0, minDelayMs - elapsed);
      await new Promise((r) => setTimeout(r, remaining));
      setRestaurants(data.restaurants);
      setLocLabel(data.user_location.formatted_address);
      const center = { lat: data.user_location.lat, lng: data.user_location.lng };
      if (mapInstance.current) mapInstance.current.panTo(center);
      placeMarkers(data.restaurants, center);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleMyLocation = () => {
    if (userLoc) {
      setAddress("");
      handleSearch(userLoc.lat, userLoc.lng);
    } else {
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
          setUserLoc(loc);
          setAddress("");
          handleSearch(loc.lat, loc.lng);
        },
        () => setError("Could not get location. Enter an address instead."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const placeSemanticMarkers = useCallback(
    (data: Restaurant[]) => {
      if (!mapInstance.current || !mapReady) return;
      clearMarkers();

      const MarkerClass = markerClassRef.current;
      const useAdvanced = !!MarkerClass;
      const bounds = new google.maps.LatLngBounds();

      data.forEach((rest, idx) => {
        let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
        if (useAdvanced) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="
            background:#7c3aed;color:#fff;border-radius:50%;
            width:36px;height:36px;display:flex;align-items:center;
            justify-content:center;font-weight:700;font-size:14px;
            box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer;
          ">${idx + 1}</div>`;
          marker = new MarkerClass({
            map: mapInstance.current!,
            position: { lat: rest.lat, lng: rest.lng },
            title: rest.restaurant_name,
            content: el,
          });
        } else {
          marker = new google.maps.Marker({
            map: mapInstance.current!,
            position: { lat: rest.lat, lng: rest.lng },
            title: rest.restaurant_name,
            label: { text: `${idx + 1}`, color: "#fff", fontWeight: "bold" },
          });
        }

        marker.addListener("click", () => {
          setSelectedIdx(idx);
          const menuHtml = rest.menu_items && rest.menu_items.length > 0
            ? `<div style="margin:6px 0 2px;padding:6px 8px;background:#ecfdf5;border-radius:6px">
                <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#059669">Menu Items</p>
                <div style="display:flex;flex-wrap:wrap;gap:3px">${rest.menu_items.map(i => `<span style="display:inline-block;padding:1px 6px;font-size:11px;background:#fff;border-radius:99px;color:#374151;border:1px solid #a7f3d0">${i}</span>`).join("")}</div>
              </div>`
            : "";
          const cuisineHtml = rest.cuisine
            ? `<p style="margin:2px 0;font-size:11px;color:#7c3aed;font-weight:600">${rest.cuisine}${rest.price_level ? ` · ${rest.price_level}` : ""}</p>`
            : "";
          const scoreHtml = rest.score != null
            ? `<p style="margin:2px 0;font-size:10px;color:#6b7280">Match: ${Math.round(rest.score * 100)}%</p>`
            : "";
          const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${rest.lat},${rest.lng}`;
          const closed = shouldShowAsClosed(rest.closing_time);
          const closesHtml = closed
            ? '<p style="margin:4px 0;font-size:12px;color:#dc2626;font-weight:600">Closed</p>'
            : `<p style="margin:4px 0;font-size:12px;color:#16a34a;font-weight:600">Closes: ${rest.closing_time}</p>`;
          infoRef.current?.setContent(`
            <div style="padding:8px;max-width:280px">
              <strong style="font-size:14px">${rest.restaurant_name}</strong>
              ${cuisineHtml}
              <p style="margin:4px 0;font-size:12px;color:#666">
                <a href="${dirUrl}" target="_blank" rel="noopener noreferrer" style="color:#16a34a;text-decoration:underline;cursor:pointer">${rest.address}</a>
              </p>
              ${closesHtml}
              ${menuHtml}
              ${scoreHtml}
            </div>
          `);
          infoRef.current?.open(mapInstance.current!, marker);
          document.getElementById(`rest-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });

        markersRef.current.push(marker);
        bounds.extend({ lat: rest.lat, lng: rest.lng });
      });

      if (data.length) mapInstance.current.fitBounds(bounds, 60);
    },
    [mapReady, clearMarkers]
  );

  const handleFoodSearch = async () => {
    if (!foodQuery.trim()) {
      setError("Enter a food type or dish to search for.");
      return;
    }

    setLoading(true);
    setError(null);
    setRestaurants([]);
    setSearched(true);
    setSelectedIdx(null);
    setLocLabel("");

    try {
      const res = await fetch(`${BACKEND}/api/v1/semantic-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: foodQuery.trim(), top_k: 20 }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(e.detail || `Request failed (${res.status})`);
      }
      const data: SemanticResponse = await res.json();
      const withDefaults = data.restaurants.map((r) => ({
        ...r,
        distance_miles: r.distance_miles ?? 0,
        hours_of_operation: r.hours_of_operation ?? [],
      }));
      setRestaurants(withDefaults);
      setLocLabel(foodQuery.trim());
      placeSemanticMarkers(withDefaults);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="flex w-full flex-col border-r border-gray-200 bg-white lg:w-[420px]">
        <div className="border-b border-gray-200 p-4">
          <div className="mb-3 flex rounded-lg bg-gray-100 p-0.5">
            <button
              onClick={() => { setSearchMode("location"); setSearched(false); setRestaurants([]); clearMarkers(); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${searchMode === "location" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              By Location
            </button>
            <button
              onClick={() => { setSearchMode("food"); setSearched(false); setRestaurants([]); clearMarkers(); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${searchMode === "food" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Utensils className="mr-1 inline h-3.5 w-3.5" />
              By Food Type
            </button>
          </div>

          {searchMode === "location" ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter your address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <Button onClick={() => handleSearch()} isLoading={loading} disabled={loading}>
                  Search
                </Button>
              </div>
              <button
                onClick={handleMyLocation}
                disabled={loading}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                <Navigation className="h-3.5 w-3.5" />
                Use my current location
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Utensils className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    placeholder="e.g. spicy tacos, sushi, Italian pasta..."
                    value={foodQuery}
                    onChange={(e) => setFoodQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFoodSearch()}
                    className="w-full rounded-lg border border-purple-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <Button
                  onClick={handleFoodSearch}
                  isLoading={loading}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Search
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                AI-powered semantic search across restaurant menus and cuisines
              </p>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="text-sm text-gray-500">Searching restaurants nearby...</p>
            </div>
          )}

          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {!loading && searched && restaurants.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MapPin className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                {searchMode === "food" ? "No matching restaurants found." : "No restaurants found within 5 miles."}
              </p>
              <p className="text-xs text-gray-400">
                {searchMode === "food" ? "Try different keywords like \"sushi\", \"burgers\", or \"vegan\"." : "Try a different address or a San Diego location."}
              </p>
            </div>
          )}

          {!loading && restaurants.length > 0 && (
            <>
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <p className="text-xs font-medium text-gray-500">
                  {searchMode === "food" ? (
                    <>
                      {restaurants.length} restaurants matching{" "}
                      <span className="font-semibold text-purple-700">&ldquo;{locLabel}&rdquo;</span>
                    </>
                  ) : (
                    <>
                      {restaurants.length} restaurants within 5 miles of{" "}
                      <span className="text-gray-700">{locLabel}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {restaurants.map((rest, idx) => (
                  <div
                    key={idx}
                    id={`rest-${idx}`}
                    className={`cursor-pointer p-4 transition-colors ${selectedIdx === idx ? "bg-brand-50" : "hover:bg-gray-50"}`}
                    onClick={() => {
                      setSelectedIdx(idx);
                      const markerOffset = searchMode === "food" ? idx : idx + 1;
                      const m = markersRef.current[markerOffset];
                      if (m && mapInstance.current) {
                        const bounds = new google.maps.LatLngBounds(
                          { lat: rest.lat - 0.003, lng: rest.lng - 0.003 },
                          { lat: rest.lat + 0.003, lng: rest.lng + 0.003 }
                        );
                        mapInstance.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
                        setTimeout(() => google.maps.event.trigger(m, "click"), 350);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${searchMode === "food" ? "bg-purple-600" : "bg-brand-600"}`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {rest.restaurant_name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{rest.address}</p>

                        {rest.cuisine && (
                          <p className="mt-1 text-xs font-medium text-purple-600">
                            {rest.cuisine}{rest.price_level ? ` · ${rest.price_level}` : ""}
                          </p>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          {rest.distance_miles > 0 && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {rest.distance_miles} mi
                            </span>
                          )}
                          {rest.score != null && rest.score > 0 && (
                            <span className="flex items-center gap-1 font-medium text-purple-600">
                              <Search className="h-3 w-3" />
                              {Math.round(rest.score * 100)}% match
                            </span>
                          )}
                          <span className={`flex items-center gap-1 font-medium ${shouldShowAsClosed(rest.closing_time) ? "text-red-600" : "text-brand-600"}`}>
                            <Clock className="h-3 w-3" />
                            {shouldShowAsClosed(rest.closing_time) ? "Closed" : `Closes ${rest.closing_time}`}
                          </span>
                        </div>

                        {rest.peak_surplus_day && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                            <TrendingUp className="h-3 w-3" />
                            Peak surplus: {rest.peak_surplus_day}
                            {rest.peak_surplus_kg != null && (
                              <span className="text-gray-500">(~{rest.peak_surplus_kg.toFixed(1)} kg)</span>
                            )}
                          </p>
                        )}

                        {rest.hours_of_operation.length > 0 && (
                          <div className="mt-2 rounded-md bg-gray-50 px-3 py-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Hours of Operation
                            </p>
                            <div className="grid grid-cols-1 gap-0.5">
                              {rest.hours_of_operation.map((h, hi) => (
                                <p key={hi} className="text-[11px] text-gray-600">{h}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {rest.menu_items && rest.menu_items.length > 0 && (
                          <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                              <Utensils className="mr-1 inline h-2.5 w-2.5" />
                              Menu Items Available
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {rest.menu_items.map((item, mi) => (
                                <span
                                  key={mi}
                                  className="inline-block rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700 shadow-sm ring-1 ring-emerald-200"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !searched && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              {searchMode === "food" ? (
                <>
                  <div className="rounded-full bg-purple-50 p-4">
                    <Utensils className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Search by food type or cuisine
                  </p>
                  <p className="max-w-[260px] text-xs text-gray-400">
                    Type what you&apos;re craving — &ldquo;tacos&rdquo;, &ldquo;sushi&rdquo;, &ldquo;vegan bowls&rdquo; — and we&apos;ll find the best matches using AI
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-brand-50 p-4">
                    <MapPin className="h-8 w-8 text-brand-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Enter your address to find restaurants nearby
                  </p>
                  <p className="max-w-[260px] text-xs text-gray-400">
                    We&apos;ll search for restaurants within a 5-mile radius and show their closing hours
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={mapRef} className="h-full w-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}
