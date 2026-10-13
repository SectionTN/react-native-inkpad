import { describe, expect, it } from 'vitest';
import {
  acceptsPointer,
  appendPoint,
  inputOf,
  type PointerSample,
  pointOf,
  predictedOf,
  samplesOf,
} from '../web/pointer';

const origin = { left: 100, top: 200, startTime: 1000 };
const sample = (over: Partial<PointerSample>): PointerSample => ({
  pointerId: 1,
  pointerType: 'touch',
  isPrimary: true,
  button: 0,
  clientX: 110.456,
  clientY: 220.004,
  timeStamp: 1016.6,
  pressure: 0.5,
  tiltX: 0,
  tiltY: 0,
  ...over,
});

describe('pointer', () => {
  it('maps pointer types to inputs', () => {
    expect(['pen', 'touch', 'mouse', ''].map(inputOf)).toEqual([
      'stylus',
      'touch',
      'mouse',
      'mouse',
    ]);
  });

  it('places points relative to the canvas and drops placeholder pressure for touch', () => {
    expect(pointOf(sample({}), origin, 'touch')).toEqual([10.46, 20, 17, -1, -1, -1]);
  });

  it('reads altitude and azimuth from a stylus', () => {
    const pen = sample({
      pointerType: 'pen',
      altitudeAngle: Math.PI / 4,
      azimuthAngle: -Math.PI / 2,
    });
    expect(pointOf(pen, origin, 'stylus').slice(3)).toEqual([0.5, 0.785, 4.712]);
  });

  it('falls back to tiltX and tiltY', () => {
    expect(pointOf(sample({ pointerType: 'pen', tiltX: 45 }), origin, 'stylus').slice(4)).toEqual([
      0.785, 0,
    ]);
  });

  it('writes -1 for tilt when the pen reports none', () => {
    expect(pointOf(sample({ pointerType: 'pen' }), origin, 'stylus').slice(3)).toEqual([
      0.5, -1, -1,
    ]);
  });

  it('clamps pressure to 1', () => {
    expect(pointOf(sample({ pointerType: 'pen', pressure: 1.2 }), origin, 'stylus')[3]).toBe(1);
  });

  it('uses coalesced events when the browser has them', () => {
    const a = sample({});
    const b = sample({});
    expect(samplesOf({ ...a, getCoalescedEvents: () => [a, b] })).toEqual([a, b]);
    expect(samplesOf({ ...a, getCoalescedEvents: (): PointerSample[] => [] })).toHaveLength(1);
    expect(samplesOf(a)).toEqual([a]);
  });

  it('has no predicted events without the method', () => {
    expect(predictedOf(sample({}))).toEqual([]);
  });

  it('keeps point times non-decreasing from 0', () => {
    const points: number[] = [];
    appendPoint(points, [1, 1, -2, -1, -1, -1]);
    appendPoint(points, [2, 2, 9, -1, -1, -1]);
    appendPoint(points, [3, 3, 7, -1, -1, -1]);
    expect([points[2], points[8], points[14]]).toEqual([0, 9, 9]);
  });

  it('starts a stroke only for an idle, primary, main-button pointer', () => {
    expect(acceptsPointer(null, { isPrimary: true, button: 0 })).toBe(true);
    expect(acceptsPointer(3, { isPrimary: true, button: 0 })).toBe(false);
    expect(acceptsPointer(null, { isPrimary: false, button: 0 })).toBe(false);
    expect(acceptsPointer(null, { isPrimary: true, button: 5 })).toBe(false);
  });
});
