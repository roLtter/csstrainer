export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function colorDist(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Vibrant colors for boxes/text/SVG */
export const COLOR_POOL = [
  "#FF4444","#FF6B35","#FF9F1C","#E63946","#FF006E",
  "#FFD60A","#C8F135","#ADFF2F","#B5E853",
  "#06D6A0","#2DC653","#52B788","#00F5D4",
  "#4CC9F0","#4895EF","#4361EE","#3A86FF","#0096C7","#4EA8DE",
  "#9B5DE5","#C77DFF","#FF6DB6","#FF4FD8","#F72585","#7B2FBE",
  "#FFF3B0","#FFDDD2","#E9C46A","#F4E285",
  "#A0AEC0","#CBD5E0",
];

/**
 * Dark backgrounds for the container.
 * Must be dark enough (luminance < 0.05) so bright box colors pop.
 * Also must be visually distinct from the app background (#09090f).
 */
export const BG_POOL = [
  "#1a1a2e", // deep navy
  "#0f172a", // slate 900
  "#1e1b4b", // indigo 950
  "#1c1917", // stone 900
  "#14111c", // dark violet
  "#0d1b2a", // deep ocean
  "#162032", // dark teal-navy
  "#1a0a0a", // very dark red
  "#0a1a0a", // very dark green
  "#1a1505", // very dark amber
  "#0e0e1a", // near-black blue
  "#1f1320", // dark plum
];

export function pickDistinctColors(n: number): string[] {
  const shuffled = [...COLOR_POOL].sort(() => Math.random() - 0.5);
  const picked: string[] = [];

  for (const c of shuffled) {
    if (picked.length >= n) break;
    if (picked.every((p) => colorDist(c, p) > 90)) picked.push(c);
  }
  for (const c of shuffled) {
    if (picked.length >= n) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}

export function bestContrastColor(bg: string, candidates: string[]): string {
  return candidates
    .map((c) => ({ c, r: contrastRatio(c, bg) }))
    .sort((a, b) => b.r - a.r)[0]?.c ?? "#FFFFFF";
}
