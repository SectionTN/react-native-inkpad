export const ErrorCode = {
  NOT_MOUNTED: 'E_NOT_MOUNTED',
  TIMEOUT: 'E_TIMEOUT',
  INVALID_DOCUMENT: 'E_INVALID_DOCUMENT',
  UNSUPPORTED_VERSION: 'E_UNSUPPORTED_VERSION',
  EMPTY: 'E_EMPTY',
  EXPORT_FAILED: 'E_EXPORT_FAILED',
  IMAGE_LOAD: 'E_IMAGE_LOAD',
  NATIVE: 'E_NATIVE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class InkpadError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'InkpadError';
    this.code = code;
  }
}

const KNOWN = new Set<string>(Object.values(ErrorCode));

export function toInkpadError(code: string, message: string): InkpadError {
  return new InkpadError(KNOWN.has(code) ? (code as ErrorCode) : ErrorCode.NATIVE, message);
}
