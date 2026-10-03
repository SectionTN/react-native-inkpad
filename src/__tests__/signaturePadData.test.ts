import { describe, expect, it } from 'vitest';
import { documentToPointGroups, pointGroupsToDocument } from '../compat/signaturePadData';
import type { InkDocument } from '../document';

const normalize = (css: string) => {
  if (css === 'black') return '#000000FF';
  return /^#[0-9a-f]{8}$/i.test(css) ? css.toUpperCase() : null;
};

describe('signature_pad data', () => {
  it('turns point groups into pen strokes timed from the first point', () => {
    const { doc, skipped } = pointGroupsToDocument(
      [
        {
          color: 'black',
          maxWidth: 3,
          points: [
            { x: 1, y: 2, time: 1000 },
            { x: 3, y: 4, time: 1016 },
          ],
        },
      ],
      { width: 300, height: 200 },
      normalize,
    );
    expect(skipped).toBe(0);
    expect(doc.strokes[0]).toEqual({
      brush: { type: 'pen', color: '#000000FF', size: 3 },
      input: 'touch',
      points: [1, 2, 0, -1, -1, -1, 3, 4, 16, -1, -1, -1],
    });
  });

  it('skips eraser groups and colors it cannot read', () => {
    const { doc, skipped } = pointGroupsToDocument(
      [
        {
          color: 'black',
          compositeOperation: 'destination-out',
          points: [{ x: 1, y: 1, time: 0 }],
        },
        { color: 'not-a-color', points: [{ x: 1, y: 1, time: 0 }] },
      ],
      { width: 10, height: 10 },
      normalize,
    );
    expect(doc.strokes).toHaveLength(0);
    expect(skipped).toBe(2);
  });

  it('round-trips a document through signature_pad data', () => {
    const doc: InkDocument = {
      version: 1,
      size: { width: 300, height: 200 },
      strokes: [
        {
          brush: { type: 'pen', color: '#112233FF', size: 5 },
          input: 'touch',
          points: [1, 2, 0, -1, -1, -1, 3, 4, 16, -1, -1, -1],
        },
      ],
    };
    const groups = documentToPointGroups(doc);
    expect(groups[0]).toMatchObject({
      color: '#112233FF',
      maxWidth: 5,
      minWidth: 1,
      compositeOperation: 'source-over',
    });
    expect(pointGroupsToDocument(groups, doc.size, normalize).doc).toEqual(doc);
  });
});
