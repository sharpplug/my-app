/** Canonical Shop sub-verticals. Shared by the category filter chips on
 * the Shop page, the category picker in Create Listing (partners can only
 * list under one of these), and the mock catalog in catalog-data.ts -
 * previously only 5 of these existed (fashion/beauty/wellness/home/food)
 * with no filter UI at all. */
export const MARKETPLACE_CATEGORIES = [
  { id: "fashion", label: "Fashion" },
  { id: "beauty", label: "Beauty" },
  { id: "wellness", label: "Wellness" },
  { id: "home", label: "Home & Living" },
  { id: "food", label: "Food & Grocery" },
  { id: "electronics", label: "Electronics & Tech" },
  { id: "farm", label: "Farm & Agriculture" },
  { id: "automotive", label: "Automotive" },
  { id: "sports", label: "Sports & Fitness" },
  { id: "kids", label: "Kids & Family" },
  { id: "books", label: "Books & Stationery" },
  { id: "pets", label: "Pets" },
] as const;

export type MarketplaceCategoryId = (typeof MARKETPLACE_CATEGORIES)[number]["id"];
