import { describe, expect, it } from 'vitest';
import {
  asciiToBase64,
  dataUrl,
  exportFormat,
  footerHidden,
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
    expect(unsupportedProps({ customHtml: () => '', penColor: 'red', bgSrc: 'x' })).toEqual([
      'customHtml',
      'bgSrc',
    ]);
  });

  it('builds data URLs and base64 for ASCII', () => {
    expect(dataUrl('svg', 'abc')).toBe('data:image/svg+xml;base64,abc');
    expect(dataUrl('png', 'abc')).toBe('data:image/png;base64,abc');
    expect(asciiToBase64('Man')).toBe('TWFu');
    expect(asciiToBase64('Ma')).toBe('TWE=');
    expect(asciiToBase64('<svg/>')).toBe('PHN2Zy8+');
  });
});
