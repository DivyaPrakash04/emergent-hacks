#!/usr/bin/env python3
"""Serve the RoomWalk viewer: python3 serve.py [port]

Like `python3 -m http.server`, plus the two headers (COOP/COEP) that let the browser use
shared memory, which makes sorting big real scans (1M+ splats) noticeably smoother.
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter
        if "GET /jobs" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = Path(__file__).resolve().parent
    srv = ThreadingHTTPServer(("0.0.0.0", port), partial(Handler, directory=str(root)))
    print(f"RoomWalk viewer at http://localhost:{port}  (Ctrl+C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
