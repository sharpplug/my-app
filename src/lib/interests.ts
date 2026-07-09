/** Canonical interest tags a user can pick during onboarding (or later in
 * Account settings). This is the real signal Find Friends discovery and
 * interest-matched ad ranking are built on - see src/lib/social.ts and
 * useActiveAds() in src/lib/ads.ts. */
export const INTEREST_TAGS = [
  "Food & Dining",
  "Fashion",
  "Beauty",
  "Wellness & Fitness",
  "Travel",
  "Music",
  "Film & TV",
  "Art & Culture",
  "Home & Living",
  "Electronics & Tech",
  "Automotive",
  "Farm & Agriculture",
  "Sports",
  "Family & Kids",
  "Nightlife & Events",
] as const;

export type InterestTag = (typeof INTEREST_TAGS)[number];

export const MIN_INTERESTS = 3;
