import { describe, expect, it } from 'vitest';
import { ErrorCode, InkpadError, toInkpadError } from '../errors';

describe('InkpadError', () => {
  it('is an Error carrying a stable code', () => {
    const error = new InkpadError(ErrorCode.EMPTY, 'nothing to trim');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InkpadError');
    expect(error.code).toBe('E_EMPTY');
    expect(error.message).toBe('nothing to trim');
  });

  it('maps known native codes and falls back to E_NATIVE', () => {
    expect(toInkpadError('E_TIMEOUT', 'late').code).toBe(ErrorCode.TIMEOUT);
    expect(toInkpadError('E_SOMETHING_NEW', 'odd').code).toBe(ErrorCode.NATIVE);
  });
});
