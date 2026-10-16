import { beforeEach, describe, expect, it } from 'vitest';
import type { InkpadError } from '../errors';
import { BackgroundImage, type ImageLike } from '../web/backgroundImage';

type FakeImage = ImageLike & { finish(): void; fail(): void };

let made: FakeImage[];
let changes: number;
let errors: InkpadError[];

const createImage = (): ImageLike => {
  let finish = () => {};
  let fail = () => {};
  const decoded = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = () => reject(new Error('broken'));
  });
  const image: FakeImage = {
    src: '',
    crossOrigin: null,
    naturalWidth: 200,
    naturalHeight: 100,
    decode: () => decoded,
    finish,
    fail,
  };
  made.push(image);
  return image;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let background: BackgroundImage;

beforeEach(() => {
  made = [];
  changes = 0;
  errors = [];
  background = new BackgroundImage(
    createImage,
    () => {
      changes++;
    },
    (error) => errors.push(error),
  );
});

describe('BackgroundImage', () => {
  it('shows an image once it decodes', async () => {
    background.set('https://x.test/a.png');
    expect(background.current).toBeNull();
    made[0]?.finish();
    await flush();
    expect(background.current).toBe(made[0]);
    expect(made[0]?.src).toBe('https://x.test/a.png');
    expect(changes).toBe(1);
  });

  it('loads the same URI once', () => {
    background.set('a.png');
    background.set('a.png');
    expect(made).toHaveLength(1);
  });

  it('asks for CORS only over http', () => {
    background.set('https://x.test/a.png');
    background.set('http://x.test/b.png');
    background.set('data:image/png;base64,AAAA');
    background.set('/assets/c.png');
    expect(made.map((image) => image.crossOrigin)).toEqual(['anonymous', 'anonymous', null, null]);
  });

  it('reports an image that does not load', async () => {
    background.set('https://x.test/broken.png');
    made[0]?.fail();
    await flush();
    expect(background.current).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: 'E_IMAGE_LOAD' });
    expect(errors[0]?.message).toContain('https://x.test/broken.png');
  });

  it('keeps the latest URI when an older load finishes last', async () => {
    background.set('a.png');
    background.set('b.png');
    made[1]?.finish();
    await flush();
    made[0]?.fail();
    await flush();
    expect(background.current).toBe(made[1]);
    expect(changes).toBe(1);
    expect(errors).toEqual([]);
  });

  it('lets an export wait for the load in flight', async () => {
    background.set('a.png');
    const ready = background.ready();
    made[0]?.finish();
    await expect(ready).resolves.toBe(made[0]);
  });

  it('is ready with nothing when there is no image or it failed', async () => {
    await expect(background.ready()).resolves.toBeNull();
    background.set('a.png');
    made[0]?.fail();
    await expect(background.ready()).resolves.toBeNull();
  });

  it('clears the image when the source goes away', async () => {
    background.set('a.png');
    made[0]?.finish();
    await flush();
    background.set(undefined);
    expect(background.current).toBeNull();
    expect(changes).toBe(2);
  });
});
