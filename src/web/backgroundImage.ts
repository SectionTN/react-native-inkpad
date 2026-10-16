import { ErrorCode, InkpadError } from '../errors';

export type ImageLike = {
  src: string;
  crossOrigin: string | null;
  naturalWidth: number;
  naturalHeight: number;
  decode(): Promise<void>;
};

const HTTP = /^https?:/i;

export class BackgroundImage {
  current: ImageLike | null = null;
  private uri: string | undefined;
  private pending: Promise<ImageLike | null> = Promise.resolve(null);

  constructor(
    private readonly createImage: () => ImageLike,
    private readonly onChange: () => void,
    private readonly onError: (error: InkpadError) => void,
  ) {}

  set(uri: string | undefined): void {
    if (uri === this.uri) return;
    this.uri = uri;
    if (!uri) {
      this.pending = Promise.resolve(null);
      if (this.current) {
        this.current = null;
        this.onChange();
      }
      return;
    }
    const image = this.createImage();
    // A cross-origin image without CORS would taint exports, so it loads in CORS mode or not at all.
    if (HTTP.test(uri)) image.crossOrigin = 'anonymous';
    image.src = uri;
    this.pending = image.decode().then(
      () => {
        if (this.uri !== uri) return null;
        this.current = image;
        this.onChange();
        return image;
      },
      () => {
        if (this.uri !== uri) return null;
        const had = this.current !== null;
        this.current = null;
        if (had) this.onChange();
        this.onError(
          new InkpadError(ErrorCode.IMAGE_LOAD, `could not load the background image ${uri}`),
        );
        return null;
      },
    );
  }

  ready(): Promise<ImageLike | null> {
    return this.pending;
  }
}
