/**
 * The Lovable website (website/) has its own 8 demo rooms, with their own ids and
 * prices. It sends them as "website/<id>". Server-side copy of their titles and
 * prices; tests/roomsure.test.ts fails if this drifts from
 * website/src/lib/roomsure/data/listings.ts. Remove once both apps share one data set.
 */
export const WEBSITE_ROOMS: Record<string, { title: string; price: number }> = {
  "fox-point": { title: "Sunny room in Fox Point", price: 950 },
  "downcity-studio": { title: "Bright studio near Downcity", price: 1020 },
  "federal-hill-sublet": { title: "Summer sublet on Federal Hill", price: 780 },
  "elmhurst-attic": { title: "Quiet attic room in Elmhurst", price: 860 },
  "college-hill-suite": { title: "Private suite on College Hill", price: 1100 },
  "cranston-room": { title: "Garden-level room in Cranston", price: 720 },
  "wayland-square": { title: "Room by Wayland Square", price: 920 },
  "west-end-loft": { title: "Loft room in the West End", price: 990 },
};
