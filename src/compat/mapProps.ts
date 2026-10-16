export type ExportFormat = 'png' | 'jpeg' | 'svg';

export const IGNORED_PROPS = [
  'customHtml',
  'webviewProps',
  'webviewContainerStyle',
  'androidLayerType',
  'androidHardwareAccelerationDisabled',
  'nestedScrollEnabled',
  'showsVerticalScrollIndicator',
  'scrollable',
  'rotated',
  'dotSize',
  'velocityFilterWeight',
  'minWidth',
  'overlayWidth',
  'overlayHeight',
] as const;

const FOOTER_HIDDEN = /\.m-signature-pad--footer[^{]*\{[^}]*display\s*:\s*none/i;
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function exportFormat(imageType: string | undefined): ExportFormat {
  if (imageType === 'image/jpeg') return 'jpeg';
  if (imageType === 'image/svg+xml') return 'svg';
  return 'png';
}

export function footerHidden(webStyle: string | undefined): boolean {
  return webStyle !== undefined && FOOTER_HIDDEN.test(webStyle);
}

export function unsupportedProps(props: Record<string, unknown>): string[] {
  return IGNORED_PROPS.filter((name) => props[name] !== undefined);
}

export function backgroundBox(
  width?: number,
  height?: number,
): { width: number; height: number } | null {
  return width && height && width > 0 && height > 0 ? { width, height } : null;
}

// A restored dataURL image is content, and trimming to the strokes could cut it off.
export function readPlan(
  strokeCount: number,
  hasImage: boolean,
  trimWhitespace: boolean | undefined,
): 'empty' | { trim: boolean } {
  if (strokeCount === 0 && !hasImage) return 'empty';
  return { trim: Boolean(trimWhitespace) && !hasImage };
}

export function dataUrl(format: ExportFormat, base64: string): string {
  const mime = format === 'svg' ? 'image/svg+xml' : `image/${format}`;
  return `data:${mime};base64,${base64}`;
}

// The SVG we build is plain ASCII, so one byte per character is enough here.
export function asciiToBase64(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i += 3) {
    const hasB = i + 1 < text.length;
    const hasC = i + 2 < text.length;
    const triple =
      (text.charCodeAt(i) << 16) |
      ((hasB ? text.charCodeAt(i + 1) : 0) << 8) |
      (hasC ? text.charCodeAt(i + 2) : 0);
    out += BASE64.charAt((triple >> 18) & 63) + BASE64.charAt((triple >> 12) & 63);
    out += hasB ? BASE64.charAt((triple >> 6) & 63) : '=';
    out += hasC ? BASE64.charAt(triple & 63) : '=';
  }
  return out;
}
