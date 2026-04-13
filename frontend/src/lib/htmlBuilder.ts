import type { TaskConfig, BoxConfig } from "./types";
import { getSvgRaw } from "./svgIcons";
import type { SvgIconName } from "./svgIcons";

function boxToHtml(b: BoxConfig): string {
  const border = b.borderWidth > 0 && b.borderStyle !== "none"
    ? "border:" + b.borderWidth + "px " + b.borderStyle + " " + b.borderColor + ";" : "";

  let inner = "";
  let displayStyle = "";

  if (b.svg) {
    const p = b.svg.padding;
    const paddingCss = p > 0 ? "padding:" + p + "px;" : "";
    displayStyle = "display:flex;align-items:" + b.svg.alignItems + ";justify-content:" + b.svg.justifyContent + ";" + paddingCss;
    inner = '<img src="' + b.svg.name + '.svg" width="' + b.svg.size + '" height="' + b.svg.size + '" style="display:block;" />';
  } else if (b.text) {
    displayStyle = "display:flex;align-items:center;justify-content:center;";
    inner = '<span style="color:' + b.text.color + ';font-size:' + b.text.fontSize + 'px;font-weight:' + b.text.fontWeight + ';font-family:sans-serif;white-space:nowrap;">' + b.text.content + '</span>';
  }

  return '  <div style="width:' + b.width + 'px;height:' + b.height + 'px;background:' + b.bgColor + ';border-radius:' + b.borderRadius + 'px;' + border + 'flex-shrink:0;' + displayStyle + '">' + inner + '</div>';
}

export function buildTargetHtml(task: TaskConfig): string {
  const { gapMode, flexDirection, justifyContent, alignItems, bgColor, boxes } = task;

  // Both modes now have fixed container dimensions
  const w = gapMode.containerWidth;
  const h = gapMode.containerHeight;

  let containerStyle: string;
  if (gapMode.kind === "fixed") {
    containerStyle = [
      "display:flex",
      "flex-direction:" + flexDirection,
      "justify-content:" + justifyContent,
      "align-items:" + alignItems,
      "background:" + bgColor,
      "width:" + w + "px",
      "height:" + h + "px",
      "gap:" + gapMode.gap + "px",
      "padding:" + gapMode.py + "px " + gapMode.px + "px",
    ].join(";");
  } else {
    containerStyle = [
      "display:flex",
      "flex-direction:" + flexDirection,
      "justify-content:" + justifyContent,
      "align-items:" + alignItems,
      "background:" + bgColor,
      "width:" + w + "px",
      "height:" + h + "px",
    ].join(";");
  }

  const boxLines = boxes.map(boxToHtml).join("\n");
  return '<div style="' + containerStyle + '">\n' + boxLines + '\n</div>';
}

export function buildSvgColorMap(task: TaskConfig): Record<string, string> {
  const map: Record<string, string> = {};
  for (const box of task.boxes) {
    if (box.svg) map[box.svg.name] = box.svg.color;
  }
  return map;
}
