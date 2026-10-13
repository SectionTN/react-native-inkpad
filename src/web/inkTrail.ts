import type { InkBrush } from '../document';

export type InkTrailStyle = { color: string; diameter: number };
export type InkPresenterLike = {
  updateInkTrailStartPoint(event: PointerEvent, style: InkTrailStyle): void;
};
export type InkLike = {
  requestPresenter(param?: { presentationArea?: Element | null }): Promise<InkPresenterLike>;
};

export class InkTrail {
  private presenter: InkPresenterLike | null = null;
  private disposed = false;

  private constructor(ink: InkLike, area: Element) {
    try {
      ink.requestPresenter({ presentationArea: area }).then(
        (presenter) => {
          if (!this.disposed) this.presenter = presenter;
        },
        () => {},
      );
    } catch {}
  }

  static create(ink: InkLike | undefined, area: Element): InkTrail | null {
    return ink ? new InkTrail(ink, area) : null;
  }

  update(event: PointerEvent, brush: InkBrush, width: number): void {
    if (!this.presenter || brush.type === 'highlighter') return;
    try {
      this.presenter.updateInkTrailStartPoint(event, {
        color: brush.color,
        diameter: Math.max(1, width),
      });
    } catch {
      // The presenter throws once its canvas has left the page.
    }
  }

  dispose(): void {
    this.disposed = true;
    this.presenter = null;
  }
}
