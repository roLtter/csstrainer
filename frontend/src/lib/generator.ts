import type { TaskConfig, BoxConfig, GapMode, FlexDir, JustifyContent, AlignItems, BorderStyle } from "./types";
import { BG_POOL, pickDistinctColors, bestContrastColor } from "./colors";
import { SVG_ICON_NAMES } from "./svgIcons";
import type { SvgIconName } from "./svgIcons";

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = <T,>(arr: readonly T[]): T => arr[rand(0, arr.length - 1)];

const TEXT_SAMPLES = [
  "Hello","Submit","Cancel","Login","Sign up","Dashboard","Profile",
  "Settings","Explore","Continue","Done","Back","Next","Save",
  "Edit","Delete","Share","Follow","Like","View all","Learn more",
  "Home","About","Contact","Projects","Blog","New","Open","Close",
];

const SVG_ALIGNMENTS: [string, string][] = [
  ["center",     "center"],
  ["flex-start", "flex-start"],
  ["flex-start", "flex-end"],
  ["flex-end",   "flex-start"],
  ["flex-end",   "flex-end"],
  ["flex-start", "center"],
  ["flex-end",   "center"],
  ["center",     "flex-start"],
  ["center",     "flex-end"],
];

// Rough estimate: avg char width ≈ fontSize * 0.62
const estimateTextWidth = (text: string, fs: number) => text.length * fs * 0.62;

export function generateTask(maxContainerWidth = 560, maxContainerHeight = 280): TaskConfig {
  const bgColor = randItem(BG_POOL);
  const boxCount = rand(2, 5);
  const flexDirection: FlexDir = randItem(["row", "column", "row-reverse", "column-reverse"]);
  const alignItems: AlignItems = randItem(["flex-start", "flex-end", "center"]);

  const useAutoGap = Math.random() < 0.5;
  const autoJustify: JustifyContent[] = ["space-between", "space-around", "space-evenly"];
  const fixedJustify: JustifyContent[] = ["flex-start", "flex-end", "center"];
  const justifyContent: JustifyContent = useAutoGap ? randItem(autoJustify) : randItem(fixedJustify);

  const colorBudget = boxCount * 3 + 4;
  const palette = pickDistinctColors(colorBudget);
  let ci = 0;
  const nextColor = () => palette[ci++ % palette.length];

  const svgKeys = [...SVG_ICON_NAMES];
  const usedSvgNames: SvgIconName[] = [];

  const boxes: BoxConfig[] = Array.from({ length: boxCount }, () => {
    const w = rand(48, 160);
    const h = rand(48, 140);
    const roll = Math.random();
    const hasSvg = roll < 0.30;
    const hasText = !hasSvg && roll < 0.62;
    const boxBg = nextColor();

    const borderRadius = randItem([0, 0, 4, 6, 8, 12, 16, 24, 50]);

    // SVG padding: if box is rounded, add p = borderRadius/2 so icon stays inside corners
    const svgPad = borderRadius > 8 ? Math.round(borderRadius / 2) : 0;
    const svgMaxSize = Math.min(36, w - svgPad * 2 - 4, h - svgPad * 2 - 4);

    let svg: BoxConfig["svg"] = undefined;
    if (hasSvg && svgMaxSize >= 14) {
      const available = svgKeys.filter((k) => !usedSvgNames.includes(k as SvgIconName));
      const name = (available.length > 0 ? randItem(available) : randItem(svgKeys)) as SvgIconName;
      if (!usedSvgNames.includes(name)) usedSvgNames.push(name);
      const size = rand(14, svgMaxSize);
      const [ai, jc] = randItem(SVG_ALIGNMENTS);
      svg = {
        name,
        color: bestContrastColor(boxBg, [nextColor(), nextColor()]),
        size,
        alignItems: ai,
        justifyContent: jc,
        padding: svgPad,
      };
    }

    // Text: only pick fontSizes that actually fit in the box
    let text: BoxConfig["text"] = undefined;
    if (hasText) {
      const content = randItem(TEXT_SAMPLES);
      const allSizes = [11, 13, 15, 18, 22, 28, 36];
      const fitting = allSizes.filter(
        (fs) => estimateTextWidth(content, fs) <= w - 8 && fs * 1.5 <= h - 8
      );
      const fontSize = fitting.length > 0 ? randItem(fitting) : 11;
      text = {
        content,
        color: bestContrastColor(boxBg, [nextColor(), nextColor()]),
        fontSize,
        fontWeight: randItem([400, 600, 700]),
      };
    }

    const borderWidth = randItem([0, 0, 1, 2, 3]);
    const borderStyle: BorderStyle = borderWidth > 0 ? randItem(["solid", "dashed", "dotted"]) : "none";

    return {
      id: "b-" + Math.random().toString(36).slice(2, 7),
      width: w, height: h,
      bgColor: boxBg,
      borderWidth,
      borderColor: borderWidth > 0 ? nextColor() : "#000000",
      borderRadius,
      borderStyle, text, svg,
    };
  });

  // Always use fixed container dimensions regardless of gap mode
  const isRow = flexDirection === "row" || flexDirection === "row-reverse";
  const mainTotal = boxes.reduce((s, b) => s + (isRow ? b.width : b.height), 0);
  const crossMax = Math.max(...boxes.map((b) => isRow ? b.height : b.width));

  let gapMode: GapMode;

  if (useAutoGap) {
    // space-* justify: container is 1.4-1.8x the content sum
    const factor = 1.4 + Math.random() * 0.4;
    const cMain = Math.round(mainTotal * factor);
    const cCross = crossMax + rand(16, 40);
    gapMode = {
      kind: "auto",
      containerWidth: Math.min(isRow ? cMain : cCross, maxContainerWidth),
      containerHeight: Math.min(isRow ? cCross : cMain, maxContainerHeight),
    };
  } else {
    const gap = rand(6, 32);
    const px = rand(8, 24);
    const py = rand(8, 24);
    const totalGaps = gap * (boxes.length - 1);
    // Min size = content + all gaps + both sides of padding
    const minMain = mainTotal + totalGaps + (isRow ? px * 2 : py * 2);
    const minCross = crossMax + (isRow ? py * 2 : px * 2);
    // Add breathing room
    const extraMain = rand(20, 60);
    const extraCross = rand(10, 30);
    gapMode = {
      kind: "fixed",
      gap, px, py,
      containerWidth: Math.min(isRow ? minMain + extraMain : minCross + extraCross, maxContainerWidth),
      containerHeight: Math.min(isRow ? minCross + extraCross : minMain + extraMain, maxContainerHeight),
    };
  }

  return { gapMode, flexDirection, justifyContent, alignItems, bgColor, boxes, svgNames: usedSvgNames };
}
