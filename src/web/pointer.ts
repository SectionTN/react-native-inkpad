import type { InputType } from '../document';

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

function anglesOf(sample: PointerSample): { altitude: number; azimuth: number } | null {
  if (sample.altitudeAngle !== undefined && sample.azimuthAngle !== undefined) {
    return { altitude: sample.altitudeAngle, azimuth: sample.azimuthAngle };
  }
  if (sample.tiltX === 0 && sample.tiltY === 0) return null;
  // Pointer Events level 3 conversion from tiltX and tiltY to altitude and azimuth.
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
    angles ? round(clamp(Math.PI / 2 - angles.altitude, 0, Math.PI / 2), 1000) : -1,
    angles ? round(wrapAngle(angles.azimuth), 1000) : -1,
  ];
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
  sample: Pick<PointerSample, 'isPrimary' | 'button'>,
): boolean {
  return active === null && sample.isPrimary && sample.button === 0;
}
