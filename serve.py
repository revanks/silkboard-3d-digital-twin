#!/usr/bin/env python3
"""Zero-dependency static file server for the built 3D City digital twin.

Serves the `dist/` folder produced by `npm run build` (Vite). Requires only
a standard Python 3 install -- no Node.js, no npm, no pip packages. This lets
the app run on a machine that has Python but hit Node-related install errors
(missing node_modules, EPERM on npm ci, etc).

`dist/` is committed to this repo, so a fresh clone/copy already has it.
Only rebuild+recommit `dist/` (`npm run build` on a machine with Node) after
changing anything under `src/` or `public/`.

Usage:
    python serve.py [port]      (default port 4173)
"""
import http.server
import os
import socketserver
import sys

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class Handler(http.server.SimpleHTTPRequestHandler):
    # Windows' registry-derived MIME guesses can misidentify .js/.json,
    # which makes browsers refuse to load the Vite build's ES module script
    # ("Expected a JavaScript module script but the server responded with a
    # MIME type of text/plain"). Force the correct types explicitly.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".html": "text/html",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173

    if not os.path.isdir(DIST_DIR):
        print(f"ERROR: {DIST_DIR} not found.")
        print("This means dist/ wasn't committed/pulled, or you're running this")
        print("from the wrong directory. Run from a machine with Node.js:")
        print("    npm run build")
        print("and commit the resulting dist/ folder.")
        sys.exit(1)

    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"Serving 3D City digital twin at http://localhost:{port}/")
        print("(No Node.js needed -- this serves the pre-built dist/ folder.)")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
