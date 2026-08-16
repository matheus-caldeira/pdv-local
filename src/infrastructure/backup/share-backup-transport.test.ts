import { describe, expect, it, vi, afterEach } from 'vitest';
import { isRight } from '../../domain/shared/either';
import { ShareBackupTransport } from './share-backup-transport';

describe('ShareBackupTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('compartilha o arquivo pela bandeja do sistema', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });

    const transport = new ShareBackupTransport();
    const result = await transport.send('backup.json', '{}');

    expect(isRight(result)).toBe(true);
    expect(share).toHaveBeenCalled();
  });

  it('trata o cancelamento do usuário como sucesso silencioso', async () => {
    const abort = Object.assign(new Error('cancelado'), { name: 'AbortError' });
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(abort),
      canShare: () => true,
    });

    const transport = new ShareBackupTransport();
    const result = await transport.send('backup.json', '{}');

    expect(isRight(result)).toBe(true);
  });

  it('avisa quando o navegador não suporta compartilhar arquivos', async () => {
    vi.stubGlobal('navigator', {});

    const transport = new ShareBackupTransport();
    const result = await transport.send('backup.json', '{}');

    expect(isRight(result)).toBe(false);
  });

  it('avisa quando canShare recusa o arquivo', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn(),
      canShare: () => false,
    });

    const transport = new ShareBackupTransport();
    const result = await transport.send('backup.json', '{}');

    expect(isRight(result)).toBe(false);
  });

  it('reporta falha de envio quando o compartilhamento rejeita por outro motivo', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('falhou')),
      canShare: () => true,
    });

    const transport = new ShareBackupTransport();
    const result = await transport.send('backup.json', '{}');

    expect(isRight(result)).toBe(false);
  });
});
