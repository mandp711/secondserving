export interface Location {
  lat: number;
  lng: number;
}

export interface MenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  menuItems: MenuItem[];
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  restaurant: Restaurant;
  items: MenuItem[];
  quantity: number;
  expiresAt: string;
  status: "available" | "claimed" | "expired";
}
