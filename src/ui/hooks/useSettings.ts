import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigInput } from '../../application/config/config.usecases';
import type {
  BackupEntity,
  BackupFormat,
} from '../../domain/backup/backup.repository';
import { useToast } from '../molecules/toast-context';

export function useSettings() {
  const toast = useToast();
  const [config, setConfig] = useState<BusinessConfig | null>(null);

  const load = useCallback(async () => {
    const result = await container.readConfig();
    fold(
      result,
      (error) => toast(error.message, 'error'),
      (value) => setConfig(value),
    );
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (input: ConfigInput) => {
      const result = await container.saveConfig(input);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Configuracoes salvas');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const resetSequence = useCallback(
    async (counter: number) => {
      const result = await container.resetTicketSequence(counter);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast(`Sequencia reiniciada a partir de ${counter}`);
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const exportAll = useCallback(
    async (format: BackupFormat) => {
      const result = await container.exportBackup(format);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => {},
      );
    },
    [toast],
  );

  const exportOne = useCallback(
    async (entity: BackupEntity, format: BackupFormat) => {
      const result = await container.exportEntity(entity, format);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => {},
      );
    },
    [toast],
  );

  const importOne = useCallback(
    async (entity: BackupEntity, file: File) => {
      const result = await container.importBackup(entity, file);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        (count) => {
          toast(`${count} registros importados`);
          return true;
        },
      );
    },
    [toast],
  );

  const wipe = useCallback(async () => {
    const result = await container.wipeData();
    return fold(
      result,
      (error) => {
        toast(error.message, 'error');
        return false;
      },
      () => true,
    );
  }, [toast]);

  const checkHasData = useCallback(async () => {
    const result = await container.hasData();
    return fold(
      result,
      () => false,
      (value) => value,
    );
  }, []);

  const importDemo = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}seed.json`);
      const data = await response.json();
      const result = await container.importDemo(data);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Dados de demonstracao importados');
          return true;
        },
      );
    } catch {
      toast('Nao foi possivel carregar a demonstracao', 'error');
      return false;
    }
  }, [toast]);

  return {
    config,
    load,
    save,
    resetSequence,
    exportAll,
    exportOne,
    importOne,
    checkHasData,
    importDemo,
    wipe,
  };
}
