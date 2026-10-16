import { describe, expect, it } from 'vitest';
import {
  asciiToBase64,
  backgroundBox,
  dataUrl,
  exportFormat,
  footerHidden,
  readPlan,
  unsupportedProps,
} from '../compat/mapProps';

describe('mapProps', () => {
  it('maps imageType to an export format', () => {
    expect(exportFormat(undefined)).toBe('png');
    expect(exportFormat('image/jpeg')).toBe('jpeg');
    expect(exportFormat('image/svg+xml')).toBe('svg');
  });

  it('hides the footer only when webStyle hides it', () => {
    expect(footerHidden('.m-signature-pad--footer {display: none; margin: 0px;}')).toBe(true);
    expect(footerHidden('.m-signature-pad--footer { margin: 0 }')).toBe(false);
    expect(footerHidden(undefined)).toBe(false);
  });

  it('lists the props it ignores', () => {
    expect(unsupportedProps({ customHtml: () => '', penColor: 'red' })).toEqual(['customHtml']);
  });

  it('supports the image props now', () => {
    expect(
      unsupportedProps({ bgSrc: 'x', dataURL: 'y', bgWidth: 1, bgHeight: 2, minWidth: 1 }),
    ).toEqual(['minWidth']);
  });

  it('sizes bgSrc only when both sizes are given', () => {
    expect(backgroundBox(300, 100)).toEqual({ width: 300, height: 100 });
    expect(backgroundBox(0, 100)).toBeNull();
    expect(backgroundBox()).toBeNull();
  });

  it('plans readSignature around strokes and a restored image', () => {
    expect(readPlan(0, false, true)).toBe('empty');
    expect(readPlan(0, true, true)).toEqual({ trim: false });
    expect(readPlan(2, false, true)).toEqual({ trim: true });
    expect(readPlan(2, true, true)).toEqual({ trim: false });
    expect(readPlan(2, false, undefined)).toEqual({ trim: false });
  });

  it('builds data URLs and base64 for ASCII', () => {
    expect(dataUrl('svg', 'abc')).toBe('data:image/svg+xml;base64,abc');
    expect(dataUrl('png', 'abc')).toBe('data:image/png;base64,abc');
    expect(asciiToBase64('Man')).toBe('TWFu');
    expect(asciiToBase64('Ma')).toBe('TWE=');
    expect(asciiToBase64('<svg/>')).toBe('PHN2Zy8+');
  });
});
