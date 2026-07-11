# Permutation Mountain Diagrams

An interactive web app that draws the mountain diagram of a permutation
`w ∈ S_n`.

## Files

- `index.html` — page layout and controls
- `style.css`  — styling
- `diagram.js` — everything else, in three clearly separated layers:
  - **Pure math** (`permutationToDiagram`, `crossing`, `mountainY`, …) — no DOM,
    returns all geometry in math coordinates. Reusable for later work.
  - **Rendering** (`renderDiagram`) — draws the geometry into an `<svg>`.
  - **UI wiring** — input parsing, slider, Random button, export.

## The construction

Mountain `v` is the graph `y = |x − 2v|` for `x ∈ [v+1, v+n]` (a peak at
`(2v, 0)` with slope ∓1 arms; `y` points downward). Mountains `i < j` cross
once, at `(i+j, j−i)`.

- For `i = 1..n−1`, a red dot marks where mountain `w_i` meets `w_{i+1}`.
- Interior `i`: highlight (blue) the part of mountain `w_i` between its two dots.
- Endpoints `i = 1, n`: highlight the part of mountain `w_i` left of its one dot.

Consecutive highlights share a dot, so the blue is one connected path.

## Running locally

Just open `index.html` in a browser (no server or build step needed).

## Deploying to GitHub Pages

1. Create a GitHub repo and push these files (they can live in a subfolder).
2. In the repo: **Settings → Pages → Build and deployment**, set
   **Source = Deploy from a branch**, branch `main`, folder `/ (root)`
   (or `/docs` if you put the files there).
3. The site publishes at `https://<user>.github.io/<repo>/` (add the subfolder
   path if the files aren't at the repo root).
