// Shared mock catalog data for Events and Shop, pulled out of their page
// components so it can also be imported by GlobalSearchDialog without
// importing a page.tsx module as a library.

/** Rough city-center coordinates per region, used as a default map pin for
 * anything a user creates (a stay listing, an event) without picking an
 * exact location, and by Skip for its background map. */
export const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 25.2048, lng: 55.2708 },
  KE: { lat: -1.2921, lng: 36.8219 },
  UG: { lat: 0.3476, lng: 32.5825 },
  ZA: { lat: -26.2041, lng: 28.0473 },
};

export type MoodEvent = {
  id: number;
  title: string;
  date: string;
  location: string;
  price: string;
  priceValue: number;
  category: string;
  badge: string;
  image: string;
  hint: string;
  lat: number;
  lng: number;
};

export const mockEvents: MoodEvent[] = [
  {
    id: 1,
    title: "Artisan Market by the Sea",
    date: "Sat, Aug 24, 4:00 PM",
    location: "Jumeirah Beach Park",
    price: "Free Entry",
    priceValue: 0,
    category: "Market",
    badge: "Families",
    image: "https://picsum.photos/id/1015/600/400",
    hint: "outdoor market",
    lat: 25.2058, lng: 55.2483,
  },
  {
    id: 2,
    title: "Ladies Night Yoga Flow",
    date: "Tue, Aug 27, 7:00 PM",
    location: "Serenity Yoga Studio",
    price: "Dhs. 75",
    priceValue: 75,
    category: "Wellness",
    badge: "Ladies Only",
    image: "https://picsum.photos/id/1016/600/400",
    hint: "yoga class",
    lat: 25.0805, lng: 55.1403,
  },
  {
    id: 3,
    title: "Live Oud Performance",
    date: "Fri, Aug 30, 9:00 PM",
    location: "The Music Hall",
    price: "Dhs. 150",
    priceValue: 150,
    category: "Music",
    badge: "Mixed",
    image: "https://picsum.photos/id/1018/600/400",
    hint: "live music",
    lat: 25.1959, lng: 55.2755,
  },
  {
    id: 4,
    title: "Family Movie Night Under the Stars",
    date: "Sat, Sep 7, 6:30 PM",
    location: "Zabeel Park",
    price: "Dhs. 50",
    priceValue: 50,
    category: "Film",
    badge: "Families",
    image: "https://picsum.photos/id/1019/600/400",
    hint: "outdoor cinema",
    lat: 25.2285, lng: 55.3079,
  },
  {
    id: 5,
    title: "Desert Adventure Photography Trip",
    date: "Sun, Sep 8, 5:00 AM",
    location: "Al Qudra Desert",
    price: "Dhs. 350",
    priceValue: 350,
    category: "Adventure",
    badge: "Photography",
    image: "https://picsum.photos/seed/deserttrip/600/400",
    hint: "desert sunrise",
    lat: 24.8834, lng: 55.4033,
  },
  {
    id: 6,
    title: "Modern Art Expo",
    date: "Wed, Sep 11, 10:00 AM",
    location: "Dubai World Trade Centre",
    price: "Dhs. 100",
    priceValue: 100,
    category: "Art",
    badge: "Expo",
    image: "https://picsum.photos/seed/artexpo/600/400",
    hint: "art gallery",
    lat: 25.2251, lng: 55.2887,
  },
  {
    id: 7,
    title: "HydraFacial",
    date: "Daily",
    location: "Skin & Glow Clinic",
    price: "Dhs. 600",
    priceValue: 600,
    category: "Wellness",
    badge: "Beauty",
    image: "https://picsum.photos/seed/hydrafacial/600/400",
    hint: "hydrafacial treatment",
    lat: 25.2138, lng: 55.2820,
  },
];

export type MarketplaceItem = {
  category: string;
  title: string;
  description: string;
  image: string;
  hint: string;
  providerName: string;
  type: 'on-site' | 'virtual' | 'product';
  price: number;
  tryOn?: boolean;
  /** Set only for real, partner-listed items (src/lib/products.ts) - drives
   * seller-crediting in spendFunds and the "can't buy your own listing" guard. */
  productId?: string;
  ownerUid?: string;
};

export const mockServiceItems: MarketplaceItem[] = [
  { category: 'wellness', title: "Relaxing Massage", description: "60-min session", image: "https://picsum.photos/seed/massage/400/400", hint: "spa massage", providerName: "Serenity Spa", type: 'on-site', price: 250 },
  { category: 'wellness', title: "Dermatology Consultation", description: "Acne & Skin concerns", image: "https://picsum.photos/seed/derm/400/400", hint: "dermatologist online", providerName: "Skin & Glow Clinic", type: 'virtual', price: 300 },
  { category: 'fashion', title: "Silk Wrap Dress", description: "Aisha's Boutique", image: "https://picsum.photos/seed/dress/400/400", hint: "silk dress", providerName: "Aisha's Boutique", type: 'product', price: 450, tryOn: true },
  { category: 'fashion', title: "Aviator Sunglasses", description: "UV400, polarized", image: "https://picsum.photos/seed/sunglasses/400/400", hint: "sunglasses", providerName: "Desert Optics", type: 'product', price: 120, tryOn: true },
  { category: 'beauty', title: "Matte Lipstick - Rosewood", description: "Long-lasting, vegan", image: "https://picsum.photos/seed/lipstick/400/400", hint: "lipstick", providerName: "Glow Cosmetics", type: 'product', price: 85, tryOn: true },
  { category: 'home', title: "Handwoven Rug", description: "Artisan's Corner", image: "https://picsum.photos/seed/rug/400/400", hint: "handwoven rug", providerName: "Artisan's Corner", type: 'product', price: 620 },
  { category: 'food', title: "Weekly Organic Box", description: "Farm-fresh produce", image: "https://picsum.photos/seed/veggies/400/400", hint: "organic vegetables", providerName: "Green Souk", type: 'product', price: 95 },
  { category: 'wellness', title: "Personal Trainer Session", description: "1-on-1, 45 min", image: "https://picsum.photos/seed/trainer/400/400", hint: "gym trainer", providerName: "Flow Fitness", type: 'on-site', price: 180 },
];
