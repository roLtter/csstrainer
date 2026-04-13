import type { TaskConfig } from "../lib/types";
import { getSvgRaw } from "../lib/svgIcons";
import type { SvgIconName } from "../lib/svgIcons";

interface SvgImportsPanelProps {
  task: TaskConfig;
}

export function SvgImportsPanel({ task }: SvgImportsPanelProps) {
  if (task.svgNames.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400/40 mb-2.5 font-semibold">
        Elements to import:
      </div>

      <div className="flex flex-wrap gap-2">
        {task.svgNames.map((name) => {
          const box = task.boxes.find((b) => b.svg?.name === name);
          const svg = box?.svg;
          const raw = svg
            ? getSvgRaw(name as SvgIconName, svg.color)
            : getSvgRaw(name as SvgIconName, "#fff");

          return (
            <div
              key={name}
              className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2"
            >
              {/* Preview the icon */}
              <div
                className="flex-shrink-0"
                style={{ width: 20, height: 20 }}
                dangerouslySetInnerHTML={{ __html: raw }}
              />

              {/* Name — this is what the user types as src */}
              <code className="text-[11px] font-mono text-amber-300/70">
                {name}.svg
              </code>

              {/* Size hint */}
              {svg && (
                <span className="text-[10px] text-white/20 font-mono">
                  {svg.size}×{svg.size} · {svg.color.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-white/15 leading-relaxed">
        Используй{" "}
        <code className="text-amber-300/40 font-mono">
          {"<img src=\"Name.svg\" width=\"N\" height=\"N\" />"}
        </code>{" "}
        внутри нужного бокса. Бокс центрирует иконку через flex.
      </p>
    </div>
  );
}
