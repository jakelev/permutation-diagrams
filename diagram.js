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
  const highlights = [];
  for (let i = 1; i <= n; i++) {
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
  const frame = [
    { x: 1,         y: 0 },
    { x: n + 1,     y: n }, // bottom vertex, one unit below the lowest crossing
    { x: 2 * n + 1, y: 0 },
  ];

  // The blue path as an ordered chain of nodes joined by arcs:
  //   node_0 (frame end of w_1) - dot_1 - dot_2 - ... - dot_{n-1} - node_n (frame end of w_n)
  // arc[t] is the blue sub-path on mountain w_t, oriented node_{t-1} -> node_t.
  // Interior nodes carry their crossing's (i, j) with i = min. Used for click tracing.
  const nodes = new Array(n + 1);
  nodes[0] = { ...mountainEnds(w[0], n).leftEnd, end: true };
  for (let t = 1; t <= n - 1; t++) {
    nodes[t] = { x: dots[t - 1].x, y: dots[t - 1].y, i: dots[t - 1].pair[0], j: dots[t - 1].pair[1] };
  }
  nodes[n] = { ...mountainEnds(w[n - 1], n).leftEnd, end: true };

  const arcs = new Array(n + 1);
  for (let t = 1; t <= n; t++) arcs[t] = orientedArc(w[t - 1], nodes[t - 1], nodes[t]);

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
 * @returns { dotOnly, clicked: {x,y}, points: [{x,y}, ...] }
 */
function neHighlight(diagram, s) {
  const { nodes, arcs, w, n } = diagram;
  const nd = nodes[s];
  const i = nd.i;
  const clicked = { x: nd.x, y: nd.y };

  // Pattern "i j" (w_s < w_{s+1}) reads forward; "j i" reads backward.
  const dir = w[s - 1] < w[s] ? 1 : -1;
  const neighbor = nodes[s + dir];
  if (!(neighbor.x > nd.x)) return { dotOnly: true, clicked, points: [clicked] };

  const pts = [clicked];
  if (dir === 1) {
    for (let t = s + 1; ; t++) {
      appendArc(pts, arcs[t]);
      if (t === n || nodes[t].i < i) break;
    }
  } else {
    for (let t = s; ; t--) {
      appendArc(pts, arcs[t].slice().reverse());
      if (t - 1 === 0 || nodes[t - 1].i < i) break;
    }
  }
  return { dotOnly: false, clicked, points: pts };
}

/* ------------------------------------------------------------------ */
/*  Permutation parsing / validation / generation                     */
/* ------------------------------------------------------------------ */

// Parse a user string into a permutation array.
// Accepts space/comma separated always; bare digit strings only when n <= 9.
// Returns { ok, w, n, error }.
function parsePermutation(str) {
  const s = (str || "").trim();
  if (s === "") return { ok: false, error: "Enter a permutation." };

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

/**
 * Render a diagram into an <svg> element (cleared first).
 *
 * options.selectedStep : step (1..n-1) of a clicked dot to trace, or null
 * options.onDotClick   : callback(step) invoked when a red dot is clicked
 */
function renderDiagram(diagram, svg, options = {}) {
  const { n, mountains, dots, highlights, frame } = diagram;
  const { selectedStep = null, onDotClick = null } = options;

  // ---- viewBox (math bbox padded for labels) ----
  // The frame is the widest/deepest element: x in [1, 2n+1], down to y = n.
  const xMin = 1, xMax = 2 * n + 1, yMin = 0, yMax = n;
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

  const HL = "#f59e0b"; // amber highlight for the traced sub-path

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

  // ---- blue highlighted path ----
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

  // ---- traced sub-path overlay (from a clicked dot) ----
  const trace = selectedStep != null ? neHighlight(diagram, selectedStep) : null;
  if (trace && !trace.dotOnly) {
    gOverlay.appendChild(el("polyline", {
      points: ptsStr(trace.points),
      fill: "none",
      stroke: HL,
      "stroke-width": wBlue * 2.1,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      "stroke-opacity": "0.85",
    }));
  }

  // ---- red dots (clickable) ----
  for (const d of dots) {
    const isSel = d.step === selectedStep;
    const c = el("circle", {
      cx: d.x * U, cy: d.y * U, r: isSel ? rDot * 1.25 : rDot,
      fill: isSel ? HL : "#e23b3b",
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
/*  UI wiring                                                          */
/* ------------------------------------------------------------------ */

(function main() {
  if (typeof document === "undefined") return; // allow use as a pure module

  const $ = (id) => document.getElementById(id);
  const wInput = $("w-input");
  const nSlider = $("n-slider");
  const nValue = $("n-value");
  const errBox = $("error");
  const svg = $("diagram");

  let current = { w: null, diagram: null, selectedStep: null };

  function setError(msg) {
    errBox.textContent = msg || "";
    errBox.style.display = msg ? "block" : "none";
  }

  function paint() {
    renderDiagram(current.diagram, svg, {
      selectedStep: current.selectedStep,
      onDotClick: (step) => {
        current.selectedStep = current.selectedStep === step ? null : step;
        paint();
      },
    });
  }

  function draw(w) {
    current.w = w;
    current.diagram = permutationToDiagram(w);
    current.selectedStep = null; // clear any trace on a new permutation
    nSlider.value = String(w.length);
    nValue.textContent = String(w.length);
    wInput.value = formatPermutation(w);
    setError("");
    paint();
  }

  // clicking empty canvas clears the current trace
  svg.addEventListener("click", () => {
    if (current.selectedStep != null) { current.selectedStep = null; paint(); }
  });

  function drawFromInput() {
    const res = parsePermutation(wInput.value);
    if (!res.ok) { setError(res.error); return; }
    if (res.n < 2 || res.n > 20) { setError("n must be between 2 and 20."); return; }
    draw(res.w);
  }

  wInput.addEventListener("keydown", (e) => { if (e.key === "Enter") drawFromInput(); });
  wInput.addEventListener("blur", drawFromInput);
  $("draw-btn").addEventListener("click", drawFromInput);

  nSlider.addEventListener("input", () => {
    const n = parseInt(nSlider.value, 10);
    nValue.textContent = String(n);
    draw(randomPermutation(n));
  });

  $("random-btn").addEventListener("click", () => {
    const n = current.w ? current.w.length : parseInt(nSlider.value, 10);
    draw(randomPermutation(n));
  });

  $("export-svg").addEventListener("click", () =>
    exportSVG(svg, "permutation-" + formatPermutation(current.w).replace(/\s+/g, "_")));
  $("export-png").addEventListener("click", () =>
    exportPNG(svg, "permutation-" + formatPermutation(current.w).replace(/\s+/g, "_")));

  // initial diagram: the example from the design, w = 24153
  draw([2, 4, 1, 5, 3]);
})();
