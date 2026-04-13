import type { TaskConfig, InspectedItem, BoxConfig } from "../lib/types";
import { getSvgRaw } from "../lib/svgIcons";
import type { SvgIconName } from "../lib/svgIcons";
import { Tooltip } from "./Tooltip";

function BoxEl({ box, index, isSelected, onClick }: {
  box: BoxConfig; index: number; isSelected: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  const border = box.borderWidth > 0 && box.borderStyle !== "none"
    ? box.borderWidth + "px " + box.borderStyle + " " + box.borderColor : undefined;

  const hasContent = !!(box.svg || box.text);

  return (
    <div
      onClick={onClick}
      style={{
        width: box.width,
        height: box.height,
        background: box.bgColor,
        borderRadius: box.borderRadius,
        border,
        flexShrink: 0,
        boxSizing: "border-box",
        cursor: "crosshair",
        outline: isSelected ? "2px dashed rgba(99,102,241,0.85)" : "none",
        outlineOffset: 2,
        display: hasContent ? "flex" : "block",
        alignItems: box.svg ? box.svg.alignItems : (hasContent ? "center" : undefined),
        justifyContent: box.svg ? box.svg.justifyContent : (hasContent ? "center" : undefined),
        // SVG padding keeps icon inside rounded corners
        padding: box.svg && box.svg.padding > 0 ? box.svg.padding : undefined,
      }}
    >
      {box.svg && (() => {
        const raw = getSvgRaw(box.svg.name as SvgIconName, box.svg.color);
        return (
          <div
            style={{ width: box.svg.size, height: box.svg.size, flexShrink: 0, pointerEvents: "none" }}
            dangerouslySetInnerHTML={{ __html: raw }}
          />
        );
      })()}
      {box.text && (
        <span style={{
          color: box.text.color,
          fontSize: box.text.fontSize,
          fontWeight: box.text.fontWeight,
          fontFamily: "sans-serif",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
        }}>
          {box.text.content}
        </span>
      )}
    </div>
  );
}

export function TargetRenderer({ task, selected, onSelect, containerRef }: {
  task: TaskConfig;
  selected: InspectedItem | null;
  onSelect: (item: InspectedItem | null) => void;
  containerRef: React.RefCallback<HTMLDivElement>;
}) {
  const { gapMode, flexDirection, justifyContent, alignItems, bgColor, boxes } = task;
  const isContainerSelected = selected?.kind === "container";

  // Both modes now have explicit width/height
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection,
    justifyContent,
    alignItems,
    background: bgColor,
    cursor: "crosshair",
    outline: isContainerSelected ? "2px dashed rgba(99,102,241,0.85)" : "none",
    outlineOffset: 2,
    width: gapMode.containerWidth,
    height: gapMode.containerHeight,
    ...(gapMode.kind === "fixed" ? {
      gap: gapMode.gap,
      paddingTop: gapMode.py,
      paddingBottom: gapMode.py,
      paddingLeft: gapMode.px,
      paddingRight: gapMode.px,
    } : {}),
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onClick={(e) => { e.stopPropagation(); onSelect(isContainerSelected ? null : { kind: "container", task }); }}
    >
      {boxes.map((box, i) => {
        const isSelected = selected?.kind === "box" && selected.index === i;
        return (
          <BoxEl key={box.id} box={box} index={i} isSelected={isSelected}
            onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : { kind: "box", box, index: i }); }}
          />
        );
      })}
    </div>
  );
}

export function TargetPanel({ task, selected, onSelect, containerRef }: {
  task: TaskConfig; selected: InspectedItem | null;
  onSelect: (item: InspectedItem | null) => void;
  containerRef: React.RefCallback<HTMLDivElement>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-semibold">Target</span>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <span className="text-[10px] text-white/15">click container or element to inspect</span>
      </div>
      <div
        className="rounded-xl border border-white/[0.06] bg-[#111827] relative overflow-auto"
        style={{ minHeight: 120, padding: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={() => onSelect(null)}
      >
        <TargetRenderer task={task} selected={selected} onSelect={onSelect} containerRef={containerRef} />
        {selected && <Tooltip item={selected} onClose={() => onSelect(null)} />}
      </div>
    </div>
  );
}
