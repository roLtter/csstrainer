import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { TaskConfig } from "../lib/types";
import { buildSvgInjectionScript } from "../lib/svgIcons";
import type { SvgIconName } from "../lib/svgIcons";
import { buildSvgColorMap } from "../lib/htmlBuilder";

export interface PreviewHandle {
  getIframe: () => HTMLIFrameElement | null;
}

interface PreviewProps {
  code: string;
  mode: "html" | "tsx";
  task: TaskConfig;
  score: number | null;
}

const BASE_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }
`;

function buildPreviewDoc(code: string, mode: "html" | "tsx", task: TaskConfig): string {
  const inner =
    mode === "tsx"
      ? code
          .replace(/className=/g, "class=")
          .replace(/<>/g, "<div>")
          .replace(/<\/>/g, "</div>")
      : code;

  const colorMap = buildSvgColorMap(task);
  const svgScript = buildSvgInjectionScript(
    task.svgNames as SvgIconName[],
    colorMap
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${BASE_STYLE}</style>
  ${svgScript}
</head>
<body>${inner}</body>
</html>`;
}

export const PreviewPanel = forwardRef<PreviewHandle, PreviewProps>(
  ({ code, mode, task, score }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      getIframe: () => iframeRef.current,
    }));

    // Write to iframe whenever code/mode/task changes (debounced)
    useEffect(() => {
      const t = setTimeout(() => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        doc.open();
        doc.write(buildPreviewDoc(code, mode, task));
        doc.close();
      }, 250);
      return () => clearTimeout(t);
    }, [code, mode, task]);

    const scoreColor =
      score === null
        ? ""
        : score >= 90
        ? "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400"
        : score >= 60
        ? "border-amber-500/20 bg-amber-500/[0.04] text-amber-400"
        : "border-rose-500/20 bg-rose-500/[0.04] text-rose-400";

    const scoreMsg =
      score === null
        ? ""
        : score >= 92
        ? "Pixel-perfect! Отличная работа."
        : score >= 75
        ? "Очень близко — проверь gap, padding или цвета."
        : score >= 50
        ? "Структура есть, но детали расходятся."
        : "Сверься с размерами и цветами через инспектор.";

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 h-[28px]">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-semibold">
            Preview
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0f1117]">
          <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.05] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500/50" />
            <span className="w-2 h-2 rounded-full bg-amber-500/50" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
            <span className="text-[10px] text-white/20 ml-1 font-mono">live</span>
          </div>
          <iframe
            ref={iframeRef}
            className="w-full"
            style={{ height: 380, border: "none" }}
            title="preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {score !== null && (
          <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${scoreColor}`}>
            <span className="text-3xl font-bold tabular-nums">{score}%</span>
            <div className="text-[11px] opacity-60 leading-relaxed">{scoreMsg}</div>
          </div>
        )}
      </div>
    );
  }
);

PreviewPanel.displayName = "PreviewPanel";
