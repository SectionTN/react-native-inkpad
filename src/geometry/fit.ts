export type BackgroundFit = 'contain' | 'cover';

export type Size = { width: number; height: number };

export type Rect = { x: number; y: number; width: number; height: number };

export function fitRect(image: Size, box: Size, fit: BackgroundFit): Rect {
  const sx = image.width > 0 ? box.width / image.width : 0;
  const sy = image.height > 0 ? box.height / image.height : 0;
  const scale = fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}
