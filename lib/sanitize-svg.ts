const CANVAS_SIZE = 512;

/**
 * Sanitizes SVG string for safe display: strips dangerous elements/attributes
 * and enforces viewBox/width/height to 512.
 * Use before loading user- or AI-generated SVG into the canvas or storage.
 */
export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string") return "";
  let out = svg.trim();
  if (!out) return "";

  // 1. Remove <script>...</script> (case-insensitive, non-greedy content)
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  // 2. Remove <foreignObject>...</foreignObject>
  out = out.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, "");

  // 3. Strip event attributes (on*)
  out = out.replace(/\s+on\w+=(["'])(?:\\.|(?!\1).)*\1/gi, "");
  out = out.replace(/\s+on\w+=\s*[^\s>]+/gi, "");

  // 4. Block dangerous href / xlink:href (javascript:, data:text/html, absolute URLs). Allow #, safe data:, relative.
  out = out.replace(
    /(href|xlink:href)\s*=\s*["'](javascript:[^"']*|data:\s*text\/html[^"']*)["']/gi,
    '$1="#"'
  );
  out = out.replace(
    /(href|xlink:href)\s*=\s*["'](https?:|\/\/)[^"']*["']/gi,
    '$1="#"'
  );

  // 5. Enforce viewBox and width/height 512 on root <svg>
  out = out.replace(/<svg\s*([^>]*)>/i, (_, attrs) => {
    const withoutViewBoxWidthHeight = attrs
      .replace(/\s*viewBox\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*width\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*height\s*=\s*["'][^"']*["']/gi, "");
    const trimmed = withoutViewBoxWidthHeight.replace(/^\s+|\s+$/g, "");
    const rest = trimmed ? ` ${trimmed}` : "";
    return `<svg viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"${rest}>`;
  });

  return out;
}
