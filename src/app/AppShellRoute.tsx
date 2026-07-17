import { useLocation } from 'react-router-dom';
import { AppShell } from '../ui/templates/AppShell';
import { useModules } from './ModulesProvider';
import { useSession } from '../ui/hooks/useSession';
import { useStatusControl } from '../ui/hooks/useStatusControl';
import { buildNavModel, resolveActiveGroupId } from './nav-model';

export function AppShellRoute() {
  const location = useLocation();
  const { modules } = useModules();
  const { activeSession } = useSession();
  const statusControl = useStatusControl(location.pathname);

  const model = buildNavModel(modules, statusControl);
  const activeGroupId = resolveActiveGroupId(location.pathname, model);
  const bottomBar =
    model.groups.find((group) => group.id === activeGroupId)?.bar ?? [];

  return (
    <AppShell
      model={model}
      activeGroupId={activeGroupId}
      bottomBar={bottomBar}
      activeSession={activeSession}
    />
  );
}
