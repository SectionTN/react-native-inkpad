import { describe, expect, it } from 'vitest';
import { validateDocument } from '../document';
import { ErrorCode, InkpadError } from '../errors';

const finger = [10, 10, 0, -1, -1, -1, 20, 12, 16, -1, -1, -1];

const stroke = (points: number[], brush: Record<string, unknown> = {}) => ({
  brush: { type: 'pen', color: '#112233ff', size: 3, ...brush },
  input: 'touch',
  points,
});

const doc = (strokes: unknown[], extra: Record<string, unknown> = {}) => ({
  version: 1,
  size: { width: 300, height: 200 },
  strokes,
  ...extra,
});

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return error instanceof InkpadError ? error.code : 'not-inkpad';
  }
  return undefined;
}

describe('validateDocument', () => {
  it('accepts a valid document and upper-cases colors', () => {
    const result = validateDocument(doc([stroke(finger)]));
    expect(result.size).toEqual({ width: 300, height: 200 });
    expect(result.strokes[0]?.brush.color).toBe('#112233FF');
    expect(result.strokes[0]?.points).toEqual(finger);
  });

  it('accepts stylus channels reported for every point', () => {
    const pen = [10, 10, 0, 0.5, 0.2, 1, 20, 12, 16, 0.6, 0.3, 1.1];
    expect(validateDocument(doc([stroke(pen)])).strokes).toHaveLength(1);
  });

  it('rejects newer versions with E_UNSUPPORTED_VERSION', () => {
    expect(codeOf(() => validateDocument(doc([], { version: 2 })))).toBe(
      ErrorCode.UNSUPPORTED_VERSION,
    );
  });

  it('rejects a color without alpha', () => {
    expect(codeOf(() => validateDocument(doc([stroke(finger, { color: '#112233' })])))).toBe(
      ErrorCode.INVALID_DOCUMENT,
    );
  });

  it('rejects unknown brushes', () => {
    expect(codeOf(() => validateDocument(doc([stroke(finger, { type: 'crayon' })])))).toBe(
      ErrorCode.INVALID_DOCUMENT,
    );
  });

  it('rejects points that are not a multiple of 6', () => {
    expect(codeOf(() => validateDocument(doc([stroke([10, 10, 0, -1, -1])])))).toBe(
      ErrorCode.INVALID_DOCUMENT,
    );
  });

  it('rejects pressure reported for only some points', () => {
    const mixed = [10, 10, 0, 0.5, -1, -1, 20, 12, 16, -1, -1, -1];
    expect(codeOf(() => validateDocument(doc([stroke(mixed)])))).toBe(ErrorCode.INVALID_DOCUMENT);
  });

  it('rejects time going backwards', () => {
    const backwards = [10, 10, 20, -1, -1, -1, 20, 12, 16, -1, -1, -1];
    expect(codeOf(() => validateDocument(doc([stroke(backwards)])))).toBe(
      ErrorCode.INVALID_DOCUMENT,
    );
  });

  it('rejects a canvas without a positive size', () => {
    expect(codeOf(() => validateDocument(doc([], { size: { width: 0, height: 200 } })))).toBe(
      ErrorCode.INVALID_DOCUMENT,
    );
  });
});
