"use strict";

/* Page 2 (construction.html): the recursive TCCW construction u = w' 1 v'.
   Depends on diagram.js. */
(function main() {
  const $ = (id) => document.getElementById(id);
  const wInput = $("w-input"), vInput = $("v-input"), xInput = $("x-input");
  const nSlider = $("n-slider"), mSlider = $("m-slider");
  const nValue = $("n-value"), mValue = $("m-value");
  const errBox = $("error");
  const svgW = $("diagram-w"), svgV = $("diagram-v"), svgU = $("diagram-u");
  const checkTccw = $("check-tccw");
  const hlW = $("hl-w"), hlV = $("hl-v"), hl1 = $("hl-1");

  // highlight colors (kept in sync with the CSS swatches .sw-w / .sw-v / .sw-1)
  const COL = { w: "#7c3aed", v: "#ea580c", one: "#0891b2" };

  const state = {
    w: [], v: [], X: [],
    showAll: false,
    hl: { w: false, v: false, one: false },
    sel: { w: null, v: null, u: null },
    diag: { w: null, v: null, u: null, n: 0, m: 0, N: 0 },
  };

  function setError(msg) {
    errBox.textContent = msg || "";
    errBox.style.display = msg ? "block" : "none";
  }

  function isValidX(X, n, N) {
    if (X.length !== n) return false;
    const seen = new Set();
    for (const x of X) {
      if (!Number.isInteger(x) || x < 2 || x > N || seen.has(x)) return false;
      seen.add(x);
    }
    return true;
  }

  function parseIntList(str) {
    const s = (str || "").trim();
    if (s === "") return [];
    return s.split(/[\s,]+/).filter((t) => t.length).map((t) => (/^\d+$/.test(t) ? parseInt(t, 10) : NaN));
  }

  // ---- sizing: fit each svg to its column width, capped by a max height ----
  function fitInto(svg, maxH) {
    const vb = svg.viewBox.baseVal;
    if (!vb || !vb.height) return;
    const aspect = vb.width / vb.height;
    const wrap = svg.parentElement;
    const cs = getComputedStyle(wrap);
    const maxW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const w = Math.min(maxW, maxH * aspect);
    svg.style.width = w + "px";
    svg.style.height = w / aspect + "px";
  }
  const maxHFor = (which) =>
    which === "u" ? Math.min(window.innerHeight * 0.62, 520) : Math.min(window.innerHeight * 0.34, 300);

  // ---- build state.diag from the current inputs ----
  function build() {
    const rw = parsePermutation(wInput.value);
    const rv = parsePermutation(vInput.value);
    if (!rw.ok) { setError("w: " + rw.error); return; }
    if (!rv.ok) { setError("v: " + rv.error); return; }
    state.w = rw.w; state.v = rv.w;

    const n = state.w.length, m = state.v.length, N = n + m + 1;
    nSlider.value = String(Math.min(n, +nSlider.max));
    mSlider.value = String(Math.min(m, +mSlider.max));
    nValue.textContent = String(n);
    mValue.textContent = String(m);
    $("x-req").textContent = `(need ${n} of {2,…,${N}})`;

    state.X = parseIntList(xInput.value);
    let uDiag = null;
    if (!isValidX(state.X, n, N)) {
      setError(`X must be ${n} distinct value(s) from {2,…,${N}}.`);
    } else {
      setError("");
      const res = constructU(state.w, state.v, state.X);
      uDiag = permutationToDiagram(res.u);
      $("cap-u").textContent = formatPermutation(res.u);
    }
    if (!uDiag) $("cap-u").textContent = "—";

    state.diag = {
      w: permutationToDiagram(state.w),
      v: permutationToDiagram(state.v),
      u: uDiag, n, m, N,
    };
    $("cap-w").textContent = formatPermutation(state.w) || "(empty)";
    $("cap-v").textContent = formatPermutation(state.v) || "(empty)";
    // a fresh construction invalidates previous single-path selections
    state.sel = { w: null, v: null, u: null };
    draw();
  }

  function uOverlays() {
    const { u: d, n, m, N } = state.diag;
    if (!d) return [];
    const ov = [];
    if (state.hl.w && n >= 1) ov.push({ points: pathOverPositions(d, 1, n), color: COL.w, width: 3.2, opacity: 0.55 });
    if (state.hl.one) ov.push({ points: pathOverPositions(d, n + 1, n + 1), color: COL.one, width: 3.4, opacity: 0.65 });
    if (state.hl.v && m >= 1) ov.push({ points: pathOverPositions(d, n + 2, N), color: COL.v, width: 3.2, opacity: 0.55 });
    return ov;
  }

  function renderOne(which, svg, diagram, overlays) {
    if (!diagram) { while (svg.firstChild) svg.removeChild(svg.firstChild); return; }
    renderDiagram(diagram, svg, {
      selectedStep: state.sel[which],
      showAll: state.showAll,
      singleGreenRed: true,
      overlays: overlays || [],
      onDotClick: (step) => {
        state.sel[which] = state.sel[which] === step ? null : step;
        draw();
      },
    });
    fitInto(svg, maxHFor(which));
  }

  // highlight a whole diagram's path (used for w / v in the left column)
  function wholePathOverlay(d, color) {
    return d && d.n >= 1 ? [{ points: pathOverPositions(d, 1, d.n), color, width: 3.2, opacity: 0.55 }] : [];
  }

  function draw() {
    checkTccw.checked = state.showAll;
    renderOne("w", svgW, state.diag.w, state.hl.w ? wholePathOverlay(state.diag.w, COL.w) : []);
    renderOne("v", svgV, state.diag.v, state.hl.v ? wholePathOverlay(state.diag.v, COL.v) : []);
    renderOne("u", svgU, state.diag.u, uOverlays());
  }

  // ---- inputs ----
  // regenerate X if the current one no longer fits the (freshly typed) w, v sizes
  function ensureValidX() {
    const r = parsePermutation(wInput.value), rv = parsePermutation(vInput.value);
    const n = r.ok ? r.w.length : 0;
    const N = n + (rv.ok ? rv.w.length : 0) + 1;
    if (!isValidX(parseIntList(xInput.value), n, N)) {
      xInput.value = randomSubset(n, N).join(" ");
    }
  }

  function commitW() {
    const r = parsePermutation(wInput.value);
    if (r.ok) { state.w = r.w; ensureValidX(); }
    build();
  }
  function commitV() {
    const r = parsePermutation(vInput.value);
    if (r.ok) { state.v = r.w; ensureValidX(); }
    build();
  }

  wInput.addEventListener("keydown", (e) => { if (e.key === "Enter") commitW(); });
  wInput.addEventListener("blur", commitW);
  vInput.addEventListener("keydown", (e) => { if (e.key === "Enter") commitV(); });
  vInput.addEventListener("blur", commitV);
  xInput.addEventListener("keydown", (e) => { if (e.key === "Enter") build(); });
  xInput.addEventListener("blur", build);

  function newW(n) { wInput.value = formatPermutation(randomTCCW(n)); ensureValidX(); build(); }
  function newV(m) { vInput.value = formatPermutation(randomTCCW(m)); ensureValidX(); build(); }

  $("rand-w").addEventListener("click", () => newW(parseInt(nSlider.value, 10)));
  $("rand-v").addEventListener("click", () => newV(parseInt(mSlider.value, 10)));

  nSlider.addEventListener("input", () => { nValue.textContent = nSlider.value; newW(parseInt(nSlider.value, 10)); });
  mSlider.addEventListener("input", () => { mValue.textContent = mSlider.value; newV(parseInt(mSlider.value, 10)); });
  $("rand-x").addEventListener("click", () => {
    const r = parsePermutation(wInput.value), rv = parsePermutation(vInput.value);
    const n = (r.ok ? r.w.length : 0), N = n + (rv.ok ? rv.w.length : 0) + 1;
    xInput.value = randomSubset(n, N).join(" ");
    build();
  });

  // ---- checkboxes ----
  checkTccw.addEventListener("change", () => { state.showAll = checkTccw.checked; state.sel = { w: null, v: null, u: null }; draw(); });
  hlW.addEventListener("change", () => { state.hl.w = hlW.checked; draw(); });
  hlV.addEventListener("change", () => { state.hl.v = hlV.checked; draw(); });
  hl1.addEventListener("change", () => { state.hl.one = hl1.checked; draw(); });

  // clicking empty canvas clears that diagram's single trace
  for (const [which, svg] of [["w", svgW], ["v", svgV], ["u", svgU]]) {
    svg.addEventListener("click", () => {
      if (state.sel[which] != null) { state.sel[which] = null; draw(); }
    });
  }

  window.addEventListener("resize", draw);

  // ---- initial example ----
  wInput.value = formatPermutation(randomTCCW(3));
  vInput.value = formatPermutation(randomTCCW(3));
  {
    const r = parsePermutation(wInput.value), rv = parsePermutation(vInput.value);
    xInput.value = randomSubset(r.w.length, r.w.length + rv.w.length + 1).join(" ");
  }
  build();
})();
