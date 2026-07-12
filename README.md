# Permutation Mountain Diagrams

An interactive web app that draws the mountain diagram of a permutation
`w ∈ S_n`.

## Files

- `index.html` / `app.js` — single-diagram page (input, slider, Random,
  Random TCCW, export, click-to-trace, "show all northeast paths").
- `construction.html` / `construction.js` — the recursive TCCW construction
  `u = w' 1 v'`: two input diagrams `w`, `v` and a subset `X`, showing `w`, `v`
  and `u` with sub-diagram highlights, "Check TCCW", and click-to-trace.
- `style.css`  — styling for both pages.
- `diagram.js` — the shared library, in clearly separated layers:
  - **Pure math** (`permutationToDiagram`, `crossing`, `mountainY`, `neHighlight`,
    `isDiagramTCCW`, …) — no DOM, geometry in math coordinates.
  - **TCCW generation** (`buildTCCW` / `randomTCCW`, `constructU`) — the
    recursive construction; counts are the Euler zigzag numbers.
  - **Rendering** (`renderDiagram`) — draws the geometry into an `<svg>`.

## TCCW diagrams

A northeast path is *green* if it ends counterclockwise of where it begins
(terminal `j' ≤ j`). A diagram is **TCCW** iff every northeast path is green.
`u = w' 1 v'` is TCCW whenever `w`, `v` are; the number of TCCW diagrams of
size `n` is the Euler zigzag number (1, 1, 1, 2, 5, 16, 61, …).

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
