import { describe, expect, it } from 'vitest';
import type { InkStroke } from '../document';
import { StrokeHistory } from '../web/history';

const stroke = (x: number): InkStroke => ({
  brush: { type: 'pen', color: '#000000FF', size: 3 },
  input: 'touch',
  points: [x, x, 0, -1, -1, -1],
});
const a = stroke(1);
const b = stroke(2);
const c = stroke(3);

describe('StrokeHistory', () => {
  it('undoes and redoes an added stroke', () => {
    const history = new StrokeHistory();
    history.record({ kind: 'add', stroke: b });
    expect(history.undo([a, b])).toEqual([a]);
    expect(history.redo([a])).toEqual([a, b]);
  });

  it('restores the whole list on a replace', () => {
    const history = new StrokeHistory();
    history.record({ kind: 'replace', before: [a, b, c], after: [] });
    expect(history.undo([])).toEqual([a, b, c]);
    expect(history.redo([a, b, c])).toEqual([]);
  });

  it('drops the redo stack when something new is recorded', () => {
    const history = new StrokeHistory();
    history.record({ kind: 'add', stroke: a });
    history.undo([a]);
    expect(history.canRedo).toBe(true);
    history.record({ kind: 'add', stroke: b });
    expect(history.canRedo).toBe(false);
  });

  it('does nothing when nothing was recorded', () => {
    expect(new StrokeHistory().undo([])).toBeNull();
  });

  it('leaves the given list untouched', () => {
    const history = new StrokeHistory();
    history.record({ kind: 'add', stroke: b });
    const strokes = [a, b];
    history.undo(strokes);
    expect(strokes).toEqual([a, b]);
  });
});
