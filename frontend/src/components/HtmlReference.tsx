interface HtmlReferenceProps {
  html: string;
}

export function HtmlReference({ html }: HtmlReferenceProps) {
  return (
    <details className="text-[10px] text-white/20">
      <summary className="cursor-pointer hover:text-white/40 transition-colors font-mono select-none py-1">
        Show target HTML reference ▸
      </summary>
      <pre className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] overflow-x-auto text-white/30 leading-relaxed whitespace-pre-wrap break-all">
        {html}
      </pre>
    </details>
  );
}
