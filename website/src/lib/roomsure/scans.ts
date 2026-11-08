// Where 3D tours come from. The walkable viewer (public/scans/room3d) started as the
// team's own kitchen and now serves several scanned rooms by name (?room=bedroom); the
// tour overlay still labels every tour "Sample 3D scan · demo". A local scan service
// (not part of the web build) can turn a host's phone video into a new room.

/** The walkable sample scan, served by this site. With no ?room it shows the kitchen. */
export const SAMPLE_TOUR_PATH = "/scans/room3d/index.html";

/** The tour address of one scanned room in the viewer, e.g. roomTourPath("bedroom"). */
export function roomTourPath(room: string): string {
  return `${SAMPLE_TOUR_PATH}?room=${encodeURIComponent(room)}`;
}

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

// ---------- scanning a host's video into a walkable room ----------
// The scan service runs beside the site (not in the web build): POST the raw video to
// {base}/api/scan, poll GET {base}/api/scan/{id}, and when it's done the new room is
// served by the viewer at roomTourPath(roomId). When no service answers, the host form
// shows a friendly note and the sample videos still work.

/** Where the scan service listens: same origin when it serves this site, else its own port. */
export function scanServiceBase(port: string): string {
  return port === "8140" ? "" : "http://127.0.0.1:8140";
}

export interface ScanStatus {
  state: "queued" | "extracting" | "generating" | "done" | "error";
  /** Plain-English stage text from the service, e.g. "Extracting frames". */
  stage: string;
  /** 0..1 across the whole scan. */
  progress: number;
  etaSeconds: number;
  /** Set once the state is "done": the room the viewer can serve. */
  roomId?: string;
}

/** Upload a video for scanning. Resolves to the scan id to poll with fetchScanStatus. */
export async function requestScan(file: File, base: string): Promise<string> {
  const res = await fetch(`${base}/api/scan`, {
    method: "POST",
    headers: { "x-filename": file.name, "x-mock": "0" },
    body: file,
  });
  if (!res.ok) throw new Error(`The scan service answered ${res.status}.`);
  const { id } = (await res.json()) as { id: string };
  return id;
}

export async function fetchScanStatus(id: string, base: string): Promise<ScanStatus> {
  const res = await fetch(`${base}/api/scan/${id}`);
  if (!res.ok) throw new Error(`The scan service answered ${res.status}.`);
  return (await res.json()) as ScanStatus;
}

/** The already-scanned room a sample video maps to, by filename; new videos get undefined. */
export function sampleRoomFor(filename: string): string | undefined {
  const name = filename.toLowerCase();
  if (name.includes("kitchen")) return "kitchen";
  if (name.includes("bathroom")) return "bathroom-v2";
  return undefined;
}

/** "about 1m 40s left", in 5–10 second steps so the countdown doesn't flicker. */
export function etaText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 3) return "almost done";
  const step = seconds < 60 ? 5 : 10;
  const s = Math.max(step, Math.round(seconds / step) * step);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m === 0) return `about ${rest}s left`;
  return rest ? `about ${m}m ${rest}s left` : `about ${m}m left`;
}
