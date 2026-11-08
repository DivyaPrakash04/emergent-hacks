import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileVideo, X } from "lucide-react";
import { hostActions, useHost } from "@/lib/roomsure/host";
import {
  etaText,
  fetchScanStatus,
  requestScan,
  roomTourPath,
  sampleRoomFor,
  scanServiceBase,
  type ScanStatus,
} from "@/lib/roomsure/scans";
import { Progress } from "@/components/ui/progress";

const SAMPLES = [
  { label: "kitchen video", href: "/host/sample-kitchen.mp4", download: "roomsure-sample-kitchen.mp4" },
  { label: "bathroom video", href: "/host/sample-bathroom.mp4", download: "roomsure-sample-bathroom.mp4" },
];

/** The quick staged pass a sample video plays: its room is already scanned. */
const SAMPLE_STAGES = ["Extracting frames", "Measuring walls and furniture", "Assembling the walkable room"];

/** Fallback stage text when the service sends none. */
const STATE_STAGE: Record<ScanStatus["state"], string> = {
  queued: "Waiting for the scan service",
  extracting: "Extracting frames",
  generating: "Generating the walkable room",
  done: "Finishing up",
  error: "Something went wrong",
};

const OFFLINE_NOTE = "Live scanning isn't available right now — try a sample video.";
const POLL_MS = 1500;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isVideo = (f: File) => f.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(f.name);

/** The room a tour address points at, for "Scan attached · kitchen". */
function roomLabel(tourUrl: string): string | null {
  const room = /[?&]room=([^&]+)/.exec(tourUrl)?.[1];
  return room ? decodeURIComponent(room).replace(/-v\d+$/, "").replace(/-/g, " ") : null;
}

interface Scanning {
  filename: string;
  stage: string;
  /** 0..1 */
  progress: number;
  /** Last etaSeconds from the service and when it arrived; null for the quick sample pass. */
  eta: { seconds: number; at: number } | null;
}

export function ScanFromVideo() {
  const tourUrl = useHost((s) => s.draft.tourUrl);
  const [scanning, setScanning] = useState<Scanning | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // While the service reports an ETA, re-render each second so the countdown moves.
  useEffect(() => {
    if (!scanning?.eta) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [scanning?.eta]);

  const attach = (room: string) => {
    if (!alive.current) return;
    setScanning(null);
    const saved = hostActions.updateDraft({ withTour: true, tourUrl: roomTourPath(room) });
    if (!saved) setNote("This browser's storage is full. Remove a photo or a published room and try again.");
  };

  const fail = (message: string) => {
    if (!alive.current) return;
    setScanning(null);
    setNote(message);
  };

  const scan = async (file: File | undefined) => {
    if (!file || scanning) return;
    if (!isVideo(file)) return setNote("That doesn't look like a video — try an MP4 or MOV.");
    setNote(null);

    // Sample videos: the matching room is already scanned, so play a short staged pass and attach it.
    const sample = sampleRoomFor(file.name);
    if (sample) {
      for (const [i, stage] of SAMPLE_STAGES.entries()) {
        if (!alive.current) return;
        setScanning({ filename: file.name, stage, progress: (i + 0.7) / SAMPLE_STAGES.length, eta: null });
        await wait(800);
      }
      return attach(sample);
    }

    // A new video goes to the local scan service (scans.ts); its room attaches when the scan is done.
    setScanning({ filename: file.name, stage: "Uploading your video", progress: 0.02, eta: null });
    const base = scanServiceBase(window.location.port);
    let id: string;
    try {
      id = await requestScan(file, base);
    } catch {
      return fail(OFFLINE_NOTE);
    }
    for (;;) {
      if (!alive.current) return;
      let status: ScanStatus;
      try {
        status = await fetchScanStatus(id, base);
      } catch {
        return fail(OFFLINE_NOTE);
      }
      if (status.state === "error") return fail("That video couldn't be turned into a room. Try a steadier take, or a sample video.");
      if (status.state === "done") {
        if (status.roomId) return attach(status.roomId);
        return fail("The scan finished but no room came back — try again, or use a sample video.");
      }
      if (!alive.current) return;
      setScanning({
        filename: file.name,
        stage: status.stage || STATE_STAGE[status.state],
        progress: Math.min(1, Math.max(0.02, status.progress)),
        eta: { seconds: status.etaSeconds, at: Date.now() },
      });
      await wait(POLL_MS);
    }
  };

  const attachedRoom = tourUrl ? roomLabel(tourUrl) : null;
  const remaining = scanning?.eta ? scanning.eta.seconds - (Date.now() - scanning.eta.at) / 1000 : null;

  return (
    <div className="space-y-3 border-t border-hairline pt-3">
      <p className="text-[14px] font-semibold text-foreground">Scan your room from a video</p>

      {tourUrl ? (
        <div className="flex items-start gap-2 rounded-xl bg-primary-soft/60 px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
          <p className="flex-1 text-[14px] text-foreground">
            <span className="font-semibold">Scan attached{attachedRoom ? ` · ${attachedRoom}` : ""}.</span>{" "}
            Seekers will walk this exact room in the 3D tour.
          </p>
          <button type="button" aria-label="Remove the scanned tour"
            onClick={() => hostActions.updateDraft({ tourUrl: "" })}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-risk">
            <X className="size-4" />
          </button>
        </div>
      ) : scanning ? (
        <div role="status" aria-live="polite" className="space-y-2 rounded-xl border border-hairline bg-background p-3">
          <p className="truncate text-[13px] font-medium text-muted-foreground">{scanning.filename}</p>
          <Progress value={Math.round(scanning.progress * 100)} aria-label="Scan progress" />
          <p className="text-[14px] font-medium text-foreground">
            {scanning.stage}…
            {remaining != null && <span className="font-normal text-muted-foreground"> · {etaText(remaining)}</span>}
          </p>
        </div>
      ) : (
        <>
          <label htmlFor="room-scan-video"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void scan(e.dataTransfer.files?.[0]);
            }}
            className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline bg-background px-4 py-5 text-center text-[13px] font-medium text-muted-foreground hover:border-primary hover:text-primary">
            <FileVideo className="size-6" />
            Drop a slow phone video of the room here, or browse
          </label>
          <input id="room-scan-video" type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              void scan(f);
            }} />
        </>
      )}

      {note && <p role="status" className="rounded-xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">{note}</p>}

      <p className="text-[13px] text-muted-foreground">
        No video handy? Try a sample:{" "}
        {SAMPLES.map((s, i) => (
          <span key={s.download}>
            {i > 0 && " · "}
            <a href={s.href} download={s.download}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <Download className="size-3.5" aria-hidden /> {s.label}
            </a>
          </span>
        ))}{" "}
        — then drop it above.
      </p>
    </div>
  );
}
