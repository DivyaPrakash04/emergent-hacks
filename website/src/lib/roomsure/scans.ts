// Where 3D tours come from. Only one sample scan exists today: the team's own kitchen
// (public/scans/room3d), so every demo room with a tour opens it, and the tour overlay
// labels it "Sample 3D scan · demo".

/** The walkable sample scan, served by this site. */
export const SAMPLE_TOUR_PATH = "/scans/room3d/index.html";

/**
 * The address to load for a room's scan. Absolute http(s) URLs are used as given;
 * same-origin paths ("/scans/...") are resolved against this site's origin.
 * Anything else, or no scan, returns undefined and the overlay shows its placeholder.
 */
export function resolveScanUrl(scanUrl: string | undefined, origin: string): string | undefined {
  if (!scanUrl) return undefined;
  if (/^https?:\/\//.test(scanUrl)) return scanUrl;
  if (scanUrl.startsWith("/") && !scanUrl.startsWith("//") && origin) return new URL(scanUrl, origin).href;
  return undefined;
}
