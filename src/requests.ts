import { ErrorCode, InkpadError, toInkpadError } from './errors';

export type NativeResult = {
  requestId: number;
  ok: boolean;
  payload: string;
  errorCode: string;
  errorMessage: string;
};

type Pending = {
  resolve: (payload: string) => void;
  reject: (error: InkpadError) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class Requests {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly timeoutMs: number;

  constructor(timeoutMs = 15_000) {
    this.timeoutMs = timeoutMs;
  }

  start(send: (requestId: number) => void): Promise<string> {
    const requestId = this.nextId++;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(
          new InkpadError(
            ErrorCode.TIMEOUT,
            `native did not answer request ${requestId} within ${this.timeoutMs} ms`,
          ),
        );
      }, this.timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      try {
        send(requestId);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(
          error instanceof InkpadError ? error : new InkpadError(ErrorCode.NATIVE, String(error)),
        );
      }
    });
  }

  settle(result: NativeResult): void {
    const entry = this.pending.get(result.requestId);
    if (!entry) return;
    this.pending.delete(result.requestId);
    clearTimeout(entry.timer);
    if (result.ok) entry.resolve(result.payload);
    else entry.reject(toInkpadError(result.errorCode, result.errorMessage));
  }

  rejectAll(error: InkpadError): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }
}
