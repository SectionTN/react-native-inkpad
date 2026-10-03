import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode, InkpadError } from '../errors';
import { Requests } from '../requests';

const answer = (requestId: number, payload: string) => ({
  requestId,
  ok: true,
  payload,
  errorCode: '',
  errorMessage: '',
});

describe('Requests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves the promise whose id native answers', async () => {
    const requests = new Requests(1000);
    const ids: number[] = [];
    const first = requests.start((id) => ids.push(id));
    const second = requests.start((id) => ids.push(id));
    requests.settle(answer(ids[1] as number, 'two'));
    requests.settle(answer(ids[0] as number, 'one'));
    await expect(first).resolves.toBe('one');
    await expect(second).resolves.toBe('two');
  });

  it('rejects with the code native sends', async () => {
    const requests = new Requests(1000);
    let id = 0;
    const pending = requests.start((requestId) => {
      id = requestId;
    });
    const assertion = expect(pending).rejects.toMatchObject({
      code: ErrorCode.EMPTY,
      message: 'nothing',
    });
    requests.settle({
      requestId: id,
      ok: false,
      payload: '',
      errorCode: 'E_EMPTY',
      errorMessage: 'nothing',
    });
    await assertion;
  });

  it('times out when native never answers', async () => {
    const requests = new Requests(1000);
    const assertion = expect(requests.start(() => {})).rejects.toMatchObject({
      code: ErrorCode.TIMEOUT,
    });
    vi.advanceTimersByTime(1000);
    await assertion;
  });

  it('rejects everything still pending on unmount', async () => {
    const requests = new Requests(1000);
    const assertion = expect(requests.start(() => {})).rejects.toMatchObject({
      code: ErrorCode.NOT_MOUNTED,
    });
    requests.rejectAll(new InkpadError(ErrorCode.NOT_MOUNTED, 'gone'));
    await assertion;
  });

  it('rejects when sending throws', async () => {
    const requests = new Requests(1000);
    const pending = requests.start(() => {
      throw new InkpadError(ErrorCode.NOT_MOUNTED, 'not mounted');
    });
    await expect(pending).rejects.toMatchObject({ code: ErrorCode.NOT_MOUNTED });
  });

  it('ignores answers for ids it does not know', () => {
    expect(() => new Requests(1000).settle(answer(99, ''))).not.toThrow();
  });
});
