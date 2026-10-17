/**
 * Browser fingerprint for the daily play limit: a SHA-256 of canvas, WebGL renderer, font probe, UA,
 * screen and timezone. Computed in the browser; only the hash leaves the device.
 */
async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canvasPart() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 30;
    const context = canvas.getContext("2d");
    if (!context) return "no2d";
    context.textBaseline = "top";
    context.font = "14px Arial";
    context.fillStyle = "#f60";
    context.fillRect(100, 1, 62, 20);
    context.fillStyle = "#069";
    context.fillText("human vs ai ✦ 找茬 🙂", 2, 15);
    return canvas.toDataURL();
  } catch {
    return "nocanvas";
  }
}

function webglPart() {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "nowebgl";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return `${vendor}|${renderer}|${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`;
  } catch {
    return "nowebgl";
  }
}

const PROBE_FONTS = ["Arial", "Courier New", "Georgia", "Helvetica Neue", "Menlo", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Segoe UI", "Roboto"];

function fontsPart() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return "nofonts";
    const width = (font: string) => {
      context.font = `16px ${font}`;
      return context.measureText("mmmmmmmmlli 找茬 10").width;
    };
    const base = width("monospace");
    return PROBE_FONTS.map((font) => (width(`"${font}", monospace`) !== base ? "1" : "0")).join("");
  } catch {
    return "nofonts";
  }
}

let cached: Promise<string> | null = null;

export function browserFingerprint(): Promise<string> {
  cached ??= (async () => {
    const parts = [
      canvasPart(),
      webglPart(),
      fontsPart(),
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}x${screen.colorDepth}@${window.devicePixelRatio}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      String(navigator.hardwareConcurrency ?? ""),
    ];
    return sha256Hex(parts.join("||"));
  })().catch(() => "");
  return cached;
}
