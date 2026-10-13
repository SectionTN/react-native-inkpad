import type { InkStroke } from '../document';

export type HistoryOp =
  | { kind: 'add'; stroke: InkStroke }
  | { kind: 'replace'; before: InkStroke[]; after: InkStroke[] };

export class StrokeHistory {
  private readonly undoStack: HistoryOp[] = [];
  private readonly redoStack: HistoryOp[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  record(op: HistoryOp): void {
    this.undoStack.push(op);
    this.redoStack.length = 0;
  }

  // An undone add is always the last stroke, because later ops are undone first.
  undo(strokes: readonly InkStroke[]): InkStroke[] | null {
    const op = this.undoStack.pop();
    if (!op) return null;
    this.redoStack.push(op);
    return op.kind === 'add' ? strokes.slice(0, -1) : [...op.before];
  }

  redo(strokes: readonly InkStroke[]): InkStroke[] | null {
    const op = this.redoStack.pop();
    if (!op) return null;
    this.undoStack.push(op);
    return op.kind === 'add' ? [...strokes, op.stroke] : [...op.after];
  }
}
