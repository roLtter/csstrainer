import { useEffect, useRef, useState } from "react";

/**
 * Monaco Editor loaded from CDN.
 * Gives us: syntax highlighting, Ctrl+Z undo, proper cursor, auto-indent,
 * bracket matching — everything from VS Code, zero hand-rolled code.
 */

declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

const MONACO_CDN = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min";

// Single promise shared across all mounts — prevents double-loading on HMR
let _monacoPromise: Promise<any> | null = null;

function loadMonaco(): Promise<any> {
  if (window.monaco) return Promise.resolve(window.monaco);
  if (_monacoPromise) return _monacoPromise;

  _monacoPromise = new Promise((resolve, reject) => {
    // If loader script already in DOM (e.g. after HMR), just configure and use it
    if (window.require && window.require.config) {
      window.require.config({ paths: { vs: `${MONACO_CDN}/vs` } });
      window.require(["vs/editor/editor.main"], () => resolve(window.monaco));
      return;
    }

    const loaderScript = document.createElement("script");
    loaderScript.src = `${MONACO_CDN}/vs/loader.min.js`;
    loaderScript.onload = () => {
      window.require.config({ paths: { vs: `${MONACO_CDN}/vs` } });
      window.require(["vs/editor/editor.main"], () => resolve(window.monaco));
    };
    loaderScript.onerror = reject;
    document.head.appendChild(loaderScript);
  });

  return _monacoPromise;
}

interface EditorProps {
  code: string;
  mode: "html" | "tsx";
  onCodeChange: (code: string) => void;
  onModeChange: (mode: "html" | "tsx") => void;
}

const PH_HTML = `<div style="display:flex; flex-direction:row; gap:12px; padding:16px; background:#1a1a2e; width:400px; height:200px;">
    <div style="width:80px; height:80px; background:#FF4444; border-radius:8px; flex-shrink:0;"></div>
    <div style="width:60px; height:80px; background:#4CC9F0; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;">
        <img src="Search.svg" width="24" height="24" />
    </div>
</div>`;

const PH_TSX = `<div className="flex flex-row" style={{gap:'12px',padding:'16px',background:'#1a1a2e',width:'400px',height:'200px'}}>
    <div className="flex-shrink-0 rounded-lg" style={{width:'80px',height:'80px',background:'#FF4444'}} />
    <div className="flex-shrink-0 flex items-center justify-center"
        style={{width:'60px',height:'80px',background:'#4CC9F0'}}>
        <img src="Search.svg" width="24" height="24" />
    </div>
</div>`;

export function Editor({ code, mode, onCodeChange, onModeChange }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [monacoReady, setMonacoReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load Monaco once
  useEffect(() => {
    loadMonaco()
      .then((monaco) => {
        if (!containerRef.current || editorRef.current) return;

        // Define a dark theme matching the app
        monaco.editor.defineTheme("trainer-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "tag", foreground: "4EC9B0" },
            { token: "attribute.name", foreground: "9CDCFE" },
            { token: "attribute.value", foreground: "CE9178" },
            { token: "string", foreground: "CE9178" },
            { token: "comment", foreground: "6A9955" },
            { token: "delimiter.html", foreground: "808080" },
            { token: "delimiter.bracket", foreground: "FFD700" },
          ],
          colors: {
            "editor.background": "#1e1e1e",
            "editor.foreground": "#D4D4D4",
            "editorLineNumber.foreground": "#3a3a3a",
            "editorCursor.foreground": "#aeafad",
            "editor.selectionBackground": "#264f78",
            "editor.inactiveSelectionBackground": "#3a3d41",
            "editorIndentGuide.background": "#2a2a2a",
            "editorIndentGuide.activeBackground": "#3a3a3a",
          },
        });

        const language = mode === "tsx" ? "html" : "html"; // html works for both

        const editor = monaco.editor.create(containerRef.current, {
          value: code,
          language,
          theme: "trainer-dark",
          fontSize: 12,
          lineHeight: 20,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: "off",
          renderWhitespace: "none",
          renderLineHighlight: "gutter",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
          },
          padding: { top: 12, bottom: 12 },
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          formatOnPaste: false,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: "off",
          parameterHints: { enabled: false },
        });

        editorRef.current = editor;

        // Listen for changes
        editor.onDidChangeModelContent(() => {
          onCodeChange(editor.getValue());
        });

        setMonacoReady(true);
      })
      .catch(() => setLoadError(true));

    return () => {
      editorRef.current?.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external code changes (e.g. new task) into Monaco
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const current = editor.getValue();
    if (current !== code) {
      editor.setValue(code);
    }
  }, [code]);

  // Update language when mode changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !window.monaco) return;
    const model = editor.getModel();
    if (model) {
      // Both html and tsx use html language model — works fine
      window.monaco.editor.setModelLanguage(model, "html");
    }
  }, [mode]);

  return (
    <div className="flex flex-col gap-2">
      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/[0.07] w-fit text-[10px] font-bold uppercase tracking-[0.15em]">
        {(["html", "tsx"] as const).map((m) => (
          <button key={m} onClick={() => onModeChange(m)}
            className={`px-5 py-1.5 transition-colors ${mode === m
              ? "bg-indigo-600 text-white"
              : "bg-transparent text-white/25 hover:text-white/50"}`}
          >
            {m === "tsx" ? "TSX / Tailwind" : "HTML"}
          </button>
        ))}
      </div>

      {/* Editor container */}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] flex flex-col" style={{ background: "#1e1e1e" }}>
        {/* Titlebar */}
        <div className="px-3 py-1.5 border-b border-white/[0.05] flex items-center gap-2 flex-shrink-0" style={{ background: "#252526" }}>
          <span className="w-2 h-2 rounded-full bg-rose-500/50" />
          <span className="w-2 h-2 rounded-full bg-amber-500/50" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
          <span className="ml-1 text-white/20 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {mode === "html" ? "solution.html" : "solution.tsx"}
          </span>
          {!monacoReady && !loadError && (
            <span className="ml-auto text-[10px] text-white/20 animate-pulse">Loading editor…</span>
          )}
          {loadError && (
            <span className="ml-auto text-[10px] text-rose-400/60">Monaco failed to load</span>
          )}
        </div>

        {/* Monaco mount point */}
        <div ref={containerRef} style={{ height: 400, width: "100%" }} />
      </div>

      {/* Placeholder shown only before Monaco loads */}
      {!monacoReady && !loadError && (
        <div className="text-[10px] text-white/15 px-1">
          {mode === "html"
            ? <pre className="text-white/20" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{PH_HTML}</pre>
            : <pre className="text-white/20" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{PH_TSX}</pre>
          }
        </div>
      )}

      {/* Hints */}
      <p className="text-[10px] text-white/15 px-1">
        VS Code editor · Ctrl+Z undo · Ctrl+F поиск · автодополнение
        {mode === "tsx" && <> · Tailwind CDN активен в превью</>}
        {" · "}SVG: <code className="text-amber-300/40">{"<img src=\"Name.svg\" />"}</code>
      </p>
    </div>
  );
}
