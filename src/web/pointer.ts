import { type InputType, POINT_STRIDE } from '../document';
import type { InputMode } from '../types';

export type PointerSample = {
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  button: number;
  clientX: number;
  clientY: number;
  timeStamp: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  altitudeAngle?: number;
  azimuthAngle?: number;
};

export type StrokeOrigin = { left: number; top: number; startTime: number };

const round = (value: number, factor: number) => Math.round(value * factor) / factor;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function wrapAngle(angle: number): number {
  const wrapped = angle % (2 * Math.PI);
  return wrapped < 0 ? wrapped + 2 * Math.PI : wrapped;
}

function anglesOf(sample: PointerSample): { altitude: number; azimuth: number } {
  if (sample.altitudeAngle !== undefined && sample.azimuthAngle !== undefined) {
    return { altitude: sample.altitudeAngle, azimuth: sample.azimuthAngle };
  }
  // Pointer Events level 3 conversion from tiltX and tiltY. A pen with no tilt reads as upright, like Chrome reports it.
  const tx = Math.tan((sample.tiltX * Math.PI) / 180);
  const ty = Math.tan((sample.tiltY * Math.PI) / 180);
  return { altitude: Math.atan(1 / Math.hypot(tx, ty)), azimuth: Math.atan2(ty, tx) };
}

export function inputOf(pointerType: string): InputType {
  if (pointerType === 'pen') return 'stylus';
  if (pointerType === 'touch') return 'touch';
  return 'mouse';
}

export function pointOf(sample: PointerSample, origin: StrokeOrigin, input: InputType): number[] {
  const point = [
    round(sample.clientX - origin.left, 100),
    round(sample.clientY - origin.top, 100),
    Math.round(sample.timeStamp - origin.startTime),
  ];
  if (input !== 'stylus') return [...point, -1, -1, -1];
  const angles = anglesOf(sample);
  return [
    ...point,
    round(clamp(sample.pressure, 0, 1), 1000),
    round(clamp(Math.PI / 2 - angles.altitude, 0, Math.PI / 2), 1000),
    round(wrapAngle(angles.azimuth), 1000),
  ];
}

// validateDocument needs whole times that never go back, from 0.
export function appendPoint(points: number[], point: readonly number[]): void {
  const previous = points.length > 0 ? (points[points.length - POINT_STRIDE + 2] as number) : 0;
  points.push(
    point[0] as number,
    point[1] as number,
    Math.max(previous, point[2] as number),
    ...point.slice(3),
  );
}

export function samplesOf<T>(event: T & { getCoalescedEvents?: () => T[] }): T[] {
  const coalesced = event.getCoalescedEvents?.();
  return coalesced && coalesced.length > 0 ? coalesced : [event];
}

export function predictedOf<T>(event: T & { getPredictedEvents?: () => T[] }): T[] {
  return event.getPredictedEvents?.() ?? [];
}

export function acceptsPointer(
  active: number | null,
  sample: Pick<PointerSample, 'isPrimary' | 'button' | 'pointerType'>,
  mode: InputMode = 'any',
): boolean {
  if (mode === 'stylus' && sample.pointerType !== 'pen') return false;
  return active === null && sample.isPrimary && sample.button === 0;
}

// A browser can skip pointerup, after a focus change for one; a mouse or pen move with no button down ends the stroke.
export function endsStroke(sample: { pointerType: string; buttons: number }): boolean {
  return (sample.pointerType === 'mouse' || sample.pointerType === 'pen') && sample.buttons === 0;
}

// Browsers pan with a pen too, so stylus mode lets fingers pan and blocks the pen's touches instead.
export function touchActionFor(editable: boolean, mode: InputMode): string {
  if (!editable) return 'auto';
  return mode === 'stylus' ? 'pan-x pan-y pinch-zoom' : 'none';
}

// Safari marks Pencil touches as stylus; Chrome sends the pen's pointerdown before its touches.
export function blocksTouch(
  mode: InputMode,
  penDown: boolean,
  touches: ArrayLike<{ touchType?: string }>,
): boolean {
  if (mode !== 'stylus') return false;
  if (penDown) return true;
  for (let i = 0; i < touches.length; i++) {
    if (touches[i]?.touchType === 'stylus') return true;
  }
  return false;
}
