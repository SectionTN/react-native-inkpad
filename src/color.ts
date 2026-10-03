export type Rgba = { r: number; g: number; b: number; a: number };

// processColor gives an ARGB int on iOS and Android (signed on Android).
export function argbToHex(argb: number): string {
  const value = argb >>> 0;
  const byte = (shift: number) => ((value >>> shift) & 0xff).toString(16).padStart(2, '0');
  return `#${byte(16)}${byte(8)}${byte(0)}${byte(24)}`.toUpperCase();
}

export function hexToRgba(hex: string): Rgba {
  const value = Number.parseInt(hex.slice(1), 16) >>> 0;
  return {
    r: (value >>> 24) & 0xff,
    g: (value >>> 16) & 0xff,
    b: (value >>> 8) & 0xff,
    a: (value & 0xff) / 255,
  };
}
