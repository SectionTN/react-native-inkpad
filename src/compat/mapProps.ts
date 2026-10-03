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
  'bgWidth',
  'bgHeight',
  'overlayWidth',
  'overlayHeight',
] as const;

// These need background image support, which ships in 0.3.
export const LATER_PROPS = ['bgSrc', 'dataURL'] as const;

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
  const names: readonly string[] = [...IGNORED_PROPS, ...LATER_PROPS];
  return names.filter((name) => props[name] !== undefined);
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
