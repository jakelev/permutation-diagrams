"use strict";

/* ============================================================================
 *  PERMUTATION MOUNTAIN DIAGRAMS
 *  ---------------------------------------------------------------------------
 *  Given a permutation w = w_1 ... w_n in S_n, we draw an arrangement of n
 *  "mountains" (tents).  Mountain v is the graph  y = |x - 2v|  for
 *  x in [v+1, v+n], i.e. a peak at (2v, 0) with two slope-(-/+)1 arms.
 *
 *  Coordinate convention (matches the "(i,j) rotated 45 degrees" remark):
 *    - x runs left->right, y runs top->bottom (peaks at the top, y = 0).
 *    - Mountains i < j cross once, at  (x, y) = (i + j, j - i).
 *    - Along any single mountain, x is monotone increasing from its left
 *      end, up over the peak, down to its right end; so "to the left of a
 *      dot" simply means "smaller x on that mountain".
 *
 *  The construction:
 *    - For i = 1..n-1, place a red dot where mountain w_i meets w_{i+1}.
 *    - For interior i (2..n-1), mountain w_i carries two dots; highlight the
 *      sub-path of that mountain between them (blue).
 *    - For i = 1 and i = n, mountain w_i carries one dot; highlight the whole
 *      part of that mountain to the left of the dot.
 *  Consecutive highlights share a crossing dot, so the blue traces a single
 *  connected path from w_1's left end to w_n's left end.
 *
 *  `permutationToDiagram(w)` is PURE (no DOM) and returns all geometry in
 *  math coordinates, so it can be reused for later mathematical work.
 * ==========================================================================*/

/* ------------------------------------------------------------------ */
/*  Pure geometry helpers                                              */
/* ------------------------------------------------------------------ */

// Height of mountain v at horizontal position x.
function mountainY(v, x) {
  return Math.abs(x - 2 * v);
}

// x-position where mountain v's left / right arm meets the black frame.
//   left frame arm  x - y = 1      => leftFrameX(v)  = v + 0.5
//   right frame arm x + y = 2n + 1 => rightFrameX(v) = n + v + 0.5
function leftFrameX(v)     { return v + 0.5; }
function rightFrameX(v, n) { return n + v + 0.5; }

// Endpoints (in math coords) of mountain v for a size-n arrangement.
// Each arm is extended until it meets the black frame; peak at (2v, 0).
function mountainEnds(v, n) {
  const xl = leftFrameX(v), xr = rightFrameX(v, n);
  return {
    v,
    leftEnd:  { x: xl,    y: mountainY(v, xl) },
    peak:     { x: 2 * v, y: 0 },
    rightEnd: { x: xr,    y: mountainY(v, xr) },
  };
}

// Crossing point of mountains a and b (order-independent).
function crossing(a, b) {
  const i = Math.min(a, b), j = Math.max(a, b);
  return { x: i + j, y: j - i };
}

// Poly-line vertices of mountain v between horizontal positions xa <= xb,
// inserting the peak vertex if the sub-path passes over it.
function mountainSubPath(v, xa, xb) {
  const pts = [{ x: xa, y: mountainY(v, xa) }];
  if (xa < 2 * v && 2 * v < xb) pts.push({ x: 2 * v, y: 0 });
  pts.push({ x: xb, y: mountainY(v, xb) });
  return pts;
}

// The sub-path of mountain v between two points, oriented to start at `from`.
function orientedArc(v, from, to) {
  const pts = mountainSubPath(v, Math.min(from.x, to.x), Math.max(from.x, to.x));
  if (Math.abs(pts[0].x - from.x) > 1e-9) pts.reverse();
  return pts;
}

/* ------------------------------------------------------------------ */
/*  Core construction: permutation -> diagram data                     */
/* ------------------------------------------------------------------ */

/**
 * @param {number[]} w  a permutation of 1..n (1-indexed values, 0-indexed array)
 * @returns diagram geometry in math coordinates
 */
function permutationToDiagram(w) {
  const n = w.length;

  // The n mountains (light-gray tents). Mountains 1 and n are the black frame.
  const mountains = [];
  for (let v = 1; v <= n; v++) mountains.push(mountainEnds(v, n));

  // Red dots: crossing of consecutive values, for i = 1..n-1.
  // dotX[i] is the x-position of the dot to the RIGHT of position i (1-indexed).
  const dots = [];
  const dotXAtStep = new Array(n + 1); // dotXAtStep[i] for i = 1..n-1
  for (let i = 1; i <= n - 1; i++) {
    const a = w[i - 1], b = w[i]; // w_i, w_{i+1}
    const c = crossing(a, b);
    dots.push({ step: i, pair: [Math.min(a, b), Math.max(a, b)], x: c.x, y: c.y });
    dotXAtStep[i] = c.x;
  }

  // Blue highlights: one per position i = 1..n.
  // n = 1 is special: no dots, so highlight the left half of the single mountain.
  const highlights = [];
  if (n === 1) {
    highlights.push({
      position: 1, mountain: w[0],
      points: mountainSubPath(w[0], leftFrameX(w[0]), 2 * w[0]),
    });
  }
  for (let i = 1; n >= 2 && i <= n; i++) {
    const v = w[i - 1]; // the mountain used at position i
    let xa, xb;
    if (i === 1) {
      // endpoint: from the frame (mountain's left end) to its single dot (step 1)
      xa = leftFrameX(v);
      xb = dotXAtStep[1];
    } else if (i === n) {
      // endpoint: from the frame (mountain's left end) to its single dot (step n-1)
      xa = leftFrameX(v);
      xb = dotXAtStep[n - 1];
    } else {
      // interior: between the two dots (steps i-1 and i)
      const x1 = dotXAtStep[i - 1], x2 = dotXAtStep[i];
      xa = Math.min(x1, x2);
      xb = Math.max(x1, x2);
    }
    highlights.push({
      position: i,
      mountain: v,
      points: mountainSubPath(v, xa, xb),
    });
  }

  // Black outer chevron: a wide "V" sitting strictly outside every mountain,
  // with slope-(+/-)1 arms whose top corners are half a position unit beyond
  // mountains 1 and n (i.e. at x = 1 and x = 2n+1, positions 0.5 and n+0.5).
  // n = 0 (empty permutation) is a small standalone chevron with no mountains.
  const frame = n === 0
    ? [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }]
    : [
        { x: 1,         y: 0 },
        { x: n + 1,     y: n }, // bottom vertex, one unit below the lowest crossing
        { x: 2 * n + 1, y: 0 },
      ];

  // The blue path as an ordered chain of nodes joined by arcs:
  //   node_0 (frame end of w_1) - dot_1 - dot_2 - ... - dot_{n-1} - node_n (frame end of w_n)
  // arc[t] is the blue sub-path on mountain w_t, oriented node_{t-1} -> node_t.
  // Interior nodes carry their crossing's (i, j) with i = min. Used for click tracing.
  // (Only meaningful when there are dots to click, i.e. n >= 2.)
  const nodes = new Array(n + 1);
  const arcs = new Array(n + 1);
  if (n >= 1) {
    nodes[0] = { ...mountainEnds(w[0], n).leftEnd, end: true };
    for (let t = 1; t <= n - 1; t++) {
      nodes[t] = { x: dots[t - 1].x, y: dots[t - 1].y, i: dots[t - 1].pair[0], j: dots[t - 1].pair[1] };
    }
    nodes[n] = { ...mountainEnds(w[n - 1], n).leftEnd, end: true };
    for (let t = 1; t <= n; t++) arcs[t] = orientedArc(w[t - 1], nodes[t - 1], nodes[t]);
  }

  return { n, w: w.slice(), mountains, dots, highlights, frame, nodes, arcs };
}

/* ------------------------------------------------------------------ */
/*  Click-to-trace: the "northeast" sub-path from a red dot            */
/* ------------------------------------------------------------------ */

// Append arc points onto pts, skipping arc[0] (it coincides with pts' last point).
function appendArc(pts, arc) {
  for (let k = 1; k < arc.length; k++) pts.push(arc[k]);
}

/**
 * Trace the highlight produced by clicking the red dot at step s (1..n-1),
 * i.e. the crossing (i, j) of w_s and w_{s+1}.
 *
 * The northeast branch runs along mountain j (the larger index). We follow the
 * blue path in that direction ("away from i, starting at j" in the permutation)
 * until we reach a dot whose smaller index i' < i, or the end of the path.
 * If the branch along j does not actually head northeast (its next node has
 * smaller x), there is no NE path and we highlight the dot alone.
 *
 * `endJ` is the larger index j' of the terminus: the value of the last mountain
 * the trace runs along (= the terminal dot's j in the stop case). Used for the
 * red/green coloring in "show all" mode. For a dot-only trace, endJ = j.
 *
 * @returns { dotOnly, clicked: {x,y}, points: [{x,y}, ...], startJ, endJ }
 */
function neHighlight(diagram, s) {
  const { nodes, arcs, w, n } = diagram;
  const nd = nodes[s];
  const i = nd.i;
  const clicked = { x: nd.x, y: nd.y };

  // Pattern "i j" (w_s < w_{s+1}) reads forward; "j i" reads backward.
  const dir = w[s - 1] < w[s] ? 1 : -1;
  const neighbor = nodes[s + dir];
  if (!(neighbor.x > nd.x))
    return { dotOnly: true, clicked, points: [clicked], startJ: nd.j, endJ: nd.j };

  const pts = [clicked];
  let endJ;
  if (dir === 1) {
    for (let t = s + 1; ; t++) {
      appendArc(pts, arcs[t]);
      endJ = w[t - 1]; // mountain w_t just traversed
      if (t === n || nodes[t].i < i) break;
    }
  } else {
    for (let t = s; ; t--) {
      appendArc(pts, arcs[t].slice().reverse());
      endJ = w[t - 1];
      if (t - 1 === 0 || nodes[t - 1].i < i) break;
    }
  }
  return { dotOnly: false, clicked, points: pts, startJ: nd.j, endJ };
}

/* ------------------------------------------------------------------ */
/*  Permutation parsing / validation / generation                     */
/* ------------------------------------------------------------------ */

// Parse a user string into a permutation array.
// Accepts space/comma separated always; bare digit strings only when n <= 9.
// Returns { ok, w, n, error }.
function parsePermutation(str) {
  const s = (str || "").trim();
  if (s === "") return { ok: true, w: [], n: 0 }; // empty permutation

  let parts;
  if (/[\s,]/.test(s)) {
    parts = s.split(/[\s,]+/).filter((t) => t.length > 0);
  } else if (/^\d+$/.test(s)) {
    parts = s.split(""); // bare digit string, e.g. 24153
  } else {
    return { ok: false, error: "Use digits, optionally separated by spaces or commas." };
  }

  const w = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { ok: false, error: `"${p}" is not a number.` };
    w.push(parseInt(p, 10));
  }

  const n = w.length;
  if (n < 1) return { ok: false, error: "Enter a permutation." };

  // Must be a permutation of 1..n.
  const seen = new Array(n + 1).fill(false);
  for (const val of w) {
    if (val < 1 || val > n) {
      return { ok: false, error: `w must be a permutation of 1..${n}; got ${val}.` };
    }
    if (seen[val]) return { ok: false, error: `Value ${val} is repeated.` };
    seen[val] = true;
  }
  return { ok: true, w, n };
}

// Format a permutation for display: compact for n <= 9, space-separated otherwise.
function formatPermutation(w) {
  return w.length <= 9 ? w.join("") : w.join(" ");
}

// Uniform random permutation of 1..n (Fisher-Yates).
function randomPermutation(n) {
  const w = [];
  for (let i = 1; i <= n; i++) w.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [w[i], w[j]] = [w[j], w[i]];
  }
  return w;
}

/* ------------------------------------------------------------------ */
/*  SVG rendering                                                      */
/* ------------------------------------------------------------------ */

const SVG_NS = "http://www.w3.org/2000/svg";
const U = 40; // pixels per math unit

function el(name, attrs) {
  const e = document.createElementNS(SVG_NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// Convert a list of math points to an SVG "x,y x,y ..." points string.
function ptsStr(points) {
  return points.map((p) => `${p.x * U},${p.y * U}`).join(" ");
}

// Tunable appearance of the "show all" red/green paths (live-editable in the UI).
const DEFAULT_PATH_STYLE = {
  redColor: "#dc2626", redOpacity: 0.6,
  greenColor: "#16a34a", greenOpacity: 0.5,
  blend: "normal", // mix-blend-mode for the colored paths
  top: "red",      // which color is drawn last (on top)
  redWidth: 1.5,   // stroke widths as a multiple of the blue path width
  greenWidth: 4.0,
};

/**
 * Render a diagram into an <svg> element (cleared first).
 *
 * options.selectedStep : step (1..n-1) of a clicked dot to trace, or null
 * options.onDotClick   : callback(step) invoked when a red dot is clicked
 */
function renderDiagram(diagram, svg, options = {}) {
  const { n, mountains, dots, highlights, frame } = diagram;
  const { selectedStep = null, onDotClick = null, showAll = false } = options;
  // overlays: extra colored sub-paths [{points, color, width, opacity}] (page 2).
  // singleGreenRed: color a single clicked trace green/red by TCCW instead of amber.
  const { overlays = [], singleGreenRed = false } = options;
  const style = { ...DEFAULT_PATH_STYLE, ...(options.style || {}) };

  // ---- viewBox (math bbox padded for labels) ----
  // The frame is the outermost element, so derive bounds from it (also works
  // for n = 0, where the frame is a small standalone chevron).
  const fx = frame.map((p) => p.x), fy = frame.map((p) => p.y);
  const xMin = Math.min(...fx), xMax = Math.max(...fx), yMin = Math.min(...fy), yMax = Math.max(...fy);
  const padX = 0.5, padTop = 1.2, padBottom = 0.4;
  const vbX = (xMin - padX) * U;
  const vbY = (yMin - padTop) * U;
  const vbW = (xMax - xMin + 2 * padX) * U;
  const vbH = (yMax - yMin + padTop + padBottom) * U;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // stroke widths scale gently with n so dense diagrams stay legible
  const k = Math.max(0.45, Math.min(1, 8 / n));
  const rDot = 4.5 * k;
  const wGray = 1.6 * k, wFrame = 3 * k, wBlue = 0.5 * rDot;

  const gGray = el("g", {});
  const gFrame = el("g", {});
  const gBlue = el("g", {});
  const gOverlay = el("g", {});
  const gDots = el("g", {});
  const gLabels = el("g", {});

  const HL = "#f59e0b"; // amber highlight for a single traced sub-path

  // all NE traces (step 1..n-1), computed once for both paths and dot-markers
  const allTraces = showAll
    ? Array.from({ length: n - 1 }, (_, idx) => neHighlight(diagram, idx + 1))
    : null;
  const isRed = (t) => t.endJ > t.startJ; // red if j' > j, else green

  // ---- mountains (all light gray) ----
  for (const m of mountains) {
    gGray.appendChild(el("polyline", {
      points: ptsStr([m.leftEnd, m.peak, m.rightEnd]),
      fill: "none",
      stroke: "#cbd0d8",
      "stroke-width": wGray,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));
  }

  // ---- black outer chevron ----
  gFrame.appendChild(el("polyline", {
    points: ptsStr(frame),
    fill: "none",
    stroke: "#111827",
    "stroke-width": wFrame,
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
  }));

  // ---- blue highlighted path (always visible; NE colors overlay it) ----
  for (const h of highlights) {
    if (h.points.length < 2) continue; // degenerate (dot at the very left end)
    gBlue.appendChild(el("polyline", {
      points: ptsStr(h.points),
      fill: "none",
      stroke: "#2f7bf0",
      "stroke-width": wBlue,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));
  }

  // ---- all NE paths, red/green color-coded (appearance is user-tunable) ----
  // Dot-only (length-0) traces are shown as green dot-markers in the dots layer.
  if (showAll) {
    const drawTrace = (t, color, opacity, widthMul) => {
      if (t.points.length < 2) return;
      const poly = el("polyline", {
        points: ptsStr(t.points),
        fill: "none",
        stroke: color,
        "stroke-width": wBlue * widthMul,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "stroke-opacity": String(opacity),
      });
      if (style.blend && style.blend !== "normal") poly.style.mixBlendMode = style.blend;
      gOverlay.appendChild(poly);
    };
    const drawReds = () => { for (const t of allTraces) if (isRed(t)) drawTrace(t, style.redColor, style.redOpacity, style.redWidth); };
    const drawGreens = () => { for (const t of allTraces) if (!isRed(t)) drawTrace(t, style.greenColor, style.greenOpacity, style.greenWidth); };
    // draw the "top" color last so it lands on top
    if (style.top === "red") { drawGreens(); drawReds(); } else { drawReds(); drawGreens(); }
  }

  // ---- extra sub-path overlays (page 2: w / v / 1-mountain subdiagrams) ----
  for (const ov of overlays) {
    if (!ov.points || ov.points.length < 2) continue;
    gOverlay.appendChild(el("polyline", {
      points: ptsStr(ov.points),
      fill: "none",
      stroke: ov.color,
      "stroke-width": wBlue * (ov.width || 2.5),
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      "stroke-opacity": String(ov.opacity != null ? ov.opacity : 0.5),
    }));
  }

  // ---- single traced sub-path overlay (from a clicked dot) ----
  // On page 1 this is amber; on page 2 (singleGreenRed) it is green/red by TCCW.
  const selTrace = selectedStep != null ? neHighlight(diagram, selectedStep) : null;
  const selGreen = selTrace ? !isRed(selTrace) : false;
  const selColor = singleGreenRed ? (selGreen ? style.greenColor : style.redColor) : HL;
  if (selTrace && !selTrace.dotOnly) {
    gOverlay.appendChild(el("polyline", {
      points: ptsStr(selTrace.points),
      fill: "none",
      stroke: selColor,
      "stroke-width": wBlue * (singleGreenRed ? 1.5 : 2.1),
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      "stroke-opacity": singleGreenRed ? "1" : "0.85",
    }));
  }

  // ---- red dots (clickable); in "show all", length-0 traces get a green marker ----
  for (const d of dots) {
    const isSel = d.step === selectedStep;
    const dotOnlyGreen = showAll && allTraces[d.step - 1].dotOnly;
    const c = el("circle", {
      cx: d.x * U, cy: d.y * U, r: isSel || dotOnlyGreen ? rDot * 1.25 : rDot,
      fill: isSel ? selColor : dotOnlyGreen ? style.greenColor : "#e23b3b",
      stroke: "#ffffff", "stroke-width": rDot * 0.35,
    });
    if (onDotClick) {
      c.style.cursor = "pointer";
      c.addEventListener("click", (ev) => { ev.stopPropagation(); onDotClick(d.step); });
    }
    gDots.appendChild(c);
  }

  // ---- position labels 1..n above the peaks ----
  for (let v = 1; v <= n; v++) {
    const t = el("text", {
      x: 2 * v * U, y: (yMin - 0.5) * U,
      "text-anchor": "middle",
      "font-size": Math.max(12, 20 * k),
      "font-family": "system-ui, sans-serif",
      fill: "#374151",
    });
    t.textContent = String(v);
    gLabels.appendChild(t);
  }

  // draw order: gray, frame, blue, overlay, dots, labels
  svg.appendChild(gGray);
  svg.appendChild(gFrame);
  svg.appendChild(gBlue);
  svg.appendChild(gOverlay);
  svg.appendChild(gDots);
  svg.appendChild(gLabels);

  fitToView(svg);
}

// Size the SVG to the largest box fitting both the container width and the
// remaining viewport height; the viewBox letterboxes the drawing to fit.
function fitToView(svg) {
  const vb = svg.viewBox.baseVal;
  if (!vb || !vb.height) return;
  const aspect = vb.width / vb.height;
  const wrap = svg.parentElement;
  const cs = getComputedStyle(wrap);
  const maxW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const top = svg.getBoundingClientRect().top;
  const availH = Math.max(200, window.innerHeight - top - 24);
  const w = Math.min(maxW, availH * aspect);
  svg.style.width = w + "px";
  svg.style.height = w / aspect + "px";
}

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

function svgMarkup(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("style", "background:#ffffff");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportSVG(svg, name) {
  downloadBlob(new Blob([svgMarkup(svg)], { type: "image/svg+xml" }), name + ".svg");
}

function exportPNG(svg, name, scale = 2) {
  const vb = svg.viewBox.baseVal;
  const w = Math.round(vb.width * scale), h = Math.round(vb.height * scale);
  const img = new Image();
  const svgBlob = new Blob([svgMarkup(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => downloadBlob(blob, name + ".png"), "image/png");
  };
  img.src = url;
}

/* ------------------------------------------------------------------ */
/*  TCCW property                                                      */
/* ------------------------------------------------------------------ */

// A diagram is TCCW iff every northeast path is green (ends counterclockwise,
// i.e. terminal j' <= starting j).
function isDiagramTCCW(diagram) {
  for (let s = 1; s <= diagram.n - 1; s++) {
    const t = neHighlight(diagram, s);
    if (t.endJ > t.startJ) return false;
  }
  return true;
}

// The blue sub-path of a diagram spanning positions t1..t2 (1-indexed), i.e.
// from node_{t1-1} to node_{t2}. Used to highlight the w / v / 1 subdiagrams.
function pathOverPositions(diagram, t1, t2) {
  if (t2 < t1) return [];
  const pts = [{ ...diagram.arcs[t1][0] }];
  for (let t = t1; t <= t2; t++) appendArc(pts, diagram.arcs[t]);
  return pts;
}

/* ------------------------------------------------------------------ */
/*  TCCW generation & the recursive construction u = w' 1 v'          */
/* ------------------------------------------------------------------ */

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

// c[k] = number of TCCW diagrams of size k ( = |A_k| = |D_k| ), the Euler
// zigzag numbers 1,1,1,2,5,16,61,...  2 c_k = sum_a C(k-1,a) c_a c_{k-1-a}.
const _tccwC = [1, 1];
function tccwCount(k) {
  while (_tccwC.length <= k) {
    const j = _tccwC.length;
    let total = 0;
    for (let a = 0; a <= j - 1; a++) total += comb(j - 1, a) * _tccwC[a] * _tccwC[j - 1 - a];
    _tccwC[j] = total / 2;
  }
  return _tccwC[k];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Relabel a permutation's values 1..k onto the sorted target set.
function relabel(p, sortedSet) {
  return p.map((x) => sortedSet[x - 1]);
}

// Reverse p if needed so that (leFirst ? p_1<=p_n : p_1>=p_n).
function orient(p, leFirst) {
  if (p.length < 2) return p.slice();
  const ok = leFirst ? p[0] <= p[p.length - 1] : p[0] >= p[p.length - 1];
  return ok ? p.slice() : p.slice().reverse();
}

/**
 * The recursive construction u = w' 1 v'.
 * w is oriented to w_1<=w_n, v to v_1>=v_m; w' relabels w onto sorted(X),
 * v' relabels v onto sorted(Y = {2..N}\X). Returns u plus the pieces.
 */
function constructU(w, v, X) {
  const wc = orient(w, true);
  const vc = orient(v, false);
  const n = wc.length, m = vc.length, N = n + m + 1;
  const Xs = X.slice().sort((a, b) => a - b);
  const inX = new Set(Xs);
  const Ys = [];
  for (let x = 2; x <= N; x++) if (!inX.has(x)) Ys.push(x);
  const u = [...relabel(wc, Xs), 1, ...relabel(vc, Ys)];
  return { u, wc, vc, X: Xs, Y: Ys, n, m, N };
}

// A uniform random n-element subset of {2..N}, sorted.
function randomSubset(n, N) {
  const pool = [];
  for (let x = 2; x <= N; x++) pool.push(x);
  return shuffle(pool).slice(0, n).sort((a, b) => a - b);
}

/**
 * A uniformly random TCCW permutation of size N.
 * mode 'A' forces w_1<w_n, 'D' forces w_1>w_n, null leaves it free.
 * (Uniform because (a, w in A_a, v in D_b, X) <-> A_N u D_N is a bijection.)
 */
function buildTCCW(N, mode = null) {
  if (N <= 0) return [];
  if (N === 1) return [1];
  const wts = [];
  let tot = 0;
  for (let a = 0; a <= N - 1; a++) {
    const wt = comb(N - 1, a) * tccwCount(a) * tccwCount(N - 1 - a);
    wts.push(wt);
    tot += wt;
  }
  let r = Math.random() * tot, a = 0;
  while (a < N - 1 && r >= wts[a]) { r -= wts[a]; a++; }
  const b = N - 1 - a;
  const w = buildTCCW(a, "A");
  const v = buildTCCW(b, "D");
  const X = randomSubset(a, N);
  const { u } = constructU(w, v, X);
  if (mode === "A" && u[0] > u[u.length - 1]) return u.slice().reverse();
  if (mode === "D" && u[0] < u[u.length - 1]) return u.slice().reverse();
  return u;
}

function randomTCCW(N) { return buildTCCW(N, null); }
