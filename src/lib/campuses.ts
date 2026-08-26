import type { Region } from "@/contexts/language-provider";

/**
 * UNIDEL's campus directory.
 *
 * Campus delivery is deliberately *not* modelled on Skip's free-text
 * pickup/dropoff addresses: a hostel block or a lecture theatre isn't a
 * street address, and a runner on foot needs a name they already know
 * ("Hall 6", "Main Library") rather than a pin on a map. So a delivery is
 * always between two named points on one campus, picked from this list.
 *
 * This is static data rather than a Firestore collection because campuses
 * and their landmarks change on the order of years, not minutes - and
 * keeping it in the bundle means the order form works with no extra reads.
 * Onboarding a new university is a code change here plus the matching
 * entry in CAMPUS_BASE_FEE inside functions/src/index.ts.
 */

export type CampusPointKind = "vendor" | "residence" | "academic";

export type CampusPoint = {
  /** Must be namespaced as `${campus.id}-something`. createDelivery relies
   * on that prefix to reject a point from another university without
   * duplicating this whole list server-side. */
  id: string;
  name: string;
  kind: CampusPointKind;
};

export type Campus = {
  id: string;
  name: string;
  shortName: string;
  region: Region;
  city: string;
  /** Standard-speed delivery fee in the campus region's local currency.
   * Mirrored server-side - see the note on CAMPUS_BASE_FEE. */
  baseFee: number;
  points: CampusPoint[];
};

/** Express costs half again as much and is what a runner sees highlighted
 * on the job board. Mirrored in functions/src/index.ts. */
export const EXPRESS_MULTIPLIER = 1.5;

/** UNIDEL's cut of a delivery fee; the rest is the runner's earning.
 * Mirrored in functions/src/index.ts, which is what actually moves money. */
export const UNIDEL_FEE_PERCENT = 0.12;

export const CAMPUSES: Campus[] = [
  {
    id: "uon",
    name: "University of Nairobi",
    shortName: "UoN",
    region: "KE",
    city: "Nairobi",
    baseFee: 80,
    points: [
      { id: "uon-mess", name: "Main Mess", kind: "vendor" },
      { id: "uon-cafe", name: "Arcade Cafeteria", kind: "vendor" },
      { id: "uon-bookshop", name: "University Bookshop", kind: "vendor" },
      { id: "uon-hall3", name: "Hall 3", kind: "residence" },
      { id: "uon-hall6", name: "Hall 6", kind: "residence" },
      { id: "uon-adams", name: "Adams Arcade Hostels", kind: "residence" },
      { id: "uon-library", name: "Jomo Kenyatta Library", kind: "academic" },
      { id: "uon-chiromo", name: "Chiromo Labs", kind: "academic" },
    ],
  },
  {
    id: "ku",
    name: "Kenyatta University",
    shortName: "KU",
    region: "KE",
    city: "Nairobi",
    baseFee: 70,
    points: [
      { id: "ku-market", name: "KU Market", kind: "vendor" },
      { id: "ku-canteen", name: "Business Canteen", kind: "vendor" },
      { id: "ku-nyayo", name: "Nyayo Hostels", kind: "residence" },
      { id: "ku-kilimanjaro", name: "Kilimanjaro Hostels", kind: "residence" },
      { id: "ku-library", name: "Post Modern Library", kind: "academic" },
      { id: "ku-eco", name: "Education Complex", kind: "academic" },
    ],
  },
  {
    id: "strath",
    name: "Strathmore University",
    shortName: "Strathmore",
    region: "KE",
    city: "Nairobi",
    baseFee: 90,
    points: [
      { id: "strath-cafe", name: "Student Centre Cafe", kind: "vendor" },
      { id: "strath-shop", name: "Campus Mini Mart", kind: "vendor" },
      { id: "strath-res", name: "Strathmore Residence", kind: "residence" },
      { id: "strath-library", name: "Learning Resource Centre", kind: "academic" },
      { id: "strath-audi", name: "Auditorium Block", kind: "academic" },
    ],
  },
  {
    id: "mak",
    name: "Makerere University",
    shortName: "Makerere",
    region: "UG",
    city: "Kampala",
    baseFee: 3000,
    points: [
      { id: "mak-freedom", name: "Freedom Square Kiosks", kind: "vendor" },
      { id: "mak-canteen", name: "Senior Common Room", kind: "vendor" },
      { id: "mak-livingstone", name: "Livingstone Hall", kind: "residence" },
      { id: "mak-mary", name: "Mary Stuart Hall", kind: "residence" },
      { id: "mak-lumumba", name: "Lumumba Hall", kind: "residence" },
      { id: "mak-library", name: "Main Library", kind: "academic" },
      { id: "mak-cocis", name: "CoCIS Block", kind: "academic" },
    ],
  },
  {
    id: "uct",
    name: "University of Cape Town",
    shortName: "UCT",
    region: "ZA",
    city: "Cape Town",
    baseFee: 25,
    points: [
      { id: "uct-leslie", name: "Leslie Social Cafe", kind: "vendor" },
      { id: "uct-shop", name: "Upper Campus Store", kind: "vendor" },
      { id: "uct-obz", name: "Obz Square Residence", kind: "residence" },
      { id: "uct-baxter", name: "Baxter Residence", kind: "residence" },
      { id: "uct-library", name: "Chancellor Oppenheimer Library", kind: "academic" },
      { id: "uct-menzies", name: "Menzies Building", kind: "academic" },
    ],
  },
  {
    id: "wits",
    name: "University of the Witwatersrand",
    shortName: "Wits",
    region: "ZA",
    city: "Johannesburg",
    baseFee: 28,
    points: [
      { id: "wits-matrix", name: "The Matrix Food Court", kind: "vendor" },
      { id: "wits-shop", name: "Wits Campus Store", kind: "vendor" },
      { id: "wits-jubilee", name: "Jubilee Hall", kind: "residence" },
      { id: "wits-barnato", name: "Barnato Hall", kind: "residence" },
      { id: "wits-library", name: "Wartenweiler Library", kind: "academic" },
      { id: "wits-solomon", name: "Solomon Mahlangu House", kind: "academic" },
    ],
  },
  {
    id: "uaeu",
    name: "United Arab Emirates University",
    shortName: "UAEU",
    region: "AE",
    city: "Al Ain",
    baseFee: 8,
    points: [
      { id: "uaeu-food", name: "Central Food Court", kind: "vendor" },
      { id: "uaeu-shop", name: "Campus Convenience Store", kind: "vendor" },
      { id: "uaeu-mens", name: "Men's Housing", kind: "residence" },
      { id: "uaeu-womens", name: "Women's Housing", kind: "residence" },
      { id: "uaeu-library", name: "Zayed Central Library", kind: "academic" },
      { id: "uaeu-eng", name: "Engineering Complex", kind: "academic" },
    ],
  },
  {
    id: "aus",
    name: "American University of Sharjah",
    shortName: "AUS",
    region: "AE",
    city: "Sharjah",
    baseFee: 10,
    points: [
      { id: "aus-center", name: "Student Center", kind: "vendor" },
      { id: "aus-market", name: "Campus Market", kind: "vendor" },
      { id: "aus-dormb", name: "Residential Hall B", kind: "residence" },
      { id: "aus-dormg", name: "Residential Hall G", kind: "residence" },
      { id: "aus-library", name: "AUS Library", kind: "academic" },
      { id: "aus-eng", name: "Engineering Building", kind: "academic" },
    ],
  },
];

export function getCampus(campusId: string): Campus | undefined {
  return CAMPUSES.find((campus) => campus.id === campusId);
}

export function getCampusPoint(campusId: string, pointId: string): CampusPoint | undefined {
  return getCampus(campusId)?.points.find((point) => point.id === pointId);
}

/** Campuses in the viewer's selected region first - the region picker in
 * Settings is a preference, not a restriction, so the rest stay reachable
 * for students who are away from home or on exchange. */
export function campusesForRegion(region: Region): Campus[] {
  return [...CAMPUSES].sort((a, b) => {
    if (a.region === b.region) return a.name.localeCompare(b.name);
    if (a.region === region) return -1;
    if (b.region === region) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * What the order form quotes before a delivery is placed. The server
 * recomputes this from the same inputs in createDelivery and charges its
 * own number, so a tampered client can only mislead the person using it -
 * never underpay.
 */
export function quoteDeliveryFee(campus: Campus, express: boolean): number {
  return Math.round(campus.baseFee * (express ? EXPRESS_MULTIPLIER : 1));
}
