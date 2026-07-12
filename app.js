"use strict";

/* Page 1 (index.html) UI wiring. Depends on diagram.js. */
(function main() {
  const $ = (id) => document.getElementById(id);
  const wInput = $("w-input");
  const nSlider = $("n-slider");
  const nValue = $("n-value");
  const errBox = $("error");
  const svg = $("diagram");
  const toggleAllBox = $("toggle-all");

  let current = { w: null, diagram: null, selectedStep: null, showAll: false };

  function setError(msg) {
    errBox.textContent = msg || "";
    errBox.style.display = msg ? "block" : "none";
  }

  function paint() {
    toggleAllBox.checked = current.showAll; // keep the checkbox in sync
    renderDiagram(current.diagram, svg, {
      selectedStep: current.selectedStep,
      showAll: current.showAll,
      onDotClick: (step) => {
        current.showAll = false; // a single click leaves "show all" mode
        current.selectedStep = current.selectedStep === step ? null : step;
        paint();
      },
    });
  }

  function draw(w) {
    current.w = w;
    current.diagram = permutationToDiagram(w);
    current.selectedStep = null; // clear any single trace on a new permutation
    // NB: current.showAll is intentionally preserved across permutations
    nSlider.value = String(w.length);
    nValue.textContent = String(w.length);
    wInput.value = formatPermutation(w);
    setError("");
    paint();
  }

  toggleAllBox.addEventListener("change", () => {
    current.showAll = toggleAllBox.checked;
    current.selectedStep = null;
    paint();
  });

  // clicking empty canvas clears the current single trace
  svg.addEventListener("click", () => {
    if (current.selectedStep != null) { current.selectedStep = null; paint(); }
  });

  // keep the diagram fitted to the viewport
  window.addEventListener("resize", () => fitToView(svg));

  function drawFromInput() {
    const res = parsePermutation(wInput.value);
    if (!res.ok) { setError(res.error); return; }
    if (res.n > 20) { setError("n must be between 0 and 20."); return; }
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

  const currentN = () => (current.w ? current.w.length : parseInt(nSlider.value, 10));
  $("random-btn").addEventListener("click", () => draw(randomPermutation(currentN())));
  $("random-tccw-btn").addEventListener("click", () => draw(randomTCCW(currentN())));

  $("export-svg").addEventListener("click", () =>
    exportSVG(svg, "permutation-" + formatPermutation(current.w).replace(/\s+/g, "_")));
  $("export-png").addEventListener("click", () =>
    exportPNG(svg, "permutation-" + formatPermutation(current.w).replace(/\s+/g, "_")));

  // initial diagram: the example from the design, w = 24153
  draw([2, 4, 1, 5, 3]);
})();
