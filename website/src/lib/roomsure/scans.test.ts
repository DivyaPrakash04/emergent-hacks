import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LISTINGS } from "./data/listings";
import { etaText, resolveScanUrl, roomTourPath, SAMPLE_TOUR_PATH, sampleRoomFor, scanServiceBase } from "./scans";

describe("3D tour addresses", () => {
  it("keeps absolute URLs and resolves same-origin paths against the site", () => {
    expect(resolveScanUrl("https://scans.example/room", "https://roomsure.test")).toBe("https://scans.example/room");
    expect(resolveScanUrl(SAMPLE_TOUR_PATH, "https://roomsure.test")).toBe("https://roomsure.test/scans/room3d/index.html");
    expect(resolveScanUrl(roomTourPath("bedroom"), "https://roomsure.test")).toBe("https://roomsure.test/scans/room3d/index.html?room=bedroom");
  });

  it("returns nothing for missing, protocol-relative or non-web addresses", () => {
    expect(resolveScanUrl(undefined, "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl("", "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl("//evil.example/scan", "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl("javascript:alert(1)", "https://roomsure.test")).toBeUndefined();
    expect(resolveScanUrl(SAMPLE_TOUR_PATH, "")).toBeUndefined();
  });

  it("names one room inside the sample viewer", () => {
    expect(roomTourPath("bedroom")).toBe("/scans/room3d/index.html?room=bedroom");
    expect(roomTourPath("my room")).toBe("/scans/room3d/index.html?room=my%20room");
  });

  it("points every demo room with a tour at the sample viewer, which exists in public/", () => {
    const publicDir = path.resolve(__dirname, "../../../public");
    const withTour = LISTINGS.filter((l) => l.scanUrl);
    expect(withTour.map((l) => l.id)).toContain("fox-point");
    for (const l of withTour) expect(l.scanUrl!.startsWith(SAMPLE_TOUR_PATH)).toBe(true);
    expect(existsSync(path.join(publicDir, SAMPLE_TOUR_PATH.slice(1)))).toBe(true);
    // The dorm single walks its own scanned bedroom, which the viewer also serves.
    expect(LISTINGS.find((l) => l.id === "elmhurst-dorm")?.scanUrl).toBe(roomTourPath("bedroom"));
    expect(existsSync(path.join(publicDir, "scans/room3d/rooms/bedroom.json"))).toBe(true);
  });
});

describe("scanning a video into a room", () => {
  it("talks to the scan service on its own port, or same-origin when it serves the site", () => {
    expect(scanServiceBase("8140")).toBe("");
    expect(scanServiceBase("5173")).toBe("http://127.0.0.1:8140");
    expect(scanServiceBase("")).toBe("http://127.0.0.1:8140");
  });

  it("maps the sample videos to rooms the viewer already serves", () => {
    expect(sampleRoomFor("roomsure-sample-kitchen.mp4")).toBe("kitchen");
    expect(sampleRoomFor("IMG_0412 Bathroom.MOV")).toBe("bathroom-v2");
    expect(sampleRoomFor("my-dorm-room.mp4")).toBeUndefined();
  });

  it("rounds the time left to 5–10 second steps", () => {
    expect(etaText(95)).toBe("about 1m 40s left");
    expect(etaText(119)).toBe("about 2m left");
    expect(etaText(24)).toBe("about 25s left");
    expect(etaText(2)).toBe("almost done");
    expect(etaText(Number.NaN)).toBe("almost done");
  });
});
