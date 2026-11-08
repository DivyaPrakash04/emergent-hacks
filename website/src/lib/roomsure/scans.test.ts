import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LISTINGS } from "./data/listings";
import { resolveScanUrl, SAMPLE_TOUR_PATH } from "./scans";

describe("3D tour addresses", () => {
  it("keeps absolute URLs and resolves same-origin paths against the site", () => {
    expect(resolveScanUrl("https://scans.example/room", "https://roomsure.test")).toBe("https://scans.example/room");
    expect(resolveScanUrl(SAMPLE_TOUR_PATH, "https://roomsure.test")).toBe("https://roomsure.test/scans/room3d/index.html");
  });

  it("returns nothing for missing, protocol-relative or non-web addresses", () => {
    expect(resolveScanUrl(undefined, "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl("", "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl("//evil.example/scan", "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl("javascript:alert(1)", "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl(SAMPLE_TOUR_PATH, "")).toBeUndefined();
  });

  it("points every demo room with a tour at the sample scan, which exists in public/", () => {
    const withTour = LISTINGS.filter((l) => l.scanUrl);
    expect(withTour.map((l) => l.id)).toContain("fox-point");
    for (const l of withTour) expect(l.scanUrl).toBe(SAMPLE_TOUR_PATH);
    expect(existsSync(path.resolve(__dirname, "../../../public", SAMPLE_TOUR_PATH.slice(1)))).toBe(true);
  });
});
