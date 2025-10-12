<!-- .github/copilot-instructions.md - guidance for AI coding agents -->
# Copilot instructions for Spontaynee (concise)

Purpose: help AI agents become productive quickly in this repo — a minimal static web app containing a single HTML entry, a JS file, and CSS.

- Repo layout to know:
  - `Index.html` — single-page entry (capital I). Treat this as the app's entrypoint.
  - `app.js` — client-side JavaScript. No server code present in the repository.
  - `style.css` — global styling for the page.

- Big-picture architecture (what you can assume from files present):
  - This is a static, client-side web project with no build system, package.json, or tests in the repo.
  - Data flows are DOM-centric: any application state will be stored/managed in the browser (in-memory) or via external APIs that the developer will add.

- Immediate developer workflows (how to run / test locally):
  - No build step required. The simplest ways to preview:

    # Open file in default browser (macOS)
    open Index.html

    # Or serve from a simple static server (recommended to avoid CORS / file: issues)
    python3 -m http.server 8000

  - If node tooling is later added, expect a `package.json` at the repo root — but none exists now.

- Project-specific conventions and cautions:
  - File name casing matters for cross-platform git usage: the entry file is `Index.html` (capital I). Avoid renaming to `index.html` without confirming with the repo owner.
  - Keep JS behavior in `app.js` and styling in `style.css`; this repo follows a simple separation of concerns (HTML anchor + single CSS + single JS).
  - Because there are no tests or CI configs, create small manual checks (open in browser or run http.server) and propose test scaffolding only after confirming with the author.

- Integration points & dependencies:
  - No external integrations are present in the repository files. If adding external APIs or libraries, document them in a new `README.md` and add `package.json` / lockfile as appropriate.

- How to make small, safe edits (guidance for automated code changes):
  - Keep changes minimal and limited to one logical unit per commit.
  - If you touch `Index.html`, ensure the page still loads in the browser and that `app.js` is referenced correctly.
  - Don’t change filename casing (e.g., `Index.html` → `index.html`) without confirming — it can confuse contributors on case-sensitive systems.

- Examples (explicit references):
  - To add a UI widget, edit `Index.html` to add the DOM node, put styling in `style.css`, and wire behavior in `app.js`.
  - To run the app locally after changes: `python3 -m http.server 8000` and open `http://localhost:8000/Index.html`.

- Merge & commit etiquette for AI agents:
  - Provide a concise commit message describing the change and why.
  - Open a PR rather than pushing large sweeping changes directly to main.

If anything above is unclear, or you want the agent to follow stricter rules (tests, linting, CI), ask the repo owner and I’ll update these instructions.
