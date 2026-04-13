/**
 * Pixel-perfect comparison.
 *
 * Both target and user HTML are rendered in hidden iframes.
 * html2canvas runs INSIDE each iframe (same origin, no cross-frame issues).
 * The canvas ImageData is transferred back via postMessage.
 * Both ImageDatas are compared pixel-by-pixel.
 */

const H2C_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
const SCALE = 1;

/** Build a full HTML document that renders `body`, takes a screenshot with
 *  html2canvas, and posts the ImageData back to the parent. */
function buildCaptureDoc(bodyHtml: string, extraHead = ""): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${extraHead}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 800px;
      min-height: 600px;
    }
  </style>
</head>
<body>
${bodyHtml}
<script src="${H2C_CDN}"><\/script>
<script>
  window.addEventListener('load', function() {
    // Extra wait for Tailwind CDN to apply styles
    var delay = ${extraHead.includes('tailwindcss') ? 1500 : 100};
    setTimeout(function() {
      html2canvas(document.body, {
        scale: ${SCALE},
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#111827',
        logging: false,
        width: 800,
        height: document.body.scrollHeight || 600,
      }).then(function(canvas) {
        var ctx = canvas.getContext('2d');
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        window.parent.postMessage({
          type: 'capture-done',
          width: canvas.width,
          height: canvas.height,
          data: Array.from(imageData.data)
        }, '*');
      }).catch(function(err) {
        window.parent.postMessage({ type: 'capture-error', error: String(err) }, '*');
      });
    }, delay);
  });
<\/script>
</body>
</html>`;
}

/** Render HTML in a hidden iframe, run html2canvas inside it, return ImageData */
function captureViaIframe(doc: string): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;border:none;';
    iframe.sandbox.add('allow-scripts');
    iframe.sandbox.add('allow-same-origin');
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      iframe.remove();
    }

    function onMessage(e: MessageEvent) {
      if (e.source !== iframe.contentWindow) return;
      if (e.data?.type === 'capture-done') {
        cleanup();
        resolve({
          data: new Uint8ClampedArray(e.data.data),
          width: e.data.width,
          height: e.data.height,
        });
      } else if (e.data?.type === 'capture-error') {
        cleanup();
        resolve(null);
      }
    }

    window.addEventListener('message', onMessage);

    const idoc = iframe.contentDocument!;
    idoc.open();
    idoc.write(doc);
    idoc.close();
  });
}

function normalizeToSameSize(
  a: { data: Uint8ClampedArray; width: number; height: number },
  b: { data: Uint8ClampedArray; width: number; height: number }
): [ImageData, ImageData] {
  // Use the target (a) dimensions as reference
  const w = a.width;
  const h = a.height;

  const canvasA = document.createElement('canvas');
  canvasA.width = w; canvasA.height = h;
  const ctxA = canvasA.getContext('2d')!;
  // Some TS lib.dom versions don't include the `ImageData(Uint8ClampedArray, w, h)` overload.
  // Create by (w, h) and copy pixel data explicitly.
  const imageDataA = new ImageData(w, h);
  imageDataA.data.set(a.data);
  ctxA.putImageData(imageDataA, 0, 0);

  const canvasB = document.createElement('canvas');
  canvasB.width = w; canvasB.height = h;
  const ctxB = canvasB.getContext('2d')!;
  // Fill with the bg colour first so size mismatches show as diff
  ctxB.fillStyle = '#111827';
  ctxB.fillRect(0, 0, w, h);
  // Draw b centred
  const tmpB = document.createElement('canvas');
  tmpB.width = b.width; tmpB.height = b.height;
  const ctxTmpB = tmpB.getContext('2d')!;
  const imageDataB = new ImageData(b.width, b.height);
  imageDataB.data.set(b.data);
  ctxTmpB.putImageData(imageDataB, 0, 0);
  const dx = Math.round((w - b.width) / 2);
  const dy = Math.round((h - b.height) / 2);
  ctxB.drawImage(tmpB, dx, dy);

  return [
    canvasA.getContext('2d')!.getImageData(0, 0, w, h),
    canvasB.getContext('2d')!.getImageData(0, 0, w, h),
  ];
}

function compareImageData(a: ImageData, b: ImageData): number {
  const len = a.data.length;
  let diff = 0;
  let relevantPixels = 0;

  for (let i = 0; i < len; i += 4) {
    const ar = a.data[i], ag = a.data[i+1], ab = a.data[i+2];
    const br = b.data[i], bg = b.data[i+1], bb = b.data[i+2];

    const dr = Math.abs(ar - br);
    const dg = Math.abs(ag - bg);
    const db = Math.abs(ab - bb);
    
    const isDiff = (dr + dg + db > 20);

    // Background color is #111827 (rgb: 17, 24, 39)
    const aIsBg = Math.abs(ar - 17) + Math.abs(ag - 24) + Math.abs(ab - 39) <= 20;
    const bIsBg = Math.abs(br - 17) + Math.abs(bg - 24) + Math.abs(bb - 39) <= 20;

    // Only count pixels that are not background in at least one of the images
    if (!aIsBg || !bIsBg) {
      relevantPixels++;
      if (isDiff) diff++;
    }
  }

  if (relevantPixels === 0) return 100; // Both are completely empty/background

  return Math.max(0, Math.min(100, Math.round((1 - diff / relevantPixels) * 100)));
}

export async function pixelCompare(
  targetHtml: string,
  userCode: string,
  mode: 'html' | 'tsx',
  tailwindCdn: string,
  svgScript: string,
): Promise<number> {
  const normalizedUser = mode === 'tsx'
    ? userCode
        .replace(/className=/g, 'class=')
        .replace(/<>/g, '<div>')
        .replace(/<\/>/g, '</div>')
    : userCode;

  const tailwindTag = mode === 'tsx'
    ? `<script src="${tailwindCdn}"><\/script>`
    : '';

  const targetDoc = buildCaptureDoc(targetHtml, svgScript);
  const userDoc   = buildCaptureDoc(normalizedUser, tailwindTag + '\n' + svgScript);

  // Render both in parallel
  const [targetResult, userResult] = await Promise.all([
    captureViaIframe(targetDoc),
    captureViaIframe(userDoc),
  ]);

  if (!targetResult || !userResult) return 0;

  const [imgA, imgB] = normalizeToSameSize(targetResult, userResult);
  return compareImageData(imgA, imgB);
}
