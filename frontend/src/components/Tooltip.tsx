import type { InspectedItem } from "../lib/types";

interface TooltipProps {
  item: InspectedItem;
  onClose: () => void;
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-white/10"
        style={{ background: color }}
      />
      <span className="font-mono text-white/55 text-[10px]">{color.toUpperCase()}</span>
    </div>
  );
}

export function Tooltip({ item, onClose }: TooltipProps) {
  if (item.kind === "container") {
    const t = item.task;
    const sizeLabel = `${t.gapMode.containerWidth} × ${t.gapMode.containerHeight}`;
    const gapLabel = t.gapMode.kind === "fixed"
      ? `gap ${t.gapMode.gap}px · px ${t.gapMode.px}px · py ${t.gapMode.py}px`
      : null; // auto gap — user figures out justify-content themselves

    return (
      <div
        className="absolute top-2 right-2 z-50 rounded-xl border border-white/10 bg-[#0d0d14]/97 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 select-text"
        style={{ width: "184px", pointerEvents: "all" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-white/25 text-[9px] uppercase tracking-widest font-mono">Container</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-white/30 hover:text-white text-lg leading-none transition-colors"
          >×</button>
        </div>

        <div className="font-mono font-bold text-white text-sm leading-tight">{sizeLabel}</div>

        {gapLabel && (
          <div className="font-mono text-indigo-300/60 text-[10px] leading-snug">{gapLabel}</div>
        )}

        {/* Container bg color */}
        <div>
          <div className="text-[9px] uppercase tracking-widest text-white/20 mb-1.5">Background</div>
          <ColorSwatch color={t.bgColor} />
        </div>
      </div>
    );
  }

  // ── Box tooltip ──────────────────────────────────────────────────────────────
  const b = item.box;
  const colors = Array.from(new Set([
    b.bgColor,
    ...(b.borderWidth > 0 && b.borderStyle !== "none" ? [b.borderColor] : []),
    ...(b.text ? [b.text.color] : []),
    ...(b.svg ? [b.svg.color] : []),
  ]));
  const sizeLabel = `${b.width} × ${b.height}${b.borderRadius > 0 ? ` · r${b.borderRadius}` : ""}`;
  const borderLabel = b.borderWidth > 0 && b.borderStyle !== "none"
    ? `border ${b.borderWidth}px ${b.borderStyle}` : null;
  // Show padding if box has svg with border-radius padding applied
  const paddingLabel = b.svg && b.svg.padding > 0
    ? `padding ${b.svg.padding}px` : null;

  return (
    <div
      className="absolute top-2 right-2 z-50 rounded-xl border border-white/10 bg-[#0d0d14]/97 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 select-text"
      style={{ width: "184px", pointerEvents: "all" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-white/25 text-[9px] uppercase tracking-widest font-mono">
          Box {item.index + 1}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-white/30 hover:text-white text-lg leading-none transition-colors"
        >×</button>
      </div>

      <div className="font-mono font-bold text-white text-sm leading-tight">{sizeLabel}</div>

      {borderLabel && (
        <div className="font-mono text-white/40 text-[10px]">{borderLabel}</div>
      )}
      {paddingLabel && (
        <div className="font-mono text-indigo-300/60 text-[10px]">{paddingLabel}</div>
      )}

      <div>
        <div className="text-[9px] uppercase tracking-widest text-white/20 mb-1.5">Section colors</div>
        <div className="space-y-1">
          {colors.map((c, i) => <ColorSwatch key={i} color={c} />)}
        </div>
      </div>
    </div>
  );
}
