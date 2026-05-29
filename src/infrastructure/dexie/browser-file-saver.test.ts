// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserFileSaver } from './browser-file-saver';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('browserFileSaver', () => {
  it('creates a blob url, triggers a download and revokes the url', () => {
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    browserFileSaver.save('content', 'file.json', 'application/json');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
