import type { CSSProperties, RefObject } from 'react';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { type ColorValue, processColor, StyleSheet, View } from 'react-native';
import { argbToHex } from './color';
import {
  type BrushType,
  DOCUMENT_VERSION,
  type InkBrush,
  type InkDocument,
  type InkStroke,
  type InputType,
  validateDocument,
} from './document';
import { ErrorCode, InkpadError, notMounted } from './errors';
import { touches } from './geometry/hitTest';
import { type Vec, widthPoints } from './geometry/outline';
import { toNativeImageOptions } from './imageOptions';
import { toNativeInkProps } from './nativeProps';
import { toSVG } from './svg/toSVG';
import type { BackgroundFit, InkCanvasProps, InkState, InputMode } from './types';
import { usePropWarnings } from './usePropWarnings';
import { BackgroundImage } from './web/backgroundImage';
import { exportImage } from './web/exportImage';
import { StrokeHistory } from './web/history';
import { uriOf } from './web/imageSource';
import { type InkLike, InkTrail } from './web/inkTrail';
import {
  acceptsPointer,
  appendPoint,
  blocksTouch,
  capture,
  endsStroke,
  inputOf,
  pointOf,
  predictedOf,
  type StrokeOrigin,
  samplesOf,
  touchActionFor,
} from './web/pointer';
import { drawBackground, drawBackgroundImage, drawStroke, drawStrokes } from './web/render';

type Live = {
  brushType: BrushType;
  brushHex: string;
  brushSize: number;
  tool: 'draw' | 'erase';
  inputMode: InputMode;
  editable: boolean;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  onChange?: (state: InkState) => void;
  onError?: (error: InkpadError) => void;
};

type Gesture =
  | {
      kind: 'draw';
      pointerId: number;
      origin: StrokeOrigin;
      brush: InkBrush;
      input: InputType;
      points: number[];
      lastEvent: PointerEvent;
    }
  | { kind: 'erase'; pointerId: number; origin: StrokeOrigin; before: InkStroke[]; last: Vec };

function hexOf(color: ColorValue | undefined): string | undefined {
  const processed = processColor(color);
  return typeof processed === 'number' ? argbToHex(processed) : undefined;
}

class Surface {
  strokes: InkStroke[] = [];
  size = { width: 0, height: 0 };
  background: string | undefined;
  mounted = false;
  private readonly history = new StrokeHistory();
  private gesture: Gesture | null = null;
  private penDown = false;
  private frame = 0;
  private trail: InkTrail | null = null;
  private bottom: HTMLCanvasElement | null = null;
  private top: HTMLCanvasElement | null = null;

  readonly image: BackgroundImage;
  imageUri: string | undefined;
  fit: BackgroundFit = 'contain';

  constructor(private readonly live: RefObject<Live>) {
    this.image = new BackgroundImage(
      () => new Image(),
      () => this.redraw(),
      (error) => this.reportError(error),
    );
  }

  attach(bottom: HTMLCanvasElement, top: HTMLCanvasElement): () => void {
    this.bottom = bottom;
    this.top = top;
    this.mounted = true;
    top.addEventListener('pointerdown', this.down);
    top.addEventListener('pointermove', this.move);
    top.addEventListener('pointerup', this.up);
    top.addEventListener('pointercancel', this.cancel);
    top.addEventListener('lostpointercapture', this.up);
    top.addEventListener('touchstart', this.touch, { passive: false });
    top.addEventListener('touchmove', this.touch, { passive: false });
    top.addEventListener('contextmenu', this.menu);
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(bottom);
    this.resize();
    this.trail = InkTrail.create((navigator as Navigator & { ink?: InkLike }).ink, top);
    return () => {
      top.removeEventListener('pointerdown', this.down);
      top.removeEventListener('pointermove', this.move);
      top.removeEventListener('pointerup', this.up);
      top.removeEventListener('pointercancel', this.cancel);
      top.removeEventListener('lostpointercapture', this.up);
      top.removeEventListener('touchstart', this.touch);
      top.removeEventListener('touchmove', this.touch);
      top.removeEventListener('contextmenu', this.menu);
      observer.disconnect();
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.trail?.dispose();
      this.trail = null;
      this.gesture = null;
      this.mounted = false;
    };
  }

  setBackground(hex: string | undefined): void {
    this.background = hex;
    this.redraw();
  }

  // Expo web serves assets from relative paths; SVG exports need the absolute URL.
  setImage(uri: string | undefined, fit: BackgroundFit): void {
    this.imageUri = uri ? new URL(uri, document.baseURI).href : undefined;
    this.fit = fit;
    this.image.set(this.imageUri);
    this.redraw();
  }

  reportError(error: InkpadError): void {
    const onError = this.live.current.onError;
    if (onError) onError(error);
    else if (__DEV__) console.warn(`react-native-inkpad: ${error.message}`);
  }

  document(): InkDocument {
    return {
      version: DOCUMENT_VERSION,
      size: { ...this.size },
      strokes: structuredClone(this.strokes),
    };
  }

  undo(): void {
    if (!this.mounted) return;
    const next = this.history.undo(this.strokes);
    if (next) this.changed(next);
  }

  redo(): void {
    if (!this.mounted) return;
    const next = this.history.redo(this.strokes);
    if (next) this.changed(next);
  }

  clear(): void {
    if (this.mounted && this.strokes.length > 0) this.replaceAll([]);
  }

  replaceAll(next: InkStroke[]): void {
    this.history.record({ kind: 'replace', before: this.strokes, after: next });
    this.changed(next);
  }

  private changed(next: InkStroke[]): void {
    this.strokes = next;
    this.redraw();
    this.emitChange();
  }

  private emitChange(): void {
    this.live.current.onChange?.({
      strokeCount: this.strokes.length,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    });
  }

  private resize(): void {
    const { bottom, top } = this;
    if (!bottom || !top) return;
    const dpr = window.devicePixelRatio || 1;
    this.size = { width: bottom.clientWidth, height: bottom.clientHeight };
    for (const canvas of [bottom, top]) {
      canvas.width = Math.round(this.size.width * dpr);
      canvas.height = Math.round(this.size.height * dpr);
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.redraw();
    this.drawActive();
  }

  redraw(): void {
    const ctx = this.bottom?.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.size;
    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, this.background, width, height);
    drawBackgroundImage(ctx, this.image.current, this.size, this.fit);
    drawStrokes(ctx, this.strokes);
  }

  private clearTop(): CanvasRenderingContext2D | null {
    const ctx = this.top?.getContext('2d') ?? null;
    ctx?.clearRect(0, 0, this.size.width, this.size.height);
    return ctx;
  }

  private readonly drawActive = (): void => {
    this.frame = 0;
    const ctx = this.clearTop();
    const gesture = this.gesture;
    if (!ctx || gesture?.kind !== 'draw') return;
    const { brush, input, points, origin, lastEvent } = gesture;
    const shown = [...points];
    for (const sample of predictedOf(lastEvent)) appendPoint(shown, pointOf(sample, origin, input));
    drawStroke(ctx, { brush, input, points: shown });
    const last = widthPoints({ brush, input, points }).at(-1);
    if (last) this.trail?.update(lastEvent, brush, last.w);
  };

  private schedule(): void {
    if (!this.frame) this.frame = requestAnimationFrame(this.drawActive);
  }

  private eraseAlong(from: Vec, to: Vec): void {
    const kept = this.strokes.filter((stroke) => !touches(stroke, from, to));
    if (kept.length === this.strokes.length) return;
    this.strokes = kept;
    this.redraw();
  }

  private finishErase(before: InkStroke[]): void {
    if (before.length === this.strokes.length) return;
    this.history.record({ kind: 'replace', before, after: this.strokes });
    this.emitChange();
  }

  private readonly down = (event: PointerEvent): void => {
    if (event.pointerType === 'pen') this.penDown = true;
    const live = this.live.current;
    const top = this.top;
    if (!top || !live.editable) return;
    if (!acceptsPointer(this.gesture?.pointerId ?? null, event, live.inputMode)) return;
    capture(top, event.pointerId);
    const rect = top.getBoundingClientRect();
    const origin = { left: rect.left, top: rect.top, startTime: event.timeStamp };
    if (live.tool === 'erase') {
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.gesture = {
        kind: 'erase',
        pointerId: event.pointerId,
        origin,
        before: this.strokes,
        last: point,
      };
      this.eraseAlong(point, point);
      return;
    }
    const input = inputOf(event.pointerType);
    const points: number[] = [];
    for (const sample of samplesOf(event)) appendPoint(points, pointOf(sample, origin, input));
    const brush = { type: live.brushType, color: live.brushHex, size: live.brushSize };
    this.gesture = {
      kind: 'draw',
      pointerId: event.pointerId,
      origin,
      brush,
      input,
      points,
      lastEvent: event,
    };
    top.style.mixBlendMode = brush.type === 'highlighter' ? 'multiply' : 'normal';
    live.onStrokeStart?.();
    this.schedule();
  };

  private readonly move = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (endsStroke(event)) {
      this.up(event);
      return;
    }
    // The page can scroll mid-stroke, so points are placed against where the canvas is now.
    const rect = this.top?.getBoundingClientRect();
    if (rect) gesture.origin = { ...gesture.origin, left: rect.left, top: rect.top };
    if (gesture.kind === 'erase') {
      for (const sample of samplesOf(event)) {
        const point = {
          x: sample.clientX - gesture.origin.left,
          y: sample.clientY - gesture.origin.top,
        };
        this.eraseAlong(gesture.last, point);
        gesture.last = point;
      }
      return;
    }
    for (const sample of samplesOf(event)) {
      appendPoint(gesture.points, pointOf(sample, gesture.origin, gesture.input));
    }
    gesture.lastEvent = event;
    this.schedule();
  };

  // Pens report pressure 0 on pointerup, so the stroke ends at the last move.
  private readonly up = (event: PointerEvent): void => {
    if (event.pointerType === 'pen') this.penDown = false;
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    this.gesture = null;
    if (gesture.kind === 'erase') {
      this.finishErase(gesture.before);
      return;
    }
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    const stroke: InkStroke = {
      brush: gesture.brush,
      input: gesture.input,
      points: gesture.points,
    };
    this.strokes = [...this.strokes, stroke];
    this.history.record({ kind: 'add', stroke });
    const ctx = this.bottom?.getContext('2d');
    if (ctx) drawStroke(ctx, stroke);
    this.clearTop();
    this.live.current.onStrokeEnd?.();
    this.emitChange();
  };

  private readonly cancel = (event: PointerEvent): void => {
    if (event.pointerType === 'pen') this.penDown = false;
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    this.gesture = null;
    if (gesture.kind === 'erase') {
      this.finishErase(gesture.before);
      return;
    }
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clearTop();
  };

  // touchType is Safari only, so the DOM types leave it out.
  private readonly touch = (event: TouchEvent): void => {
    const touches = event.touches as unknown as ArrayLike<{ touchType?: string }>;
    if (blocksTouch(this.live.current.inputMode, this.penDown, touches)) event.preventDefault();
  };

  private readonly menu = (event: Event): void => {
    if (this.live.current.editable) event.preventDefault();
  };
}

const fill: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

/** A native ink canvas: androidx.ink on Android, PencilKit on iOS, Canvas 2D on web. */
export function InkCanvas({
  ref,
  brush,
  tool,
  inputMode,
  editable,
  background,
  onStrokeStart,
  onStrokeEnd,
  onChange,
  onError,
  ...viewProps
}: InkCanvasProps) {
  usePropWarnings({ brush, background });
  const native = toNativeInkProps({ brush, tool, editable, background, inputMode });
  const backgroundHex = hexOf(native.canvasColor);
  const current: Live = {
    brushType: native.brushType,
    brushHex: hexOf(native.brushColor) ?? '#000000FF',
    brushSize: native.brushSize,
    tool: native.tool,
    inputMode: native.inputMode,
    editable: native.editable,
    onStrokeStart,
    onStrokeEnd,
    onChange,
    onError,
  };
  const live = useRef(current);
  live.current = current;
  const [surface] = useState(() => new Surface(live));
  const bottomRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const bottom = bottomRef.current;
    const top = topRef.current;
    if (!bottom || !top) return;
    return surface.attach(bottom, top);
  }, [surface]);

  useEffect(() => surface.setBackground(backgroundHex), [surface, backgroundHex]);

  let imageUri: string | undefined;
  let imageError: string | undefined;
  try {
    imageUri = uriOf(background?.image);
  } catch (error) {
    imageError = (error as Error).message;
  }
  const imageFit = native.backgroundFit;
  useEffect(() => surface.setImage(imageUri, imageFit), [surface, imageUri, imageFit]);
  useEffect(() => {
    if (imageError) surface.reportError(new InkpadError(ErrorCode.IMAGE_LOAD, imageError));
  }, [surface, imageError]);

  useImperativeHandle(ref, () => {
    const getStrokes = async () => {
      if (!surface.mounted) throw notMounted();
      return surface.document();
    };
    return {
      undo: () => surface.undo(),
      redo: () => surface.redo(),
      clear: () => surface.clear(),
      getStrokes,
      setStrokes: async (doc) => {
        const valid = validateDocument(doc);
        if (!surface.mounted) throw notMounted();
        surface.replaceAll(structuredClone(valid.strokes));
      },
      toImage: async (options = {}) => {
        if (!surface.mounted) throw notMounted();
        const snapshot: InkDocument = {
          version: DOCUMENT_VERSION,
          size: { ...surface.size },
          strokes: surface.strokes,
        };
        if (surface.background !== backgroundHex) surface.setBackground(backgroundHex);
        surface.setImage(imageUri, imageFit);
        const image = await surface.image.ready();
        return exportImage(
          snapshot,
          toNativeImageOptions(options, window.devicePixelRatio || 1),
          surface.background,
          {
            createCanvas: () => document.createElement('canvas'),
            createObjectURL: (blob) => URL.createObjectURL(blob),
          },
          image ? { image, fit: surface.fit } : undefined,
        );
      },
      toSVG: async (options = {}) =>
        toSVG(await getStrokes(), {
          trim: options.trim,
          backgroundColor: options.background === false ? undefined : surface.background,
          backgroundImage:
            options.background === false || !surface.imageUri
              ? undefined
              : { uri: surface.imageUri, fit: surface.fit },
        }),
    };
  }, [surface, backgroundHex, imageUri, imageFit]);

  return (
    <View {...viewProps} style={[styles.clip, viewProps.style]}>
      <canvas ref={bottomRef} style={fill} />
      <canvas
        ref={topRef}
        style={{
          ...fill,
          touchAction: touchActionFor(native.editable, native.inputMode),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
