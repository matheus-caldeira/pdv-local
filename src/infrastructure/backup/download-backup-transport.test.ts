// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRight } from '../../domain/shared/either';
import { DownloadBackupTransport } from './download-backup-transport';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DownloadBackupTransport', () => {
  it('creates a blob url, triggers a download and revokes the url', async () => {
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const transport = new DownloadBackupTransport();
    const result = await transport.send('backup.json', '{}');

    expect(isRight(result)).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
