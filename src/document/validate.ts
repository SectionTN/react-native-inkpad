import { ErrorCode, InkpadError } from '../errors';
import {
  BRUSH_TYPES,
  DOCUMENT_VERSION,
  INPUT_TYPES,
  type InkDocument,
  type InkStroke,
  POINT_STRIDE,
} from './types';

const COLOR = /^#[0-9a-f]{8}$/i;

function fail(message: string): never {
  throw new InkpadError(ErrorCode.INVALID_DOCUMENT, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function positive(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    fail(`${path} must be a positive number`);
  }
  return value;
}

// Ink needs each optional channel on every point of a stroke or on none of them.
function checkChannel(points: readonly number[], offset: number, max: number, path: string) {
  const reported = points[offset] !== -1;
  for (let i = offset; i < points.length; i += POINT_STRIDE) {
    const value = points[i] as number;
    if (!reported) {
      if (value !== -1) fail(`${path} must be -1 for every point or for none`);
    } else if (value < 0 || value > max) {
      fail(`${path} must be between 0 and ${max}`);
    }
  }
}

function validateStroke(value: unknown, index: number): InkStroke {
  const path = `strokes[${index}]`;
  if (!isRecord(value) || !isRecord(value.brush)) fail(`${path} must have a brush`);
  const { type, color, size } = value.brush;
  if (!oneOf(BRUSH_TYPES, type)) fail(`${path}.brush.type is not a known brush`);
  if (typeof color !== 'string' || !COLOR.test(color)) {
    fail(`${path}.brush.color must be #RRGGBBAA`);
  }
  if (!oneOf(INPUT_TYPES, value.input)) fail(`${path}.input is not a known input type`);
  const points = value.points;
  if (!Array.isArray(points) || points.length === 0 || points.length % POINT_STRIDE !== 0) {
    fail(`${path}.points must hold 6 numbers per point`);
  }
  for (const n of points) {
    if (typeof n !== 'number' || !Number.isFinite(n)) fail(`${path}.points must only hold numbers`);
  }
  const numbers = points as number[];
  let previous = 0;
  for (let i = 2; i < numbers.length; i += POINT_STRIDE) {
    const t = numbers[i] as number;
    if (!Number.isInteger(t) || t < previous) {
      fail(`${path}.points times must be whole, non-decreasing milliseconds`);
    }
    previous = t;
  }
  checkChannel(numbers, 3, 1, `${path} pressure`);
  checkChannel(numbers, 4, Math.PI / 2, `${path} tilt`);
  checkChannel(numbers, 5, Math.PI * 2, `${path} orientation`);
  return {
    brush: { type, color: color.toUpperCase(), size: positive(size, `${path}.brush.size`) },
    input: value.input,
    points: numbers,
  };
}

export function validateDocument(value: unknown): InkDocument {
  if (!isRecord(value)) fail('document must be an object');
  if (typeof value.version === 'number' && value.version > DOCUMENT_VERSION) {
    throw new InkpadError(
      ErrorCode.UNSUPPORTED_VERSION,
      `document version ${value.version} is newer than ${DOCUMENT_VERSION}`,
    );
  }
  if (value.version !== DOCUMENT_VERSION) fail(`version must be ${DOCUMENT_VERSION}`);
  if (!isRecord(value.size)) fail('size must be an object');
  const width = positive(value.size.width, 'size.width');
  const height = positive(value.size.height, 'size.height');
  if (!Array.isArray(value.strokes)) fail('strokes must be an array');
  return {
    version: DOCUMENT_VERSION,
    size: { width, height },
    strokes: value.strokes.map(validateStroke),
  };
}
