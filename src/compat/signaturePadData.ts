import { type InkDocument, type InkStroke, POINT_STRIDE } from '../document';

export type PointGroup = {
  color: string;
  dotSize?: number;
  minWidth?: number;
  maxWidth?: number;
  compositeOperation?: string;
  points: { x: number; y: number; time: number }[];
};

export type NormalizeColor = (css: string) => string | null;

const DEFAULT_MAX_WIDTH = 2.5;

// signature_pad keeps pixel-eraser strokes as destination-out groups. A stroke document cannot hold them.
export function pointGroupsToDocument(
  groups: readonly PointGroup[],
  size: { width: number; height: number },
  normalizeColor: NormalizeColor,
): { doc: InkDocument; skipped: number } {
  const strokes: InkStroke[] = [];
  let skipped = 0;
  for (const group of groups) {
    const color = normalizeColor(group.color);
    const first = group.points[0];
    if (group.compositeOperation === 'destination-out' || !first || !color) {
      skipped++;
      continue;
    }
    const points: number[] = [];
    let previous = 0;
    for (const point of group.points) {
      const t = Math.max(previous, Math.round(point.time - first.time));
      previous = t;
      points.push(point.x, point.y, t, -1, -1, -1);
    }
    strokes.push({
      brush: { type: 'pen', color, size: group.maxWidth ?? DEFAULT_MAX_WIDTH },
      input: 'touch',
      points,
    });
  }
  return { doc: { version: 1, size, strokes }, skipped };
}

export function documentToPointGroups(doc: InkDocument): PointGroup[] {
  return doc.strokes.map((stroke) => {
    const maxWidth = stroke.brush.size;
    const minWidth = Math.max(0.5, maxWidth / 5);
    const points: PointGroup['points'] = [];
    for (let i = 0; i < stroke.points.length; i += POINT_STRIDE) {
      points.push({
        x: stroke.points[i] as number,
        y: stroke.points[i + 1] as number,
        time: stroke.points[i + 2] as number,
      });
    }
    return {
      color: stroke.brush.color,
      dotSize: (minWidth + maxWidth) / 2,
      minWidth,
      maxWidth,
      compositeOperation: 'source-over',
      points,
    };
  });
}
