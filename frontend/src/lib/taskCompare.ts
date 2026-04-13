/**
 * Structural comparison: parse the user's HTML and compare
 * CSS property values against the known TaskConfig.
 *
 * This is deterministic — no rendering, no fonts, no anti-aliasing.
 * 100% means the user reproduced every measurable property correctly.
 *
 * Scoring:
 *   Container has N_c properties worth points.
 *   Each box has N_b properties worth points.
 *   Total = sum of all hit points / sum of all possible points * 100
 */

import type { TaskConfig, BoxConfig } from "./types";

// ─── CSS extraction helpers ───────────────────────────────────────────────────

/** Extract inline style map from an element */
function styles(el: Element): Record<string, string> {
  const s = (el as HTMLElement).style;
  const map: Record<string, string> = {};
  for (let i = 0; i < s.length; i++) {
    const prop = s[i];
    map[prop] = s.getPropertyValue(prop).trim().toLowerCase();
  }
  return map;
}

/** Normalise a colour value: strip spaces, lowercase, convert rgb() → hex */
function normColor(v: string): string {
  v = v.trim().toLowerCase().replace(/\s+/g, "");
  // rgb(255,0,0) → #ff0000
  const rgb = v.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
  if (rgb) {
    return "#" + [rgb[1], rgb[2], rgb[3]]
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("");
  }
  return v;
}

/** Normalise a px value: "16px" → 16, "16" → 16 */
function normPx(v: string): number {
  return parseFloat(v) || 0;
}

/** Match two colours with a small tolerance in RGB space */
function colorMatch(a: string, b: string): boolean {
  const na = normColor(a);
  const nb = normColor(b);
  if (na === nb) return true;
  // Parse both as hex and allow small delta (handles browser rounding)
  const ha = na.match(/^#([0-9a-f]{6})$/);
  const hb = nb.match(/^#([0-9a-f]{6})$/);
  if (!ha || !hb) return false;
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1,g1,b1] = parse(ha[1]);
  const [r2,g2,b2] = parse(hb[1]);
  return Math.abs(r1-r2) + Math.abs(g1-g2) + Math.abs(b1-b2) < 12;
}

/** px match with tolerance of ±3px */
function pxMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 3;
}

// ─── Box element finder ───────────────────────────────────────────────────────

/**
 * Given the parsed DOM of the user's code, find:
 *  1. The root container div
 *  2. Its direct children (the boxes)
 * Returns null if can't find a container.
 */
function findContainerAndBoxes(doc: Document): {
  container: Element;
  boxes: Element[];
} | null {
  // The outermost element with display:flex is the container
  const allDivs = Array.from(doc.body.querySelectorAll("*"));
  const container = allDivs.find((el) => {
    const s = (el as HTMLElement).style;
    const d = s.display || "";
    return d === "flex" || d === "inline-flex" || el.className?.toString().includes("flex");
  });
  if (!container) return null;

  const boxes = Array.from(container.children);
  return { container, boxes };
}

// ─── Score accumulator ────────────────────────────────────────────────────────

class Score {
  hits = 0;
  total = 0;

  check(label: string, pass: boolean, weight = 1) {
    this.total += weight;
    if (pass) this.hits += weight;
  }

  pct(): number {
    if (this.total === 0) return 0;
    return Math.round((this.hits / this.total) * 100);
  }
}

// ─── Container scoring ────────────────────────────────────────────────────────

function scoreContainer(el: Element, task: TaskConfig, sc: Score) {
  const s = styles(el);

  // flex-direction (weight 2 — structural)
  sc.check("flex-direction", (s["flex-direction"] ?? "row") === task.flexDirection, 2);

  // justify-content (weight 2 — structural)
  const jc = s["justify-content"] ?? "flex-start";
  sc.check("justify-content", jc === task.justifyContent, 2);

  // align-items (weight 2)
  const ai = s["align-items"] ?? "stretch";
  sc.check("align-items", ai === task.alignItems, 2);

  // background color (weight 2)
  const bg = s["background"] ?? s["background-color"] ?? "";
  sc.check("background", colorMatch(bg, task.bgColor), 2);

  // width (weight 2)
  const w = normPx(s["width"] ?? "0");
  sc.check("width", pxMatch(w, task.gapMode.containerWidth), 2);

  // height (weight 2)
  const h = normPx(s["height"] ?? "0");
  sc.check("height", pxMatch(h, task.gapMode.containerHeight), 2);

  // gap (fixed mode only)
  if (task.gapMode.kind === "fixed") {
    const gap = normPx(s["gap"] ?? s["column-gap"] ?? s["row-gap"] ?? "0");
    sc.check("gap", pxMatch(gap, task.gapMode.gap), 1);

    // padding — accept either shorthand or individual props
    const pTop = normPx(s["padding-top"] ?? s["padding"] ?? "0");
    const pLeft = normPx(s["padding-left"] ?? s["padding"] ?? "0");
    sc.check("padding-y", pxMatch(pTop, task.gapMode.py), 1);
    sc.check("padding-x", pxMatch(pLeft, task.gapMode.px), 1);
  }
}

// ─── Box scoring ──────────────────────────────────────────────────────────────

function scoreBox(el: Element, box: BoxConfig, sc: Score) {
  const s = styles(el);

  // width (weight 2)
  sc.check("box-width", pxMatch(normPx(s["width"] ?? "0"), box.width), 2);
  // height (weight 2)
  sc.check("box-height", pxMatch(normPx(s["height"] ?? "0"), box.height), 2);
  // background (weight 2)
  const bg = s["background"] ?? s["background-color"] ?? "";
  sc.check("box-bg", colorMatch(bg, box.bgColor), 2);
  // border-radius
  if (box.borderRadius > 0) {
    const br = normPx(s["border-radius"] ?? "0");
    sc.check("box-radius", pxMatch(br, box.borderRadius), 1);
  }
  // border
  if (box.borderWidth > 0 && box.borderStyle !== "none") {
    const bw = normPx(s["border-width"] ?? (s["border"] ? s["border"].match(/(\d+)px/)?.[1] ?? "0" : "0"));
    sc.check("box-border-width", pxMatch(bw, box.borderWidth), 1);
    const bs = s["border-style"] ?? (s["border"] ? (s["border"].includes("dashed") ? "dashed" : s["border"].includes("dotted") ? "dotted" : "solid") : "");
    sc.check("box-border-style", bs === box.borderStyle, 1);
    const bcolor = s["border-color"] ?? "";
    sc.check("box-border-color", colorMatch(bcolor, box.borderColor), 1);
  }
  // text content
  if (box.text) {
    const textEl = el.querySelector("span, p, div:not([style])") ?? el;
    const textContent = textEl.textContent?.trim() ?? "";
    sc.check("box-text", textContent.includes(box.text.content), 1);
    const tc = s["color"] ?? (textEl as HTMLElement).style?.color ?? "";
    sc.check("box-text-color", colorMatch(tc, box.text.color), 1);
  }
  // svg presence
  if (box.svg) {
    const img = el.querySelector("img");
    sc.check("box-svg-present", !!img, 1);
    if (img) {
      const sw = normPx(img.getAttribute("width") ?? "0");
      sc.check("box-svg-size", pxMatch(sw, box.svg.size), 1);
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse user's HTML string into a DOM, extract computed styles,
 * compare against task spec. Returns 0–100.
 */
export function compareToTask(userCode: string, mode: "html" | "tsx", task: TaskConfig): number {
  // Normalise TSX → HTML
  const html = mode === "tsx"
    ? userCode
        .replace(/className=/g, "class=")
        .replace(/style=\{\{/g, 'style="')
        .replace(/\}\}/g, '"')
        // Remove remaining JSX braces around values
        .replace(/=\{([^}]+)\}/g, '="$1"')
        .replace(/<>/g, "<div>")
        .replace(/<\/>/g, "</div>")
    : userCode;

  // Parse into a real DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<html><body>${html}</body></html>`, "text/html");

  const found = findContainerAndBoxes(doc);
  if (!found) return 0;

  const { container, boxes: userBoxes } = found;
  const sc = new Score();

  // Score container
  scoreContainer(container, task, sc);

  // Score boxes — match by position (order matters in flex)
  const maxBoxes = Math.max(userBoxes.length, task.boxes.length);
  for (let i = 0; i < maxBoxes; i++) {
    const userBox = userBoxes[i];
    const taskBox = task.boxes[i];
    if (!userBox || !taskBox) {
      // Missing box — penalise (each box has at least 8 weight)
      sc.total += 8;
      continue;
    }
    scoreBox(userBox, taskBox, sc);
  }

  return sc.pct();
}
