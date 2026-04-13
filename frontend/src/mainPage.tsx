import { useState, useCallback, useRef, useEffect } from "react";
import type { TaskConfig, InspectedItem } from "./lib/types";
import { generateTask } from "./lib/generator";
import { buildTargetHtml, buildSvgColorMap } from "./lib/htmlBuilder";
import { pixelCompare } from "./lib/pixelCompare";
import { buildSvgInjectionScript } from "./lib/svgIcons";
import type { SvgIconName } from "./lib/svgIcons";
import { Editor } from "./components/Editor";
import { SvgImportsPanel } from "./components/SvgImportsPanel";
import { HtmlReference } from "./components/HtmlReference";
import { Tooltip } from "./components/Tooltip";
import { getSvgRaw } from "./lib/svgIcons";
import type { BoxConfig } from "./lib/types";

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "layout_trainer_v1";

interface SavedState {
  task: TaskConfig;
  code: string;
  mode: "html" | "tsx";
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch { return null; }
}

function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ── Preview iframe doc builder ────────────────────────────────────────────────

const TAILWIND_CDN = "https://cdn.tailwindcss.com";
const PREVIEW_STYLE = `*{margin:0;padding:0;box-sizing:border-box;}body{background:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;}`;

function buildPreviewDoc(code: string, mode: "html" | "tsx", task: TaskConfig): string {
  const inner = mode === "tsx"
    ? code.replace(/className=/g, "class=").replace(/<>/g, "<div>").replace(/<\/>/g, "</div>")
    : code;
  const colorMap = buildSvgColorMap(task);
  const svgScript = buildSvgInjectionScript(task.svgNames as SvgIconName[], colorMap);
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="${TAILWIND_CDN}"><\/script>
<style>${PREVIEW_STYLE}</style>${svgScript}
</head><body>${inner}</body></html>`;
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 90
    ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-400"
    : score >= 60
    ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-400"
    : "border-rose-500/25 bg-rose-500/[0.06] text-rose-400";
  const msg = score === 100 ? "Идеально! Все свойства верны."
    : score >= 90 ? "Почти идеально — одно-два свойства расходятся."
    : score >= 70 ? "Хорошо — проверь gap, padding или цвета."
    : score >= 50 ? "Структура есть, но детали расходятся."
    : "Сверься с размерами и цветами через инспектор.";
  return (
    <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${cls}`}>
      <span className="text-2xl font-bold tabular-nums">{score}%</span>
      <span className="text-[11px] opacity-60 leading-relaxed">{msg}</span>
    </div>
  );
}

// ── Target renderer (inline, no separate file needed) ─────────────────────────

function TargetView({ task, selected, onSelect, containerRef }: {
  task: TaskConfig;
  selected: InspectedItem | null;
  onSelect: (item: InspectedItem | null) => void;
  containerRef: React.RefCallback<HTMLDivElement>;
}) {
  const { gapMode, flexDirection, justifyContent, alignItems, bgColor, boxes } = task;
  const isContainerSel = selected?.kind === "container";

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection,
    justifyContent,
    alignItems,
    background: bgColor,
    cursor: "crosshair",
    outline: isContainerSel ? "2px dashed rgba(99,102,241,0.85)" : "none",
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
      onClick={(e) => { e.stopPropagation(); onSelect(isContainerSel ? null : { kind: "container", task }); }}
    >
      {boxes.map((box: BoxConfig, i: number) => {
        const isSel = selected?.kind === "box" && selected.index === i;
        const border = box.borderWidth > 0 && box.borderStyle !== "none"
          ? `${box.borderWidth}px ${box.borderStyle} ${box.borderColor}` : undefined;
        const hasContent = !!(box.svg || box.text);
        return (
          <div key={box.id}
            onClick={(e) => { e.stopPropagation(); onSelect(isSel ? null : { kind: "box", box, index: i }); }}
            style={{
              width: box.width, height: box.height,
              background: box.bgColor, borderRadius: box.borderRadius,
              border, flexShrink: 0, boxSizing: "border-box", cursor: "crosshair",
              outline: isSel ? "2px dashed rgba(99,102,241,0.85)" : "none", outlineOffset: 2,
              display: hasContent ? "flex" : "block",
              alignItems: box.svg ? box.svg.alignItems : (hasContent ? "center" : undefined),
              justifyContent: box.svg ? box.svg.justifyContent : (hasContent ? "center" : undefined),
              padding: box.svg && box.svg.padding > 0 ? box.svg.padding : undefined,
            }}
          >
            {box.svg && (() => {
              const raw = getSvgRaw(box.svg.name as SvgIconName, box.svg.color);
              return <div style={{ width: box.svg.size, height: box.svg.size, flexShrink: 0, pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: raw }} />;
            })()}
            {box.text && (
              <span style={{ color: box.text.color, fontSize: box.text.fontSize, fontWeight: box.text.fontWeight, fontFamily: "sans-serif", whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none" }}>
                {box.text.content}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MainPage() {
  const saved = loadState();

  // Measure available panel width on first render to constrain task generation
  const panelRef = useRef<HTMLDivElement>(null);
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const containerRef: React.RefCallback<HTMLDivElement> = useCallback((el) => {
    containerElRef.current = el;
  }, []);

  // Compute max container width = half the content area minus padding/gap
  const getMaxWidth = () => {
    if (panelRef.current) {
      // Panel is 50% of grid - 8px gap - 32px panel padding
      return Math.floor(panelRef.current.clientWidth - 64);
    }
    return 480; // safe default before first render
  };

  const [task, setTask] = useState<TaskConfig>(() => saved?.task ?? generateTask(480, 256));
  const [code, setCode] = useState(saved?.code ?? "");
  const [mode, setMode] = useState<"html" | "tsx">(saved?.mode ?? "html");
  const [score, setScore] = useState<number | null>(null);
  const [comparing, setComparing] = useState(false);
  const [selected, setSelected] = useState<InspectedItem | null>(null);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Persist on change
  useEffect(() => {
    saveState({ task, code, mode });
  }, [task, code, mode]);

  // Write preview (debounced + fade)
  useEffect(() => {
    const t = setTimeout(() => {
      const iframe = previewIframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc || !iframe) return;
      iframe.style.opacity = "0.3";
      doc.open();
      doc.write(buildPreviewDoc(code, mode, task));
      doc.close();
      // Fade back in after content settles
      setTimeout(() => { iframe.style.opacity = "1"; }, 150);
    }, 300);
    return () => clearTimeout(t);
  }, [code, mode, task]);

  const handleCheck = useCallback(async () => {
    if (comparing || !code.trim()) return;
    setComparing(true);
    const colorMap = buildSvgColorMap(task);
    const svgScript = buildSvgInjectionScript(task.svgNames as SvgIconName[], colorMap);
    const targetHtml = buildTargetHtml(task);
    const s = await pixelCompare(targetHtml, code, mode, TAILWIND_CDN, svgScript);
    setScore(s);
    setComparing(false);
  }, [comparing, code, mode, task]);

  const handleNewTask = () => {
    clearState(); // wipe localStorage before generating new
    const maxW = getMaxWidth();
    const maxH = PANEL_H - 64; // leave room for padding in the panel
    const t = generateTask(maxW, maxH);
    setTask(t);
    setCode("");
    setScore(null);
    setSelected(null);
    // Save the new blank state immediately
    saveState({ task: t, code: "", mode });
  };

  const handleCodeChange = (c: string) => {
    setCode(c);
    setScore(null);
  };

  const targetHtml = buildTargetHtml(task);
  const scoreColor = score === null ? "" : score >= 90 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";
  const PANEL_H = 320;

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }} className="min-h-screen bg-[#09090f] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#0d0d14;}
        ::-webkit-scrollbar-thumb{background:#252535;border-radius:3px;}
        iframe{transition:opacity 0.15s ease;}
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#09090f]/95 backdrop-blur px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-rose-500/70" />
            <div className="w-2 h-2 rounded-full bg-amber-500/70" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-white/35">Layout Trainer</span>
        </div>
        <div className="flex items-center gap-2">
          {score !== null && (
            <span className={`text-sm font-bold mr-1 tabular-nums ${scoreColor}`}>{score}%</span>
          )}
          <button onClick={handleCheck} disabled={!code.trim() || comparing}
            className="text-[11px] px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-semibold tracking-wide">
            {comparing ? "Checking…" : "Check"}
          </button>
          <button onClick={handleNewTask}
            className="text-[11px] px-4 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-all font-semibold">
            ↻ New
          </button>
        </div>
      </header>

      <div className="p-5 space-y-4 max-w-[1400px] mx-auto">

        {/* Top row: Target | Preview — strictly equal size */}
        <div className="grid grid-cols-2 gap-4">

          {/* Target */}
          <div ref={panelRef}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-semibold">Target</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[10px] text-white/15">click to inspect</span>
            </div>
            <div
              className="rounded-xl border border-white/[0.06] bg-[#111827] relative overflow-hidden"
              style={{ height: PANEL_H, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setSelected(null)}
            >
              <TargetView
                task={task}
                selected={selected}
                onSelect={setSelected}
                containerRef={containerRef}
              />
              {selected && <Tooltip item={selected} onClose={() => setSelected(null)} />}
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-semibold">Preview</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#111827]" style={{ height: PANEL_H }}>
              <iframe
                ref={previewIframeRef}
                className="w-full h-full"
                style={{ border: "none" }}
                title="preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* Score */}
        {score !== null && <ScoreBadge score={score} />}

        {/* SVG imports */}
        <SvgImportsPanel task={task} />

        {/* Editor */}
        <Editor code={code} mode={mode} onCodeChange={handleCodeChange} onModeChange={setMode} />

        {/* HTML reference */}
        <HtmlReference html={targetHtml} />
      </div>
    </div>
  );
}
