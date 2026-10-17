import { describe, expect, it } from 'vitest';
import { validateDocument } from '../document';
import {
  acceptsPointer,
  appendPoint,
  blocksTouch,
  capture,
  endsStroke,
  inputOf,
  type PointerSample,
  pointOf,
  predictedOf,
  samplesOf,
  touchActionFor,
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

  it('treats a pen with no tilt as upright', () => {
    expect(pointOf(sample({ pointerType: 'pen' }), origin, 'stylus').slice(3)).toEqual([0.5, 0, 0]);
  });

  it('records a pen stroke that passes upright as a valid document', () => {
    const points: number[] = [];
    for (const tiltX of [12, 0, 10]) {
      appendPoint(points, pointOf(sample({ pointerType: 'pen', tiltX }), origin, 'stylus'));
    }
    const brush = { type: 'pen', color: '#000000FF', size: 4 };
    const strokes = [{ brush, input: 'stylus', points }];
    expect(() =>
      validateDocument({ version: 1, size: { width: 9, height: 9 }, strokes }),
    ).not.toThrow();
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
    const touch = { pointerType: 'touch', isPrimary: true, button: 0 };
    expect(acceptsPointer(null, touch)).toBe(true);
    expect(acceptsPointer(3, touch)).toBe(false);
    expect(acceptsPointer(null, { ...touch, isPrimary: false })).toBe(false);
    expect(acceptsPointer(null, { ...touch, button: 5 })).toBe(false);
  });

  it('starts a stroke only from a pen in stylus mode', () => {
    const down = (pointerType: string) => ({ pointerType, isPrimary: true, button: 0 });
    expect(acceptsPointer(null, down('pen'), 'stylus')).toBe(true);
    expect(acceptsPointer(null, down('touch'), 'stylus')).toBe(false);
    expect(acceptsPointer(null, down('mouse'), 'stylus')).toBe(false);
    for (const type of ['pen', 'touch', 'mouse']) {
      expect(acceptsPointer(null, down(type), 'any')).toBe(true);
    }
  });
});

describe('stylus mode scrolling', () => {
  it('lets fingers pan only in stylus mode', () => {
    expect(touchActionFor(true, 'any')).toBe('none');
    expect(touchActionFor(true, 'stylus')).toBe('pan-x pan-y pinch-zoom');
    expect(touchActionFor(false, 'stylus')).toBe('auto');
  });

  it('stops a pen from panning in stylus mode', () => {
    const finger = [{ touchType: 'direct' }];
    const pencil = [{ touchType: 'stylus' }];
    expect(blocksTouch('stylus', false, pencil)).toBe(true);
    expect(blocksTouch('stylus', true, [{}])).toBe(true);
    expect(blocksTouch('stylus', false, finger)).toBe(false);
    expect(blocksTouch('stylus', false, [{}])).toBe(false);
    expect(blocksTouch('any', true, pencil)).toBe(false);
  });
});

describe('stroke lifecycle', () => {
  it('ends a mouse or pen stroke once no button is down', () => {
    expect(endsStroke({ pointerType: 'mouse', buttons: 0 })).toBe(true);
    expect(endsStroke({ pointerType: 'pen', buttons: 0 })).toBe(true);
    expect(endsStroke({ pointerType: 'mouse', buttons: 1 })).toBe(false);
    expect(endsStroke({ pointerType: 'pen', buttons: 1 })).toBe(false);
    expect(endsStroke({ pointerType: 'touch', buttons: 0 })).toBe(false);
  });

  it('keeps going when pointer capture throws', () => {
    const calls: number[] = [];
    expect(capture({ setPointerCapture: (id) => calls.push(id) }, 7)).toBe(true);
    expect(calls).toEqual([7]);
    const gone = {
      setPointerCapture: () => {
        throw new Error('NotFoundError');
      },
    };
    expect(capture(gone, 7)).toBe(false);
  });
});
