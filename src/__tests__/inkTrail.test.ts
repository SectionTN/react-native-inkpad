import { beforeEach, describe, expect, it } from 'vitest';
import type { InkBrush } from '../document';
import { type InkLike, type InkPresenterLike, InkTrail, type InkTrailStyle } from '../web/inkTrail';

type Recorded = { event: PointerEvent; style: InkTrailStyle };
type FakePresenter = InkPresenterLike & { calls: Recorded[] };

const area = {} as Element;
const event = {} as PointerEvent;
const pen: InkBrush = { type: 'pen', color: '#1C1C1EFF', size: 3 };
const highlighter: InkBrush = { type: 'highlighter', color: '#FFD60AFF', size: 20 };

const fakeInk = (presenter: InkPresenterLike): InkLike => ({
  requestPresenter: () => Promise.resolve(presenter),
});
const settle = () => Promise.resolve();
const throwingPresenter: InkPresenterLike = {
  updateInkTrailStartPoint() {
    throw new Error('presentation area left the page');
  },
};

let presenter: FakePresenter;
let trail: InkTrail;

beforeEach(() => {
  const calls: Recorded[] = [];
  presenter = { calls, updateInkTrailStartPoint: (event, style) => calls.push({ event, style }) };
  const created = InkTrail.create(fakeInk(presenter), area);
  if (!created) throw new Error('expected a trail');
  trail = created;
});

describe('InkTrail', () => {
  it('does nothing without the Ink API', () => {
    expect(InkTrail.create(undefined, area)).toBeNull();
  });

  it('waits for the presenter', async () => {
    let resolve: (value: InkPresenterLike) => void = () => {};
    const ink: InkLike = { requestPresenter: () => new Promise((done) => (resolve = done)) };
    const waiting = InkTrail.create(ink, area);
    waiting?.update(event, pen, 3);
    resolve(presenter);
    await settle();
    expect(presenter.calls).toEqual([]);
  });

  it('draws pen and marker trails in the brush color', async () => {
    await settle();
    trail.update(event, pen, 3);
    expect(presenter.calls).toEqual([{ event, style: { color: '#1C1C1EFF', diameter: 3 } }]);
  });

  it('keeps the diameter at 1 or more', async () => {
    await settle();
    trail.update(event, pen, 0.4);
    expect(presenter.calls[0]?.style.diameter).toBe(1);
  });

  it('skips highlighters', async () => {
    await settle();
    trail.update(event, highlighter, 20);
    expect(presenter.calls).toEqual([]);
  });

  it('stops after dispose', async () => {
    await settle();
    trail.dispose();
    trail.update(event, pen, 3);
    expect(presenter.calls).toEqual([]);
  });

  it('swallows presenter errors', async () => {
    const throwing = InkTrail.create(fakeInk(throwingPresenter), area);
    await settle();
    expect(() => throwing?.update(event, pen, 3)).not.toThrow();
  });

  it('stays inert when the browser refuses a presenter', async () => {
    const refused = InkTrail.create(
      { requestPresenter: () => Promise.reject(new Error('no')) },
      area,
    );
    await settle();
    expect(() => refused?.update(event, pen, 3)).not.toThrow();
  });

  it('stays inert when requesting a presenter throws', () => {
    const ink: InkLike = {
      requestPresenter: () => {
        throw new Error('not in the page');
      },
    };
    expect(() => InkTrail.create(ink, area)?.update(event, pen, 3)).not.toThrow();
  });
});
